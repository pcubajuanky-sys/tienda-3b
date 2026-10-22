# «Ya está en tu pedido»: confirmar que el producto entró — Plan

> **Para ejecutores:** SUB-SKILL OBLIGATORIO: `superpowers:subagent-driven-development` o
> `superpowers:executing-plans`. Los pasos llevan casilla (`- [ ]`).

**Goal:** que al añadir un producto desde su ficha la clienta vea una confirmación y el paso
siguiente, en vez de quedarse sin ninguna señal visible.

**Architecture:** módulo puro `listo.js` (texto + «¿está este producto en el carrito?») y un
contenedor nuevo en la ficha que pinta `app.js`, debajo de `#modal-accion` y encima del botón
de preguntar. Mismo patrón que `preguntar.js` y `completar.js`.

**Tech Stack:** JavaScript de navegador sin framework. Pruebas `node:test` + `node:vm`.

---

## El problema, medido en producción el 2026-10-22

Reportado por el dueño: *«entra en el carrito pero no se sabe que está ahí y causa dudas»*.
Reproducido en www.3bqba.com a 375 px con un producto con variantes (`Ajusta invisible sin
tirantes`, código C76G): elegir color → «Añadir» → y esto es **todo** lo que recibe la clienta:

| Señal que debería confirmar | Qué pasa de verdad |
|---|---|
| `− 1 +` en la ficha | Lo único visible. El «1» se puede leer como stock, no como «lo tienes» |
| `1 en el pedido` | Existe en el DOM pero es **`sr-only`**: invisible salvo lector de pantalla |
| Barra inferior «1 producto · 1.790 CUP» | Activa (`hidden:false`) pero **tapada por el modal** — comprobado con `elementFromPoint`, que devuelve el `.qty` de la ficha |
| Contador 🛒 de la cabecera | Dice «1», pero el modal también tapa la cabecera |

**Conclusión:** mientras la ficha está abierta, **cero señales visibles**. Y la ficha es donde
se decide la compra.

**Decisión del dueño sobre el texto:** `✓ Listo — ver mi pedido (N)`.

---

## Estructura de archivos

| Archivo | Qué hace | Acción |
|---|---|---|
| `listo.js` | Módulo puro: el texto del botón y si el producto está en el carrito. | Crear |
| `test/listo.test.js` | Sus pruebas. | Crear |
| `index.html` | Un contenedor vacío + un `<script src>`. | Modificar |
| `app.js` | `unidadesEnCarrito()` (helper) + `pintarListoFicha()` + 2 llamadas + 1 clic. | Modificar |
| `estilos.css` | Estilo del botón. | Modificar |
| `sw.js` | `CACHE` → `v22` + `listo.js` en `ARMAZON`. | Modificar |

**Baseline a medir antes de empezar:** `node --test` desde la raíz. El 2026-10-22 daba
**177/177, exit 0**. Con las 8 pruebas nuevas debe quedar en **185/185**.

---

## Task 1: `listo.js` y sus pruebas

**Files:** Create `listo.js`, `test/listo.test.js`

- [ ] **Step 1: la prueba, primero**

```js
// test/listo.test.js — pruebas de listo.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'listo.js'), 'utf8'), sandbox);
const { texto, enElPedido } = sandbox.window.Listo;

test('el texto confirma Y dice el paso siguiente, con la cifra', () => {
  const t = texto(2);
  assert.match(t, /listo/i);
  assert.match(t, /pedido/i);
  assert.match(t, /\(2\)/);
});

test('con una sola unidad tambien lleva la cifra', () => {
  assert.match(texto(1), /\(1\)/);
});

test('sin unidades no hay texto: el boton no se enseña', () => {
  assert.strictEqual(texto(0), '');
  assert.strictEqual(texto(-1), '');
  assert.strictEqual(texto('dos'), '');
});

test('un producto SIN variantes esta en el pedido por su id pelado', () => {
  assert.strictEqual(enElPedido('p1', { p1: 2 }), true);
  assert.strictEqual(enElPedido('p1', { p9: 2 }), false);
});

test('un producto CON variantes esta en el pedido por cualquiera de sus combinaciones', () => {
  assert.strictEqual(enElPedido('p1', { 'p1|M / ROJO': 1 }), true);
  assert.strictEqual(enElPedido('p1', { 'p1|L / AZUL': 3 }), true);
});

test('🔴 un id que es PREFIJO de otro no cuenta como el mismo producto', () => {
  // Sin el separador explicito, 'p1' daria positivo con 'p12' y la ficha de p1 diria
  // que esta en el pedido cuando lo que hay es otro producto.
  assert.strictEqual(enElPedido('p1', { p12: 1 }), false);
  assert.strictEqual(enElPedido('p1', { 'p12|M': 1 }), false);
});

test('una linea con cantidad 0 no cuenta', () => {
  assert.strictEqual(enElPedido('p1', { p1: 0 }), false);
});

test('no lanza con basura', () => {
  assert.strictEqual(enElPedido('p1', null), false);
  assert.strictEqual(enElPedido(null, { p1: 1 }), false);
  assert.strictEqual(enElPedido('', { '': 1 }), false);
});
```

