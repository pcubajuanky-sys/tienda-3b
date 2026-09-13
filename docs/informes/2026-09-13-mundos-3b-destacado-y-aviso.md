# Informe de relevo — 3B más grande + aviso de negocios socios

Fecha: 2026-09-13
Plan ejecutado: `docs/superpowers/plans/2026-09-13-mundos-3b-destacado-y-aviso.md`
Spec: `docs/superpowers/specs/2026-09-13-mundos-3b-destacado-y-aviso-design.md`
Proyecto: `C:\inventario\tienda-3b` (sitio estático, sin build, sin tests).

## Qué se hizo

Se ejecutaron las Tasks 1 a 5 del plan literalmente, sin desviaciones de contenido:

1. **`mundos.js`** (archivo nuevo, raíz del proyecto) — copiado tal cual del plan. Vive en las
   dos páginas, expone `window.Mundos.refrescar()`, y decide mostrar la franja/globo según:
   `localStorage['3b_mundos_visto']` y si hay algún `.mundo:not(.mundo-on)` visible en el `<nav
   class="mundos">`.
2. **`estilos.css`** — añadido al final del bloque «Conmutador de mundos» (el bloque terminaba
   exactamente en la última línea del archivo, línea 824; coincidía con lo que describía el
   plan). Reglas `.mundo-3b`, `.mundos-globo` (+ `::before`), `.promo-mundos`.
3. **`index.html`** — franja `#promo-mundos` antes de `<header>`; clase `mundo-3b` añadida al
   logo de 3B y `<span id="mundos-globo">` añadido al final del `<nav class="mundos">`;
   `<script src="mundos.js">` antes de `<script src="app.js">`.
4. **`taxi.html`** — mismos tres cambios adaptados: franja antes de `<header>`; `mundo-3b` en el
   logo de 3B (el `mundo-on` del taxi no se tocó) + el mismo `<span id="mundos-globo">`;
   `<script src="mundos.js">` antes de `<script src="taxi.js">`. `taxi.js` no se tocó.
5. **`app.js`** — añadida la línea `if (window.Mundos) window.Mundos.refrescar();` al final de
   `renderMundos()`. Nada más se tocó en `app.js`.

Antes de cada edición se leyó el archivo real (no se editó de memoria); en los tres archivos las
líneas y el contenido alrededor coincidían exactamente con lo que el plan describía (incluidos
los números de línea aproximados), así que no hizo falta parar a preguntar nada.

## Archivos creados/modificados

- **Creado:** `C:\inventario\tienda-3b\mundos.js`
- **Modificado:** `C:\inventario\tienda-3b\estilos.css`
- **Modificado:** `C:\inventario\tienda-3b\index.html`
- **Modificado:** `C:\inventario\tienda-3b\taxi.html`
- **Modificado:** `C:\inventario\tienda-3b\app.js`
- **Creado (este informe):** `C:\inventario\tienda-3b\docs\informes\2026-09-13-mundos-3b-destacado-y-aviso.md`

`git diff --stat` observado tras los cambios:

```
 app.js      |  1 +
 estilos.css | 26 ++++++++++++++++++++++++++
 index.html  | 13 ++++++++++++-
 taxi.html   | 13 ++++++++++++-
 4 files changed, 51 insertions(+), 2 deletions(-)
```

No se hizo commit ni push (instrucción explícita del plan/dueño).

## Verificación (Task 6) — con los ojos, observado en el Browser pane

Servidor: `python -m http.server 8777 --bind 127.0.0.1` en la raíz del proyecto.

**Nota operativa (no relacionada con el código del plan):** al primer intento de arrancar el
servidor, el puerto 8777 ya tenía un proceso `python.exe` (PID 24340) huérfano de una sesión
anterior sirviendo un directorio distinto (el scratchpad, con `maqueta-mundos.html` — la maqueta
usada para aprobar el diseño). Confirmado el problema (la petición de `/mundos.js` devolvía 404
con un *directory listing* ajeno), se mataron ambos procesos en el puerto 8777 y se arrancó uno
limpio con `Start-Process ... -WorkingDirectory "C:\inventario\tienda-3b"`, verificado con `curl`
contra `/`, `/mundos.js`, `/taxi.html` y `/app.js` (los 4 devolvieron 200) antes de abrir el
navegador.

`node --check mundos.js` → sin errores (pedido explícitamente por la Task 1).

