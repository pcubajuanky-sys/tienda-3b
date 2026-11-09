// test/ofertadia.test.js — pruebas de ofertadia.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'ofertadia.js'), 'utf8'), sandbox);
const { restante, formato, desfase, vigente } = sandbox.window.OfertaDia;

const H = 3600000;
const AHORA = 1800000000000;

test('restante descompone horas, minutos y segundos', () => {
  const r = restante(AHORA + 5 * H + 12 * 60000 + 9000, AHORA);
  assert.deepStrictEqual({ h: r.h, m: r.m, s: r.s, terminada: r.terminada }, { h: 5, m: 12, s: 9, terminada: false });
});

test('restante nunca es negativo y marca terminada', () => {
  const r = restante(AHORA - 5000, AHORA);
  assert.deepStrictEqual({ h: r.h, m: r.m, s: r.s, terminada: r.terminada }, { h: 0, m: 0, s: 0, terminada: true });
  assert.strictEqual(restante(AHORA, AHORA).terminada, true);
});

test('restante redondea los ms hacia arriba: a 400 ms de acabar aun dice 1 s', () => {
  const r = restante(AHORA + 400, AHORA);
  assert.strictEqual(r.s, 1);
  assert.strictEqual(r.terminada, false);
});

test('restante con entrada rara no da NaN: se considera terminada', () => {
  for (const x of [undefined, null, 'x', NaN]) {
    const r = restante(x, AHORA);
    assert.strictEqual(r.terminada, true);
    assert.strictEqual(r.h, 0);
  }
});

test('formato: HH:MM:SS con 1 h o mas, MM:SS con menos', () => {
  assert.strictEqual(formato({ h: 5, m: 12, s: 9, terminada: false }), '05:12:09');
  assert.strictEqual(formato({ h: 0, m: 12, s: 9, terminada: false }), '12:09');
  assert.strictEqual(formato({ h: 0, m: 0, s: 5, terminada: false }), '00:05');
  assert.strictEqual(formato({ h: 23, m: 59, s: 59, terminada: false }), '23:59:59');
});

test('desfase: servidor menos telefono, con la cabecera Date', () => {
  const cab = new Date(AHORA).toUTCString();   // sin ms
  assert.strictEqual(desfase(cab, AHORA - 2 * H), 2 * H);
  assert.strictEqual(desfase(cab, AHORA + 3 * H), -3 * H);
});

test('desfase: sin cabecera o ilegible, 0', () => {
  for (const x of [undefined, null, '', 'basura']) assert.strictEqual(desfase(x, AHORA), 0);
});

const ITEM = { id: 'a1', codigo: 'K7M2', enOferta: true, precioCUP: 800, precioNormalCUP: 1000 };
const cat = (extra) => Object.assign({ items: [ITEM, { id: 'b2', codigo: 'ZZZZ' }], ofertaDia: { codigo: 'K7M2', hasta: AHORA + H } }, extra);

test('vigente devuelve el item y el fin cuando todo cuadra', () => {
  const v = vigente(cat(), AHORA);
  assert.strictEqual(v.item.id, 'a1');
  assert.strictEqual(v.hasta, AHORA + H);
});

test('vigente: null sin bloque, sin catalogo o sin items', () => {
  assert.strictEqual(vigente({ items: [ITEM] }, AHORA), null);
  assert.strictEqual(vigente(null, AHORA), null);
  assert.strictEqual(vigente({ ofertaDia: { codigo: 'K7M2', hasta: AHORA + H } }, AHORA), null);
});

test('vigente: null si el item ya no esta (tienda del socio) ', () => {
  assert.strictEqual(vigente(cat({ items: [{ id: 'b2', codigo: 'ZZZZ' }] }), AHORA), null);
});

test('🔴 vigente: null si el item ya no esta en oferta', () => {
  assert.strictEqual(vigente(cat({ items: [Object.assign({}, ITEM, { enOferta: false })] }), AHORA), null);
});

test('🔴 vigente: null si hasta ya paso o es justo ahora (catalogo viejo tras la medianoche)', () => {
  assert.strictEqual(vigente(cat({ ofertaDia: { codigo: 'K7M2', hasta: AHORA - 1 } }), AHORA), null);
  assert.strictEqual(vigente(cat({ ofertaDia: { codigo: 'K7M2', hasta: AHORA } }), AHORA), null);
});

test('vigente: hasta invalido o sin codigo no enseña nada', () => {
  assert.strictEqual(vigente(cat({ ofertaDia: { codigo: 'K7M2', hasta: 'x' } }), AHORA), null);
  assert.strictEqual(vigente(cat({ ofertaDia: { hasta: AHORA + H } }), AHORA), null);
});