- [ ] **Step 2: verla fallar**

`cd "C:/inventario/tienda-3b" && node --test test/listo.test.js` → falla con `ENOENT`.

- [ ] **Step 3: el módulo**

```js
// listo.js — «ya esta en tu pedido»: la confirmacion que faltaba en la ficha.
//
// Modulo PURO (ni DOM ni red). Lo pinta app.js en la ficha, debajo de la accion de compra.
// Se prueba con node:vm desde test/listo.test.js.
//
// Por que existe (medido en produccion el 2026-10-22): al añadir desde la ficha, la clienta
// no recibia NINGUNA señal visible. El «1 en el pedido» que ya habia es `sr-only`, la barra
// inferior y el contador de la cabecera existen pero el modal los TAPA. Lo unico que se veia
// era el «1» entre el menos y el mas, que se puede leer como stock y no como «lo tienes».
(function () {
  'use strict';

  // El separador que usa claveCarrito() en app.js: `id` a secas, o `id|COMBINACION`.
  const SEP = '|';

  // (unidades) -> texto del boton, o '' si no hay nada que confirmar.
  function texto(unidades) {
    const n = Number(unidades);
    if (!Number.isFinite(n) || n <= 0) return '';
    return '✓ Listo — ver mi pedido (' + n + ')';
  }

  // (id, carrito) -> ¿hay alguna linea de ESTE producto, con o sin combinacion?
  //
  // 🔴 La comparacion es `k === id` o `k empieza por id + '|'`, NUNCA un startsWith pelado:
  // con startsWith(id) el producto 'p1' daria positivo con una linea de 'p12'.
  function enElPedido(id, carrito) {
    if (!id || !carrito || typeof carrito !== 'object') return false;
    const clave = String(id);
    return Object.keys(carrito).some(function (k) {
      if (!(Number(carrito[k]) > 0)) return false;
      return k === clave || k.indexOf(clave + SEP) === 0;
    });
  }

  window.Listo = { texto, enElPedido };
})();
```

- [ ] **Step 4: verla pasar** → `pass 8`, `fail 0`.
- [ ] **Step 5: batería completa** → **185/185**.
- [ ] **Step 6: commit**

```bash
cd "C:/inventario/tienda-3b" && git add listo.js test/listo.test.js && git commit -m "feat: modulo puro de la confirmacion «ya esta en tu pedido»"
```

---

## Task 2: cablearlo en la ficha

**Files:** Modify `index.html`, `app.js`, `estilos.css`

- [ ] **Step 1: `index.html`, el contenedor**

Busca:
```html
        <p class="espera-ficha" id="espera-ficha" hidden></p>
```
Pega **ENCIMA**:
```html
        <!-- «✓ Listo — ver mi pedido (N)» (2026-10-22). Va entre la acción de compra y el
             botón de preguntar: es la confirmación de que el producto entró, que hasta hoy
             no existía de forma visible (la barra inferior y el contador de la cabecera los
             tapa este mismo modal). Lo pinta pintarListoFicha() en app.js. -->
        <div class="ficha-listo" id="ficha-listo" hidden></div>
```

- [ ] **Step 2: `index.html`, el script**

Busca `<script src="completar.js"></script>` y deja debajo:
```html
<script src="listo.js"></script>
```

- [ ] **Step 3: `app.js`, extraer el contador de unidades**

🔴 **No copies la expresión.** En `guardarCarrito` está `Object.values(carrito).reduce((s, q) => s + q, 0)`.
Extráela a un helper y úsalo en los dos sitios — es la misma lección que dejó
`destinoWhatsApp()` en el plan del mismo día.

Pega **encima** de `function guardarCarrito() {`:
```js
// Unidades totales del pedido. Es lo que enseña el contador 🛒 de la cabecera y lo que
// repite el botón «Listo» de la ficha: tienen que decir lo MISMO o se contradicen.
function unidadesEnCarrito() {
  return Object.values(carrito).reduce((s, q) => s + q, 0);
}
```
Y dentro de `guardarCarrito`, sustituye:
```js
  const n = Object.values(carrito).reduce((s, q) => s + q, 0);
```
por:
```js
  const n = unidadesEnCarrito();
```

