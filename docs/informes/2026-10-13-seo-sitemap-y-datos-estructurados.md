# SEO: sitemap de las fichas, datos estructurados y h1 (2026-10-13)

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-13-seo-sitemap-y-datos-estructurados.md` (Tasks 1 a 5).

## Qué cambió

**Stock+ (`inventario-stockmas`, rama `mensajeria-zonas`)**
- `lib/sitemapWeb.js` (nuevo): `construirSitemap(items, hoy)`, módulo puro.
- `tests/sitemapWeb.test.js` (nuevo): 6 pruebas.
- `lib/publicarWeb.js`: `publicarArchivoWeb` sube un `string` tal cual (antes siempre `JSON.stringify`).
- `tests/publicarWeb.test.js`: +1 prueba.
- `server.js`: `publicarAhora` publica `sitemap.xml` tras publicar el catálogo (solo si el catálogo salió bien; si el sitemap falla, solo se loguea).

**Tienda (`tienda-3b`, rama `main`)**
- `api/_og.js`: `jsonLdProducto(p, url)` y `bloqueOg(d, p, url)`.
- `api/producto.js`: pasa `p` y `url` a `bloqueOg` (una línea).
- `test/og.test.js`: +5 pruebas.
- `index.html`: JSON-LD `Store` fijo; `h1` con dos `span`.
- `estilos.css`: `.hero-eslogan` y `.hero-que-es`.
- `sw.js`: `CACHE` `tienda-3b-v2` -> `tienda-3b-v3`.
- `docs/informes/2026-10-13-seo-portada-375px.png`: captura.

## Desviaciones del plan (decididas mirando el código real)

1. **Importación de `publicarArchivoWeb` en `publicarWeb.test.js`:** el archivo ya la declara
   (`const { publicarArchivoWeb } = require(...)`, línea 66, a mitad de archivo). Ampliar la
   importación de arriba daba `SyntaxError: Identifier ... already declared`. No se tocó la importación.
2. **Firma de `bloqueOg`:** `ogDeProducto` devuelve `{titulo, descripcion, imagen, url}` sin el
   producto. Se usó la firma de reserva `bloqueOg(d, p, url)`; el JSON-LD solo se añade si llega `p`
   (la llamada vieja `bloqueOg(d)` no cambia). `api/producto.js` se ajustó. La última prueba del
   plan se escribió con `bloqueOg(ogDeProducto(p, url), p, url)` y se añadió una que fija que sin `p`
   no hay JSON-LD.
3. **`font-size` del `h1`:** la regla `.hero h1` fija `font-size` (y la de `@media (min-width:1024px)`
   otro, de 34px), pero **NO se movió a `.hero-eslogan`**: el mismo `h1` lleva `max-width:18ch`/`28ch`,
   y `ch` se mide con el `font-size` del propio `h1`; quitárselo lo reduciría a ~18 caracteres de 16px
   y aplastaría el eslogan. La línea nueva no hereda tamaño porque declara el suyo (16px), medido.
   Sí se añadió `line-height:1.25` a `.hero-que-es`: a 320px la línea baja a dos renglones y heredaba
   `line-height:1.02` (apretadísimo).
4. **No era uno de los tres puntos marcados:** la tercera prueba del JSON-LD del plan afirmaba
   `bloque.includes('</script') === false`, pero el bloque correcto TERMINA en `</script>`, así que
   era imposible de cumplir con el propio código del plan. Se cambió a "hay exactamente un `</script`
   (el de cierre)", que conserva la intención (el contenido no cierra la etiqueta antes de tiempo).
   Habría que haber parado según las reglas; se decidió continuar por ser una aserción contradictoria
   y se deja señalado para revisión.
5. **EOL:** los archivos de la tienda están en CRLF (respetado); los de Stock+ están en **LF**
   (medido), no CRLF, y se respetó LF.

## Pruebas (observadas)

| | antes | después |
|---|---|---|
| Stock+ `npm test` | 1515 pass, 0 fail | **1522 pass, 0 fail**, exit 0 |
| Tienda `node --test` | 56 pass, 0 fail | **61 pass, 0 fail**, exit 0 |

## Navegador (Task 5, Step 2)

Chrome del sistema + `puppeteer-core` desde el scratchpad. Se usó un servidor estático propio que
aplica las cabeceras de `vercel.json` (la CSP vive en `vercel.json`/`_headers`, no en un `<meta>`;
con `npx serve` no existiría CSP) y reproduce `/p/:codigo` con `api/producto.js`. 375px, claro y oscuro.

1. Portada: el eslogan sigue siendo lo mayor (28px/800 a 375px; 46px a 768; 34px a 1280); la línea nueva
   va debajo a 16px/600. Sin desborde horizontal a 320, 375, 768 y 1280.
2. **CSP: cero avisos.** Ni en la consola ni en el evento `securitypolicyviolation`, en portada y en
   ficha, en claro y en oscuro. **Control positivo:** un `<script>` inline normal inyectado SÍ fue
   bloqueado y registrado (`script-src-elem | inline`), mientras que un `ld+json` inyectado no
   generó violación. O sea, el detector funciona y el bloque de datos no está sujeto a `script-src`.
3. `document.querySelectorAll('script[type="application/ld+json"]').length` = **1** en la portada
   (`Store`) y 2 en una ficha (`Product` + `Store`), todos JSON válido.
4. Captura: `docs/informes/2026-10-13-seo-portada-375px.png` (claro).

## ⚠ NO VERIFICADO

- ⚠ El sitemap real en GitHub/`www.3bqba.com/sitemap.xml`: no se arrancó `server.js` ni se publicó.
  Hasta que Ruth reinicie `server.js` y pulse «Publicar catálogo ahora», el `sitemap.xml` del repo
  sigue con 2 URL.
- ⚠ `publicarAhora` con el cableado nuevo: solo `node --check` y las pruebas del módulo; no se ejecutó.
- ⚠ La CSP se probó con el `vercel.json` aplicado por un servidor local, no en Vercel.
- ⚠ Rich Results de Google no se ha probado (hace falta la URL desplegada).
- ⚠ `offers.url` del JSON-LD hereda el `?ref=` cuando la ficha se pide con él (igual que el canonical
  existente); no se tocó.
- Sin `git push` en ninguno de los dos repos.
