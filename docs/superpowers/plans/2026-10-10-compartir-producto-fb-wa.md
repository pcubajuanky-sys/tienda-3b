# Compartir un producto en Facebook y WhatsApp — Plan de implementación

> **Para ejecutores:** SUB-SKILL OBLIGATORIO: usa `superpowers:subagent-driven-development` (recomendado)
> o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan casillas
> (`- [ ]`) para ir marcando.

**Objetivo:** que al compartir un producto de 3bqba.com en Facebook o WhatsApp salga la tarjeta de
**ese** producto —su foto, su nombre, su precio y su descripción— con un enlace que lo abre, y que
ese enlace lleve el código del gestor que lo comparte.

**Arquitectura:** se crea la ruta `/p/<codigo>`, servida por una función de solo lectura en Vercel
(`api/producto.js`) que devuelve el `index.html` de siempre con el bloque de etiquetas `og:`
sustituido por el del producto —necesario porque Facebook y WhatsApp no ejecutan JavaScript—. En el
navegador, `app.js` detecta esa ruta y abre el modal del producto, y añade tres botones de compartir
dentro del modal.

**Stack:** HTML + CSS + JavaScript sin framework · función Node (CommonJS) en Vercel · pruebas con
`node --test` (el repo no tiene `package.json` y no le hace falta).

**Spec:** `docs/superpowers/specs/2026-10-10-compartir-producto-fb-wa-design.md` — léela antes de
empezar.

---

## Antes de empezar

- Repo: `C:\inventario\tienda-3b`, rama `main`. Comprueba con `git status` que el árbol está limpio;
  si hay cambios de otra sesión, **para y pregunta** (este árbol lo comparten varias sesiones).
- Shell: PowerShell 5.1. **No existen `&&`, `||`, `??` ni `?.`** — encadena con `;` y comprueba con
  `if ($?) { }`. Las rutas con espacios van entre comillas.
- **No toques `catalogo.json`**: lo publica Stock+ y se sobrescribe solo.
- **Prohibido añadir manejadores en línea** (`onclick=`, `onerror=`) en el HTML: la CSP de producción
  solo permite dos hashes concretos y cualquier añadido rompe la página entera. Los clics se enganchan
  desde `app.js`.
- Los commits de cada tarea son **locales**. El push lo hace la Tarea 7, con Ruth delante, porque
  cada push despliega en producción.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `api/_og.js` | **nuevo.** Módulo puro: dado un producto, devuelve los textos de la tarjeta y el bloque HTML. No lee archivos ni red, por eso se puede probar. El guion bajo del nombre hace que Vercel **no** lo publique como endpoint |
| `api/producto.js` | **nuevo.** La función de la ruta: resuelve el código, inyecta el bloque en `index.html` y responde |
| `test/og.test.js` | **nuevo.** Pruebas de `api/_og.js` |
| `test/producto.test.js` | **nuevo.** Pruebas de `api/producto.js` con un `req`/`res` fingidos |
| `vercel.json` | la regla `/p/:codigo` **antes** del comodín, y `functions.includeFiles` |
| `_redirects` | comentario: esta pieza no tiene equivalente en Cloudflare |
| `index.html` | marcadores `og:inicio`/`og:fin` en la cabecera + la fila de compartir en el modal |
| `estilos.css` | estilos de la fila de compartir |
| `app.js` | enlace profundo, URL del gestor, texto a compartir, los tres clics |
| `README.md` | una sección corta sobre los enlaces de producto |

---

### Task 1: el módulo puro de etiquetas (`api/_og.js`)

**Archivos:**
- Crear: `api/_og.js`
- Crear: `test/og.test.js`

- [ ] **Paso 1: escribe la prueba que falla**

Crea `test/og.test.js`:

