# Compartir un producto en Facebook y WhatsApp, con su foto, su descripción y su enlace — Design Doc

**Fecha:** 2026-10-10 · **Piloto:** Opus 5 (pilot-mode) · **Repo:** `C:\inventario\tienda-3b` (rama `main`, árbol limpio al escribir esto)
**Sitio:** https://www.3bqba.com (Vercel — confirmado por la cabecera `Server: Vercel` de la respuesta real)

---

## 1. Qué pidió el dueño

> «Quiero, no sé si sea posible, que las personas desde la página puedan compartir en Facebook los
> productos que están en la página. Me gustaría que salieran con la descripción y la imagen y además
> el link de la página que te lleva a ese producto, y la idea fundamental es que el gestor comparta
> ese producto y ya salga con su link. Y lo mismo para cuando comparten por WhatsApp.»

Sí es posible. La parte de los botones es trivial; lo que tiene trabajo es que la **vista previa** de
Facebook y WhatsApp enseñe el producto y no la tarjeta genérica de la tienda.

## 2. Decisiones tomadas con el dueño (2026-10-10, no reabrir)

| Pregunta | Respuesta |
|---|---|
| ¿El enlace lleva el código del gestor? | **Sí, si quien comparte tiene uno activo.** Un cliente cualquiera comparte el enlace limpio |
| ¿Dónde va el botón? | **Solo en el modal de detalle.** Nada en la rejilla de 238 productos |
| ¿Cómo se consigue la vista previa por producto? | **Enfoque A: una función de solo lectura en Vercel.** Descartados: generar 238 HTML desde Stock+ (encarece cada publicación para siempre) y renunciar a la tarjeta (en Facebook no cumple lo pedido) |
| ¿Qué dice la tarjeta? | Título = nombre + «3B Store». Descripción = **precio (con el «antes» si está en oferta) y luego la descripción del catálogo**, cortada a 160 caracteres |
| Formato del precio | El de la web (`fmt` con `es-MX`): `38,750 CUP`, con coma |

Mockup aprobado por el dueño el 2026-10-10 (simulación con datos reales: gestora `5D9K9` / Yasnaya,
producto `U8DN` / Ventilador recargable, imagen real de Cloudinary a 1200×630).

## 3. Estado actual — medido, no supuesto

Medido el 2026-10-10 sobre `catalogo.json` (238 productos) y el código desplegado:

| Hecho | Consecuencia para este diseño |
|---|---|
| `index.html` trae etiquetas `og:` **fijas** (logo sobre negro + texto de la tienda) | Hoy **cualquier** enlace compartido enseña la misma tarjeta |
| Facebook y WhatsApp **no ejecutan JavaScript** | Un SPA no puede resolverlo en el cliente: el HTML tiene que salir ya distinto del servidor |
| No existe enlace por producto: `abrirDetalle(id)` abre un modal y la URL nunca cambia | Hay que inventar la ruta y abrir el modal al entrar por ella |
| `codigoDeLaUrl()` (`app.js:45`) toma **un solo segmento sin punto** como código de gestor (`/MARIA`) | La ruta del producto **necesita prefijo**: `/p/<codigo>` (dos segmentos) no colisiona |
| Los **238** productos tienen `codigo` único de **4 caracteres** y foto, **todos** en Cloudinary | El `codigo` sirve de identificador público. El comentario de `app.js:81` que habla de «2 productos que no están en Cloudinary» **está desfasado**; aun así el código no debe confiar en ello |
| `vercel.json` reescribe `/((?!.*\.).*)` → `/index.html` (comodín) | La regla nueva tiene que ir **antes** o el comodín se traga `/p/...` |
| CSP: `script-src 'self' 'unsafe-hashes' <2 hashes>` | Los hashes son de los `onerror="imgFallback(this)"` en línea. **Prohibido añadir manejadores en línea nuevos**: romperían la CSP. Los clics se enganchan desde `app.js` |
| CSP no restringe `window.open` ni `<a target="_blank">` | Los botones de compartir **no exigen tocar la CSP** y no hace falta el SDK de Facebook |
| El repo **no tiene `package.json`** | Las pruebas se corren con `node --test`, que no lo necesita |
| Vercel publica como endpoint **todo** archivo dentro de `api/` | El módulo puro va en `api/_og.js` (el guion bajo lo excluye) |

