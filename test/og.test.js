// test/og.test.js — pruebas del modulo puro de etiquetas og:.
// Se corren desde la raiz del repo con:  node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { ogDeProducto, bloqueOg, precioTexto, descripcionOg, imagenOg, escapar, jsonLdProducto, marcaDe } = require('../api/_og');

const BASE = {
  codigo: 'U8DN',
  name: 'Ventilador recargable',
  notes: 'Mando a distancia\nBateria de 20mil mAh',
  photo: 'https://res.cloudinary.com/dvahidqdw/image/upload/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg',
  precioUSD: 50,
  precioCUP: 38750,
  moneda: 'usd',
  enOferta: false,
};

const URL_OK = 'https://www.3bqba.com/p/U8DN';

test('precio en USD: manda el dolar y el CUP va detras', () => {
  assert.strictEqual(precioTexto(BASE), '$50 USD · 38,750 CUP');
});

test('precio en CUP: manda el CUP', () => {
  const p = Object.assign({}, BASE, { moneda: 'cup' });
  assert.strictEqual(precioTexto(p), '38,750 CUP · $50 USD');
});

test('en oferta: lleva el prefijo y el precio anterior', () => {
  const p = Object.assign({}, BASE, { enOferta: true, precioNormalUSD: 55, precioNormalCUP: 42625 });
  assert.strictEqual(precioTexto(p), 'Oferta $50 USD · 38,750 CUP (antes $55)');
});

test('en oferta y en CUP: el precio anterior va en CUP', () => {
  const p = Object.assign({}, BASE, { moneda: 'cup', enOferta: true, precioNormalUSD: 55, precioNormalCUP: 42625 });
  assert.strictEqual(precioTexto(p), 'Oferta 38,750 CUP · $50 USD (antes 42,625 CUP)');
});

test('la descripcion aplana los saltos de linea', () => {
  assert.strictEqual(descripcionOg(BASE), '$50 USD · 38,750 CUP — Mando a distancia Bateria de 20mil mAh');
});

test('sin notes, la descripcion es solo el precio', () => {
  const p = Object.assign({}, BASE, { notes: '' });
  assert.strictEqual(descripcionOg(p), '$50 USD · 38,750 CUP');
});

test('una descripcion larguisima se corta en el ultimo espacio y termina en puntos suspensivos', () => {
  const p = Object.assign({}, BASE, { notes: 'palabra '.repeat(60) });
  const d = descripcionOg(p);
  assert.ok(d.length <= 161, 'mide ' + d.length);
  assert.ok(d.endsWith('…'), 'no termina en puntos suspensivos: ' + d);
  assert.ok(!d.includes(' …'), 'corto a mitad y dejo un espacio colgando: ' + d);
});

test('la imagen pasa por la transformacion de Cloudinary', () => {
  assert.strictEqual(
    imagenOg(BASE),
    'https://res.cloudinary.com/dvahidqdw/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_white/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg'
  );
});

test('una foto que no es de Cloudinary va tal cual', () => {
  const p = Object.assign({}, BASE, { photo: 'https://ejemplo.com/foto.jpg' });
  assert.strictEqual(imagenOg(p), 'https://ejemplo.com/foto.jpg');
});

test('sin foto, cae a la imagen de la tienda', () => {
  const p = Object.assign({}, BASE, { photo: '' });
  assert.strictEqual(imagenOg(p), 'https://www.3bqba.com/og-3b.jpg');
});

test('escapar protege comillas, ampersand y angulos', () => {
  assert.strictEqual(escapar('Pelo & "rizos" <b>'), 'Pelo &amp; &quot;rizos&quot; &lt;b&gt;');
});

test('el bloque lleva las etiquetas que leen Facebook y WhatsApp', () => {
  const html = bloqueOg(ogDeProducto(BASE, URL_OK));
  assert.ok(html.includes('<title>Ventilador recargable — 3B Store</title>'));
  assert.ok(html.includes('<meta property="og:title" content="Ventilador recargable — 3B Store">'));
  assert.ok(html.includes('<meta property="og:url" content="https://www.3bqba.com/p/U8DN">'));
  assert.ok(html.includes('<link rel="canonical" href="https://www.3bqba.com/p/U8DN">'));
  assert.ok(html.includes('w_1200,h_630,c_pad,b_white'));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
});

test('el nombre con comillas sale escapado dentro del atributo', () => {
  const p = Object.assign({}, BASE, { name: 'Set 3 "piezas" & cepillo' });
  const html = bloqueOg(ogDeProducto(p, URL_OK));
  assert.ok(html.includes('content="Set 3 &quot;piezas&quot; &amp; cepillo — 3B Store"'), html);
});

test('la URL del gestor viaja en og:url', () => {
  const html = bloqueOg(ogDeProducto(BASE, 'https://www.3bqba.com/p/U8DN?ref=5D9K9'));
  assert.ok(html.includes('<meta property="og:url" content="https://www.3bqba.com/p/U8DN?ref=5D9K9">'));
});

test('sin transformacion de Cloudinary no se declaran las medidas', () => {
  const p = Object.assign({}, BASE, { photo: 'https://ejemplo.com/foto.jpg' });
  const html = bloqueOg(ogDeProducto(p, URL_OK));
  assert.ok(!html.includes('og:image:width'), 'declaro 1200x630 de una foto que no redimensiono');
});

