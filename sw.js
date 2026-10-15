// sw.js — para que la tienda abra con mala señal. Lee docs/superpowers/plans/
// 2026-10-12-tienda-instalable-pwa.md antes de tocar esto.
//
// 🔴 TRES REGLAS QUE NO SE NEGOCIAN:
// 1. catalogo.json va por RED PRIMERO. Son precios: servir precios viejos es peor que
//    no tener caché. La caché solo entra si la red falla.
// 2. CACHE lleva version. Si cambias CUALQUIER archivo de ARMAZON, SUBE el numero o los
//    clientes seguiran viendo el CSS y el JS viejos.
// 3. Solo se guarda lo del propio dominio. Las fotos de Cloudinary NO: son muchas,
//    pesan, y la CSP de la pagina ya decide quien puede servirlas.
const CACHE = 'tienda-3b-v9';

// Los <script src> de index.html tienen que estar TODOS aqui (y los archivos nuevos que
// cargue la pagina): lo que falte en esta lista no esta disponible sin conexion.
const ARMAZON = [
  '/',
  '/index.html',
  '/estilos.css',
  '/app.js',
  '/mundos.js',
  '/orden.js',
  '/relacionados.js',
  '/galeria.js',
  '/tarjeta.js',
  '/encargos.js',
  '/fuentes/outfit-latin-v15.woff2',
  '/logo-3b.png',
  '/favicon-3b.png',
];

// app.js pide 'catalogo.json?v=' + Date.now(): cada carga es una URL distinta. Si la copia
// se guardara con esa URL, la cache crecería una entrada por visita y sin red nunca
// acertaria. Por eso la copia vive SIEMPRE bajo esta clave fija, sin query.
const CATALOGO = '/catalogo.json';

self.addEventListener('install', (e) => {
  // addAll falla entero si UN archivo falla; por eso se mete uno a uno y se perdona el
  // que no este (asi un renombrado no deja la instalacion muerta).
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(
    ARMAZON.map((u) => c.add(u).catch(() => null))
  )).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ns) => Promise.all(ns.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Cloudinary y compañia: a la red, sin tocar

  // El catalogo: red primero. Si responde, se guarda copia y se sirve. Si no hay red,
  // se sirve la ultima copia buena (y el cliente ve precios de ayer, no una pagina rota).
  if (url.pathname === CATALOGO) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(CATALOGO, copia));
      }
      return r;
    }).catch(() => caches.match(CATALOGO)));
    return;
  }

  // Las paginas (/, /p/XXXX, /MARIA): red primero tambien, porque /p/<codigo> lo arma el
  // servidor con las etiquetas og: de ESE producto. Sin red, el index guardado.
  if (req.mode === 'navigate') {
    // Se prueba '/' ANTES que '/index.html': hay hosts (Cloudflare Pages, 'serve') que
    // redirigen /index.html a /, y una respuesta guardada con redirected=true la rechaza
    // el navegador al responder una navegacion (ERR_FAILED: la tienda no abriria sin red).
    e.respondWith(fetch(req).catch(() => caches.match('/').then((r) => r || caches.match('/index.html'))));
    return;
  }

  // El resto (CSS, JS, fuente, logos): cache primero, que es lo que hace que abra rapido.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r && r.status === 200) {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(req, copia));
    }
    return r;
  })));
});
