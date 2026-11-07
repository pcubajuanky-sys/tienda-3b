# Buscar y favoritos — plan (2026-11-06)

Segunda tanda de la crítica de impeccable, pedida por Ruth. Cuatro mejoras para que encontrar
y volver a un producto sea fácil, como en las tiendas grandes. **Todo en `C:\inventario\tienda-3b`**
(repo aparte, despliega en Vercel al hacer push a `main`). Sin servidor y sin red nueva: todo vive
en el navegador del cliente.

## Reglas que no se negocian (léelas antes de tocar nada)

1. **CSP estricta:** ningún `onclick=`/`onchange=` en línea en HTML ni en strings de JS. Todo con
   `addEventListener` (delegado si el contenido se repinta).
2. **WhatsApp siempre `https://api.whatsapp.com/send?phone=…&text=…`**, nunca `wa.me` (rompe los
   emojis). El número sale de `destinoWhatsApp()` (`app.js:99`), el mismo del pedido.
3. **`localStorage` lanza** en incógnito o con los datos bloqueados: TODA lectura y escritura va en
   `try/catch` y la página funciona igual sin él (patrón de `cargarDirecciones`, `app.js:~1693`).
4. **Claves por negocio**, como el carrito: `const CLAVE_FAV = NEGOCIO === CASA ? 'favoritos' :
   'favoritos-' + NEGOCIO;` y lo mismo para `recientes`. (`CASA` = `window.Negocio ? window.Negocio.CASA : '3b'`.)
5. **Un producto no puede pintarse dos veces con `tarjetaHtml`** en la misma pantalla: duplicaría el
   id `acc-<id>` y `refrescarAcciones` dejaría de actualizar una copia sin avisar. Para «vistos
   recientemente» usa el marcado compacto `rel-card` (como `completarEnvioHtml`, `app.js:~1806`),
   que no lleva botones de cantidad.
6. **Fotos ligeras** (los clientes navegan con muy mala conexión): miniaturas con `fotoMosaico()`
   (Cloudinary `w_120`). Las sugerencias del buscador van **sin foto**, solo texto y precio.
7. **Tres cáscaras cargan el mismo `app.js`**: `index.html`, `electripower.html`, `delmar.html`.
   Cada `<script src>` nuevo va en las TRES, en `MODULOS` de `test/paginas.test.js` y en la lista
   de precacheo de `sw.js` (los tres sitios, o falla). Los elementos HTML nuevos van también en las
   tres; aun así, el código comprueba `if (!el) return` antes de usarlos.
8. Sube la caché de `sw.js`: `'tienda-3b-v42'` → `'tienda-3b-v43'`.
9. Los textos en español de Cuba, cortos.

## Módulos puros nuevos (IIFE con `window.X`, patrón de `orden.js`, cada uno con su test)

### `buscar.js` → `window.Buscar`
- `normaliza(s)`: misma regla que `normaliza` de `app.js:56` (cópiala; minúsculas, sin acentos).
- `sugerencias(items, q, max = 6)`: con `q` normalizado de **2 caracteres o más**, devuelve hasta
  `max` productos cuyo nombre contiene `q`. Primero los que **empiezan** por `q` y luego el resto,
  conservando dentro de cada grupo el orden de llegada. Con `q` corto devuelve `[]`.
- `anotarReciente(lista, id, max = 10)`: un array NUEVO con `id` delante, sin duplicados y recortado
  a `max`.
- `cargarLista(raw)`: `JSON.parse` seguro → un array de strings (sin nulos ni duplicados). Cualquier
  otra cosa (null, basura, un objeto) devuelve `[]`.

