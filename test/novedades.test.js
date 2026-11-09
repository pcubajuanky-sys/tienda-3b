// test/novedades.test.js — pruebas de novedades.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'novedades.js'), 'utf8'), sandbox);
const { esNuevo, lista, DIAS } = sandbox.window.Novedades;

const DIA = 86400000;
const AHORA = 1800000000000;

test('la ventana por defecto es de 7 dias', () => {
  assert.strictEqual(DIAS, 7);
});

test('justo dentro de 7 dias es nuevo, justo fuera no', () => {
  assert.strictEqual(esNuevo({ creado: AHORA - 7 * DIA }, AHORA), true);
  assert.strictEqual(esNuevo({ creado: AHORA - 7 * DIA - 1 }, AHORA), false);
  assert.strictEqual(esNuevo({ creado: AHORA }, AHORA), true);
});

test('una fecha futura no es nueva', () => {
  assert.strictEqual(esNuevo({ creado: AHORA + 1 }, AHORA), false);
  assert.strictEqual(esNuevo({ creado: AHORA + 5 * DIA }, AHORA), false);
});

test('sin creado (o invalido) no es nuevo', () => {
  assert.strictEqual(esNuevo({}, AHORA), false);
  assert.strictEqual(esNuevo({ creado: 0 }, AHORA), false);
  assert.strictEqual(esNuevo({ creado: 'x' }, AHORA), false);
  assert.strictEqual(esNuevo(null, AHORA), false);
});

test('el parametro dias cambia la ventana', () => {
  assert.strictEqual(esNuevo({ creado: AHORA - 10 * DIA }, AHORA, 14), true);
  assert.strictEqual(esNuevo({ creado: AHORA - 10 * DIA }, AHORA, 7), false);
});

test('lista ordena del mas reciente al mas viejo y deja fuera lo que no es nuevo', () => {
  const items = [
    { id: 'a', creado: AHORA - 3 * DIA },
    { id: 'b', creado: AHORA - 1 * DIA },
    { id: 'c', creado: AHORA - 30 * DIA },
    { id: 'd' },
    { id: 'e', creado: AHORA - 2 * DIA },
  ];
  assert.strictEqual(lista(items, AHORA).map((x) => x.id).join(), 'b,e,a');
});

test('lista respeta el tope max (12 por defecto)', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, creado: AHORA - (i + 1) * 1000 }));
  assert.strictEqual(lista(items, AHORA).length, 12);
  assert.strictEqual(lista(items, AHORA, { max: 3 }).length, 3);
  assert.strictEqual(lista(items, AHORA, { max: 3 })[0].id, 'p0');
});

test('lista no muta la entrada y devuelve un array nuevo', () => {
  const items = [{ id: 'a', creado: AHORA - 3 * DIA }, { id: 'b', creado: AHORA - 1 * DIA }];
  const copia = JSON.stringify(items);
  const r = lista(items, AHORA);
  assert.notStrictEqual(r, items);
  assert.strictEqual(JSON.stringify(items), copia);
  assert.strictEqual(lista(null, AHORA).length, 0);
});
