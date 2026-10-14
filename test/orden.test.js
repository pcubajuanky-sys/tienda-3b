// test/orden.test.js — pruebas de orden.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'orden.js'), 'utf8'), sandbox);
const { ordenar, filtrar, opcionesUtiles } = sandbox.window.Orden;

const ITEMS = [
  { id: 'a', name: 'Cable', precioCUP: 500, creado: 300, envioGratis: true },
  { id: 'b', name: 'Abrigo', precioCUP: 3900, creado: 100 },
  { id: 'c', name: 'Zapato', precioCUP: 1200, creado: 200, envioGratis: true },
];

test('az ordena por nombre, que es el orden de siempre', () => {
  assert.deepStrictEqual(ordenar(ITEMS, 'az').map((x) => x.id), ['b', 'a', 'c']);
});

test('barato y caro ordenan por el precio en CUP, que es la misma escala para todos', () => {
  assert.deepStrictEqual(ordenar(ITEMS, 'barato').map((x) => x.id), ['a', 'c', 'b']);
  assert.deepStrictEqual(ordenar(ITEMS, 'caro').map((x) => x.id), ['b', 'c', 'a']);
});

test('nuevo ordena del mas reciente al mas viejo', () => {
  assert.deepStrictEqual(ordenar(ITEMS, 'nuevo').map((x) => x.id), ['a', 'c', 'b']);
});

test('ordenar NO toca el array que recibe', () => {
  const copia = ITEMS.slice();
  ordenar(ITEMS, 'caro');
  assert.deepStrictEqual(ITEMS.map((x) => x.id), copia.map((x) => x.id));
});

test('un criterio desconocido o vacio devuelve el orden de siempre (az)', () => {
  assert.deepStrictEqual(ordenar(ITEMS, 'loquesea').map((x) => x.id), ['b', 'a', 'c']);
  assert.deepStrictEqual(ordenar(ITEMS, '').map((x) => x.id), ['b', 'a', 'c']);
});

test('filtrar por mensajeria gratis deja solo los incondicionales', () => {
  assert.deepStrictEqual(filtrar(ITEMS, true).map((x) => x.id), ['a', 'c']);
});

test('sin filtro devuelve todo', () => {
  assert.strictEqual(filtrar(ITEMS, false).length, 3);
});

test('opcionesUtiles esconde «nuevo» si ningun producto trae creado', () => {
  const sinFecha = ITEMS.map((x) => ({ ...x, creado: undefined }));
  const ids = opcionesUtiles(sinFecha).map((o) => o.id);
  assert.strictEqual(ids.indexOf('nuevo'), -1);
  assert.ok(ids.indexOf('az') !== -1);
  assert.ok(ids.indexOf('barato') !== -1);
});

test('opcionesUtiles ofrece «nuevo» cuando los productos traen creado', () => {
  assert.ok(opcionesUtiles(ITEMS).map((o) => o.id).indexOf('nuevo') !== -1);
});

test('nada de esto revienta con lista vacia o basura', () => {
  assert.strictEqual(ordenar([], 'az').length, 0);
  assert.strictEqual(ordenar(null, 'az').length, 0);
  assert.strictEqual(filtrar(null, true).length, 0);
  assert.ok(opcionesUtiles(null).length >= 1);
});
