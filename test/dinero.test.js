// test/dinero.test.js — pruebas de dinero.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
//
// 🔴 Nada de assert.deepStrictEqual contra un objeto literal: el objeto que devuelve totales()
// NACE dentro del sandbox de node:vm (otro realm) y falla aunque el contenido sea identico.
// Se comprueba campo por campo con strictEqual.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
// dinero.js usa window.Descuento (hayRebaja): se carga ANTES, como en las paginas.
for (const f of ['descuento.js', 'dinero.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox);
}
const { ahorroUSD, elegibleUSD, aCUP, totales } = sandbox.window.Dinero;

const TASA = 850;
const ABRIGO = { moneda: 'usd', precioUSD: 5, precioCUP: 4250, enOferta: false };
const ANILLO = { moneda: 'usd', precioUSD: 1.2, precioCUP: 1020, enOferta: false };
// En oferta de verdad: 6 -> 5 USD.
const REBAJADO = { moneda: 'usd', enOferta: true, precioUSD: 5, precioNormalUSD: 6, precioCUP: 4250, precioNormalCUP: 5100 };
// El Tic-Tac: la «oferta» SUBE el precio. No es rebaja.
const TICTAC = { moneda: 'usd', enOferta: true, precioUSD: 0.72, precioNormalUSD: 0.7, precioCUP: 612, precioNormalCUP: 595 };
const TRANSPORTE = { moneda: 'usd', precioUSD: 40, precioCUP: 34000, enOferta: false, envioAparte: true };

test('1. dos lineas sin rebaja: el USD es exacto y el CUP se deriva del total', () => {
  const t = totales([{ p: ABRIGO, qty: 1 }, { p: ANILLO, qty: 2 }], TASA);
  assert.strictEqual(t.usd, 7.4);
  assert.strictEqual(t.usdAhorro, 0);
  assert.strictEqual(t.usdNormal, t.usd);
  assert.strictEqual(t.cup, Math.round(7.4 * TASA));
  assert.strictEqual(t.cup, 6290);
  assert.strictEqual(t.cupAhorro, 0);
  assert.strictEqual(t.cupNormal, t.cup);
});

test('2. con rebaja: usdNormal = usd + usdAhorro, y lo mismo en CUP', () => {
  const t = totales([{ p: REBAJADO, qty: 1 }, { p: ANILLO, qty: 2 }], TASA);
  assert.strictEqual(t.usd, 7.4);
  assert.strictEqual(t.usdAhorro, 1);
  assert.strictEqual(t.usdNormal, 8.4);
  assert.strictEqual(t.usdNormal, t.usd + t.usdAhorro);
  assert.strictEqual(t.cup, 6290);
  assert.strictEqual(t.cupAhorro, 850);
  assert.strictEqual(t.cupNormal, t.cup + t.cupAhorro);
  assert.strictEqual(t.cupNormal, 7140);
});

test('🔴 la resta cuadra con qty > 1: usdNormal - usdAhorro = usd', () => {
  const CON_REBAJA = { moneda: 'usd', enOferta: true, precioUSD: 5, precioNormalUSD: 6, precioCUP: 4250, precioNormalCUP: 5100 };
  const t = totales([{ p: CON_REBAJA, qty: 3 }], TASA);
  assert.strictEqual(t.usdAhorro, 3);
  assert.strictEqual(t.usdNormal, 18);
  assert.strictEqual(Math.round((t.usdNormal - t.usdAhorro) * 100) / 100, t.usd);
});

test('3. ahorroUSD vale 0 cuando el «antes» NO es mayor (el Tic-Tac)', () => {
  assert.strictEqual(ahorroUSD(TICTAC), 0);
  assert.strictEqual(ahorroUSD(ABRIGO), 0, 'sin oferta tampoco');
  assert.strictEqual(ahorroUSD(REBAJADO), 1);
  assert.strictEqual(ahorroUSD(null), 0);
  const t = totales([{ p: TICTAC, qty: 2 }], TASA);
  assert.strictEqual(t.usd, 1.44);
  assert.strictEqual(t.usdAhorro, 0);
  assert.strictEqual(t.usdNormal, t.usd);
});

test('ahorroUSD se redondea a 2 decimales (sin colas de coma flotante)', () => {
  const p = { moneda: 'usd', enOferta: true, precioUSD: 0.24, precioNormalUSD: 0.5, precioCUP: 204, precioNormalCUP: 425 };
  assert.strictEqual(ahorroUSD(p), 0.26);
});

test('4. elegibleUSD EXCLUYE los envioAparte y totales los INCLUYE (dos cuentas distintas)', () => {
  const items = [{ p: ABRIGO, qty: 1 }, { p: TRANSPORTE, qty: 1 }];
  assert.strictEqual(elegibleUSD(items), 5);
  assert.strictEqual(totales(items, TASA).usd, 45);
  assert.strictEqual(elegibleUSD([{ p: ANILLO, qty: 2 }, { p: ABRIGO, qty: 1 }]), 7.4);
});

test('5. sin tasa valida (ausente, 0, negativa, texto) el CUP es null y el USD sigue bien', () => {
  for (const tasa of [undefined, null, 0, -850, 'abc', NaN]) {
    const t = totales([{ p: REBAJADO, qty: 1 }, { p: ANILLO, qty: 2 }], tasa);
    assert.strictEqual(t.usd, 7.4, 'usd con tasa ' + String(tasa));
    assert.strictEqual(t.usdAhorro, 1);
    assert.strictEqual(t.usdNormal, 8.4);
    assert.strictEqual(t.cup, null, 'cup con tasa ' + String(tasa));
    assert.strictEqual(t.cupAhorro, null);
    assert.strictEqual(t.cupNormal, null);
    assert.strictEqual(aCUP(7.4, tasa), null);
  }
  assert.strictEqual(aCUP(7.4, 850), 6290);
  assert.strictEqual(aCUP(7.4, '850'), 6290, 'una tasa numerica en texto vale');
});

test('6. carrito vacio: todo 0, y el CUP es 0 (no null) con tasa valida', () => {
  for (const vacio of [[], undefined, null]) {
    const t = totales(vacio, TASA);
    assert.strictEqual(t.usd, 0);
    assert.strictEqual(t.usdAhorro, 0);
    assert.strictEqual(t.usdNormal, 0);
    assert.strictEqual(t.cup, 0);
    assert.strictEqual(t.cupAhorro, 0);
    assert.strictEqual(t.cupNormal, 0);
  }
  assert.strictEqual(elegibleUSD([]), 0);
  assert.strictEqual(elegibleUSD(undefined), 0);
  const sinTasa = totales([], undefined);
  assert.strictEqual(sinTasa.usd, 0);
  assert.strictEqual(sinTasa.cup, null);
});

test('7. cantidades: qty 3 multiplica; un qty basura se IGNORA (no cuenta como 1)', () => {
  const t = totales([{ p: ABRIGO, qty: 3 }], TASA);
  assert.strictEqual(t.usd, 15);
  assert.strictEqual(t.cup, 12750);
  // Decision: igual que Descuento.totales, una linea con qty que no sea > 0 se ignora.
  for (const qty of [0, -2, 'x', undefined, null, NaN]) {
    const b = totales([{ p: ABRIGO, qty: qty }, { p: ANILLO, qty: 1 }], TASA);
    assert.strictEqual(b.usd, 1.2, 'qty ' + String(qty));
    assert.strictEqual(elegibleUSD([{ p: ABRIGO, qty: qty }]), 0);
  }
  // Lineas rotas tampoco rompen nada.
  assert.strictEqual(totales([null, {}, { qty: 1 }, { p: ANILLO, qty: 1 }], TASA).usd, 1.2);
});

test('la suma en USD no arrastra colas de coma flotante', () => {
  // 0.1 + 0.2 = 0.30000000000000004 en JS.
  const A = { moneda: 'usd', precioUSD: 0.1, precioCUP: 85, enOferta: false };
  const B = { moneda: 'usd', precioUSD: 0.2, precioCUP: 170, enOferta: false };
  const t = totales([{ p: A, qty: 1 }, { p: B, qty: 1 }], TASA);
  assert.strictEqual(t.usd, 0.3);
  assert.strictEqual(t.cup, 255);
});
