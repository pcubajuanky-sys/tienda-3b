# 2026-10-14 — Tienda: ordenar y filtrar el catálogo

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-14-tienda-ordenar-y-filtrar.md`
Dos repos. Sin `git push`.

## 🔴 Discrepancia que necesita decisión del dueño

**Punto 6 del Step 2 de la Task 4 NO se cumple tal como está escrito.** Con el `catalogo.json`
ORIGINAL (sin `creado` ni `envioGratis`) la fila de controles **sí aparece**: enseña el
desplegable con tres opciones (Nombre A–Z, Más baratos primero, Más caros primero). Medido en
Chrome a 375 px: `#controles` visible, `hidden` falso, `.grid-head` con hijos visibles
`grid-titulo` + `controles` (el chip 🛵 sí queda oculto).

Causa: el código del propio plan, `cont.hidden = ops.length < 2 && !hayEnvio`. Con el catálogo
viejo `opcionesUtiles` devuelve 3 opciones (`barato`/`caro` solo necesitan `precioCUP`, que ya se
publica), así que no se esconde. Además la prueba `opcionesUtiles esconde «nuevo»...` del plan
exige que `az` y `barato` sigan ahí. Es decir: el código y las pruebas del plan dicen una cosa y
el punto 6 dice otra. **No lo cambié.** Capturas: `p6-original-375px.png` (en el scratchpad, ver
abajo).

Dos salidas:
- **A (dejarlo):** el desplegable sale hoy mismo en producción con A–Z / baratos / caros, que
  funcionan con los datos actuales; «Lo más nuevo» y el chip 🛵 esperan a que Ruth republique.
- **B (cumplir el punto 6 al pie de la letra):** cambiar en `renderControles()` la línea a
  `cont.hidden = !(ops.length > 3 || hayEnvio)` o equivalente (mostrar solo si hay «nuevo» o
  chip). Es un cambio de una línea en `app.js`; con él, además, el punto 6 se cumple.

## Lo cambiado

**Stock+ (`inventario-stockmas`, rama `mensajeria-zonas`)** — commit `327a161`
- `lib/catalogoWeb.js`: publica `item.envioGratis = true` (solo mensajería gratis incondicional:
  `/gratis/i` y no `/desde/i` sobre `envioCorto`) y `item.creado` (solo si `p.created > 0`).
- `tests/catalogoWeb.test.js`: 4 pruebas nuevas.

**Tienda (`tienda-3b`, rama `main`)** — commits `fb73185`, `659c7fe`, `afd776f`
- `orden.js` (nuevo) + `test/orden.test.js` (nuevo, 10 pruebas).
- `index.html`: `<script src="orden.js">` y la fila `#controles`.
- `estilos.css`: `.controles`, `.orden-sel`, `.chip-filtro`.
- `app.js`: estado (`ordenSel`, `soloEnvioGratis`), `renderControles()`, filtro→orden en
  `renderGrid()`, y los dos listeners en `iniciar()`.
- `sw.js`: `CACHE` `tienda-3b-v3` → `v4` y `'/orden.js'` en `ARMAZON`.
- `docs/informes/2026-10-14-orden-filtro-375px.png`: captura a 375 px (claro, «Más baratos
  primero» + chip activo).

## Los cuatro puntos 🔴 del plan

1. **Dónde se asigna `item.envio` en `catalogoWeb.js`:** donde decía el plan (línea 256,
   `if (envioCorto) item.envio = {...}`). Inserté el bloque justo debajo de ese `if`, antes de
   `if (esEnvioAparte(p))`. Sin discrepancia.
2. **La regla `.grid-head`:** es `display:flex;align-items:center;flex-wrap:wrap;gap:10px`, **sin**
   `space-between`. Añadí las reglas del plan debajo y no toqué `.grid-head`. A 375 px el título
   queda en una línea y los controles caen a la siguiente (visto en captura); en el catálogo
   original el desplegable cabe junto al título. Un desvío menor: el estado activo del chip usa
   `color:var(--brand-ink)` en vez de `#fff` (como ya hace `.btn-primario`), porque en oscuro
   `--brand` es `#E9A8CE` y blanco sobre rosa claro no se lee.
3. **`renderControles()` respecto a `cargarCatalogo()`:** el plan lo ponía tras `await
   cargarCatalogo();`, pero ese texto aparece **dos veces** (`iniciar()` y `revalidarCierre()`) y,
   peor, `cargarCatalogo()` también se llama desde el botón «Reintentar»: si la primera carga
   fallaba y el cliente reintentaba, los controles no se habrían pintado nunca. Lo puse **dentro**
   de `cargarCatalogo()`, justo antes de `renderGrid()`, donde `CAT` ya está relleno y cubre las
   tres rutas. Añadí dos líneas defensivas en `renderControles()` para ese caso de recarga:
   `ordenSel = sel.value` y `if (!hayEnvio) soloEnvioGratis = false` (si el catálogo recargado
   ya no trae la opción/el chip, el estado vuelve a A–Z / sin filtro en vez de dejar la parrilla
   vacía sin salida).
