// test/espera.test.js — pruebas de espera.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'espera.js'), 'utf8'), sandbox);
const { enEspera, AVISO_CORTO, AVISO_LARGO, AVISO_BOTON } = sandbox.window.Espera;

test('un producto sin la marca no esta en espera', () => {
  assert.strictEqual(enEspera({ id: 'a' }, null), false);
  assert.strictEqual(enEspera({ id: 'a', max: 1 }, null), false);
});

test('espera:true bloquea el producto entero, con o sin combinacion', () => {
  assert.strictEqual(enEspera({ id: 'a', espera: true }, null), true);
  assert.strictEqual(enEspera({ id: 'a', espera: true }, 'M / ROJO'), true);
});

test('solo la combinacion pedida esta en espera', () => {
  const p = { id: 'a', esperaOpciones: ['M / ROJO'] };
  assert.strictEqual(enEspera(p, 'M / ROJO'), true);
  assert.strictEqual(enEspera(p, 'M / AZUL'), false);
});

test('sin combinacion elegida NO se bloquea: la clienta todavia puede elegir otra talla', () => {
  assert.strictEqual(enEspera({ id: 'a', esperaOpciones: ['M / ROJO'] }, null), false);
});

test('no lanza con basura', () => {
  assert.strictEqual(enEspera(null, null), false);
  assert.strictEqual(enEspera(undefined, 'M'), false);
  assert.strictEqual(enEspera({ id: 'a', esperaOpciones: 'no-es-array' }, 'M'), false);
});

test('los dos textos existen y dicen lo que Ruth aprobo', () => {
  assert.match(AVISO_CORTO, /esperando confirmaci[óo]n/i);
  assert.match(AVISO_LARGO, /te avisamos/i);
});

test('el boton lleva un texto corto, distinto del aviso largo de la tarjeta', () => {
  // En la tarjeta salen los dos a la vez: si el boton repitiera el aviso, la clienta
  // leeria lo mismo dos veces en 375 px (visto en la verificacion del 2026-10-20).
  assert.ok(AVISO_BOTON.length < 15, `el texto del boton es largo: ${AVISO_BOTON}`);
  assert.notStrictEqual(AVISO_BOTON, AVISO_CORTO);
});
