// test/favoritos.test.js — pruebas de favoritos.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'favoritos.js'), 'utf8'), sandbox);
// Arrays creados dentro del vm tienen otro prototipo: se copian al reino de la prueba.
const R = (fn) => (...args) => { const r = fn(...args); return Array.isArray(r) ? Array.from(r) : r; };
const { alternar: alternar_, vigentes: vigentes_, mensaje: mensaje_ } = sandbox.window.Favoritos;
const alternar = R(alternar_);
const vigentes = R(vigentes_);
const mensaje = R(mensaje_);

test('alternar: añade al final y quita si ya estaba', () => {
  assert.deepStrictEqual(alternar(['a'], 'b'), ['a', 'b']);
  assert.deepStrictEqual(alternar(['a', 'b'], 'a'), ['b']);
  assert.deepStrictEqual(alternar(null, 'x'), ['x']);
});

test('alternar: no muta la lista original', () => {
  const l = ['a'];
  alternar(l, 'b');
  alternar(l, 'a');
  assert.deepStrictEqual(l, ['a']);
});

test('vigentes: descarta lo que ya no esta en el catalogo y conserva el orden', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepStrictEqual(vigentes(['c', 'zz', 'a'], items), ['c', 'a']);
  assert.deepStrictEqual(vigentes(null, items), []);
  assert.deepStrictEqual(vigentes(['a'], null), []);
});

test('mensaje: formato exacto', () => {
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const txt = mensaje([{ name: 'Nombre A', precioCUP: 1500 }, { name: 'Nombre B', precioCUP: 3900 }], fmt);
  assert.strictEqual(txt,
    'Hola 👋 Me interesan estos productos de la tienda:\n• Nombre A — 1,500 CUP\n• Nombre B — 3,900 CUP\n¿Están disponibles?');
});

test('mensaje: lista vacia da texto vacio', () => {
  assert.strictEqual(mensaje([], String), '');
  assert.strictEqual(mensaje(null, String), '');
});
