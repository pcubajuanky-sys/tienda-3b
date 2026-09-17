# Rediseño de la tienda 3B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar toda la tienda `3bqba.com` sobre un sistema de tokens y un único sistema de botones, subiendo el primer producto de 1.020 px a menos de 870 px en un celular de 375 px, sin cambiar ni la marca ni la lógica de negocio.

**Las cinco medidas que hay que batir** (tomadas en `https://www.3bqba.com/` a 375 px, tema claro, 224 productos, con los encargos **apagados**):

| Medida | Hoy | Objetivo |
|---|---|---|
| `.barra-fija` (sticky, siempre en pantalla) | 217 px | **≤ 160** |
| `.hero` | 395 px | **≤ 360** |
| `.categorias-3d-wrap` | 306 px | **≤ 270** |
| Primer producto en pantalla (`#mv-tira .card`) | 1.020 px | **≤ 870** |
| Primer producto del catálogo (`#grid .card`) | 1.618 px | **≤ 1.530** |

🔴 **Ojo al comparar:** el servidor de revisión de la Tarea 0 enciende los encargos, y la tarjeta de encargos suma unos 150 px que hoy no están en el sitio publicado (medido: `primerGrid` de partida en el servidor de revisión = **1.839**). Por eso el objetivo de `primerGrid` se mide **con los encargos encendidos** y 1.530 significa una rebaja real de ~300 px, no de 88.

🔴 **Objetivo revisado el 2026-09-16, a mitad de ejecución.** El primer número era 1.450 y era mío, no medido: no contaba con que la tarjeta de encargos se queda permanentemente en el flujo. Bajar de ~1.500 exigiría recortar «Los más vendidos» (que ya **es** producto) o la tarjeta de encargos (que el dueño quiere que se vea), y las dos cosas serían peores que el problema. **No sigas recortando para cuadrar un número: si `primerGrid` queda entre 1.450 y 1.530, está bien y se reporta tal cual.**

**Architecture:** Todo el rediseño vive en `estilos.css` (tokens + componentes) y en retoques puntuales de `index.html`, `mundos.js`, `app.js`, `encargos.js` y `taxi.css`. No se añade ninguna dependencia, ninguna webfont y ningún archivo nuevo al repo. El trabajo se hace en el worktree `C:\inventario\tienda-3b-rediseno`, rama `rediseno-2026-09`.

**Tech Stack:** HTML + CSS + JavaScript de navegador, sin build. Node solo para el servidor estático de revisión.

**Design doc:** `docs/superpowers/specs/2026-09-16-rediseno-tienda-3b-design.md` — **léelo entero antes de la Tarea 1.**

---

## Contexto que necesitas antes de tocar nada

- **Repo:** `C:\inventario\tienda-3b` es un clon de GitHub que Vercel despliega desde `main`. **Nunca trabajes ahí**: tu sitio es el worktree `C:\inventario\tienda-3b-rediseno` (Tarea 0).
- **Shell:** PowerShell 5.1 en Windows 11. No existen `&&`, `||`, `??` ni `?.`. Encadena con `; if ($?) { … }`. Rutas con espacios siempre entre comillas.
- **No hay suite de tests en este repo.** La verificación es visual y medida (sección 7 del design doc). Ninguna tarea se cierra sin la evidencia que pide su último paso.

### 🔴 Cuatro reglas que rompen producción si las incumples

1. **Nada de JavaScript inline nuevo.** La CSP (`vercel.json` y `_headers`) solo autoriza dos manejadores inline, por el sha256 de su texto exacto:
   - `imgFallback(this)` → `sha256-IgfvsMxU0cNd1rO/xYd7q/idqoiQwZM9Fab8C6FXfbM=` (en `app.js:385` y `app.js:805`)
   - `cat3dImgFallback(this)` → `sha256-VCRuweeAncgzJx/l38EeCb2/+3XWgxt5JBezOkk5E+w=` (en `app.js:224`)

   **No cambies ni un byte de esas dos cadenas y no añadas ningún `onclick=` / `onerror=` nuevo.** Todo evento nuevo va con `addEventListener`.
2. **No comitees `catalogo.json` ni `taxi.json`.** Stock+ los publica directo a `origin/main` por la API de GitHub. Si los comiteas desde la rama, pisas el catálogo real de la tienda. En cada commit usa rutas explícitas (`git add estilos.css index.html`), nunca `git add -A` ni `git add .`.
3. **No quites el `blur` del mosaico de la portada.** Está ahí para borrar las marcas de agua de algunas fotos de producto (informe del 2026-08-15).
4. **No añadas webfonts** (ni Google Fonts ni autoalojadas). La CSP no las deja y el público navega con datos móviles caros en Cuba.

---

## Task 0: Worktree y servidor de revisión

**Files:**
- Crear worktree: `C:\inventario\tienda-3b-rediseno`
- Crear (fuera del repo): `<scratchpad>\servir-rediseno.js`

- [ ] **Step 1: Crear la rama y el worktree**

```powershell
cd "C:\inventario\tienda-3b"; if ($?) { git fetch origin }
cd "C:\inventario\tienda-3b"; if ($?) { git worktree add -b rediseno-2026-09 "C:\inventario\tienda-3b-rediseno" origin/main }
```

Expected: `Preparing worktree (new branch 'rediseno-2026-09')` y `HEAD is now at …`.

- [ ] **Step 2: Escribir el servidor de revisión**

Va en el **scratchpad de la sesión, no en el repo** (el repo no lleva `.gitignore` y cualquier archivo suelto ahí acaba en un commit por error). Sirve el worktree en `http://localhost:4173` y, solo para poder revisar la sección de encargos, reescribe al vuelo `catalogo.json` poniendo los encargos en `pausado`.

```js
// servir-rediseno.js — servidor estático SOLO para revisar el rediseño en local.
// No forma parte del sitio: vive en el scratchpad y nunca se comitea.
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = 'C:\\inventario\\tienda-3b-rediseno';
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta === '/' || ruta === '') ruta = '/index.html';
  if (ruta === '/taxi') ruta = '/taxi.html';
  const archivo = path.join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end('no'); return; }

  // Encargos en PAUSADO, solo en local, para poder ver la tarjeta y el cartel
  // «Muy pronto» sin tocar Stock+ ni el catálogo publicado.
  if (ruta === '/catalogo.json') {
    let cat;
    try { cat = JSON.parse(fs.readFileSync(archivo, 'utf8')); }
    catch (e) { res.writeHead(500).end('catalogo.json ilegible'); return; }
    cat.tienda = cat.tienda || {};
    cat.tienda.encargosActivo = true;
    cat.encargos = {
      modo: 'pausado',
      cartel: { tipo: 'pronto', titulo: '🚀 Muy pronto', texto: 'Muy pronto podrás pedirnos lo que quieras de Shein y Temu. ¡Mantente visitándonos!' },
      comisionServicioPct: 10, anticipoPct: 50, anticipoBase: 'global', pesoMinimoLb: 1,
      tipos: [{ id: 'ropa', nombre: 'Ropa', lb: 0.7 }],
      tarifas: { barco: [{ masDeLb: 0, usdLb: 4 }], avion: [{ masDeLb: 0, usdLb: 9 }] },
      control: [],
    };
    res.writeHead(200, { 'Content-Type': TIPOS['.json'], 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(cat));
    return;
  }

  fs.readFile(archivo, (err, buf) => {
    if (err) { res.writeHead(404).end('no existe'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}).listen(4173, () => console.log('Rediseño en http://localhost:4173'));
```

- [ ] **Step 3: Arrancarlo y comprobar que el sitio carga**

```powershell
node "<scratchpad>\servir-rediseno.js"
```

Expected en consola: `Rediseño en http://localhost:4173`. Abre `http://localhost:4173` y comprueba que se ven productos y que **la consola del navegador no tiene ni un error**. Déjalo corriendo el resto del plan.

