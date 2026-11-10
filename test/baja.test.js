// test/baja.test.js — pruebas de baja.js (modulo puro) y de su cableado.
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(leer('buzon.js'), sandbox);
vm.runInContext(leer('baja.js'), sandbox);
const { Baja, Buzon } = sandbox.window;

const P = { name: 'Ganchos adhesivos', codigo: '8N4Y', moneda: 'usd', precioUSD: 1.5, precioCUP: 1395, enOferta: false };
const textoDe = (url) => decodeURIComponent(url.split('&text=')[1]);

test('🔴 la marca es la del contrato con lib/avisoBaja.js de Stock+', () => {
  assert.strictEqual(Baja.MARCA, '📉 *AVÍSAME SI BAJA DE PRECIO*');
});

test('texto: marca, producto, precio ahora y Ref al final', () => {
  const l = Baja.texto(P).split('\n');
  assert.ok(l.includes(Baja.MARCA));
  assert.ok(l.includes('Producto: Ganchos adhesivos'));
  assert.ok(l.includes('Precio ahora: $1.5 USD · 1,395 CUP'));
  assert.strictEqual(l[l.length - 1], 'Ref: 8N4Y');
});

test('texto con codigo del buzon: Código: justo antes de Ref (que sigue ultima)', () => {
  const l = Baja.texto(P, 'AB23CD').split('\n');
  assert.strictEqual(l[l.length - 1], 'Ref: 8N4Y');
  assert.strictEqual(l[l.length - 2], 'Código: AB23CD');
});

test('precio en CUP: el CUP va primero', () => {
  const l = Baja.texto({ ...P, moneda: 'cup', precioCUP: 18500 }).split('\n');
  assert.ok(l.includes('Precio ahora: 18,500 CUP · $1.5 USD'));
});

test('sin nombre o sin codigo: texto vacio', () => {
  assert.strictEqual(Baja.texto({ codigo: 'X' }), '');
  assert.strictEqual(Baja.texto({ name: 'X' }), '');
  assert.strictEqual(Baja.texto(null), '');
});

test('enlace: api.whatsapp.com/send al numero de la casa (acepta objeto CAT o cadena)', () => {
  const a = Baja.enlace({ whatsapp: '+53 5497 8966' }, P, 'AB23CD');
  assert.ok(a.startsWith('https://api.whatsapp.com/send?phone=5354978966&text='), a);
  assert.ok(textoDe(a).includes('Código: AB23CD'));
  assert.ok(Baja.enlace('5354978966', P).startsWith('https://api.whatsapp.com/send?phone=5354978966'));
  assert.ok(!textoDe(Baja.enlace('5354978966', P)).includes('Código:'));
});

test('enlace: sin numero o sin texto, vacio', () => {
  assert.strictEqual(Baja.enlace({}, P), '');
  assert.strictEqual(Baja.enlace('5354978966', { name: 'X' }), '');
});

test('puede: solo con stock y SIN oferta', () => {
  assert.strictEqual(Baja.puede(P, {}), true);
  assert.strictEqual(Baja.puede({ ...P, enOferta: true }, {}), false);
  assert.strictEqual(Baja.puede(P, { enEspera: true }), false);
  assert.strictEqual(Baja.puede(P, { cerrada: true }), false);
  assert.strictEqual(Baja.puede(null, {}), false);
});

test('TEXTO_BOTON del plan', () => {
  assert.strictEqual(Baja.TEXTO_BOTON, '📉 Avísame si baja de precio');
});

test('🔴 cableado: tres cascaras cargan baja.js (tras buzon.js), con su caja, y sw.js lo cachea en v55', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = leer(f);
    const b = h.indexOf('<script src="buzon.js"></script>');
    const j = h.indexOf('<script src="baja.js"></script>');
    assert.ok(j > -1, f + ' no carga baja.js');
    assert.ok(b > -1 && b < j, f + ': baja.js debe ir despues de buzon.js');
    assert.match(h, /id="ficha-baja"/, f + ': falta #ficha-baja');
  }
  const sw = leer('sw.js');
  assert.ok(sw.includes("'/baja.js'"));
  assert.ok(sw.includes("const CACHE = 'tienda-3b-v61'"));
});

test('🔴 cableado: la ficha usa window.Baja, delegacion sin onclick y el buzon manda tipo baja', () => {
  const app = leer('app.js');
  assert.match(app, /window\.Baja/);
  assert.ok(app.includes("closest('a[data-buzon=\"baja\"]')"));
  assert.ok(app.includes("window.Buzon.enviar('baja'"));
  assert.ok(!/onclick=[^>]*Baja/.test(app));
  assert.ok(!/onclick=/.test(leer('baja.js')));
  // siempre el numero de la casa, nunca el del gestor
  const i = app.indexOf('function bajaConBuzon');
  assert.ok(i > -1);
  const fn = app.slice(i, app.indexOf('\n}', i));
  assert.ok(fn.includes('CAT') && !fn.includes('destinoWhatsApp'));
});

test('🔴 api/buzon.js acepta el tipo baja con su marca', () => {
  const { validar, MARCAS } = require('../api/buzon.js');
  assert.strictEqual(MARCAS.baja, Baja.MARCA);
  assert.ok(validar({ tipo: 'baja', id: 'AB23CD', texto: 'x ' + Baja.MARCA + ' y' }));
  assert.strictEqual(validar({ tipo: 'baja', id: 'AB23CD', texto: 'sin marca' }), null);
});

test('Buzon.nuevoId existe (lo usa bajaConBuzon)', () => {
  assert.strictEqual(typeof Buzon.nuevoId, 'function');
});
