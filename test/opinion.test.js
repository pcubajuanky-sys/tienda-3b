// test/opinion.test.js — pruebas de opinion.js (modulo puro, sin navegador).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'opinion.js'), 'utf8'), sandbox);
const { mensaje, enlace, estrellasTexto, resumen, MARCA, TEXTO_BOTON, MAX_TEXTO } = sandbox.window.Opinion;

const D = { producto: 'Nebulizador portátil', codigo: '24PU', estrellas: 4, nombre: 'María Pérez', texto: 'Muy bueno\nllegó rápido' };

test('🔴 la marca es la del contrato con lib/opiniones.js de Stock+', () => {
  assert.strictEqual(MARCA, '⭐ *MI OPINIÓN*');
});

test('mensaje: marca, producto, estrellas con (N/5), nombre, opinion y Ref como ULTIMA linea', () => {
  const l = mensaje(D).split('\n');
  assert.strictEqual(l[0], MARCA);
  assert.strictEqual(l[1], 'Producto: Nebulizador portátil');
  assert.strictEqual(l[2], 'Estrellas: ★★★★☆ (4/5)');
  assert.strictEqual(l[3], 'Nombre: María Pérez');
  assert.strictEqual(l[4], 'Opinión: Muy bueno');
  assert.strictEqual(l[5], 'llegó rápido');
  assert.strictEqual(l[l.length - 1], 'Ref: 24PU');
});

test('mensaje: sin nombre ni texto vale (solo estrellas)', () => {
  const m = mensaje({ ...D, nombre: '', texto: '' });
  assert.match(m, /\nNombre: \nOpinión: \nRef: 24PU$/);
});

test('mensaje: el texto se limita a 300 caracteres', () => {
  const m = mensaje({ ...D, texto: 'a'.repeat(500) });
  assert.strictEqual(m.match(/Opinión: (a+)/)[1].length, MAX_TEXTO);
});

test('mensaje: nota invalida o datos esenciales ausentes -> vacio', () => {
  for (const e of [0, 6, 2.5, 'x', null, undefined]) assert.strictEqual(mensaje({ ...D, estrellas: e }), '');
  assert.strictEqual(mensaje({ ...D, codigo: '' }), '');
  assert.strictEqual(mensaje({ ...D, producto: '' }), '');
  assert.strictEqual(mensaje(null), '');
});

test('enlace: api.whatsapp.com/send, nunca wa.me, con el texto codificado', () => {
  const u = enlace('+53 5 497 8966', D);
  assert.ok(u.startsWith('https://api.whatsapp.com/send?phone=5354978966&text='), u);
  assert.ok(!u.includes('wa.me'));
  assert.strictEqual(decodeURIComponent(u.split('&text=')[1]), mensaje(D));
});

test('enlace: sin numero o sin datos devuelve null', () => {
  assert.strictEqual(enlace('', D), null);
  assert.strictEqual(enlace(undefined, D), null);
  assert.strictEqual(enlace('5354978966', { ...D, estrellas: 0 }), null);
});

test('estrellasTexto: medias redondeadas y acotadas', () => {
  assert.strictEqual(estrellasTexto(5), '★★★★★');
  assert.strictEqual(estrellasTexto(4.4), '★★★★☆');
  assert.strictEqual(estrellasTexto(4.5), '★★★★★');
  assert.strictEqual(estrellasTexto(0), '☆☆☆☆☆');
  assert.strictEqual(estrellasTexto(9), '★★★★★');
  assert.strictEqual(estrellasTexto(NaN), '');
});

test('resumen: «⭐ 4.7 (12)» o vacio', () => {
  assert.strictEqual(resumen({ estrellas: { prom: 4.7, n: 12 } }), '⭐ 4.7 (12)');
  assert.strictEqual(resumen({ estrellas: { prom: 5, n: 1 } }), '⭐ 5.0 (1)');
  assert.strictEqual(resumen({}), '');
  assert.strictEqual(resumen(null), '');
  assert.strictEqual(resumen({ estrellas: { prom: 4, n: 0 } }), '');
});

test('TEXTO_BOTON del plan', () => {
  assert.strictEqual(TEXTO_BOTON, '⭐ Dejar mi opinión');
});

test('🔴 el cableado existe: script y #modal-opiniones en las TRES cascaras, y en sw.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    assert.match(h, /<script src="opinion\.js"><\/script>/, f + ': falta el script');
    assert.match(h, /id="modal-opiniones"/, f + ': falta #modal-opiniones');
  }
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert.match(sw, /'\/opinion\.js'/);
  assert.match(sw, /tienda-3b-v51/);
  const app = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8');
  assert.match(app, /window\.Opinion/);
  assert.match(app, /data-opinion/);
});
