# Pasar las fotos deslizando el dedo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que en la ficha de producto se pueda pasar de una foto a otra deslizando el dedo sobre la foto grande (y arrastrando con el ratón en escritorio), sin romper el desplazamiento vertical de la página.

**Architecture:** Solo el repo `tienda-3b`. Las dos decisiones (¿esto fue un deslizamiento? ¿cuál es la foto siguiente?) son aritmética pura y viven en `galeria.js`, que ya existe y ya se prueba con `node --test`. `app.js` solo engancha eventos y llama a `pintarGaleria`, que ya está escrita. Se usan **eventos de puntero** (`pointerdown` / `pointerup` / `pointercancel`), que cubren dedo y ratón con el mismo código.

**Tech Stack:** JS de navegador sin dependencias, `node --test` con `node:vm`.

---

## 🔴 Lo que hace que esto salga bien o mal

**El dedo que desliza en horizontal y el que desplaza la página en vertical son el mismo dedo.**
Si se captura el gesto a lo bruto, el cliente deja de poder bajar por la ficha con el dedo encima de
la foto. Por eso:

1. **Nunca se llama a `preventDefault()`.** Eso sí rompe el desplazamiento vertical.

   ⚠ **Corrección del 2026-10-13, medida:** la primera versión de este plan también prohibía tocar
   `touch-action`, y **estaba mal**. Son cosas distintas: `preventDefault()` le quita el gesto al
   navegador a posteriori; `touch-action: pan-y` le dice por adelantado «el paneo vertical es tuyo,
   el horizontal es mío». Sin `pan-y`, Chrome reclama el paneo horizontal **aunque no haya nada que
   desplazar** y mata el gesto con `pointercancel`: en la prueba fallaban los tres primeros puntos.
   Con `pan-y` pasan los tres **y el vertical se mantiene** (`scrollTop` 0 → 235, comprobado). Por
   eso la Task 2 lo añade a `.modal-foto`.
2. Si el navegador decide que el gesto es un desplazamiento suyo, **emite `pointercancel`** y
   nosotros abandonamos. Esa es justo la señal que queremos.
3. Solo cuenta como deslizamiento si el movimiento horizontal supera **40 px** *y* es mayor que el
   vertical. Un toque normal (dx≈0) no pasa el filtro, así que **tocar la foto sigue sin hacer nada**,
   como hoy.

**Con una sola foto no se engancha nada.** Un producto sin fotos extra se comporta exactamente igual
que antes.

**Y en escritorio:** arrastrar una imagen con el ratón dispara el arrastre nativo del navegador (el
fantasma de la imagen). Hay que apagarlo, o el gesto se siente roto.

## 🔴 Obligatorio al terminar: subir la versión de la caché

Este plan toca `app.js` y `estilos.css`, que están en el `ARMAZON` del service worker. **Si no se
sube `CACHE` en `sw.js`, los clientes que ya tengan la tienda instalada seguirán viendo el código
viejo** y parecerá que el cambio no llegó. Es la Task 4 y no es opcional.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `galeria.js` *(modificar)* | Dos funciones puras nuevas: el paso del gesto y el índice siguiente. |
| `test/galeria.test.js` *(modificar)* | Sus pruebas. |
| `app.js` *(modificar)* | Enganchar los eventos de puntero sobre la foto grande. |
| `estilos.css` *(modificar)* | Apagar la selección y el arrastre nativo de la foto. |
| `index.html` *(modificar)* | `draggable="false"` en la foto grande. |
| `sw.js` *(modificar)* | Subir `CACHE` a `tienda-3b-v2`. |

---

### Task 1: La aritmética del gesto (pura)

**Files:**
- Modify: `C:\inventario\tienda-3b\galeria.js`
- Test: `C:\inventario\tienda-3b\test\galeria.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `test/galeria.test.js`, cambia la línea de la importación:

```js
const { fotosDe } = sandbox.window.Galeria;
```

por:

```js
const { fotosDe, pasoDelGesto, indiceSiguiente } = sandbox.window.Galeria;
```

y añade al final del archivo:

```js
// ── El gesto ──
// pasoDelGesto(dx, dy) -> +1 (siguiente), -1 (anterior) o 0 (no fue un deslizamiento).
// dx positivo = el dedo fue hacia la DERECHA = se quiere la foto ANTERIOR.

test('un deslizamiento claro hacia la izquierda pide la foto siguiente', () => {
  assert.strictEqual(pasoDelGesto(-120, 5), 1);
});

test('un deslizamiento claro hacia la derecha pide la foto anterior', () => {
  assert.strictEqual(pasoDelGesto(120, -8), -1);
});

test('un toque sin arrastre no es un deslizamiento', () => {
  assert.strictEqual(pasoDelGesto(0, 0), 0);
  assert.strictEqual(pasoDelGesto(3, 2), 0);
});

test('un arrastre horizontal corto no cuenta: el umbral son 40 px', () => {
  assert.strictEqual(pasoDelGesto(-39, 0), 0);
  assert.strictEqual(pasoDelGesto(-40, 0), 1);
});

