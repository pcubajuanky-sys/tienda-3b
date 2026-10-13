# Informe: tienda instalable y a prueba de mala señal (PWA) — 2026-10-12

Plan ejecutado: `docs/superpowers/plans/2026-10-12-tienda-instalable-pwa.md` (Tasks 1 a 4).
Rama `main`, sin push (no autorizado: ver «Pendiente de Ruth»).

## Qué se hizo

| Commit | Contenido |
|---|---|
| `76757eb` | `icono-192.png` y `icono-512.png`, generados con `System.Drawing` desde `logo-3b.png` (320×320). |
| `4685bd9` | `manifest.json` + `<link rel="manifest">` en `index.html` y `taxi.html`. |
| `ff73b48` | `sw.js`, registro al final de `app.js`, `Cache-Control: no-cache` para `/sw.js` en `vercel.json` y `_headers`. |
| `37eaf87` | Corrección del respaldo de navegación (ver desvío 2). |
| (este) | README (apartado «La tienda instalable (PWA)») + este informe + dos capturas. |

`catalogo.json` no se tocó (`git status` limpio para ese archivo en todo momento). El paso 4 de la Task 4
se hizo sobre una **copia** del repo en el scratchpad, no sobre el archivo real.

## Dos desvíos del plan, ambos con evidencia

### 1. El catálogo se guardaba con una clave que nunca iba a acertar

`app.js` pide `catalogo.json?v=<Date.now()>` (líneas 1488 y 1532): cada carga es una URL distinta. El `sw.js`
del plan hacía `c.put(req, copia)` y `caches.match(req)` con la petición completa, así que (a) la caché
habría crecido una entrada por visita y (b) sin red `caches.match` nunca habría encontrado nada: la
tienda abría sin productos, que es justo lo que el plan quiere evitar. Se guarda y se busca bajo una
**clave fija `/catalogo.json`** (constante `CATALOGO`), y solo se guardan respuestas `ok`.
Comprobado: tras 1 + 3 recargas la caché tiene **una** entrada `/catalogo.json` (ver paso 2d).

### 2. `/index.html` guardado como respuesta redirigida: la tienda NO abría sin red

Con el `sw.js` del plan tal cual, la recarga sin red terminó en la página de error de Chrome
(`net::ERR_FAILED`). Medido: en la caché, `/` es `redirected:false`, pero `/index.html` es
`redirected:true` porque `serve` responde `301` de `/index.html` a `/`. Chrome rechaza responder una
**navegación** con una respuesta redirigida. Cloudflare Pages (el gemelo `_headers` del repo) también
redirige `/index.html`, así que no es solo un defecto de `serve`. En Vercel no se pudo comprobar.
Arreglo: el respaldo prueba primero `/` y después `/index.html`. Con eso, el paso 3 pasa (abajo).

## Los iconos

`icono-192.png` mide **192×192** (48 KB) y `icono-512.png` **512×512** (261 KB), comprobado con la lectura
del IHDR. Los miré: el de 192 se ve nítido. El de **512 sale de agrandar un original de 320 y se nota algo
blando** en los bordes finos (el texto «STORE», las rayas rojas y el carrito), aunque se reconoce bien y no
está pixelado. Aceptable para una pantalla de inicio; si se quiere más nítido, hace falta el logo en
grande (≥512 px). Es un cuadrado negro con el emblema: sin `purpose: maskable` a propósito (el plan no lo
pide), así que Android puede enmarcarlo en un círculo con bordes.

## `ARMAZON` final y cómo se comprobó

```
'/', '/index.html', '/estilos.css', '/app.js', '/mundos.js', '/relacionados.js', '/galeria.js',
'/tarjeta.js', '/encargos.js', '/fuentes/outfit-latin-v15.woff2', '/logo-3b.png', '/favicon-3b.png'
```

Un script extrae `ARMAZON` de `sw.js` y los `<script src>` y `<link rel="stylesheet">` de `index.html` y los
compara. Salida literal: scripts del index `/mundos.js /relacionados.js /galeria.js /tarjeta.js /app.js
/encargos.js`, css `/estilos.css`, **`faltan en ARMAZON: []`** y **`en ARMAZON y NO existen en disco: []`**.
(El plan nombraba `galeria.js` y `relacionados.js` aparte porque los otros dos planes del día los añadieron.)

Dos imágenes que la portada usa **no** están en `ARMAZON` (el plan no las lista): `logo-taxi-3b.png` y
`taxi-portada.jpg`. Se guardan solas en la primera recarga controlada por el SW (caché primero para «el
resto»; así aparecen en la lista de la caché en el paso 2b), pero una primera visita que se corte antes de
esa recarga las perdería. Si se quiere blindar, basta añadir `'/logo-taxi-3b.png'` a `ARMAZON` (y subir
`CACHE`). No lo hice: no estaba en el plan.

## Verificación en navegador (Chrome del sistema + puppeteer-core, `localhost`)

No fue la pestaña Application de DevTools a ojo: un script con `puppeteer-core` (instalado en el
scratchpad, nunca en el repo) lee lo mismo por JS y por CDP (`Page.getAppManifest`,
`Page.getInstallabilityErrors`). Viewport 375×812, `deviceScaleFactor` 2. Servidor: `npx serve -l 4173 .`.
«Sin red» = **se mata el servidor local** (no el emulador Offline de DevTools: ese no afecta al SW).