Comprobación de la imagen (hecha, no estimada): la URL
`.../image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_white/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg`
responde **200, image/jpeg, 55.703 bytes**. Las fotos del catálogo son casi cuadradas (medidas:
794×800, 712×639, 720×704), así que `c_pad,b_white` deja franjas blancas a los lados — **invisibles**,
porque las fotos ya tienen fondo blanco. Recortar (`c_fill`) cortaría producto; por eso se rellena.

## 4. Arquitectura

```
Robot de Facebook / WhatsApp          Persona
        |                                |
        v                                v
  GET /p/U8DN?ref=5D9K9  ──── rewrite (vercel.json) ───>  /api/producto?c=U8DN&ref=5D9K9
                                                                   |
                              lee catalogo.json  <─────────────────+
                              lee index.html     <─────────────────+
                                                                   |
                       devuelve index.html con el bloque og: del producto
                                                                   |
        +──────────────────────────────────────────────────────────+
        |                                |
  lee las etiquetas            carga app.js normal,
  y pinta la tarjeta           que abre el modal de U8DN
```

Cuatro piezas, cada una con un trabajo:

| Pieza | Archivo | Qué hace | De qué depende |
|---|---|---|---|
| Módulo puro de etiquetas | `api/_og.js` (nuevo) | Dado un producto y una URL, devuelve los textos de la tarjeta y el bloque HTML | De nada (función pura, con pruebas) |
| Función de ruta | `api/producto.js` (nuevo) | Resuelve el código, inyecta el bloque en `index.html` y responde | De `_og.js`, `catalogo.json`, `index.html` |
| Enlace profundo | `app.js` | Al cargar, si la ruta es `/p/<codigo>`, abre ese producto | De `CAT` ya cargado |
| Botones | `app.js` + `index.html` + `estilos.css` | Arman la URL y el texto y abren WhatsApp / Facebook / copian | De `CAT` y del gestor activo |

## 5. La ruta y la reescritura

Ruta pública: **`https://www.3bqba.com/p/<CODIGO>`** (ej. `/p/U8DN`), y con gestor
**`/p/U8DN?ref=5D9K9`**.

En `vercel.json`, **antes** del comodín actual:

```json
{ "source": "/p/:codigo", "destination": "/api/producto?c=:codigo" }
```

Se espera que Vercel conserve la query original y la fusione con la del destino, de modo que la
función reciba `c` y, si venía, `ref`. **Hay que comprobarlo en el despliegue real, no darlo por
hecho** (§10, punto 3). Si `ref` no llegara, el diseño no se cae: la función pone `og:url` sin
código y la atribución del gestor sigue funcionando igual, porque `codigoDeLaUrl()` (`app.js:45`)
lee `ref` de `location.search` en el navegador del cliente y lo guarda en `localStorage`.

En `_redirects` (gemelo de Cloudflare) va un **comentario** avisando de que esta pieza no tiene
equivalente allí: si algún día se migra a Cloudflare Pages, hay que rehacerla como Pages Function.

## 6. Contrato de la función `/api/producto`

**Entrada:** `c` (código), `ref` (opcional).
**Salida:** siempre **HTTP 200** con `Content-Type: text/html; charset=utf-8`. Nunca un error al
visitante; un código que no existe devuelve la tienda normal.

Pasos:

1. Saneado: `c` debe casar `^[A-Za-z0-9]{1,8}$` (se compara en mayúsculas). `ref` debe casar
   `^[A-Za-z0-9]{1,10}$`; si no, se ignora. Cualquier cosa que llegue al HTML va **escapada**
   (`&`, `<`, `>`, `"`), porque los nombres y descripciones del catálogo traen comillas, `&` y emojis.