```js
// test/og.test.js — pruebas del modulo puro de etiquetas og:.
// Se corren desde la raiz del repo con:  node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { ogDeProducto, bloqueOg, precioTexto, descripcionOg, imagenOg, escapar } = require('../api/_og');

const BASE = {
  codigo: 'U8DN',
  name: 'Ventilador recargable',
  notes: 'Mando a distancia\nBateria de 20mil mAh',
  photo: 'https://res.cloudinary.com/dvahidqdw/image/upload/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg',
  precioUSD: 50,
  precioCUP: 38750,
  moneda: 'usd',
  enOferta: false,
};

const URL_OK = 'https://www.3bqba.com/p/U8DN';

test('precio en USD: manda el dolar y el CUP va detras', () => {
  assert.strictEqual(precioTexto(BASE), '$50 USD · 38,750 CUP');
});

test('precio en CUP: manda el CUP', () => {
  const p = Object.assign({}, BASE, { moneda: 'cup' });
  assert.strictEqual(precioTexto(p), '38,750 CUP · $50 USD');
});

test('en oferta: lleva el prefijo y el precio anterior', () => {
  const p = Object.assign({}, BASE, { enOferta: true, precioNormalUSD: 55, precioNormalCUP: 42625 });
  assert.strictEqual(precioTexto(p), 'Oferta $50 USD · 38,750 CUP (antes $55)');
});

test('en oferta y en CUP: el precio anterior va en CUP', () => {
  const p = Object.assign({}, BASE, { moneda: 'cup', enOferta: true, precioNormalUSD: 55, precioNormalCUP: 42625 });
  assert.strictEqual(precioTexto(p), 'Oferta 38,750 CUP · $50 USD (antes 42,625 CUP)');
});

test('la descripcion aplana los saltos de linea', () => {
  assert.strictEqual(descripcionOg(BASE), '$50 USD · 38,750 CUP — Mando a distancia Bateria de 20mil mAh');
});

test('sin notes, la descripcion es solo el precio', () => {
  const p = Object.assign({}, BASE, { notes: '' });
  assert.strictEqual(descripcionOg(p), '$50 USD · 38,750 CUP');
});

test('una descripcion larguisima se corta en el ultimo espacio y termina en puntos suspensivos', () => {
  const p = Object.assign({}, BASE, { notes: 'palabra '.repeat(60) });
  const d = descripcionOg(p);
  assert.ok(d.length <= 161, 'mide ' + d.length);
  assert.ok(d.endsWith('…'), 'no termina en puntos suspensivos: ' + d);
  assert.ok(!d.includes(' …'), 'corto a mitad y dejo un espacio colgando: ' + d);
});

test('la imagen pasa por la transformacion de Cloudinary', () => {
  assert.strictEqual(
    imagenOg(BASE),
    'https://res.cloudinary.com/dvahidqdw/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_white/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg'
  );
});

test('una foto que no es de Cloudinary va tal cual', () => {
  const p = Object.assign({}, BASE, { photo: 'https://ejemplo.com/foto.jpg' });
  assert.strictEqual(imagenOg(p), 'https://ejemplo.com/foto.jpg');
});

test('sin foto, cae a la imagen de la tienda', () => {
  const p = Object.assign({}, BASE, { photo: '' });
  assert.strictEqual(imagenOg(p), 'https://www.3bqba.com/og-3b.jpg');
});

test('escapar protege comillas, ampersand y angulos', () => {
  assert.strictEqual(escapar('Pelo & "rizos" <b>'), 'Pelo &amp; &quot;rizos&quot; &lt;b&gt;');
});

test('el bloque lleva las etiquetas que leen Facebook y WhatsApp', () => {
  const html = bloqueOg(ogDeProducto(BASE, URL_OK));
  assert.ok(html.includes('<title>Ventilador recargable — 3B Store</title>'));
  assert.ok(html.includes('<meta property="og:title" content="Ventilador recargable — 3B Store">'));
  assert.ok(html.includes('<meta property="og:url" content="https://www.3bqba.com/p/U8DN">'));
  assert.ok(html.includes('<link rel="canonical" href="https://www.3bqba.com/p/U8DN">'));
  assert.ok(html.includes('w_1200,h_630,c_pad,b_white'));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
});

test('el nombre con comillas sale escapado dentro del atributo', () => {
  const p = Object.assign({}, BASE, { name: 'Set 3 "piezas" & cepillo' });
  const html = bloqueOg(ogDeProducto(p, URL_OK));
  assert.ok(html.includes('content="Set 3 &quot;piezas&quot; &amp; cepillo — 3B Store"'), html);
});

test('la URL del gestor viaja en og:url', () => {
  const html = bloqueOg(ogDeProducto(BASE, 'https://www.3bqba.com/p/U8DN?ref=5D9K9'));
  assert.ok(html.includes('<meta property="og:url" content="https://www.3bqba.com/p/U8DN?ref=5D9K9">'));
});

test('sin transformacion de Cloudinary no se declaran las medidas', () => {
  const p = Object.assign({}, BASE, { photo: 'https://ejemplo.com/foto.jpg' });
  const html = bloqueOg(ogDeProducto(p, URL_OK));
  assert.ok(!html.includes('og:image:width'), 'declaro 1200x630 de una foto que no redimensiono');
});
```

- [ ] **Paso 2: corre las pruebas y comprueba que fallan**

```bash
node --test test/
```

Esperado: FALLA con `Cannot find module '../api/_og'`.

- [ ] **Paso 3: escribe la implementación mínima**

Crea `api/_og.js`:

```js
// api/_og.js — construye las etiquetas og:/twitter: de UN producto.
//
// Vive dentro de api/ pero empieza por guion bajo: Vercel no publica como endpoint
// los archivos que empiezan por "_". Si se le quita el guion, aparece una URL
// publica /api/og que nadie pidio.
//
// Modulo PURO a proposito: no lee archivos, no toca la red, no depende de Vercel.
// Por eso se puede probar entero con node --test (test/og.test.js).
//
// OJO, duplicacion consciente: app.js tiene su propio precioTexto() para el texto
// que se manda por WhatsApp. Son dos entornos distintos (Node aqui, navegador alli)
// y no hay forma de compartir codigo sin montar un empaquetador. Si cambias el
// formato del precio aqui, cambialo tambien en app.js, igual que pasa con la
// pareja vercel.json / _redirects.

const IMG_TRANSFORM = 'f_jpg,q_auto,w_1200,h_630,c_pad,b_white';
const IMG_FALLBACK = 'https://www.3bqba.com/og-3b.jpg';
const MARCADOR_CLOUDINARY = '/image/upload/';
const MAX_DESC = 160;

function escapar(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mismo formato que app.js:29, para que la tarjeta y la web digan el mismo numero.
function fmt(n) { return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

function precioTexto(p) {
  const usd = '$' + p.precioUSD + ' USD';
  const cup = fmt(p.precioCUP) + ' CUP';
  const esUsd = p.moneda === 'usd';
  const base = (esUsd ? usd : cup) + ' · ' + (esUsd ? cup : usd);
  if (!p.enOferta) return base;
  const antes = esUsd ? '$' + p.precioNormalUSD : fmt(p.precioNormalCUP) + ' CUP';
  return 'Oferta ' + base + ' (antes ' + antes + ')';
}

function descripcionOg(p) {
  const notas = String(p.notes || '').replace(/\s+/g, ' ').trim();
  let d = notas ? precioTexto(p) + ' — ' + notas : precioTexto(p);
  if (d.length > MAX_DESC) {
    d = d.slice(0, MAX_DESC);
    const i = d.lastIndexOf(' ');
    if (i > 0) d = d.slice(0, i);
    d += '…';
  }
  return d;
}

function imagenOg(p) {
  const url = String(p.photo || '');
  if (!url) return IMG_FALLBACK;
  const i = url.indexOf(MARCADOR_CLOUDINARY);
  if (i === -1) return url;   // las fotos que no son de Cloudinary van tal cual
  const corte = i + MARCADOR_CLOUDINARY.length;
  return url.slice(0, corte) + IMG_TRANSFORM + '/' + url.slice(corte);
}

function ogDeProducto(p, url) {
  return {
    titulo: p.name + ' — 3B Store',
    descripcion: descripcionOg(p),
    imagen: imagenOg(p),
    url: url,
  };
}

function bloqueOg(d) {
  const t = escapar(d.titulo);
  const desc = escapar(d.descripcion);
  const img = escapar(d.imagen);
  const u = escapar(d.url);
  const lineas = [
    '<title>' + t + '</title>',
    '<meta name="description" content="' + desc + '">',
    '<link rel="canonical" href="' + u + '">',
    '<meta property="og:type" content="product">',
    '<meta property="og:site_name" content="3B Store">',
    '<meta property="og:title" content="' + t + '">',
    '<meta property="og:description" content="' + desc + '">',
    '<meta property="og:url" content="' + u + '">',
    '<meta property="og:image" content="' + img + '">',
  ];
  // Solo se declaran las medidas si la imagen pasa por nuestra transformacion:
  // de una foto ajena no sabemos cuanto mide y mentir confunde al robot.
  if (img.indexOf('w_1200,h_630') !== -1) {
    lineas.push('<meta property="og:image:width" content="1200">');
    lineas.push('<meta property="og:image:height" content="630">');
  }
  lineas.push('<meta property="og:locale" content="es_CU">');
  lineas.push('<meta name="twitter:card" content="summary_large_image">');
  lineas.push('<meta name="twitter:title" content="' + t + '">');
  lineas.push('<meta name="twitter:description" content="' + desc + '">');
  lineas.push('<meta name="twitter:image" content="' + img + '">');
  return lineas.join('\n');
}

module.exports = { ogDeProducto, bloqueOg, precioTexto, descripcionOg, imagenOg, escapar };
```

