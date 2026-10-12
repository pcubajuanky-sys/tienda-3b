# Tienda instalable y a prueba de mala señal (PWA) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el cliente pueda añadir 3bqba.com a la pantalla de inicio del teléfono y que la tienda abra aunque la conexión esté mala, con el último catálogo que vio.

**Architecture:** Dos archivos nuevos en la raíz del repo `tienda-3b` (`manifest.json` y `sw.js`) más dos iconos. El service worker guarda **solo archivos del propio dominio**: el armazón (HTML, CSS, JS, fuente) en caché primero, y `catalogo.json` por **red primero con la caché como red de seguridad**. Las fotos de Cloudinary no se guardan a propósito. El registro del service worker va dentro de `app.js`, no en un `<script>` suelto, para no tener que añadir un hash nuevo a la CSP.

**Tech Stack:** Service Worker API y Web App Manifest, sin librerías. Iconos generados con `System.Drawing` de PowerShell (ya está en Windows, no se instala nada).

---

## 🔴 El riesgo de esto, dicho antes de empezar

Un service worker mal hecho **deja la tienda congelada en una versión vieja para siempre**, y el cliente no tiene forma de arreglarlo. Las tres reglas que lo evitan y que no se negocian:

1. **El catálogo va por red primero.** Son precios: una caché de precios viejos es peor que no tener caché. La caché solo se usa si la red falla.
2. **El nombre de la caché lleva versión** (`v1`, `v2`…) y al activarse se borran las demás. Cada vez que cambie cualquier archivo del armazón, **hay que subir ese número**; si no, el cliente seguirá viendo el CSS viejo.
3. **`skipWaiting()` + `clients.claim()`**: la versión nueva manda desde la siguiente carga, sin esperar a que el cliente cierre todas las pestañas.

Y el botón de pánico, por si algo sale mal en producción: se publica un `sw.js` cuyo contenido entero sea `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.registration.unregister())));` — eso desinstala el service worker y vacía la caché en todos los teléfonos.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `manifest.json` *(crear)* | Nombre, colores e iconos de la app instalada. |
| `icono-192.png`, `icono-512.png` *(crear)* | Los iconos que pide el manifest. |
| `sw.js` *(crear)* | Qué se guarda y con qué estrategia. |
| `index.html` *(modificar)* | El `<link rel="manifest">`. |
| `taxi.html` *(modificar)* | El mismo `<link rel="manifest">`. |
| `app.js` *(modificar)* | Registrar el service worker. |
| `vercel.json` y `_headers` *(modificar)* | Que `sw.js` no se cachee en el CDN. |

---

### Task 1: Los iconos

**Files:**
- Create: `C:\inventario\tienda-3b\icono-192.png`
- Create: `C:\inventario\tienda-3b\icono-512.png`

- [ ] **Step 1: Generarlos desde el logo**