test('si el dedo fue mas en vertical que en horizontal, NO es deslizamiento (es scroll)', () => {
  assert.strictEqual(pasoDelGesto(-50, 90), 0);
  assert.strictEqual(pasoDelGesto(60, -70), 0);
});

test('pasoDelGesto aguanta basura sin reventar', () => {
  assert.strictEqual(pasoDelGesto(undefined, undefined), 0);
  assert.strictEqual(pasoDelGesto(NaN, 0), 0);
  assert.strictEqual(pasoDelGesto('mucho', 0), 0);
});

test('indiceSiguiente da la vuelta en los dos sentidos', () => {
  assert.strictEqual(indiceSiguiente(2, 3, 1), 0);
  assert.strictEqual(indiceSiguiente(0, 3, -1), 2);
  assert.strictEqual(indiceSiguiente(0, 3, 1), 1);
  assert.strictEqual(indiceSiguiente(1, 3, 1), 2);
});

test('indiceSiguiente con una sola foto, o ninguna, se queda en 0', () => {
  assert.strictEqual(indiceSiguiente(0, 1, 1), 0);
  assert.strictEqual(indiceSiguiente(0, 0, 1), 0);
});
```

- [ ] **Step 2: Correr y ver que falla**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: falla con `TypeError: pasoDelGesto is not a function` (o similar).

- [ ] **Step 3: Implementar**

En `galeria.js`, busca la línea exacta:

```js
  window.Galeria = { fotosDe: fotosDe };
```

e inserta **encima**:

```js
  // Cuanto tiene que correr el dedo para que cuente como deslizamiento. Por debajo de
  // esto es un toque o un temblor de la mano.
  var UMBRAL_PX = 40;

  // (dx, dy) del gesto -> +1 siguiente, -1 anterior, 0 "no fue un deslizamiento".
  // dx NEGATIVO = el dedo fue hacia la izquierda = quiere ver la foto SIGUIENTE, igual
  // que al pasar hojas. Si el dedo corrio mas en vertical que en horizontal es un
  // desplazamiento de la pagina y aqui NO se hace nada.
  function pasoDelGesto(dx, dy) {
    var x = Number(dx);
    var y = Number(dy);
    if (!isFinite(x) || !isFinite(y)) return 0;
    if (Math.abs(x) < UMBRAL_PX) return 0;
    if (Math.abs(x) <= Math.abs(y)) return 0;
    return x < 0 ? 1 : -1;
  }

  // Indice siguiente/anterior dando la vuelta. Con 0 o 1 foto siempre es 0.
  function indiceSiguiente(actual, total, paso) {
    if (!(total > 1)) return 0;
    return ((actual + paso) % total + total) % total;
  }

```

Y cambia esa misma línea del export por:

```js
  window.Galeria = { fotosDe: fotosDe, pasoDelGesto: pasoDelGesto, indiceSiguiente: indiceSiguiente };
```

- [ ] **Step 4: Correr y ver que pasa**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `fail 0`, exit 0.

- [ ] **Step 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add galeria.js test/galeria.test.js && git commit -m "galeria: la aritmetica del gesto de deslizar"
```

---

### Task 2: Enganchar el gesto en la ficha

**Files:**
- Modify: `C:\inventario\tienda-3b\app.js`
- Modify: `C:\inventario\tienda-3b\estilos.css`
- Modify: `C:\inventario\tienda-3b\index.html`

- [ ] **Step 0: Dejarle el paneo horizontal al gesto**

En `estilos.css`, busca la línea exacta:

```css
.modal-foto{aspect-ratio:1;max-height:340px;background:var(--surface-2)}
```

y reemplázala por:

```css
/* touch-action:pan-y — el paneo VERTICAL sigue siendo del navegador (la ficha se
   desplaza con el dedo encima de la foto) y el HORIZONTAL queda para el gesto de
   pasar fotos. Sin esto Chrome reclama el horizontal aunque no haya nada que
   desplazar y mata el gesto con 'pointercancel'. NO es preventDefault(). */
.modal-foto{aspect-ratio:1;max-height:340px;background:var(--surface-2);touch-action:pan-y}
```

- [ ] **Step 1: Apagar el arrastre nativo de la imagen**

En `index.html`, busca la línea exacta:

```html
      <img id="modal-img" alt="">
```

y reemplázala por:

```html
      <img id="modal-img" alt="" draggable="false">
```

En `estilos.css`, busca la línea exacta:

```css
.modal-foto img{width:100%;height:100%;object-fit:cover;display:block}
```

y reemplázala por:

```css
.modal-foto img{width:100%;height:100%;object-fit:cover;display:block;-webkit-user-drag:none;user-select:none;-webkit-user-select:none}
```

(Sin esto, arrastrar la foto con el ratón en escritorio dispara el arrastre nativo del navegador —el
fantasma de la imagen— y el gesto se siente roto. En el teléfono evita además que se seleccione
texto al deslizar.)

- [ ] **Step 2: Enganchar los eventos de puntero**

En `app.js`, busca la línea exacta:

```js
function abrirDetalle(id) {
```

e inserta **encima**:

