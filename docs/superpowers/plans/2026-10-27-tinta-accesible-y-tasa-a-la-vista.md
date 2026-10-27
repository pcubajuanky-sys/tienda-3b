# Tinta accesible y tasa a la vista — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el botón de pagar y el sello OFERTA se lean en modo oscuro, que el gris tenue y el rojo de error cumplan AA, y que la clienta vea con qué tasa están calculados los precios que está mirando.

**Architecture:** Dos mitades independientes. (1) **Tinta:** cuatro tokens de color en `estilos.css` (`--wa-ink`, `--oferta-ink`, `--text-3` más oscuro, `--error` separado de `--oferta`), con una prueba nueva que **calcula el contraste WCAG leyendo los tokens del propio CSS** — así la barrera es estructural y no un comentario. (2) **Tasa:** un módulo puro nuevo `tasa.js` (patrón IIFE + `window.X` de la casa) que compone tres textos a partir de `CAT.tasa`, y tres puntos de cableado en `app.js`. El número ya viaja en `catalogo.json`: **no se toca Stock+**.

**Tech Stack:** HTML + CSS + JavaScript de navegador sin framework. Pruebas con `node --test` y `node:vm`. Sin dependencias nuevas.

---

## Contexto que el ejecutor necesita (léelo antes del Task 1)

**Qué es esto.** `tienda-3b` es el catálogo estático de 3B Store (www.3bqba.com), servido por Vercel, **sin backend**. Los datos llegan en `catalogo.json`, que publica otro proyecto (Stock+) por GitHub. El carrito sale por WhatsApp.

**De dónde salen estos cambios.** De la revisión `docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md`, §1.3a y §2.2–2.4. Si dudas de un número, está medido allí.

**Reglas de la casa que NO puedes saltarte:**

1. 🔴 **Si tocas `app.js`, `estilos.css`, `index.html`, `electripower.html` o cualquier archivo de `ARMAZON`, SUBE `CACHE` en `sw.js`.** Si no, quien tenga la tienda instalada sigue viendo el código viejo. Hoy está en `tienda-3b-v22`; este plan lo deja en **`tienda-3b-v23`** (Task 6).
2. 🔴 **Un archivo `.js` nuevo que cargue la página tiene que entrar en la lista `ARMAZON` de `sw.js`**, o no estará disponible sin conexión.
3. 🔴 **Los módulos puros se escriben con comentarios SIN acentos** (mira `faltante.js`): es la convención del repo por el ida y vuelta CRLF. Los textos que ve la clienta **sí llevan acentos**.
4. 🔴 **`catalogo.json` lo publica Stock+.** Puedes tocarlo para probar, pero se restaura con `git checkout -- catalogo.json` y **jamás se commitea editado**.
5. Las pruebas se corren **desde la raíz** con `node --test` (NO `node --test test/`: con Node 24 falla).
6. **Baseline medida hoy: `186 tests, 186 pass, 0 fail`, exit 0.** Al terminar este plan tienen que ser **más**, y **cero fallos**.

**Cómo se prueba un módulo puro en este repo:** `node:vm` con un sandbox `{ window: {} }`. Copia el encabezado de `test/faltante.test.js`. 🔴 Gotcha conocido: `assert.deepStrictEqual` contra un array literal **falla** si el array nace dentro del sandbox; para salidas vacías usa `assert.strictEqual(x.length, 0)`. En este plan no devolvemos arrays, así que no aplica — pero no lo olvides si improvisas.

---

## Estructura de archivos

| Archivo | Qué hace | Tarea |
|---|---|---|
| `test/colores.test.js` | **Nuevo.** Lee `estilos.css`, extrae los tokens de los dos `:root` y calcula contraste WCAG 2.1 | 1, 2, 3 |
| `estilos.css` | Tokens de color: `--wa-ink`, `--oferta-ink`, `--text-3`, `--error`; reglas `.btn-wa`, `.card-oferta`, errores de formulario | 1, 2, 3, 5 |
| `tasa.js` | **Nuevo.** Módulo puro: compone los tres textos de la tasa | 4 |
| `test/tasa.test.js` | **Nuevo.** Pruebas del módulo + barrera estructural del cableado | 4, 5 |
| `app.js` | Tres puntos de cableado: chip de la portada, aviso del pie, nota del carrito | 5 |
| `index.html` | Dos `id` nuevos (chip de moneda, aviso de tasa) + `<script src="tasa.js">` | 5 |
| `electripower.html` | Lo mismo que `index.html`: es la tienda del socio y comparte `app.js` y el catálogo | 5 |
| `sw.js` | `/tasa.js` en `ARMAZON` + `CACHE` a `tienda-3b-v23` | 6 |

---

## Task 1: La prueba de contraste y las dos fugas de tinta blanca

