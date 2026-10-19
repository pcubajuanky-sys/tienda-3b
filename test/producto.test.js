// test/producto.test.js — pruebas de la funcion que sirve /p/<codigo>.
// Finge el req/res de Vercel: la funcion es sincrona, asi que basta con llamarla.
// Se corren DESDE LA RAIZ del repo (la funcion lee index.html y catalogo.json
// relativos a process.cwd()).
const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const handler = require('../api/producto');

const CAT = JSON.parse(fs.readFileSync('catalogo.json', 'utf8'));
const UNO = CAT.items[0];

function pedir(query) {
  const res = {
    statusCode: 0,
    cabeceras: {},
    cuerpo: '',
    setHeader(k, v) { this.cabeceras[String(k).toLowerCase()] = v; },
    end(b) { this.cuerpo = b == null ? '' : String(b); },
  };
  handler({ query: query, url: '/api/producto' }, res);
  return res;
}

test('un codigo valido devuelve la pagina con las etiquetas de ESE producto', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>' + UNO.name + ' — 3B Store</title>'), 'no cambio el title');
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '"'));
  assert.ok(r.cuerpo.includes('w_1200,h_630,c_pad,b_white'), 'no uso la imagen transformada');
});

test('la pagina sigue siendo la tienda entera: conserva el script y el favicon', () => {
  const r = pedir({ c: UNO.codigo });
  assert.ok(r.cuerpo.includes('app.js'), 'perdio app.js');
  assert.ok(r.cuerpo.includes('favicon-3b.png'), 'perdio el favicon');
  assert.ok(r.cuerpo.includes('estilos.css'), 'perdio la hoja de estilos');
});

test('solo hay UN title en la salida', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.cuerpo.split('<title>').length - 1, 1);
});

test('el ref del gestor viaja en og:url', () => {
  const r = pedir({ c: UNO.codigo, ref: '5D9K9' });
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '?ref=5D9K9"'), 'perdio el ref');
});

test('un ref con basura se ignora, no se cuela en el HTML', () => {
  const r = pedir({ c: UNO.codigo, ref: '"><script>x' });
  assert.ok(!r.cuerpo.includes('<script>x'), 'inyecto el ref en el HTML');
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '"'));
});

test('un codigo que no existe devuelve la tienda normal, con 200', () => {
  const r = pedir({ c: 'ZZZZ' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'), 'no devolvio la portada');
});

test('sin codigo devuelve la tienda normal', () => {
  const r = pedir({});
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'));
});

test('un codigo con caracteres raros no revienta', () => {
  const r = pedir({ c: '../../etc/passwd' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'));
});

test('responde como HTML y con cache del borde', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.cabeceras['content-type'], 'text/html; charset=utf-8');
  assert.ok(String(r.cabeceras['cache-control']).includes('s-maxage=300'));
});

test('el codigo en minusculas tambien encuentra el producto', () => {
  const r = pedir({ c: UNO.codigo.toLowerCase() });
  assert.ok(r.cuerpo.includes('<title>' + UNO.name + ' — 3B Store</title>'));
});

test('la pagina de producto fija la base en la raiz', () => {
  // Sin <base href="/"> el navegador pide estilos.css y app.js a /p/… y el comodin
  // de vercel.json le devuelve HTML: la tienda sale sin estilos y sin JavaScript.
  const r = pedir({ c: UNO.codigo });
  assert.ok(r.cuerpo.includes('<base href="/">'), 'falta la etiqueta base');
});

// precios-gestores.json SI esta en el repo: Stock+ lo publica por GitHub (hoy vale {}) y
// lo piden app.js, api/producto.js y sw.js. Estos tests NUNCA lo borran ni lo cambian de
// forma permanente: guardan sus bytes exactos, lo apartan o lo sobrescriben mientras dura
// la prueba y lo restauran siempre (en un finally y, de red, en after()). Si no existia,
// se queda sin existir.
// `cacheGest` del handler se cachea en el primer uso: por eso cada prueba que cambia el
// archivo recarga el handler con un require.cache limpio.
const ARCHIVO = 'precios-gestores.json';
const ORIGINAL = fs.existsSync(ARCHIVO) ? fs.readFileSync(ARCHIVO) : null;   // Buffer exacto o null

function restaurarArchivo() {
  if (ORIGINAL !== null) fs.writeFileSync(ARCHIVO, ORIGINAL);
  else if (fs.existsSync(ARCHIVO)) fs.unlinkSync(ARCHIVO);
}

function handlerLimpio() {
  delete require.cache[require.resolve('../api/producto')];
  delete require.cache[require.resolve('../api/_og')];
  return require('../api/producto');
}

function pedirCon(h, query) {
  const res = {
    statusCode: 0, cabeceras: {}, cuerpo: '',
    setHeader(k, v) { this.cabeceras[String(k).toLowerCase()] = v; },
    end(b) { this.cuerpo = b == null ? '' : String(b); },
  };
  h({ query: query, url: '/api/producto' }, res);
  return res;
}

// Red de seguridad: pase lo que pase en los tests, el repo queda como estaba.
after(() => { restaurarArchivo(); handlerLimpio(); });

test('sin precios-gestores.json la pagina sale normal, con el precio de la casa', () => {
  try {
    if (fs.existsSync(ARCHIVO)) fs.unlinkSync(ARCHIVO);   // apartado: se restaura abajo
    const h = handlerLimpio();                            // sin cacheGest de pruebas anteriores
    assert.strictEqual(fs.existsSync(ARCHIVO), false, 'el archivo deberia estar ausente en esta prueba');
    const r = pedirCon(h, { c: UNO.codigo, ref: 'ELA' });
    assert.strictEqual(r.statusCode, 200);
    assert.ok(r.cuerpo.includes(String(UNO.precioCUP)) || r.cuerpo.includes(UNO.precioCUP.toLocaleString('en-US')));
  } finally {
    restaurarArchivo();
    handlerLimpio();
  }
});

test('con precios-gestores.json la tarjeta lleva el precio del gestor', () => {
  const cod = String(UNO.codigo).toUpperCase();
  const tabla = { ELA: {} };
  tabla.ELA[cod] = { u: Math.round(UNO.precioUSD * 1.5 * 100) / 100, c: UNO.precioCUP * 2 };
  try {
    fs.writeFileSync(ARCHIVO, JSON.stringify(tabla));
    const r = pedirCon(handlerLimpio(), { c: UNO.codigo, ref: 'ELA' });
    const esperado = (UNO.precioCUP * 2).toLocaleString('en-US');
    assert.ok(r.cuerpo.includes(esperado) || r.cuerpo.includes(String(UNO.precioCUP * 2)),
      'la tarjeta no lleva el precio del gestor');
  } finally {
    restaurarArchivo();
    handlerLimpio();
  }
});
