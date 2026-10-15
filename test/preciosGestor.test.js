// test/preciosGestor.test.js — pruebas de preciosGestor.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'preciosGestor.js'), 'utf8'), sandbox);
const { aplicar, nombreCorto } = sandbox.window.PreciosGestor;

const ITEMS = [
  { id: 'a', codigo: '5HP4', name: 'Abrigo', precioUSD: 5, precioCUP: 4000, moneda: 'usd' },
  { id: 'b', codigo: '9K2V', name: 'Cable', precioUSD: 2.5, precioCUP: 2000, moneda: 'cup', enOferta: true, precioNormalUSD: 3, precioNormalCUP: 2400 },
];
const TABLA = {
  '5HP4': { u: 5.5, c: 4400 },
  '9K2V': { u: 2.75, c: 2200, nu: 3.3, nc: 2640 },
};

test('sustituye los precios por los de la tabla', () => {
  const r = aplicar(ITEMS, TABLA);
  assert.strictEqual(r[0].precioUSD, 5.5);
  assert.strictEqual(r[0].precioCUP, 4400);
  assert.strictEqual(r[1].precioNormalUSD, 3.3);
  assert.strictEqual(r[1].precioNormalCUP, 2640);
});

test('no toca nada mas del producto', () => {
  const r = aplicar(ITEMS, TABLA);
  assert.strictEqual(r[0].name, 'Abrigo');
  assert.strictEqual(r[0].moneda, 'usd');
  assert.strictEqual(r[1].enOferta, true);
});

test('no muta la lista de entrada', () => {
  aplicar(ITEMS, TABLA);
  assert.strictEqual(ITEMS[0].precioCUP, 4000);
});

test('sin tabla, o con tabla vacia, devuelve los mismos precios', () => {
  // Las listas nacen dentro del sandbox: se comparan con JSON.stringify, nunca con
  // deepStrictEqual (el Array de aqui no es el Array de alla).
  assert.strictEqual(JSON.stringify(aplicar(ITEMS, null)), JSON.stringify(ITEMS));
  assert.strictEqual(JSON.stringify(aplicar(ITEMS, {})), JSON.stringify(ITEMS));
});

test('un producto que no esta en la tabla se queda con el precio de la casa', () => {
  const r = aplicar(ITEMS, { '5HP4': { u: 5.5, c: 4400 } });
  assert.strictEqual(r[1].precioCUP, 2000);
});

test('una entrada sin precio valido se ignora: nunca un precio a medias', () => {
  const r = aplicar(ITEMS, { '5HP4': { u: 0, c: 0 }, '9K2V': { c: 2200 } });
  assert.strictEqual(r[0].precioCUP, 4000);   // c en 0 no vale
  assert.strictEqual(r[1].precioCUP, 2000);   // le falta u: no se aplica a medias
});

test('nombreCorto deja solo la primera palabra', () => {
  assert.strictEqual(nombreCorto('Elaine Ocampo Pino'), 'Elaine');
  assert.strictEqual(nombreCorto('Yessy'), 'Yessy');
  assert.strictEqual(nombreCorto('  Boris  Luís Rodríguez '), 'Boris');
  assert.strictEqual(nombreCorto(''), '');
  assert.strictEqual(nombreCorto(null), '');
});