- [ ] **Paso 4: corre las pruebas y comprueba que pasan**

```bash
node --test test/
```

Esperado: `# pass 15`, `# fail 0`. **Pega la salida real en el informe.** Si alguna falla, arregla el
módulo, nunca la prueba — salvo que la prueba esté mal escrita, y entonces dilo explícitamente.

- [ ] **Paso 5: commit**

```bash
git add api/_og.js test/og.test.js
git commit -m "web: modulo puro de etiquetas og: por producto"
```

---

### Task 2: marcadores en la cabecera de `index.html`

La función sustituye lo que hay entre dos marcadores. Hay que colocarlos **y mover antes los enlaces
del icono**, porque si quedaran dentro del bloque sustituible las páginas de producto se quedarían
sin favicon.

**Archivos:**
- Modificar: `index.html:1-31` (la cabecera)

- [ ] **Paso 1: reemplaza la cabecera**

Sustituye todo lo que hay desde `<meta name="theme-color"...>` hasta la línea
`<link rel="stylesheet" href="estilos.css">` (ambas incluidas) por esto:

```html
<meta name="theme-color" content="#7A2E5D">
<link rel="icon" href="/favicon-3b.png" type="image/png">
<link rel="apple-touch-icon" href="/favicon-3b.png">

<!-- Todo lo que va entre og:inicio y og:fin lo SUSTITUYE api/producto.js cuando la
     visita entra por /p/<codigo>, para que Facebook y WhatsApp —que no ejecutan
     JavaScript— enseñen la foto y la descripcion de ESE producto. Si mueves o
     renombras los marcadores, la funcion deja de reconocerlos y devuelve esta
     pagina tal cual (fallo seguro, pero sin tarjeta de producto).
     Los enlaces del icono viven ARRIBA, fuera del bloque, para que una pagina de
     producto no se quede sin favicon.
     og:image por defecto: el logo de la tienda sobre negro, servido desde este
     mismo dominio. Es lo que se ve al compartir la portada. -->
<!-- og:inicio -->
<title>3B Store — Tienda online en San Antonio de los Baños, Cuba</title>
<meta name="description" content="+150 productos: Cabello, Cuidado Personal, Reloj y Prendas, Hogar, Electrodomésticos. Mensajería gratis en San Antonio en muchos productos. Pide por WhatsApp.">
<link rel="canonical" href="https://www.3bqba.com/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="3B Store">
<meta property="og:title" content="3B Store — Tienda online en San Antonio de los Baños, Cuba">
<meta property="og:description" content="+150 productos: Cabello, Cuidado Personal, Reloj y Prendas, Hogar, Electrodomésticos. Mensajería gratis en San Antonio en muchos productos. Pide por WhatsApp.">
<meta property="og:url" content="https://www.3bqba.com/">
<meta property="og:image" content="https://www.3bqba.com/og-3b.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_CU">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="3B Store — Tienda online en San Antonio de los Baños, Cuba">
<meta name="twitter:description" content="+150 productos: Cabello, Cuidado Personal, Reloj y Prendas, Hogar, Electrodomésticos. Mensajería gratis en San Antonio en muchos productos. Pide por WhatsApp.">
<meta name="twitter:image" content="https://www.3bqba.com/og-3b.jpg">
<!-- og:fin -->

<link rel="stylesheet" href="estilos.css">
```

- [ ] **Paso 2: comprueba que no perdiste nada**

```bash
node -e "const h=require('fs').readFileSync('index.html','utf8'); const n=s=>h.split(s).length-1; console.log('og:inicio',n('<!-- og:inicio -->'),'og:fin',n('<!-- og:fin -->'),'title',n('<title>'),'favicon',n('favicon-3b.png'),'canonical',n('rel=\"canonical\"'),'estilos',n('estilos.css'));"
```

Esperado exactamente: `og:inicio 1 og:fin 1 title 1 favicon 2 canonical 1 estilos 1`.