Viewport emulado 430×820 en `mcp__Claude_Browser__resize_window`.

1. **Arriba del todo, franja + logo grande** — ✅ VERIFICADO (capturas tomadas y revisadas
   visualmente en el Browser pane; no se pudieron guardar como archivos de imagen porque las
   herramientas del Browser pane disponibles no exponen una acción de "guardar captura a disco"
   — solo devuelven la imagen inline dentro de la sesión. Descripción de lo observado: en
   `http://127.0.0.1:8777/`, franja morada de ancho completo arriba con el texto «3B es más de
   un negocio 👇 Toca los logos y conoce a nuestros socios», y debajo el logo de 3B con un aro
   rosa perceptiblemente más grande que el del taxi.
2. **Al bajar, franja se va con el scroll y aparece el globo** — ✅ VERIFICADO. Tras 3 "ticks" de
   scroll hacia abajo, la franja `#promo-mundos` desapareció del viewport (se fue con el
   contenido, no hubo salto de layout) y junto a los logos apareció el globo rosa «👉 Toca
   nuestros otros negocios» (con la punta apuntando a los logos), en el flujo del `<nav
   class="mundos">`.
3. **El globo sigue ahí al seguir bajando, no tapa buscador ni carrito** — ✅ VERIFICADO. Con más
   scroll (hasta la sección de productos/"Los más vendidos"), la cabecera `sticky` mantuvo el
   globo visible junto a los logos, y tanto el buscador como el botón del carrito quedaron
   visibles y sin solaparse con el globo.
4. **En `/taxi.html`: 3B grande y taxi con su aro verde de página actual** — ✅ VERIFICADO. Captura
   visual: logo de 3B claramente más grande, logo del taxi con su aro de "página actual".
   Confirmado además por `getComputedStyle` vía `javascript_tool`: el `.mundo.mundo-on .mundo-img`
   (el logo del taxi en esa página) renderiza `box-shadow: rgb(53, 196, 107) 0px 0px 0px 2px`
   (verde), y `.mundo-3b` mide `width: 74px` en el viewport móvil (breakpoint <600px), confirmando
   que la regla CSS del plan se aplicó.
5. **Tocar el logo del taxi → navega; al volver a `/`, ni franja ni globo** — ✅ VERIFICADO, con una
   adaptación de mecanismo: el `href="/taxi"` del enlace usa la URL "limpia" que en producción
   reescribe `vercel.json`/`_redirects` a `/taxi.html` — `python -m http.server` no hace ese
   rewrite (comportamiento preexistente del sitio, ajeno a este plan; confirmado leyendo
   `_redirects`: `/taxi  /taxi.html  200`). Se disparó el clic real sobre `#mundo-taxi` con
   `element.click()` vía `javascript_tool` (el mismo listener de `document.addEventListener('click', ...)`
   de `mundos.js` se ejecuta igual) y se confirmó `localStorage.getItem('3b_mundos_visto') === '1'`
   inmediatamente después del clic, antes de que la navegación (fallida por la URL limpia)
   interrumpiera la página. Se navegó luego a mano a `/taxi.html` y de vuelta a `/`: la franja y
   el globo NO aparecieron (captura revisada: cabecera normal, sin `#promo-mundos` visible).
6. **Borrando `3b_mundos_visto` y recargando, el aviso vuelve** — ✅ VERIFICADO.
   `localStorage.removeItem('3b_mundos_visto')` + recarga de `/` → la franja volvió a aparecer
   (captura revisada, idéntica a la del punto 1).

**Prueba "no invitar al vacío"** — ✅ VERIFICADO. En la consola (vía `javascript_tool`):

```js
document.getElementById('mundo-taxi').hidden = true;
window.Mundos.refrescar();
```

Resultado observado: `{franjaHidden: true, globoHidden: true}` — ambos elementos se ocultan
cuando no hay otro negocio visible, tal como pide la spec ("No se invita al vacío"). No se tocó
`catalogo.json`, como indicaba el plan.

Al terminar, se detuvo el servidor (`Stop-Process` sobre el PID de `python.exe`) y se confirmó con
`netstat` que el puerto 8777 quedó sin proceso en estado `LISTENING`. Se restauró el viewport del
Browser pane a `desktop` y se cerró la pestaña de prueba.

### Sobre las capturas pedidas por el plan

El plan pide «Captura (1) y (2) y pégalas en el informe». Las capturas se tomaron y se revisaron
visualmente dentro de la sesión (son las que sustentan los puntos 1 y 2 arriba), pero las
herramientas del Browser pane disponibles en este entorno no ofrecen una acción para guardar esas
capturas como archivo de imagen en disco — solo se devuelven inline en la conversación de la
herramienta. Por eso no se adjuntan como archivos `.png` en este informe; en su lugar se dejó la
descripción detallada de lo observado en cada punto. ⚠ Si el dueño necesita las imágenes en disco,
hay que repetir la Task 6 con una herramienta que sí pueda persistirlas (p. ej. `computer-use`
sobre el navegador del sistema, o pedir capturas manuales).

## Desviaciones del plan y su motivo

Ninguna desviación en el código (Tasks 1–5 ejecutadas literalmente, snippets copiados tal cual).
Dos particularidades de la verificación (Task 6), ninguna causada por el código del plan:

1. **Puerto 8777 ocupado por un proceso huérfano de otra sesión** al primer intento — se
   diagnosticó, se limpió y se relanzó el servidor correcto antes de dar cualquier punto por
   verificado. No afecta al código entregado, solo al procedimiento de arranque del servidor de
   pruebas.
2. **URL limpia `/taxi` no resuelve en `python -m http.server`** (falta el rewrite de
   `vercel.json`/`_redirects`, que sí aplica en producción) — comportamiento preexistente del
   sitio, no introducido por este plan. Se sorteó navegando a `/taxi.html` directamente y
   disparando el clic con `element.click()` para verificar el efecto real del listener de
   `mundos.js` (marcar `3b_mundos_visto`), que es lo que el punto 5 del plan pretende probar.
3. **Capturas no guardadas como archivo** (ver sección anterior) — limitación de las herramientas
   disponibles, no del código.

## Definition of done

- [x] Los 5 pasos de código ejecutados literalmente, sin features/archivos/mejoras fuera del plan.
- [x] `node --check mundos.js` corrido y observado sin errores.
- [x] Los 6 puntos de verificación + la prueba "no invitar al vacío" corridos y OBSERVADOS con el
      Browser pane (no fabricados).
- [x] Servidor de pruebas detenido al terminar.
- [x] Sin commit ni push (por instrucción explícita).
- [x] Este informe, autocontenido, con lo no verificado marcado como tal (las capturas en disco).

---

## Verificación independiente del piloto (Opus 5, 2026-09-13)

Revisión por ARTEFACTO, no por el resumen del ejecutor: se leyó el `git diff` completo de
`index.html`, `taxi.html`, `app.js` y `estilos.css` y el contenido íntegro de `mundos.js`.
Coinciden literalmente con los snippets del plan; `node --check mundos.js` pasa.

Observado con los propios ojos en `http://127.0.0.1:8778` (servidor propio, ya detenido),
Browser pane, viewport 430×820 y 1280×800, en tema oscuro y claro:

- **Franja arriba del todo**, con el texto completo, y el logo de 3B claramente mayor que el del
  taxi. Verificado en `/` (oscuro) y en `/taxi.html` (claro).
- **Globo tras bajar**, pegado a los logos dentro de la cabecera sticky, con su piquito apuntando
  a los iconos. Verificado en `/` y en `/taxi.html`.
- **No tapa nada:** a 430 px el globo ocupa x=168→281 y el botón del carrito empieza en x=337
  (56 px de aire, medido con `getBoundingClientRect`).
- **Se apaga al tocar un negocio:** clic real en el logo de 3B desde `/taxi.html` → navegó a `/`
  con `localStorage['3b_mundos_visto'] === '1'`, `#promo-mundos` oculto y `#mundos-globo` oculto,
  con el icono del taxi visible. Medido en la consola de la página ya cargada.
- **Vuelve al borrar la marca:** tras `localStorage.removeItem('3b_mundos_visto')` y recargar,
  la franja y el globo reaparecen.

### Detalle conocido, no corregido

En `index.html` la franja no aparece hasta que llega `catalogo.json` (el taxi está `hidden` hasta
que `tienda.taxiActivo` lo enciende, y de ahí cuelga `renderMundos()` → `Mundos.refrescar()`). Es
deliberado — no se invita a tocar un icono que no existe — pero significa que la franja entra
unos milisegundos después de pintar, empujando el contenido hacia abajo mientras aún se ve el
esqueleto de carga. No se tocó: cambiarlo obligaría a enseñar el aviso antes de saber si hay algo
que descubrir.
