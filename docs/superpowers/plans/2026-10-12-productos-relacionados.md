# Productos relacionados en la ficha — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la ficha de un producto termine enseñando hasta 6 productos parecidos, para que el cliente siga mirando en vez de cerrar.

**Architecture:** Todo pasa en el navegador y solo en el repo `tienda-3b`: el catálogo ya trae `cat` y `subcat` en cada producto, así que no hace falta publicar ni un campo nuevo ni tocar Stock+. La elección vive en un módulo puro nuevo (`relacionados.js`, mismo patrón IIFE que `tarjeta.js` y `galeria.js`) para poder probarla con `node --test` sin navegador; `app.js` solo pinta y engancha el clic.

**Tech Stack:** JS de navegador sin dependencias, `node --test` con `node:vm`.

---

## Decisiones tomadas de antemano

- **El orden es determinista, no al azar.** Primero los de la misma subcategoría, luego el resto de la categoría; dentro de cada grupo, antes los destacados, luego los que están en oferta, y a igualdad por nombre. Sin `Math.random()`: una lista que cambia en cada apertura se puede probar peor y al cliente le parece inestable.
- **Nunca se enseña el producto que ya está abierto.**
- **Si no hay al menos 2 candidatos, la sección no se pinta.** Un «relacionados» con una sola tarjeta es ruido.
- **No se mete el reclamo de gestores** (`cta-comi`) en esta tira: ya sale en la parrilla y dentro de la ficha compite con la compra.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `relacionados.js` *(crear)* | Puro: elige y ordena los productos parecidos. |
| `test/relacionados.test.js` *(crear)* | Pruebas del módulo anterior. |
| `index.html` *(modificar)* | El hueco de la sección en el modal + el `<script>` nuevo. |
| `estilos.css` *(modificar)* | Estilo de la tira. |
| `app.js` *(modificar)* | Pintar la tira al abrir la ficha, vaciarla al cerrar y abrir el producto tocado. |

---

### Task 1: Módulo puro de relacionados

**Files:**
- Create: `C:\inventario\tienda-3b\relacionados.js`
- Test: `C:\inventario\tienda-3b\test\relacionados.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

Crea `test/relacionados.test.js`:

```js
// test/relacionados.test.js — pruebas de relacionados.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'relacionados.js'), 'utf8'), sandbox);
const { elegir } = sandbox.window.Relacionados;

const p = (id, cat, subcat, extra) => Object.assign({ id: id, name: id, cat: cat, subcat: subcat || '' }, extra || {});

const ITEMS = [
  p('abierto', 'Hogar', 'Cocina'),
  p('mismaSub1', 'Hogar', 'Cocina'),
  p('mismaSub2', 'Hogar', 'Cocina', { destacado: true }),
  p('mismaCat1', 'Hogar', 'Baño'),
  p('mismaCat2', 'Hogar', 'Baño', { enOferta: true }),
  p('otraCat', 'Ropa', 'Camisas'),
];

test('nunca devuelve el producto que esta abierto', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.strictEqual(r.indexOf('abierto'), -1);
});

test('no sale nada de otra categoria', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.strictEqual(r.indexOf('otraCat'), -1);
});

test('la misma subcategoria va primero, y dentro de ella el destacado antes', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.deepStrictEqual(r.slice(0, 2), ['mismaSub2', 'mismaSub1']);
});

test('despues de la subcategoria viene el resto de la categoria, con la oferta antes', () => {
  const r = elegir(ITEMS[0], ITEMS, 6).map((x) => x.id);
  assert.deepStrictEqual(r.slice(2), ['mismaCat2', 'mismaCat1']);
});

test('respeta el tope', () => {
  assert.strictEqual(elegir(ITEMS[0], ITEMS, 2).length, 2);
});

test('con menos de dos candidatos devuelve lista vacia: una sola tarjeta es ruido', () => {
  const solos = [p('a', 'Hogar', 'Cocina'), p('b', 'Hogar', 'Cocina')];
  assert.deepStrictEqual(elegir(solos[0], solos, 6), []);
});

