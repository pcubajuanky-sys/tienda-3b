// test/completar.test.js — pruebas de completar.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'completar.js'), 'utf8'), sandbox);
const { candidatos, MAX } = sandbox.window.Completar;

const items = [
  { id: 'a', name: 'Barato', precioCUP: 300 },
  { id: 'b', name: 'Justo', precioCUP: 500 },
  { id: 'c', name: 'Pasa', precioCUP: 900 },
  { id: 'd', name: 'Caro', precioCUP: 5000 },
];

test('solo ofrece lo que de verdad cruza el umbral', () => {
  const r = candidatos(items, { falta: 500, excluirIds: [] });
  assert.deepStrictEqual(r.map((p) => p.id), ['b', 'c', 'd']);
});

test('lo que cuesta justo lo que falta SI cuenta: el umbral es «desde»', () => {
  const r = candidatos(items, { falta: 500, excluirIds: [] });
  assert.ok(r.some((p) => p.id === 'b'), 'el de 500 tiene que estar con falta 500');
});

test('van de mas barato a mas caro: lo que menos le cuesta, primero', () => {
  const r = candidatos(items, { falta: 100, excluirIds: [] });
  assert.deepStrictEqual(r.map((p) => p.precioCUP), [300, 500, 900, 5000]);
});

test('no ofrece lo que ya esta en el carrito', () => {
  const r = candidatos(items, { falta: 500, excluirIds: ['b', 'd'] });
  assert.deepStrictEqual(r.map((p) => p.id), ['c']);
});

test('nunca ofrece transporte aparte: ese producto NO suma para el umbral', () => {
  const lista = items.concat([{ id: 'x', name: 'Mueble', precioCUP: 900, envioAparte: true }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'x'), 'un envioAparte no puede dar mensajeria gratis');
});

test('nunca ofrece lo que esta pedido y esperando confirmacion', () => {
  const lista = items.concat([{ id: 'y', name: 'Pedido', precioCUP: 900, espera: true }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'y'), 'lo que no se vende no se ofrece');
});

test('nunca ofrece productos con variantes: el boton de añadir necesitaria una talla', () => {
  const lista = items.concat([{ id: 'z', name: 'Camisa', precioCUP: 900, variantes: { ejes: ['Talla'] } }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'z'), 'con variantes no se puede añadir de un toque');
});

test('devuelve como mucho MAX', () => {
  const muchos = [];
  for (let i = 0; i < 30; i++) muchos.push({ id: 'p' + i, name: 'P' + i, precioCUP: 1000 + i });
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [] }).length, MAX);
});

test('el tope se puede bajar, nunca subir por encima de MAX', () => {
  const muchos = [];
  for (let i = 0; i < 30; i++) muchos.push({ id: 'p' + i, name: 'P' + i, precioCUP: 1000 + i });
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [], max: 2 }).length, 2);
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [], max: 99 }).length, MAX);
});

// 🔴 Los dos tests de abajo comprueban `.length === 0` y NO `deepStrictEqual(x, [])`.
// Motivo, medido el 2026-10-22: las salidas tempranas del modulo son `return []`, un
// literal creado DENTRO del sandbox de node:vm, que no comparte el Array de este realm
// (`r instanceof Array` da false) — deepStrictEqual contra un literal falla siempre.
//
// 🔴 Matiz que el CLAUDE.md del proyecto enuncia demasiado ancho: NO todo array que vuelve
// del sandbox tiene el problema. `items.filter(...)` hereda el Array de `items`, que lo
// pasamos nosotros desde FUERA, asi que ese si es un Array normal. Por eso los tests de
// arriba pueden usar deepStrictEqual sobre `.map(...)` sin problema, y estos dos no.
test('sin hueco que llenar no se ofrece nada', () => {
  assert.strictEqual(candidatos(items, { falta: 0, excluirIds: [] }).length, 0);
  assert.strictEqual(candidatos(items, { falta: -5, excluirIds: [] }).length, 0);
});

test('no lanza con basura', () => {
  assert.strictEqual(candidatos(null, { falta: 500, excluirIds: [] }).length, 0);
  assert.strictEqual(candidatos(items, null).length, 0);
  assert.strictEqual(candidatos([null, undefined, {}], { falta: 500, excluirIds: [] }).length, 0);
  assert.strictEqual(candidatos(items, { falta: 'mucho', excluirIds: [] }).length, 0);
});
