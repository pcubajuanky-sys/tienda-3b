# Galería: pasar las fotos deslizando el dedo (con `touch-action: pan-y`)

Plan: `docs/superpowers/plans/2026-10-13-galeria-deslizar-con-el-dedo.md`. Sin push.

## Historia completa

1. Se implementó el plan tal cual (Tasks 1-2): aritmética pura en `galeria.js` + eventos de puntero
   sobre `.modal-foto` en `app.js`, **sin** `preventDefault()` y **sin** tocar `touch-action`.
2. Al probarlo con un dedo simulado (`Input.dispatchTouchEvent` en el Chrome del sistema, 375 px)
   **falló**: un deslizamiento horizontal acababa en `pointercancel` y la foto no cambiaba (puntos
   1, 2 y 3). El ratón sí funcionaba. El desplazamiento vertical se conservaba.
3. **Causa:** con `touch-action: auto`, Chrome reclama el paneo del dedo aunque en esa dirección no
   haya nada que desplazar, y cancela el puntero. El plan se equivocaba al suponer que solo cancelaría
   en vertical; prohibía tocar `touch-action` mezclándolo con `preventDefault()`, que son cosas
   distintas.
4. **Arreglo:** `touch-action: pan-y` en `.modal-foto` (`estilos.css`). Es declarativo: el paneo
   vertical sigue siendo del navegador, el horizontal llega al script. No es `preventDefault()`
   (ese sigue prohibido: rompería el desplazamiento). Autorizado por el dueño del plan.
5. Se repitió la prueba contra el código real del repo (no inyectado): todo en verde.

## Qué se cambió

- `galeria.js`: `pasoDelGesto`, `indiceSiguiente` (puras) + `test/galeria.test.js` (8 pruebas).
  (La línea de importación del test no coincidía con la que citaba el plan; se amplió la real,
  `const { fotosDe: fotosDeVm } = ...`.)
- `app.js`: `engancharGestoGaleria()` (pointerdown / pointerup / pointercancel), llamada una vez
  en `iniciar()`.
- `estilos.css`: `-webkit-user-drag:none;user-select:none` en la foto y `touch-action:pan-y` en `.modal-foto`.
- `index.html`: `draggable="false"` en la foto.
- `sw.js`: `CACHE` a `tienda-3b-v2` (app.js y estilos.css están en el `ARMAZON`).
- `catalogo.json`: tocado solo para probar (3 fotos extra a un producto) y restaurado.

## Tests (`node --test`)

Antes: 48 tests, 48 pass. Con las pruebas nuevas sin implementar: 56 tests, 8 fail
(`pasoDelGesto is not a function`). Después: 56 tests, 56 pass, 0 fail, exit 0.

## Los puntos de la Task 3 (Chrome del sistema, 375x667, `Input.dispatchTouchEvent`, código real del repo)

`getComputedStyle(.modal-foto).touchAction` = `pan-y`. Producto de prueba con 4 fotos y otro sin extras.

| # | Qué | Antes (auto) | Ahora (pan-y) |
|---|---|---|---|
| 1 | Dedo a la izquierda -> siguiente | FALLABA (`pointercancel`, 0->0) | OK: 0->1, miniatura 0->1, `pointerup` |
| 2 | Dedo a la derecha -> anterior | FALLABA | OK: 1->0 |
| 3 | Da la vuelta desde la última | FALLABA | OK: 0->3 con tres deslizamientos y 3->0 con el cuarto |
| 4 | Dedo ARRIBA sobre la foto desplaza la ficha | OK (0->235) | OK: `scrollTop` 0->235, `pointercancel`, la foto no cambia |
| 5 | Un toque no cambia nada | OK | OK: `pointerdown,pointerup`, 0->0 |
| 6 | Sin fotos extra: deslizar no hace nada y la página sigue desplazándose | OK | OK: izquierda 0->0; arriba `scrollTop` 0->255 |
| 7 | Escritorio, ratón (sin el fantasma de la imagen) | OK | Con el código previo al `pan-y`: OK (0->1, 1->0, clic sin cambio, `dragstart` no disparado, `draggable="false"`). No se repitió tras el `pan-y`: `touch-action` no afecta al ratón. |

(El desplazable de la ficha es `.modal-caja`, no la ventana.)

## Captura

`docs/informes/2026-10-13-galeria-deslizar-375px.png`: ficha a 375 px tras un deslizamiento **con
dedo simulado** (`dispatchTouchEvent`): pasó de la foto 1 a la 2 de 4 y la miniatura 2 queda marcada.
Nota anterior a este cambio: la foto grande mide 340 px y a 375 px deja una franja a la derecha
(`max-height:340px` + `aspect-ratio:1`).

## ⚠ NO VERIFICADO

- **Ningún gesto en un teléfono real; todo simulado en Chrome de escritorio.**
- El punto 7 (ratón) no se repitió tras añadir `pan-y`.