- [ ] **Step 4: Tomar la medida de partida**

En la consola del navegador, con el viewport a 375 px:

```js
const t=(s)=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().top+scrollY):null};
const h=(s)=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().height):null};
({barraFija:h('.barra-fija'), hero:h('.hero'), cats:h('.categorias-3d-wrap'), primerMV:t('#mv-tira .card'), primerGrid:t('#grid .card')})
```

Anota el resultado: es contra el que se compara al final. En el sitio publicado (encargos apagados) da `{barraFija:217, hero:395, cats:306, primerMV:1020, primerGrid:1618}`; en el servidor de revisión `primerGrid` saldrá ~150 px más alto porque la tarjeta de encargos está encendida.

---

## Task 1: Tokens del sistema

**Files:** `estilos.css:3-45` (los dos bloques `:root`)

- [ ] **Step 1: Sustituir el `:root` claro**

Sustituye el bloque `:root{ … }` de `estilos.css:3-26` (desde `/* Claro */` hasta el `}` que cierra, el que contiene `--dur: .2s;`) por:

```css
:root{
  /* Claro */
  --bg:        #FAF7F5;
  --surface:   #FFFFFF;
  --surface-2: #F3EDEA;
  --text:      #1C1A22;
  --text-2:    #5C5560;
  --text-3:    #857D89;
  --border:    #E9E0DB;
  --brand:     #7A2E5D;
  --brand-ink: #FFFFFF;
  --brand-soft:#F7E9F2;
  --brand-hondo:#4E1D3B;
  --oferta:    #C81E4C;
  --wa:        #128C7E;

  /* Portada: tonos PROPIOS que NO se invierten en oscuro. Sin esto, --brand
     pasa a rosa claro en modo oscuro y la portada entera se vuelve rosa chicle. */
  --hero-1:    #8C3A6D;
  --hero-2:    #4E1D3B;
  --hero-ink:  #FFFFFF;

  /* Escala de espaciado. Antes había 40+ números sueltos y cada pieza nueva
     llegaba con medidas propias: esa era la causa de que los dos botones de la
     portada no se parecieran. */
  --e0:4px; --e1:8px; --e2:12px; --e3:16px; --e4:24px; --e5:32px; --e6:48px; --e7:64px;

  /* Escala tipográfica */
  --t-xs:12px; --t-sm:13px; --t-md:15px; --t-lg:17px;
  --t-xl: clamp(19px,2.6vw,22px);
  --t-2xl:clamp(22px,3.4vw,28px);
  --t-3xl:clamp(30px,6vw,46px);

  --radio-control: 12px;
  --radio-card: 16px;
  --radio-hoja: 22px;
  --radio-pill: 999px;

  /* Tres niveles, no uno. La sombra única de antes (blur 24px) se aplicaba
     igual a una tarjeta de producto que a una hoja modal, y en una parrilla de
     224 tarjetas eso ensucia el fondo. */
  --sombra-1: 0 1px 2px rgba(28,26,34,.05);
  --sombra-2: 0 2px 6px rgba(28,26,34,.08), 0 10px 24px rgba(28,26,34,.10);
  --sombra-3: 0 -2px 8px rgba(28,26,34,.06), 0 18px 48px rgba(28,26,34,.20);
  /* Alias: las reglas que aún no se han migrado siguen funcionando. */
  --sombra: var(--sombra-1);

  --header-h: 60px;
  --header-h-compacta: 52px;
  --dur: .2s;
  --dur-lento: .32s;
  --ease: cubic-bezier(.2,.7,.3,1);
}
```

- [ ] **Step 2: Añadir las sombras de oscuro**

Dentro del bloque `@media (prefers-color-scheme: dark){ :root{ … } }`, **justo antes** de la línea `    --wa:        #25D366;`, inserta:

```css
    /* Sobre fondo oscuro una sombra gris no se ve: solo funciona el negro. Los
       tokens --hero-* NO se redefinen aquí a propósito (ver :root claro). */
    --sombra-1: 0 1px 2px rgba(0,0,0,.40);
    --sombra-2: 0 2px 6px rgba(0,0,0,.45), 0 10px 24px rgba(0,0,0,.50);
    --sombra-3: 0 -2px 8px rgba(0,0,0,.40), 0 18px 48px rgba(0,0,0,.60);
```

- [ ] **Step 3: Comprobar que nada se rompió**

Recarga `http://localhost:4173`. Expected: el sitio se ve **prácticamente igual que antes** (solo cambian los radios de 10 a 12 px y las sombras, que se suavizan). Consola: **0 errores**.

- [ ] **Step 4: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: escala de espaciado, tipografia, radios y tres niveles de sombra" }
```

---

## Task 2: Un solo sistema de botones (resuelve la queja del dueño)

**Files:** `estilos.css` (bloque nuevo + sustituciones), `index.html:hero-acciones`

- [ ] **Step 1: Añadir el bloque de botones**

Insértalo en `estilos.css` **justo después** de la regla `:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:4px}` (alrededor de la línea 68) y **antes** de `/* ── Cabecera ── */`:

```css
/* ── Botones: UN solo sistema ──────────────────────────────────────────────
   .btn fija altura, radio, relleno, letra y transición. Los modificadores solo
   cambian el RELLENO y el COLOR. Así «Ver el catálogo» y «Hacer un encargo»
   son el mismo botón con distinto peso — que es lo que los distingue, no un
   tamaño distinto. Antes .hero-cta y .hero-cta-encargos vivían a 800 líneas de
   distancia con paddings distintos (12px 26px vs 10px 24px) y se leían como
   dos componentes de dos sistemas diferentes. */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--e1);
  min-height:48px;padding:0 var(--e4);
  border:1px solid transparent;border-radius:var(--radio-control);
  font-family:inherit;font-size:var(--t-md);font-weight:700;line-height:1.1;
  text-decoration:none;cursor:pointer;
  transition:background-color var(--dur) var(--ease), border-color var(--dur) var(--ease),
             box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease);
}
.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:3px solid currentColor;outline-offset:3px}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.btn-bloque{width:100%}

.btn-primario{background:var(--brand);color:var(--brand-ink)}
.btn-primario:hover{box-shadow:var(--sombra-2)}