`logo-3b.png` mide 320×320 (comprobado el 2026-10-12). En PowerShell, desde la raíz del repo:

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("C:\inventario\tienda-3b\logo-3b.png")
foreach ($n in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $n, $n
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $n, $n)
  $g.Dispose()
  $bmp.Save("C:\inventario\tienda-3b\icono-$n.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
$src.Dispose()
```

- [ ] **Step 2: Comprobar que salieron con el tamaño correcto**

```bash
cd "C:/inventario/tienda-3b" && node -e "const fs=require('fs');for(const n of [192,512]){const b=fs.readFileSync('icono-'+n+'.png');console.log(n, b.readUInt32BE(16)+'x'+b.readUInt32BE(20), Math.round(b.length/1024)+'KB')}"
```

Esperado: `192 192x192` y `512 512x512`.

- [ ] **Step 3: Mirarlos**

Ábrelos y míralos. El de 512 sale de agrandar un original de 320, así que **puede verse blando**. Si se ve mal, no lo disimules: anótalo en el informe y pide el logo en grande. Un icono borroso en la pantalla de inicio es justo lo contrario de «tienda profesional».

- [ ] **Step 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add icono-192.png icono-512.png && git commit -m "pwa: iconos de 192 y 512"
```

---

### Task 2: El manifest

**Files:**
- Create: `C:\inventario\tienda-3b\manifest.json`
- Modify: `C:\inventario\tienda-3b\index.html`
- Modify: `C:\inventario\tienda-3b\taxi.html`

- [ ] **Step 1: Crear el manifest**

Crea `manifest.json`:

```json
{
  "name": "3B Store — Tienda online",
  "short_name": "3B Store",
  "description": "Catálogo de 3B Store en San Antonio de los Baños. Arma tu pedido y lo coordinas por WhatsApp.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "lang": "es",
  "background_color": "#1a0d18",
  "theme_color": "#7A2E5D",
  "icons": [
    { "src": "/icono-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icono-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

(El `theme_color` es el mismo `#7A2E5D` que ya declara el `<meta name="theme-color">` del `index.html`. Si se cambia uno, se cambian los dos.)

- [ ] **Step 2: Enlazarlo desde las dos páginas**

En `index.html`, busca la línea exacta:

```html
<link rel="apple-touch-icon" href="/favicon-3b.png">
```

y añade **debajo**:

```html
<link rel="manifest" href="/manifest.json">
```

Haz lo mismo en `taxi.html`: busca su `<link rel="apple-touch-icon" ...>` y añade la misma línea debajo. Si `taxi.html` no tuviera esa etiqueta, pon el `<link rel="manifest">` justo después de su `<link rel="icon" ...>`.

- [ ] **Step 3: Comprobar que el JSON es válido**

```bash
cd "C:/inventario/tienda-3b" && node -e "const m=require('./manifest.json');console.log('ok', m.name, m.icons.length)"
```

Esperado: `ok 3B Store — Tienda online 2`.

- [ ] **Step 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add manifest.json index.html taxi.html && git commit -m "pwa: manifest de la app instalable"
```

---

### Task 3: El service worker

**Files:**
- Create: `C:\inventario\tienda-3b\sw.js`
- Modify: `C:\inventario\tienda-3b\app.js`

- [ ] **Step 1: Escribir el service worker**

Crea `sw.js`:

```js
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
const CACHE = 'tienda-3b-v1';

const ARMAZON = [
  '/',
  '/index.html',
  '/estilos.css',
  '/app.js',
  '/mundos.js',
  '/tarjeta.js',
  '/encargos.js',
  '/fuentes/outfit-latin-v15.woff2',
  '/logo-3b.png',
  '/favicon-3b.png',
];

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
  if (url.pathname === '/catalogo.json') {
    e.respondWith(fetch(req).then((r) => {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(req, copia));
      return r;
    }).catch(() => caches.match(req)));
    return;
  }

  // Las paginas (/, /p/XXXX, /MARIA): red primero tambien, porque /p/<codigo> lo arma el
  // servidor con las etiquetas og: de ESE producto. Sin red, el index guardado.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
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
```

🔴 **Si ya se ejecutaron los otros dos planes del mismo día** (`2026-10-12-galeria-fotos-producto.md` y `2026-10-12-productos-relacionados.md`), añade `'/galeria.js'` y `'/relacionados.js'` a `ARMAZON`. Comprueba qué `<script src>` lleva hoy el `index.html` y que la lista los incluya todos: un archivo del armazón que falte en la lista se baja por red cada vez y, sin red, no está.

- [ ] **Step 2: Comprobar que es JS válido**

```bash
cd "C:/inventario/tienda-3b" && node --check sw.js
```

Esperado: sin salida, exit 0.

- [ ] **Step 3: Registrarlo desde `app.js`**

En `app.js`, busca la última línea exacta del archivo:

```js
iniciar();
```

y reemplázala por:

```js
iniciar();

