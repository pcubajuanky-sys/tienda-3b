# Tienda 3B

Catálogo web estático. Los datos salen de `catalogo.json`, que **publica Stock+** desde la PC
(Configuración → 🌐 Tienda web → «Publicar catálogo ahora»).

No tiene backend. No guarda pedidos. El cliente arma el carrito y el pedido sale por WhatsApp.

## Puesta en marcha (una sola vez, lo hace el dueño)

1. **Crear el repo en GitHub.** Cuenta en github.com → New repository → nombre `tienda-3b` →
   **Public** → Create. No añadas README (ya hay uno).
2. **Subir esta carpeta:**
   ```bash
   cd "C:/inventario/tienda-3b"
   git remote add origin https://github.com/TU-USUARIO/tienda-3b.git
   git push -u origin main
   ```
3. **Conectar Vercel.** Cuenta en vercel.com (entra con GitHub) → Add New → Project →
   elige `tienda-3b` → Framework Preset: **Other** → Deploy. En un minuto da una URL
   `https://tienda-3b.vercel.app`. No hay nada que configurar: es HTML estático.
4. **Crear el token de GitHub** para que Stock+ pueda publicar:
   github.com → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → `tienda-3b`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Genera y **copia el token** (solo se ve una vez).
5. **Pegar el token en Stock+.** En `C:\inventario\inventario-stockmas\.env`:
   ```
   GITHUB_OWNER=TU-USUARIO
   GITHUB_REPO=tienda-3b
   GITHUB_TOKEN=el_token_que_copiaste
   ```
   Reinicia `server.js` para que lo lea.
6. **Probar.** Panel → Configuración → 🌐 Tienda web → pon el recargo y tu WhatsApp →
   Guardar → «Publicar catálogo ahora». En ~30 s la URL de Vercel muestra tus productos.

## Enlaces de vendedor

`https://tienda-3b.vercel.app/?ref=MARIA` — el código viaja en el pedido de WhatsApp.
Los vendedores se dan de alta en el panel de Stock+.

## Enlaces de producto

`https://www.3bqba.com/p/<CODIGO>` abre la tienda con ese producto abierto (el `<CODIGO>` es el
corto de 4 letras del catálogo). Es el enlace que generan los botones de compartir del modal de
detalle, y lleva el `?ref=` del gestor si quien comparte tiene uno.

Esa ruta **no es un archivo**: la sirve `api/producto.js`, una función de solo lectura en Vercel que
devuelve el `index.html` de siempre con las etiquetas `og:` del producto cambiadas, porque Facebook
y WhatsApp no ejecutan JavaScript y leen el HTML tal como sale del servidor. Los marcadores
`<!-- og:inicio -->` / `<!-- og:fin -->` del `index.html` delimitan lo que se sustituye: si se mueven
o renombran, la función devuelve la página tal cual y se pierde la tarjeta del producto.

El `<base href="/">` del `<head>` **no se puede quitar**: sin él, una visita a `/p/<codigo>` (dos
segmentos) pide `estilos.css` y `app.js` a `/p/…`, el comodín de `vercel.json` le devuelve HTML y la
tienda sale sin estilos y sin JavaScript. Con los enlaces de gestor (`/MARIA`, un segmento) no pasa.

Si cambias el precio de un producto, los enlaces ya compartidos pueden seguir enseñando el precio
viejo en Facebook hasta que su caché se refresque. Se fuerza en
`developers.facebook.com/tools/debug` con «Extraer nueva información».

Un producto con la foto rota (404 en Cloudinary) se comparte **sin imagen**: la tarjeta sale sola con
el texto. Las fotos se arreglan subiéndolas otra vez desde Stock+, no desde aquí.

Pruebas: `node --test` desde la raíz del repo (no `node --test test/`: con Node 24 eso falla).

## Foto para compartir (`tarjeta.js`)

`tarjeta.js` arma la imagen vertical **1080×1920** de un producto (foto arriba, nombre, precio y el
logo de 3B abajo) y la entrega como JPEG. Expone `window.Tarjeta`: `dibujar(p)` devuelve
`{ blob, dataUrl, nombreArchivo }` y `_puro` agrupa las funciones sin canvas (`precioTarjeta`,
`lineasNombre`, `nombreArchivo`). Lo usa el botón **📸 Compartir foto** de la ficha del producto
(`compartirFoto()` en `app.js`): abre la hoja de compartir del teléfono con la imagen, o la descarga
si el navegador no sabe compartir archivos. Instagram no acepta nada desde una web, por eso el camino
es imagen + hoja de compartir y no hay botón «publicar en Instagram».

Dos cosas que no son obvias y se pagan caro si se rompen:

- La foto se carga con `img.crossOrigin = 'anonymous'` **puesto antes de `src`**. Sin eso el canvas
  queda contaminado (tainted) y `toBlob`/`toDataURL` fallan. Cloudinary ya responde con
  `Access-Control-Allow-Origin: *`.
- **No se puede traer la foto con `fetch`**: la CSP lleva `connect-src 'self'` (en `vercel.json` y
  `_headers`, duplicados a propósito). Por el mismo motivo la descarga usa el `dataUrl` y no un
  `blob:`, que no está en `img-src`. Si algún día hace falta `blob:`, se añade en los dos archivos.

