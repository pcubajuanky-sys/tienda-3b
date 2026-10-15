# Informe de relevo — Precio por gestor en la tienda (Plan 2 de 2)

**Fecha:** 2026-10-15 · **Repo:** `C:\inventario\tienda-3b`, rama `main`
**Plan:** `docs/superpowers/plans/2026-10-15-precio-por-gestor-tienda.md` (7 tasks)
**Diseño:** `C:\inventario\inventario-stockmas\docs\superpowers\specs\2026-10-15-precio-por-gestor-design.md`
**Plan 1 (Stock+):** hecho antes, mismo día — `inventario-stockmas/docs/informes/2026-10-15-precio-por-gestor-stockmas.md`
**Ejecución:** sesión nativa. Piloto (Opus) orquestando un subagente sonnet. **La verificación en el
navegador la hizo el piloto**, abriendo la tienda servida en local; no es el resumen de nadie.

## Qué hace

Si el visitante entra por el enlace de un gestor **con recargo**, la tienda enseña **los precios de
ese gestor**, la página se identifica como suya y el pedido sale a **su** WhatsApp para que él lo
reenvíe al número de la casa. Sin recargo —o sin el archivo de precios— la tienda es exactamente la
de siempre.

🔴 **La tienda no calcula ni un precio.** Los precios llegan ya calculados en `precios-gestores.json`,
que publica Stock+ con la misma función que genera el catálogo.

## Qué quedó hecho (7 commits)

| Commit | Qué |
|---|---|
| `28c9e96` | `preciosGestor.js` (módulo puro) + sus 7 tests + el `<script src>` en `index.html` |
| `bc2341e` | `cargarCatalogo` baja la tabla y la aplica; `gestorRecargo` |
| `8ef7b27` | La banda «Estás en la página de …» en portada y ficha (`index.html`, `estilos.css`, `app.js`) |
| `f6f3cfc` | La banda habla en **neutro** (ver abajo) |
| `fef2ee3` | El pedido va al WhatsApp del gestor cuando lo tiene |
| `5df2c21` | `api/producto.js`: la tarjeta compartida lleva el precio del gestor |
| `304d35f` | `sw.js`: `preciosGestor.js` en `ARMAZON`, el archivo de precios por red primero y **`CACHE` → `tienda-3b-v12`** |

## Evidencia OBSERVADA en el navegador

Tienda servida en local (servidor estático propio en el scratchpad, que imita el rewrite de
`/CODIGO` de `vercel.json`), **viewport 375×812**, con datos de prueba: a **Elaine Ocampo Pino
(9H5MM)** se le puso `telPublico` y una tabla con **+10 %** en los 239 productos.

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Portada **sin** gestor | Banda oculta · primer precio **4.000 CUP** · 233 tarjetas · `scrollWidth` **375** · 0 errores |
| 2 | `/9H5MM` | Primer precio **4.400 CUP** y el tachado también recargado (`$6.6` → `$5.5`) |
| 3 | Texto de la banda | «🤝 Estás en la página de **Elaine** — sus precios y su atención. Tu pedido le llega directamente.» → **solo el nombre**, sin apellidos |
| 4 | Ficha del producto | Banda presente (`banda-gestor-ficha`) y precio **4.400** |
| 5 | Carrito | Productos **4.400** · Mensajería **GRATIS** · **Total 4.400 CUP ≈ $5.50 USD** |
| 6 | Destino del pedido | `api.whatsapp.com/send?phone=**5350000000**` — el móvil de la gestora, **no** el de la casa |
| 7 | Texto del pedido | Lleva `👤 Vendedor: 9H5MM` y `Ref: 5HP4 x1` |
| 8 | Entrar por `/9H5MM` y navegar a `/` | Sigue con **4.400** y con la banda (el código vive en `localStorage`) |
| 9 | **Borrar `precios-gestores.json`** y recargar | Banda oculta en portada **y** ficha · precios de vuelta a **4.000** · 233 tarjetas |

**Nada se envió a WhatsApp:** el punto 6 se midió interceptando `window.open` y leyendo la URL que
habría abierto.

**Tests:** `node --test` desde la raíz, corrido por el piloto: **80 / 80, 0 fail** (baseline 71 + 7
de `preciosGestor` + 2 de `producto`).

## ⚠ NO VERIFICADO, y por qué

- 🔴 **El service worker no se pudo probar.** En el navegador del panel, `navigator.serviceWorker
  .register()` falla con «An unknown error occurred when fetching the script», aunque `fetch('/sw.js')`
  devuelve 200 con el tipo correcto. **Se comprobó que NO es culpa del cambio:** se registró el
  `sw.js` ANTERIOR (el `tienda-3b-v11` que lleva meses en producción) y **falla exactamente igual**.
  Es una limitación del entorno. Lo que sí está verificado del `sw.js` nuevo: `node --check` limpio,
  `CACHE` subido a `v12`, `/preciosGestor.js` en `ARMAZON` y los **dos** usos de la clave (el `put` y
  el `match`) pasados a la variable `clave`, que es lo que evita que los precios del gestor pisen al
  catálogo guardado. **Hay que mirarlo en un teléfono o en Chrome de escritorio tras desplegar.**
- **El 404 de `precios-gestores.json`** aparece en la consola mientras Stock+ no haya publicado ese
  archivo por primera vez. Es la degradación diseñada (la tienda se queda con los precios de la
  casa), pero ensucia la consola hasta la primera publicación. Después el archivo existe siempre,
  aunque sea como `{}`.
- **Un pedido real** llegando al WhatsApp de un gestor y su reenvío entrando en Envíos.
- La verificación se hizo **midiendo desde la propia página** (precios, anchos, URLs, estado de la
  banda), no a ojo sobre capturas: el panel del navegador mide ~294 px y escala las capturas, como ya
  avisa el `CLAUDE.md` del proyecto.

## Defectos del plan encontrados durante la ejecución

1. **Dos tokens de CSS que no existen.** El plan usaba `var(--surface2)` y `var(--radius-sm)`; los
   reales son **`--surface-2`** (`estilos.css:36`, redefinido en oscuro en `:100`) y
   **`--radio-control`** (`:75`). Con los inventados la banda habría salido sin fondo **sin dar
   ningún error**. El ejecutor los comprobó antes de escribirlos, como pedía el plan.
2. 🔴 **La banda hablaba en femenino.** El texto del plan decía «Tu pedido le llega **a ella**
   directamente», y entre los gestores hay hombres (Diego, Boris Luís). Eso le habría puesto el
   género equivocado a una persona real en su propia página. Corregido a **neutro** en el código, en
   el plan y en el diseño (`f6f3cfc`).
3. **El `return` temprano de `pintarBandaGestor`** se saltaba la banda de la ficha. El ejecutor lo
   reescribió con `if/else` para que las dos se sincronicen siempre.
4. **Sitio de la banda:** puesta justo antes de `<section class="hero">` (dentro de `.wrap`), no
   después de `<main>`, porque ahí quedaba por debajo del hero, la confianza, las categorías y los
   servicios. El plan permitía las dos.

## Qué falta

1. **Ruth reinicia `server.js`** en Stock+ (sigue corriendo con el código viejo) y le pone **recargo
   y móvil público** a un gestor en el panel (🤝 Gestores). Al guardar, publica solo.
2. Mirar la tienda **en un teléfono** una vez desplegada: el service worker y la banda en pantalla
   pequeña real. 🔴 Y recordar que **la primera carga tras el despliegue sigue corriendo el código
   viejo** (el service worker viejo sirve su caché mientras el nuevo se instala): **hace falta
   recargar otra vez**.