**Paso 2 — se instala** (observado)
1. SW: `swActivo: "activated"`, `swScript: http://localhost:4173/sw.js`, `scope: http://localhost:4173/`, `controlador: true`.
2. Cache Storage: `tienda-3b-v1` con las 12 entradas de `ARMAZON` tras la primera carga
   (`/`, `/app.js`, `/estilos.css`, `/index.html`, `/mundos.js`, `/relacionados.js`, `/galeria.js`, `/tarjeta.js`,
   `/encargos.js`, `/fuentes/outfit-latin-v15.woff2`, `/favicon-3b.png`, `/logo-3b.png`); tras recargar suma
   `/catalogo.json`, `/manifest.json`, `/icono-192.png`, `/logo-taxi-3b.png`, `/taxi-portada.jpg`.
3. Manifest: `url: /manifest.json`, `errores: []`, name «3B Store — Tienda online», theme `#7A2E5D`, bg `#1a0d18`,
   `display: standalone`, iconos `/icono-192.png 192x192` y `/icono-512.png 512x512`;
   **`installabilityErrors: []`**.
4. (2d) Tras 3 recargas más la caché **no crece**: sigue habiendo una sola entrada `/catalogo.json`.

**Paso 3 — sin red** (observado, servidor muerto, tras el desvío 2)
La tienda **abre**: `items: 238`, título correcto, `fuenteOutfit: true`, `fontFamilyBody: Outfit, …`,
fondo `rgb(20, 16, 23)`, texto de la portada («238 productos disponibles», «Ver el catálogo»…), 770 nodos de
tarjeta. También `/p/5HP4` sin red cae en la portada guardada (sin `api/producto.js` no hay etiquetas
`og:` por producto, lo esperado). Captura: `2026-10-12-pwa-offline-375px.png`; con red:
`2026-10-12-pwa-online-375px.png` (en esa las fotos de categoría aún no habían cargado cuando se tomó).
Con la red de vuelta (servidor otra vez arriba): `items: 238`, `controlador: true`, y la petición de
`catalogo.json` pasa **por el SW** y llega por red (`200 (via SW)`).

**Paso 4 — el catálogo NO se queda viejo** (observado, sobre una copia del repo en el scratchpad)
`RESUMEN PASO 4: antes= 5  despues(red)= 7777  offline= 7777`. Es decir: con red se ve el **precio nuevo**
(`CAT.items[0].precioUSD` pasó de 5 a 7777 y el nombre editado salió también en el DOM) y, al matar el servidor,
la tienda sirve la **última copia buena** (7777), no una versión más vieja. Es lo que demuestra red primero.

### Lo que NO se pudo reproducir tal cual: las fotos rotas sin red
El plan espera ver las fotos rotas sin red. En mi prueba el PC sí tenía Internet (solo maté el servidor local),
así que las fotos de Cloudinary **cargaron** (se ven en la captura «offline»). Que el SW no las guarda se
sostiene por código (`url.origin !== self.location.origin` → `return`), no por haberlo visto.

## Un tropiezo del entorno, por si alguien repite esto

El primer intento dio `Cache.add … Entry already exists` **incluso con un `put` trivial** en una caché
recién creada, y el `.catch(() => null)` de `install` lo tragó: SW activado, caché con **0** entradas. No era
el SW: el perfil de Chrome del test estaba en una ruta larguísima del scratchpad y el almacenamiento de
Cache Storage excede los 260 caracteres de Windows. Con un perfil en `C:\tmp3b\…` funciona. Además el PC
estaba con ~100–300 MB de RAM libres (Claude Desktop), así que cada paso tardó minutos. Ojo si algún día
hay que depurar un SW que «se instala pero no guarda nada»: el `.catch` del plan oculta el error real.

## Pendiente de Ruth (⚠ NO VERIFICADO)

- ⚠ **Step 5 entero (publicar y probar en teléfono real): NO VERIFICADO.** No se hizo `git push` (no autorizado).
  Faltan: que Vercel sirva `manifest.json`/`sw.js` con la CSP actual (`worker-src`/`manifest-src` caen a
  `script-src 'self'`/`default-src 'self'`: razonado, no visto); «Añadir a pantalla de inicio» en Chrome de
  Android; icono con el logo; arranque sin barra del navegador; modo avión de verdad.
- ⚠ **Cabecera `Cache-Control: no-cache` de `/sw.js` en Vercel/Cloudflare: NO VERIFICADO** (solo se validó el JSON de
  `vercel.json`: «reglas de cabecera: 2»).
- ⚠ **Si Vercel redirige `/index.html` a `/`: NO VERIFICADO.** El arreglo cubre ambos casos.
- ⚠ **iOS/Safari: NO VERIFICADO** (solo Chrome).
- `/taxi` sin red cae en la portada de la tienda (el respaldo de navegación es una sola página); y `taxi.html`
  no registra el SW por sí mismo: lo controla el registrado desde la portada. Tampoco se guardan `taxi.css` ni
  `taxi.js` hasta que alguien los visite. No era alcance del plan.
- Al publicar, **subir `CACHE`** cada vez que cambie algún archivo de `ARMAZON` (ya está en el README).

## Pruebas del repo

`node --check sw.js`: sin salida, exit 0. `node --test`: 48 pruebas, `pass 48`, `fail 0`, exit 0 (el plan no
añade pruebas: un service worker no se prueba en Node).
