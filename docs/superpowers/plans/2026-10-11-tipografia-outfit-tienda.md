# Tipografía propia (Outfit) en toda la tienda 3B — Plan de implementación

> **Para quien ejecute:** usa `superpowers:subagent-driven-development` o
> `superpowers:executing-plans`. Los pasos llevan casilla (`- [ ]`) para ir marcándolos.
> **No te saltes ningún paso de verificación**: aquí casi nada es testeable con `node --test`,
> así que la evidencia es lo que se ve en el navegador. Lo que no mires con tus ojos, se marca
> literalmente "⚠ NO VERIFICADO".

**Objetivo:** que `www.3bqba.com` deje de usar la letra de fábrica del teléfono y pase a la fuente
**Outfit**, hospedada dentro del propio repo, y que el bloque de categorías adopte el tratamiento
elegido por el dueño (variante 2): nombre más grande en Outfit y el emoji convertido en insignia
sobre el círculo.

**Arquitectura:** un único archivo `.woff2` variable (pesos 400-800 en un solo archivo) vive en
`fuentes/`, se declara con `@font-face` al principio de `estilos.css` y entra al sitio por un token
nuevo, `--fuente`, que usa el `body`. Como `index.html` y `taxi.html` cargan los dos `estilos.css` y
ningún otro archivo declara `font-family`, cambiar el `body` cambia la tienda entera y la página del
taxi de una vez. El bloque de categorías necesita además mover el emoji en el HTML que genera
`app.js`.

**Stack:** HTML + CSS + JavaScript sin framework ni build. Repo `C:\inventario\tienda-3b`, rama
`main`, despliegue en Vercel al hacer `git push`.

---

## Contexto que hace falta antes de tocar nada

Léelo entero. Son cuatro cosas que, si no las sabes, te hacen perder la tarde.

**1. La tienda bloquea todo lo externo.** `vercel.json` y `_headers` llevan una CSP con
`default-src 'self'`, y no hay directiva `font-src`, así que las fuentes heredan `'self'`:
**cualquier intento de cargar la fuente desde `fonts.googleapis.com` o `fonts.gstatic.com` lo
bloquea el navegador en silencio** y el sitio se queda con la letra del sistema sin avisar de nada.
Por eso la fuente viaja dentro del repo. **No toques la CSP**: con el archivo servido desde el
propio dominio no hace falta, y abrirla sería un cambio de seguridad que nadie ha pedido.

**2. `catalogo.json` lo pisa Stock+, lo demás no.** `lib/publicarWeb.js` de Stock+ solo escribe
`catalogo.json` por la API de GitHub (ruta fija en la línea 14). `estilos.css`, `app.js` y los HTML
solo cambian con `git push` desde aquí. No hay riesgo de que el panel te borre el trabajo.

**3. El logo no es texto de interfaz.** `.logo-mono` y `.logo-word` (`estilos.css:190-199`) declaran
su propia pila de sistema **a propósito**: son las letras "3B" y "STORE" del escudo SVG, con el
contraste ya verificado y el `letter-spacing` calibrado a mano. **Déjalos exactamente como están.**
Al tener `font-family` propio, cambiar el `body` no les afecta.

**4. El emoji nunca cambia de forma.** Lo dibuja la fuente de emoji del teléfono del cliente, no
Outfit. Lo único que se decide aquí es dónde se coloca y de qué tamaño.

**Qué NO entra en este plan** (si se te ocurre, para y pregunta): tocar la CSP, cambiar los colores,
mover la retícula de categorías, cambiar el tamaño de los círculos, ni rediseñar ninguna otra
sección. Solo la letra y, dentro del bloque de categorías, la posición del emoji.

---

## Archivos

