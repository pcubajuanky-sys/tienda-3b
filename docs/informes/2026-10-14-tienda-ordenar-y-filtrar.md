# 2026-10-14 — Tienda: ordenar y filtrar el catálogo

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-14-tienda-ordenar-y-filtrar.md`
Dos repos. Sin `git push`.

## Punto 6 del Step 2: el plan estaba mal (decisión del coordinador: opción A)

El plan pedía que, con el `catalogo.json` original (sin `creado` ni `envioGratis`), la fila de
controles **no apareciera**. Eso era un error del plan: ordenar A–Z, «Más baratos primero» y «Más
caros primero» solo usan `precioCUP`, que **ya se publica hoy**, así que esas tres opciones
funcionan sin republicar y se enseñan desde ya (medido en Chrome a 375 px con el catálogo
original: desplegable visible con tres opciones, chip 🛵 oculto). El chip 🛵 y «Lo más nuevo»
aparecen cuando Stock+ publique `envioGratis` y `creado`. `renderControles()` no se toca por esto.

## Arreglo posterior: parrilla vacía sin mensaje

Fallo real introducido por este cambio: `#vacio` («No hay productos que coincidan con tu búsqueda»
+ botón) se decidía con `visibles()` ANTES del filtro 🛵, y el chip no contaba como filtro. Con el
chip puesto y una categoría sin ningún producto de mensajería gratis, la parrilla quedaba en blanco
sin explicación. Ahora `renderGrid()` lo decide con la lista FINAL:
`vacio.hidden = !(lista.length === 0 && (buscando || soloEnvioGratis))`.

Comprobado en Chrome a 375 px (catálogo de prueba: 131 con `envioGratis`, la categoría Muebles, 6
productos, con 0 gratis; captura `scratchpadordenacio-chip-categoria.png`):
0. Sin filtros: mensaje oculto, 234 tarjetas.
1. Chip puesto, sin categoría: mensaje oculto, 127 tarjetas.
2. Chip + Muebles: **mensaje visible** con su botón «Ver todo el catálogo», 0 tarjetas.
3. Quitar el chip (misma categoría): mensaje oculto, vuelven las 6 tarjetas.
4. Chip otra vez: mensaje visible de nuevo.
5. Pulsar «Ver todo el catálogo» con el chip aún puesto: mensaje oculto, 127 tarjetas, categoría
   limpia. (Ese botón limpia búsqueda y categoría pero NO el chip; quedan los 127 con mensajería
   gratis, no los 234. No se cambió.)
6. Quitar el chip: 234 tarjetas.
7. Regresión: búsqueda sin resultados y sin chip: mensaje visible.
8. Regresión: limpiar la búsqueda: mensaje oculto, 234 tarjetas.
Cero errores de página.

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
Tienda `node --test`: antes 61/61, después **71/71** (y 71/71 tras el arreglo del aviso), exit 0 las dos.
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
6. El plan pedía que los controles NO aparecieran con el catálogo original; era un error del plan.
   A–Z, más baratos y más caros funcionan sin republicar, así que se enseñan desde ya; el chip 🛵 y
   «Lo más nuevo» aparecen cuando Stock+ publique `envioGratis` y `creado`. Visto: con el catálogo
   original el desplegable sale con tres opciones y el chip queda oculto.
7. Captura: `C:\inventario\tienda-3b\docs\informes\2026-10-14-orden-filtro-375px.png`. Otras, en el
   scratchpad de la sesión (`...\scratchpad\orden\`): `p6-original-375px.png`,
   `final-dark-375px.png`, `p4-chip-activo-light.png`, `p5-categoria-dark.png`.

Cero errores de página/consola en las tres pasadas. `catalogo.json` se tocó solo temporalmente
(para el script) y se restauró con `git checkout --`; `git status` limpio.

## Observaciones (leídas en el código, NO reproducidas)

- El carrusel «Los más vendidos» no se filtra ni se ordena: en portada, con el chip puesto, los
  destacados siguen arriba aunque no tengan mensajería gratis (la parrilla de abajo sí).

## ⚠ NO VERIFICADO

- Que Stock+ publique de verdad `creado`/`envioGratis`: solo se probó `construirCatalogoWeb` con
  los datos reales; **no** se arrancó `server.js` ni se publicó el catálogo. Pendiente de Ruth:
  reiniciar `server.js` y pulsar «Publicar catálogo ahora».
- Nada en un teléfono real; todo en Chrome de escritorio emulando 375 px.
- La tienda sin conexión con `orden.js` (service worker v4): solo se comprobó que `orden.js` está
  en `ARMAZON` y que todos los `<script src>` de `index.html` están listados; no se probó offline.
- Escritorio ancho (≥1024 px): no se miró el aspecto de los controles.
- `CLAUDE.md`/napkin: no actualizados (fuera del alcance del plan).