### `favoritos.js` → `window.Favoritos`
- `alternar(lista, id)`: un array NUEVO. Si `id` estaba, lo quita; si no, lo añade al final.
- `vigentes(lista, items)`: solo los ids que siguen en el catálogo, en el orden de `lista`.
- `mensaje(productos, fmt)`: el texto para WhatsApp:
  ```
  Hola 👋 Me interesan estos productos de la tienda:
  • Nombre A — 1,500 CUP
  • Nombre B — 3,900 CUP
  ¿Están disponibles?
  ```
  `fmt` es la función de formato de `app.js` (se inyecta para no duplicarla). Con lista vacía, `''`.

### Precio en `orden.js` (ampliar, no módulo nuevo)
- `RANGOS = [{id:'h1000', texto:'Hasta 1,000 CUP', min:0, max:1000}, {id:'1000-3000', texto:'1,000 – 3,000 CUP', min:1000, max:3000}, {id:'3000-10000', texto:'3,000 – 10,000 CUP', min:3000, max:10000}, {id:'m10000', texto:'Más de 10,000 CUP', min:10000, max:Infinity}]`.
  Un producto entra si `min <= precioCUP < max` (para el primero, `precioCUP < 1000`).
- `filtrarPrecio(items, rangoId)`: array NUEVO; un id vacío o desconocido devuelve todos.
- `rangosUtiles(items)`: solo los rangos que tienen al menos un producto. **Si quedan menos de 2, devuelve `[]`**
  (un filtro que no separa nada no se enseña).
- Exportar las tres en `window.Orden` sin romper lo que ya exporta.

## Cambios en `app.js` (cableado)

### Estado nuevo (junto a `let busqueda = ''`, ~línea 30)
`let soloFavoritos = false; let rangoPrecio = ''; let favoritos = cargarFav(); let recientes = cargarRecientes();`
con `cargarFav/guardarFav/cargarRecientes/guardarRecientes` en `try/catch` (regla 3).

### Filtro
- `visibles()` (`app.js:~184`): además de lo que ya hace, si `soloFavoritos` deja solo los ids de
  `favoritos`; y aplica `window.Orden.filtrarPrecio(…, rangoPrecio)`.
- Las DOS variables `buscando` (en `renderGrid` y `renderMasVendidos`) pasan a contar también
  `soloFavoritos || rangoPrecio !== ''` (sin carrusel ni reclamo de gestores con un filtro puesto).
- El botón «Ver todo el catálogo» (`btn-ver-todo`, ~línea 2393) pone también `soloFavoritos=false;
  rangoPrecio='';` y deja el select de precio en vacío y el chip de favoritos sin pulsar.
- Mensaje de vacío: si `soloFavoritos` y no hay ninguno, el texto de `#vacio p` dice «Todavía no
  tienes favoritos. Toca el ♡ de un producto para guardarlo.» (y se restaura el texto de siempre al
  quitar el filtro). Guarda el original en una constante.

### 1. Sugerencias al escribir
- HTML: justo después del `<input id="buscador">` (en las tres cáscaras):
  `<div id="sugerencias" class="sugerencias" role="listbox" aria-label="Sugerencias" hidden></div>`
  y en el input `aria-controls="sugerencias" aria-autocomplete="list"`. El contenedor
  `.header-buscador` necesita `position:relative`.
- Al teclear (en el mismo `input` con debounce que ya existe, `app.js:~2333`), pinta
  `window.Buscar.sugerencias(CAT.items, valor)` como botones
  `<button type="button" class="sug" role="option" data-sug="ID"><span class="sug-nom">Nombre</span><span class="sug-precio">1,500 CUP</span></button>`
  (resaltando en `<b>` la parte que coincide, con `escapeHtml` antes de resaltar), más un último botón
  `<button type="button" class="sug sug-todos" data-sug-todos="1">Ver todos los resultados de «q»</button>`.
  Sin sugerencias → contenedor oculto.
- Tocar una sugerencia: oculta la lista, quita el foco del input y llama `abrirDetalle(id)`.
  «Ver todos»: oculta la lista, quita el foco y baja a `#catalogo` (`scrollIntoView`). Usa
  `pointerdown` con `preventDefault()` en el contenedor para que el `blur` del input no la cierre
  antes del clic, y el clic real con `click` delegado.