- [ ] **Paso 3: comprueba que la tienda sigue cargando**

Abre `index.html` en el navegador con un servidor estático desde la raíz del repo:

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,s)=>{const r=q.url.split('?')[0];const d=r==='/'?'index.html':r.slice(1);f.readFile(p.join(process.cwd(),d),(e,b)=>{if(e){s.writeHead(404);return s.end('no')}const t=d.endsWith('.css')?'text/css':d.endsWith('.js')?'text/javascript':d.endsWith('.json')?'application/json':d.endsWith('.png')?'image/png':d.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8';s.writeHead(200,{'Content-Type':t});s.end(b)})}).listen(8123,()=>console.log('http://localhost:8123'))"
```

Esperado: la tienda carga con sus productos, se ve el icono en la pestaña y la consola del navegador
no muestra errores de CSP. Déjalo corriendo: lo reusan las tareas 5 y 6. Para pararlo, Ctrl+C.

- [ ] **Paso 4: commit**

```bash
git add index.html
git commit -m "web: marcadores og:inicio/og:fin en la cabecera"
```

---

### Task 3: la función de la ruta (`api/producto.js`)

**Archivos:**
- Crear: `api/producto.js`
- Crear: `test/producto.test.js`

- [ ] **Paso 1: escribe la prueba que falla**

Crea `test/producto.test.js`:

```js
// test/producto.test.js — pruebas de la funcion que sirve /p/<codigo>.
// Finge el req/res de Vercel: la funcion es sincrona, asi que basta con llamarla.
// Se corren DESDE LA RAIZ del repo (la funcion lee index.html y catalogo.json
// relativos a process.cwd()).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const handler = require('../api/producto');

const CAT = JSON.parse(fs.readFileSync('catalogo.json', 'utf8'));
const UNO = CAT.items[0];

function pedir(query) {
  const res = {
    statusCode: 0,
    cabeceras: {},
    cuerpo: '',
    setHeader(k, v) { this.cabeceras[String(k).toLowerCase()] = v; },
    end(b) { this.cuerpo = b == null ? '' : String(b); },
  };
  handler({ query: query, url: '/api/producto' }, res);
  return res;
}

test('un codigo valido devuelve la pagina con las etiquetas de ESE producto', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>' + UNO.name + ' — 3B Store</title>'), 'no cambio el title');
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '"'));
  assert.ok(r.cuerpo.includes('w_1200,h_630,c_pad,b_white'), 'no uso la imagen transformada');
});

test('la pagina sigue siendo la tienda entera: conserva el script y el favicon', () => {
  const r = pedir({ c: UNO.codigo });
  assert.ok(r.cuerpo.includes('app.js'), 'perdio app.js');
  assert.ok(r.cuerpo.includes('favicon-3b.png'), 'perdio el favicon');
  assert.ok(r.cuerpo.includes('estilos.css'), 'perdio la hoja de estilos');
});

test('solo hay UN title en la salida', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.cuerpo.split('<title>').length - 1, 1);
});

test('el ref del gestor viaja en og:url', () => {
  const r = pedir({ c: UNO.codigo, ref: '5D9K9' });
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '?ref=5D9K9"'), 'perdio el ref');
});

test('un ref con basura se ignora, no se cuela en el HTML', () => {
  const r = pedir({ c: UNO.codigo, ref: '"><script>x' });
  assert.ok(!r.cuerpo.includes('<script>x'), 'inyecto el ref en el HTML');
  assert.ok(r.cuerpo.includes('og:url" content="https://www.3bqba.com/p/' + UNO.codigo.toUpperCase() + '"'));
});