2. Carga `catalogo.json` y busca `items.find(p => p.codigo.toUpperCase() === c)`.
3. Carga `index.html` y **sustituye todo lo que hay entre los marcadores**
   `<!-- og:inicio -->` y `<!-- og:fin -->` por el bloque del producto.
   - Si no encuentra el producto → devuelve `index.html` **tal cual**.
   - Si no encuentra los marcadores → devuelve `index.html` **tal cual** (fallo seguro: la tienda
     nunca se queda en blanco por un cambio en el HTML).
4. Cabecera `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400`.
   Publicar el catálogo crea un despliegue nuevo, que invalida la caché del borde: el precio no se
   queda viejo por esto.

**Marcadores en `index.html`:** se envuelve entre `<!-- og:inicio -->` y `<!-- og:fin -->` el bloque
que hoy va desde `<title>` hasta `<meta name="twitter:image">`, **incluyendo** `<title>`,
`<meta name="description">` y `<link rel="canonical">`. Se eligió un par de marcadores y no una
expresión regular sobre cada etiqueta porque es determinista y se rompe de forma visible.

**Cómo se lee `catalogo.json` e `index.html`:** en `vercel.json`,
`"functions": { "api/producto.js": { "includeFiles": "{index.html,catalogo.json}" } }`, y la función
los lee con `fs.readFileSync(path.join(process.cwd(), …))` una sola vez por arranque en frío.
*Plan B si en el despliegue real los archivos no viajan con la función* (hay que comprobarlo, no
darlo por hecho): pedirlos por HTTP al propio despliegue con `process.env.VERCEL_URL`. Se elige el
plan B solo si el A falla, y se deja escrito en el informe cuál quedó.

## 7. Qué dice la tarjeta (`api/_og.js`)

Función pura `ogDeProducto(producto, urlCanonica)` → `{ titulo, descripcion, imagen, url }`:

| Etiqueta | Valor | Ejemplo real (`U8DN`) |
|---|---|---|
| `<title>` y `og:title` | `<name> — 3B Store` | `Ventilador recargable — 3B Store` |
| `og:description` | precio + ` — ` + descripción, aplanada y cortada | `Oferta $50 USD · 38,750 CUP (antes $55) — • Giro(90° y 45°) • Mando a distancia • Función Power Bank • Luces • Modo nocturno • Temporizador • Batería de 20mil…` |
| `og:image` | la foto por Cloudinary a `f_jpg,q_auto,w_1200,h_630,c_pad,b_white` | 1200×630, ~55 KB |
| `og:url` y `canonical` | la URL compartida, **con `?ref=` si lo hay** | `https://www.3bqba.com/p/U8DN?ref=5D9K9` |
| `og:type` | `product` | |
| `twitter:*` | espejo de `og:title`, `og:description`, `og:image` | |

Reglas del texto, exactas:

- **Precio.** Si `moneda === 'usd'`: `$<precioUSD> USD · <fmt(precioCUP)> CUP`; si no, al revés
  (`<fmt(precioCUP)> CUP · $<precioUSD> USD`). `fmt` = `toLocaleString('es-MX', {maximumFractionDigits:0})`,
  el mismo de `app.js:29`. Si `enOferta`, delante va `Oferta ` y detrás ` (antes $<precioNormalUSD>)`
  —o el CUP normal si la moneda es CUP—.
- **Descripción.** `notes` con todos los blancos y saltos colapsados a un espacio. El conjunto
  «precio — descripción» se corta a **160 caracteres**, retrocediendo al último espacio, y se cierra
  con `…`. Sin `notes`, solo el precio.
- **Imagen.** Si la foto no es de Cloudinary (`/image/upload/` ausente), va tal cual. Si no hay foto,
  `https://www.3bqba.com/og-3b.jpg`.