**El problema, medido en el sitio vivo el 27/10 en modo oscuro:** dos reglas escriben el color del texto a mano como `#fff` mientras el fondo sale de un token que **sí** se invierte. Resultado: `.btn-wa` («Pedir por WhatsApp», el único botón de cobrar que tiene la tienda) queda en **1.98:1**, y `.card-oferta` (el sello OFERTA, 17 visibles en la parrilla) en **2.23:1**. En modo claro el mismo botón se queda en **4.14:1**, por debajo del 4.5:1 que exige AA para su letra de 17 px. El sello hermano `.card-mv` («⭐ MÁS VENDIDO») ya usa un token de tinta y mide 9.27:1: el patrón correcto existe, estas dos reglas se lo saltaron.

**Files:**
- Create: `test/colores.test.js`
- Modify: `estilos.css` (bloque `:root` claro ~línea 32-95; bloque `:root` oscuro ~línea 97-118; `.btn-wa` línea 174; `.card-oferta` líneas 681-684)

- [x] **Step 1: Escribe la prueba que falla**

Crea `test/colores.test.js` con este contenido exacto:

```js
// test/colores.test.js — el contraste de los colores de la tienda, CALCULADO.
//
// Por que existe: el 2026-10-27 se midio en el sitio vivo que «Pedir por WhatsApp»
// quedaba en 1.98:1 en modo oscuro y el sello OFERTA en 2.23:1 — los dos por tinta
// blanca escrita a mano contra un fondo que SI se invierte. Los comentarios del CSS
// ya decian el contraste de otras piezas, pero un comentario no falla cuando alguien
// lo rompe. Esto si.
//
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'estilos.css'), 'utf8');

// Los dos bloques de tokens: todo lo anterior a la consulta de modo oscuro es el tema
// claro; de ahi en adelante, el oscuro. Un token que el oscuro NO redefine hereda del claro.
const I_OSCURO = CSS.indexOf('@media (prefers-color-scheme: dark)');
const CLARO = CSS.slice(0, I_OSCURO);
const OSCURO = CSS.slice(I_OSCURO);

function token(bloque, nombre) {
  const m = bloque.match(new RegExp('--' + nombre + '\\s*:\\s*(#[0-9A-Fa-f]{6})'));
  return m ? m[1] : null;
}
function claro(nombre) {
  const v = token(CLARO, nombre);
  assert.ok(v, 'falta el token --' + nombre + ' en el :root claro');
  return v;
}
function oscuro(nombre) {
  return token(OSCURO, nombre) || claro(nombre);
}

// WCAG 2.1, formula de contraste relativo.
function canales(h) {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16));
}
function lineal(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function luz(h) {
  const [r, g, b] = canales(h);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}
function contraste(a, b) {
  const l1 = luz(a);
  const l2 = luz(b);
  const alto = Math.max(l1, l2);
  const bajo = Math.min(l1, l2);
  return (alto + 0.05) / (bajo + 0.05);
}
function exige(nombre, tinta, fondo, minimo) {
  const r = contraste(tinta, fondo);
  assert.ok(
    r >= minimo,
    nombre + ': ' + tinta + ' sobre ' + fondo + ' da ' + r.toFixed(2) + ':1, hace falta ' + minimo + ':1'
  );
}

test('🔴 «Pedir por WhatsApp» se lee en los dos temas', () => {
  // Es el unico boton de cobrar que tiene esta tienda: el checkout ES la conversacion
  // de WhatsApp. Su letra mide 17px/700, que NO cuenta como texto grande (hace falta
  // 18.66px en negrita), asi que el minimo es 4.5:1 y no 3:1.
  exige('boton WhatsApp claro', claro('wa-ink'), claro('wa'), 4.5);
  exige('boton WhatsApp oscuro', oscuro('wa-ink'), oscuro('wa'), 4.5);
});

test('🔴 el sello OFERTA se lee en los dos temas', () => {
  exige('sello OFERTA claro', claro('oferta-ink'), claro('oferta'), 4.5);
  exige('sello OFERTA oscuro', oscuro('oferta-ink'), oscuro('oferta'), 4.5);
});

test('🔴 ni .btn-wa ni .card-oferta escriben la tinta a mano', () => {
  // Esta es la barrera de verdad: los numeros de arriba solo valen si las reglas usan
  // los tokens. Con `color:#fff` escrito a mano, el token se puede arreglar y el boton
  // seguiria ilegible.
  const btn = CSS.match(/\.btn-wa\{[^}]*\}/);
  assert.ok(btn, 'no se encuentra la regla .btn-wa');
  assert.ok(btn[0].includes('var(--wa-ink)'), '.btn-wa tiene que pedir la tinta al token');
  assert.ok(!/#fff|#FFF/.test(btn[0]), '.btn-wa no puede llevar blanco escrito a mano');

  const sello = CSS.match(/\.card-oferta\{[^}]*\}/);
  assert.ok(sello, 'no se encuentra la regla .card-oferta');
  assert.ok(sello[0].includes('var(--oferta-ink)'), '.card-oferta tiene que pedir la tinta al token');
  assert.ok(!/#fff|#FFF/.test(sello[0]), '.card-oferta no puede llevar blanco escrito a mano');
});

