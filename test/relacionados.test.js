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
const { elegir } = sandbox.window.Relacionados;

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
