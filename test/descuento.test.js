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
const { porciento, hayRebaja, sello, ahorroCUP, totales } = sandbox.window.Descuento;

// Productos reales del catalogo del 2026-10-27.
const PEINE = { enOferta: true, moneda: 'usd', precioCUP: 204, precioNormalCUP: 425, precioUSD: 0.24, precioNormalUSD: 0.5 };
const NEBU  = { enOferta: true, moneda: 'usd', precioCUP: 16150, precioNormalCUP: 17000, precioUSD: 19, precioNormalUSD: 20 };
const TICTAC = { enOferta: true, moneda: 'usd', precioCUP: 612, precioNormalCUP: 595, precioUSD: 0.72, precioNormalUSD: 0.7 };
const NORMAL = { enOferta: false, moneda: 'cup', precioCUP: 1000, precioNormalCUP: 0 };

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

test('🔴 el numero se enseña SIEMPRE, tambien por debajo del 10 %', () => {
  // Hasta el 2026-10-28 estas tres decian «OFERTA». Ruth pidio el numero siempre: un 5 % es
  // menos gancho que un 52 %, pero es la verdad y es mas que no decir nada.
  assert.strictEqual(sello(NEBU), 'Ahorras 5%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 910, precioNormalCUP: 1000 }), 'Ahorras 9%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 900, precioNormalCUP: 1000 }), 'Ahorras 10%', 'el epsilon sigue vivo: 10 % justo no puede dar 9');
});

test('el sello dice el ahorro, no la resta', () => {
  assert.strictEqual(sello(PEINE), 'Ahorras 52%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 400, precioNormalCUP: 600 }), 'Ahorras 33%');
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

test('el ahorro en CUP es la resta de los dos precios en CUP', () => {
  assert.strictEqual(ahorroCUP(PEINE), 221);          // 425 - 204
  assert.strictEqual(ahorroCUP(NEBU), 850);           // 17000 - 16150, aunque solo sea un 5 %
  assert.strictEqual(ahorroCUP(NORMAL), 0, 'sin oferta no se ahorra nada');
});

test('🔴 una oferta que sube el precio NO descuenta (ni suma) nada', () => {
  // El Tic-Tac real: 595 -> 612. Sin esta guarda el carrito ensenaria un «descuento» negativo
  // y el «precio normal» saldria por DEBAJO de lo que se paga.
  assert.strictEqual(ahorroCUP(TICTAC), 0);
});

test('ahorroCUP calla ante cualquier entrada rara', () => {
  assert.strictEqual(ahorroCUP(null), 0);
  assert.strictEqual(ahorroCUP(undefined), 0);
  assert.strictEqual(ahorroCUP('x'), 0);
  // Rebaja real en USD pero el par de CUP no concuerda (redondeo al publicar): max(0, ...).
  assert.strictEqual(ahorroCUP({ enOferta: true, moneda: 'usd', precioUSD: 5, precioNormalUSD: 10, precioCUP: 4250, precioNormalCUP: 4250 }), 0);
});

test('🔴 el desglose del carrito SIEMPRE cuadra: normal - descuento = pagas', () => {
  const d = totales([{ p: PEINE, qty: 1 }, { p: NORMAL, qty: 2 }]);
  assert.strictEqual(d.pagas, 204 + 2000);
  assert.strictEqual(d.descuento, 221);
  assert.strictEqual(d.normal, d.pagas + d.descuento);
  assert.strictEqual(d.normal, 2425);
});

test('el ahorro se multiplica por la cantidad', () => {
  const d = totales([{ p: PEINE, qty: 3 }]);
  assert.strictEqual(d.pagas, 612);
  assert.strictEqual(d.descuento, 663);               // 221 x 3
  assert.strictEqual(d.normal, 1275);                 // 425 x 3
});

test('sin nada rebajado el descuento es 0 y no hay nada que pintar', () => {
  const d = totales([{ p: NORMAL, qty: 1 }, { p: TICTAC, qty: 1 }]);
  assert.strictEqual(d.descuento, 0);
  assert.strictEqual(d.normal, d.pagas, 'el precio normal es el mismo que se paga');
});

test('totales aguanta un carrito vacio o roto sin devolver NaN', () => {
  for (const entrada of [[], null, undefined, 'x', [null], [{ p: null, qty: 1 }], [{ p: PEINE, qty: 0 }], [{ p: PEINE, qty: 'x' }]]) {
    const d = totales(entrada);
    assert.ok(Number.isFinite(d.normal) && Number.isFinite(d.descuento) && Number.isFinite(d.pagas), 'nada de NaN con ' + JSON.stringify(entrada));
  }
  // 🔴 NUNCA deepStrictEqual contra lo que devuelve totales(): el objeto nace DENTRO del
  // sandbox de node:vm, su prototipo es el Object de ESE realm y la asercion falla con
  // «Values have same structure but are not reference-equal» aunque los valores sean
  // identicos. El CLAUDE.md del proyecto ya lo avisaba para los arrays que nacen dentro del
  // modulo; vale igual para los objetos. Campo por campo, con strictEqual.
  const vacio = totales([]);
  assert.strictEqual(vacio.normal, 0);
  assert.strictEqual(vacio.descuento, 0);
  assert.strictEqual(vacio.pagas, 0);
});
