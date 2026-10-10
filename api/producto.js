// api/producto.js — sirve /p/<codigo> (la reescritura vive en vercel.json).
//
// Devuelve el index.html de SIEMPRE con el bloque de etiquetas og: cambiado por el
// del producto. Asi el robot de Facebook o WhatsApp —que no ejecuta JavaScript— ve
// la foto y la descripcion de ese producto, y la persona ve la tienda de siempre,
// con su mismo CSS y su misma CSP (los hashes de script siguen valiendo porque el
// HTML que devolvemos es el tuyo, intacto salvo esas etiquetas).
//
// Solo lectura: no escribe nada, no llama a nadie, no guarda estado entre visitas.
const fs = require('fs');
const path = require('path');
const { ogDeProducto, bloqueOg } = require('./_og');

const INICIO = '<!-- og:inicio -->';
const FIN = '<!-- og:fin -->';
const RAIZ = 'https://www.3bqba.com';

// Se leen una sola vez por arranque en frio. Publicar el catalogo crea un
// despliegue nuevo, asi que este cache nunca sirve datos viejos.
let cacheHtml = null;
let cacheCat = null;

function leer(nombre) {
  return fs.readFileSync(path.join(process.cwd(), nombre), 'utf8');
}

function pagina() {
  if (cacheHtml === null) cacheHtml = leer('index.html');
  return cacheHtml;
}

function catalogo() {
  if (cacheCat === null) cacheCat = JSON.parse(leer('catalogo.json'));
  return cacheCat;
}

// Vercel entrega req.query; si algun dia no estuviera, se saca de la URL.
function consulta(req) {
  if (req && req.query) return req.query;
  try {
    const u = new URL(req.url, 'http://local');
    const o = {};
    u.searchParams.forEach((v, k) => { o[k] = v; });
    return o;
  } catch (e) { return {}; }
}

function limpio(v, re) {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && re.test(s) ? s : '';
}

module.exports = function handler(req, res) {
  let html;
  try {
    html = pagina();
  } catch (e) {
    // Sin index.html no hay nada que servir: que el visitante caiga en la portada.
    res.statusCode = 302;
    res.setHeader('Location', '/');
    return res.end('');
  }

  let salida = html;
  try {
    const q = consulta(req);
    const cod = limpio(q.c, /^[A-Za-z0-9]{1,8}$/).toUpperCase();
    const ref = limpio(q.ref, /^[A-Za-z0-9]{1,10}$/).toUpperCase();
    const p = cod
      ? (catalogo().items || []).find((x) => String(x.codigo).toUpperCase() === cod)
      : null;
    const i = html.indexOf(INICIO);
    const j = html.indexOf(FIN);
    if (p && i !== -1 && j > i) {
      const url = RAIZ + '/p/' + String(p.codigo).toUpperCase() + (ref ? '?ref=' + ref : '');
      salida = html.slice(0, i + INICIO.length) + '\n' +
               bloqueOg(ogDeProducto(p, url)) + '\n' +
               html.slice(j);
    }
  } catch (e) {
    salida = html;   // cualquier tropiezo: la tienda normal, nunca una pagina rota
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.end(salida);
};