- Se cierra con `Escape` (en el input), al perder el foco (con un `setTimeout` de ~150 ms) y al
  vaciar el input. Flechas ↑/↓ mueven una clase `.activa` entre los botones y `Enter` abre la activa
  (si no hay activa, `Enter` no cambia nada de lo de siempre).
- El filtrado de la parrilla **sigue igual**: las sugerencias son un atajo encima, no lo sustituyen.

### 2. Vistos recientemente
- En `mostrarDetalle(id)` (`app.js:~895`): `recientes = Buscar.anotarReciente(recientes, id); guardarRecientes(); renderRecientes();`
- HTML (en las tres cáscaras), justo después de `</section>` de `#mas-vendidos`:
  ```html
  <section id="recientes" class="recientes" hidden aria-labelledby="recientes-titulo">
    <h2 id="recientes-titulo" class="mv-titulo">Vistos hace poco</h2>
    <div class="completar-tira" id="recientes-tira"></div>
  </section>
  ```
- `renderRecientes()`: toma los ids de `recientes` que sigan en el catálogo (`productoDe`), máximo 10,
  y los pinta con el marcado `rel-card` (botón `data-reciente="ID"`, foto `fotoMosaico`, nombre,
  precio). Se esconde si no hay ninguno o si `buscando` (mismo criterio que el carrusel). Llámala
  desde el final de `renderGrid()`.
- Click delegado en `#recientes-tira`: `abrirDetalle(btn.dataset.reciente)`.

### 3. Favoritos ♡
- En `tarjetaHtml` (`app.js:511`), dentro de `.card-foto`, después del `<img>`:
  `<button type="button" class="card-fav" data-fav="${p.id}" aria-pressed="${esFav}" aria-label="${esFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">${esFav ? '♥' : '♡'}</button>`.
- `alPulsarEnTarjetas` (~línea 2420) debe ignorar los clics dentro de `.card-fav` igual que ignora
  `.card-accion`. Y añade un listener delegado (en `#grid` y en `#mv-tira`) que, al pulsar `.card-fav`,
  llama `alternarFav(id)`.
- `alternarFav(id)`: `favoritos = Favoritos.alternar(favoritos, id); guardarFav();` actualiza **todos**
  los `[data-fav="id"]` de la página (`aria-pressed`, `aria-label`, ♥/♡) sin repintar la parrilla,
  repinta el chip de favoritos y, si `soloFavoritos` está activo, sí llama `renderGrid()` (para que el
  quitado desaparezca). Una pequeña animación de latido al marcar (`.card-fav.late`, quitada en
  `animationend`), respetando `prefers-reduced-motion`.
- En la ficha (modal de producto): un botón `#ficha-fav` con el mismo comportamiento y el texto
  «♡ Guardar» / «♥ Guardado». Búscalo en `index.html` junto a los botones de compartir
  (`#compartir-wa`) y ponlo delante de ellos (en las tres cáscaras). Se repinta en `mostrarDetalle`.
- Chip en `#controles`, tras `#btn-envio-gratis`:
  `<button id="btn-favoritos" class="chip-filtro" type="button" aria-pressed="false" hidden>♥ Favoritos (<span id="fav-n">0</span>)</button>`.
  Visible si hay al menos un favorito vigente **o** si `soloFavoritos` está activo. Alterna
  `soloFavoritos` y repinta. 🔴 `renderControles()` esconde `#controles` entero con
  `cont.hidden = ops.length < 2 && !hayEnvio`: añade a esa condición el chip de favoritos y el select
  de precio, o los controles nuevos quedarán invisibles. Haz un `renderChipFav()` que también
  recalcule ese `hidden`.
