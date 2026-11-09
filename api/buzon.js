// api/buzon.js — el buzón web: guarda una COPIA de lo que el cliente manda por WhatsApp.
//
// La pagina (buzon.js) llama con navigator.sendBeacon('/api/buzon', {tipo, id, texto}) justo antes
// de abrir WhatsApp. Esta funcion lo valida y lo escribe como un archivo en un repositorio PRIVADO
// de GitHub (pendientes/<ts>-<id>.json); Stock+ lo recoge cada minuto y lo procesa con la misma
// logica que Mia. Asi un pedido / aviso / opinion no se pierde si Mia esta caida.
//
// 🔴 SIEMPRE responde 204, tambien cuando falla o falta configuracion: la pagina nunca depende de
// esto. Sin BUZON_REPO o sin BUZON_TOKEN no hace nada (el buzon queda inerte).
// 🔴 Solo lo escribe quien pase la validacion: tipo conocido, id con el alfabeto de Stock+ y la
// MARCA de su tipo dentro del texto (las mismas que leen lib/pedidoWeb.js, lib/avisoVuelta.js y
// lib/opiniones.js). Cualquier otra cosa se descarta en silencio.
// 🔴 Los archivos NO llevan datos del servidor ni claves: solo lo que el cliente ya manda por
// WhatsApp (nombre, direccion, telefono).

const MAX_BYTES = 8 * 1024;
const RE_ID = /^[A-HJ-NP-Z2-9]{6}$/;
const MARCAS = {
  pedido: 'Pedido desde la web',          // lib/comisionRef.esPedidoWeb
  aviso: '🔔 *AVÍSAME CUANDO VUELVA*',    // aviso.js
  opinion: '⭐ *MI OPINIÓN*',              // opinion.js
  baja: '📉 *AVÍSAME SI BAJA DE PRECIO*',  // baja.js
};
const ESPERA_MS = 8000;

// Cuerpo ya parseado (Vercel) o, si no, leido del stream. Devuelve un objeto o null.
async function leerCuerpo(req) {
  let b = req && req.body;
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    if (Buffer.byteLength(b, 'utf8') > MAX_BYTES) return null;
    try { return JSON.parse(b); } catch (e) { return null; }
  }
  if (b && typeof b === 'object') {
    let largo;
    try { largo = Buffer.byteLength(JSON.stringify(b), 'utf8'); } catch (e) { return null; }
    return largo > MAX_BYTES ? null : b;
  }
  // Sin body parseado: se lee el stream con tope.
  if (!req || typeof req.on !== 'function') return null;
  return new Promise((resolve) => {
    const trozos = [];
    let total = 0;
    let fin = false;
    const cerrar = (v) => { if (!fin) { fin = true; resolve(v); } };
    req.on('data', (c) => {
      total += c.length;
      if (total > MAX_BYTES) { cerrar(null); return; }
      trozos.push(c);
    });
    req.on('end', () => {
      try { cerrar(JSON.parse(Buffer.concat(trozos).toString('utf8'))); } catch (e) { cerrar(null); }
    });
    req.on('error', () => cerrar(null));
  });
}

// (cuerpo) -> {tipo, id, texto} valido o null.
function validar(d) {
  if (!d || typeof d !== 'object') return null;
  const { tipo, id, texto } = d;
  if (typeof tipo !== 'string' || !Object.prototype.hasOwnProperty.call(MARCAS, tipo)) return null;
  if (typeof id !== 'string' || !RE_ID.test(id)) return null;
  if (typeof texto !== 'string' || !texto.includes(MARCAS[tipo])) return null;
  return { tipo, id, texto };
}

function crearHandler(deps) {
  const doFetch = (deps && deps.fetch) || (typeof fetch === 'function' ? fetch : null);
  const env = (deps && deps.env) || process.env;
  const ahora = (deps && deps.ahora) || Date.now;

  return async function handler(req, res) {
    // Diagnostico: etapa alcanzada, que viaja en la cabecera X-Buzon. NUNCA lleva el token ni el
    // repo (ni parte de ellos): solo etiquetas fijas, el status de GitHub y su campo "message".
    let etapa = 'error:desconocido';
    // Las variables de entorno se recortan: un espacio o salto de linea pegado al copiarlas en
    // Vercel rompe la URL o la cabecera Authorization sin dar ningun error visible.
    const repo = String(env.BUZON_REPO || '').trim();
    const token = String(env.BUZON_TOKEN || '').trim();
    const formatoRepo = /^[\w.-]+\/[\w.-]+$/.test(repo) ? 'ok' : 'raro';
    const formatoToken = (!/\s/.test(token) && (token.startsWith('github_pat_') || token.startsWith('ghp_'))) ? 'ok' : 'raro';
    try {
      if (!(req && req.method === 'POST')) {
        etapa = 'metodo';
      } else if (!repo || !token) {
        etapa = 'sin-config:' + (!repo && !token ? 'ambos' : (!repo ? 'repo' : 'token'));
      } else if (!doFetch) {
        etapa = 'error:sinfetch';
      } else {
        const v = validar(await leerCuerpo(req));
        if (!v) {
          etapa = 'invalido';
        } else {
          const ts = ahora();
          const ua = req.headers && typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent'].slice(0, 200) : undefined;
          const archivo = { v: 1, tipo: v.tipo, id: v.id, texto: v.texto, ts };
          if (ua) archivo.ua = ua;
          const contenido = Buffer.from(JSON.stringify(archivo), 'utf8').toString('base64');
          const url = 'https://api.github.com/repos/' + repo + '/contents/pendientes/' + ts + '-' + v.id + '.json';
          const ctl = typeof AbortController === 'function' ? new AbortController() : null;
          const reloj = ctl ? setTimeout(() => ctl.abort(), ESPERA_MS) : null;
          try {
            etapa = 'error:fetch';
            const r = await doFetch(url, {
              method: 'PUT',
              headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'tienda-3b-buzon',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ message: 'buzon: ' + v.tipo + ' ' + v.id, content: contenido }),
              signal: ctl ? ctl.signal : undefined,
            });
            const estado = r && r.status;
            if (r && r.ok) {
              etapa = 'ok:' + estado;
            } else {
              etapa = 'github:' + estado;
              // El "message" de GitHub (p. ej. "Bad credentials") ayuda a diagnosticar. Se deja
              // solo ASCII imprimible y 80 caracteres: va en una cabecera HTTP.
              try {
                const j = r && typeof r.json === 'function' ? await r.json() : null;
                const m = j && typeof j.message === 'string'
                  ? j.message.replace(/[^\x20-\x7E]/g, '').trim().slice(0, 80) : '';
                if (m) etapa += ';' + m;
              } catch (e) { /* sin cuerpo legible: se queda solo el status */ }
            }
          } finally {
            if (reloj) clearTimeout(reloj);
          }
        }
      }
    } catch (e) {
      // El buzon nunca estorba: cualquier fallo se traga y se contesta igual (con la etapa).
      etapa = 'error:' + String((e && e.name) || 'desconocido').replace(/[^\w.-]/g, '');
    }
    try {
      res.statusCode = 204;
      if (typeof res.setHeader === 'function') {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Buzon', etapa);
        res.setHeader('X-Buzon-Repo-Formato', formatoRepo);
        res.setHeader('X-Buzon-Token-Formato', formatoToken);
      }
      res.end();
    } catch (e) { /* nada mas que hacer */ }
  };
}

module.exports = crearHandler();
module.exports.crearHandler = crearHandler;
module.exports.validar = validar;
module.exports.MARCAS = MARCAS;
