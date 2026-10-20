// test/historial.test.js — pruebas de historial.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'historial.js'), 'utf8'), sandbox);
const { rutaDe, transicion } = sandbox.window.Historial;

const FICHA = { tipo: 'ficha', id: 'p1', codigo: 'abcd' };
const OTRA = { tipo: 'ficha', id: 'p2', codigo: 'EFGH' };
const CARRITO = { tipo: 'carrito' };

test('sin capas abiertas la ruta es la raiz', () => {
  assert.strictEqual(rutaDe([], ''), '/');
});

test('la ficha pone /p/CODIGO en mayusculas', () => {
  assert.strictEqual(rutaDe([FICHA], ''), '/p/ABCD');
});

test('la query se conserva: ahi viaja el ?ref= del gestor', () => {
  assert.strictEqual(rutaDe([FICHA], '?ref=ELAINE'), '/p/ABCD?ref=ELAINE');
  assert.strictEqual(rutaDe([], '?ref=ELAINE'), '/?ref=ELAINE');
});

test('el carrito encima de la ficha deja la URL de abajo: no se comparte por enlace', () => {
  assert.strictEqual(rutaDe([FICHA, CARRITO], ''), '/');
});

test('una ficha sin codigo cae a la raiz en vez de inventarse una URL', () => {
  assert.strictEqual(rutaDe([{ tipo: 'ficha', id: 'x' }], ''), '/');
});

test('abrir la primera capa: nada que cerrar, una que abrir', () => {
  const t = transicion([], [FICHA]);
  assert.deepStrictEqual(t.cerrar, []);
  assert.strictEqual(t.abrir.length, 1);
  assert.strictEqual(t.abrir[0].id, 'p1');
});

test('cerrar la ultima capa: una que cerrar, nada que abrir', () => {
  const t = transicion([FICHA], []);
  assert.deepStrictEqual(t.cerrar, ['ficha:p1']);
  assert.deepStrictEqual(t.abrir, []);
});

test('pasar de una ficha a otra: cierra la vieja y abre la nueva', () => {
  const t = transicion([FICHA], [OTRA]);
  assert.deepStrictEqual(t.cerrar, ['ficha:p1']);
  assert.strictEqual(t.abrir[0].id, 'p2');
});

test('lo que ya esta abierto y sigue abierto no se toca', () => {
  const t = transicion([FICHA], [FICHA, CARRITO]);
  assert.deepStrictEqual(t.cerrar, []);
  assert.strictEqual(t.abrir.length, 1);
  assert.strictEqual(t.abrir[0].tipo, 'carrito');
});

test('cerrar el carrito deja la ficha donde estaba', () => {
  const t = transicion([FICHA, CARRITO], [FICHA]);
  assert.deepStrictEqual(t.cerrar, ['carrito']);
  assert.deepStrictEqual(t.abrir, []);
});

test('se cierra de arriba abajo, nunca al reves', () => {
  const t = transicion([FICHA, CARRITO], []);
  assert.deepStrictEqual(t.cerrar, ['carrito', 'ficha:p1']);
});

test('argumentos ausentes o basura no revientan', () => {
  const vacia = transicion(undefined, undefined);
  assert.strictEqual(vacia.cerrar.length, 0);
  assert.strictEqual(vacia.abrir.length, 0);
  assert.strictEqual(rutaDe(undefined, undefined), '/');
  const nula = transicion([null], [null]);
  assert.strictEqual(nula.cerrar.length, 0);
  assert.strictEqual(nula.abrir.length, 0);
});

test('🔴 la raiz de la pagina del socio es /electripower, no /', () => {
  // Sin raiz, se comporta como siempre (la casa).
  assert.strictEqual(rutaDe([], ''), '/');
  assert.strictEqual(rutaDe([CARRITO], '?ref=K7M2'), '/?ref=K7M2');
  // Con raiz, la del socio.
  assert.strictEqual(rutaDe([], '', '/electripower'), '/electripower');
  assert.strictEqual(rutaDe([CARRITO], '?ref=K7M2', '/electripower'), '/electripower?ref=K7M2');
});

test('la ficha sigue manando sobre la raiz: /p/CODIGO en las dos tiendas', () => {
  const capas = [{ tipo: 'ficha', id: 'x', codigo: '5hp4' }];
  assert.strictEqual(rutaDe(capas, '', '/electripower'), '/p/5HP4');
  assert.strictEqual(rutaDe(capas, '?ref=K7M2'), '/p/5HP4?ref=K7M2');
});