test('el verde de WhatsApp tambien se lee cuando es TEXTO, no fondo', () => {
  // --wa no solo pinta el boton: es el color de «🛵 MENSAJERIA GRATIS» (.envio-chip,
  // 12px), de .envio-detalle, del enlace del pie y de .enc-dominio. Ese chip es una
  // senal de venta: tiene que leerse sobre los tres fondos.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--wa como texto claro sobre --' + fondo, claro('wa'), claro(fondo), 4.5);
    exige('--wa como texto oscuro sobre --' + fondo, oscuro('wa'), oscuro(fondo), 4.5);
  }
});
```

- [x] **Step 2: Córrela y comprueba que FALLA**

```bash
node --test test/colores.test.js
```

Esperado: **falla**. Los mensajes serán del tipo `falta el token --wa-ink en el :root claro`. Es lo correcto: los tokens todavía no existen.

- [x] **Step 3: Añade los tokens y arregla las dos reglas**

**3a.** En `estilos.css`, en el bloque `:root` **claro**, localiza estas dos líneas:

```css
  --oferta:    #C81E4C;
  --wa:        #128C7E;
```

y sustitúyelas por:

```css
  --oferta:    #C81E4C;
  /* Tinta del sello OFERTA. Va en un token y NO escrita a mano, porque --oferta se
     invierte en modo oscuro y el blanco fijo caia a 2.23:1 (medido en el sitio vivo
     el 2026-10-27). Blanco sobre el rojo claro: 5,61:1. */
  --oferta-ink:#FFFFFF;
  /* 🔴 El verde subio de tono (#128C7E -> #0E7566) porque --wa no solo es el fondo del
     boton de pagar: tambien es el COLOR de texto de «🛵 MENSAJERIA GRATIS» (.envio-chip,
     12px), de .envio-detalle, del enlace del pie y de .enc-dominio. Con el anterior,
     blanco sobre el boton daba 4,14:1 y el texto sobre blanco otro tanto: los dos por
     debajo del 4,5:1 de AA. Con este: boton 5,59:1 y texto 5,24/5,59/4,82:1. */
  --wa:        #0E7566;
  --wa-ink:    #FFFFFF;
```

**3b.** En el bloque `:root` **oscuro** (dentro de `@media (prefers-color-scheme: dark)`), localiza:

```css
    --oferta:    #FF8AA6;
```

y déjalo así:

```css
    --oferta:    #FF8AA6;
    /* Sobre el rosa claro la tinta tiene que ser OSCURA: blanco daba 2,23:1. Este
       mismo valor es el que ya usa --brand-ink y el sello ⭐ MAS VENDIDO. 7,98:1. */
    --oferta-ink:#2A0E20;
```

Y en ese mismo bloque oscuro, localiza la última línea:

```css
    --wa:        #25D366;
```

y déjala así:

```css
    --wa:        #25D366;
    /* Blanco sobre este verde brillante daba 1,98:1: el boton de cobrar, ilegible.
       Con tinta oscura, 8,68:1. */
    --wa-ink:    #1C1A22;