.btn-wa{background:var(--wa);color:#fff}
.btn-wa:hover{box-shadow:var(--sombra-2)}

/* Los dos de la portada. Mismo alto, mismo radio, mismo relleno, misma letra.
   Contraste medido sobre el velo de la portada: 7,1:1 el sólido y 8,1:1 el de
   cristal (el relleno del segundo es NEGRO translúcido, no blanco: con blanco
   al 14% el texto blanco caía a 3,8:1 y no llegaba al mínimo de 4,5:1). */
.btn-contraste{background:var(--surface);color:var(--brand)}
.btn-contraste:hover{box-shadow:var(--sombra-2)}
.btn-contraste-linea{
  background:rgba(0,0,0,.18);color:var(--hero-ink);border-color:rgba(255,255,255,.8);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
}
.btn-contraste-linea:hover{background:rgba(0,0,0,.30);border-color:#fff}

.btn-suave{background:var(--surface);color:var(--text);border-color:var(--border)}
.btn-suave:hover{border-color:var(--brand);color:var(--brand)}

.btn-texto{
  min-height:36px;padding:0 var(--e1);background:none;border-color:transparent;
  color:var(--text-2);font-size:var(--t-xs);font-weight:600;
  text-decoration:underline;text-underline-offset:2px;
}
.btn-texto:hover{color:var(--oferta)}

@media (prefers-reduced-motion:reduce){
  .btn{transition:none}
  .btn:active{transform:none}
}
```

- [ ] **Step 2: Apoyar los botones existentes en `.btn`**

Sustituciones exactas en `estilos.css`:

(a) `.hero-cta{ … }` (la regla completa, ~línea 158) pasa a:
```css
/* Hereda todo de .btn; aquí solo queda lo propio de la portada. */
.hero-cta{max-width:100%}
```

(b) `.btn-secundario{ … }` (la regla completa, ~línea 500) pasa a:
```css
.btn-secundario{min-height:44px;padding:0 var(--e4)}
```

(c) `.add{ … }` (la regla completa, ~línea 462) pasa a:
```css
.add{width:100%;min-height:44px;padding:0 var(--e1);font-size:var(--t-sm)}
```

(d) `.btn-vaciar{ … }` (la regla completa) pasa a:
```css
.btn-vaciar{margin:2px 0 6px}
```

(e) `#btn-lateral-pedir{ … }` (la regla completa) pasa a:
```css
#btn-lateral-pedir{width:100%;min-height:44px;font-size:var(--t-sm);margin-top:var(--e1)}
```

(f) `.btn-enviar{ … }` (la regla completa) pasa a:
```css
.btn-enviar{width:100%;font-size:var(--t-lg);margin-top:var(--e0)}
```

(g) `.cta-comi-btn{ … }` (la regla completa) pasa a:
```css
.cta-comi-btn{flex:none;background:var(--brand-ink);color:var(--brand)}
```

(h) `.comi-wa{ … }` (la regla completa) pasa a:
```css
.comi-wa{width:100%;border-bottom:4px solid rgba(0,0,0,.22)}
```
y borra la regla `.comi-wa:active{transform:translateY(2px);border-bottom-width:2px}` (ya la cubre `.btn:active`).

(i) `.enc-cta-accion{ … }` (la regla completa) pasa a:
```css
.enc-cta-accion{grid-column:1/-1}
```

(j) `.barra-movil button{ … }` (la regla completa) pasa a:
```css
.barra-movil button{min-height:44px;background:var(--brand-ink);color:var(--brand);font-size:var(--t-sm)}
```

- [ ] **Step 3: Poner las clases en el HTML**

En `index.html`, sustituye el bloque `.hero-acciones` por:

```html
    <div class="hero-acciones">
      <a href="#catalogo" class="btn btn-contraste hero-cta">Ver el catálogo</a>
      <a href="#encargos" class="btn btn-contraste-linea hero-cta" id="hero-encargos" hidden>Hacer un encargo</a>
    </div>
```

Y en el resto de `index.html`, añade la clase `btn` + su modificador a cada botón (mantén las clases que ya tienen):

| Selector en `index.html` | Clases finales |
|---|---|
| `#btn-cats-ver-todas` | `class="btn btn-suave btn-secundario"` |
| `#btn-ver-todo` | `class="btn btn-suave btn-secundario"` |
| `#btn-reintentar` | `class="btn btn-suave btn-secundario"` |
| `#btn-cerrar-carrito-2` | `class="btn btn-suave btn-secundario"` |
| `#btn-vaciar-lateral`, `#btn-vaciar-panel` | `class="btn btn-texto btn-vaciar"` |
| `#btn-lateral-pedir` | `class="btn btn-wa"` |
| `#btn-enviar` | `class="btn btn-wa btn-enviar"` |
| `#comi-wa` | `class="btn btn-wa comi-wa"` |
| `#btn-ver-pedido` | `class="btn"` |

- [ ] **Step 4: Las clases que pinta el JavaScript**

Hay botones que no están en el HTML sino que los arma `app.js`. Cambia **solo la lista de clases**, sin tocar el texto ni la lógica:

- `app.js` → `accionHtml()`: donde ponga `class="add"`, déjalo en `class="btn btn-primario add"`.
- `app.js` → `tarjetaComisionistaHtml()`: donde ponga `class="cta-comi-btn"`, déjalo en `class="btn cta-comi-btn"`.
- `app.js` → `renderGrid()` / estados: cualquier `class="btn-secundario"` pasa a `class="btn btn-suave btn-secundario"`.
- `encargos.js` → `pintarTarjeta()`: `class="enc-cta-accion"` pasa a `class="btn btn-primario enc-cta-accion"`.
- `encargos.js`: cualquier botón del formulario con `class="btn-secundario"` pasa a `class="btn btn-suave btn-secundario"`, y el de enviar por WhatsApp a `class="btn btn-wa"`.

Localízalos con:
```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { Select-String -Path app.js,encargos.js -Pattern 'class="(add|btn-secundario|cta-comi-btn|enc-cta-accion|comi-wa|btn-enviar)' }
```

🔴 Recuerda: **no toques las cadenas `onerror="imgFallback(this)"` ni `onerror="cat3dImgFallback(this)"`.**

- [ ] **Step 5: Verificar los dos botones de la portada**

Recarga y, con el viewport a 375 px, en la consola del navegador:

```js
const a=document.querySelector('.hero-cta:not(#hero-encargos)').getBoundingClientRect();
const b=document.getElementById('hero-encargos').getBoundingClientRect();
({altoIgual: Math.round(a.height)===Math.round(b.height), a:Math.round(a.height), b:Math.round(b.height)})
```

Expected: `{altoIgual:true, a:48, b:48}`. Si `#hero-encargos` sale `hidden`, es que el servidor de revisión no está inyectando los encargos: revisa la Tarea 0 Step 2.

Comprueba también que la consola sigue con **0 errores** y que no aparece ningún error de CSP.

- [ ] **Step 6: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css index.html app.js encargos.js; git commit -m "rediseno: un solo sistema de botones; los dos de la portada quedan iguales" }
```

---

## Task 3: Cabecera y franja de socios (fuera el globo)

**Files:** `index.html`, `taxi.html`, `mundos.js`, `estilos.css`

Decisión del dueño (2026-09-16): **franja fina de una línea + aro que late; fuera el globo.** Esto revierte en parte la decisión del 2026-09-13 que está comentada en `mundos.js` — actualiza ese comentario, no lo dejes mintiendo.

- [ ] **Step 1: Quitar el globo del HTML**

En `index.html` **y** en `taxi.html`, borra la línea del globo:

```html
        <span class="mundos-globo" id="mundos-globo" hidden>👈 Toca nuestros<br>otros negocios</span>
```

(en `taxi.html` el texto puede variar; borra el `<span>` completo con `id="mundos-globo"`).

- [ ] **Step 2: Quitar el globo de `mundos.js`**

Sustituye el comentario de cabecera y la función `refrescar` de `mundos.js` por:

```js
// El aviso NO se recuerda ni se apaga: sale en todas las visitas. Lo único que
// lo esconde es que no haya ningún otro negocio que enseñar.
// 2026-09-16: el globo «👈 Toca nuestros otros negocios» se retiró. Anunciaba lo
// mismo que la franja y que el aro que late sobre el logo del socio, y se comía
// 82 px de la cabecera pegada en un celular de 375 px. Quedan los otros dos.
```

```js
  function refrescar() {
    var franja = document.getElementById('promo-mundos');
    if (!franja) return;
    franja.hidden = !hayOtrosNegocios();
  }
```

- [ ] **Step 3: Quitar el CSS del globo**

En `estilos.css`, borra estas tres reglas completas: `.mundos-globo{ … }`, `.mundos-globo::before{ … }`, `@media (min-width:600px){ .mundos-globo{ … } }`, el `@keyframes latido-globo{ … }` y el bloque `@media (prefers-reduced-motion:reduce){ .mundos-globo{animation:none} }`. Borra también el comentario que los explicaba («Globo pegado a los logos…» y «El globo late despacio…»).

- [ ] **Step 4: Franja fina de una línea**

Sustituye:
```css
.promo-mundos{background:var(--brand);color:var(--brand-ink)}
.promo-mundos .promo-linea{font-size:15px}
@media (min-width:600px){ .promo-mundos .promo-linea{font-size:16px} }
```
por:
```css
/* Una sola línea y en tono suave, no morado sólido: es un recordatorio, no un
   anuncio. Antes medía 59px de alto en 2 líneas y, con el globo, la barra
   pegada llegaba a 217px — el 27% de la pantalla de un celular, siempre.
   Contraste --brand sobre --brand-soft: 7,5:1 en claro y 8,4:1 en oscuro. */
.promo-mundos{background:var(--brand-soft);color:var(--brand);padding:var(--e0) var(--e3)}
.promo-mundos .promo-linea{
  font-size:var(--t-sm);font-weight:600;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
```

- [ ] **Step 5: Acortar el texto de la franja**

En `index.html` (y en `taxi.html` si lleva el suyo), sustituye el texto de `.promo-linea` dentro de `#promo-mundos` por:

```html
      <p class="promo-linea">3B es más de un negocio — toca los logos 👆</p>
```

- [ ] **Step 6: Apretar la cabecera**

Sustituye:
```css
.header-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}
.header.compacta .header-top{padding:8px 16px}
```
por:
```css
.header-top{display:flex;align-items:center;justify-content:space-between;gap:var(--e2);padding:var(--e1) var(--e3)}
.header.compacta .header-top{padding:var(--e0) var(--e3)}
```
y:
```css
.header-buscador{padding:0 16px 12px}
```
por:
```css
.header-buscador{padding:0 var(--e3) var(--e1)}
```

Y baja el logo grande de 3B, que es lo que marca el alto de la cabecera:
```css
.mundo-3b{width:74px;height:74px}
@media (min-width:600px){ .mundo-3b{width:88px;height:88px} }
```
pasa a:
```css
/* Sigue siendo el más grande (es la marca paraguas), pero 74px en una cabecera
   pegada son 74px que el cliente pierde en TODA la página. */
.mundo-3b{width:56px;height:56px}
@media (min-width:600px){ .mundo-3b{width:68px;height:68px} }
```
y:
```css
.mundo{ … width:52px;height:52px; … }
@media (min-width:600px){ .mundo{width:62px;height:62px} }
```
pasa a `width:44px;height:44px` (sigue cumpliendo el mínimo táctil de 44 px) y `@media (min-width:600px){ .mundo{width:52px;height:52px} }`.

- [ ] **Step 7: Banner de mensajería en una línea**

El banner `#promo-envio` mide 71 px porque apila una línea en negrita y otra de letra fina. La letra fina («Aplica a nuestras zonas de reparto habituales…») es una condición, no un reclamo: se queda, pero sin ocupar una segunda banda por encima del catálogo.

Sustituye:
```css
.promo{
  position:relative;overflow:hidden;
  background:var(--brand-soft);color:var(--brand);padding:10px 16px;text-align:center;
}
```
por:
```css
.promo{
  position:relative;overflow:hidden;
  background:var(--brand-soft);color:var(--brand);padding:var(--e1) var(--e3);text-align:center;
}
```
y:
```css
.promo-linea{font-size:14px;font-weight:700;max-width:1180px;margin:0 auto;line-height:1.3}
.promo-fina{
  font-size:11px;font-weight:500;color:var(--text-2);max-width:1180px;
  margin:4px auto 0;opacity:.9;line-height:1.3;
}
```
por:
```css
.promo-linea{font-size:var(--t-sm);font-weight:700;max-width:1180px;margin:0 auto;line-height:1.35}
.promo-fina{
  font-size:var(--t-xs);font-weight:500;color:var(--text-2);max-width:1180px;
  margin:var(--e0) auto 0;opacity:.9;line-height:1.3;
}
```

- [ ] **Step 8: Medir**

Recarga a 375 px y en la consola:

```js
const h=(s)=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().height):null};
({barraFija:h('.barra-fija'), franja:h('#promo-mundos'), header:h('.header'), promoEnvio:h('#promo-envio'), globo:document.getElementById('mundos-globo')})
```

Expected: `barraFija` **≤ 160** (venía de 217), `franja` ≤ 34, `promoEnvio` **≤ 70** (venía de 71), `globo` **null**. Consola con 0 errores.

Sobre `promoEnvio`: la letra fina («Aplica a nuestras zonas de reparto habituales…») envuelve a dos líneas a 375 px y por eso el banner no baja de ~69 px. **Ese texto es del dueño y viene del panel de Stock+ (`tienda.envioGratisTexto`), no del código: no lo acortes tú.** Si el dueño quiere el banner de una sola línea, lo acorta él en el panel.

- [ ] **Step 9: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css index.html taxi.html mundos.js; git commit -m "rediseno: cabecera mas baja, franja de socios de una linea, fuera el globo" }
```

---

## Task 4: Portada

**Files:** `estilos.css` (bloque `/* ── Portada ── */`)

- [ ] **Step 1: Fondo y velo**

Sustituye:
```css
.hero{
  position:relative;overflow:hidden;
  background:linear-gradient(155deg, var(--brand) 0%, var(--brand) 45%, var(--surface-2) 100%);
  color:var(--brand-ink);
}
```
por:
```css
/* Dos tonos de marca, no un degradado que muere en gris rosado. Los tokens
   --hero-* no se invierten en modo oscuro: la portada se ve igual en los dos. */
.hero{
  position:relative;overflow:hidden;
  background:linear-gradient(160deg, var(--hero-1) 0%, var(--hero-2) 100%);
  color:var(--hero-ink);
}
```

Sustituye:
```css
.hero-mosaico{
  position:absolute;inset:0;display:grid;
  grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,1fr);
  gap:2px;opacity:.55;filter:blur(2px) saturate(.8);
}
```
por:
```css
/* brightness(.75) es la pieza clave: le pone TECHO a lo claro que puede llegar
   a ser un trozo de foto. Antes el contraste del titular dependía de qué fotos
   tocaran ese día (una foto sobre fondo blanco lo bajaba a ~3,2:1); ahora el
   peor caso está calculado y da 8,2:1. El blur se queda: borra las marcas de
   agua de algunas fotos de producto (informe 2026-08-15). */