test('sin catalogo o sin producto no revienta', () => {
  assert.deepStrictEqual(elegir(null, ITEMS, 6), []);
  assert.deepStrictEqual(elegir(ITEMS[0], null, 6), []);
  assert.deepStrictEqual(elegir(ITEMS[0], [], 6), []);
});
```

- [ ] **Step 2: Correr la prueba y ver que falla**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: FALLA con `ENOENT ... relacionados.js`.

- [ ] **Step 3: Escribir el módulo**

Crea `relacionados.js`:

```js
// relacionados.js — que productos se enseñan debajo de la ficha abierta.
// Script de navegador (IIFE con window.Relacionados), mismo patron que tarjeta.js y
// galeria.js: la logica vive aqui para poder probarla con `node --test` sin navegador.
//
// El orden es DETERMINISTA a proposito (nada de Math.random): una lista que cambia en
// cada apertura no se puede probar y al cliente le parece que la tienda se mueve sola.
(function () {
  'use strict';

  var TOPE_POR_DEFECTO = 6;
  var MINIMO = 2;   // con una sola tarjeta la seccion no se pinta

  // Dentro de un grupo: primero los destacados, luego los de oferta, luego por nombre.
  function comparar(a, b) {
    var da = a.destacado ? 0 : 1;
    var db = b.destacado ? 0 : 1;
    if (da !== db) return da - db;
    var oa = a.enOferta ? 0 : 1;
    var ob = b.enOferta ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  }

  // Los parecidos al producto `p`, hasta `tope`. Misma subcategoria primero, luego el
  // resto de su categoria. Nunca el propio `p`, nunca otra categoria.
  function elegir(p, items, tope) {
    var max = tope > 0 ? tope : TOPE_POR_DEFECTO;
    if (!p || !Array.isArray(items)) return [];
    var cat = p.cat || '';
    var sub = p.subcat || '';
    var mismos = items.filter(function (x) { return x && x.id !== p.id && (x.cat || '') === cat; });
    if (mismos.length < MINIMO) return [];
    var deSub = mismos.filter(function (x) { return sub && (x.subcat || '') === sub; }).sort(comparar);
    var resto = mismos.filter(function (x) { return !sub || (x.subcat || '') !== sub; }).sort(comparar);
    return deSub.concat(resto).slice(0, max);
  }

  window.Relacionados = { elegir: elegir };
})();
```

- [ ] **Step 4: Correr la prueba y ver que pasa**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `fail 0`, exit 0.

- [ ] **Step 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add relacionados.js test/relacionados.test.js && git commit -m "tienda: modulo puro de productos relacionados"
```

---

### Task 2: Pintar la tira en la ficha

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html`
- Modify: `C:\inventario\tienda-3b\estilos.css`
- Modify: `C:\inventario\tienda-3b\app.js`

- [ ] **Step 1: Cargar el script**

En `index.html`, busca la línea exacta:

```html
<script src="tarjeta.js"></script>
```

e inserta **encima**:

```html
<script src="relacionados.js"></script>
```

- [ ] **Step 2: Añadir el hueco en el modal**

En `index.html`, busca la línea exacta:

```html
      <div class="compartir" id="modal-compartir">
```

e inserta **encima**:

```html
        <!-- Relacionados: va DEBAJO de la accion de compra y ENCIMA de compartir. Lo
             pinta pintarRelacionados() en app.js; con menos de dos candidatos queda
             oculto (ver relacionados.js). -->
        <section class="rel" id="modal-rel" hidden aria-labelledby="rel-titulo">
          <h3 class="rel-titulo" id="rel-titulo">Más de esta categoría</h3>
          <div class="rel-tira" id="rel-tira"></div>
        </section>