```

**3c.** En `estilos.css` línea 174, sustituye:

```css
.btn-wa{background:var(--wa);color:#fff}
```

por:

```css
.btn-wa{background:var(--wa);color:var(--wa-ink)}
```

**3d.** En `estilos.css` (regla `.card-oferta`, ~línea 681), sustituye:

```css
  background:var(--oferta);color:#fff;
```

por:

```css
  background:var(--oferta);color:var(--oferta-ink);
```

- [x] **Step 4: Córrela y comprueba que PASA**

```bash
node --test test/colores.test.js
```

Esperado: `pass 4`, `fail 0`.

- [x] **Step 5: Comprueba que no rompiste nada**

```bash
node --test
```

Esperado: **190 tests, 190 pass, 0 fail** (186 de baseline + 4 nuevos), exit 0.

- [x] **Step 6: Commit**

```bash
git add test/colores.test.js estilos.css
git commit -m "fix(color): el boton de pagar y el sello OFERTA se leen en modo oscuro

El contraste ahora lo CALCULA una prueba leyendo los tokens del propio CSS.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: El gris más tenue no llega a AA en modo claro

**El problema, medido:** `--text-3` (`#857D89`) da **3.72:1** sobre el fondo y **3.42:1** sobre las zonas grises, y se usa en **16 sitios**, varios a 11–12 px, donde AA pide 4.5:1. Entre ellos dos que son dinero: el **equivalente en USD del total del carrito** (`.total-usd`, `.lateral-total-usd`) y la **nota de la tasa** del pie — justo la línea que el Task 5 va a llenar con el número. En modo oscuro el mismo token sí pasa (4.60–5.66:1): es un fallo solo del tema claro.

**Files:**
- Modify: `test/colores.test.js` (añadir una prueba)
- Modify: `estilos.css` (token `--text-3` del `:root` claro)

- [x] **Step 1: Escribe la prueba que falla**

Añade al **final** de `test/colores.test.js`:

```js
test('el gris mas tenue sigue siendo texto: tiene que leerse', () => {
  // --text-3 pinta el equivalente en USD del total del carrito y la nota de la tasa
  // del pie, a 11-12px. A ese tamano AA pide 4,5:1 y no hay excepcion de texto grande.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--text-3 claro sobre --' + fondo, claro('text-3'), claro(fondo), 4.5);
    exige('--text-3 oscuro sobre --' + fondo, oscuro('text-3'), oscuro(fondo), 4.5);
  }
});
```

- [x] **Step 2: Córrela y comprueba que FALLA**

```bash
node --test test/colores.test.js
```

Esperado: falla con `--text-3 claro sobre --bg: #857D89 sobre #FAF7F5 da 3.72:1, hace falta 4.5:1`.

- [x] **Step 3: Oscurece el token**

En `estilos.css`, bloque `:root` **claro**, sustituye:

```css
  --text-3:    #857D89;
```

por:

```css
  /* 🔴 No lo aclares de vuelta. #857D89 daba 3,72:1 sobre el fondo y 3,42:1 sobre las
     zonas grises, y este token pinta el total en USD del carrito y la nota de la tasa
     a 11-12px. Este: 5,10 / 5,44 / 4,69:1. Sigue siendo el tercer nivel de la jerarquia
     —se ve claramente mas tenue que --text-2—, pero ahora se lee. En modo oscuro el
     token NO cambia: alli ya pasaba (4,60-5,66:1). */
  --text-3:    #6F6773;
```

- [x] **Step 4: Córrela y comprueba que PASA**

```bash
node --test test/colores.test.js
```

Esperado: `pass 5`, `fail 0`.

- [x] **Step 5: Commit**

```bash
git add test/colores.test.js estilos.css
git commit -m "fix(color): el gris tenue llega a AA en modo claro

Pinta el total en USD del carrito y la nota de la tasa a 11-12px.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Un solo rojo hacía cuatro trabajos

**El problema:** `--oferta` se usa hoy para el **sello OFERTA**, el **«Queda 1»** de escasez, los **errores de formulario** y el **hover de «Vaciar»/«Quitar»**. El color con el que le dices a la clienta «mira qué oportunidad» es el mismo con el que le dices «te equivocaste» y «vas a borrar». Esta tarea separa el rojo de error; el de escasez se deja donde está (es una señal de venta, no de error).

**Files:**
- Modify: `test/colores.test.js` (añadir una prueba)
- Modify: `estilos.css` (tokens `--error`; reglas de las líneas ~197, ~604, ~918, ~919, ~1226, ~1234)

- [x] **Step 1: Escribe la prueba que falla**

Añade al **final** de `test/colores.test.js`:

```js
test('🔴 el rojo de «te equivocaste» no es el rojo de «que oportunidad»', () => {
  // Hasta el 2026-10-27, --oferta pintaba el sello de descuento Y los errores de
  // formulario Y el hover de «Vaciar». La clienta aprendia a leer ese rojo como
  // «problema» en el formulario y arrastraba la asociacion a la parrilla.
  assert.notStrictEqual(claro('error'), claro('oferta'), 'el error y la oferta no pueden compartir color');
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--error claro sobre --' + fondo, claro('error'), claro(fondo), 4.5);
    exige('--error oscuro sobre --' + fondo, oscuro('error'), oscuro(fondo), 4.5);
  }
  // Y las reglas de error tienen que pedirselo al token nuevo.
  const err = CSS.match(/\.campo-error\{[^}]*\}/);
  assert.ok(err, 'no se encuentra la regla .campo-error');
  assert.ok(err[0].includes('var(--error)'), '.campo-error tiene que usar --error');
  assert.ok(!err[0].includes('var(--oferta)'), '.campo-error no puede usar el rojo de las ofertas');
});
```

- [x] **Step 2: Córrela y comprueba que FALLA**

```bash
node --test test/colores.test.js
```

Esperado: falla con `falta el token --error en el :root claro`.

- [x] **Step 3: Añade los tokens**

En `estilos.css`, bloque `:root` **claro**, justo **debajo** de la línea `--oferta-ink:#FFFFFF;` que añadiste en el Task 1, añade:

```css
  /* El rojo de equivocarse, separado del de vender (2026-10-27). 6,13 / 6,54 / 5,64:1. */
  --error:     #B3261E;
```

En el bloque `:root` **oscuro**, justo debajo de `--oferta-ink:#2A0E20;`, añade:

```css
    /* 8,24 / 7,61 / 6,71:1 sobre los tres fondos oscuros. */
    --error:     #FF8A80;
```

- [x] **Step 4: Cambia las cuatro reglas de error**

Son cuatro sustituciones exactas en `estilos.css`. **No toques** `.card-quedan` (línea ~654): el «Queda 1» es escasez, que es venta, y se queda con `--oferta`.

1. Línea ~918:

```css
.campo input.invalido,.campo textarea.invalido{border-color:var(--oferta)}
```
→
```css
.campo input.invalido,.campo textarea.invalido{border-color:var(--error)}
```