.hero-mosaico{
  position:absolute;inset:0;display:grid;
  grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,1fr);
  gap:2px;opacity:.42;filter:blur(2px) saturate(.85) brightness(.75);
}
```

Sustituye:
```css
.hero-velo{
  position:absolute;inset:0;
  background:linear-gradient(155deg, var(--brand) 0%, var(--brand) 58%, var(--surface-2) 100%);
  opacity:.64;
}
```
por:
```css
/* Velo VERTICAL en vez de un velo plano que repetía el fondo: denso donde va el
   texto, más fino en el centro, para que la foto se intuya sin pelearse con el
   titular. Peor caso medido: 8,2:1. */
.hero-velo{
  position:absolute;inset:0;
  background:linear-gradient(180deg,
    rgba(42,15,33,.86) 0%,
    rgba(42,15,33,.72) 40%,
    rgba(42,15,33,.80) 72%,
    rgba(42,15,33,.94) 100%);
}
```

- [ ] **Step 2: Contenido de la portada**

Sustituye el bloque desde `.hero-contenido{…}` hasta `.hero-datos li::before{…}` (ambos incluidos) por:

```css
.hero-contenido{position:relative;padding:var(--e5) var(--e3) var(--e4);text-align:center}
.hero-logo{display:flex;justify-content:center;margin-bottom:var(--e2)}
.hero-logo .logo-svg{height:clamp(44px,7vw,68px)}
.hero h1{
  font-size:var(--t-3xl);font-weight:800;letter-spacing:-.03em;line-height:1.02;
  max-width:18ch;margin:0 auto var(--e2);text-wrap:balance;
}
.hero-sub{font-size:var(--t-lg);max-width:42ch;margin:0 auto var(--e4);opacity:.92;line-height:1.45}
.hero-acciones{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--e2)}
/* Chips translúcidos en vez de ✓ sueltos: se leen como datos, no como una lista. */
.hero-datos{
  list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:var(--e1);
  margin-top:var(--e4);font-size:var(--t-xs);font-weight:600;
}
.hero-datos li{
  padding:var(--e0) var(--e2);border-radius:var(--radio-pill);
  background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);
}
```

- [ ] **Step 3: Escritorio más bajo**

Sustituye el `@media (min-width:1024px){ … }` de la portada por:

```css
@media (min-width:1024px){
  .hero-contenido{padding:var(--e4) var(--e3) var(--e4)}
  .hero-logo{margin-bottom:var(--e1)}
  .hero-logo .logo-svg{height:42px}
  .hero h1{font-size:34px;max-width:28ch;margin:0 auto var(--e2)}
  .hero-sub{margin:0 auto var(--e3)}
  .hero-datos{margin-top:var(--e3)}
}
```

- [ ] **Step 4: Borrar la regla huérfana**

En el bloque de la Fase C.2 (final del archivo) borra estas dos líneas, que ahora las cubre `.btn`:
```css
.hero-cta-encargos{background:transparent;color:inherit;border:2px solid currentColor;padding:10px 24px}
.hero-cta:focus-visible{outline:3px solid currentColor;outline-offset:3px}
```
y borra también `.hero-acciones{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}` de ese mismo bloque (ya se definió en el Step 2 con tokens). Deja el comentario del bloque actualizado a: `/* ── Encargos: cartel de pausa (Fase C.2) ── */`.

- [ ] **Step 5: Verificar contraste y altura**

A 375 px, en la consola:

```js
Math.round(document.querySelector('.hero').getBoundingClientRect().height)
```
Expected: **≤ 340** (venía de 395).

Y a ojo, en claro **y** en oscuro (`prefers-color-scheme`): el titular blanco tiene que leerse sin esfuerzo sobre cualquier zona de la portada, y la portada debe verse **ciruela profunda**, no rosa claro, en los dos temas.

- [ ] **Step 6: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: portada con tonos propios, velo vertical y contraste garantizado" }
```

