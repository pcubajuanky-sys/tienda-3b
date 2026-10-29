# La línea del carrito, solo en USD

**Fecha:** 2026-10-29
**Pedido de Ruth:** «quiero q en el carrito no salga el precio en cup del producto, solo usd, y
entonces solo salga el total tal cual sale hoy»

**Qué se hace:** quitar el CUP pequeño que hoy va debajo del USD en **cada línea** del carrito.
**Qué NO se toca:** el bloque del total (las dos monedas, el «o», la mensajería en CUP y la línea
del cambio) se queda **exactamente como está hoy**. Tampoco se toca el mensaje de WhatsApp.

Es un cambio de resta. No hay aritmética nueva: `dinero.js` no se toca.

---

## Estado de partida (medido hoy)

- `app.js:1573`, dentro de `lineaCarritoHtml`, última cría de `.linea-precios`:
  `${hayTasa() ? `<div class="linea-cup">${fmt(p.precioCUP * qty)} CUP</div>` : ''}`
- `estilos.css:966`: `.linea .linea-cup{...}` — su **único** uso es esa línea.
- `hayTasa()` se usa además en las líneas **1270**, **1277** y **1957**: **sigue viva**, no la
  borres.
- `p.precioCUP * qty` se usa además en la **1957** (el mensaje de WhatsApp): **no se toca**.
- La función la usan los dos carritos (móvil y el panel de escritorio ≥1024 px, `app.js:1774`),
  así que con un solo cambio quedan los dos.
- Caché del service worker hoy: `tienda-3b-v29`.

---

## Task 1 — Quitar el CUP de la línea (`app.js`)

1. En `lineaCarritoHtml`, **borra la línea entera** del `hayTasa() ? ... linea-cup ...`. No dejes
   el `${...}` vacío ni un renglón en blanco: `.linea-precios` queda con el tachado (si hay
   rebaja) y el `.linea-sub`.
2. El comentario que está justo encima de `const ahorro = ...` dice hoy «El USD es la cifra grande
   de la línea y el CUP va debajo, pequeño, como equivalente». **Reescríbelo** para que diga la
   verdad nueva, en una o dos líneas: la línea enseña **solo USD** (decisión de Ruth del 29/10) y
   las dos monedas aparecen **solo en el total**; el «antes» tachado también va en USD y sale de la
   misma fuente que el desglose del total, para que la resta de la pantalla cuadre.
3. 🔴 **No toques** `const lin = window.Dinero.totales(...)`: `lin.usd` y `lin.usdNormal` siguen
   siendo lo que se pinta.
4. 🔴 **No toques nada más de `app.js`**: ni `totalBloqueHtml`, ni `totalesCarrito`, ni
   `actualizarBarraMovil`, ni `enviarPorWhatsApp` (la línea 1957 con su `(N CUP)` **se queda**).

**Verificación:** `grep -n "linea-cup" app.js` → **sin resultados**.
`grep -c "hayTasa()" app.js` → **4** (la definición + las tres que quedan).

## Task 2 — Quitar la regla CSS muerta (`estilos.css`)

Borra la regla `.linea .linea-cup{...}` de la línea 966. Es la única; nadie más la usa.
🔴 **No confundir con `.desglose-cup`** (del total) ni con `.linea-sub` / `.linea-antes`, que se
quedan.

**Verificación:** `grep -n "linea-cup" estilos.css` → sin resultados; `grep -c "desglose-cup"
estilos.css` → al menos 1.

## Task 3 — La barrera de `test/negocio.test.js`, al revés otra vez

El test `🔴 el CUP de cada LINEA del carrito sale del catalogo (precioCUP), no de multiplicar por
la tasa` **exige hoy** que la línea use `p.precioCUP * qty`. Ese test se va a poner **rojo** con el
Task 1, y eso es correcto: la invariante cambió. **No lo borres: cámbialo** por la nueva, que es
más fuerte.

