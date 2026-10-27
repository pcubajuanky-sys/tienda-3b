// test/regreso.test.js — pruebas de regreso.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'regreso.js'), 'utf8'), sandbox);
const { VENTANA_MS, debeSaludar, texto } = sandbox.window.Regreso;

const HORA = 60 * 60 * 1000;
const AHORA = 1800000000000;

test('la ventana es de seis horas: ni una ni un dia', () => {
  assert.strictEqual(VENTANA_MS, 6 * HORA);
});

test('quien vuelve al dia siguiente con el carrito puesto SI se saluda', () => {
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, AHORA, 3), true);
});

test('🔴 recargar la pagina NO es volver', () => {
  // Es el fallo que haria odiosa esta funcion: un aviso que reaparece cada vez que
  // la clienta toca «atras» o recarga.
  assert.strictEqual(debeSaludar(AHORA - 1000, AHORA, 3), false);
  assert.strictEqual(debeSaludar(AHORA - 5 * HORA, AHORA, 3), false);
});

test('justo en las seis horas ya se saluda', () => {
  assert.strictEqual(debeSaludar(AHORA - 6 * HORA, AHORA, 1), true);
});

test('🔴 sin nada en el carrito no hay nada que recordar', () => {
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, AHORA, 0), false);
});

test('la primera visita de su vida no se saluda', () => {
  // Sin marca previa no se sabe cuando estuvo: saludarla seria inventarse una visita.
  assert.strictEqual(debeSaludar(null, AHORA, 2), false);
  assert.strictEqual(debeSaludar('', AHORA, 2), false);
  assert.strictEqual(debeSaludar('ayer', AHORA, 2), false);
  assert.strictEqual(debeSaludar(0, AHORA, 2), false);
});

test('un reloj del telefono cambiado no rompe nada', () => {
  assert.strictEqual(debeSaludar(AHORA + 10 * HORA, AHORA, 2), false, 'marca del futuro');
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, NaN, 2), false);
});

test('el texto cuenta bien el singular y el plural', () => {
  assert.strictEqual(texto(1), 'Tienes 1 producto esperando en tu pedido');
  assert.strictEqual(texto(3), 'Tienes 3 productos esperando en tu pedido');
  assert.strictEqual(texto(0), '', 'sin unidades no hay frase');
  assert.strictEqual(texto('x'), '');
});

test('🔴 el cableado existe en app.js y en las DOS paginas', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('window.Regreso.debeSaludar('), 'app.js no llama al modulo');
  assert.ok(app.includes('saludarSiVuelve('), 'falta la funcion que lo pinta');
  // 🔴 El boton abre el carrito, que es una CAPA del historial: abrirCarrito() y nunca
  // mostrarCarrito(), o el «atras» del telefono dejaria de cerrarlo (ver historial.js).
  assert.ok(!/aviso-regreso-ver[\s\S]{0,260}mostrarCarrito\(/.test(app),
    'el boton del aviso tiene que usar abrirCarrito(), no mostrarCarrito()');
  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="aviso-regreso"'), pagina + ': falta el aviso');
    assert.ok(html.includes('id="aviso-regreso-ver"'), pagina + ': falta el boton de ver el pedido');
    assert.ok(html.includes('id="aviso-regreso-cerrar"'), pagina + ': el aviso tiene que poderse cerrar');
  }
});