---

## Task 4b: Bajar la portada de verdad (corrección del plan)

**Files:** `estilos.css`

Tras la Tarea 4, `.hero` midió **402 px** a 375 px — por encima incluso de los 395 de partida. La causa **no** fue un fallo de ejecución: el plan subía `.hero-sub` de 14 px a 17 px y convertía `.hero-datos` en chips con relleno y borde, y eso pesa más de lo que se ahorró en el relleno de `.hero-contenido`. Esta tarea lo corrige.

- [ ] **Step 1: Ajustar el titular**

En `:root`, sustituye `  --t-3xl:clamp(30px,6vw,46px);` por `  --t-3xl:clamp(28px,6vw,46px);`

- [ ] **Step 2: Ajustar el bloque de la portada**

Sustituciones exactas en el bloque `/* ── Portada ── */`:

- `.hero-contenido{position:relative;padding:var(--e5) var(--e3) var(--e4);text-align:center}`
  → `.hero-contenido{position:relative;padding:var(--e4) var(--e3) var(--e4);text-align:center}`
- `.hero-logo{display:flex;justify-content:center;margin-bottom:var(--e2)}`
  → `.hero-logo{display:flex;justify-content:center;margin-bottom:var(--e1)}`
- `.hero-sub{font-size:var(--t-lg);max-width:42ch;margin:0 auto var(--e4);opacity:.92;line-height:1.45}`
  → (dos reglas)
  ```css
  /* 15px en el celular y 17px a partir de tablet: a 17px el subtítulo envolvía
     a dos líneas largas y la portada crecía más de lo que se ahorraba arriba. */
  .hero-sub{font-size:var(--t-md);max-width:42ch;margin:0 auto var(--e3);opacity:.92;line-height:1.45}
  @media (min-width:760px){ .hero-sub{font-size:var(--t-lg)} }
  ```
- `  margin-top:var(--e4);font-size:var(--t-xs);font-weight:600;` (dentro de `.hero-datos`)
  → `  margin-top:var(--e3);font-size:var(--t-xs);font-weight:600;`
- `.hero-datos li{
  padding:var(--e0) var(--e2);border-radius:var(--radio-pill);`
  → `.hero-datos li{
  padding:2px var(--e2);border-radius:var(--radio-pill);`

- [ ] **Step 3: Bajar el logo de la portada**

Sustituye `.hero-logo .logo-img{height:clamp(56px,9vw,88px);width:clamp(56px,9vw,88px);border-radius:18px}`
por `.hero-logo .logo-img{height:clamp(48px,9vw,72px);width:clamp(48px,9vw,72px);border-radius:16px}`

- [ ] **Step 4: Borrar el comentario que ya miente**

Encima de `.hero-mosaico` quedó el comentario viejo que dice *«El velo (.hero-velo) repite encima el mismo degradado de marca…»*. Eso ya no es verdad: el velo es ahora un degradado vertical propio. Borra ese bloque de comentario entero (el que empieza por «Las fotos son textura de fondo…» y termina en «…ver informe.»), dejando solo el comentario nuevo de `brightness(.75)`, y añade dentro de él esta frase al final: `El mosaico se ve al .42 y el velo ya no repite el degradado del fondo: es vertical y propio.`

- [ ] **Step 5: Medir**

A 375 px:
```js
Math.round(document.querySelector('.hero').getBoundingClientRect().height)
```
Expected: **≤ 360** (venía de 402 tras la Tarea 4, y de 395 en el sitio publicado).

Comprueba además que el titular sigue sin cortarse y que la portada se ve ciruela profunda en claro **y** en oscuro.

- [ ] **Step 6: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: portada mas baja (correccion del plan)" }
```

---

## Task 4c: El botón principal de la portada se apaga en modo oscuro (corrección del plan)

**Files:** `estilos.css`

Encontrado en la revisión visual del piloto, con el rediseño ya terminado. **El contraste pasaba (9,06:1) pero la jerarquía estaba rota**, que es un fallo que ningún número detecta.

La portada es ciruela profunda en los dos temas (para eso están los tokens `--hero-*`), pero `.btn-contraste` se quedó colgando de `--surface` y `--brand`, que **sí** se invierten. Medido en modo oscuro: `background: rgb(30,24,34)` (casi negro) y `color: rgb(233,168,206)` (rosa). Resultado: «Ver el catálogo» pasa a ser una caja oscura sobre un fondo oscuro y **el botón secundario «Hacer un encargo» se ve más importante que el principal** — justo al revés de lo que se buscaba.

Es el mismo error que los tokens `--hero-*` vinieron a evitar; solo que no se extendió al botón.

- [ ] **Step 1: Tokens fijos para el botón de la portada**

En `:root`, justo debajo de `  --hero-ink:  #FFFFFF;`, añade:

```css
  /* El botón principal de la portada vive SIEMPRE sobre ciruela, así que su
     color no puede depender del tema. Con --surface/--brand se volvía una caja
     casi negra con letra rosa en modo oscuro y dejaba de leerse como el botón
     principal. Blanco sobre ciruela: 8,9:1. */
  --hero-btn-bg:  #FFFFFF;
  --hero-btn-ink: #7A2E5D;
```

🔴 **No los redefinas** en el bloque `@media (prefers-color-scheme: dark)`. Ese es justamente el punto.

- [ ] **Step 2: Usarlos**

Sustituye `.btn-contraste{background:var(--surface);color:var(--brand)}`
por `.btn-contraste{background:var(--hero-btn-bg);color:var(--hero-btn-ink)}`

- [ ] **Step 3: Comprobar en los DOS temas**

A 375 px, en claro y en oscuro:

```js
const g=(s,p)=>getComputedStyle(document.querySelector(s))[p];
({bg:g('.btn-contraste','backgroundColor'), color:g('.btn-contraste','color')})
```

