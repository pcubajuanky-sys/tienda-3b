# Informe — «🔔 Avísame cuando vuelva» (tienda, Parte B) — 2026-11-07

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-11-07-avisame-cuando-vuelva.md`.
Sin commit ni push (los hace Ruth).

## Qué cambió
- `aviso.js` (nuevo, puro, `window.Aviso`): `mensaje`, `enlace`, `MARCA`, textos de botón. La marca
  `🔔 *AVÍSAME CUANDO VUELVA*` y la última línea `Ref: CODIGO[/M+ROJO]` son el CONTRATO con
  `lib/avisoVuelta.js` de Stock+ (mismo transporte `/` y `+` que `enviarPorWhatsApp`; un test lo vigila).
- `app.js`: `pintarPreguntarProducto` usa el aviso cuando la combinación está en espera;
  `abrirFichaPorCodigo` cae a `CAT.agotados` y abre `#agotado`; `pintarAgotadosBusqueda` en `renderGrid`.
- `index.html`, `electripower.html`, `delmar.html`: diálogo `#agotado`, contenedores
  `#agotados-grid` y `#agotados-vacio` y `<script src="aviso.js">` tras `preguntar.js` (idénticos).
- `estilos.css`: bloque `.agotado-*` / `.agotados-*` solo con tokens existentes (tema oscuro, botones ≥44 px).
- `sw.js`: `/aviso.js` en ARMAZON, caché `v43` → `v44`. `test/paginas.test.js`: `aviso.js` en MODULOS.
- `test/aviso.test.js`: 10 pruebas (marca, con/sin variante, emoji y paréntesis, enlace, contrato del Ref).

## Reglas
- El aviso va SIEMPRE a `CAT.whatsapp` (casa), nunca a `destinoWhatsApp()`.
- Enlace `/p/XXXX` de agotado: busca en `CAT.agotados` sin filtrar por negocio (`Negocio.aplicar` copia
  las claves de la raíz, así que la lista original se conserva; no hubo que tocar `negocio.js`).
- Búsqueda: filtra por negocio de la página, máx. 3, solo con texto buscado, y excluye códigos que ya
  están en `items`. Sin `agotados` en el JSON todo queda como hoy (ausente ≡ vacío).

## Evidencia observada
- `node --check` app.js, aviso.js, sw.js: OK.
- `node --test --test-concurrency=1`: 292 tests, 292 pass, 0 fail (baseline 282 + 10).

## ⚠ NO VERIFICADO
- Nada visto en navegador (RAM insuficiente): diálogo `#agotado`, filas de búsqueda, CSS a 375 px y tema oscuro.
- Envío real del WhatsApp y que Stock+ lo anote (depende de la Parte A desplegada y de un `catalogo.json` con `agotados`).
- Orden de publicación: reiniciar server y bot, «Publicar catálogo ahora», luego push de `tienda-3b`.

## Añadido: agotados al final de cada categoría (+ «Ver más»)
- `agotadosAPintar()` (app.js) decide qué se pinta bajo la parrilla; la dibuja `pintarAgotadosBusqueda()`
  (llamada desde `renderGrid`) en `#agotados-grid`, o en `#agotados-vacio` (dentro de `#vacio`) si la
  parrilla queda vacía. Con categoría elegida `#vacio` ya se muestra (filtroCat cuenta como filtro).
- Condición: sin favoritos ni filtro de precio; **búsqueda de texto → hasta 3 por nombre, sin «Ver más»**
  (manda sobre la categoría); si no, con `filtroCat` y sin ofertas/chip de envío gratis → los agotados de
  esa categoría (`Aviso.porCategoria`, pura, testeada). «Todo»/portada, ofertas, favoritos, precio y envío
  gratis: nada.
- Se muestran 12; si hay más sale «Ver más (N)» (N = los ocultos, ≥44 px, `data-agotados-mas`, delegado con
  addEventListener) que despliega TODOS. Estado: `agotadosVerTodos` (categoría desplegada); se resetea en
  `setCat`/`setOferta` y con una guarda en `agotadosAPintar` si `filtroCat` ya no coincide.
- Caché `sw.js` se queda en v44 (nada publicado). Sin precios en las filas.
- Tests: 294 totales, 294 pass, 0 fail (+2 de `porCategoria`). `node --check` OK. ⚠ NO VERIFICADO en navegador.

## Retoque visual de la franja de agotados (caché v45)
- Botón de las filas: discreto (contorno `var(--border)`, fondo transparente, texto `--text-2`, `--t-sm`,
  min-height 44 px). La tarjeta `#agotado` conserva `btn-wa`.
- Título: ahora `<h2 class="mv-titulo agotados-tit">` (mismo estilo que «Los más vendidos»), con línea
  superior y margen sobre la franja, y subtítulo «Toca 🔔 y te escribimos por WhatsApp cuando vuelvan.».
- Foto de fila atenuada (opacity .85, grayscale .35). `sw.js`: v44 → v45.
- Tests: 294/294, 0 fallos. ⚠ NO VERIFICADO en navegador (contraste y tema oscuro por tokens, sin ver).

## Ampliación: «Avísame» por talla o color (2026-11-07)

- `aviso.js`: `esAgotada(p, clave)`, `textoTalla(p, clave)` («Talla M, Color ROJO») y
  `textoBotonTalla` («🔔 Avísame cuando haya Talla M»). Tests `node:vm` en `test/aviso.test.js`.
- `app.js`: el selector de la ficha incluye `variantes.agotadas` como combinaciones posibles. Un
  valor cuyas combinaciones (con lo ya elegido) están todas agotadas sale como chip `.chip-agotada`
  (tachado, borde discontinuo, `aria-label="M, agotada"`) y **se puede elegir**; lo imposible sigue
  `disabled`. Al completar una combinación agotada (uno o dos ejes), `accionHtml` sustituye «Añadir»
  por el enlace `Aviso.enlace(CAT.whatsapp, p, clave)` (siempre el número de la casa); sin número,
  botón deshabilitado «Agotada». El botón «Preguntar» de la ficha se oculta en ese caso (no se
  duplica) y la frase del umbral de mensajería no se muestra.
- `estilos.css`: `.chip-agotada` y `.aviso-talla` (ancho completo, 44 px). `sw.js` caché `v48` → `v49`.
- ⚠ NO VERIFICADO en pantalla (RAM). Requiere que el catálogo publicado lleve `agotadas`.