test('el JSON-LD del producto es JSON valido y de tipo Product', () => {
  const p = { codigo: '5HP4', name: 'Abrigo de Chihuahua', notes: 'Tela gruesa', precioCUP: 3900, precioUSD: 5, moneda: 'usd', photo: 'https://res.cloudinary.com/x/y.jpg' };
  const bloque = jsonLdProducto(p, 'https://www.3bqba.com/p/5HP4');
  const crudo = bloque.replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/, '');
  const j = JSON.parse(crudo);
  assert.strictEqual(j['@type'], 'Product');
  assert.strictEqual(j.name, 'Abrigo de Chihuahua');
  assert.strictEqual(j.offers.priceCurrency, 'CUP');
  assert.strictEqual(j.offers.price, 3900);
  assert.strictEqual(j.offers.url, 'https://www.3bqba.com/p/5HP4');
});

test('el precio va en CUP, que es la moneda en la que se cobra', () => {
  const p = { codigo: 'AAAA', name: 'X', precioCUP: 1500, precioUSD: 2, moneda: 'cup' };
  const j = JSON.parse(jsonLdProducto(p, 'u').replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/, ''));
  assert.strictEqual(j.offers.price, 1500);
  assert.strictEqual(j.offers.priceCurrency, 'CUP');
});

test('un nombre con comillas o < no rompe el JSON ni se escapa a HTML', () => {
  const p = { codigo: 'AAAA', name: 'Cable "USB" <nuevo>', precioCUP: 100, precioUSD: 1 };
  const bloque = jsonLdProducto(p, 'u');
  // el unico </script es el de cierre: el contenido no puede cerrar la etiqueta antes
  assert.strictEqual((bloque.match(/<\/script/g) || []).length, 1);
  const j = JSON.parse(bloque.replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/, ''));
  assert.strictEqual(j.name, 'Cable "USB" <nuevo>');
});

test('bloqueOg incluye el JSON-LD', () => {
  const p = { codigo: '5HP4', name: 'Abrigo', precioCUP: 3900, precioUSD: 5, photo: 'https://res.cloudinary.com/x/y.jpg' };
  const url = 'https://www.3bqba.com/p/5HP4';
  const html = bloqueOg(ogDeProducto(p, url), p, url);
  assert.ok(html.includes('application/ld+json'));
});

test('bloqueOg sin producto no lleva JSON-LD (la firma vieja sigue valiendo)', () => {
  const p = { codigo: '5HP4', name: 'Abrigo', precioCUP: 3900, precioUSD: 5 };
  const html = bloqueOg(ogDeProducto(p, 'https://www.3bqba.com/p/5HP4'));
  assert.strictEqual(html.includes('application/ld+json'), false);
});

// ── La marca de la tarjeta es la del NEGOCIO del producto ──
const CAT_NEG = { tienda: { nombre: '3B Store', negocios: { electripower: { nombre: 'Electripower' } } } };
const SOCIO = Object.assign({}, BASE, { codigo: 'EP001', name: 'Inversor 3000W', negocio: 'electripower' });

test('un producto del socio lleva la marca Electripower en titulo, site_name y brand', () => {
  const marca = marcaDe(CAT_NEG, SOCIO);
  assert.strictEqual(marca, 'Electripower');
  const url = 'https://www.3bqba.com/p/EP001';
  const html = bloqueOg(ogDeProducto(SOCIO, url, marca), SOCIO, url);
  assert.ok(html.includes('<title>Inversor 3000W — Electripower</title>'), 'titulo');
  assert.ok(html.includes('og:site_name" content="Electripower"'), 'site_name');
  assert.ok(html.includes('"brand":{"@type":"Brand","name":"Electripower"}'), 'brand');
  assert.ok(!html.includes('3B Store'), 'se cuela 3B Store en la tarjeta del socio');
});

test('un producto de la casa sigue diciendo 3B Store', () => {
  const marca = marcaDe(CAT_NEG, BASE);
  assert.strictEqual(marca, '3B Store');
  const html = bloqueOg(ogDeProducto(BASE, URL_OK, marca), BASE, URL_OK);
  assert.ok(html.includes('<title>Ventilador recargable — 3B Store</title>'));
  assert.ok(html.includes('og:site_name" content="3B Store"'));
  assert.ok(html.includes('"brand":{"@type":"Brand","name":"3B Store"}'));
});

test('sin marca explicita (firma vieja) todo sigue diciendo 3B Store', () => {
  const html = bloqueOg(ogDeProducto(BASE, URL_OK), BASE, URL_OK);
  assert.ok(html.includes('<title>Ventilador recargable — 3B Store</title>'));
  assert.ok(html.includes('"name":"3B Store"'));
});

test('un producto del socio sin su bloque en el catalogo cae a 3B Store, sin romperse', () => {
  assert.strictEqual(marcaDe({ tienda: { nombre: '3B Store' } }, SOCIO), '3B Store');
  assert.strictEqual(marcaDe(null, SOCIO), '3B Store');
});

test('la marca va escapada: un nombre de negocio con comillas no rompe el atributo', () => {
  const html = bloqueOg(ogDeProducto(BASE, URL_OK, 'A"B<'), BASE, URL_OK);
  assert.ok(html.includes('og:site_name" content="A&quot;B&lt;"'));
});