Expected, **idéntico en los dos temas**: `{bg:"rgb(255, 255, 255)", color:"rgb(122, 46, 93)"}`.

Y míralo: en modo oscuro «Ver el catálogo» tiene que verse **blanco y sólido**, claramente por delante de «Hacer un encargo». Si el secundario sigue ganando, dilo.

- [ ] **Step 4: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: el boton principal de la portada ya no se apaga en modo oscuro" }
```

---

## Task 5: Categorías

**Files:** `estilos.css` (bloque `/* ── Categorías (círculos) ── */`), `app.js` (`CATS_VISIBLES_PLEGADO`)

- [ ] **Step 1: Apretar la tira**

Sustituye:
```css
.categorias-3d-wrap{padding:26px 0 4px}
.categorias-3d-titulo{font-size:clamp(19px,3vw,24px);font-weight:700;margin-bottom:2px}
```
por:
```css
.categorias-3d-wrap{padding:var(--e4) 0 var(--e0)}
.categorias-3d-titulo{font-size:var(--t-xl);font-weight:800;letter-spacing:-.01em;margin-bottom:0}
```

Sustituye `padding:16px 16px 22px;` dentro de `.categorias-3d{ … }` por `padding:var(--e2) var(--e3) var(--e3);` y `gap:14px` por `gap:var(--e2)`.

- [ ] **Step 2: Sombra de reposo más discreta**

En `.cat3d-inner{ … }`, sustituye
`box-shadow:0 2px 4px rgba(28,26,34,.12),0 6px 14px rgba(28,26,34,.10);`
por
`box-shadow:var(--sombra-1);border:1px solid var(--border);`

y en el bloque `@media (hover:hover) and (pointer:fine){ … }` sustituye
`box-shadow:0 4px 10px rgba(28,26,34,.16),0 10px 20px rgba(28,26,34,.14);`
por
`box-shadow:var(--sombra-2);`

- [ ] **Step 3: Aro de la categoría activa más fino**

Sustituye `.cat3d.on .cat3d-inner{box-shadow:0 0 0 3px var(--brand)}` por
`.cat3d.on .cat3d-inner{box-shadow:0 0 0 2px var(--brand), var(--sombra-2);border-color:var(--brand)}`

- [ ] **Step 4: Menos círculos en el móvil plegado**

En `app.js`, busca `CATS_VISIBLES_PLEGADO` y déjalo en `8`. En `estilos.css`, dentro de `@media (min-width:760px)`, sustituye
`#categorias-3d.plegada .cat3d:nth-child(n+13){display:none}`
por
`#categorias-3d.plegada .cat3d:nth-child(n+9){display:none}`

🔴 El número del `nth-child` es **`CATS_VISIBLES_PLEGADO + 1`**. Si cambias uno, cambia el otro o la tira y el botón «Ver todas» dejan de contar lo mismo.

- [ ] **Step 5: Verificar**

A 375 px: la tira debe seguir arrastrándose, el botón «Ver todas (24)» debe seguir ahí y al pulsarlo deben aparecer todas. Mide:
```js
Math.round(document.querySelector('.categorias-3d-wrap').getBoundingClientRect().height)
```
Expected: **≤ 270** (venía de 306). Consola: 0 errores.

- [ ] **Step 6: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css app.js; git commit -m "rediseno: categorias mas compactas y sombras del sistema" }
```

---

## Task 5b: Recuperar los 22 px que se comió «Ver todas» (corrección del plan)

**Files:** `estilos.css`

Tras la Tarea 5, `.categorias-3d-wrap` midió **292 px** en vez de ≤270. Causa medida: el botón «Ver todas (24)» pasó de ~36 px a **52 px** al heredar `.btn`/`.btn-secundario` en la Tarea 2. **No le bajes la altura por debajo de 44 px**: es el mínimo táctil y se respeta en todo el sitio. Los píxeles salen de los rellenos de alrededor, que hoy son generosos de más.

- [ ] **Step 1: Apretar los rellenos de la sección**

Sustituciones exactas:

- `.categorias-3d-wrap{padding:var(--e4) 0 var(--e0)}`
  → `.categorias-3d-wrap{padding:var(--e3) 0 0}`
- dentro de `.categorias-3d{ … }`, `padding:var(--e2) var(--e3) var(--e3);`
  → `padding:var(--e2) var(--e3) var(--e1);`
- `.categorias-ver-todas-wrap{display:block;text-align:center;padding:2px 16px 6px}`
  → `.categorias-ver-todas-wrap{display:block;text-align:center;padding:0 var(--e3)}`

- [ ] **Step 2: Medir**

A 375 px:
```js
Math.round(document.querySelector('.categorias-3d-wrap').getBoundingClientRect().height)
```
Expected: **≤ 270** (venía de 292). El botón «Ver todas» debe seguir midiendo **≥ 44 px** de alto — compruébalo:
```js
Math.round(document.getElementById('btn-cats-ver-todas').getBoundingClientRect().height)
```
Expected: **≥ 44**.

- [ ] **Step 3: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: recuperar el alto que gano Ver todas al unificar botones" }
```

---

## Task 6: Tarjetas de producto y parrilla

**Files:** `estilos.css`

- [ ] **Step 1: La tarjeta**

Sustituye la regla `.card{ … }` completa por:

```css
/* Sin sombra en reposo: con 224 tarjetas, una sombra de 24px de blur en cada
   una ensucia el fondo y se lee como algo de 2015. Borde fino en reposo,
   elevación solo al pasar por encima. */
.card{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radio-card);
  overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--sombra-1);
  text-align:left;cursor:pointer;position:relative;
  transition:transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.card:hover{transform:translateY(-2px);box-shadow:var(--sombra-2);border-color:var(--brand-soft)}
@media (prefers-reduced-motion:reduce){
  .card{transition:none}
  .card:hover{transform:none}
}
```

- [ ] **Step 2: Cuerpo, precios y sellos**

Sustituciones exactas:

- `.card .body{padding:11px;display:flex;flex-direction:column;gap:5px;flex:1}`
  → `.card .body{padding:var(--e2);display:flex;flex-direction:column;gap:var(--e0);flex:1}`
- `.card .nom{font-size:14px; …}` → el mismo bloque con `font-size:var(--t-sm);font-weight:700;`
- `.card .desc{font-size:12px; …}` → el mismo bloque con `font-size:var(--t-xs);`
- `.precio{font-size:17px;font-weight:800}`
  → `.precio{font-size:var(--t-lg);font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em}`
- `.tachado{font-size:11px; …}` → `font-size:var(--t-xs)` y añade `font-variant-numeric:tabular-nums`
- `.card-oferta{ … border-radius:6px}` → `border-radius:var(--radio-pill);padding:var(--e0) var(--e1)`
- `.card-mv{ … border-radius:6px}` → `border-radius:var(--radio-pill);padding:var(--e0) var(--e1)`
- `.card-accion{margin-top:8px}` → `.card-accion{margin-top:var(--e1)}`

- [ ] **Step 3: La parrilla**

Sustituye:
```css
.grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;
}
```
por:
```css
.grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(156px,1fr));gap:var(--e2);
}
@media (min-width:760px){ .grid{gap:var(--e3)} }
```

Y el encabezado:
```css
.grid-titulo{font-size:clamp(19px,3vw,24px);font-weight:700}
```
→
```css
.grid-titulo{font-size:var(--t-xl);font-weight:800;letter-spacing:-.01em}
```

- [ ] **Step 4: Verificar**

A 375 px deben seguir entrando **2 tarjetas por fila** sin scroll horizontal:
```js
({cols:getComputedStyle(document.getElementById('grid')).gridTemplateColumns, desborde: document.documentElement.scrollWidth > innerWidth})
```
Expected: dos medidas en `cols` y `desborde:false`.