test('un codigo que no existe devuelve la tienda normal, con 200', () => {
  const r = pedir({ c: 'ZZZZ' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'), 'no devolvio la portada');
});

test('sin codigo devuelve la tienda normal', () => {
  const r = pedir({});
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'));
});

test('un codigo con caracteres raros no revienta', () => {
  const r = pedir({ c: '../../etc/passwd' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes('<title>3B Store — Tienda online'));
});

test('responde como HTML y con cache del borde', () => {
  const r = pedir({ c: UNO.codigo });
  assert.strictEqual(r.cabeceras['content-type'], 'text/html; charset=utf-8');
  assert.ok(String(r.cabeceras['cache-control']).includes('s-maxage=300'));
});

test('el codigo en minusculas tambien encuentra el producto', () => {
  const r = pedir({ c: UNO.codigo.toLowerCase() });
  assert.ok(r.cuerpo.includes('<title>' + UNO.name + ' — 3B Store</title>'));
});
```

- [ ] **Paso 2: corre las pruebas y comprueba que fallan**

```bash
node --test test/
```

Esperado: FALLA con `Cannot find module '../api/producto'`.

- [ ] **Paso 3: escribe la implementación mínima**

Crea `api/producto.js`:

```js
// api/producto.js — sirve /p/<codigo> (la reescritura vive en vercel.json).
//
// Devuelve el index.html de SIEMPRE con el bloque de etiquetas og: cambiado por el
// del producto. Asi el robot de Facebook o WhatsApp —que no ejecuta JavaScript— ve
// la foto y la descripcion de ese producto, y la persona ve la tienda de siempre,
// con su mismo CSS y su misma CSP (los hashes de script siguen valiendo porque el
// HTML que devolvemos es el tuyo, intacto salvo esas etiquetas).
//
// Solo lectura: no escribe nada, no llama a nadie, no guarda estado entre visitas.
const fs = require('fs');
const path = require('path');
const { ogDeProducto, bloqueOg } = require('./_og');

const INICIO = '<!-- og:inicio -->';
const FIN = '<!-- og:fin -->';
const RAIZ = 'https://www.3bqba.com';

// Se leen una sola vez por arranque en frio. Publicar el catalogo crea un
// despliegue nuevo, asi que este cache nunca sirve datos viejos.
let cacheHtml = null;
let cacheCat = null;

function leer(nombre) {
  return fs.readFileSync(path.join(process.cwd(), nombre), 'utf8');
}

function pagina() {
  if (cacheHtml === null) cacheHtml = leer('index.html');
  return cacheHtml;
}

function catalogo() {
  if (cacheCat === null) cacheCat = JSON.parse(leer('catalogo.json'));
  return cacheCat;
}

// Vercel entrega req.query; si algun dia no estuviera, se saca de la URL.
function consulta(req) {
  if (req && req.query) return req.query;
  try {
    const u = new URL(req.url, 'http://local');
    const o = {};
    u.searchParams.forEach((v, k) => { o[k] = v; });
    return o;
  } catch (e) { return {}; }
}

function limpio(v, re) {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && re.test(s) ? s : '';
}

module.exports = function handler(req, res) {
  let html;
  try {
    html = pagina();
  } catch (e) {
    // Sin index.html no hay nada que servir: que el visitante caiga en la portada.
    res.statusCode = 302;
    res.setHeader('Location', '/');
    return res.end('');
  }

  let salida = html;
  try {
    const q = consulta(req);
    const cod = limpio(q.c, /^[A-Za-z0-9]{1,8}$/).toUpperCase();
    const ref = limpio(q.ref, /^[A-Za-z0-9]{1,10}$/).toUpperCase();
    const p = cod
      ? (catalogo().items || []).find((x) => String(x.codigo).toUpperCase() === cod)
      : null;
    const i = html.indexOf(INICIO);
    const j = html.indexOf(FIN);
    if (p && i !== -1 && j > i) {
      const url = RAIZ + '/p/' + String(p.codigo).toUpperCase() + (ref ? '?ref=' + ref : '');
      salida = html.slice(0, i + INICIO.length) + '\n' +
               bloqueOg(ogDeProducto(p, url)) + '\n' +
               html.slice(j);
    }
  } catch (e) {
    salida = html;   // cualquier tropiezo: la tienda normal, nunca una pagina rota
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.end(salida);
};
```

- [ ] **Paso 4: corre las pruebas y comprueba que pasan**

```bash
node --test test/
```

Esperado: `# pass 25`, `# fail 0` (15 de la Tarea 1 + 10 de esta). **Pega la salida real.**

- [ ] **Paso 5: commit**

```bash
git add api/producto.js test/producto.test.js
git commit -m "web: funcion que sirve /p/<codigo> con las etiquetas del producto"
```

---

### Task 4: la ruta en `vercel.json` y el aviso en `_redirects`

**Archivos:**
- Modificar: `vercel.json`
- Modificar: `_redirects`

- [ ] **Paso 1: añade la regla y la inclusión de archivos**

En `vercel.json`, el bloque `rewrites` queda así (la regla nueva va **primera**: el comodín de abajo
se tragaría `/p/...` si fuera antes), y se añade `functions` al mismo nivel que `rewrites`:

```json
{
  "rewrites": [
    { "source": "/p/:codigo", "destination": "/api/producto?c=:codigo" },
    { "source": "/taxi", "destination": "/taxi.html" },
    { "source": "/((?!.*\\.).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/producto.js": { "includeFiles": "{index.html,catalogo.json}" }
  },
```

El resto del archivo (el bloque `headers` entero) **no se toca**.

- [ ] **Paso 2: comprueba que el JSON sigue siendo válido y el orden es el correcto**

```bash
node -e "const v=require('./vercel.json'); console.log(v.rewrites.map(r=>r.source)); console.log('includeFiles:', v.functions['api/producto.js'].includeFiles);"
```

Esperado:
```
[ '/p/:codigo', '/taxi', '/((?!.*\\.).*)' ]
includeFiles: {index.html,catalogo.json}
```

- [ ] **Paso 3: deja el aviso en `_redirects`**

Añade al final de `_redirects`:

```
# La ruta /p/<codigo> NO tiene gemelo aqui: la sirve una funcion de Vercel
# (api/producto.js) que inyecta las etiquetas og: del producto. Cloudflare Pages
# necesitaria rehacerla como Pages Function en functions/p/[codigo].js.
```

- [ ] **Paso 4: commit**

```bash
git add vercel.json _redirects
git commit -m "web: ruta /p/<codigo> hacia la funcion del producto"
```

---

### Task 5: el enlace profundo en `app.js`

**Archivos:**
- Modificar: `app.js` — `mostrarAvisoAjuste` (~línea 624), `cerrarDetalle` (~línea 520),
  final de `iniciar()` (~línea 1350)

- [ ] **Paso 1: saca el aviso a una función reutilizable**

Sustituye la función `mostrarAvisoAjuste` entera por estas dos:

```js
// La franja descartable de arriba. La usan dos cosas: el carrito recortado y un
// enlace a un producto que ya no esta.
function mostrarAvisoTexto(texto) {
  const caja = document.getElementById('aviso-ajuste');
  if (!caja) return;
  document.getElementById('aviso-ajuste-texto').textContent = texto;
  caja.hidden = false;
  medirHeader();   // vive dentro de .barra-fija: el alto de la cabecera cambia
}

function mostrarAvisoAjuste(recortes) {
  const partes = recortes.map((r) => `«${r.nombre}${r.comb ? ' · ' + r.comb : ''}» (${r.tope === 1 ? 'queda 1' : 'quedan ' + r.tope})`);
  mostrarAvisoTexto('Ajustamos tu pedido a lo que queda: ' + partes.join(', ') + '.');
}
```

- [ ] **Paso 2: añade la función que abre el producto de la URL**

Justo debajo de `cerrarDetalle` (después de su llave de cierre), añade:

```js
// Entrada por un enlace compartido: /p/<codigo> abre ese producto.
// El codigo es el corto del catalogo (4 letras), no el id largo: es el que se
// comparte y el que entiende api/producto.js.
// Dos segmentos a proposito: codigoDeLaUrl() toma un solo segmento como codigo de
// gestor (/MARIA), asi que /p/XXXX no puede confundirse con un vendedor.
function abrirProductoDeLaUrl() {
  const m = location.pathname.match(/^\/p\/([A-Za-z0-9]{1,8})\/?$/);
  if (!m) return;
  const cod = m[1].toUpperCase();
  const p = (CAT.items || []).find((x) => String(x.codigo).toUpperCase() === cod);
  if (p) { abrirDetalle(p.id); return; }
  mostrarAvisoTexto('Ese producto ya no está disponible. Mira el resto del catálogo.');
}
```

- [ ] **Paso 3: al cerrar el detalle, devuelve la URL a la raíz**

Dentro de `cerrarDetalle`, justo antes de la línea
`if (elementoAnteriorFoco && elementoAnteriorFoco.isConnected) elementoAnteriorFoco.focus();`, añade:

```js
  // Se vino por un enlace de producto: la URL vuelve a la raiz para que el visitante
  // siga navegando normal. Se conserva la query porque ahi puede ir el ?ref= del
  // gestor, y el enlace de la barra del navegador tiene que seguir sirviendo.
  if (location.pathname.indexOf('/p/') === 0) {
    history.replaceState(null, '', '/' + location.search);
  }
```

- [ ] **Paso 4: llámala al terminar de cargar**

Al final de `iniciar()`, la secuencia queda:

```js
  medirHeader();
  await cargarCatalogo();
  renderMundos();
  abrirProductoDeLaUrl();   // despues de cargarCatalogo: necesita CAT.items
}
```

- [ ] **Paso 5: compruébalo en el navegador**

Con el servidor del Paso 3 de la Tarea 2 corriendo, abre `http://localhost:8123/`. Ese servidor de
pruebas **no** tiene la reescritura de Vercel (pedir `/p/U8DN` ahí daría un 404), así que el enlace
profundo se prueba desde la consola del navegador:

```js
history.replaceState(null, '', '/p/U8DN'); abrirProductoDeLaUrl();
```

Esperado: se abre el modal del Ventilador recargable. Después:

```js
history.replaceState(null, '', '/p/ZZZZ'); abrirProductoDeLaUrl();
```

Esperado: aparece arriba la franja «Ese producto ya no está disponible…». Cierra el modal y comprueba
que la URL vuelve a `/`. **Apunta en el informe lo que viste.**

- [ ] **Paso 6: commit**

```bash
git add app.js
git commit -m "web: /p/<codigo> abre el detalle de ese producto"
```

---

### Task 6: los botones de compartir

**Archivos:**
- Modificar: `index.html:287` (dentro de `#modal-detalle`)
- Modificar: `estilos.css` (después de la regla `.modal-accion`, ~línea 691)
- Modificar: `app.js`

- [ ] **Paso 1: el marcado**

En `index.html`, justo **después** de `<div class="modal-accion" id="modal-accion"></div>`, añade:

```html
      <div class="compartir" id="modal-compartir">
        <span class="compartir-tit">Compartir este producto</span>
        <div class="compartir-botones">
          <button type="button" class="compartir-btn" id="compartir-wa">💬 WhatsApp</button>
          <button type="button" class="compartir-btn" id="compartir-fb">📘 Facebook</button>
          <button type="button" class="compartir-btn" id="compartir-link">🔗 Copiar enlace</button>
        </div>
        <p class="compartir-aviso" id="compartir-aviso" role="status" aria-live="polite"></p>
      </div>
```

- [ ] **Paso 2: los estilos**

En `estilos.css`, justo después de la línea `.modal-accion .add,.modal-accion .qty{width:100%}`, añade:

```css
/* ── Compartir (dentro del modal de detalle) ── */
.compartir{margin-top:var(--e4);padding-top:var(--e3);border-top:1px solid var(--border)}
.compartir-tit{display:block;font-size:var(--t-xs);color:var(--text-3);margin-bottom:var(--e1)}
.compartir-botones{display:flex;gap:var(--e1);flex-wrap:wrap}
.compartir-btn{
  display:inline-flex;align-items:center;gap:var(--e0);
  min-height:40px;padding:0 var(--e2);
  border:1px solid var(--border);border-radius:var(--radio-pill);
  background:var(--surface);color:var(--text);
  font-family:inherit;font-size:var(--t-sm);font-weight:600;line-height:1;cursor:pointer;
  transition:border-color var(--dur) var(--ease), background-color var(--dur) var(--ease);
}
.compartir-btn:hover{border-color:var(--brand);background:var(--brand-soft)}
.compartir-aviso{min-height:18px;margin:var(--e1) 0 0;font-size:var(--t-xs);color:var(--text-2)}
```

- [ ] **Paso 3: la lógica**

En `app.js`, justo después de la función `abrirProductoDeLaUrl` que añadiste en la Tarea 5, añade:

```js
// ── Compartir un producto ──
// OJO, duplicacion consciente: api/_og.js tiene su propio precioTexto() para la
// tarjeta de Facebook. Son dos entornos (navegador aqui, Node alli) y no hay forma
// de compartir codigo sin montar un empaquetador. Si cambias el formato aqui,
// cambialo alli tambien.
function precioTexto(p) {
  const usd = '$' + p.precioUSD + ' USD';
  const cup = fmt(p.precioCUP) + ' CUP';
  const esUsd = p.moneda === 'usd';
  const base = (esUsd ? usd : cup) + ' · ' + (esUsd ? cup : usd);
  if (!p.enOferta) return base;
  const antes = esUsd ? '$' + p.precioNormalUSD : fmt(p.precioNormalCUP) + ' CUP';
  return 'Oferta ' + base + ' (antes ' + antes + ')';
}

// location.origin y no el dominio fijo: asi funciona igual en los despliegues de
// prueba de Vercel. El ?ref= viaja solo si el gestor es uno de verdad del catalogo.
function urlProducto(p) {
  const v = resolverVendedor();
  return location.origin + '/p/' + String(p.codigo).toUpperCase() +
         (v ? '?ref=' + encodeURIComponent(v.code) : '');
}

function textoCompartir(p, url) {
  const lineas = ['*' + p.name + '*', precioTexto(p)];
  if (p.envio && p.envio.corto) lineas.push(p.envio.corto);
  lineas.push('', url);
  return lineas.join('\n');
}

let temporizadorAvisoCompartir = null;
function avisoCompartir(texto) {
  const el = document.getElementById('compartir-aviso');
  if (!el) return;
  el.textContent = texto;
  clearTimeout(temporizadorAvisoCompartir);
  temporizadorAvisoCompartir = setTimeout(() => { el.textContent = ''; }, 3000);
}

function copiarAlPortapapeles(texto) {
  try {
    if (!navigator.clipboard) return Promise.resolve(false);
    return navigator.clipboard.writeText(texto).then(() => true, () => false);
  } catch (e) { return Promise.resolve(false); }
}

function compartirWhatsApp() {
  const p = productoDe(productoModal);
  if (!p) return;
  const url = urlProducto(p);
  // wa.me SIN numero: WhatsApp pregunta a quien, y el gestor elige chat, grupo o estado.
  window.open('https://wa.me/?text=' + encodeURIComponent(textoCompartir(p, url)), '_blank', 'noopener');
}

function compartirFacebook() {
  const p = productoDe(productoModal);
  if (!p) return;
  const url = urlProducto(p);
  // El orden importa y no es casual:
  // 1) la copia se LANZA ya, mientras el documento sigue enfocado (si se hiciera
  //    despues de abrir la ventana, el portapapeles falla por falta de foco);
  // 2) la ventana se abre SIN await delante — un await aqui la convierte en
  //    emergente bloqueada (mismo motivo que el comentario de revalidarCierre);
  // 3) el aviso se pinta cuando la promesa termine.
  // Facebook no deja rellenar el texto de la publicacion desde fuera (quito el
  // parametro quote), por eso se copia para que el gestor solo pegue.
  const copia = copiarAlPortapapeles(textoCompartir(p, url));
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
  copia.then((ok) => avisoCompartir(ok
    ? 'Texto copiado — pégalo en tu publicación'
    : 'No se pudo copiar: escribe tu texto en Facebook'));
}

function compartirEnlace() {
  const p = productoDe(productoModal);
  if (!p) return;
  copiarAlPortapapeles(urlProducto(p))
    .then((ok) => avisoCompartir(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'));
}
```

- [ ] **Paso 4: engancha los clics**

En `iniciar()`, justo después de la línea
`document.getElementById('modal-fondo').addEventListener('click', cerrarDetalle);`, añade:

```js
  document.getElementById('compartir-wa').addEventListener('click', compartirWhatsApp);
  document.getElementById('compartir-fb').addEventListener('click', compartirFacebook);
  document.getElementById('compartir-link').addEventListener('click', compartirEnlace);
```

- [ ] **Paso 5: limpia el aviso al abrir otro producto**

En `abrirDetalle`, justo después de la línea
`document.getElementById('modal-accion').innerHTML = accionHtml(id, null);`, añade:

```js
  const avisoComp = document.getElementById('compartir-aviso');
  if (avisoComp) avisoComp.textContent = '';   // no arrastrar el «copiado» del producto anterior
```

- [ ] **Paso 6: pruébalo en el navegador**

Con `http://localhost:8123` abierto:
1. Abre un producto en oferta. Debajo del botón de añadir tienen que verse los tres botones.
2. **Copiar enlace** → sale «Enlace copiado» y desaparece a los 3 segundos. Pega en un bloc: tiene que
   ser `http://localhost:8123/p/<CODIGO>`.
3. En la consola: `localStorage.setItem('ref','5D9K9')`, recarga, abre el producto y vuelve a copiar.
   Ahora el enlace tiene que acabar en `?ref=5D9K9`.
4. **WhatsApp** → se abre `web.whatsapp.com`/`wa.me` con el texto ya puesto (nombre en negrita,
   precio, mensajería y enlace). No hace falta enviarlo.
5. **Facebook** → se abre el diálogo de compartir de Facebook **y** sale «Texto copiado». Pega en un
   bloc para comprobar el texto. No publiques nada.
6. Mira la consola: **cero errores de CSP**.
7. Comprueba el modo oscuro (en las herramientas del navegador, emular `prefers-color-scheme: dark`):
   los botones tienen que seguir leyéndose.
8. A 375 px de ancho: los tres botones caben o se reparten en dos filas, sin desbordar.

**Haz una captura del modal con los tres botones** y guárdala en `docs/informes/`.

- [ ] **Paso 7: commit**

```bash
git add index.html estilos.css app.js
git commit -m "web: botones de compartir por WhatsApp y Facebook en el detalle"
```

---

### Task 7: despliegue y verificación en producción

**Esta tarea la ejecuta el piloto con Ruth delante.** Cada push despliega en producción: no se hace
sin avisar.

- [ ] **Paso 1: la batería completa, antes de nada**

```bash
node --test test/
```

Esperado: `# pass 25`, `# fail 0`. **Si algo falla, no se despliega.**

- [ ] **Paso 2: push**

```bash
git push origin main
```

Vercel despliega solo. Espera a que termine (1-2 minutos).

- [ ] **Paso 3: las etiquetas, que es lo que lee el robot**

```bash
curl -s https://www.3bqba.com/p/U8DN | findstr "og:title og:description og:image og:url"
```

Esperado: las cuatro con los datos del **Ventilador recargable**, no los de la tienda.
Si salieran los de la tienda, la causa más probable es que `includeFiles` no llevó los archivos a la
función: aplica el **plan B** de la spec §6 (leerlos por HTTP con `process.env.VERCEL_URL`) y deja
escrito en el informe que se usó el plan B.

- [ ] **Paso 4: el ref sobrevive a la reescritura**

```bash
curl -s "https://www.3bqba.com/p/U8DN?ref=5D9K9" | findstr og:url
```

Esperado: `<meta property="og:url" content="https://www.3bqba.com/p/U8DN?ref=5D9K9">`.
Si el `ref` no aparece, **no es un fallo bloqueante**: anótalo en el informe (la atribución del gestor
sigue funcionando porque `codigoDeLaUrl()` lo lee en el navegador).

- [ ] **Paso 5: las cabeceras de seguridad siguen puestas**

```bash
curl -I https://www.3bqba.com/p/U8DN
```

Esperado: `HTTP/1.1 200`, y entre las cabeceras `Content-Security-Policy`, `X-Content-Type-Options`,
`X-Frame-Options` y `Referrer-Policy`. Si **no** aparecen, la función tiene que ponerlas ella: copia
los cuatro valores del bloque `headers` de `vercel.json` a `res.setHeader(...)` en `api/producto.js`,
con su comentario explicando por qué.

- [ ] **Paso 6: no se rompió nada**

```bash
curl -s -o nul -w "%{http_code} " https://www.3bqba.com/ ; curl -s -o nul -w "%{http_code} " https://www.3bqba.com/taxi ; curl -s -o nul -w "%{http_code} " https://www.3bqba.com/5D9K9 ; curl -s -o nul -w "%{http_code}\n" https://www.3bqba.com/catalogo.json
```

Esperado: `200 200 200 200`.

- [ ] **Paso 7: la tarjeta de verdad**

1. `https://developers.facebook.com/tools/debug/` → pega `https://www.3bqba.com/p/U8DN` →
   **Depurar**. Si enseña datos viejos, pulsa **Extraer nueva información**. Comprueba la foto, el
   título y la descripción. **Captura de pantalla al informe.**
2. Mándate el enlace a ti mismo por WhatsApp y comprueba la miniatura. **Captura al informe.**
3. Abre `https://www.3bqba.com/p/U8DN?ref=5D9K9` en el teléfono: tiene que abrirse la tienda con el
   modal del ventilador y, al cerrar, poner «Te atiende: Yasnaya».

- [ ] **Paso 8: los botones en producción, desde un teléfono**

Abre la tienda en el móvil, entra en un producto y prueba los tres botones. **Sin publicar nada en
Facebook**: basta con llegar al diálogo.

---

### Task 8: documentación y relevo

**Archivos:**
- Modificar: `README.md`
- Crear: `docs/informes/2026-10-10-compartir-producto-fb-wa.md`

- [ ] **Paso 1: documenta la ruta en el README**

Añade al `README.md`, justo antes de la sección `## Avisos`:

```markdown
## Enlaces de producto

`https://www.3bqba.com/p/<CODIGO>` abre la tienda con ese producto abierto (el `<CODIGO>` es el
corto de 4 letras del catálogo). Es el enlace que generan los botones de compartir del modal, y
lleva el `?ref=` del gestor si quien comparte tiene uno.

Esa ruta **no es un archivo**: la sirve `api/producto.js`, una función de solo lectura en Vercel que
devuelve el `index.html` de siempre con las etiquetas `og:` del producto cambiadas, porque Facebook
y WhatsApp no ejecutan JavaScript y leen el HTML tal como sale del servidor. Los marcadores
`<!-- og:inicio -->` / `<!-- og:fin -->` del `index.html` delimitan lo que se sustituye: si se
mueven o renombran, la función devuelve la página tal cual y se pierde la tarjeta del producto.

Si cambias el precio de un producto, los enlaces ya compartidos pueden seguir enseñando el precio
viejo en Facebook hasta que su caché se refresque. Se fuerza en
`developers.facebook.com/tools/debug` con «Extraer nueva información».

Pruebas: `node --test test/` desde la raíz del repo.
```

- [ ] **Paso 2: escribe el informe de relevo**

Crea `docs/informes/2026-10-10-compartir-producto-fb-wa.md` siguiendo el skill
`writing-handoff-reports`. Autocontenido, y con la **evidencia observada**: la salida real de
`node --test`, la salida real de los `curl`, y las capturas del depurador de Facebook y de WhatsApp.
Lo que no se haya ejecutado se marca literalmente **«⚠ NO VERIFICADO»**. Nada de resultados supuestos.

- [ ] **Paso 3: commit**

```bash
git add README.md docs/informes/2026-10-10-compartir-producto-fb-wa.md
git commit -m "docs: enlaces de producto e informe de la sesion"
git push origin main
```

---

## Repaso del plan contra la spec

| Requisito de la spec | Tarea |
|---|---|
| §5 ruta `/p/<codigo>` y reescritura antes del comodín | 4 |
| §5 aviso en `_redirects` | 4 |
| §6 contrato de la función (saneado, 200 siempre, marcadores, caché) | 2, 3 |
| §6 `includeFiles` y plan B | 4, 7 |
| §7 textos y precio de la tarjeta, imagen, `og:url` con `ref` | 1 |
| §8 enlace profundo, aviso de producto retirado, `replaceState` | 5 |
| §9 los tres botones, texto de WhatsApp, aviso, fallo del portapapeles | 6 |
| §10 verificación (1 pruebas, 2-4 curl, 5 cabeceras, 6 no regresión, 7 FB/WA, 8 navegador) | 1, 3, 6, 7 |
| §11 fuera de alcance | ninguna tarea lo toca |