- [ ] **Step 4: `app.js`, la función que pinta**

Pega **justo debajo** del cierre de `pintarPreguntarProducto`:
```js
// La confirmación de la ficha: «✓ Listo — ver mi pedido (N)». Solo sale si ESTE producto
// tiene alguna línea en el pedido (con o sin combinación elegida).
//
// 🔴 Es un <button>, no un <a>: abre el carrito, que es una capa del historial. Un enlace
// metería una entrada de más y el «atrás» dejaría de cerrar bien.
function pintarListoFicha(id) {
  const caja = document.getElementById('ficha-listo');
  if (!caja) return;
  const hay = window.Listo.enElPedido(id, carrito);
  const txt = hay ? window.Listo.texto(unidadesEnCarrito()) : '';
  if (!txt) { caja.hidden = true; caja.innerHTML = ''; return; }
  caja.hidden = false;
  caja.innerHTML = '<button type="button" class="btn btn-primario ficha-listo-btn" ' +
    'data-ver-pedido="1">' + escapeHtml(txt) + '</button>';
}
```

- [ ] **Step 5: `app.js`, las dos llamadas**

En `refrescarAcciones`, debajo de `pintarPreguntarProducto(id, claveActual);`:
```js
    pintarListoFicha(id);
```
En `mostrarDetalle`, debajo de `pintarPreguntarProducto(id, null);`:
```js
  pintarListoFicha(id);
```

- [ ] **Step 6: `app.js`, el clic**

En la delegación global de clics (la que ya mira `[data-add]`, hacia la línea 2160), añade
junto a las demás ramas:
```js
    const verPedido = e.target.closest('[data-ver-pedido]');
```
y en la cadena de `else if`, **antes** de la rama de `add`:
```js
    else if (verPedido) { e.stopPropagation(); abrirCarrito(); }
```

- [ ] **Step 7: `estilos.css`**

Busca `.ficha-preguntar{margin-top:var(--e1)}` y pega **ENCIMA**:
```css
/* «✓ Listo — ver mi pedido» (2026-10-22). Va lleno y a todo el ancho: es la confirmación
   que la clienta estaba esperando y el camino a pagar, así que tiene que verse. El de
   preguntar, justo debajo, se queda en línea y secundario. */
.ficha-listo{margin-top:var(--e1)}
.ficha-listo-btn{display:flex;width:100%;justify-content:center;align-items:center;gap:6px}
```

- [ ] **Step 8: verificar** → `node --check app.js` (exit 0) y `node --test` → **185/185**.
- [ ] **Step 9: commit**

```bash
cd "C:/inventario/tienda-3b" && git add index.html app.js estilos.css && git commit -m "feat: confirmar en la ficha que el producto entro en el pedido"
```

---

## Task 3: service worker

- [ ] `sw.js`: `const CACHE = 'tienda-3b-v21';` → `'tienda-3b-v22'`.
- [ ] En `ARMAZON`, debajo de `'/completar.js',` añade `'/listo.js',`.
- [ ] Commit: `chore: cache v22 con listo.js en el armazon`.

---

## Task 4: verificación en navegador (375 px)

🔴 Los tests no bastan: no ejecutan `app.js`.

- [ ] 1. Producto **con variantes**: elegir color → «Añadir» → aparece `✓ Listo — ver mi pedido (1)` entre el `− 1 +` y el botón de preguntar.
- [ ] 2. Pulsar `+` → la cifra del botón sube a `(2)` sola.
- [ ] 3. Pulsar el botón → se abre el carrito **encima** de la ficha.
- [ ] 4. Cerrar el carrito con «atrás» → vuelve a la ficha, no saca de la tienda.
- [ ] 5. Bajar a 0 con `−` → el botón desaparece y vuelve «Añadir».
- [ ] 6. Producto **sin variantes**: el botón sale igual.
- [ ] 7. Abrir la ficha de un producto **que NO está** en el pedido teniendo otros: el botón **no** sale (es por producto, no por carrito).
- [ ] 8. La cifra del botón coincide con la del contador 🛒 de la cabecera.
- [ ] 9. A 1280 px la ficha sigue bien y el botón no desborda.

---

## Lo que este plan NO hace

- No toca las tarjetas de la parrilla: ahí la barra inferior «Ver pedido» sí se ve.
- No quita el `1 en el pedido` de `sr-only`: sigue sirviendo al lector de pantalla.
- No cambia la barra inferior ni el contador de la cabecera.