- [ ] **Step 5: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: tarjetas sin sombra en reposo, precios tabulares y parrilla con tokens" }
```

---

## Task 7: Orden de la página

**Files:** `index.html`, `app.js`

Hoy los dos reclamos grandes («Gana dinero con 3B» y la tarjeta de encargos) se pintan entre «Los más vendidos» y la parrilla, y empujan el catálogo. El dueño quiere que **el de encargos se vea**; el de gestores puede ir después del catálogo.

- [ ] **Step 1: Mover el hueco de gestores debajo del catálogo**

En `index.html`, dentro de `<main class="wrap" id="catalogo">`, la línea:
```html
    <div id="cta-comi-hueco" hidden></div>
```
se **borra de donde está** (antes de `#cta-encargos-hueco`) y se **vuelve a poner justo después** de:
```html
    <div id="grid" class="grid" hidden></div>
```

Queda así el orden dentro de `<main>`: `#mas-vendidos` → `#cta-encargos-hueco` → `.grid-head` → `#skeleton` → `#grid` → `#cta-comi-hueco` → `#vacio` → `#error-carga`.

- [ ] **Step 2: Comprobar que `app.js` no asume la posición**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { Select-String -Path app.js -Pattern 'cta-comi-hueco' }
```

`app.js` lo rellena por `id` con `innerHTML`, así que moverlo en el HTML basta. **Si encuentras algún `insertBefore`, `nextSibling` o `parentNode` alrededor de ese id, PARA y avisa** — significa que la posición sí está codificada y hay que replantear el paso.

- [ ] **Step 3: Que el reclamo de gestores no compita**

`.cta-comi` es hoy un bloque morado sólido con borde inferior de 5 px. Ahora que va al final del catálogo, bájale el peso: en `estilos.css`, sustituye en `.cta-comi{ … }` el `padding:18px 20px;margin:4px 0;` por `padding:var(--e4);margin:var(--e4) 0 var(--e1);` y `border-bottom:5px solid var(--brand-hondo);` por `border-bottom:4px solid var(--brand-hondo);`.

- [ ] **Step 4: Medir el objetivo del plan**

A 375 px, recarga y ejecuta:

```js
const t=(s)=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().top+scrollY):null};
({primerMV:t('#mv-tira .card'), primerGrid:t('#grid .card')})
```

Expected, **en el servidor de revisión** (con los encargos encendidos): `primerMV` **≤ 870** (partía de 1020) y `primerGrid` **≤ 1530** (el de partida, medido en el mismo servidor, era 1839).

Si alguno sale por encima, no sigas: vuelve a medir las piezas de las Tareas 3, 4 y 5 con el bloque del Step 4 de la Tarea 0 y di **cuál** se quedó por encima de su objetivo, en vez de seguir recortando a ojo.

- [ ] **Step 5: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add index.html estilos.css; git commit -m "rediseno: encargos antes del catalogo, gestores despues" }
```

---

## Task 8: Carrito, panel, modales y formularios

**Files:** `estilos.css`

- [ ] **Step 1: Hojas y modales**

- `.modal-caja{ … box-shadow:var(--sombra)}` → `box-shadow:var(--sombra-3)`
- `.panel-caja{ … box-shadow:var(--sombra)}` → `box-shadow:var(--sombra-3)`, y `padding:18px` → `padding:var(--e4)`
- `.modal-fondo`, `.panel-fondo`: `background:rgba(20,16,23,.55)` → `background:rgba(20,16,23,.6);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)`
- `.modal-body{padding:20px}` → `.modal-body{padding:var(--e4)}`
- `.modal-cerrar{ … box-shadow:var(--sombra)}` → `box-shadow:var(--sombra-2)`
- `.modal-body h2{font-size:20px; …}` → `font-size:var(--t-2xl);font-weight:800;letter-spacing:-.01em;`
- `.modal-precio .precio{font-size:22px}` → `font-size:var(--t-2xl)`

- [ ] **Step 2: Carrito lateral**

En `.carrito-lateral{ … }` (dentro del `@media (min-width:1024px)`): `padding:16px` → `padding:var(--e3)`, `box-shadow:var(--sombra)` → `box-shadow:var(--sombra-1)`.
`.lateral-titulo{font-size:16px;font-weight:700;margin-bottom:10px}` → `font-size:var(--t-lg);font-weight:800;margin-bottom:var(--e2)`.

- [ ] **Step 3: Líneas del pedido**

- `.linea{ … padding:10px 0; … font-size:13px}` → `padding:var(--e2) 0` y `font-size:var(--t-sm)`
- `.linea img{width:44px;height:44px;border-radius:8px; …}` → `width:52px;height:52px;border-radius:var(--e2);`

- [ ] **Step 4: Campos del formulario**

Sustituye:
```css
.campo input,.campo textarea{
  width:100%;min-height:44px;padding:11px;border:1px solid var(--border);border-radius:var(--radio-control);
  font-size:15px;font-family:inherit;background:var(--surface);color:var(--text);
}
```
por:
```css
.campo input,.campo textarea{
  width:100%;min-height:48px;padding:var(--e2) var(--e3);
  border:1px solid var(--border);border-radius:var(--radio-control);
  font-size:var(--t-md);font-family:inherit;background:var(--surface);color:var(--text);
  transition:border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.campo input:focus,.campo textarea:focus,.campo select:focus{
  outline:none;border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft);
}
```
(el mismo `min-height:48px` y `padding` para `.campo select{ … }`).

🔴 `:focus-visible` global sigue existiendo y no se toca: este `:focus` **añade** el realce de marca, no lo sustituye.

- [ ] **Step 5: Verificar**

Abre el carrito con un producto dentro, en móvil y en escritorio, claro y oscuro. Comprueba que: la hoja se ve elevada sobre el fondo, los campos marcan el foco en morado, y el botón verde de WhatsApp sigue siendo el más prominente del panel. Consola: 0 errores.

- [ ] **Step 6: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: hojas, modales y formularios sobre el sistema" }
```

---

## Task 9: Pie y barra móvil

**Files:** `estilos.css`

- [ ] **Step 1: Pie**

- `.footer{margin-top:40px; …}` → `margin-top:var(--e6)`
- `.footer-wrap{padding:32px 16px 24px; … gap:8px; …}` → `padding:var(--e5) var(--e3) var(--e4)` y `gap:var(--e1)`
- `.footer-nombre-texto{font-size:17px;font-weight:800;color:var(--brand)}` → `font-size:var(--t-lg);font-weight:800;color:var(--brand);letter-spacing:-.01em`
- `.footer-col h3{font-size:13px; … margin-bottom:8px}` → `font-size:var(--t-xs);text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:var(--e1)`
- `.footer-texto{font-size:13px; …}` → `font-size:var(--t-sm)`
- `.footer-grid{ … margin:18px 0 6px;padding-top:20px; … gap:22px; …}` → `margin:var(--e4) 0 var(--e0);padding-top:var(--e4);gap:var(--e4)`

- [ ] **Step 2: Barra móvil**

Sustituye en `.barra-movil{ … }`: `padding:12px 16px` → `padding:var(--e2) var(--e3)`, `box-shadow:0 -4px 16px rgba(28,26,34,.18)` → `box-shadow:var(--sombra-3)`, y añade `padding-bottom:max(var(--e2), env(safe-area-inset-bottom));` para que no la tape la barra de gestos del teléfono.
`.barra-movil span{font-size:13px;font-weight:600}` → `font-size:var(--t-sm);font-weight:700`.

- [ ] **Step 3: Verificar y commit**

Comprueba el pie en móvil y escritorio, claro y oscuro. Luego:

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css; git commit -m "rediseno: pie y barra movil sobre el sistema" }
```

---

## Task 10: Tarjeta de encargos y cartel «Muy pronto»

**Files:** `estilos.css`, `encargos.js`

- [ ] **Step 1: La tarjeta de entrada**

