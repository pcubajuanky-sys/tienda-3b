// test/entregas.test.js — entregas.js (modulo puro) + paridad con la regla de Stock+.
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'entregas.js'), 'utf8'), sandbox);
const E = sandbox.window.Entregas;

const LIB = path.join(__dirname, '..', '..', 'inventario-stockmas', 'lib', 'turnosEntrega.js');
const LIB_OK = fs.existsSync(LIB);
const lib = LIB_OK ? require(LIB) : null;

const cuba = (fecha, hhmm, off = -240) => {
  const [y, m, d] = fecha.split('-').map(Number), [h, mi] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - off * 60000;
};
const claves = (a) => Array.from(a, (x) => x.clave);
// El vm tiene sus propios Array/Object: se pasa por JSON para comparar con deepStrictEqual.
const plano = (x) => JSON.parse(JSON.stringify(x));

test('lunes 08:00: tres turnos de hoy con dia y fecha, y el martes', () => {
  const o = E.opciones(undefined, cuba('2026-11-09', '08:00'));
  assert.deepStrictEqual(claves(o.hoy), ['2026-11-09|t1', '2026-11-09|t2', '2026-11-09|t3']);
  assert.strictEqual(o.hoy[0].texto, 'Hoy lunes 9/11 · 9–12 m');
  assert.strictEqual(o.proximo.turnos[1].texto, 'Mañana martes 10/11 · 1–4 pm');
  assert.strictEqual(o.aviso, '');
});

test('lunes: la anticipacion de 60 min es inclusiva en el limite', () => {
  assert.deepStrictEqual(claves(E.opciones(undefined, cuba('2026-11-09', '11:30')).hoy), ['2026-11-09|t2', '2026-11-09|t3']);
  assert.deepStrictEqual(claves(E.opciones(undefined, cuba('2026-11-09', '12:00')).hoy), ['2026-11-09|t2', '2026-11-09|t3']);
  assert.deepStrictEqual(claves(E.opciones(undefined, cuba('2026-11-09', '12:01')).hoy), ['2026-11-09|t3']);
});

test('domingo: sin hoy, aviso y el lunes como proximo', () => {
  const o = E.opciones(undefined, cuba('2026-11-08', '10:00'));
  assert.strictEqual(o.hoy.length, 0);
  assert.strictEqual(o.proximo.fecha, '2026-11-09');
  assert.strictEqual(o.aviso, 'Los domingos no hacemos entregas: empezamos el lunes a las 9 am.');
});

function paridad(cfg) {
  const off = cfg && cfg.utcOffsetMin !== undefined ? cfg.utcOffsetMin : -240;
  const ini = cuba('2026-11-07', '00:00', off);
  for (let t = ini; t < ini + 8 * 86400000; t += 15 * 60000) {
    assert.deepStrictEqual(plano(E.opciones(cfg, t)), plano(lib.opciones(cfg, t)), 'difiere en ' + new Date(t).toISOString());
  }
}
test('paridad con lib/turnosEntrega.js: defaults', { skip: !LIB_OK }, () => paridad(undefined));
test('paridad: sabado y domingo cerrados', { skip: !LIB_OK }, () => paridad({ diasSinEntrega: [0, 6] }));
test('paridad: offset -300', { skip: !LIB_OK }, () => paridad({ utcOffsetMin: -300, anticipacionMin: 30 }));

test('esTextoTurno reconoce los textos de turno generados y no los libres', () => {
  assert.ok(E.esTextoTurno('Hoy lunes 9/11 · 9–12 am'));
  assert.ok(E.esTextoTurno('Mañana martes 10/11 · 1–4 pm'));
  assert.ok(E.esTextoTurno('Miércoles 11/11 · 4–7 pm'));
  assert.ok(!E.esTextoTurno('Por la tarde después de las 5'));
  assert.ok(!E.esTextoTurno('Hoy me viene bien'));
  assert.ok(!E.esTextoTurno(''));
  const o = E.opciones(undefined, Date.UTC(2026, 10, 9, 12, 0));
  assert.ok(o.hoy.concat(o.proximo.turnos).every((x) => E.esTextoTurno(x.texto)));
});