2. Línea ~919:

```css
.campo-error{color:var(--oferta);font-size:12px;font-weight:600}
```
→
```css
.campo-error{color:var(--error);font-size:12px;font-weight:600}
```

3. Línea ~1226:

```css
.enc-quitar{border:none;background:none;color:var(--oferta);font-weight:600;font-size:13px;cursor:pointer;min-height:36px}
```
→
```css
.enc-quitar{border:none;background:none;color:var(--error);font-weight:600;font-size:13px;cursor:pointer;min-height:36px}
```

4. Línea ~1234:

```css
.campo select.invalido{border-color:var(--oferta)}
```
→
```css
.campo select.invalido{border-color:var(--error)}
```

Y los dos *hover* destructivos, que también son «cuidado» y no «oferta»:

5. Línea ~197:

```css
.btn-texto:hover{color:var(--oferta)}
```
→
```css
.btn-texto:hover{color:var(--error)}
```

6. Línea ~604:

```css
.btn-vaciar:hover{color:var(--oferta)}
```
→
```css
.btn-vaciar:hover{color:var(--error)}
```

- [x] **Step 5: Córrela y comprueba que PASA**

```bash
node --test test/colores.test.js
```

Esperado: `pass 6`, `fail 0`.

- [x] **Step 6: Comprueba que `--oferta` ya solo vende**

```bash
grep -n "var(--oferta)" estilos.css
```

Esperado: **exactamente dos** apariciones, `.card-quedan` y `.card-oferta` (esta última en la línea de `background`). Si sale alguna más, es que te saltaste una sustitución.

- [x] **Step 7: Commit**

```bash
git add test/colores.test.js estilos.css
git commit -m "fix(color): el rojo de error deja de ser el rojo de las ofertas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: `tasa.js` — el módulo puro que compone los tres textos

**Qué resuelve.** `catalogo.json` ya trae `tasa` (hoy **845**) y la página la usa solo para aritmética; la clienta nunca ve el número. Lo único que ve es «Los precios pueden variar según la tasa del día», en el pie, sin cifra.

🔴 **La regla de honestidad que manda sobre toda esta tarea:** el número que se enseña es **la tasa con la que están calculados estos precios**, no «la tasa de hoy». Son cosas distintas: un cambio de tasa a mano en Stock+ **no republica** el catálogo, y la publicación automática va cada 5 horas, así que puede haber un rato con el número viejo junto a unos precios viejos — correcto, pero solo si la etiqueta lo dice bien. Por eso los textos dicen **«están calculados a»** y **nunca** «tasa del día». Y **nunca** «de elTOQUE»: la tasa automática existe en Stock+ pero hoy no funciona (falta la clave), así que el 845 lo puso Ruth a mano y atribuirlo a elTOQUE sería inventar una fuente.

**Files:**
- Create: `tasa.js`
- Create: `test/tasa.test.js`

- [x] **Step 1: Escribe las pruebas que fallan**

Crea `test/tasa.test.js`:

```js
// test/tasa.test.js — pruebas de tasa.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tasa.js'), 'utf8'), sandbox);
const { valida, numero, chip, aviso, carrito } = sandbox.window.TasaVista;

test('valida solo acepta una tasa que sirva para convertir', () => {
  assert.strictEqual(valida(845), true);
  assert.strictEqual(valida('845'), true, 'el catalogo podria traerla como texto');
  assert.strictEqual(valida(1), false, 'tasa 1 es «sin conversion», no se enseña');
  assert.strictEqual(valida(0), false);
  assert.strictEqual(valida(-5), false);
  assert.strictEqual(valida(undefined), false);
  assert.strictEqual(valida(null), false);
  assert.strictEqual(valida('ochocientos'), false);
  assert.strictEqual(valida(Infinity), false);
});

test('numero se lee como una cifra de dinero', () => {
  assert.strictEqual(numero(845), '845');
  assert.strictEqual(numero(1250), '1,250');
  assert.strictEqual(numero(845.7), '846', 'nadie enseña decimales de una tasa');
});

test('🔴 el chip dice CON QUE tasa estan calculados, no «la tasa de hoy»', () => {
  // La diferencia no es de estilo: el catalogo se republica cada 5 horas y un cambio
  // a mano no lo republica, asi que prometer frescura seria mentir a ratos.
  const t = chip(845);
  assert.ok(t.includes('1 USD = 845 CUP'), 'falta el numero');
  assert.ok(t.includes('Precios en CUP y USD'), 'se perdio el texto que ya estaba');
  assert.ok(!/tasa del d[ií]a/i.test(t), 'no puede prometer que es la tasa de hoy');
  assert.ok(!/toque/i.test(t), 'no puede atribuirsela a elTOQUE');
});

