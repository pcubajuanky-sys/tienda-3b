// test/colores.test.js — el contraste de los colores de la tienda, CALCULADO.
//
// Por que existe: el 2026-10-27 se midio en el sitio vivo que «Pedir por WhatsApp»
// quedaba en 1.98:1 en modo oscuro y el sello OFERTA en 2.23:1 — los dos por tinta
// blanca escrita a mano contra un fondo que SI se invierte. Los comentarios del CSS
// ya decian el contraste de otras piezas, pero un comentario no falla cuando alguien
// lo rompe. Esto si.
//
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'estilos.css'), 'utf8');

// Los dos bloques de tokens: todo lo anterior a la consulta de modo oscuro es el tema
// claro; de ahi en adelante, el oscuro. Un token que el oscuro NO redefine hereda del claro.
const I_OSCURO = CSS.indexOf('@media (prefers-color-scheme: dark)');
const CLARO = CSS.slice(0, I_OSCURO);
const OSCURO = CSS.slice(I_OSCURO);

function token(bloque, nombre) {
  const m = bloque.match(new RegExp('--' + nombre + '\\s*:\\s*(#[0-9A-Fa-f]{6})'));
  return m ? m[1] : null;
}
function claro(nombre) {
  const v = token(CLARO, nombre);
  assert.ok(v, 'falta el token --' + nombre + ' en el :root claro');
  return v;
}
function oscuro(nombre) {
  return token(OSCURO, nombre) || claro(nombre);
}

// WCAG 2.1, formula de contraste relativo.
function canales(h) {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16));
}
function lineal(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function luz(h) {
  const [r, g, b] = canales(h);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}
function contraste(a, b) {
  const l1 = luz(a);
  const l2 = luz(b);
  const alto = Math.max(l1, l2);
  const bajo = Math.min(l1, l2);
  return (alto + 0.05) / (bajo + 0.05);
}
function exige(nombre, tinta, fondo, minimo) {
  const r = contraste(tinta, fondo);
  assert.ok(
    r >= minimo,
    nombre + ': ' + tinta + ' sobre ' + fondo + ' da ' + r.toFixed(2) + ':1, hace falta ' + minimo + ':1'
  );
}

test('🔴 «Pedir por WhatsApp» se lee en los dos temas', () => {
  // Es el unico boton de cobrar que tiene esta tienda: el checkout ES la conversacion
  // de WhatsApp. Su letra mide 17px/700, que NO cuenta como texto grande (hace falta
  // 18.66px en negrita), asi que el minimo es 4.5:1 y no 3:1.
  exige('boton WhatsApp claro', claro('wa-ink'), claro('wa'), 4.5);
  exige('boton WhatsApp oscuro', oscuro('wa-ink'), oscuro('wa'), 4.5);
});

test('🔴 el sello OFERTA se lee en los dos temas', () => {
  exige('sello OFERTA claro', claro('oferta-ink'), claro('oferta'), 4.5);
  exige('sello OFERTA oscuro', oscuro('oferta-ink'), oscuro('oferta'), 4.5);
});

test('🔴 ni .btn-wa ni .card-oferta escriben la tinta a mano', () => {
  // Esta es la barrera de verdad: los numeros de arriba solo valen si las reglas usan
  // los tokens. Con `color:#fff` escrito a mano, el token se puede arreglar y el boton
  // seguiria ilegible.
  const btn = CSS.match(/\.btn-wa\{[^}]*\}/);
  assert.ok(btn, 'no se encuentra la regla .btn-wa');
  assert.ok(btn[0].includes('var(--wa-ink)'), '.btn-wa tiene que pedir la tinta al token');
  assert.ok(!/#fff|#FFF/.test(btn[0]), '.btn-wa no puede llevar blanco escrito a mano');

  const sello = CSS.match(/\.card-oferta\{[^}]*\}/);
  assert.ok(sello, 'no se encuentra la regla .card-oferta');
  assert.ok(sello[0].includes('var(--oferta-ink)'), '.card-oferta tiene que pedir la tinta al token');
  assert.ok(!/#fff|#FFF/.test(sello[0]), '.card-oferta no puede llevar blanco escrito a mano');
});

test('el verde de WhatsApp tambien se lee cuando es TEXTO, no fondo', () => {
  // --wa no solo pinta el boton: es el color de «🛵 MENSAJERIA GRATIS» (.envio-chip,
  // 12px), de .envio-detalle, del enlace del pie y de .enc-dominio. Ese chip es una
  // senal de venta: tiene que leerse sobre los tres fondos.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--wa como texto claro sobre --' + fondo, claro('wa'), claro(fondo), 4.5);
    exige('--wa como texto oscuro sobre --' + fondo, oscuro('wa'), oscuro(fondo), 4.5);
  }
});

