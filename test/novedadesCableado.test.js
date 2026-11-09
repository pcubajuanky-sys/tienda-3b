// test/novedadesCableado.test.js — «Recien llegado» esta conectado de verdad.
// Por que existe: una edicion a medias dejo `nuevo` sin declarar en tarjetaHtml (rompe la
// tienda entera) y renderNuevos sin llamar desde ningun sitio. Un test de modulo puro no
// lo ve. Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');

function cuerpo(nombre) {
  const i = APP.indexOf('function ' + nombre + '(');
  assert.ok(i >= 0, 'no existe function ' + nombre);
  const sig = APP.indexOf('\nfunction ', i + 1);
  return APP.slice(i, sig < 0 ? undefined : sig);
}

test('🔴 tarjetaHtml declara `nuevo` antes de usarlo', () => {
  const c = cuerpo('tarjetaHtml');
  assert.ok(c.includes('const nuevo = window.Novedades.esNuevo('));
  assert.ok(c.indexOf('const nuevo') < c.indexOf('${nuevo ?'));
});

test('🔴 renderGrid llama a renderNuevos()', () => {
  assert.ok(cuerpo('renderGrid').includes('renderNuevos();'));
});

test('🔴 las tres cascaras tienen la seccion y cargan novedades.js antes de app.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = fs.readFileSync(path.join(raiz, f), 'utf8');
    assert.ok(h.includes('id="nuevos"'), f + ' no tiene id="nuevos"');
    const n = h.indexOf('<script src="novedades.js"></script>');
    const a = h.indexOf('<script src="app.js"');
    assert.ok(n >= 0 && a >= 0 && n < a, f + ': novedades.js tiene que ir antes de app.js');
  }
});