- **`og:url` con `ref`.** Deliberado: Facebook trata `og:url` como la URL canónica y es por donde
  entra el clic. Si se pusiera la URL limpia, el gestor **perdería su comisión** en cada visita que
  venga de su propia publicación.

## 8. El enlace profundo en `app.js`

- Al final de `iniciar()`, después de `await cargarCatalogo()`, se llama a `abrirProductoDeLaUrl()`.
- `abrirProductoDeLaUrl()` lee `location.pathname`; si casa `^/p/([A-Za-z0-9]{1,8})/?$`, busca el
  producto por `codigo` (en mayúsculas) y llama a `abrirDetalle(p.id)`.
- Si el código no existe (producto retirado o agotado después de compartirse), **no** se abre nada:
  se enseña el aviso puntual que ya existe (`#aviso-ajuste`, la franja descartable de
  `index.html`) con el texto «Ese producto ya no está disponible. Mira el resto del catálogo.»
  El visitante se queda dentro de la tienda.
- `cerrarDetalle()` devuelve la URL a la raíz **conservando la query**:
  `history.replaceState(null, '', '/' + location.search)`. Se conserva porque el enlace del gestor
  tiene que seguir siendo copiable desde la barra del navegador; el código ya está además en
  `localStorage` desde `resolverVendedor()`.

## 9. Los botones

**Dónde:** dentro de `#modal-detalle`, en una fila nueva `#modal-compartir` justo debajo de
`#modal-accion`. Tres botones: **💬 WhatsApp · 📘 Facebook · 🔗 Copiar enlace**. Sin manejadores en
línea: se enganchan en `iniciar()`, una sola vez, y leen el producto abierto de `productoModal`.

**La URL que comparten los tres:** `location.origin + '/p/' + p.codigo`, más
`?ref=<codigo>` si `localStorage.ref` tiene un código que existe en `CAT.vendedores`. Se usa
`location.origin` y no el dominio fijo para que funcione igual en los despliegues de prueba.

**El texto sugerido** (una función nueva, `textoCompartir(p, url)`):

```
*Ventilador recargable*
Oferta $50 USD · 38,750 CUP (antes $55)
🛵 Mensajería gratis

https://www.3bqba.com/p/U8DN?ref=5D9K9
```

La línea de mensajería solo aparece si el producto trae `envio.corto`. El precio sale de una función
nueva `precioTexto(p)` — la versión en texto plano de `precioHtml`, que hoy devuelve HTML y no sirve
para esto.

| Botón | Qué hace |
|---|---|
| WhatsApp | `window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener')`. **Sin número**: WhatsApp pregunta a quién, y el gestor elige chat, grupo o estado |
| Facebook | Copia el texto al portapapeles y abre `https://www.facebook.com/sharer/sharer.php?u=<url codificada>`. Facebook **no permite rellenar** el texto de la publicación desde fuera (quitó el parámetro `quote`): por eso se copia, para que el gestor solo pegue |
| Copiar enlace | Copia **solo la URL** |

**Aviso de resultado:** una línea de texto dentro del propio modal, debajo de la fila
(«Texto copiado — pégalo en tu publicación» / «Enlace copiado» / «No se pudo copiar»), que se borra
a los 3 segundos. Dentro del modal y no en la franja de arriba, porque la franja queda tapada por el
modal abierto.

**Si el portapapeles falla** (`navigator.clipboard` ausente o permiso denegado): se avisa
«No se pudo copiar» y **la ventana de Facebook se abre igual**. Nunca se queda en silencio ni se
cancela el compartir.

## 10. Qué se verifica antes de dar esto por terminado

Nada se declara hecho sin haber **observado** la salida. En orden:

1. `node --test test/` en verde, con las pruebas de `api/_og.js`: producto normal, en oferta, en CUP,
   sin `notes`, con `notes` larguísima (corte en el último espacio), con comillas y `&` en el nombre
   (escapado), foto fuera de Cloudinary, sin foto, y `ref` presente/ausente en `og:url`.
