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

const { coincide } = sandbox.window.Buscar;

test('coincide: palabras en cualquier orden y sin acentos', () => {
  assert.strictEqual(coincide('Audífonos Bluetooth X15', 'bluetooth audifonos'), true);
  assert.strictEqual(coincide('Audífonos de cable', 'audifonos bluetooth'), false);
});
test('coincide: encuentra por sinónimo cubano', () => {
  assert.strictEqual(coincide('Gafas negras unisex', 'espejuelos'), true);
  assert.strictEqual(coincide('Ajusta invisible sin tirantes', 'brasier'), true);
  assert.strictEqual(coincide('Tomacorrientes', 'enchufe'), true);
});
test('coincide: un sinónimo exige inicio de palabra', () => {
  assert.strictEqual(coincide('Desktop negro', 'brasier'), false);
});
test('coincide: ignora letras sueltas y texto vacío', () => {
  assert.strictEqual(coincide('Reloj', 'reloj y'), true);
  assert.strictEqual(coincide('Reloj', '   '), true);
});
test('sugerencias: usa las mismas reglas y mantiene primero lo que empieza igual', () => {
  const r = sugerencias([{ id: 'a', name: 'Lentes X' }, { id: 'b', name: 'Espejuelos Y' }], 'espejuelos');
  assert.deepStrictEqual(r.map((p) => p.id), ['b', 'a']);
});

test('coincide: un sinónimo no casa con una palabra más larga', () => {
  assert.strictEqual(coincide('Arnés ajustable', 'brasier'), false);
});
test('coincide: los sinónimos solo se buscan en textoSinonimos', () => {
  assert.strictEqual(coincide('Cinto bonito con lentes', 'espejuelos', 'Cinto bonito'), false);
});
test('coincide: el sinónimo admite plural', () => {
  assert.strictEqual(coincide('Lámparas solares', 'linterna'), true);
});
test('coincide: una sola letra filtra por subcadena', () => {
  assert.strictEqual(coincide('Reloj', 'x'), false);
  assert.strictEqual(coincide('Reloj', 'r'), true);
});
test('coincide: juego no es sinónimo de juguete', () => {
  assert.strictEqual(coincide('Juego de bolsos', 'juguetes'), false);
});
