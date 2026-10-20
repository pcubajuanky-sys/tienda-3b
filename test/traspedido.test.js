// test/traspedido.test.js — pruebas de traspedido.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'traspedido.js'), 'utf8'), sandbox);
const { debePreguntar, VENTANA_MS } = sandbox.window.TrasPedido;

const AHORA = 1_700_000_000_000;

test('acaba de volver de WhatsApp y su carrito sigue lleno: se pregunta', () => {
  assert.strictEqual(debePreguntar(AHORA - 30_000, AHORA, true), true);
});

test('sin marca no se pregunta: nunca toco el boton de pedir', () => {
  assert.strictEqual(debePreguntar(null, AHORA, true), false);
  assert.strictEqual(debePreguntar(0, AHORA, true), false);
  assert.strictEqual(debePreguntar(undefined, AHORA, true), false);
});

test('con el carrito ya vacio no se pregunta: no hay nada que vaciar', () => {
  assert.strictEqual(debePreguntar(AHORA - 30_000, AHORA, false), false);
});

test('si volvio horas despues no se pregunta: ya no sabe de que le hablan', () => {
  assert.strictEqual(debePreguntar(AHORA - VENTANA_MS - 1, AHORA, true), false);
});

test('justo en el limite de la ventana todavia se pregunta', () => {
  assert.strictEqual(debePreguntar(AHORA - VENTANA_MS, AHORA, true), true);
});

test('una marca del futuro (reloj del telefono cambiado) no rompe nada', () => {
  assert.strictEqual(debePreguntar(AHORA + 60_000, AHORA, true), false);
});

test('una marca que no es un numero no rompe nada', () => {
  assert.strictEqual(debePreguntar('ayer', AHORA, true), false);
  assert.strictEqual(debePreguntar(NaN, AHORA, true), false);
});

test('la ventana es de media hora: ni un minuto ni un dia', () => {
  assert.strictEqual(VENTANA_MS, 30 * 60 * 1000);
});