```js
// Deslizar sobre la foto grande para pasar a la siguiente. Eventos de PUNTERO: el mismo
// codigo sirve para el dedo y para el raton.
//
// 🔴 Aqui NO se llama a preventDefault() ni se toca touch-action, a proposito: el
// navegador sigue mandando sobre el desplazamiento vertical de la pagina. Si decide que
// el gesto es un scroll suyo, emite 'pointercancel' y nosotros abandonamos. Esa es la
// señal, y por eso el cliente puede seguir bajando por la ficha con el dedo encima de la
// foto. Quien cambie esto por touchstart/touchmove con preventDefault, lo romperá.
let gestoX = null;
let gestoY = null;

function engancharGestoGaleria() {
  const caja = document.querySelector('.modal-foto');
  if (!caja) return;
  caja.addEventListener('pointerdown', (e) => {
    if (galeriaFotos.length < 2) return;
    gestoX = e.clientX;
    gestoY = e.clientY;
  });
  caja.addEventListener('pointercancel', () => { gestoX = null; gestoY = null; });
  caja.addEventListener('pointerup', (e) => {
    if (gestoX === null) return;
    const paso = window.Galeria.pasoDelGesto(e.clientX - gestoX, e.clientY - gestoY);
    gestoX = null;
    gestoY = null;
    if (!paso) return;
    pintarGaleria(window.Galeria.indiceSiguiente(galeriaIndice, galeriaFotos.length, paso));
  });
}
```

- [ ] **Step 3: Llamarlo una sola vez al arrancar**

La caja `.modal-foto` es HTML fijo del documento: existe desde el principio y no se vuelve a crear,
así que se engancha **una vez** y no en cada apertura (enganchar en `abrirDetalle` acumularía un
manejador por cada ficha abierta).

En `app.js`, busca la línea exacta:

```js
  medirHeader();
```

e inserta **encima**:

```js
  engancharGestoGaleria();
```

- [ ] **Step 4: Correr las pruebas**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `fail 0`, exit 0.

- [ ] **Step 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add app.js estilos.css index.html && git commit -m "tienda: las fotos de la ficha pasan deslizando el dedo"
```

---

### Task 3: Mirarlo funcionando

**Files:** ninguno (solo observar)

Ningún producto real tiene fotos extra todavía, así que hay que fabricarlas para probar.

- [ ] **Step 1: Catálogo de prueba**

Edita `catalogo.json` **temporalmente**: a un producto cualquiera añádele `"fotos": [...]` con 3 URL
de fotos de otros productos del propio catálogo. Anota su código corto.

- [ ] **Step 2: Levantar la tienda**

```bash
cd "C:/inventario/tienda-3b" && npx --yes serve -l 4173 .
```

- [ ] **Step 3: Probarlo a 375 px, con gestos de verdad**

Abre la ficha de ese producto y comprueba, uno por uno:
1. Deslizar hacia la **izquierda** pasa a la foto siguiente, y la miniatura marcada se mueve con ella.
2. Deslizar hacia la **derecha** vuelve a la anterior.
3. Desde la última, deslizar a la izquierda **da la vuelta** a la primera.
4. 🔴 **Con el dedo sobre la foto, deslizar hacia ARRIBA desplaza la ficha**, como siempre. Si esto
   falla, el cambio está mal y hay que parar.
5. Un **toque** sobre la foto no cambia nada.
6. En un producto **sin** fotos extra, deslizar no hace nada y la página sigue desplazándose.
7. En **escritorio**, arrastrar con el ratón pasa la foto, y no aparece el fantasma de la imagen.

Guarda una captura en `docs/informes/` como `2026-10-13-galeria-deslizar-375px.png`.

- [ ] **Step 4: Deshacer el catálogo de prueba**

```bash
cd "C:/inventario/tienda-3b" && git checkout -- catalogo.json && git status --short
```

🔴 `catalogo.json` lo publica Stock+: no se edita a mano ni se commitea editado. `git status` tiene
que quedar sin mencionarlo.

---

### Task 4: Subir la versión de la caché (OBLIGATORIO)

**Files:**
- Modify: `C:\inventario\tienda-3b\sw.js`

- [ ] **Step 1: Cambiar el número**

En `sw.js`, busca la línea exacta:

```js
const CACHE = 'tienda-3b-v1';
```

y reemplázala por:

```js
const CACHE = 'tienda-3b-v2';
```

- [ ] **Step 2: Comprobar**

```bash
cd "C:/inventario/tienda-3b" && node --check sw.js && grep -n "const CACHE" sw.js
```

Esperado: exit 0 y `const CACHE = 'tienda-3b-v2';`.

- [ ] **Step 3: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add sw.js && git commit -m "pwa: caché v2, porque cambiaron app.js y estilos.css"
```

- [ ] **Step 4: Informe**

Crea `C:\inventario\tienda-3b\docs\informes\2026-10-13-galeria-deslizar-con-el-dedo.md` con lo
cambiado, la salida **observada** de `node --test`, los 7 puntos del Step 3 de la Task 3 uno por uno
(qué viste), y lo que no pudiste comprobar marcado «⚠ NO VERIFICADO». Commitéalo con ruta explícita.

**No hagas `git push`.** Lo decide el dueño.