En `.enc-cta{ … }` sustituye `margin:12px 0 4px;padding:16px;` por `margin:var(--e3) 0 var(--e1);padding:var(--e3);`, `gap:12px 14px` por `gap:var(--e2) var(--e3)`, y `box-shadow:var(--sombra)` por `box-shadow:var(--sombra-1)`.
En `.enc-cta:hover{ … }` añade `box-shadow:var(--sombra-2);`.
`.enc-cta-tit{font-size:17px; …}` → `font-size:var(--t-lg);font-weight:800`.
`.enc-cta-sub{font-size:14px; …}` → `font-size:var(--t-sm)`.
`.enc-cta-chips span{font-size:12px; … border-radius:999px; …}` → `font-size:var(--t-xs);border-radius:var(--radio-pill);padding:var(--e0) var(--e2)`.

- [ ] **Step 2: El cartel de pausa**

Sustituye:
```css
.enc-pausado{
  border-radius:var(--radio-card);background:var(--brand-soft);color:var(--text);
  padding:20px;margin:0 0 16px;text-align:center;display:flex;flex-direction:column;gap:8px;
}
.enc-pausado-titulo{font-size:22px;font-weight:800;line-height:1.25}
.enc-pausado-texto{font-size:15px;line-height:1.5;color:var(--text-2)}
```
por:
```css
/* «Muy pronto» tiene que leerse como una promesa, no como un error: por eso va
   en el tono de marca y con el mismo aire que una tarjeta, no como un aviso
   apretado. Debajo sigue viéndose todo (pasos, ejemplos, tiempos) — lo único
   que falta en pausa es el formulario. */
.enc-pausado{
  border-radius:var(--radio-card);
  background:linear-gradient(160deg, var(--brand-soft) 0%, var(--surface-2) 100%);
  border:1px solid var(--border);color:var(--text);
  padding:var(--e5) var(--e4);margin:0 0 var(--e4);
  text-align:center;display:flex;flex-direction:column;gap:var(--e2);
}
.enc-pausado-titulo{font-size:var(--t-2xl);font-weight:800;line-height:1.2;letter-spacing:-.01em;color:var(--brand)}
.enc-pausado-texto{font-size:var(--t-md);line-height:1.55;color:var(--text-2);max-width:44ch;margin:0 auto}
```

- [ ] **Step 3: Verificar el estado en pausa**

Con el servidor de revisión (que fuerza `modo:'pausado'`), abre la tarjeta de encargos. Expected:
- La tarjeta del catálogo muestra el chip **«🚀 Muy pronto»** y el botón dice **«Ver cómo funciona»**.
- El botón de la portada **«Hacer un encargo»** se ve y abre la misma ventana.
- Dentro sale el cartel «🚀 Muy pronto» con su texto, **sin formulario y sin botón de WhatsApp**.
- Consola: 0 errores.

- [ ] **Step 4: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add estilos.css encargos.js; git commit -m "rediseno: tarjeta de encargos y cartel Muy pronto" }
```

---

## Task 11: `/taxi`

**Files:** `taxi.css`

`taxi.html` comparte `estilos.css` con la tienda, así que ya hereda tokens, botones y cabecera. Aquí solo se alinea lo propio del taxi.

- [ ] **Step 1: Alinear taxi.css**

En `taxi.css`, sustituye **todos** los valores literales por su token equivalente, sin cambiar la maquetación:

- cualquier `border-radius:10px` → `var(--radio-control)`; `:16px` → `var(--radio-card)`
- cualquier `box-shadow` propia → `var(--sombra-1)` en reposo y `var(--sombra-2)` en hover
- los `padding`/`gap` de 4/8/12/16/24/32 px → `var(--e0…--e5)`
- los `font-size` de 12/13/15/17 px → `var(--t-xs/--t-sm/--t-md/--t-lg)`; los titulares con `clamp()` → `var(--t-xl)` o `var(--t-2xl)` según tamaño

Y a los botones de la calculadora añádeles en `taxi.html` `class="btn btn-primario …"` (o `btn-wa` si es el de WhatsApp), quitando de `taxi.css` las medidas que ya fija `.btn` (alto, radio, padding, tamaño y peso de letra).

- [ ] **Step 2: Verificar**

Abre `http://localhost:4173/taxi` en móvil y escritorio, claro y oscuro. La calculadora tiene que seguir calculando igual y los botones deben tener el mismo alto que los de la tienda. Consola: 0 errores.

- [ ] **Step 3: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add taxi.css taxi.html; git commit -m "rediseno: taxi alineado al mismo sistema" }
```

---

## Task 12: Verificación final

**Files:** ninguno (solo evidencia)

- [ ] **Step 1: Las seis comprobaciones del design doc**

Con el servidor de revisión corriendo:

1. **Consola limpia** en `/` y en `/taxi`: 0 errores, ninguno de CSP.
2. **Capturas** a 375 px y 1280 px, en claro y en oscuro (8 en total, contando `/taxi`).
3. **Las cinco medidas** a 375 px, con el bloque del Step 4 de la Tarea 0:
   `barraFija ≤ 160` · `hero ≤ 360` · `cats ≤ 270` · `primerMV ≤ 870` · `primerGrid ≤ 1530`.
4. **Contraste** ≥ 4.5:1 en los pares tocados, en los dos temas: titular de la portada sobre el velo, texto de la franja de socios, `.enc-pausado-titulo` sobre su fondo, y los dos botones de la portada.
5. **CSP intacta:**
   ```powershell
   cd "C:\inventario\tienda-3b-rediseno"; if ($?) { (Select-String -Path app.js -Pattern 'onerror=' -AllMatches).Count }
   cd "C:\inventario\tienda-3b-rediseno"; if ($?) { Select-String -Path app.js,encargos.js,taxi.js,index.html,taxi.html -Pattern 'onclick=|onload=|onerror=' }
   ```
   Expected: la cuenta da **3**, y las únicas coincidencias son `imgFallback(this)` (×2) y `cat3dImgFallback(this)` (×1), **con ese texto exacto**. Cualquier otra cosa rompe la CSP en producción.
6. **Nada de datos comiteado:**
   ```powershell
   cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git diff origin/main --stat }
   ```
   Expected: `catalogo.json` y `taxi.json` **no aparecen** en la lista.

- [ ] **Step 2: Recorrido del flujo de compra**

A mano, en móvil: buscar un producto → abrir el detalle → elegir talla si la tiene → añadir → abrir el carrito → rellenar los cuatro campos → comprobar que el botón de WhatsApp arma el mensaje. **No lo envíes.** Comprueba también «Vaciar pedido» y el filtro por categoría.

- [ ] **Step 3: Informe de relevo**

Escribe `docs/informes/2026-09-16-rediseno-tienda-3b.md` con: qué se cambió tarea por tarea, las medidas de antes y después, las capturas, y marcando **⚠ NO VERIFICADO** todo lo que no se haya observado. Incluye al final, textual, el paso que le toca al dueño:

> **Pendiente del dueño:** Stock+ → pestaña 🛍️ → interruptor de encargos a **Pausado**, cartel **«🚀 Muy pronto»** → Guardar. Eso publica `catalogo.json` solo y la sección aparece en 3bqba.com.

- [ ] **Step 4: Commit**

```powershell
cd "C:\inventario\tienda-3b-rediseno"; if ($?) { git add docs; git commit -m "docs: informe de relevo del rediseno" }
```

---

## Cierre (lo hace el piloto, no el ejecutor)

1. Enseñar el resultado al dueño en `http://localhost:4173`.
2. Con su visto bueno: `git pull --rebase origin main` en el worktree, merge a `main`, push. Vercel despliega solo.
3. Recordarle el paso del interruptor de encargos.
4. Retirar el worktree: `git worktree remove "C:\inventario\tienda-3b-rediseno"`.
