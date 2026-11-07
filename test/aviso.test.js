// test/aviso.test.js — pruebas de aviso.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'aviso.js'), 'utf8'), sandbox);
const { mensaje, enlace, porCategoria, esAgotada, textoTalla, textoBotonTalla, MARCA, TEXTO_BOTON, TEXTO_BOTON_ESPERA } = sandbox.window.Aviso;

const P = { name: 'Nebulizador portátil', codigo: '24PU' };
const PV = { name: 'Pulóver', codigo: 'K7M2', variantes: { ejes: ['Talla', 'Color'], opciones: ['M / ROJO'] } };

test('🔴 la marca es la del contrato con lib/avisoVuelta.js de Stock+', () => {
  assert.strictEqual(MARCA, '🔔 *AVÍSAME CUANDO VUELVA*');
});

test('sin variante: marca, nombre, codigo y Ref sin barra', () => {
  const m = mensaje(P, null);
  assert.ok(m.startsWith('Hola 3B 👋\n' + MARCA + '\n'), m);
  assert.match(m, /cuando vuelva \*Nebulizador portátil\* \(código 24PU\)/);
  assert.ok(m.endsWith('\nRef: 24PU'), m);
  assert.ok(!/x\d/.test(m), 'el aviso no lleva cantidad');
});

test('con variante: linea con los ejes y Ref con "/" y "+" (transporte del pedido)', () => {
  const m = mensaje(PV, 'M / ROJO');
  assert.match(m, /\nTalla M, Color ROJO\n/);
  assert.ok(m.endsWith('\nRef: K7M2/M+ROJO'), m);
});

test('variante con emoji y parentesis viaja entera', () => {
  const m = mensaje({ name: 'Licra', codigo: 'AB12', variantes: { ejes: ['Talla', 'Color'] } }, 'L(REDUCIDA) / GRIS🩶');
  assert.ok(m.endsWith('\nRef: AB12/L(REDUCIDA)+GRIS🩶'), m);
});

test('variante sin ejes conocidos: linea generica con la clave', () => {
  const m = mensaje({ name: 'Cosa', codigo: 'ZZ99' }, 'NEGRO');
  assert.match(m, /\nNEGRO\n/);
  assert.ok(m.endsWith('\nRef: ZZ99/NEGRO'), m);
});

test('sin codigo o sin nombre no hay mensaje (el Ref es el contrato)', () => {
  assert.strictEqual(mensaje({ name: 'X' }, null), '');
  assert.strictEqual(mensaje({ codigo: 'AAAA' }, null), '');
  assert.strictEqual(mensaje(null, null), '');
});

test('el enlace usa api.whatsapp.com y conserva el prefijo de pais', () => {
  const url = enlace('+53 5363-268423', P, null);
  assert.match(url, /^https:\/\/api\.whatsapp\.com\/send\?phone=535363268423&text=/);
  assert.ok(!url.includes('wa.me'));
  assert.ok(!url.includes(' '));
  assert.ok(decodeURIComponent(url.split('&text=')[1]).includes(MARCA));
});

test('sin telefono o sin producto no hay enlace', () => {
  assert.strictEqual(enlace('', P, null), '');
  assert.strictEqual(enlace(null, P, null), '');
  assert.strictEqual(enlace('5363268423', null, null), '');
});

test('los textos de boton existen y son cortos', () => {
  assert.ok(TEXTO_BOTON.length > 0 && TEXTO_BOTON.length <= 32, TEXTO_BOTON);
  assert.ok(TEXTO_BOTON_ESPERA.length > 0 && TEXTO_BOTON_ESPERA.length <= 32, TEXTO_BOTON_ESPERA);
});

test('contrato: el Ref usa el mismo transporte que enviarPorWhatsApp', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(src.includes("`${p.codigo}${clave ? '/' + clave.split(SEP_VAR).join('+') : ''} x${qty}`"),
    'si el transporte del pedido cambia, aviso.js debe cambiar con el');
});

test('porCategoria: solo la categoria pedida, en orden, con tope de 12', () => {
  const l = [{ name: 'A', cat: 'Hogar' }, { name: 'B', cat: 'Ropa' }, { name: 'C', cat: 'Hogar' }];
  assert.deepStrictEqual(Array.from(porCategoria(l, 'Hogar').map((x) => x.name)), ['A', 'C']);
  const muchos = Array.from({ length: 20 }, (_, i) => ({ name: 'N' + i, cat: 'Hogar' }));
  assert.strictEqual(porCategoria(muchos, 'Hogar').length, 12);
  assert.strictEqual(porCategoria(muchos, 'Hogar', 3).length, 3);
  assert.strictEqual(porCategoria(muchos, 'Hogar', Infinity).length, 20, 'sin tope para «Ver más»');
});

test('porCategoria: sin categoria o entrada rara no devuelve nada', () => {
  assert.strictEqual(porCategoria([{ cat: 'Hogar' }], '').length, 0);
  assert.strictEqual(porCategoria([{ cat: 'Hogar' }], null).length, 0);
  assert.strictEqual(porCategoria(null, 'Hogar').length, 0);
  assert.strictEqual(porCategoria([null, {}], 'Hogar').length, 0);
});

// ---- «Avísame» por talla o color (2026-11-07) ----
const PA = { name: 'Pulóver', codigo: 'K7M2', variantes: { ejes: ['Talla', 'Color'], opciones: ['L / ROJO'], agotadas: ['M / ROJO', 'M / AZUL'] } };
const PU = { name: 'Camisa', codigo: 'AB12', variantes: { ejes: ['Talla'], opciones: ['L'], agotadas: ['M'] } };

test('esAgotada: solo lo que viene en variantes.agotadas', () => {
  assert.strictEqual(esAgotada(PA, 'M / ROJO'), true);
  assert.strictEqual(esAgotada(PA, 'L / ROJO'), false);
  assert.strictEqual(esAgotada(PA, 'XL / ROJO'), false);
  assert.strictEqual(esAgotada(PA, null), false);
  assert.strictEqual(esAgotada({ name: 'x' }, 'M'), false);
  assert.strictEqual(esAgotada(null, 'M'), false);
});

test('esAgotada: si por alguna razon la clave esta tambien en opciones, manda opciones', () => {
  const p = { variantes: { ejes: ['Talla'], opciones: ['M'], agotadas: ['M'] } };
  assert.strictEqual(esAgotada(p, 'M'), false);
});

test('textoTalla usa los nombres de los ejes', () => {
  assert.strictEqual(textoTalla(PU, 'M'), 'Talla M');
  assert.strictEqual(textoTalla(PA, 'M / ROJO'), 'Talla M, Color ROJO');
  assert.strictEqual(textoTalla({ variantes: {} }, 'NEGRO'), 'NEGRO');
});

test('textoBotonTalla: boton con la combinacion', () => {
  assert.strictEqual(textoBotonTalla(PU, 'M'), '🔔 Avísame cuando haya Talla M');
  assert.strictEqual(textoBotonTalla(PA, 'M / ROJO'), '🔔 Avísame cuando haya Talla M, Color ROJO');
});

test('el mensaje de una combinacion agotada lleva la variante en el Ref (contrato)', () => {
  const m = mensaje(PA, 'M / ROJO');
  assert.ok(m.includes('\nTalla M, Color ROJO\n'), m);
  assert.ok(m.endsWith('\nRef: K7M2/M+ROJO'), m);
});