- **Crear:** `fuentes/outfit-latin-v15.woff2` — el archivo de la fuente (31.292-32.292 bytes).
- **Modificar:** `estilos.css` — `@font-face`, token `--fuente`, `body`, y el bloque de categorías.
- **Modificar:** `app.js` — `renderCategorias3D()`, para sacar el emoji del nombre.
- **Modificar:** `index.html` y `taxi.html` — una línea de precarga en cada `<head>`.
- **Crear (fuera del repo):** un servidor estático de usar y tirar en el scratchpad, para mirar.
- **Crear:** `docs/informes/2026-10-11-tipografia-outfit.md` — el informe de relevo, al final.

---

## Tarea 1: Traer la fuente al repo

**Archivos:**
- Crear: `C:\inventario\tienda-3b\fuentes\outfit-latin-v15.woff2`

La fuente es **Outfit**, de Smartsheet Inc., licencia **SIL Open Font License 1.1**: se puede
hospedar y redistribuir dentro de un sitio web sin pagar ni pedir permiso. El archivo es el subset
**latin** de la versión **v15** en formato variable (un solo archivo cubre los pesos 400 a 800).

Ya está comprobado que el subset `latin` basta: se recorrieron los 242 productos y las 25
categorías de `catalogo.json` y **no hay ni un carácter fuera de ese rango** (sin contar emojis).
No descargues también `latin-ext`: serían 14.808 bytes de más para cero texto.

- [x] **Paso 1: Crear la carpeta**

```bash
mkdir -p "C:/inventario/tienda-3b/fuentes"
```

- [x] **Paso 2: Descargar el archivo**

```bash
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -o "C:/inventario/tienda-3b/fuentes/outfit-latin-v15.woff2" "https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtq.woff2"
```

- [x] **Paso 3: Comprobar que bajó un woff2 de verdad y no una página de error**

```bash
cd "C:/inventario/tienda-3b" && ls -l fuentes/outfit-latin-v15.woff2 && head -c 4 fuentes/outfit-latin-v15.woff2 | xxd
```

Esperado: tamaño **32292 bytes** (acepta cualquier cosa entre 31.000 y 33.000 — Google puede
reempaquetar), y los cuatro primeros bytes `77 4f 46 32`, que en texto es `wOF2`. **Si ves `3c 21`
(`<!`) has bajado un HTML de error: para y dilo, no sigas.**

- [x] **Paso 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add fuentes/outfit-latin-v15.woff2 && git commit -m "web: la fuente Outfit entra al repo (OFL 1.1, subset latin)"
```

---

## Tarea 2: Declarar la fuente y enchufarla al sitio

**Archivos:**
- Modificar: `C:\inventario\tienda-3b\estilos.css` (línea 1, el bloque `:root`, y la línea 92)

- [x] **Paso 1: Poner el `@font-face` al principio del archivo**

Abre `estilos.css`. La línea 1 de hoy es:

```css
/* estilos.css — tienda 3B. Tokens de marca, tipografía de sistema, sin dependencias externas. */
```

Sustitúyela por esto (el comentario cambia porque ya no es "tipografía de sistema", pero el
"sin dependencias externas" sigue siendo verdad: la fuente la servimos nosotros):

```css
/* estilos.css — tienda 3B. Tokens de marca, tipografía propia hospedada aquí, sin dependencias externas. */

