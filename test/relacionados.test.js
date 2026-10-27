// test/relacionados.test.js — pruebas de relacionados.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'relacionados.js'), 'utf8'), sandbox);
const { elegir, precioTexto } = sandbox.window.Relacionados;

const p = (id, cat, subcat, extra) => Object.assign({ id: id, name: id, cat: cat, subcat: subcat || '' }, extra || {});

const ITEMS = [
  p('abierto', 'Hogar', 'Cocina'),
  p('mismaSub1', 'Hogar', 'Cocina'),
  p('mismaSub2', 'Hogar', 'Cocina', { destacado: true }),
  p('mismaCat1', 'Hogar', 'Baño'),
  p('mismaCat2', 'Hogar', 'Baño', { enOferta: true }),
  p('otraCat', 'Ropa', 'Camisas'),
];

test('nunca devuelve el producto que esta abierto', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.strictEqual(r.indexOf('abierto'), -1);
});

test('no sale nada de otra categoria', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.strictEqual(r.indexOf('otraCat'), -1);
});

test('la misma subcategoria va primero, y dentro de ella el destacado antes', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.deepStrictEqual(r.slice(0, 2), ['mismaSub2', 'mismaSub1']);
});

test('despues de la subcategoria viene el resto de la categoria, con la oferta antes', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.deepStrictEqual(r.slice(2), ['mismaCat2', 'mismaCat1']);
});

test('respeta el tope', () => {
  assert.strictEqual(elegir(ITEMS[0], ITEMS, 2).length, 2);
});

test('con menos de dos candidatos devuelve lista vacia: una sola tarjeta es ruido', () => {
  const solos = [p('a', 'Hogar', 'Cocina'), p('b', 'Hogar', 'Cocina')];
  assert.strictEqual(JSON.stringify(elegir(solos[0], solos, 6)), '[]');
});

test('sin catalogo o sin producto no revienta', () => {
  assert.strictEqual(JSON.stringify(elegir(null, ITEMS, 6)), '[]');
  assert.strictEqual(JSON.stringify(elegir(ITEMS[0], null, 6)), '[]');
  assert.strictEqual(JSON.stringify(elegir(ITEMS[0], [], 6)), '[]');
});

test('🔴 la tira de relacionados SIEMPRE dice el precio en CUP', () => {
  // Antes, un producto con moneda 'usd' enseñaba «$5» y ni un CUP. La clienta cubana
  // piensa en CUP y esta tira existe para que compre otra cosa mas: obligarla a
  // multiplicar de cabeza es poner un peaje justo en el upsell.
  assert.strictEqual(precioTexto({ precioCUP: 4225, precioUSD: 5, moneda: 'usd' }), '4,225 CUP');
  assert.strictEqual(precioTexto({ precioCUP: 395, moneda: 'cup' }), '395 CUP');
});

test('sin precio en CUP la tira no inventa una cifra', () => {
  assert.strictEqual(precioTexto({ precioUSD: 5 }), '');
  assert.strictEqual(precioTexto({ precioCUP: 0 }), '');
  assert.strictEqual(precioTexto(null), '');
  assert.strictEqual(precioTexto(undefined), '');
});

test('🔴 app.js pinta la tira con el modulo, no con su propia formula', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = app.match(/function pintarRelacionados\(p\)\{?[\s\S]*?\n\}/);
  assert.ok(fn, 'no se encuentra pintarRelacionados');
  assert.ok(fn[0].includes('Relacionados.precioTexto('), 'tiene que pedirselo al modulo');
  assert.ok(!/moneda === 'usd'/.test(fn[0]), 'ya no decide la moneda a mano');
});
