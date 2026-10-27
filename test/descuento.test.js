// test/descuento.test.js — pruebas de descuento.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'descuento.js'), 'utf8'), sandbox);
const { MINIMO, porciento, hayRebaja, sello } = sandbox.window.Descuento;

// Productos reales del catalogo del 2026-10-27.
const PEINE = { enOferta: true, moneda: 'usd', precioCUP: 204, precioNormalCUP: 425, precioUSD: 0.24, precioNormalUSD: 0.5 };
const NEBU  = { enOferta: true, moneda: 'usd', precioCUP: 16150, precioNormalCUP: 17000, precioUSD: 19, precioNormalUSD: 20 };
const TICTAC = { enOferta: true, moneda: 'usd', precioCUP: 612, precioNormalCUP: 595, precioUSD: 0.72, precioNormalUSD: 0.7 };
const NORMAL = { enOferta: false, moneda: 'cup', precioCUP: 1000, precioNormalCUP: 0 };

test('el minimo para enseñar un numero es el 10 %', () => {
  assert.strictEqual(MINIMO, 10);
});

test('el porcentaje se redondea HACIA ABAJO: nunca se exagera la rebaja', () => {
  // 1 - 204/425 = 52,0 % justo; 1 - 1199/1870 = 35,88 % -> 35, no 36.
  assert.strictEqual(porciento(PEINE), 52);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 1199, precioNormalCUP: 1870 }), 35);
  assert.strictEqual(porciento(NEBU), 5);
});

test('🔴 una «oferta» que SUBE el precio no es una rebaja', () => {
  // El Tic-Tac existe de verdad en el catalogo: 595 -> 612. Esta mal el dato en Stock+,
  // y hasta que lo arreglen la tienda no puede anunciarlo como rebaja.
  assert.strictEqual(porciento(TICTAC), null);
  assert.strictEqual(hayRebaja(TICTAC), false);
  assert.strictEqual(sello(TICTAC), 'OFERTA', 'sigue siendo oferta en el panel, pero sin numero');
});

test('sin oferta no hay ni sello ni rebaja', () => {
  assert.strictEqual(porciento(NORMAL), null);
  assert.strictEqual(hayRebaja(NORMAL), false);
  assert.strictEqual(sello(NORMAL), '');
});

test('🔴 por debajo del minimo el sello se queda como esta hoy', () => {
  // Un sello que grita «-5%» desinfla la oferta en vez de venderla.
  assert.strictEqual(sello(NEBU), 'OFERTA');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 910, precioNormalCUP: 1000 }), 'OFERTA', '9 % todavia no');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 900, precioNormalCUP: 1000 }), '-10%', '10 % justo ya si');
});

test('a partir del minimo el sello dice el numero', () => {
  assert.strictEqual(sello(PEINE), '-52%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 400, precioNormalCUP: 600 }), '-33%');
});

test('el precio de referencia es el de la MONEDA del producto', () => {
  // El cliente ve tachado el precio en la moneda principal: tiene que poder
  // comprobar la cuenta con los dos numeros que tiene delante.
  const soloUsdCoherente = { enOferta: true, moneda: 'usd', precioUSD: 5, precioNormalUSD: 10, precioCUP: 4250, precioNormalCUP: 8500 };
  assert.strictEqual(porciento(soloUsdCoherente), 50);
  const enCup = { enOferta: true, moneda: 'cup', precioCUP: 350, precioNormalCUP: 500, precioUSD: 1, precioNormalUSD: 1 };
  assert.strictEqual(porciento(enCup), 30, 'en cup manda el par de CUP');
});

test('cualquier entrada rara calla, nunca enseña NaN', () => {
  assert.strictEqual(porciento(null), null);
  assert.strictEqual(porciento(undefined), null);
  assert.strictEqual(porciento('x'), null);
  assert.strictEqual(sello(null), '');
  assert.strictEqual(hayRebaja(undefined), false);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 100, precioNormalCUP: 0 }), null);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 0, precioNormalCUP: 100 }), null);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 100, precioNormalCUP: 100 }), null, 'mismo precio no es rebaja');
});
