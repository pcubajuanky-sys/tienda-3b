// test/buscar.test.js — pruebas de buscar.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'buscar.js'), 'utf8'), sandbox);
// Arrays creados dentro del vm tienen otro prototipo: se copian al reino de la prueba.
const R = (fn) => (...args) => { const r = fn(...args); return Array.isArray(r) ? Array.from(r) : r; };
const { sugerencias: sugerencias_, anotarReciente: anotarReciente_, cargarLista: cargarLista_ } = sandbox.window.Buscar;
const sugerencias = R(sugerencias_);
const anotarReciente = R(anotarReciente_);
const cargarLista = R(cargarLista_);

const ITEMS = [
  { id: 'a', name: 'Cable USB' },
  { id: 'b', name: 'Audífonos Bluetooth' },
  { id: 'c', name: 'Cargador de cable' },
  { id: 'd', name: 'Cabello: crema' },
  { id: 'e', name: 'Zapato' },
];

test('sugerencias: los que EMPIEZAN por lo escrito van primero', () => {
  assert.deepStrictEqual(sugerencias(ITEMS, 'cab').map((x) => x.id), ['a', 'd', 'c']);
});

test('sugerencias: con menos de 2 letras no devuelve nada', () => {
  assert.deepStrictEqual(sugerencias(ITEMS, 'c'), []);
  assert.deepStrictEqual(sugerencias(ITEMS, ' '), []);
  assert.deepStrictEqual(sugerencias(ITEMS, ''), []);
});

test('sugerencias: ignora acentos y mayusculas', () => {
  assert.deepStrictEqual(sugerencias(ITEMS, 'AUDIFONOS').map((x) => x.id), ['b']);
});

test('sugerencias: respeta el tope', () => {
  assert.strictEqual(sugerencias(ITEMS, 'ca', 2).length, 2);
  const muchos = Array.from({ length: 20 }, (_, i) => ({ id: 'x' + i, name: 'Caja ' + i }));
  assert.strictEqual(sugerencias(muchos, 'caj').length, 6);
});

test('sugerencias: no revienta con basura', () => {
  assert.deepStrictEqual(sugerencias(null, 'cable'), []);
  assert.deepStrictEqual(sugerencias([null, { id: 'z' }], 'cable'), []);
});

test('anotarReciente: pone el id delante, sin duplicar y sin mutar', () => {
  const l = ['a', 'b', 'c'];
  assert.deepStrictEqual(anotarReciente(l, 'c'), ['c', 'a', 'b']);
  assert.deepStrictEqual(l, ['a', 'b', 'c']);
  assert.deepStrictEqual(anotarReciente([], 'x'), ['x']);
  assert.deepStrictEqual(anotarReciente(null, 'x'), ['x']);
});

test('anotarReciente: recorta al tope', () => {
  const l = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const r = anotarReciente(l, 'n');
  assert.strictEqual(r.length, 10);
  assert.strictEqual(r[0], 'n');
  assert.strictEqual(r.indexOf('10'), -1);
  assert.deepStrictEqual(anotarReciente(['a', 'b', 'c'], 'n', 2), ['n', 'a']);
});

test('cargarLista: basura devuelve []', () => {
  assert.deepStrictEqual(cargarLista(null), []);
  assert.deepStrictEqual(cargarLista('no es json'), []);
  assert.deepStrictEqual(cargarLista('{"a":1}'), []);
  assert.deepStrictEqual(cargarLista('5'), []);
});

test('cargarLista: deja solo strings, sin nulos ni repetidos', () => {
  assert.deepStrictEqual(cargarLista('["a",null,"b","a",3,""]'), ['a', 'b']);
});