test('🔴 sin tasa, la pagina se ve exactamente como antes', () => {
  // Si Stock+ publicara un catalogo sin tasa, lo peor que puede pasar es que no haya
  // cambiado nada. Nunca un hueco, un «undefined» ni un «1 USD = NaN CUP».
  assert.strictEqual(chip(undefined), 'Precios en CUP y USD');
  assert.strictEqual(chip(0), 'Precios en CUP y USD');
  assert.strictEqual(aviso(null), 'Los precios pueden variar según la tasa del día.');
  assert.strictEqual(carrito(undefined), '');
  assert.strictEqual(carrito('x'), '');
});

test('el aviso del pie lleva el numero y no promete frescura', () => {
  const t = aviso(845);
  assert.ok(t.includes('845'), 'falta el numero');
  assert.ok(/calculados/i.test(t), 'tiene que decir que los precios estan CALCULADOS con ella');
  assert.ok(!/toque/i.test(t));
});

test('la nota del carrito es corta: cabe en 375px', () => {
  const t = carrito(845);
  assert.strictEqual(t, '845 CUP por USD');
  assert.ok(t.length < 24, 'si crece, se parte en dos lineas debajo del total');
});
```

- [x] **Step 2: Córrelas y comprueba que FALLAN**

```bash
node --test test/tasa.test.js
```

Esperado: falla al cargar — `ENOENT ... tasa.js`. Correcto: el módulo no existe.

- [x] **Step 3: Escribe el módulo**

Crea `tasa.js` (🔴 comentarios **sin acentos**, textos de la clienta **con** acentos):

```js
// tasa.js — el numero con el que estan calculados los precios, a la vista.
//
// Modulo PURO (ni DOM ni red): compone tres textos a partir de CAT.tasa, que ya viaja
// en catalogo.json. Lo pinta app.js en el chip de la portada, en el aviso del pie y
// debajo del total del carrito. Se prueba con node:vm desde test/tasa.test.js.
//
// 🔴 La regla que manda aqui: lo que se enseña es LA TASA CON LA QUE ESTAN CALCULADOS
// ESTOS PRECIOS, no «la tasa de hoy». El catalogo se republica cada 5 horas y un cambio
// de tasa a mano en Stock+ no lo republica: puede haber un rato con el numero viejo
// junto a unos precios viejos. Eso es correcto —y util— mientras la etiqueta lo diga
// asi. Decir «tasa del dia» seria prometer una frescura que no tenemos, y decir
// «segun elTOQUE» seria inventar una fuente: la lectura automatica existe en Stock+
// pero hoy no funciona, y el numero lo pone Ruth a mano.
(function () {
  'use strict';

  const CHIP_BASE = 'Precios en CUP y USD';
  const AVISO_BASE = 'Los precios pueden variar según la tasa del día.';

  function valida(tasa) {
    const n = Number(tasa);
    return Number.isFinite(n) && n > 1;
  }

  function numero(tasa) {
    if (!valida(tasa)) return '';
    return Math.round(Number(tasa)).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  function chip(tasa) {
    if (!valida(tasa)) return CHIP_BASE;
    return CHIP_BASE + ' · 1 USD = ' + numero(tasa) + ' CUP';
  }

  function aviso(tasa) {
    if (!valida(tasa)) return AVISO_BASE;
    return 'Los precios están calculados a 1 USD = ' + numero(tasa) + ' CUP.';
  }

  function carrito(tasa) {
    if (!valida(tasa)) return '';
    return numero(tasa) + ' CUP por USD';
  }

  window.TasaVista = { valida, numero, chip, aviso, carrito };
})();
```

- [x] **Step 4: Córrelas y comprueba que PASAN**

```bash
node --test test/tasa.test.js
```

Esperado: `pass 6`, `fail 0`.

- [x] **Step 5: Commit**

```bash
git add tasa.js test/tasa.test.js
git commit -m "feat(tasa): modulo puro con los textos de la tasa de cambio

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Cablear la tasa en las dos páginas

**Ojo:** `electripower.html` es la tienda del socio; comparte `app.js`, `estilos.css` y el mismo `catalogo.json`, así que recibe los mismos tres cambios. Si solo tocas `index.html`, `app.js` buscará un `id` que allí no existe.

**Files:**
- Modify: `index.html` (línea 182, línea 321, lista de `<script>` ~495-511)
- Modify: `electripower.html` (línea 182, línea 323, su lista de `<script>`)
- Modify: `app.js` (`usdLineaHtml`, ~línea 1929, ~línea 2080)
- Modify: `estilos.css` (una regla nueva, `.total-tasa`)
- Modify: `test/tasa.test.js` (barrera estructural del cableado)

- [x] **Step 1: Escribe la prueba estructural que falla**

Añade al **final** de `test/tasa.test.js`:

```js
test('🔴 el cableado existe en los TRES sitios y en las DOS paginas', () => {
  // electripower.html es la tienda del socio y comparte app.js: si solo se cablea
  // index.html, alli se busca un id que no existe.
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('TasaVista.chip('), 'falta el chip de la portada');
  assert.ok(app.includes('TasaVista.aviso('), 'falta el aviso del pie');
  assert.ok(app.includes('TasaVista.carrito('), 'falta la nota del carrito');

  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="hero-dato-moneda"'), pagina + ': falta el id del chip');
    assert.ok(html.includes('id="aviso-tasa"'), pagina + ': falta el id del aviso');
    assert.ok(html.includes('src="tasa.js"'), pagina + ': no carga tasa.js');
    // El texto de reserva se queda escrito en el HTML: si el JS no llega, la pagina
    // se lee igual que siempre en vez de enseñar un hueco.
    assert.ok(html.includes('Precios en CUP y USD'), pagina + ': falta el texto de reserva del chip');
  }

  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes("'/tasa.js'"), 'tasa.js no esta en ARMAZON: sin conexion no cargaria');
});
```

- [x] **Step 2: Córrela y comprueba que FALLA**

```bash
node --test test/tasa.test.js
```

Esperado: falla con `falta el chip de la portada`.

- [x] **Step 3: Pon los `id` y el `<script>` en las dos páginas**

En **`index.html` línea 182** y en **`electripower.html` línea 182**, sustituye:

```html
      <li>Precios en CUP y USD</li>
```
por:
```html
      <li id="hero-dato-moneda">Precios en CUP y USD</li>
```

En **`index.html` línea 321** sustituye:

```html
    <p class="aviso-tasa">Los precios pueden variar según la tasa del día.</p>
```
por:
```html
    <p id="aviso-tasa" class="aviso-tasa">Los precios pueden variar según la tasa del día.</p>
```

Haz **la misma** sustitución en `electripower.html` (allí está en la **línea 323**).

En **las dos páginas**, en la lista de `<script src=...>` del final, añade `tasa.js` **antes** de `app.js` (el orden importa: `app.js` lo usa al pintar):

```html
<script src="completar.js"></script>
<script src="listo.js"></script>
<script src="tasa.js"></script>
<script src="tarjeta.js"></script>
```

- [x] **Step 4: Cablea los tres puntos en `app.js`**

**4a. El chip de la portada.** Localiza (~línea 1929):

```js
  document.getElementById('hero-dato-productos').textContent = `${(CAT.items || []).length} productos disponibles`;
```

y añade **justo debajo**:

```js
  // El numero con el que estan calculados estos precios, donde la clienta ya esta
  // leyendo las credenciales de la tienda. Sin tasa, el <li> conserva su texto de
  // reserva y no se ve ningun cambio.
  const chipMoneda = document.getElementById('hero-dato-moneda');
  if (chipMoneda) chipMoneda.textContent = TasaVista.chip(CAT.tasa);
```

**4b. El aviso del pie.** Localiza (~línea 2080):

```js
  document.getElementById('actualizado').textContent =
    'Catálogo actualizado el ' + new Date(CAT.generado).toLocaleString('es-MX');
```

y añade **justo debajo**:

```js
  // La fecha de arriba y esta linea se leen juntas: «actualizado el 27/10 … calculados
  // a 845 CUP». Por eso el aviso no repite la fecha.
  const avisoTasa = document.getElementById('aviso-tasa');
  if (avisoTasa) avisoTasa.textContent = TasaVista.aviso(CAT.tasa);
```

**4c. La nota del carrito.** Sustituye la función `usdLineaHtml` entera por:

```js
function usdLineaHtml(clase) {
  // La tasa va en su propia linea, no pegada al total: en 375px «≈ $12.34 USD · 845 CUP
  // por USD» se parte feo justo donde la clienta esta mirando el dinero.
  const nota = (window.TasaVista && TasaVista.carrito(CAT.tasa)) || '';
  return `<span class="${clase}">≈ $${totalGeneralUSD().toFixed(2)} USD</span>`
    + (nota ? `<span class="total-tasa">${nota}</span>` : '');
}
```

- [x] **Step 5: Añade la regla de la nota del carrito**

En `estilos.css`, localiza:

```css
.total-usd{display:block;font-size:12px;color:var(--text-3);font-weight:600;margin-top:2px}
```

y añade **justo debajo**:

```css
/* La tasa con la que esta hecha la conversion de arriba. Mas tenue que el total en USD
   a proposito: es el dato que respalda la cifra, no la cifra. */
.total-tasa{display:block;font-size:11px;color:var(--text-3);font-weight:500;margin-top:2px}
```

- [x] **Step 6: Mete `tasa.js` en `ARMAZON`**

En `sw.js`, en la lista `ARMAZON`, añade la línea `'/tasa.js',` junto a los demás módulos (el orden dentro de la lista no importa; que esté, sí).

- [x] **Step 7: Córrela y comprueba que PASA**

```bash
node --test test/tasa.test.js
```

Esperado: `pass 7`, `fail 0`.

- [x] **Step 8: Toda la batería**

```bash
node --test
```

Esperado: **199 tests, 199 pass, 0 fail**, exit 0 (186 baseline + 6 de colores + 7 de tasa).

- [x] **Step 9: Commit**

```bash
git add index.html electripower.html app.js estilos.css sw.js test/tasa.test.js
git commit -m "feat(tasa): la tasa a la vista en la portada, el pie y el carrito

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Subir la caché y mirarlo con los ojos

🔴 **Los tests en verde no bastan aquí**: todo lo de este plan es visual. Y 🔴 **sin subir `CACHE` nadie verá el cambio**.

**Files:**
- Modify: `sw.js` (línea 11)

- [x] **Step 1: Sube la caché**

En `sw.js` línea 11, sustituye:

```js
const CACHE = 'tienda-3b-v22';
```
por:
```js
const CACHE = 'tienda-3b-v23';
```

- [x] **Step 2: Levanta la tienda en local**

```bash
npx --yes serve -l 4173 .
```

Déjalo corriendo y abre `http://localhost:4173` a **375 px de ancho**.

- [x] **Step 3: Las nueve comprobaciones, a ojo y con la consola**

Marca cada una. Si alguna falla, **arréglala antes de seguir** — no la apuntes como pendiente.

1. **Modo claro, portada:** el chip del medio dice `Precios en CUP y USD · 1 USD = 845 CUP`.
2. **Modo claro, pie:** la última línea dice `Los precios están calculados a 1 USD = 845 CUP.` y encima sigue la fecha del catálogo.
3. **Modo claro, carrito** (añade un producto): debajo del `≈ $X USD` aparece `845 CUP por USD`, más tenue, sin partirse en dos líneas.
4. **Modo oscuro** (DevTools → Rendering → `prefers-color-scheme: dark`), **botón «Pedir por WhatsApp»**: el texto se lee con holgura. Comprueba en la consola que el color ya no es blanco:
   ```js
   getComputedStyle(document.querySelector('#btn-enviar')).color
   ```
   Esperado: `rgb(28, 26, 34)`.
5. **Modo oscuro, sello OFERTA:** se lee oscuro sobre rosa, no blanco:
   ```js
   getComputedStyle(document.querySelector('.card-oferta')).color
   ```
   Esperado: `rgb(42, 14, 32)`.
6. **Modo claro, chip «🛵 MENSAJERÍA GRATIS»** en una tarjeta: el verde es un punto más hondo que antes y se lee sin forzar la vista.
7. **Error de formulario:** en el carrito, pulsa «Pedir por WhatsApp» con el nombre vacío. El mensaje de error sale en el rojo nuevo, **distinto** del rojo del sello OFERTA de la parrilla.
8. **Catálogo sin tasa:** edita `catalogo.json` y borra la línea `"tasa": 845,`. Recarga. La portada dice `Precios en CUP y USD` a secas, el pie vuelve a `Los precios pueden variar según la tasa del día.`, el carrito no enseña la nota, y **no hay ningún `undefined` ni `NaN`** en la página. Luego:
   ```bash
   git checkout -- catalogo.json
   ```
   🔴 Este paso es obligatorio: `catalogo.json` lo publica Stock+ y **jamás** se commitea editado.
9. **La tienda del socio:** abre `http://localhost:4173/electripower.html` y comprueba los puntos 1 y 2 allí también.

- [x] **Step 4: Toda la batería, una última vez**

```bash
node --test
```

Esperado: **199 tests, 199 pass, 0 fail**, exit 0.

- [x] **Step 5: Commit**

```bash
git add sw.js
git commit -m "chore(sw): cache a tienda-3b-v23 (tinta accesible y tasa a la vista)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Deja el informe de relevo**

Crea `docs/informes/2026-10-27-tinta-accesible-y-tasa-a-la-vista.md`, autocontenido, con:
- qué se cambió y por qué (los números de contraste de antes y de después);
- la salida **observada** de `node --test` (199/199, exit 0) — nunca una salida inventada;
- las nueve comprobaciones, cuáles pasaron y qué se vio;
- marcado con **⚠ NO VERIFICADO**: ningún teléfono real, y el despliegue si no se hizo.

- [ ] **Step 7: PARA aquí**

🔴 **No hagas `git push`.** Publicar la tienda la pone en producción para todos los clientes y **eso lo decide Ruth**. Deja la rama lista y dilo en el informe.

---

## Lo que este plan NO hace (a propósito)

- **No toca Stock+.** `tasa` y `generado` ya viajan en el catálogo.
- **No dice «elTOQUE» en ninguna parte.** La lectura automática existe en Stock+ pero hoy no funciona (falta `ELTOQUE_TOKEN`): atribuirle el número sería inventar una fuente. Cuando el token esté y se vea una lectura real, es otro plan.
- **No republica el catálogo al cambiar la tasa a mano** (el hueco de hasta 5 h descrito en la auditoría §1.2). Es un cambio en `server.js` de Stock+ y va aparte.
- **No toca el «Queda 1»** ni el sello OFERTA más allá de su tinta: lo de enseñar el descuento real (`-60 %`, «Ahorras 815 CUP») es el punto A3 de la revisión del 22/10 y sigue abierto.
- **No añade prueba social ni plazo de entrega** (§3.2 y §3.3 de la auditoría): el primero necesita Stock+, el segundo necesita que Ruth decida qué plazo promete.
