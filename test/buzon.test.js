// test/buzon.test.js — pruebas de buzon.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'buzon.js'), 'utf8'), sandbox);
const { nuevoId, conCodigo, enviar, ALFABETO } = sandbox.window.Buzon;

test('nuevoId: 6 caracteres del alfabeto de Stock+ (sin I, O, 0, 1)', () => {
  for (let i = 0; i < 200; i++) {
    const id = nuevoId();
    assert.match(id, /^[A-HJ-NP-Z2-9]{6}$/);
  }
  assert.ok(!/[IO01]/.test(ALFABETO));
});

test('nuevoId: el azar se puede inyectar y los extremos no se salen del alfabeto', () => {
  assert.strictEqual(nuevoId(() => 0), 'AAAAAA');
  assert.strictEqual(nuevoId(() => 5), '999999');        // >=1 se acota al ultimo simbolo
  assert.strictEqual(nuevoId(() => NaN), 'AAAAAA');
});

test('conCodigo: va justo antes de la ULTIMA linea Ref:', () => {
  const t = 'hola\nRef: AAAA\nmas\n\nRef: BBBB x1';
  assert.strictEqual(conCodigo(t, 'K7M2QX'), 'hola\nRef: AAAA\nmas\n\nCódigo: K7M2QX\nRef: BBBB x1');
});

test('conCodigo: la Ref sigue siendo la ultima linea', () => {
  const l = conCodigo('a\nb\nRef: X1', 'AB23CD').split('\n');
  assert.strictEqual(l[l.length - 1], 'Ref: X1');
  assert.strictEqual(l[l.length - 2], 'Código: AB23CD');
});

test('conCodigo: sin Ref: lo pone al final; sin id o sin texto no toca nada', () => {
  assert.strictEqual(conCodigo('a\nb', 'AB23CD'), 'a\nb\nCódigo: AB23CD');
  assert.strictEqual(conCodigo('a\nRef: X', ''), 'a\nRef: X');
  assert.strictEqual(conCodigo('', 'AB23CD'), '');
  assert.strictEqual(conCodigo(undefined, 'AB23CD'), '');
});

test('enviar: llama a sendBeacon con un Blob JSON y devuelve true', () => {
  let llamada = null;
  class FakeBlob { constructor(partes, o) { this.partes = partes; this.type = o.type; } }
  const nav = { sendBeacon: (url, b) => { llamada = { url, b }; return true; } };
  const r = enviar('pedido', 'AB23CD', 'texto', { navigator: nav, Blob: FakeBlob });
  assert.strictEqual(r, true);
  assert.strictEqual(llamada.url, '/api/buzon');
  assert.strictEqual(llamada.b.type, 'application/json');
  assert.deepStrictEqual(JSON.parse(llamada.b.partes[0]), { tipo: 'pedido', id: 'AB23CD', texto: 'texto' });
});

test('enviar: NUNCA lanza (sin sendBeacon, sin Blob, o sendBeacon que revienta)', () => {
  class FakeBlob { constructor() {} }
  assert.strictEqual(enviar('a', 'b', 'c', { navigator: {}, Blob: FakeBlob }), false);
  assert.strictEqual(enviar('a', 'b', 'c', { navigator: { sendBeacon: () => true }, Blob: null }), false);
  assert.strictEqual(enviar('a', 'b', 'c', { navigator: { sendBeacon: () => { throw new Error('x'); } }, Blob: FakeBlob }), false);
  assert.strictEqual(enviar('a', 'b', 'c', { navigator: { sendBeacon: () => false }, Blob: FakeBlob }), false);
  assert.doesNotThrow(() => enviar('a', 'b', 'c'));   // sin deps, en Node: no hay navigator con sendBeacon
});

test('enviar no es async (devuelve un booleano, no una promesa)', () => {
  class FakeBlob { constructor() {} }
  const r = enviar('a', 'b', 'c', { navigator: { sendBeacon: () => true }, Blob: FakeBlob });
  assert.strictEqual(typeof r, 'boolean');
});
