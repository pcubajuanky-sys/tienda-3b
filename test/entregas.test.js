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

const SUJ = ' (sujeto a disponibilidad del mensajero)';
const sujetos = (a) => Array.from(a.filter((x) => x.sujeto), (x) => x.clave);

test('la anticipacion se cuenta contra el FIN: normal hasta fin-60 inclusive, luego sujeto, y tras el fin no sale', () => {
  const o1130 = E.opciones(undefined, cuba('2026-11-09', '11:30'));
  assert.deepStrictEqual(claves(o1130.hoy), ['2026-11-09|t1', '2026-11-09|t2', '2026-11-09|t3']);
  assert.deepStrictEqual(sujetos(o1130.hoy), ['2026-11-09|t1']);
  assert.strictEqual(o1130.hoy[0].texto, 'Hoy lunes 9/11 · 9–12 m' + SUJ);
  assert.deepStrictEqual(sujetos(E.opciones(undefined, cuba('2026-11-09', '11:00')).hoy), []);
  assert.deepStrictEqual(claves(E.opciones(undefined, cuba('2026-11-09', '12:00')).hoy), ['2026-11-09|t2', '2026-11-09|t3']);
});

test('sabado: 18:00 t3 normal; 18:15 t3 sujeto + aviso; 19:00 hoy vacio + aviso', () => {
  const a = E.opciones(undefined, cuba('2026-11-14', '18:00'));
  assert.deepStrictEqual(sujetos(a.hoy), []);
  assert.strictEqual(a.aviso, '');
  const b = E.opciones(undefined, cuba('2026-11-14', '18:15'));
  assert.deepStrictEqual(claves(b.hoy), ['2026-11-14|t3']);
  assert.strictEqual(b.hoy[0].texto, 'Hoy sábado 14/11 · 4–7 pm' + SUJ);
  assert.match(b.aviso, /empezamos el lunes a las 9 am/);
  const c = E.opciones(undefined, cuba('2026-11-14', '19:00'));
  assert.strictEqual(c.hoy.length, 0);
  assert.match(c.aviso, /lunes/);
});

test('lunes 19:30: hoy vacio, martes, sin aviso', () => {
  const o = E.opciones(undefined, cuba('2026-11-09', '19:30'));
  assert.strictEqual(o.hoy.length, 0);
  assert.strictEqual(o.proximo.dia, 'martes');
  assert.strictEqual(o.aviso, '');
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
  assert.ok(E.esTextoTurno('Hoy sábado 14/11 · 4–7 pm (sujeto a disponibilidad del mensajero)'));
  assert.ok(!E.esTextoTurno('Por la tarde después de las 5'));
  assert.ok(!E.esTextoTurno('Hoy me viene bien'));
  assert.ok(!E.esTextoTurno(''));
  const o = E.opciones(undefined, Date.UTC(2026, 10, 9, 12, 0));
  assert.ok(o.hoy.concat(o.proximo.turnos).every((x) => E.esTextoTurno(x.texto)));
});

test('etiqueta = solo el horario (sin dia ni fecha); texto sigue completo', () => {
  const o = E.opciones(undefined, cuba('2026-11-09', '08:00'));
  assert.ok(o.hoy.length > 0);
  for (const x of Array.from(o.hoy).concat(Array.from(o.proximo.turnos))) {
    assert.ok(x.texto.endsWith(' · ' + x.etiqueta), x.texto);
    assert.ok(!/\d+\/\d+/.test(x.etiqueta), x.etiqueta);
  }
  assert.strictEqual(o.proximo.turnos[1].etiqueta, '1–4 pm');
  const tarde = E.opciones(undefined, cuba('2026-11-09', '18:15'));
  assert.strictEqual(tarde.hoy[0].etiqueta, '4–7 pm (sujeto a disponibilidad del mensajero)');
});