4. **Filtro antes que orden:** correcto, como dice el plan. Va después de quitar los destacados.

El ancla `medirHeader();` del Step 6 tampoco era única como texto; usé la línea de `iniciar()`
justo tras `engancharGestoGaleria();`.

## Cifras observadas

Stock+ `npm test`: antes 1522/1522, después **1526/1526**, exit 0 las dos.
Tienda `node --test`: antes 61/61, después **71/71**, exit 0 las dos.
Se vio rojo antes de verde: Task 1 (2 de las 4 pruebas fallaban antes de implementar) y Task 2
(`ENOENT orden.js`).

Catálogo REAL (Step 5 de la Task 1, con los datos de hoy): `items 240 | con creado 240 |
envioGratis 137`. Desglose por texto de envío: «🛵 Mensajería gratis» 137, «🛵 Gratis desde 2,000
CUP» 102, «🚚 Transporte aparte» 1. Los condicionales NO entran. (El plan hablaba de 247/140/106
por una foto anterior del catálogo.)

## Los 7 puntos del Step 2 (Chrome del sistema + puppeteer-core del scratchpad, 375×812, claro y
## oscuro; catálogo de prueba: 240 items, todos con `creado`, 137 con `envioGratis`)

1. Desplegable y chip 🛵 sobre la parrilla: **sí**, en claro y en oscuro; opciones
   `az, barato, caro, nuevo`; sin desbordamiento horizontal (scrollWidth 375 = innerWidth 375).
2. «Más baratos» ordena de menor a mayor por `precioCUP` (primeros: 200, 300, 350, 350) y «Más
   caros» al revés (51350, 47400, 33180, 31600): comprobado sobre las 234 tarjetas.
3. «Lo más nuevo» ordena por `creado` descendente y difiere de A–Z; volver a A–Z restaura el
   orden inicial exacto.
4. El chip reduce 234 → 132 tarjetas, se queda `aria-pressed="true"`, **todas** muestran
   «🛵 Mensajería gratis» (cero tarjetas sin chip de envío, ningún texto condicional); al
   volver a tocarlo, 234 otra vez.
5. Con chip + «Más baratos» puestos, al **buscar** «a» (136 resultados) y al **elegir la
   categoría** Electrodomésticos (14 resultados) el filtro y el orden se mantienen (todo gratis,
   todo de la categoría, precios ascendentes, chip y desplegable intactos).
6. **NO CUMPLE** — ver la discrepancia de arriba.
7. Captura: `C:\inventario\tienda-3b\docs\informes\2026-10-14-orden-filtro-375px.png`. Otras, en el
   scratchpad de la sesión (`...\scratchpad\orden\`): `p6-original-375px.png`,
   `final-dark-375px.png`, `p4-chip-activo-light.png`, `p5-categoria-dark.png`.

Cero errores de página/consola en las tres pasadas. `catalogo.json` se tocó solo temporalmente
(para el script) y se restauró con `git checkout --`; `git status` limpio.

## Observaciones (leídas en el código, NO reproducidas)

- El carrusel «Los más vendidos» no se filtra ni se ordena: en portada, con el chip puesto, los
  destacados siguen arriba aunque no tengan mensajería gratis (la parrilla de abajo sí).
- `#vacio` («sin resultados») se decide con `visibles()` ANTES del filtro 🛵: si búsqueda/categoría
  tienen resultados pero ninguno con mensajería gratis, la parrilla queda vacía sin mensaje.

## ⚠ NO VERIFICADO

- Que Stock+ publique de verdad `creado`/`envioGratis`: solo se probó `construirCatalogoWeb` con
  los datos reales; **no** se arrancó `server.js` ni se publicó el catálogo. Pendiente de Ruth:
  reiniciar `server.js` y pulsar «Publicar catálogo ahora».
- Nada en un teléfono real; todo en Chrome de escritorio emulando 375 px.
- La tienda sin conexión con `orden.js` (service worker v4): solo se comprobó que `orden.js` está
  en `ARMAZON` y que todos los `<script src>` de `index.html` están listados; no se probó offline.
- Escritorio ancho (≥1024 px): no se miró el aspecto de los controles.
- `CLAUDE.md`/napkin: no actualizados (fuera del alcance del plan).
