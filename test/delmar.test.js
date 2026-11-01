// test/delmar.test.js — Del Mar es el cuarto negocio: su cascara, su ruta, su service worker.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const leer = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('🔴 delmar.html declara su negocio y su propia portada', () => {
  const html = leer('delmar.html');
  assert.ok(html.includes('<body data-negocio="delmar">'));
  assert.ok(html.includes('<link rel="canonical" href="https://www.3bqba.com/delmar">'));
  assert.ok(!html.includes('�'), 'la codificacion se estropeo');
});

test('🔴 las cuatro paginas llevan la pastilla de Del Mar (app.js corre en todas)', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html', 'taxi.html']) {
    assert.ok(leer(f).includes('id="mundo-delmar"'), f + ' no tiene #mundo-delmar');
  }
});

test('🔴 vercel.json: rewrite /delmar y la cascara en includeFiles', () => {
  const v = JSON.parse(leer('vercel.json'));
  assert.ok(v.rewrites.some((r) => r.source === '/delmar' && r.destination === '/delmar.html'));
  assert.ok(v.functions['api/producto.js'].includeFiles.includes('delmar.html'));
  // el comodin va al final: si /delmar quedara detras, caeria en la tienda de 3B
  const iDm = v.rewrites.findIndex((r) => r.source === '/delmar');
  const iAll = v.rewrites.findIndex((r) => /\(\?!/.test(r.source));
  assert.ok(iDm < iAll);
});

test('🔴 sw.js: /delmar y /delmar.html en el armazon y cache subida', () => {
  const sw = leer('sw.js');
  assert.ok(sw.includes("'/delmar'") && sw.includes("'/delmar.html'"));
  assert.ok(/const SOCIOS = \[[^\]]*'delmar'/.test(sw));
  assert.ok(!sw.includes("'tienda-3b-v30'"), 'hay que subir la version de la cache');
});

test('la ficha de Del Mar enseña la nota de nevera solo en sus productos', () => {
  const app = leer('app.js');
  const i = app.indexOf('function neveraHtml');
  assert.ok(i >= 0);
  const cuerpo = app.slice(i, app.indexOf('\n}', i));
  assert.ok(cuerpo.includes("p.negocio !== 'delmar'"));
  assert.ok(app.includes('neveraHtml(p)'));
});
