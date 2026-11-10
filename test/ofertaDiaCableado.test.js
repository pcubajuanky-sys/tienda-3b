// test/ofertaDiaCableado.test.js — la «Oferta del dia» esta conectada de verdad.
// Por que existe: una edicion a medias (un reemplazo que no se aplica) deja la tienda en
// blanco, y un test de modulo puro no lo ve. Se corre desde la raiz con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const APP = leer('app.js');
const CSS = leer('estilos.css');

function cuerpo(nombre) {
  const i = APP.indexOf('function ' + nombre + '(');
  assert.ok(i >= 0, 'no existe function ' + nombre);
  const sig = APP.indexOf('\nfunction ', i + 1);
  return APP.slice(i, sig < 0 ? undefined : sig);
}

test('🔴 renderGrid llama a renderOfertaDia()', () => {
  assert.ok(cuerpo('renderGrid').includes('renderOfertaDia();'));
});

test('🔴 tarjetaHtml declara `hoy` antes de usarlo', () => {
  const c = cuerpo('tarjetaHtml');
  assert.ok(c.includes('const hoy = esOfertaDiaHoy(p);'));
  assert.ok(c.indexOf('const hoy') < c.indexOf('${hoy ?'));
  assert.ok(c.includes('🔥 HOY'));
});

test('🔴 las tres cascaras tienen la seccion encima de #mas-vendidos y cargan ofertadia.js antes de app.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = leer(f);
    const o = h.indexOf('id="oferta-dia"');
    const mv = h.indexOf('id="mas-vendidos"');
    assert.ok(o >= 0, f + ' no tiene id="oferta-dia"');
    assert.ok(o < mv, f + ': #oferta-dia tiene que ir encima de #mas-vendidos');
    for (const id of ['od-foto', 'od-nom', 'od-precio', 'od-reloj', 'od-ver', 'od-sello']) {
      assert.ok(h.includes('id="' + id + '"'), f + ' no tiene id="' + id + '"');
    }
    const s = h.indexOf('<script src="ofertadia.js"></script>');
    const a = h.indexOf('<script src="app.js"');
    assert.ok(s >= 0 && a >= 0 && s < a, f + ': ofertadia.js tiene que ir antes de app.js');
  }
});

test('🔴 sin botones de cantidad ni manejadores en linea dentro del bloque', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = leer(f);
    const ini = h.indexOf('id="oferta-dia"');
    const bloque = h.slice(ini, h.indexOf('</section>', ini));
    assert.ok(!/id="acc-/.test(bloque), f + ': el bloque duplicaria acc-<id>');
    assert.ok(!/\son[a-z]+\s*=/i.test(bloque), f + ': manejador en linea (el CSP lo bloquea)');
  }
  const c = cuerpo('renderOfertaDia');
  assert.ok(!/onclick\s*=/.test(c));
  assert.ok(c.includes("getElementById('od-reloj')") || cuerpo('tickOfertaDia').includes("getElementById('od-reloj')"));
});

test('el boton y la foto abren la ficha con addEventListener', () => {
  assert.ok(APP.includes("odVer.addEventListener('click'"));
  assert.ok(APP.includes("odFoto.addEventListener('click'"));
});

test('el catalogo trae la cabecera Date al desfase, en la carga y en la revalidacion', () => {
  assert.strictEqual((APP.match(/OfertaDia\.desfase\(r\.headers\.get\('Date'\)/g) || []).length, 2);
});

test('revalidarCierre tambien recarga cuando cambia la oferta del dia', () => {
  const c = cuerpo('revalidarCierre');
  assert.ok(c.includes('ofertaCambio'));
  assert.ok(c.includes('ahora === cerrada() && !ofertaCambio'));
});

test('el reloj se para con la pestaña oculta', () => {
  assert.ok(APP.includes("document.addEventListener('visibilitychange'"));
  assert.ok(APP.includes('pararRelojOfertaDia();'));
});

test('sw.js precachea ofertadia.js y la cache es v54', () => {
  const sw = leer('sw.js');
  assert.ok(sw.includes("'/ofertadia.js'"));
  assert.ok(sw.includes("const CACHE = 'tienda-3b-v64'"));
});

// ── Contraste de los textos nuevos, CALCULADO con los tokens (≥ 4.5:1, claro y oscuro) ──
const I_OSCURO = CSS.indexOf('@media (prefers-color-scheme: dark)');
function tok(bloque, n) {
  const m = bloque.match(new RegExp('--' + n + '\\s*:\\s*(#[0-9A-Fa-f]{6})'));
  return m ? m[1] : null;
}
const claro = (n) => tok(CSS.slice(0, I_OSCURO), n);
const oscuro = (n) => tok(CSS.slice(I_OSCURO), n) || claro(n);
const lin = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const luz = (h) => { const s = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contraste = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('🔴 contraste >= 4.5:1 de los textos del bloque, en claro y en oscuro', () => {
  const pares = [
    ['etiqueta (--oferta / --surface)', 'oferta', 'surface'],
    ['nombre y reloj (--text / --surface)', 'text', 'surface'],
    ['tachado (--text-2 / --surface)', 'text-2', 'surface'],
    ['sello (--oferta-ink / --oferta)', 'oferta-ink', 'oferta'],
    ['boton (--brand-ink / --brand)', 'brand-ink', 'brand'],
  ];
  for (const [nombre, t, f] of pares) {
    for (const [tema, fn] of [['claro', claro], ['oscuro', oscuro]]) {
      const r = contraste(fn(t), fn(f));
      console.log('  contraste ' + nombre + ' ' + tema + ': ' + r.toFixed(2) + ':1');
      assert.ok(r >= 4.5, nombre + ' ' + tema + ' da ' + r.toFixed(2));
    }
  }
});
