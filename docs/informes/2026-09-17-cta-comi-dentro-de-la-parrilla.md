# CTA "Gana dinero con 3B": dentro de la parrilla tras 6 productos

**Fecha:** 2026-09-17
**Commit:** `478c01c` — `gana dinero con 3B: dentro de la parrilla tras 6 productos`
**Archivos tocados:** `app.js`, `index.html`, `estilos.css`

## Problema

El reclamo `.cta-comi` vivía en `#cta-comi-hueco`, después de `#grid` — detrás de los 224
productos, a ~43.000 px de scroll. Nadie lo veía. Antes había estado pegado encima del
catálogo, compitiendo con la tarjeta de encargos.

## Solución

Meterlo dentro de la parrilla (`#grid`), después de los primeros 6 productos, aprovechando
que `.cta-comi` ya trae `grid-column:1/-1` en `estilos.css`.

## Cambios

1. `app.js`: nueva constante `CTA_COMI_TRAS_N = 6`.
2. `app.js` `renderGrid()`: construye el array de tarjetas y usa `splice` para insertar
   `tarjetaComisionistaHtml()` en la posición 6 cuando `!buscando` y hay más de 6 productos.
3. `app.js` `renderMasVendidos()`: se eliminó toda referencia a `cta-comi-hueco` (ya no existe
   ese hueco).
4. `app.js`: el listener de clic para `#cta-comi` se movió de `#cta-comi-hueco` a `#grid`.
5. `index.html`: se borró `<div id="cta-comi-hueco" hidden></div>`.
6. `estilos.css`: `.cta-comi` pasó de `margin:var(--e4) 0 var(--e1)` a `margin:var(--e1) 0`
   (ya no necesita el margen de "elemento suelto").

## Verificación observada

- **Local** (servidor estático propio en `:8899`, viewport 375×812): tarjeta en el índice 6 del
  grid (220 tarjetas totales), a 2698 px de scroll. Clic en `#cta-comi` abre el modal "Gana
  dinero con 3B". Con `setOferta()` (17 resultados) la tarjeta desaparece; al limpiar el filtro
  (`setCat('')`) vuelve a aparecer con 220 tarjetas. Clic en una tarjeta de producto normal
  (`Abrigo de Chihuahua 1`) abre su propio modal de detalle sin interferencia. 0 errores de
  consola.
- **Producción** (`https://www.3bqba.com/`, tras push y ~45 s de espera de Vercel): mismos
  resultados — índice 6, 2704 px, modal de comisión abre al pulsar, filtro de ofertas oculta la
  tarjeta y `setCat('')` la reaparece con 220 tarjetas. 0 errores de consola, ninguno de CSP.
- `grep` confirmó cero referencias vivas a `cta-comi-hueco` en `app.js` / `index.html` tras los
  cambios.
- Commit hecho solo con `app.js index.html estilos.css` (no se tocó `catalogo.json`/`taxi.json`).

## Nota sobre la verificación

Durante la primera vuelta de pruebas, la pestaña del navegador integrado quedó con el scroll
visualmente "pegado" arriba tras una serie de manipulaciones síncronas del DOM vía JS (foco de
búsqueda simulado + eventos disparados a mano) — confirmado que era una rareza de esa pestaña
concreta (no del sitio ni del cambio): una pestaña nueva cargando la misma URL local scrolleaba
sin problema. Se descartó la pestaña afectada y se repitió toda la verificación en una limpia.

## No verificado

Nada pendiente de este cambio puntual — las 6 comprobaciones del plan quedaron observadas en
local y en producción real.