test('el gris mas tenue sigue siendo texto: tiene que leerse', () => {
  // --text-3 pinta el equivalente en USD del total del carrito y la nota de la tasa
  // del pie, a 11-12px. A ese tamano AA pide 4,5:1 y no hay excepcion de texto grande.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--text-3 claro sobre --' + fondo, claro('text-3'), claro(fondo), 4.5);
    exige('--text-3 oscuro sobre --' + fondo, oscuro('text-3'), oscuro(fondo), 4.5);
  }
});

test('🔴 el rojo de «te equivocaste» no es el rojo de «que oportunidad»', () => {
  // Hasta el 2026-10-27, --oferta pintaba el sello de descuento Y los errores de
  // formulario Y el hover de «Vaciar». La clienta aprendia a leer ese rojo como
  // «problema» en el formulario y arrastraba la asociacion a la parrilla.
  assert.notStrictEqual(claro('error'), claro('oferta'), 'el error y la oferta no pueden compartir color');
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--error claro sobre --' + fondo, claro('error'), claro(fondo), 4.5);
    exige('--error oscuro sobre --' + fondo, oscuro('error'), oscuro(fondo), 4.5);
  }
  // Y las reglas de error tienen que pedirselo al token nuevo.
  const err = CSS.match(/\.campo-error\{[^}]*\}/);
  assert.ok(err, 'no se encuentra la regla .campo-error');
  assert.ok(err[0].includes('var(--error)'), '.campo-error tiene que usar --error');
  assert.ok(!err[0].includes('var(--oferta)'), '.campo-error no puede usar el rojo de las ofertas');
});

test('🔴 el rojo de la oferta tambien se lee como TEXTO, no solo como sello', () => {
  // Desde el 2026-10-28 --oferta pinta la fila «Descuento» del carrito (13 px) ademas del
  // «Quedan N». A ese tamano AA pide 4,5:1 y no hay excepcion de texto grande. Medido ese dia:
  // 5,61:1 en claro y 7,81:1 en oscuro sobre --surface.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--oferta claro sobre --' + fondo, claro('oferta'), claro(fondo), 4.5);
    exige('--oferta oscuro sobre --' + fondo, oscuro('oferta'), oscuro(fondo), 4.5);
  }
  const fila = CSS.match(/\.desglose-descuento span,[^{]*\{[^}]*\}/);
  assert.ok(fila, 'no se encuentra la regla .desglose-descuento');
  assert.ok(fila[0].includes('var(--oferta)'), 'la fila del descuento tiene que pedir el color al token');
  assert.ok(!/#[0-9A-Fa-f]{3,6}/.test(fila[0]), 'la fila del descuento no puede llevar un color escrito a mano');
});

test('el boton de marca se lee en los dos temas', () => {
  // --brand/--brand-ink pintan .btn-primario, el contador del carrito, los chips de
  // filtro y, desde el 2026-10-27, el boton «Ver mi pedido» del aviso de regreso.
  exige('boton de marca claro', claro('brand-ink'), claro('brand'), 4.5);
  exige('boton de marca oscuro', oscuro('brand-ink'), oscuro('brand'), 4.5);
});
