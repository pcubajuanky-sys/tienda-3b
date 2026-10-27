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
