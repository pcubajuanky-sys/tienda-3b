// test/preguntar.test.js — pruebas de preguntar.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'preguntar.js'), 'utf8'), sandbox);
const { mensaje, enlace, TEXTO_BOTON, TEXTO_BOTON_ESPERA } = sandbox.window.Preguntar;

const P = { name: 'Nebulizador portátil', codigo: '24PU' };

test('el mensaje lleva el nombre y el codigo del producto', () => {
  const m = mensaje(P, false);
  assert.match(m, /Nebulizador portátil/);
  assert.match(m, /24PU/);
});

test('el mensaje normal pregunta por informacion, no por una reserva', () => {
  const m = mensaje(P, false);
  assert.match(m, /informaci[óo]n/i);
  assert.ok(!/se libera/i.test(m), 'el mensaje normal no debe hablar de liberarse');
});

test('en espera el mensaje pide que le avisen', () => {
  const m = mensaje(P, true);
  assert.match(m, /se libera/i);
  assert.match(m, /24PU/);
});

test('un producto sin codigo no escribe un parentesis vacio', () => {
  // 🔴 El nombre NO puede contener la palabra «codigo»: el ultimo assert busca esa
  // palabra en el mensaje entero, y un nombre como «Cosa sin codigo» lo hace fallar
  // solo (error real del plan, cazado al ejecutar el 2026-10-22).
  const m = mensaje({ name: 'Cosa sin referencia' }, false);
  assert.match(m, /Cosa sin referencia/);
  assert.ok(!/\(\s*\)/.test(m), `parentesis vacio en: ${m}`);
  assert.ok(!/c[óo]digo/i.test(m), `habla de un codigo que no existe: ${m}`);
});

test('sin producto no hay mensaje', () => {
  assert.strictEqual(mensaje(null, false), '');
  assert.strictEqual(mensaje({}, false), '');
  assert.strictEqual(mensaje({ name: '   ' }, false), '');
});

test('el enlace lleva el telefono en digitos y el texto codificado', () => {
  // 🔴 El «53» de delante es el prefijo de pais y SE CONSERVA: WhatsApp lo necesita para
  // abrir el chat. Lo que se quita son el «+», los espacios y los guiones. (El plan pedia
  // 5363268423 por error; corregido el 2026-10-22 al ejecutarlo.)
  const url = enlace('+53 5363-268423', P, false);
  assert.match(url, /^https:\/\/api\.whatsapp\.com\/send\?phone=535363268423&text=/);
  assert.match(url, /24PU/);
  assert.ok(!url.includes(' '), 'el texto tiene que ir codificado');
});

test('sin telefono o sin producto no hay enlace', () => {
  assert.strictEqual(enlace('', P, false), '');
  assert.strictEqual(enlace(null, P, false), '');
  assert.strictEqual(enlace('5363268423', null, false), '');
  assert.strictEqual(enlace('sin-digitos', P, false), '');
});

test('los dos textos de boton existen y son cortos', () => {
  assert.ok(TEXTO_BOTON.length > 0 && TEXTO_BOTON.length <= 30, TEXTO_BOTON);
  assert.ok(TEXTO_BOTON_ESPERA.length > 0 && TEXTO_BOTON_ESPERA.length <= 30, TEXTO_BOTON_ESPERA);
  assert.notStrictEqual(TEXTO_BOTON, TEXTO_BOTON_ESPERA);
});