```

- [ ] **Step 3: Estilar la tira**

En `estilos.css`, busca la línea exacta:

```css
/* ── Compartir (dentro del modal de detalle) ── */
```

e inserta **encima**:

```css
/* ── Relacionados (dentro del modal de detalle) ── */
/* Tira que se arrastra: a 375px entran dos y media, asi que se ve que hay mas. */
.rel{margin-top:22px;border-top:1px solid var(--border);padding-top:16px}
.rel-titulo{font-size:14px;font-weight:700;margin-bottom:10px}
.rel-tira{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.rel-card{flex:0 0 120px;padding:0;border:none;background:none;text-align:left;cursor:pointer}
.rel-foto{width:120px;height:120px;border-radius:10px;overflow:hidden;background:var(--surface-2)}
.rel-foto img{width:100%;height:100%;object-fit:cover;display:block}
.rel-nom{font-size:12px;line-height:1.3;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rel-precio{font-size:13px;font-weight:700;margin-top:2px}
```

(Los tokens `--border`, `--surface-2` y `--brand` ya existen en `estilos.css` y cambian solos en modo oscuro; comprobado el 2026-10-12.)

- [ ] **Step 4: Pintar y enganchar**

En `app.js`, busca la línea exacta:

```js
function abrirDetalle(id) {
```

e inserta **encima**:

```js
// Relacionados de la ficha abierta. Con menos de dos candidatos la seccion no se pinta
// (lo decide relacionados.js, no esta funcion).
function pintarRelacionados(p) {
  const sec = document.getElementById('modal-rel');
  const tira = document.getElementById('rel-tira');
  if (!sec || !tira) return;
  const lista = window.Relacionados.elegir(p, CAT.items || [], 6);
  if (!lista.length) { sec.hidden = true; tira.innerHTML = ''; return; }
  sec.hidden = false;
  tira.innerHTML = lista.map((x) =>
    `<button type="button" class="rel-card" data-rel="${x.id}">` +
    `<span class="rel-foto"><img src="${fotoMosaico(x.photo)}" alt="" loading="lazy"></span>` +
    `<span class="rel-nom">${escapeHtml(x.name)}</span>` +
    `<span class="rel-precio">${x.moneda === 'usd' ? '$' + x.precioUSD : fmt(x.precioCUP) + ' CUP'}</span>` +
    `</button>`).join('');
}
```

- [ ] **Step 5: Llamarla al abrir y vaciarla al cerrar**

En `app.js`, dentro de `abrirDetalle(id)`, busca la línea exacta:

```js
  const avisoComp = document.getElementById('compartir-aviso');
```

e inserta **encima**:

```js
  pintarRelacionados(p);
```

Después, dentro de `cerrarDetalle()`, busca la línea exacta:

```js
  productoModal = null;
```

e inserta **debajo**:

```js
  const secRel = document.getElementById('modal-rel');
  if (secRel) { secRel.hidden = true; document.getElementById('rel-tira').innerHTML = ''; }
```

- [ ] **Step 6: Abrir el producto que se toca**

En `app.js`, busca la línea exacta:

```js
    const chip = e.target.closest('[data-val]');
```

y añade **encima**:

```js
    const rel = e.target.closest('[data-rel]');
    if (rel) {
      abrirDetalle(rel.dataset.rel);
      document.querySelector('#modal-detalle .modal-caja').scrollTop = 0;
      return;
    }
```

🔴 Lee la función donde cae esa línea y comprueba que el manejador escucha dentro de `#modal-detalle`. Si no, **para y pregunta**.

- [ ] **Step 7: Correr las pruebas**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `fail 0`, exit 0.

- [ ] **Step 8: Mirarlo en el navegador**

```bash
cd "C:/inventario/tienda-3b" && npx --yes serve -l 4173 .
```

Abre `http://localhost:4173` a **375 px de ancho** y comprueba:
1. Abres un producto de una categoría con muchos (por ejemplo «Cabello», que tiene 25) → debajo del botón de añadir sale «Más de esta categoría» con una tira que se arrastra.
2. El producto abierto **no** aparece en su propia tira.
3. Tocas uno de la tira → la ficha cambia a ese producto, la vista sube al principio y la tira se recalcula.
4. Cierras y vuelves a abrir otro: la tira no arrastra la del anterior.
5. Buscas un producto de una categoría con **un solo** producto más: la sección no aparece.
6. Míralo también en **modo oscuro** (el conmutador del sistema): el borde y el texto se leen.

- [ ] **Step 9: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add index.html estilos.css app.js && git commit -m "tienda: la ficha enseña productos relacionados"
```

- [ ] **Step 10: Informe y README**

Crea `C:\inventario\tienda-3b\docs\informes\2026-10-12-productos-relacionados.md` con lo cambiado, la cifra de pruebas **observada** y lo que viste en el navegador. Añade al `README.md` un párrafo corto sobre `relacionados.js` y la regla del mínimo de dos. Commitea los dos con rutas explícitas.
