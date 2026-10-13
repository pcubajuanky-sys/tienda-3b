# Productos relacionados en la ficha — informe de relevo (2026-10-12)

Plan ejecutado: `docs/superpowers/plans/2026-10-12-productos-relacionados.md` (Task 1 y Task 2).
Resultado: la ficha de un producto enseña debajo del botón de añadir una tira «Más de esta categoría» con
hasta 6 parecidos. Todo en el navegador, solo en este repo; no se tocó `catalogo.json` ni Stock+.

## Qué se cambió

- `relacionados.js` (nuevo): módulo puro, `window.Relacionados.elegir(p, items, tope)`. Misma subcategoría
  primero y luego el resto de la categoría; dentro de cada grupo, destacados, ofertas, nombre. Determinista.
  Nunca el producto abierto; menos de 2 candidatos → lista vacía (la sección no se pinta).
- `test/relacionados.test.js` (nuevo): 7 pruebas.
- `index.html`: `<script src="relacionados.js">` encima de `tarjeta.js` y el hueco `#modal-rel` entre
  `#modal-accion` y `#modal-compartir`.
- `estilos.css`: bloque `.rel*` antes de «Compartir».
- `app.js`: `pintarRelacionados(p)` (antes de `abrirDetalle`), llamada dentro de `abrirDetalle`, vaciado en
  `cerrarDetalle`, y manejador del clic `[data-rel]` en la delegación global de `iniciar()`.
- `README.md`: sección «Productos relacionados» con la regla del mínimo de dos.

## Pruebas (`node --test` desde la raíz, salida observada)

| Momento | tests | pass | fail | exit |
|---|---|---|---|---|
| Antes de tocar nada | 36 | 36 | 0 | 0 |
| Prueba nueva sin módulo (rojo) | 1 (`ENOENT ... relacionados.js`) | 0 | 1 | 1 |
| Módulo + prueba tal cual el plan | 43 | 41 | **2** | 1 |
| Tras ajustar la prueba (ver abajo) | 43 | 43 | 0 | 0 |
| Tras Task 2 (HTML/CSS/JS) y tras el arreglo de CSS | 43 | 43 | 0 | 0 |

## Desvíos respecto al plan (los dos con causa medida)

1. **La prueba del plan fallaba con el módulo correcto.** `deepStrictEqual(elegir(...), [])` da
   «Values have same structure but are not reference-equal: [] / []»: el `[]` que devuelve
   `relacionados.js` nace dentro del contexto de `node:vm` y tiene otro `Array.prototype` que el del test.
   Se cambiaron **solo las 4 aserciones de lista vacía** a `JSON.stringify(...) === '[]'`, que es la misma
   convención que ya usa `test/tarjeta.test.js` (líneas 79 y 82). El módulo quedó exactamente como el plan.
2. **El CSS del plan salía roto al mirarlo a 375 px.** Medido con estilos computados:
   - `.rel-foto` y `.rel-precio` son `<span>` (inline): `width/height/border-radius/overflow` no se
     aplican. La foto salía de **120×196 sin recortar** y nombre y precio caían **fuera** de la caja de la
     tarjeta (alto 196, texto empezando 6 px por debajo).
   - El `<button>` no hereda color: nombre y precio salían en **`rgb(0,0,0)`**, también en modo oscuro
     (negro sobre `rgb(30,24,34)`: ilegible). Es justo lo que pedía vigilar el punto 6 del Step 8.
   - Arreglo mínimo, en un commit aparte (`0ba8cb6`) para poder revertirlo: `display:block` en
     `.rel-card`, `.rel-foto`, `.rel-precio`; `color:inherit` en `.rel-card`; `align-self:flex-start` en
     `.rel-card` (sin él el botón centra su contenido y la foto de la tarjeta con nombre de 2 líneas
     quedaba 8 px más arriba que las demás).
   - El commit `70aa8f6` lleva el código del plan literal; el arreglo va encima.
   - Captura del fallo: `2026-10-12-relacionados-375px-oscuro-ANTES-del-arreglo.png`.

## 🔴 Comprobación del Step 6 (dónde está el manejador del clic)

El manejador NO está atado a `#modal-detalle`: es la delegación global `document.addEventListener('click', ...)`
dentro de `iniciar()` (`app.js`, junto a `[data-add]`, `[data-val]`, `[data-detalle]`). `#modal-detalle` es
descendiente de `document`, así que lo contiene. Se verificó que no hay nada que corte la propagación
antes: todos los `stopPropagation()` de `app.js` están dentro de ese mismo manejador, los listeners del
modal son solo `#modal-cerrar` y `#modal-fondo` (cerrar), y los chips de variante y «Añadir» del propio modal
ya funcionan por esta misma vía. Además se probó con **clic real** (CDP `Input.dispatchMouseEvent`, no
`.click()`): tocar una tarjeta de la tira abre ese producto. `#modal-detalle .modal-caja` existe y es el
elemento que scrollea (`overflow-y:auto`).

## Qué se miró en el navegador (Chrome del sistema, headless, 375×812, DPR 2, clics reales) y qué no

El panel de navegador integrado de Claude mide ~294 px de ancho y escala la emulación a 125 px, así que no
valía para mirar. Se usó el Chrome de la máquina por CDP contra `npx serve -l 4173 .`. Observado:

1. Producto de Cabello (25) → bajo «Elegir color» sale «Más de esta categoría» con 6 tarjetas; tira de 327 px
   visibles sobre 770 de contenido; `scrollLeft` se movió a 400 por JS (con el dedo no se probó). Entran dos y media. Sin
   scroll horizontal de página (`scrollWidth` 375 = viewport). Va debajo de la acción y encima de «Compartir».
2. El producto abierto no sale en su propia tira.
3. Tocar la 1.ª de la tira: la ficha pasa a ese producto, `scrollTop` de la caja de **475 a 0**, y la tira se
   recalcula (ya no está el tocado, ahora aparece el anterior).
4. Cerrar → sección oculta y `#rel-tira` vacío. Abrir uno de Playa → 3 tarjetas, ninguna de las de Cabello.
5. Uñas (2 productos) y Confituras (1): sección con `display:none` y 0 tarjetas.
6. Modo oscuro (`prefers-color-scheme: dark` emulado): borde `rgb(51,42,59)`, título, nombres y precios
   `rgb(246,241,244)` sobre `rgb(30,24,34)`. Capturas: `2026-10-12-relacionados-375px-claro.png` y `-oscuro.png`.
   Fotos 120×120 alineadas (todas `top` 403), nombre largo recortado a 2 líneas.

## Pendiente / no verificado

- ⚠ NO VERIFICADO: escritorio (≥ 640 px, donde el modal se centra); solo se miró a 375 px.
- ⚠ NO VERIFICADO: un teléfono real ni Safari/Firefox; solo Chrome. `-webkit-line-clamp` y el arrastre táctil
  de la tira no se probaron con dedo.
- ⚠ NO VERIFICADO: enlace de producto (`/p/CODIGO`) abriendo directamente una ficha con tira.
- Observación sin tocar (fuera de plan): al abrir un producto desde la tira, `elementoAnteriorFoco` pasa a ser
  la tarjeta de la tira, que se destruye al repintar; al cerrar, el guard `isConnected` evita el error pero (por lectura del código, no probado) el
  foco no vuelve a la tarjeta de la parrilla de origen. Efecto solo para teclado/lector de pantalla.
- Los archivos de trabajo del repo están en CRLF (el índice en LF por `autocrlf`); las inserciones se
  hicieron con CRLF para no ensuciar los diffs.