`test/tarjeta.test.js` prueba **solo las funciones puras**, cargando `tarjeta.js` en un sandbox de
`node:vm` con un `window` falso: en Node no hay canvas, así que el dibujo en sí se revisa a ojo en el
navegador.

## Productos relacionados (`relacionados.js`)

Debajo de la acción de compra, la ficha enseña hasta 6 productos parecidos (sección «Más de esta
categoría»: una tira que se arrastra). `relacionados.js` es un módulo puro (IIFE con
`window.Relacionados.elegir(p, items, tope)`, mismo patrón que `tarjeta.js`): primero los de la misma
subcategoría y luego el resto de la categoría; dentro de cada grupo, destacados, luego ofertas, luego
por nombre. El orden es **determinista** (nada de `Math.random`) y nunca incluye el producto abierto.
**Regla del mínimo de dos:** si no hay al menos 2 candidatos, la sección no se pinta (una sola tarjeta
es ruido); con el catálogo de hoy les pasa a Uñas, Porcelana y Confituras. `app.js` solo pinta
(`pintarRelacionados`) y engancha el clic (`data-rel`). `test/relacionados.test.js` prueba el módulo con
`node:vm`; como las listas vacías nacen en otro contexto, se comparan con `JSON.stringify` (igual que
`tarjeta.test.js`), no con `deepStrictEqual`.

Ojo al CSS de la tira: `.rel-foto` y `.rel-precio` son `<span>` y necesitan `display:block` para que
`width/height/border-radius` apliquen, y el `<button>` necesita `color:inherit` o el texto sale negro
en modo oscuro.

## La tienda instalable (PWA)

La tienda se puede **añadir a la pantalla de inicio** del teléfono y abre aunque la señal sea mala.
Lo hacen `manifest.json` (nombre, colores e iconos `icono-192.png` / `icono-512.png`) y `sw.js` (el
service worker). `app.js` lo registra al final del archivo, no en un `<script>` del HTML: la CSP lleva
`script-src` con hashes y un `<script>` suelto exigiría recalcularlos.

Qué guarda y cómo:

- **El armazón** (HTML, CSS, JS, la fuente y los logos, lista `ARMAZON` en `sw.js`): caché primero.
- **`catalogo.json`: RED PRIMERO.** Son precios; la copia guardada solo se sirve si la red falla. La
  copia vive bajo la clave fija `/catalogo.json` (sin query) porque `app.js` lo pide con `?v=Date.now()`.
- **Las páginas** (`/`, `/p/CODIGO`, `/MARIA`): red primero; sin red, la portada guardada.
- **Las fotos de Cloudinary NO se guardan** (muchas y pesadas): sin red salen rotas, es lo esperado.

🔴 **Cada vez que cambie `estilos.css`, `app.js` o cualquier archivo de `ARMAZON`, hay que subir el
número de `CACHE` en `sw.js`** (`tienda-3b-v1` → `v2`…), o los clientes seguirán viendo la versión
vieja. Y si se **añade** un `<script src>` o un archivo nuevo al `index.html`, hay que añadirlo también a
`ARMAZON`: lo que falte en esa lista no está disponible sin conexión.

🔴 Hay DOS cáscaras (`index.html` y `electripower.html`) que cargan el MISMO `app.js`. Si
añades un elemento o un `<script src>` a una, añádelo a la otra: `app.js` corre en las
dos y buscaría un elemento que no existe.

**Botón de pánico.** Si un service worker sale mal en producción, se publica un `sw.js` cuyo contenido
entero sea esto; desinstala el service worker y vacía la caché en todos los teléfonos:

```js
self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.registration.unregister())));
```

`vercel.json` y `_headers` marcan `/sw.js` como `Cache-Control: no-cache` para que el CDN no lo congele.
Un service worker solo funciona en `https://` o en `localhost`; no se prueba en Node, se prueba en el
navegador y con la red cortada.

## Avisos

- `catalogo.json` es **público**: cualquiera puede leerlo entero. Solo lleva lo que se ve en la web
  (nombre, foto, descripción, precio con recargo). Nunca costos, stock ni proveedores.
- El **teléfono de WhatsApp queda público**. Usa el número del negocio.
- Si la PC está apagada, la tienda sigue online con el catálogo de la última publicación.

## La letra del sitio

La tienda escribe en **Outfit** (SIL Open Font License 1.1), y el archivo vive en `fuentes/`, no en
Google Fonts: la CSP del sitio lleva `default-src 'self'` sin `font-src`, así que una fuente traída
de fuera la bloquea el navegador **en silencio** y la página se queda con la letra del sistema sin
dar ningún error. Si algún día el sitio amanece con otra letra, mira ahí antes que en el CSS.

Para cambiarla: se baja el `.woff2` nuevo a `fuentes/`, se cambia el `@font-face` del principio de
`estilos.css` y el token `--fuente`. El `<link rel="preload">` del `<head>` de `index.html` y
`taxi.html` apunta al archivo por su nombre: hay que cambiarlo también, o la precarga baja un
archivo que nadie usa.

Las letras del escudo "3B STORE" (`.logo-mono` y `.logo-word`) **no** usan esa fuente a propósito:
son parte del logo y declaran su propia pila.
