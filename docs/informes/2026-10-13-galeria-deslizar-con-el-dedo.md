# Galería: pasar fotos deslizando — Tasks 1-3 hechas, FALLA con el dedo; Task 4 NO hecha

Plan: `docs/superpowers/plans/2026-10-13-galeria-deslizar-con-el-dedo.md`. Sin push.

## Resultado en una línea

El código del plan **funciona con el ratón y no funciona con el dedo**: con un deslizamiento táctil
horizontal, Chrome emite `pointercancel` y la foto no cambia. El desplazamiento vertical sí se
conserva (punto 4 OK). Se paró antes de la Task 4 (caché) a propósito: no se publica algo que en el
teléfono no pasa la foto.

## Qué se cambió (commits `f5091d6` y `556497b`)

- `galeria.js`: `pasoDelGesto`, `indiceSiguiente` (puras) + `test/galeria.test.js` (8 pruebas).
  Adaptación al plan: la línea de importación del test no coincidía con el archivo real
  (`const { fotosDe: fotosDeVm } = ...`); se amplió esa línea en vez de la que citaba el plan.
- `app.js`: `engancharGestoGaleria()` (pointerdown/pointerup/pointercancel sobre `.modal-foto`),
  llamada una vez en `iniciar()`. `estilos.css`: `-webkit-user-drag:none;user-select:none` en la foto.
  `index.html`: `draggable="false"`.
- `catalogo.json` se tocó solo para probar y se restauró (`git checkout --`).

## Tests (`node --test`, observado)

Antes: tests 48, pass 48, fail 0, exit 0. Tras Task 1 sin implementar: 56 tests, 8 fail (`pasoDelGesto is not a function`).
Después: tests 56, pass 56, fail 0, exit 0.

## Los 7 puntos (Chrome del sistema + puppeteer-core, viewport 375x667, `Input.dispatchTouchEvent` = dedo)

Producto de prueba con 4 fotos (1 + 3 extra inyectadas en `catalogo.json`) y otro sin extras.

| # | Qué | Observado |
|---|---|---|
| 1 | Dedo a la izquierda -> siguiente | FALLA: `pointerdown,pointermove,pointercancel`; idx 0->0 |
| 2 | Dedo a la derecha -> anterior | FALLA: igual, `pointercancel` |
| 3 | Da la vuelta desde la última | FALLA: no se puede ni llegar a la última (idx siempre 0) |
| 4 | Dedo ARRIBA sobre la foto desplaza la ficha | OK: `scrollTop` 0->235 (el desplazable es `.modal-caja`), `pointercancel`, foto sin cambiar |
| 5 | Toque no cambia nada | OK: `pointerdown,pointerup`, idx 0->0 |
| 6 | Sin fotos extra | OK: deslizar izq no hace nada; arriba desplaza (0->235) |
| 7 | Escritorio, ratón | OK: arrastre izq 0->1, der 1->0, clic simple sin cambio; `draggable="false"`, `-webkit-user-drag:none`, `dragstart` no disparado |

Con `Input.synthesizeScrollGesture` (también táctil) el horizontal SÍ pasaba la foto (`pointerup`),
pero ese mismo método NO desplazó la ficha en vertical (scrollTop 0->0, sin `pointercancel`): no
pasa por el mismo camino de desplazamiento que un dedo real y se descartó como prueba.

## Experimento (NO commiteado, solo inyectado en la página)

Añadiendo `.modal-foto{touch-action:pan-y}`: 1, 2 y 3 pasan (0->1, 1->0, vuelta 3->0, con
`pointerup`), el 4 sigue desplazando (0->235, `pointercancel`), 5 y 6 igual. Es la receta estándar
(el navegador se queda el vertical; el horizontal llega al script). El plan prohíbe tocar
`touch-action` (punto 1 de «Lo que hace que esto salga bien o mal»); la premisa era que un
horizontal sin nada que desplazar no cancelaría, y en Chrome sí cancela. Decide el dueño.

## Captura

`docs/informes/2026-10-13-galeria-deslizar-375px.png`: ficha a 375 px de ancho tras un arrastre
**con ratón** (miniatura 2/4 marcada). NO es un deslizamiento táctil. Nota aparte, anterior a este
cambio: la foto grande mide 340 px y a 375 px deja una franja a la derecha (`max-height:340px` +
`aspect-ratio:1`).

## ⚠ NO VERIFICADO

- Cualquier gesto en un teléfono real (solo se simuló en Chrome de escritorio; `dispatchTouchEvent`
  es lo más cercano a un dedo que había, pero no es un dedo).
- Task 4: `CACHE` sigue en `tienda-3b-v1` en `sw.js`. Hay que subirla a `tienda-3b-v2` antes de
  publicar cualquier versión de este cambio (app.js y estilos.css están en el `ARMAZON`).
- La prueba de escritorio con `touch-action:pan-y` no se completó (tiempo de navegación agotado en
  una máquina corta de RAM); el ratón ya estaba verificado con el código del repo.
