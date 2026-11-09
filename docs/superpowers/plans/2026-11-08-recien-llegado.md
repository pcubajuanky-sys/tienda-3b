# Plan: «Recién llegado» — sello NUEVO y fila en la portada (2026-11-08)

**Qué pide Ruth:** darle al cliente un motivo para volver aunque ya haya visto todo. Lo que entró
en los últimos días lleva un sello **NUEVO** y tiene su propia fila arriba.

**Dato ya disponible, no hay que tocar Stock+:** `catalogo.json` ya publica `items[].creado`, la
fecha de alta en ms (`lib/catalogoWeb.js:404`), y `orden.js` ya la usa para «Lo más nuevo». Medido
el 2026-11-08 sobre `data.json`: **15** productos con stock dados de alta en los últimos 7 días, y
35 en los últimos 14. Ventana elegida: **7 días**.

## 1. `novedades.js` (nuevo, PURO, IIFE + `window.Novedades`, patrón de `orden.js`)
- `DIAS = 7`.
- `esNuevo(p, ahora, dias = DIAS)` → `true` si `Number(p.creado) > 0` y `ahora - creado` está entre
  `0` y `dias × 86400000`. Una fecha futura (reloj mal puesto del teléfono) es `false`. Sin
  `creado`, `false`.
- `lista(items, ahora, {dias, max = 12})` → los nuevos, del más reciente al más viejo, con un tope
  de `max`. Devuelve un array **nuevo** y no muta la entrada.
- Tests en `test/novedades.test.js` con `node:vm`, como `test/orden.test.js`: límites de 7 días
  (justo dentro y justo fuera), futuro, sin `creado`, orden, tope y que no muta.

## 2. Sello en la tarjeta (`app.js`, `tarjetaHtml`)
- Si `Novedades.esNuevo(p, Date.now())`, se añade `<span class="card-nuevo">NUEVO</span>` dentro de
  `.card-sellos`. La condición que abre `.card-sellos` pasa a ser
  `p.enOferta || p.destacado || nuevo`. Orden de los sellos: oferta, NUEVO, más vendido.
- `estilos.css`: `.card-nuevo` con la misma forma que `.card-oferta` y `.card-mv` (pill, 11 px,
  800). El color sale de un token **existente** (por ejemplo el de marca) y debe tener un contraste
  **≥ 4.5:1 en claro y en oscuro**: mídelo y deja la cifra en el informe. No uses el color de la
  oferta, para que no se confundan.

## 3. Fila «Recién llegado» (`app.js` y las TRES cáscaras)
- **HTML** (`index.html`, `electripower.html`, `delmar.html`): una
  `<section id="nuevos" class="recientes" hidden aria-labelledby="nuevos-titulo">` **entre
  `#mas-vendidos` y `#recientes`**, con `<h2 id="nuevos-titulo" class="mv-titulo">🆕 Recién
  llegado</h2>`, `<div class="completar-tira" id="nuevos-tira"></div>` y un botón
  `<button type="button" class="btn btn-texto" id="nuevos-ver-todo">Ver todo lo nuevo</button>`.
- **`renderNuevos()`**, gemela de `renderRecientes()`:
  - Mismo marcado compacto (`rel-card completar-card` con foto, nombre y precio), **sin botones de
    cantidad**. 🔴 Pintar la tarjeta completa duplicaría el id `acc-<id>` de la parrilla.
  - Lleva su propio atributo (`data-nuevo="<id>"`) y un escuchador por delegación que abre la
    ficha igual que hace la tira de recientes.
  - Se oculta si se está buscando o filtrando (misma condición `buscando` que `renderRecientes`) y
    si hay **menos de 2** nuevos.
  - Respeta el chip de mensajería gratis igual que `renderMasVendidos` (`Orden.filtrar(...,
    soloEnvioGratis)`).
  - Se llama donde ya se llama a `renderRecientes()` desde `renderGrid` (línea ~1024).
- **«Ver todo lo nuevo»:** pone `ordenSel = 'nuevo'`, sincroniza el `<select id="orden-sel">`, llama a
  `renderGrid()` y desplaza la vista al título del catálogo (`.grid-head`). Si `nuevo` no está en
  las opciones útiles, el botón se oculta.
- Todo con `addEventListener`. 🔴 **Prohibido `onclick=`**: el CSP lo bloquea solo en producción.
- Las cáscaras ya filtran por negocio antes (`Negocio.aplicar`), así que en `/electripower` y
  `/delmar` la fila enseña solo lo suyo sin código extra.

## 4. Cableado
- Las tres cáscaras cargan `<script src="novedades.js"></script>` junto a `orden.js`, antes de
  `app.js`.
- Añadir `novedades.js` a la lista de `test/paginas.test.js` si esa prueba enumera los scripts.
- `sw.js`: `/novedades.js` al ARMAZON y la caché de `v52` a `v53`.

## Verificación
- `node --test` desde `C:\inventario\tienda-3b`. La baseline es **354/354**; anota el total
  observado.
- `node --check` en `app.js`, `novedades.js` y `sw.js`.
- Mirarlo a 375 px y en escritorio, en claro y en oscuro, con un `catalogo.json` local donde 3 o 4
  productos tengan un `creado` reciente. Hay que ver:
  - el sello en la tarjeta, sin tapar el corazón de favorito;
  - la fila entre «Los más vendidos» y «Vistos hace poco»;
  - que al buscar desaparece;
  - que «Ver todo lo nuevo» ordena la parrilla.
- No hagas commit ni push: lo hace el piloto.
