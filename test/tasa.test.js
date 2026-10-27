// test/tasa.test.js — pruebas de tasa.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tasa.js'), 'utf8'), sandbox);
const { valida, numero, chip, aviso, carrito } = sandbox.window.TasaVista;

test('valida solo acepta una tasa que sirva para convertir', () => {
  assert.strictEqual(valida(845), true);
  assert.strictEqual(valida('845'), true, 'el catalogo podria traerla como texto');
  assert.strictEqual(valida(1), false, 'tasa 1 es «sin conversion», no se enseña');
  assert.strictEqual(valida(0), false);
  assert.strictEqual(valida(-5), false);
  assert.strictEqual(valida(undefined), false);
  assert.strictEqual(valida(null), false);
  assert.strictEqual(valida('ochocientos'), false);
  assert.strictEqual(valida(Infinity), false);
});

test('numero se lee como una cifra de dinero', () => {
  assert.strictEqual(numero(845), '845');
  assert.strictEqual(numero(1250), '1,250');
  assert.strictEqual(numero(845.7), '846', 'nadie enseña decimales de una tasa');
});

test('🔴 el chip dice CON QUE tasa estan calculados, no «la tasa de hoy»', () => {
  // La diferencia no es de estilo: el catalogo se republica cada 5 horas y un cambio
  // a mano no lo republica, asi que prometer frescura seria mentir a ratos.
  const t = chip(845);
  assert.ok(t.includes('1 USD = 845 CUP'), 'falta el numero');
  assert.ok(t.includes('Precios en CUP y USD'), 'se perdio el texto que ya estaba');
  assert.ok(!/tasa del d[ií]a/i.test(t), 'no puede prometer que es la tasa de hoy');
  assert.ok(!/toque/i.test(t), 'no puede atribuirsela a elTOQUE');
});

test('🔴 sin tasa, la pagina se ve exactamente como antes', () => {
  // Si Stock+ publicara un catalogo sin tasa, lo peor que puede pasar es que no haya
  // cambiado nada. Nunca un hueco, un «undefined» ni un «1 USD = NaN CUP».
  assert.strictEqual(chip(undefined), 'Precios en CUP y USD');
  assert.strictEqual(chip(0), 'Precios en CUP y USD');
  assert.strictEqual(aviso(null), 'Los precios pueden variar según la tasa del día.');
  assert.strictEqual(carrito(undefined), '');
  assert.strictEqual(carrito('x'), '');
});

test('el aviso del pie lleva el numero y no promete frescura', () => {
  const t = aviso(845);
  assert.ok(t.includes('845'), 'falta el numero');
  assert.ok(/calculados/i.test(t), 'tiene que decir que los precios estan CALCULADOS con ella');
  assert.ok(!/toque/i.test(t));
});

test('la nota del carrito es corta: cabe en 375px', () => {
  const t = carrito(845);
  assert.strictEqual(t, '845 CUP por USD');
  assert.ok(t.length < 24, 'si crece, se parte en dos lineas debajo del total');
});

test('🔴 el cableado existe en los TRES sitios y en las DOS paginas', () => {
  // electripower.html es la tienda del socio y comparte app.js: si solo se cablea
  // index.html, alli se busca un id que no existe.
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('TasaVista.chip('), 'falta el chip de la portada');
  assert.ok(app.includes('TasaVista.aviso('), 'falta el aviso del pie');
  assert.ok(app.includes('TasaVista.carrito('), 'falta la nota del carrito');

  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="hero-dato-moneda"'), pagina + ': falta el id del chip');
    assert.ok(html.includes('id="aviso-tasa"'), pagina + ': falta el id del aviso');
    assert.ok(html.includes('src="tasa.js"'), pagina + ': no carga tasa.js');
    // El texto de reserva se queda escrito en el HTML: si el JS no llega, la pagina
    // se lee igual que siempre en vez de enseñar un hueco.
    assert.ok(html.includes('Precios en CUP y USD'), pagina + ': falta el texto de reserva del chip');
  }

  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes("'/tasa.js'"), 'tasa.js no esta en ARMAZON: sin conexion no cargaria');
});
