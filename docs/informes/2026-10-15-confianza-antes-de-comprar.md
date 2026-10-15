# Confianza antes de comprar (2026-10-15)

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-15-tienda-confianza-antes-de-comprar.md`
(Tasks 1 a 4). Sin push. Sin tocar `catalogo.json`, `data.json`, `bot-mia/` ni `lib/miaPublicados.js`.

## Qué cambió

**Stock+ (rama `mensajeria-zonas`), commit `93a7b2a`**
- `lib/catalogoWeb.js`: constante `GARANTIA_DEFAULT` (junto a `QUIEN_SOMOS_DEFAULT`) y clave nueva
  `tienda.garantia = (cfg.webGarantiaTexto || '').trim() || GARANTIA_DEFAULT`, justo debajo de `politica`.
- `tests/catalogoWeb.test.js`: las 3 pruebas del plan + ajuste de las dos listas blancas existentes (ver «Discrepancia»).

**Tienda (rama `main`), commits `47dff6e` y `1cca26c`**
- `index.html`: sección `.confianza` (3 pasos fijos + `<p id="garantia" hidden>`) encima de `<div class="contenido">`;
  `<p id="garantia-ficha" hidden>` debajo de `#modal-accion`.
- `estilos.css`: bloque «Confianza (portada)» al final.
- `app.js`: `garantiaTexto()`, `pintarGarantia()` y su llamada en `cargarCatalogo()`.
- `sw.js`: `CACHE` `tienda-3b-v6` -> `tienda-3b-v7`.

## Texto de la garantía (el que se publica por defecto)

> Revisas todo delante de la mensajera antes de pagar. Si no te convence, no te lo llevas: solo pagas el viaje de la mensajera.

Conserva a propósito que el viaje de la mensajera SÍ se paga. El texto defensivo del carrito
(`tienda.politica` / `politicaTexto()`) no se tocó (el diff de `app.js` solo añade líneas).

## Los tres puntos marcados

1. `--brand-ink`: existe (`estilos.css` línea 42, claro `#FFFFFF`; línea 106, oscuro `#2A0E20`). Se dejó el
   `var(--brand-ink,#fff)` del plan.
2. `renderControles();`: la llamada aparece UNA vez (la otra coincidencia es la definición, `function renderControles`).
   Está dentro de `cargarCatalogo()` y después de `CAT = await r.json()`. `pintarGarantia();` va justo encima.
3. `GARANTIA_DEFAULT`: constante de módulo (línea ~33), en el mismo ámbito que `QUIEN_SOMOS_DEFAULT`, antes de
   `construirCatalogoWeb`. Sin problema de ámbito.

## Discrepancias con el plan

- Dos pruebas existentes de `tests/catalogoWeb.test.js` («el bloque tienda sale con las 12 claves configuradas»
  y «LISTA BLANCA: el bloque tienda no cuela ningún otro campo de config») comparan las claves exactas de `tienda`
  y fallaron al añadir `garantia`. El plan no las mencionaba. Se añadió `garantia` a las dos (con el patrón de
  comentario que ya usan las demás claves). Es consecuencia directa y forzosa del cambio; está en el mismo commit.
- Fin de línea: el plan/encargo decía que Stock+ es LF. El árbol de trabajo de Stock+ es CRLF
  (`core.autocrlf=true`, `file` lo confirma), igual que la tienda. Se respetó CRLF en todos los archivos tocados.
- En `app.js` el plan decía insertar encima de `function politicaTexto() {`; esa función tiene un comentario
  pegado encima, así que se insertó encima del comentario para no separarlos.

## Pruebas observadas

- Stock+ `npm test`: antes (baseline dada) 1526; después **1529/1529**, fail 0, exit 0 (`tests/catalogoWeb.test.js` solo: 119/119).
- Tienda `node --test`: antes **71/71**; después **71/71**, fail 0.
- `node --check sw.js` y `node --check app.js`: sin salida (ok). `grep -n "const CACHE = " sw.js` -> `11:const CACHE = 'tienda-3b-v7';`
- Comprobación sin navegador: ids únicos en `index.html`; `pintarGarantia` extraída de `app.js` y ejecutada en
  `node:vm` con `document` simulado: con garantía pinta ambos y los muestra; sin garantía / `tienda` ausente /
  `CAT` null los deja ocultos y vacíos.

## Task 4 (mirarlo): ⚠ NO VERIFICADO: memoria insuficiente

Memoria libre medida: 250 MB al empezar; 507-525 MB (estable, tres lecturas) cuando corrí la suite de Stock+;
459 MB justo después; 378 MB al terminar el código; 305-320 MB (cuatro lecturas) al llegar a la Task 4.
Con 400 MB o menos no se abre navegador: la Task 4 queda sin ejecutar y los 6 puntos NO VERIFICADOS
(portada con los 3 pasos y la caja; sin desbordar a 375 px; renglón de la ficha bajo «Añadir»; texto con
«antes de pagar» + viaje de la mensajera; texto del carrito intacto; captura `docs/informes/2026-10-15-confianza-375px.png`
NO generada). No se inyectó `tienda.garantia` en `catalogo.json`.

## Pendiente de Ruth / del orquestador

Reiniciar `server.js` y publicar el catálogo: hasta entonces `tienda.garantia` no viaja y el renglón no se pinta.
Tras publicar el sitio, la caché `v7` obliga a los teléfonos con la PWA a recoger el código nuevo.
