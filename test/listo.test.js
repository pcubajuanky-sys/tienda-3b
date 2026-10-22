// test/listo.test.js — pruebas de listo.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'listo.js'), 'utf8'), sandbox);
const { texto, enElPedido } = sandbox.window.Listo;

test('el texto confirma Y dice el paso siguiente, con la cifra', () => {
  const t = texto(2);
  assert.match(t, /listo/i);
  assert.match(t, /pedido/i);
  assert.match(t, /\(2\)/);
});

test('con una sola unidad tambien lleva la cifra', () => {
  assert.match(texto(1), /\(1\)/);
});

test('sin unidades no hay texto: el boton no se enseña', () => {
  assert.strictEqual(texto(0), '');
  assert.strictEqual(texto(-1), '');
  assert.strictEqual(texto('dos'), '');
});

test('un producto SIN variantes esta en el pedido por su id pelado', () => {
  assert.strictEqual(enElPedido('p1', { p1: 2 }), true);
  assert.strictEqual(enElPedido('p1', { p9: 2 }), false);
});

test('un producto CON variantes esta en el pedido por cualquiera de sus combinaciones', () => {
  assert.strictEqual(enElPedido('p1', { 'p1|M / ROJO': 1 }), true);
  assert.strictEqual(enElPedido('p1', { 'p1|L / AZUL': 3 }), true);
});

test('🔴 un id que es PREFIJO de otro no cuenta como el mismo producto', () => {
  // Sin el separador explicito, 'p1' daria positivo con 'p12' y la ficha de p1 diria
  // que esta en el pedido cuando lo que hay es otro producto.
  assert.strictEqual(enElPedido('p1', { p12: 1 }), false);
  assert.strictEqual(enElPedido('p1', { 'p12|M': 1 }), false);
});

test('una linea con cantidad 0 no cuenta', () => {
  assert.strictEqual(enElPedido('p1', { p1: 0 }), false);
});

test('no lanza con basura', () => {
  assert.strictEqual(enElPedido('p1', null), false);
  assert.strictEqual(enElPedido(null, { p1: 1 }), false);
  assert.strictEqual(enElPedido('', { '': 1 }), false);
});