Invariante nueva, sobre el cuerpo de `lineaCarritoHtml` (`cuerpoDe('lineaCarritoHtml')`):

1. **no aparece `precioCUP`** — la línea no enseña CUP de ninguna forma;
2. **no aparece `CUP`** como texto pintado;
3. sigue sin convertir por la tasa: la aserción `!/[*/]\s*(CAT\.)?tasa/.test(linea)` **se queda**;
4. sigue vigilando que **nadie sume `precioCUP` a mano** sobre todo `app.js`:
   `!/reduce\([^;]{0,160}precioCUP/.test(APP)` **se queda tal cual**.

Cambia el título del test para que diga lo que ahora vigila (algo como «la LINEA del carrito
enseña solo USD: ni precioCUP ni conversión por la tasa») y deja un comentario de una línea con la
fecha (**2026-10-29**) y el motivo: lo pidió Ruth, el equivalente en CUP vive solo en el total.

🔴 **Ojo con el alcance:** la aserción de `precioCUP` es **solo sobre el cuerpo de
`lineaCarritoHtml`**, nunca sobre todo `app.js` — el mensaje de WhatsApp (línea 1957) sigue usando
`p.precioCUP * qty` a propósito y un `assert` global lo tumbaría.

**No toques** los otros tres tests de ese bloque (el del total derivado, el del gestor y el de la
mensajería sin convertir).

## Task 4 — Subir la caché del service worker (`sw.js`)

`CACHE = 'tienda-3b-v29'` → **`'tienda-3b-v30'`**. Obligatorio: se tocó `app.js` y `estilos.css`,
y sin subirla quien tenga la tienda instalada sigue viendo el carrito viejo.

## Task 5 — Verificar y commitear

1. `node --test` **desde la raíz del repo** (🔴 **nunca** `node --test test/`: con Node 24 falla).
   Baseline de hoy: **258/258, exit 0**. Tiene que seguir en **258/258** (el test del Task 3 se
   cambia, no se añade ni se quita).
2. Comprueba que el HTML de la línea ya no lleva CUP **ejecutando el `app.js` real**, no leyéndolo:
   carga `descuento.js`, `dinero.js` y `app.js` en un sandbox de `node:vm` como hacen los tests del
   repo y llama a `lineaCarritoHtml(p, 2, '')` con un producto `{moneda:'usd', precioUSD:0.24,
   precioCUP:204, precioNormalUSD:0.5, precioNormalCUP:425, enOferta:true, name:'Peine', id:'x'}`
   y `CAT.tasa = 850`. **Pega el HTML que sale** en tu informe: tiene que llevar `$0.48` y
   `$1.00` tachado, y **ni un `CUP`**.
   Si cargar `app.js` entero en el sandbox no es viable (llama a `iniciar()` al final y toca
   `document`), dilo claramente y verifica con el mismo truco que usa `test/negocio.test.js`
   (`cuerpoDe`) **más** la `grep` del Task 1 — pero **no inventes** una salida que no obtuviste.
3. Commits con **pathspec explícito** (🔴 nunca `git add -A` ni `commit -am`, hay más sesiones en
   este árbol):
   - `git commit app.js estilos.css sw.js -m "..."` → la línea del carrito, solo en USD
   - `git commit test/negocio.test.js -m "..."` → la barrera, actualizada a la invariante nueva
   Mensajes en español, en una línea, y terminados con:
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
4. 🔴 **NO hagas push.** El push lo da el piloto.
5. 🔴 **No toques** `catalogo.json`, `precios-gestores.json` ni `sitemap.xml`: los publica Stock+ y
   jamás se commitean editados.

---

## Lo que queda sin verificar (y por qué)

**Nada se va a ver en un navegador:** hay **398 MB libres de 3.919** y 25 procesos de Chrome
abiertos; por debajo de ~600 MB abrir otro asfixia la máquina y **desconecta a Mía de WhatsApp**.
Queda sin mirar a 375 px cómo se ve la línea con una sola cifra y el tachado encima.