// Service worker: va aqui y no en un <script> del HTML porque la CSP de produccion
// lleva script-src con hashes y un <script> nuevo exigiria recalcularlos. Si falla,
// falla callando: la tienda funciona igual sin el.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
```

- [ ] **Step 4: Que el CDN no cachee el service worker**

En `vercel.json`, busca la línea exacta:

```json
  "headers": [
```

e inserta **debajo** este bloque (fíjate en la coma del final):

```json
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    },
```

Y en `_headers` (el gemelo para Cloudflare), añade al final:

```
/sw.js
  Cache-Control: no-cache
```

- [ ] **Step 5: Comprobar que el JSON sigue siendo válido**

```bash
cd "C:/inventario/tienda-3b" && node -e "const v=require('./vercel.json');console.log('reglas de cabecera:', v.headers.length)"
```

Esperado: `reglas de cabecera: 2`.

- [ ] **Step 6: Las pruebas de siempre**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `fail 0`, exit 0 (este plan no añade pruebas: un service worker no se prueba en Node, se prueba en el navegador y con la red cortada).

- [ ] **Step 7: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add sw.js app.js vercel.json _headers && git commit -m "pwa: service worker con el catalogo por red primero"
```

---

### Task 4: Probarlo de verdad

**Files:** ninguno (solo observar)

⚠ Un service worker **solo funciona en `https://` o en `localhost`**. `npx serve` en localhost vale.

- [ ] **Step 1: Levantar la tienda**

```bash
cd "C:/inventario/tienda-3b" && npx --yes serve -l 4173 .
```

- [ ] **Step 2: Comprobar que se instala**

Abre `http://localhost:4173`, abre las herramientas del navegador → pestaña **Application**:
1. En **Service Workers** aparece `/sw.js` como *activated and running*.
2. En **Cache Storage** hay una caché `tienda-3b-v1` con el CSS, el JS y la fuente dentro.
3. En **Manifest** salen el nombre, el color y los dos iconos, sin errores en rojo.

- [ ] **Step 3: Cortar la red y recargar**

En la pestaña **Network**, marca **Offline** y recarga:
- La tienda **abre**, con sus estilos y su letra.
- Los productos se ven, con el último catálogo (las fotos salen rotas: eso es lo esperado, Cloudinary no se guarda).

Quita el modo Offline y recarga: todo normal.

- [ ] **Step 4: Comprobar que el catálogo NO se queda viejo**

Con la red otra vez puesta, cambia a mano un precio en `catalogo.json`, recarga, y comprueba que **se ve el precio nuevo** (eso demuestra que va por red primero). Luego deshaz el cambio: `git checkout -- catalogo.json`. 🔴 Ese archivo lo publica Stock+; no se edita a mano ni se commitea editado.

- [ ] **Step 5: Publicar y probar en el teléfono de verdad**

Haz `git push`, espera a Vercel y entra desde el móvil a `https://www.3bqba.com/`:
1. El navegador ofrece «Añadir a la pantalla de inicio» (en Chrome de Android, en el menú ⋮).
2. Instálala: el icono sale con el logo de 3B, no con una captura de la página.
3. Ábrela desde el icono: arranca **sin la barra del navegador**.
4. Pon el teléfono en modo avión y ábrela: la tienda abre igual.

- [ ] **Step 6: Informe y documentación**

Crea `C:\inventario\tienda-3b\docs\informes\2026-10-12-tienda-instalable-pwa.md` con lo que **observaste** en cada punto del Step 2 al 5, y marca «⚠ NO VERIFICADO» lo que no hayas podido probar en un teléfono real.

Añade al `README.md` un apartado **«La tienda instalable (PWA)»** que diga, con todas las letras: **cada vez que cambie `estilos.css`, `app.js` o cualquier archivo de `ARMAZON`, hay que subir el número de `CACHE` en `sw.js`**, o los clientes seguirán viendo la versión vieja. Y copia ahí el `sw.js` de pánico que aparece al principio de este plan.

- [ ] **Step 7: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add README.md docs/informes/2026-10-12-tienda-instalable-pwa.md && git commit -m "docs: la tienda instalable en el README y su informe"
```
