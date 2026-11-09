# «Recién llegado» — sello NUEVO y fila en la portada (2026-11-08) — informe

**Plan:** `docs/superpowers/plans/2026-11-08-recien-llegado.md`. Lo implementó un subagente sonnet y
el piloto lo revisó.

## Qué hace
- Las tarjetas de los productos dados de alta en los **últimos 7 días** llevan el sello **NUEVO**.
- La fila **«🆕 Recién llegado»** va en la portada, entre «Los más vendidos» y «Vistos hace poco»:
  - muestra hasta 12 tarjetas compactas que abren la ficha;
  - tiene un botón «Ver todo lo nuevo», que ordena la parrilla por «Lo más nuevo»;
  - se oculta al buscar o filtrar, y también cuando hay menos de 2 nuevos;
  - respeta el chip de mensajería gratis.
- El dato es `items[].creado`, que Stock+ ya publicaba, así que **en Stock+ no se tocó nada**.
- La lógica vive en el módulo puro `novedades.js`, de modo que una fecha futura por un reloj mal
  puesto no se marca como nueva.
- La caché del service worker pasa a `tienda-3b-v53`.

## 🔴 Lo que pilló la revisión
El primer informe del subagente decía «todo hecho» y era falso.
- `const nuevo` no estaba declarada en `tarjetaHtml`, lo que lanzaba un `ReferenceError` en cada
  tarjeta: **la tienda se habría quedado en blanco al publicar**.
- `renderNuevos()` no se llamaba desde ningún sitio.
- La causa: dos reemplazos escritos con LF sobre un `app.js` en CRLF que no se aplicaron. Los tests
  pasaban porque no tocan `app.js`.
- Arreglo: las dos líneas, más `test/novedadesCableado.test.js`, que vigila esos dos puntos y la
  sección en las tres cáscaras.
- **Lección:** tras un subagente que edite `app.js`, comprueba con `grep` que el cambio está en el
  archivo antes de creerte el informe.

## Evidencia observada
- `node --test`: **365/365**. La baseline era 354, a la que se suman 8 de `novedades` y 3 de
  cableado.
- `node --check app.js`.
- **Prueba de humo del piloto:** cargó en `node:vm`, con un DOM falso, todos los scripts de
  `index.html`. Con el código nuevo, `tarjetaHtml` dibuja la tarjeta con el sello para un producto
  de ayer y sin sello para uno viejo. Con el código anterior también dibuja y sin sello, lo que
  confirma que el arnés funciona.
- Contraste del sello calculado con los tokens (`--brand` sobre `--brand-soft`): **16,37:1** en
  claro y **14,25:1** en oscuro.
- Commit `67b9ea8`, con push a `main`.

## ⚠ NO VERIFICADO
**Nada se ha visto en pantalla.** Durante toda la sesión hubo entre 41 y 88 MB de RAM libre, así que
quedan sin comprobar:
- que el sello no tape el corazón de favorito;
- cómo queda la fila a 375 px;
- el desplazamiento de «Ver todo lo nuevo».
