// test/colecciones.test.js — pruebas de colecciones.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'colecciones.js'), 'utf8'), sandbox);
const { deCatalogo } = sandbox.window.Colecciones;

test('sin colecciones en el catalogo no se pinta nada', () => {
  assert.strictEqual(deCatalogo({ items: [{ id: 'a', colecciones: ['regalar'] }] }).length, 0);
  assert.strictEqual(deCatalogo(null).length, 0);
});

test('una coleccion con 2 items se pinta con titulo emoji + nombre', () => {
  const r = deCatalogo({
    colecciones: [{ id: 'regalar', nombre: 'Para regalar', emoji: '🎁' }],
    items: [{ id: 'a', colecciones: ['regalar'] }, { id: 'b', colecciones: ['regalar', 'apagones'] }, { id: 'c' }],
  });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].titulo, '🎁 Para regalar');
  assert.strictEqual(r[0].items.map((p) => p.id).join(','), 'a,b');
});

test('con un solo item no se pinta', () => {
  const r = deCatalogo({
    colecciones: [{ id: 'apagones', nombre: 'Para los apagones', emoji: '🔦' }],
    items: [{ id: 'a', colecciones: ['apagones'] }, { id: 'b' }],
  });
  assert.strictEqual(r.length, 0);
});