- Con `soloFavoritos` activo y al menos un favorito, debajo de la cabecera del catálogo sale
  `<div id="fav-enviar" class="fav-enviar" hidden><a class="btn btn-wa" target="_blank" rel="noopener">Enviar mi lista por WhatsApp</a></div>`
  (en las tres cáscaras, justo antes de `#skeleton`). El `href` = `api.whatsapp.com/send?phone=` +
  `destinoWhatsApp()` + `&text=` + `encodeURIComponent(Favoritos.mensaje(productos, fmt))`. Sin
  número de destino, oculto.

### 4. Filtro por precio
- HTML en `#controles`, tras `#orden-sel`:
  `<label class="sr-only" for="precio-sel">Filtrar por precio</label><select id="precio-sel" class="orden-sel" hidden></select>`.
- `renderControles()` lo puebla con `<option value="">Cualquier precio</option>` + `Orden.rangosUtiles(CAT.items)`;
  oculto si la lista útil está vacía (y entonces `rangoPrecio = ''`). Al cambiar: `rangoPrecio = value; renderGrid();`.

## CSS (`estilos.css`, al final, en un bloque `/* ══ Buscar y favoritos (2026-11-06) ══ */`)
Usa SOLO los tokens existentes (`--surface`, `--text`, `--text-2`, `--border`, `--acento`,
`--radio-*`, `--sombra-2`, `--e1…`, `--t-sm`, `--dur`, `--ease`). Nada de colores sueltos.
- `.sugerencias`: absoluta bajo el buscador, ancho del input, fondo `--surface`, borde, radio,
  `--sombra-2`, `max-height:60vh; overflow:auto`, `z-index` por encima de la barra fija. Ojo: el
  buscador vive dentro de la cabecera NEGRA, que redefine los tokens; la lista debe verse clara
  (fija `color`/`background` con valores de la página, p. ej. `background:#FFF;color:#111114` en claro
  y los del modo oscuro en `@media (prefers-color-scheme: dark)`, o sácalos de variables de `:root`
  que no redefina la cabecera).
- `.sug`: fila de 44 px mínimo, nombre a la izquierda (`text-overflow:ellipsis`), precio a la
  derecha en `--text-2`; `.sug.activa, .sug:hover` con fondo suave; `.sug b` en peso 700.
- `.card-fav`: círculo de 36 px (área táctil ≥ 44 px con un `::before` invisible), arriba a la
  DERECHA de `.card-foto` (los sellos ya ocupan la izquierda), fondo blanco al 90 %, sombra suave,
  corazón en `--acento` cuando `aria-pressed="true"`. `.card-foto` ya debería ser `position:relative`; compruébalo.
- `#btn-favoritos[aria-pressed="true"]` igual que el chip de mensajería activo.
- `.fav-enviar`: margen inferior, botón a todo lo ancho en móvil.
- `.recientes`: mismo margen que `.mv`.

## Tests (crear y correr)
- `test/buscar.test.js`: sugerencias (empieza-por primero, mínimo 2 letras, sin acentos, tope `max`),
  `anotarReciente` (delante, sin duplicar, tope), `cargarLista` (basura → `[]`).
- `test/favoritos.test.js`: alternar (añade/quita, no muta), vigentes (descarta borrados), mensaje
  (formato exacto, lista vacía → `''`).
- `test/orden.test.js`: añadir `filtrarPrecio` (bordes 1000/3000/10000, id vacío) y `rangosUtiles`
  (menos de 2 → `[]`).
- Añadir `buscar.js` y `favoritos.js` a `MODULOS` de `test/paginas.test.js`.
- Verificación: `node --test --test-concurrency=1` desde `C:\inventario\tienda-3b` → todo verde
  (baseline 265/265). `node --check app.js buscar.js favoritos.js orden.js sw.js` sin salida.

## Fuera de alcance
No tocar el carrito, el pedido, Stock+, ni el `catalogo.json`. No hacer commit ni push (lo hace el piloto tras revisar).