2. Sitio desplegado: `curl -s https://www.3bqba.com/p/U8DN | findstr og:` enseña las etiquetas del
   **producto**. Es la prueba que importa: es literalmente lo que lee el robot.
3. `curl -s "https://www.3bqba.com/p/U8DN?ref=5D9K9" | findstr og:url` enseña el `ref` dentro de
   `og:url` (es la comprobación de que la query sobrevive a la reescritura, §5).
4. `curl -I https://www.3bqba.com/p/U8DN` conserva la CSP y las demás cabeceras de seguridad
   (hay que comprobar que el bloque `headers` de `vercel.json` también cubre la respuesta de la
   función; si no, la función las pone ella).
5. Depurador de Facebook (`developers.facebook.com/tools/debug`) sobre esa URL: tarjeta con la foto
   y el texto correctos, sin avisos.
6. Enviarse el enlace por WhatsApp a uno mismo y ver la miniatura.
7. **No regresión**: `/`, `/taxi`, un enlace de gestor `/5D9K9` y un enlace viejo `/?ref=5D9K9`
   siguen funcionando igual.
8. En el navegador: abrir `/p/U8DN` y ver que el modal sale solo; cerrarlo y comprobar que la URL
   vuelve a `/`; abrir `/p/ZZZZ` y ver el aviso de «ya no está disponible»; probar los tres botones.

## 11. Fuera de alcance (a propósito)

- Botones de compartir en la rejilla, en categorías o de la tienda entera.
- Indexar las 238 páginas en Google (`sitemap.xml` con las URLs de producto). Se puede añadir
  después: la función ya devuelve HTML real, así que el trabajo sería solo generar el sitemap.
- Limpiar las fotos del catálogo. Se detectó que muchas son capturas de la tienda de origen y traen
  flechas, «1/9» e iconos de interfaz: en la rejilla a 220 px no se notan, en la tarjeta de Facebook
  a tamaño grande **sí**. No lo causa este cambio, pero conviene saberlo.
- Cualquier cambio en Stock+. Este trabajo vive entero en el repo de la tienda.

## 12. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| **El sitio deja de ser 100 % estático.** Pasa a tener una función de solo lectura | Es el precio de que Facebook enseñe el producto; no hay forma de evitarlo sin generar 238 páginas. Gratis en el plan Hobby, y solo la tocan el robot y quien abre un enlace compartido |
| **Migrar a Cloudflare Pages** rompería esta pieza | Queda avisado en `_redirects` |
| **Facebook cachea la tarjeta** y un cambio de precio no se refleja en enlaces ya compartidos | No tiene arreglo por código; se fuerza con el depurador de Facebook. Es la razón por la que se evaluó sacar el precio de la tarjeta, y el dueño decidió dejarlo |
| `includeFiles` podría no incluir los archivos | Plan B documentado (§6) y verificación en el despliegue real |
| Añadir un manejador en línea rompería la CSP | Escrito aquí y ya advertido en `index.html` |

## 13. Archivos que toca la implementación

| Archivo | Cambio |
|---|---|
| `api/_og.js` | **nuevo** — módulo puro de etiquetas |
| `api/producto.js` | **nuevo** — la función de la ruta |
| `test/og.test.js` | **nuevo** — pruebas de `_og.js` (`node --test`) |
| `vercel.json` | regla `/p/:codigo` **antes** del comodín + `functions.includeFiles` |
| `_redirects` | comentario sobre la pieza que no tiene equivalente en Cloudflare |
| `index.html` | marcadores `og:inicio`/`og:fin` + la fila `#modal-compartir` en el modal |
| `estilos.css` | estilos de la fila y del aviso de copiado |
| `app.js` | `abrirProductoDeLaUrl()`, URL del gestor, `precioTexto()`, `textoCompartir()`, los tres clics y el `replaceState` al cerrar |
