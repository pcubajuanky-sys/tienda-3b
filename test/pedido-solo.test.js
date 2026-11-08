// test/pedido-solo.test.js — pruebas de pedido-solo.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'pedido-solo.js'), 'utf8'), sandbox);
const { puede, cantidadInicial, texto, TEXTO_BOTON } = sandbox.window.PedidoSolo;

const OK = { cerrada: false, enEspera: false, agotada: false, conVariantes: false, clave: null, tope: null };

test('puede: producto normal se vende', () => {
  assert.strictEqual(puede(OK), true);
});

test('puede: cerrada, en espera o agotada lo ocultan', () => {
  assert.strictEqual(puede({ ...OK, cerrada: true }), false);
  assert.strictEqual(puede({ ...OK, enEspera: true }), false);
  assert.strictEqual(puede({ ...OK, agotada: true }), false);
});

test('puede: con variantes exige combinacion completa', () => {
  assert.strictEqual(puede({ ...OK, conVariantes: true, clave: null }), false);
  assert.strictEqual(puede({ ...OK, conVariantes: true, clave: 'M / ROJO' }), true);
});

test('puede: tope 0 lo oculta, otro tope no', () => {
  assert.strictEqual(puede({ ...OK, tope: 0 }), false);
  assert.strictEqual(puede({ ...OK, tope: 3 }), true);
});

test('puede: sin argumentos no revienta', () => {
  assert.strictEqual(typeof puede(), 'boolean');
});

test('cantidadInicial: 1 si no hay nada, la del carrito si la hay', () => {
  assert.strictEqual(cantidadInicial(0, null), 1);
  assert.strictEqual(cantidadInicial(undefined, null), 1);
  assert.strictEqual(cantidadInicial(3, null), 3);
});

test('cantidadInicial: respeta el tope y nunca baja de 1', () => {
  assert.strictEqual(cantidadInicial(5, 2), 2);
  assert.strictEqual(cantidadInicial(1, 1), 1);
  assert.strictEqual(cantidadInicial(-4, 3), 1);
  assert.strictEqual(cantidadInicial('x', 3), 1);
});

test('texto: sin carrito solo la franja; con carrito avisa de que queda guardado', () => {
  assert.strictEqual(texto(0), '⚡ Pedido rápido: solo este producto.');
  assert.strictEqual(texto(undefined), '⚡ Pedido rápido: solo este producto.');
  assert.strictEqual(texto(4), '⚡ Pedido rápido: solo este producto. Tu carrito (4) queda guardado.');
});

test('el boton lleva el texto del plan', () => {
  assert.strictEqual(TEXTO_BOTON, '⚡ Pedir solo este');
});

test('🔴 el cableado existe: script, #modal-solo y #panel-solo en las TRES cascaras, y en sw.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    assert.match(h, /<script src="pedido-solo\.js"><\/script>/, f + ': falta el script');
    assert.match(h, /id="modal-solo"/, f + ': falta #modal-solo');
    assert.match(h, /id="panel-solo"/, f + ': falta #panel-solo');
  }
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert.match(sw, /'\/pedido-solo\.js'/);
  const app = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8');
  assert.match(app, /data-solo/);
  assert.match(app, /PedidoSolo/);
});