/*
  Outfit (Smartsheet Inc., SIL Open Font License 1.1), subset latin, variable:
  un solo archivo cubre del peso 400 al 800.

  La fuente vive en nuestro propio dominio A PROPOSITO. La CSP del sitio lleva
  `default-src 'self'` y no declara `font-src`, asi que las fuentes heredan 'self':
  si algun dia alguien la cambia por un <link> a fonts.googleapis.com, el navegador
  la bloquea EN SILENCIO y la tienda se queda con la letra del sistema sin dar ni un
  error visible. Si hay que diagnosticar eso, la pista esta en la consola, pestaña
  Network, como un bloqueo de CSP.

  font-display:swap => mientras baja el archivo, el texto se ve con la letra del
  sistema y salta a Outfit al llegar. Nadie ve un hueco en blanco, ni con mala
  conexion.

  El unicode-range es el que publica Google para su subset latin: si pides un
  caracter fuera de el, el navegador ni se molesta en bajar el archivo y usa el
  siguiente de la pila. Verificado el 2026-10-11 sobre los 242 productos y las 25
  categorias del catalogo: no hay ni un caracter fuera de ese rango.
*/
@font-face{
  font-family:'Outfit';
  font-style:normal;
  font-weight:400 800;
  font-display:swap;
  src:url('/fuentes/outfit-latin-v15.woff2') format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
```

La ruta va **absoluta** (`/fuentes/...`) a propósito: así sigue resolviendo bien cuando la página se
sirve desde `/p/<CODIGO>`, que tiene dos segmentos.

- [x] **Paso 2: Añadir el token de fuente al `:root`**

En el bloque `:root`, justo **debajo** de la línea que cierra la escala tipográfica
(`--t-3xl:clamp(28px,6vw,46px);`), añade:

```css

  /* La pila de respaldo es la misma de siempre: si Outfit no llega (bloqueo, red
     caida, archivo borrado), el sitio se ve exactamente como se veia antes. */
  --fuente:'Outfit', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

- [x] **Paso 3: Que el `body` use el token**

Busca el `body{` (hoy en la línea 92 está su `font-family`). Sustituye esta línea:

```css
  font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

por:

```css
  font-family:var(--fuente);
```

**Ojo: hay tres líneas idénticas a esa en el archivo.** Cambia **solo la del `body`**. Las otras dos
son `.logo-mono` y `.logo-word` (sobre la línea 190), que son las letras del escudo "3B STORE" y
**se quedan como están**. Si tu editor hace "reemplazar todo", lo rompes.

- [x] **Paso 4: Comprobar que solo cambió lo que debía**

```bash
cd "C:/inventario/tienda-3b" && grep -n "font-family" estilos.css
```

Esperado: `font-family:var(--fuente)` aparece **una sola vez**; las dos pilas largas siguen ahí, en
`.logo-mono` y `.logo-word`; el resto son `font-family:inherit`, que no se tocan.

- [x] **Paso 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add estilos.css && git commit -m "web: la tienda escribe en Outfit"
```

---

## Tarea 3: Precargar la fuente en las dos páginas

Sin esto el navegador descubre la fuente tarde (primero baja el CSS, luego la pide) y el salto de
letra se ve más. Una línea en cada `<head>` lo adelanta.

**Archivos:**
- Modificar: `C:\inventario\tienda-3b\index.html`
- Modificar: `C:\inventario\tienda-3b\taxi.html`

- [x] **Paso 1: `index.html`**

Busca esta línea (está al final del `<head>`, después del comentario `<!-- og:fin -->`):

```html
<link rel="stylesheet" href="estilos.css">
```

Pon **justo encima**:

```html
<!-- La fuente, pedida ya: sin esto el navegador no se entera de que existe hasta
     que termina de leer estilos.css. El atributo crossorigin es OBLIGATORIO en las
     fuentes aunque sean del mismo dominio; sin el, el navegador baja el archivo DOS
     veces y la precarga no sirve de nada. -->
<link rel="preload" href="/fuentes/outfit-latin-v15.woff2" as="font" type="font/woff2" crossorigin>
```

**No metas nada entre los marcadores `<!-- og:inicio -->` y `<!-- og:fin -->`**: eso lo sustituye
entero `api/producto.js` cuando alguien abre `/p/<CODIGO>`, y lo que pongas ahí desaparece.

- [x] **Paso 2: `taxi.html`**

Mismo cambio. Ahí la línea está en `taxi.html:28`, seguida de `taxi.css` en la 29. La precarga va
encima de las dos, con el mismo comentario.

- [x] **Paso 3: Comprobar**

```bash
cd "C:/inventario/tienda-3b" && grep -n "preload" index.html taxi.html
```

Esperado: una línea en cada archivo.

- [x] **Paso 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add index.html taxi.html && git commit -m "web: la fuente se pide al abrir la pagina, no al terminar el CSS"
```

---

## Tarea 4: El nombre de la categoría, con su nueva medida

Esta es la mitad visible del encargo. Hoy el nombre es de 11px y pide tres renglones; con Outfit a
12,5px y peso 600 se lee de un golpe.

**Archivos:**
- Modificar: `C:\inventario\tienda-3b\estilos.css` (reglas `.cat3d-nombre` y `.cat3d-n`, sobre la
  línea 408)

- [x] **Paso 1: Cambiar las dos reglas**

Busca este bloque:

```css
.cat3d-nombre{
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
  text-overflow:ellipsis;font-size:11px;font-weight:700;line-height:1.3;color:var(--text);
  min-height:29px;
}
.cat3d-emoji{margin-right:2px}
.cat3d-n{
  display:block;margin-top:2px;font-size:10px;color:var(--text-3);font-weight:600;
  overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
}
```

Sustitúyelo por (la regla `.cat3d-emoji` la rehace la Tarea 5; aquí se queda igual de momento):

```css
/* 2026-10-11: Outfit a 12,5px en vez de la letra del sistema a 11px. El peso baja
   de 700 a 600 porque Outfit es mas robusta que Segoe UI o Roboto y a 700 se
   empastaba; el letter-spacing positivo, minimo, le da aire a una geometrica con
   la "o" muy redonda. El min-height sube de 29 a 32 por la linea mas alta: sigue
   siendo el alto de DOS lineas, para que las tarjetas cortas no crezcan (ver el
   comentario de arriba sobre align-items:flex-start). */
.cat3d-nombre{
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
  text-overflow:ellipsis;font-size:12.5px;font-weight:600;line-height:1.26;
  letter-spacing:.004em;color:var(--text);min-height:32px;
}
.cat3d-emoji{margin-right:2px}
.cat3d-n{
  display:block;margin-top:3px;font-size:11px;color:var(--text-3);font-weight:500;
  overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
}
```

- [x] **Paso 2: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add estilos.css && git commit -m "web: el nombre de la categoria se lee sin forzar la vista"
```

---

## Tarea 5: El emoji sale del nombre y se posa sobre el círculo

La otra mitad. Hoy el emoji va pegado delante del nombre y le roba el primer renglón; con nombres
como "Bocinas Celulares y Accesorios" (que además lleva **dos** emojis, 📢🎧) eso es lo que empuja el
texto a tres líneas. Pasa a ser una insignia en la esquina del círculo.

**Archivos:**
- Modificar: `C:\inventario\tienda-3b\app.js` (`renderCategorias3D()`, sobre las líneas 240-265)
- Modificar: `C:\inventario\tienda-3b\estilos.css` (`.cat3d-inner`, `.cat3d-foto`, `.cat3d-emoji`)

- [x] **Paso 1: Mover el emoji en la tarjeta de Ofertas**

En `app.js`, dentro de `renderCategorias3D()`, busca el bloque `tarjetaOferta`. Hoy dice:

```js
      `<span class="cat3d-foto">${cat3dFotoHtml(fotosOferta().slice(0, 1), '🏷️', mosaicoFuente(itemsEnOferta()))}</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre"><span class="cat3d-emoji" aria-hidden="true">🏷️</span>Ofertas</span>` +
```

Déjalo así:

```js
      `<span class="cat3d-foto">${cat3dFotoHtml(fotosOferta().slice(0, 1), '🏷️', mosaicoFuente(itemsEnOferta()))}</span>` +
      `<span class="cat3d-emoji" aria-hidden="true">🏷️</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre">Ofertas</span>` +
```

El emoji pasa a ser hermano de `.cat3d-foto` y **hijo de `.cat3d-inner`**, que es el círculo. Sigue
con `aria-hidden="true"`: quien use lector de pantalla oye el nombre, no "etiqueta".

- [x] **Paso 2: Mover el emoji en las tarjetas de categoría**

Unas líneas más abajo, en `tarjetasCat`. Hoy dice:

```js
      `<span class="cat3d-foto">${cat3dFotoHtml(categoriaFotos(c.n).slice(0, 1), marcador, mosaicoFuente(itemsDeCategoria(c.n)))}</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre"><span class="cat3d-emoji" aria-hidden="true">${c.e || ''}</span>${escapeHtml(c.n)}</span>` +
```

Déjalo así:

```js
      `<span class="cat3d-foto">${cat3dFotoHtml(categoriaFotos(c.n).slice(0, 1), marcador, mosaicoFuente(itemsDeCategoria(c.n)))}</span>` +
      `${c.e ? `<span class="cat3d-emoji" aria-hidden="true">${escapeHtml(c.e)}</span>` : ''}` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre">${escapeHtml(c.n)}</span>` +
```

Dos detalles que no son adorno: el `c.e ?` evita dejar una insignia vacía flotando en una categoría
sin emoji (hoy `${c.e || ''}` metía un `<span>` vacío, que no se veía porque iba dentro del texto;
como insignia sí se vería, un circulito en blanco). Y `escapeHtml(c.e)` porque el emoji viene del
panel de Stock+ y ya se escapa dos líneas más arriba para el marcador — aquí faltaba.

- [x] **Paso 3: Vestir la insignia en el CSS**

En `estilos.css`, busca:

```css
.cat3d-inner{
  position:relative;display:block;width:100%;aspect-ratio:1;
  border-radius:50%;overflow:hidden;
  background:var(--surface);box-shadow:var(--sombra-1);border:1px solid var(--border);
  transition:transform var(--dur) ease, box-shadow var(--dur) ease;
}
.cat3d-foto{width:100%;height:100%;background:var(--surface-2);position:relative}
```

Sustitúyelo por:

```css
/* 2026-10-11: overflow pasa a visible para que la insignia del emoji pueda
   asomar por el borde. El recorte circular de la FOTO no se pierde: se lo
   queda .cat3d-foto, que es quien contiene el <img>. Si algun dia vuelves a
   poner overflow:hidden aqui, la insignia se corta por la mitad. */
.cat3d-inner{
  position:relative;display:block;width:100%;aspect-ratio:1;
  border-radius:50%;overflow:visible;
  background:var(--surface);box-shadow:var(--sombra-1);border:1px solid var(--border);
  transition:transform var(--dur) ease, box-shadow var(--dur) ease;
}
.cat3d-foto{
  width:100%;height:100%;background:var(--surface-2);position:relative;
  border-radius:50%;overflow:hidden;
}
```

Y ahora sustituye la regla `.cat3d-emoji{margin-right:2px}` (la que dejaste en la Tarea 4) por:

```css
/* La insignia del emoji: fuera del renglon del nombre, posada en la esquina
   del circulo. El emoji lo dibuja el telefono del cliente, no Outfit, asi que
   lo unico que decidimos aqui es el sitio y el tamano. */
.cat3d-emoji{
  position:absolute;right:0;bottom:0;z-index:2;
  width:26px;height:26px;display:flex;align-items:center;justify-content:center;
  font-size:13px;line-height:1;border-radius:50%;
  background:var(--surface);border:1px solid var(--border);box-shadow:var(--sombra-1);
}
@media (min-width:760px){
  .cat3d-emoji{width:30px;height:30px;font-size:15px}
}
```

La insignia es más pequeña en móvil porque ahí el círculo mide 92px y no 112px: con 30px fijos se
comía la foto.

- [x] **Paso 4: Comprobar que el JavaScript sigue siendo válido**

```bash
cd "C:/inventario/tienda-3b" && node --check app.js && echo "app.js OK"
```

Esperado: `app.js OK`. (Esto solo dice que no hay un error de sintaxis; que se vea bien es la
Tarea 6.)

- [x] **Paso 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add app.js estilos.css && git commit -m "web: el emoji de la categoria deja de robarle el renglon al nombre"
```

---

## Tarea 6: Mirarlo con tus ojos (esto NO es opcional)

Aquí no hay test que valga: lo que decide si esto está bien es cómo se ve. Hay que mirarlo en
**claro y en oscuro**, y en **móvil y escritorio**, porque la tienda sigue el tema del teléfono de
cada cliente.

- [x] **Paso 1: Levantar un servidor estático de usar y tirar**

No instales nada ni metas dependencias en el repo. Escribe este archivo **en el scratchpad de la
sesión, fuera del repo**, como `servidor.js`:

```js
// Servidor estatico de usar y tirar, solo para mirar la tienda en local.
// No vive en el repo a proposito: la tienda no tiene backend y no debe tenerlo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const RAIZ = 'C:/inventario/tienda-3b';
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  const rel = limpio === '/' ? 'index.html' : limpio.replace(/^\/+/, '');
  const abs = path.join(RAIZ, rel);
  // Sin extension => la tienda es una SPA y todo cae en index.html (como vercel.json).
  const destino = path.extname(abs) ? abs : path.join(RAIZ, 'index.html');
  fs.readFile(destino, (err, buf) => {
    if (err) { res.writeHead(404); res.end('no esta'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(4321, () => console.log('mirando en http://localhost:4321'));
```

Arráncalo en segundo plano:

```bash
node "<RUTA_DEL_SCRATCHPAD>/servidor.js"
```

- [x] **Paso 2: Comprobar que la fuente REALMENTE se está usando**

Este paso existe porque el fallo típico de este trabajo no da error: si la ruta está mal o el
archivo no se sirve, el navegador usa la letra del sistema y la página se ve **casi igual que
antes**. Abre `http://localhost:4321` en el navegador y ejecuta en la consola:

```js
document.fonts.check('600 12.5px Outfit')
```

Esperado: **`true`**. Si sale `false`, mira la pestaña Network: la petición a
`/fuentes/outfit-latin-v15.woff2` tiene que responder **200** con `Content-Type: font/woff2`.
**Si sale `false`, para y arregla eso antes de seguir: todo lo demás de este plan no sirve de nada
si la fuente no carga.**

- [x] **Paso 3: Mirar las cuatro combinaciones y guardar captura de cada una**

Mira la zona de **Categorías** (y date una vuelta por el catálogo y por `/taxi`, que también
cambiaron de letra):

1. Escritorio, tema claro
2. Escritorio, tema oscuro
3. Móvil 375px, tema claro
4. Móvil 375px, tema oscuro

Guarda las cuatro capturas en `docs/informes/` con estos nombres exactos (es la convención que ya
sigue el repo, mira los archivos que hay):

- `2026-10-11-categorias-outfit-escritorio-claro.jpg`
- `2026-10-11-categorias-outfit-escritorio-oscuro.jpg`
- `2026-10-11-categorias-outfit-375px-claro.jpg`
- `2026-10-11-categorias-outfit-375px-oscuro.jpg`

- [x] **Paso 4: Repasar esta lista mirando las capturas**

Marca cada una solo si la has visto de verdad:

- [x] La insignia del emoji se ve **entera**, no cortada por el borde del círculo.
- [x] La foto del círculo sigue **redonda**, no cuadrada (si salió cuadrada, falta
      `border-radius:50%;overflow:hidden` en `.cat3d-foto`).
- [x] "Bocinas Celulares y Accesorios" y "Bolsos Carteras Mochilas monederos" **no salen cortadas
      con puntos suspensivos**.
- [x] Las tarjetas de una misma fila **siguen alineadas** arriba (el círculo a la misma altura).
- [x] La categoría activa (pulsa una) se sigue distinguiendo: aro ciruela y nombre en ciruela.
- [x] En **oscuro**, la insignia se ve como un círculo con borde, no como una mancha.
- [x] En **375px** la insignia no tapa media foto.
- [x] La barra de arriba, los precios y los botones **también** cambiaron de letra (es "toda la
      tienda", no solo las categorías).
- [x] `/taxi` cambió de letra y no se rompió nada de su maquetación.

**Si algo de esta lista falla, arréglalo y vuelve a mirar antes de seguir.**

---

## Tarea 7: Que nada más se haya roto

- [x] **Paso 1: Correr la batería**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: todo en verde. Ojo: es `node --test` desde la raíz, **no** `node --test test/` (con Node
24 eso falla; lo dice el README).

Ninguno de los tres archivos de test toca categorías ni estilos, así que esto es una red, no una
prueba del cambio. Si alguno falla, **el fallo es tuyo**: el árbol estaba limpio y verde al empezar.

- [x] **Paso 2: Commit de las capturas**

```bash
cd "C:/inventario/tienda-3b" && git add docs/informes/2026-10-11-categorias-outfit-*.jpg && git commit -m "docs: capturas del antes y el despues de la tipografia"
```

---

## Tarea 8: Informe y publicación

- [x] **Paso 1: Escribir el informe de relevo**

En `docs/informes/2026-10-11-tipografia-outfit.md`, autocontenido, con: qué se cambió y por qué, el
tamaño real del archivo de la fuente, el resultado literal de `document.fonts.check(...)`, la salida
de `node --test`, las cuatro capturas enlazadas, y **marcado "⚠ NO VERIFICADO" todo lo que no hayas
mirado**. Si te saltaste algo, dilo ahí; no lo escondas.

- [x] **Paso 2: Actualizar la documentación del proyecto**

En `README.md`, añade al final una sección corta:

```markdown
## La letra del sitio

La tienda escribe en **Outfit** (SIL Open Font License 1.1), y el archivo vive en `fuentes/`, no en
Google Fonts: la CSP del sitio lleva `default-src 'self'` sin `font-src`, así que una fuente traída
de fuera la bloquea el navegador **en silencio** y la página se queda con la letra del sistema sin
dar ningún error. Si algún día el sitio amanece con otra letra, mira ahí antes que en el CSS.

Para cambiarla: se baja el `.woff2` nuevo a `fuentes/`, se cambia el `@font-face` del principio de
`estilos.css` y el token `--fuente`. El `<link rel="preload">` del `<head>` de `index.html` y
`taxi.html` apunta al archivo por su nombre: hay que cambiarlo también, o la precarga baja un
archivo que nadie usa.

Las letras del escudo "3B STORE" (`.logo-mono` y `.logo-word`) **no** usan esa fuente a propósito:
son parte del logo y declaran su propia pila.
```

- [x] **Paso 3: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add README.md docs/informes/2026-10-11-tipografia-outfit.md && git commit -m "docs: informe y nota de la tipografia en el README"
```

- [ ] **Paso 4: PARA AQUÍ y pide permiso antes de publicar**

`git push` despliega en Vercel y lo ve todo el mundo al instante. **No lo hagas por tu cuenta.**
Enséñale a Ruth las cuatro capturas y espera a que diga que sí. Cuando lo diga:

```bash
cd "C:/inventario/tienda-3b" && git push origin main
```

Y después abre `https://www.3bqba.com` **con recarga forzada** (Ctrl+F5) y confirma que se ve igual
que en local. El despliegue tarda ~1 minuto; si la ves con la letra vieja, espera y recarga otra
vez antes de tocar nada.

---

## Repaso del plan contra el encargo

- "Las categorías tienen nombre con emoji y las veo primitivas" → Tareas 4 y 5.
- Variante 2 elegida por el dueño (Outfit, emoji en insignia) → Tareas 1, 2, 4 y 5.
- Alcance "toda la tienda" → Tarea 2 (el `body`), que arrastra `index.html` y `taxi.html`.
- Riesgo de que la CSP bloquee la fuente → resuelto hospedándola (Tarea 1) y verificado con
  `document.fonts.check` (Tarea 6, Paso 2).
- Riesgo de romper el logo → avisado en el contexto y en la Tarea 2, Paso 3.
- Regla del dueño "nada terminado sin mirarlo" → Tarea 6 entera.
- Regla del dueño "informe de relevo tras cada cambio" → Tarea 8.
