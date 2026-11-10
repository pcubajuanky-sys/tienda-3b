// test/buzonCableado.test.js — el buzon cableado en aviso.js, opinion.js, las tres cascaras, sw.js y app.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['buzon.js', 'aviso.js', 'opinion.js']) vm.runInContext(leer(f), sandbox);
const { Aviso, Opinion } = sandbox.window;

const P = { name: 'Nebulizador', codigo: '24PU' };
const textoDe = (url) => decodeURIComponent(url.split('&text=')[1]);

test('Aviso.enlace con id: la linea Código: va antes de Ref: (que sigue siendo la ultima)', () => {
  const l = textoDe(Aviso.enlace('5354978966', P, null, 'AB23CD')).split('\n');
  assert.strictEqual(l[l.length - 1], 'Ref: 24PU');
  assert.strictEqual(l[l.length - 2], 'Código: AB23CD');
  assert.ok(l.includes(Aviso.MARCA));
});

test('Aviso.enlace sin id: el mensaje es el de siempre (sin Código:)', () => {
  assert.ok(!textoDe(Aviso.enlace('5354978966', P, null)).includes('Código:'));
});

test('Opinion.enlace con id: Código: antes de Ref:, y sin id no cambia nada', () => {
  const d = { producto: 'Nebulizador', codigo: '24PU', estrellas: 5, nombre: 'Ana', texto: 'bien' };
  const l = textoDe(Opinion.enlace('5354978966', d, 'AB23CD')).split('\n');
  assert.strictEqual(l[l.length - 1], 'Ref: 24PU');
  assert.strictEqual(l[l.length - 2], 'Código: AB23CD');
  assert.ok(!textoDe(Opinion.enlace('5354978966', d)).includes('Código:'));
});

test('las tres cascaras cargan buzon.js, antes de opinion.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = leer(f);
    const b = h.indexOf('<script src="buzon.js"></script>');
    const o = h.indexOf('<script src="opinion.js"></script>');
    assert.ok(b > -1, f + ' no carga buzon.js');
    assert.ok(b < o, f + ': buzon.js debe ir antes de opinion.js');
  }
});

test('sw.js cachea /buzon.js, sube la version y NO cachea /api/buzon', () => {
  const sw = leer('sw.js');
  assert.ok(sw.includes("'/buzon.js'"));
  assert.ok(sw.includes("const CACHE = 'tienda-3b-v62'"));
  assert.ok(!/api\/buzon/.test(sw.split('const ARMAZON')[1].split(']')[0]));
});

test('app.js: ningun await entre generar el id del pedido y el window.open', () => {
  const app = leer('app.js');
  const i = app.indexOf('const idBuzon = window.Buzon.nuevoId()');
  const j = app.indexOf('window.open(', i);
  assert.ok(i > -1 && j > i);
  assert.ok(!/await/.test(app.slice(i, j)));
});

test('app.js: los avisos usan delegacion (sin onclick en linea)', () => {
  const app = leer('app.js');
  assert.ok(app.includes("closest('a[data-buzon=\"aviso\"]')"));
  assert.ok(!/onclick=[^>]*Buzon/.test(app));
});
