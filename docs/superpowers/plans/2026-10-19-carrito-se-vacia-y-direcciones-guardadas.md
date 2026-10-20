# El carrito se vacía solo + el cliente guarda sus direcciones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el carrito se vacíe solo cuando el cliente vuelve de enviar su pedido por WhatsApp —preguntándole primero— y que pueda guardar hasta 4 direcciones en su teléfono para rellenar el formulario de un toque en el siguiente pedido.

**Architecture:** Dos módulos puros nuevos al estilo de los que ya hay (IIFE + `window.X`, probados con `node:vm`): `direcciones.js` (la libreta: normalizar, comparar, cargar, guardar) y `traspedido.js` (decidir si toca preguntar «¿ya enviaste tu pedido?»). `app.js` solo pinta y engancha. Todo vive en el `localStorage` del cliente, como ya hacen el carrito y el código del gestor; **la tienda no tiene backend y nada de esto sale del teléfono**.

**Tech Stack:** JavaScript de navegador sin dependencias ni empaquetador · `node --test` con `node:vm` · PWA con service worker versionado.

---

## Lo que hay hoy (leído en el código, no supuesto)

- El pedido **no se envía desde la web**: `enviarPorWhatsApp` (`app.js`) termina en un
  `window.open('https://api.whatsapp.com/send?...')` y es el cliente quien pulsa enviar
  dentro de WhatsApp. La tienda **nunca sabe** si llegó a enviarlo.
- El carrito vive en `localStorage` bajo la clave `carrito` y **no se vacía nunca solo**.
  `vaciarPedido()` existe, pero lo dispara un botón y empieza con un `confirm()`.
- El formulario (`#form-pedido`) tiene `c-nombre`, `c-tel`, `c-dir`, `c-horario`
  (+ `c-horario-libre` para «Otro horario…») y `c-nota`. **No se rellena solo**: el cliente
  reescribe sus datos en cada pedido.
- Ya existe un `visibilitychange` en `iniciar()` que llama a `revalidarCierre()` cuando la
  pestaña vuelve a ser visible. Es el enganche natural para «el cliente volvió de WhatsApp».

## Decisiones tomadas con el dueño (no las cambies por tu cuenta)

1. **El carrito NO se vacía al pulsar el botón.** Se vacía cuando el cliente **vuelve** a la
   tienda y responde que sí lo envió. Si se vaciara al pulsar y no llegara a enviar el
   mensaje, perdería el pedido entero: peor que el problema que se arregla.
2. **Las direcciones viven solo en el teléfono del cliente.** Ni servidor, ni cuentas, ni
   sincronización entre dispositivos: la tienda es estática y no hay dónde guardarlas.
3. **El guardado es explícito**, con una casilla en el formulario que el cliente marca antes
   de enviar. Nada de guardar a sus espaldas, y la decisión se toma **antes** de irse a
   WhatsApp, no al volver (puede no volver).
4. **Máximo 4 direcciones**, para que no se le llene la pantalla del móvil.
5. **«Olvidar mis datos»** siempre disponible cuando hay algo guardado: el teléfono puede ser
   de la casa y usarlo varias personas.

## 🔴 Tres trampas de este repo que este plan ya tiene en cuenta

1. **Un `<input type="checkbox">` rompería el service worker.** `escribiendoPedido()`
   (`app.js`, al final, dentro del bloque del service worker) decide si puede recargar la
   página así:

   ```js
   return [...f.querySelectorAll('input, textarea, select')].some((c) => String(c.value || '').trim() !== '');
   ```

   El `value` de un checkbox es **`"on"` esté marcado o no**. Si se añade la casilla sin
   tocar esa función, **siempre** devolvería «el cliente está escribiendo» y el service
   worker **no volvería a actualizar la tienda en ningún teléfono, nunca**. La Tarea 4 lo
   arregla en el mismo commit que añade la casilla.
2. **`localStorage` puede lanzar** (modo incógnito, Safari con datos bloqueados). Todo acceso
   va en `try/catch` y la tienda tiene que funcionar igual sin él, como ya hace
   `encargos.js`.
3. **Subir `CACHE` en `sw.js`** es obligatorio: se tocan `app.js`, `index.html` y
   `estilos.css`. Hoy está en `tienda-3b-v13` y pasa a `tienda-3b-v14` (Tarea 5).

## Estructura de archivos

| Archivo | Qué hace | Tarea |
|---|---|---|
| `direcciones.js` **(nuevo)** | Puro. `normalizar`, `mismaDireccion`, `cargar`, `guardar`, `MAX`. | 1 |
| `test/direcciones.test.js` **(nuevo)** | Pruebas del anterior con `node:vm`. | 1 |
| `traspedido.js` **(nuevo)** | Puro. `debePreguntar(marca, ahora, hayCarrito)` y `VENTANA_MS`. | 3 |
| `test/traspedido.test.js` **(nuevo)** | Pruebas del anterior. | 3 |
| `index.html` | Dos `<script src>`, la tira de direcciones, la casilla de guardar y el aviso de vuelta. | 1, 2, 3, 4 |
| `estilos.css` | Estilo de la tira, la casilla y el aviso. | 2, 4 |
| `app.js` | Pinta la libreta, rellena el formulario, guarda al enviar, pregunta al volver. | 2, 4 |
| `sw.js` | Los dos archivos nuevos en `ARMAZON` y `CACHE` → `tienda-3b-v14`. | 1, 3, 5 |

## Cómo se corren las pruebas

Desde la raíz del repo (`C:\inventario\tienda-3b`), en PowerShell:

```
node --test
```

🔴 **`node --test` a secas, NUNCA `node --test test/`**: con Node 24 esa forma falla.
La batería está hoy en **100/100**. Cada tarea dice cuántas debe haber al terminar.

---

### Task 1: La libreta de direcciones (`direcciones.js`)

**Files:**
- Create: `C:\inventario\tienda-3b\direcciones.js`
- Create: `C:\inventario\tienda-3b\test\direcciones.test.js`
- Modify: `C:\inventario\tienda-3b\index.html` (los `<script src>` del final)
- Modify: `C:\inventario\tienda-3b\sw.js` (la lista `ARMAZON`)

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/direcciones.test.js` con este contenido exacto:

```js
// test/direcciones.test.js — pruebas de direcciones.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'direcciones.js'), 'utf8'), sandbox);
const { normalizar, mismaDireccion, cargar, guardar, MAX } = sandbox.window.Direcciones;

const CASA = { etiqueta: 'Casa', nombre: 'Ana', tel: '55551234', dir: 'Calle 1 #2', horario: 'en la tarde' };
const TRABAJO = { etiqueta: 'Trabajo', nombre: 'Ana', tel: '55551234', dir: 'Avenida 3', horario: 'en la mañana' };

test('normalizar recorta espacios y deja los cinco campos', () => {
  const d = normalizar({ etiqueta: '  Casa  ', nombre: ' Ana ', tel: ' 5555 ', dir: '  Calle 1  #2 ', horario: ' en la tarde ' });
  assert.strictEqual(d.etiqueta, 'Casa');
  assert.strictEqual(d.nombre, 'Ana');
  assert.strictEqual(d.tel, '5555');
  assert.strictEqual(d.dir, 'Calle 1 #2');
  assert.strictEqual(d.horario, 'en la tarde');
});

test('normalizar aguanta basura sin lanzar', () => {
  const d = normalizar(null);
  assert.strictEqual(d.etiqueta, '');
  assert.strictEqual(d.dir, '');
  const e = normalizar({ dir: 12345 });
  assert.strictEqual(e.dir, '12345');
});

test('normalizar recorta lo larguisimo: nadie tiene una direccion de mil letras', () => {
  const d = normalizar({ etiqueta: 'a'.repeat(50), dir: 'b'.repeat(500) });
  assert.strictEqual(d.etiqueta.length, 20);
  assert.strictEqual(d.dir.length, 120);
});

test('mismaDireccion ignora mayusculas, acentos y espacios de sobra', () => {
  assert.ok(mismaDireccion({ dir: 'Calle Martí  #5' }, { dir: 'calle marti #5' }));
  assert.ok(!mismaDireccion({ dir: 'Calle 1' }, { dir: 'Calle 2' }));
});

test('mismaDireccion con una direccion vacia da false: no se confunden dos vacias', () => {
  assert.ok(!mismaDireccion({ dir: '' }, { dir: '' }));
});

test('cargar lee la lista y descarta lo que no sirve', () => {
  const lista = cargar(JSON.stringify([CASA, { dir: '' }, 'basura', null, TRABAJO]));
  assert.strictEqual(lista.length, 2);
  assert.strictEqual(lista[0].etiqueta, 'Casa');
  assert.strictEqual(lista[1].etiqueta, 'Trabajo');
});

test('cargar con texto roto, vacio o ausente devuelve una lista vacia', () => {
  assert.strictEqual(cargar('{no es json').length, 0);
  assert.strictEqual(cargar('').length, 0);
  assert.strictEqual(cargar(null).length, 0);
  assert.strictEqual(cargar('{"no":"es un array"}').length, 0);
});

test('guardar pone la nueva primero', () => {
  const lista = guardar([CASA], TRABAJO);
  assert.strictEqual(lista.length, 2);
  assert.strictEqual(lista[0].etiqueta, 'Trabajo');
  assert.strictEqual(lista[1].etiqueta, 'Casa');
});

test('guardar la MISMA direccion la actualiza en vez de duplicarla', () => {
  const lista = guardar([CASA], { etiqueta: 'Mi casa', nombre: 'Ana Luisa', tel: '999', dir: 'calle 1 #2', horario: 'a cualquier hora' });
  assert.strictEqual(lista.length, 1);
  assert.strictEqual(lista[0].etiqueta, 'Mi casa');
  assert.strictEqual(lista[0].nombre, 'Ana Luisa');
});

test('guardar sin direccion no cambia nada: no se guarda una ficha vacia', () => {
  const lista = guardar([CASA], { etiqueta: 'Vacia', dir: '   ' });
  assert.strictEqual(lista.length, 1);
  assert.strictEqual(lista[0].etiqueta, 'Casa');
});

test('guardar sin etiqueta la inventa con la direccion, para que el boton diga algo', () => {
  const lista = guardar([], { dir: 'Calle Nueva 7', nombre: 'Ana' });
  assert.strictEqual(lista.length, 1);
  assert.ok(lista[0].etiqueta.length > 0, 'la etiqueta no puede quedar vacia');
});

test('guardar nunca pasa del tope: la mas vieja se cae', () => {
  let lista = [];
  for (let i = 1; i <= MAX + 2; i++) lista = guardar(lista, { etiqueta: 'D' + i, dir: 'Calle ' + i });
  assert.strictEqual(lista.length, MAX);
  assert.strictEqual(lista[0].etiqueta, 'D' + (MAX + 2));   // la ultima guardada va primero
  assert.ok(!lista.some((d) => d.etiqueta === 'D1'), 'la mas vieja tenia que caerse');
});

test('guardar NO toca la lista que recibe', () => {
  const original = [CASA];
  guardar(original, TRABAJO);
  assert.strictEqual(original.length, 1);
  assert.strictEqual(original[0].etiqueta, 'Casa');
});
```

- [ ] **Step 2: Córrela y comprueba que falla**

Run: `node --test`
Expected: falla al cargar `test/direcciones.test.js` porque `direcciones.js` no existe
(`ENOENT: no such file or directory ... direcciones.js`). El resto sigue en verde.

- [ ] **Step 3: Escribe el módulo**

Crea `direcciones.js` con este contenido exacto:

```js
// direcciones.js — la libreta de direcciones del cliente.
//
// Modulo PURO: ni DOM ni localStorage. Recibe texto y listas, devuelve listas nuevas.
// Quien lee y escribe el localStorage es app.js. Se prueba con node:vm desde
// test/direcciones.test.js.
//
// 🔴 Esto vive SOLO en el telefono del cliente. La tienda es estatica: no hay servidor
// donde guardar nada, y los datos no salen de ahi mas que en el mensaje de WhatsApp que
// el propio cliente envia.
(function () {
  'use strict';

  const MAX = 4;              // mas de 4 botones no caben en un movil
  const LARGO = { etiqueta: 20, nombre: 60, tel: 25, dir: 120, horario: 80 };

  function texto(v, max) {
    const s = (v === undefined || v === null) ? '' : String(v);
    return s.replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function normalizar(d) {
    const o = d || {};
    return {
      etiqueta: texto(o.etiqueta, LARGO.etiqueta),
      nombre: texto(o.nombre, LARGO.nombre),
      tel: texto(o.tel, LARGO.tel),
      dir: texto(o.dir, LARGO.dir),
      horario: texto(o.horario, LARGO.horario),
    };
  }

  // La direccion es la identidad de la ficha: dos fichas con la misma direccion son la
  // misma, aunque el cliente le cambie la etiqueta o corrija su telefono.
  function llave(dir) {
    return texto(dir, LARGO.dir).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function mismaDireccion(a, b) {
    const x = llave((a || {}).dir);
    const y = llave((b || {}).dir);
    return x !== '' && x === y;
  }

  // Texto crudo del localStorage -> lista limpia. Nunca lanza: lo que no sirve se tira.
  function cargar(texto0) {
    let bruto = null;
    try { bruto = JSON.parse(texto0 || '[]'); } catch (e) { return []; }
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((d) => d && typeof d === 'object')
      .map(normalizar)
      .filter((d) => d.dir !== '')
      .slice(0, MAX);
  }

  // Devuelve una lista NUEVA con `nueva` delante. Si ya habia una ficha con esa misma
  // direccion, se sustituye (no se duplica). Sin direccion no se guarda nada.
  function guardar(lista, nueva) {
    const d = normalizar(nueva);
    if (d.dir === '') return (lista || []).slice(0, MAX);
    if (d.etiqueta === '') d.etiqueta = texto(d.dir, LARGO.etiqueta);   // el boton tiene que decir algo
    const resto = (lista || []).filter((x) => !mismaDireccion(x, d));
    return [d].concat(resto).slice(0, MAX);
  }

  // No hay un "borrar una sola" a proposito: con el tope de 4 las viejas se caen solas,
  // guardar la misma direccion la corrige, y para empezar de cero esta "Olvidar mis datos".
  window.Direcciones = { MAX, normalizar, mismaDireccion, cargar, guardar };
})();
```

- [ ] **Step 4: Córrela y comprueba que pasa**

Run: `node --test`
Expected: **112/112** (100 de antes + 12 nuevas), `exit 0`.

- [ ] **Step 5: Regístralo en la página y en el service worker**

En `index.html`, tras `<script src="faltante.js"></script>`:

```html
<script src="direcciones.js"></script>
```

En `sw.js`, dentro de `ARMAZON`, tras `'/faltante.js',`:

```js
  '/direcciones.js',
```

🔴 **No subas `CACHE` todavía**: se sube una sola vez, en la Tarea 5.

- [ ] **Step 6: Commit**

```bash
git add direcciones.js test/direcciones.test.js index.html sw.js
git commit -m "feat: libreta de direcciones del cliente"
```

---

### Task 2: La tira de direcciones en el formulario

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html` (el campo `c-dir` dentro de `#form-pedido`)
- Modify: `C:\inventario\tienda-3b\estilos.css` (al final)
- Modify: `C:\inventario\tienda-3b\app.js`

- [ ] **Step 1: El hueco en el HTML**

En `index.html`, el campo de la dirección pasa a llevar debajo su tira de botones y el
enlace de olvidar. Sustituye ese `<label class="campo">` entero por:

```html
      <label class="campo">
        <span>Dirección de entrega</span>
        <input type="text" id="c-dir" autocomplete="street-address">
        <span class="campo-error" id="err-dir" hidden>Falta la dirección.</span>
      </label>
      <div id="dir-guardadas" class="dir-guardadas" hidden>
        <span class="dir-guardadas-tit">Tus direcciones guardadas</span>
        <div id="dir-guardadas-tira" class="dir-guardadas-tira"></div>
        <button type="button" id="dir-olvidar" class="dir-olvidar">Olvidar mis datos</button>
      </div>
```

🔴 La tira va **fuera** del `<label>`: dentro, tocar un botón contaría como tocar la
etiqueta del campo y el navegador movería el foco al `input`.

- [ ] **Step 2: El estilo**

Al final de `estilos.css`:

```css
/* Direcciones guardadas del cliente (viven solo en su teléfono).
   Mismos tokens que .filtro-pill, que es el chip que ya existe en la tienda. */
.dir-guardadas { margin: -4px 0 14px; }
.dir-guardadas-tit { display: block; font-size: var(--t-xs); color: var(--text-2); margin-bottom: 6px; }
.dir-guardadas-tira { display: flex; flex-wrap: wrap; gap: 8px; }
.dir-chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--brand);
  border-radius: 20px;
  background: var(--brand-soft);
  color: var(--brand);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.dir-olvidar {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-2);
  font-family: inherit;
  font-size: var(--t-xs);
  text-decoration: underline;
  cursor: pointer;
}
```

Las variables son las reales de `estilos.css`, comprobadas: `--brand`, `--brand-soft`,
`--text-2`, `--t-xs`. **No inventes otras**; si necesitas una más, cópiala de `.filtro-pill`
(línea 532), que es el chip en el que está calcado este.

- [ ] **Step 3: Pintar y usar la libreta**

En `app.js`, justo **antes** de `function renderCarrito() {`, inserta:

```js
// ── La libreta de direcciones del cliente ──
// 🔴 Vive SOLO en su telefono (localStorage). La tienda no tiene servidor y estos datos
// no salen de ahi mas que en el mensaje de WhatsApp que el propio cliente envia.
// 🔴 localStorage LANZA en modo incognito y con los datos del sitio bloqueados: todo
// acceso va en try/catch y la tienda tiene que funcionar igual sin el.
const DIRS_CLAVE = 'direcciones';

function leerDirecciones() {
  try { return window.Direcciones.cargar(localStorage.getItem(DIRS_CLAVE)); } catch (e) { return []; }
}

function escribirDirecciones(lista) {
  try { localStorage.setItem(DIRS_CLAVE, JSON.stringify(lista)); } catch (e) { /* sin sitio donde guardar: se sigue igual */ }
}

function pintarDirecciones() {
  const caja = document.getElementById('dir-guardadas');
  const tira = document.getElementById('dir-guardadas-tira');
  if (!caja || !tira) return;
  const lista = leerDirecciones();
  caja.hidden = lista.length === 0;
  tira.innerHTML = lista.map((d) =>
    `<button type="button" class="dir-chip" data-dir="${escapeHtml(d.dir)}">${escapeHtml(d.etiqueta)}</button>`
  ).join('');
}

// Rellena el formulario con una ficha guardada. El horario puede ser uno de los del
// desplegable o uno escrito a mano: si no esta en la lista, se usa "Otro horario…".
function usarDireccion(dir) {
  const d = leerDirecciones().find((x) => window.Direcciones.mismaDireccion(x, { dir: dir }));
  if (!d) return;
  document.getElementById('c-nombre').value = d.nombre;
  document.getElementById('c-tel').value = d.tel;
  document.getElementById('c-dir').value = d.dir;
  const sel = document.getElementById('c-horario');
  const libre = document.getElementById('c-horario-libre');
  const opciones = [...sel.options].map((o) => o.value);
  if (d.horario && opciones.indexOf(d.horario) !== -1) {
    sel.value = d.horario;
    libre.hidden = true;
    libre.value = '';
  } else if (d.horario) {
    sel.value = '__libre';
    libre.hidden = false;
    libre.value = d.horario;
  }
  // Los avisos de campo vacio que hubiera se quedarian mintiendo.
  marcarError('c-nombre', 'err-nombre', false);
  marcarError('c-tel', 'err-tel', false);
  marcarError('c-dir', 'err-dir', false);
  marcarError('c-horario', 'err-horario', false);
}

function olvidarDirecciones() {
  if (!confirm('¿Olvidar tus datos guardados en este teléfono? Tendrás que escribirlos la próxima vez.')) return;
  try { localStorage.removeItem(DIRS_CLAVE); } catch (e) { /* nada que borrar */ }
  pintarDirecciones();
}
```

- [ ] **Step 4: Engánchalo**

En `iniciar()`, justo después de `engancharHorario();`:

```js
  const tiraDirs = document.getElementById('dir-guardadas-tira');
  if (tiraDirs) tiraDirs.addEventListener('click', (e) => {
    const chip = e.target.closest('.dir-chip');
    if (chip) usarDireccion(chip.dataset.dir);
  });
  const btnOlvidar = document.getElementById('dir-olvidar');
  if (btnOlvidar) btnOlvidar.addEventListener('click', olvidarDirecciones);
```

Y dentro de `mostrarCarrito()`, justo después de `renderCarrito();`:

```js
  pintarDirecciones();
```

- [ ] **Step 5: Sintaxis y batería**

Run: `node --check app.js` y después `node --test`
Expected: `--check` sin salida y **112/112** (esta tarea no añade tests: es DOM, y `app.js`
no se puede cargar en una prueba porque llama a `iniciar()` al final).

- [ ] **Step 6: Commit**

```bash
git add index.html estilos.css app.js
git commit -m "feat: el formulario ofrece las direcciones guardadas del cliente"
```

---

### Task 3: Cuándo preguntar por el pedido (`traspedido.js`)

**Files:**
- Create: `C:\inventario\tienda-3b\traspedido.js`
- Create: `C:\inventario\tienda-3b\test\traspedido.test.js`
- Modify: `C:\inventario\tienda-3b\index.html`, `C:\inventario\tienda-3b\sw.js`

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/traspedido.test.js`:

```js
// test/traspedido.test.js — pruebas de traspedido.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'traspedido.js'), 'utf8'), sandbox);
const { debePreguntar, VENTANA_MS } = sandbox.window.TrasPedido;

const AHORA = 1_700_000_000_000;

test('acaba de volver de WhatsApp y su carrito sigue lleno: se pregunta', () => {
  assert.strictEqual(debePreguntar(AHORA - 30_000, AHORA, true), true);
});

test('sin marca no se pregunta: nunca toco el boton de pedir', () => {
  assert.strictEqual(debePreguntar(null, AHORA, true), false);
  assert.strictEqual(debePreguntar(0, AHORA, true), false);
  assert.strictEqual(debePreguntar(undefined, AHORA, true), false);
});

test('con el carrito ya vacio no se pregunta: no hay nada que vaciar', () => {
  assert.strictEqual(debePreguntar(AHORA - 30_000, AHORA, false), false);
});

test('si volvio horas despues no se pregunta: ya no sabe de que le hablan', () => {
  assert.strictEqual(debePreguntar(AHORA - VENTANA_MS - 1, AHORA, true), false);
});

test('justo en el limite de la ventana todavia se pregunta', () => {
  assert.strictEqual(debePreguntar(AHORA - VENTANA_MS, AHORA, true), true);
});

test('una marca del futuro (reloj del telefono cambiado) no rompe nada', () => {
  assert.strictEqual(debePreguntar(AHORA + 60_000, AHORA, true), false);
});

test('una marca que no es un numero no rompe nada', () => {
  assert.strictEqual(debePreguntar('ayer', AHORA, true), false);
  assert.strictEqual(debePreguntar(NaN, AHORA, true), false);
});

test('la ventana es de media hora: ni un minuto ni un dia', () => {
  assert.strictEqual(VENTANA_MS, 30 * 60 * 1000);
});
```

- [ ] **Step 2: Córrela y comprueba que falla**

Run: `node --test`
Expected: falla al cargar `test/traspedido.test.js` (`ENOENT … traspedido.js`).

- [ ] **Step 3: Escribe el módulo**

Crea `traspedido.js`:

```js
// traspedido.js — ¿hay que preguntarle al cliente si envio su pedido?
//
// Modulo PURO (ni DOM ni reloj propio: el ahora se le pasa). Se prueba con node:vm
// desde test/traspedido.test.js.
//
// Por que existe: el pedido NO se envia desde la web. La tienda abre WhatsApp con el
// mensaje escrito y es el cliente quien pulsa enviar alli, asi que la tienda nunca sabe
// si llego a mandarlo. Por eso no se vacia el carrito al pulsar el boton —perderia el
// pedido quien se arrepintiera o se quedara sin WhatsApp— sino que se le pregunta
// cuando vuelve.
(function () {
  'use strict';

  // Media hora. Si vuelve mas tarde ya no se le pregunta: no se acordaria de que va, y
  // un carrito viejo es menos malo que vaciarle uno que si queria.
  const VENTANA_MS = 30 * 60 * 1000;

  function debePreguntar(marca, ahora, hayCarrito) {
    const t = Number(marca);
    if (!hayCarrito) return false;
    if (!Number.isFinite(t) || t <= 0) return false;
    const pasado = Number(ahora) - t;
    if (!Number.isFinite(pasado)) return false;
    return pasado >= 0 && pasado <= VENTANA_MS;
  }

  window.TrasPedido = { VENTANA_MS, debePreguntar };
})();
```

- [ ] **Step 4: Córrela y comprueba que pasa**

Run: `node --test`
Expected: **120/120** (112 + 8 nuevas), `exit 0`.

- [ ] **Step 5: Regístralo**

En `index.html`, tras `<script src="direcciones.js"></script>`:

```html
<script src="traspedido.js"></script>
```

En `sw.js`, en `ARMAZON`, tras `'/direcciones.js',`:

```js
  '/traspedido.js',
```

- [ ] **Step 6: Commit**

```bash
git add traspedido.js test/traspedido.test.js index.html sw.js
git commit -m "feat: modulo que decide cuando preguntar por el pedido enviado"
```

---

### Task 4: Guardar al enviar y preguntar al volver

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html` (la casilla en `#form-pedido` y el aviso)
- Modify: `C:\inventario\tienda-3b\estilos.css` (al final)
- Modify: `C:\inventario\tienda-3b\app.js` (`vaciarPedido`, `enviarPorWhatsApp`, `iniciar`, `escribiendoPedido`)

- [ ] **Step 1: La casilla de guardar, en el HTML**

En `index.html`, dentro de `#form-pedido`, **justo antes** de
`<p id="panel-politica" ...>`:

```html
      <label class="campo-check">
        <input type="checkbox" id="c-guardar">
        <span>Guardar mis datos en este teléfono para la próxima vez</span>
      </label>
      <label class="campo" id="campo-etiqueta" hidden>
        <span>¿Con qué nombre?</span>
        <input type="text" id="c-etiqueta" placeholder="Casa, Trabajo…" maxlength="20">
      </label>
```

- [ ] **Step 2: El aviso de vuelta, en el HTML**

En `index.html`, justo **después** del bloque `<div id="aviso-ajuste" …>…</div>`
(termina en la línea 84):

```html
  <div id="aviso-enviado" class="aviso-enviado" role="dialog" aria-labelledby="aviso-enviado-txt" hidden>
    <p id="aviso-enviado-txt" class="aviso-enviado-txt">¿Ya enviaste tu pedido por WhatsApp?</p>
    <div class="aviso-enviado-botones">
      <button type="button" id="aviso-enviado-si" class="btn btn-primario">Sí, vaciar mi carrito</button>
      <button type="button" id="aviso-enviado-no" class="btn btn-suave btn-secundario">No, conservarlo</button>
    </div>
  </div>
```

- [ ] **Step 3: El estilo**

Al final de `estilos.css`:

```css
/* «¿Ya enviaste tu pedido?» — sale al volver de WhatsApp, encima de todo. */
.aviso-enviado {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 60;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
}
.aviso-enviado-txt { margin: 0 0 12px; font-weight: 700; }
.aviso-enviado-botones { display: flex; flex-wrap: wrap; gap: 10px; }
.aviso-enviado-botones .btn { flex: 1 1 auto; min-height: 44px; }
.campo-check { display: flex; align-items: flex-start; gap: 10px; margin: 4px 0 12px; font-size: var(--t-xs); }
.campo-check input { width: 20px; height: 20px; margin-top: 2px; flex: 0 0 auto; }
```

`z-index: 60` está elegido a propósito: `.panel` (el carrito) y `.modal` (la ficha) están
los dos en **30**, comprobado en `estilos.css`, así que el aviso queda por encima de ambos.
Las variables (`--border`, `--surface-2`, `--text`, `--t-xs`) son las reales del archivo.

- [ ] **Step 4: 🔴 Arregla `escribiendoPedido()` ANTES de nada más**

En `app.js`, al final, dentro del bloque del service worker. Hoy dice:

```js
    return [...f.querySelectorAll('input, textarea, select')].some((c) => String(c.value || '').trim() !== '');
```

El `value` de un checkbox es **`"on"` esté marcado o no**, así que con la casilla nueva eso
devolvería **siempre** `true`: el service worker dejaría de recargar la página y **ningún
cliente volvería a recibir una actualización de la tienda**. Sustitúyelo por:

```js
    // 🔴 Un checkbox vale "on" aunque no este marcado: se mira `checked`, no `value`.
    // Si esto se hace mal, escribiendoPedido() devuelve siempre true y el service worker
    // no vuelve a recargar la tienda en ningun telefono.
    return [...f.querySelectorAll('input, textarea, select')]
      .some((c) => (c.type === 'checkbox' ? c.checked : String(c.value || '').trim() !== ''));
```

- [ ] **Step 5: Enseña y esconde el campo del nombre**

En `app.js`, dentro de `iniciar()`, justo después del enganche de `dir-olvidar` de la
Tarea 2:

```js
  const chkGuardar = document.getElementById('c-guardar');
  if (chkGuardar) chkGuardar.addEventListener('change', () => {
    const campo = document.getElementById('campo-etiqueta');
    campo.hidden = !chkGuardar.checked;
    if (chkGuardar.checked) document.getElementById('c-etiqueta').focus();
  });
```

- [ ] **Step 6: Separa el vaciado de su pregunta**

En `app.js`, `vaciarPedido()` empieza con un `confirm()`. El aviso de vuelta necesita vaciar
**sin** preguntar otra vez. Sustituye la función entera por estas dos:

```js
// Vacia de verdad. NO pregunta: quien llama ya se encargo de eso.
function limpiarCarrito() {
  carrito = {};
  guardarCarrito();
  localStorage.removeItem('carrito');
  renderGrid();
  renderCarrito();
  if (productoModal) refrescarAcciones(productoModal);
}

function vaciarPedido() {
  if (!Object.keys(carrito).length) return;   // guarda defensiva: el botón está oculto si ya está vacío
  const ok = confirm('¿Vaciar tu pedido? Perderás lo que agregaste y no se puede deshacer.');
  if (!ok) return;
  limpiarCarrito();
}
```

- [ ] **Step 7: Al enviar, guarda los datos y deja la marca**

En `app.js`, al final de `enviarPorWhatsApp`, **después** del `window.open` (nunca antes:
un paso de más antes de abrir WhatsApp hace que el bloqueador de emergentes se lo coma):

```js
  window.open(`https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');

  // Ya se fue a WhatsApp. Ahora si: guardar sus datos si lo pidio, y dejar la marca para
  // preguntarle al volver si llego a enviarlo.
  const chk = document.getElementById('c-guardar');
  if (chk && chk.checked) {
    const etiqueta = document.getElementById('c-etiqueta').value.trim();
    escribirDirecciones(window.Direcciones.guardar(leerDirecciones(), {
      etiqueta: etiqueta, nombre: nombre, tel: tel, dir: dir, horario: horario,
    }));
    pintarDirecciones();
  }
  try { localStorage.setItem('pedidoEnviado', String(Date.now())); } catch (e) { /* sin marca: no se preguntara */ }
```

- [ ] **Step 8: Al volver, pregunta**

En `app.js`, justo **antes** de `function renderCarrito() {` (junto a las funciones de la
libreta de la Tarea 2):

```js
// El cliente volvio a la tienda despues de irse a WhatsApp. Como la tienda NO puede saber
// si llego a enviar el mensaje, se le pregunta en vez de decidir por el.
function preguntarSiEnvio() {
  const caja = document.getElementById('aviso-enviado');
  if (!caja || !caja.hidden) return;   // ya esta puesto: no se repite
  let marca = null;
  try { marca = localStorage.getItem('pedidoEnviado'); } catch (e) { return; }
  if (!window.TrasPedido.debePreguntar(marca, Date.now(), Object.keys(carrito).length > 0)) {
    olvidarMarcaPedido();
    return;
  }
  caja.hidden = false;
}

function olvidarMarcaPedido() {
  try { localStorage.removeItem('pedidoEnviado'); } catch (e) { /* nada */ }
}

function cerrarAvisoEnviado(vaciar) {
  const caja = document.getElementById('aviso-enviado');
  if (caja) caja.hidden = true;
  olvidarMarcaPedido();
  if (vaciar) {
    limpiarCarrito();
    cerrarCarrito();
    mostrarAvisoTexto('¡Gracias! Tu carrito quedó vacío. Te escribimos por WhatsApp.');
  }
}
```

🔴 `cerrarCarrito()` y no `ocultarCarrito()`: el carrito es una capa del historial y hay que
cerrarlo por el camino de siempre, o quedaría una entrada del historial sin nada que cerrar
(ver la entrada del 2026-10-18 en el `CLAUDE.md`).

- [ ] **Step 9: Engancha el aviso**

En `app.js`, dentro de `iniciar()`, sustituye el `visibilitychange` que ya existe por este
(añade la llamada; **no borres** `revalidarCierre()`):

```js
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { revalidarCierre(); preguntarSiEnvio(); }
  });
  window.addEventListener('focus', revalidarCierre);
  document.getElementById('aviso-enviado-si').addEventListener('click', () => cerrarAvisoEnviado(true));
  document.getElementById('aviso-enviado-no').addEventListener('click', () => cerrarAvisoEnviado(false));
```

- [ ] **Step 10: Sintaxis y batería**

Run: `node --check app.js` y después `node --test`
Expected: `--check` sin salida y **120/120**.

- [ ] **Step 11: Commit**

```bash
git add index.html estilos.css app.js
git commit -m "feat: el carrito se vacia al volver de WhatsApp si el cliente lo confirma"
```

---

### Task 5: Caché nueva, verificación en navegador e informe

**Files:**
- Modify: `C:\inventario\tienda-3b\sw.js` (línea 11)
- Create: `C:\inventario\tienda-3b\docs\informes\2026-10-19-carrito-se-vacia-y-direcciones-guardadas.md`

- [ ] **Step 1: Sube la caché**

🔴 Se tocaron `app.js`, `index.html` y `estilos.css`, y hay dos archivos nuevos en
`ARMAZON`. En `sw.js`, línea 11:

```js
const CACHE = 'tienda-3b-v14';
```

- [ ] **Step 2: Levanta la tienda en local**

En una terminal aparte, desde la raíz del repo:

```bash
npx --yes serve -l 4173 -s .
```

- [ ] **Step 3: Las once comprobaciones, a 375 px**

Chrome del sistema con `puppeteer-core` **desde el scratchpad**, nunca instalado en el repo
(`C:\Program Files\Google\Chrome\Application\chrome.exe`). Borra el service worker y el
`localStorage` antes de empezar. Comprueba una por una y **anota lo que viste**:

1. Carrito con un producto, formulario relleno, **sin** marcar la casilla → «Pedir por
   WhatsApp» abre la pestaña de WhatsApp y el carrito **sigue lleno**.
2. Volver a la pestaña de la tienda → sale «¿Ya enviaste tu pedido por WhatsApp?».
3. Pulsar **«No, conservarlo»** → el aviso se va y **el carrito sigue intacto**.
4. Repetir el envío y pulsar **«Sí, vaciar mi carrito»** → carrito a 0, el panel se cierra y
   sale el agradecimiento.
5. Volver a la tienda otra vez → **no** vuelve a preguntar (la marca se consumió).
6. Con el carrito vacío, volver a la pestaña → **no** pregunta nada.
7. Marcar la casilla «Guardar mis datos» → aparece el campo «¿Con qué nombre?». Escribir
   «Casa» y enviar → al reabrir el carrito, bajo la dirección sale el botón **Casa**.
8. Vaciar el formulario a mano, tocar el botón **Casa** → se rellenan nombre, teléfono,
   dirección y horario de golpe.
9. Guardar una dirección con un horario escrito a mano («después de las 6») y usarla → el
   desplegable queda en «Otro horario…» y el texto aparece en su campo.
10. Guardar 5 direcciones distintas → se ven **4** botones; la más vieja desapareció.
11. **«Olvidar mis datos»** → confirma, los botones desaparecen y la tira entera se oculta.

- [ ] **Step 4: La trampa del service worker, comprobada a propósito**

En la consola de la tienda, con el formulario **vacío** y la casilla **sin marcar**:

```js
escribiendoPedido()
```

Expected: **`false`**. Si da `true`, el arreglo del Step 4 de la Tarea 4 está mal y **ningún
cliente volvería a recibir actualizaciones de la tienda**. Marca luego la casilla y
compruébalo otra vez: entonces sí debe dar `true`.

- [ ] **Step 5: Guarda una captura**

A 375 px, con el aviso «¿Ya enviaste tu pedido?» en pantalla, guarda la captura en
`docs/informes/2026-10-19-aviso-pedido-enviado-375px.png`.

- [ ] **Step 6: La batería completa**

Run: `node --test`
Expected: **120/120**, `exit 0`. Apunta el número real que viste.

- [ ] **Step 7: Deja el informe**

Crea `docs/informes/2026-10-19-carrito-se-vacia-y-direcciones-guardadas.md`: autocontenido,
con la evidencia **observada** (las once comprobaciones, la de `escribiendoPedido()` y el
recuento de pruebas). Lo no ejecutado se marca literalmente **⚠ NO VERIFICADO**.

- [ ] **Step 8: Actualiza el `CLAUDE.md`**

Añade una entrada a la sección «Proyecto: Tienda web 3B» de `C:\Users\JyR\CLAUDE.md`: qué
guarda el teléfono del cliente y bajo qué claves (`direcciones`, `pedidoEnviado`), por qué
el carrito **no** se vacía al pulsar el botón, la trampa del checkbox en
`escribiendoPedido()`, el tope de 4 direcciones y la caché en `tienda-3b-v14`.

- [ ] **Step 9: Commit**

```bash
git add sw.js docs/informes/
git commit -m "docs: informe y cache v14 del carrito que se vacia y las direcciones"
```

- [ ] **Step 10: Despliegue**

🔴 **No lo hagas tú.** El `push` de este repo despliega en producción y lo decide Ruth.
Recuérdale que la **primera** carga tras el despliegue todavía corre el código viejo y hace
falta una segunda.

---

## Lo que este plan NO hace (y es a propósito)

- **Las direcciones no se sincronizan entre dispositivos.** Viven en el navegador del
  cliente. Hacerlo exigiría un servidor con cuentas y contraseñas, que es otro proyecto —
  y haría a 3B responsable de guardar datos personales de sus clientes.
- 🔴 **En iPhone con Safari**, si el cliente no entra a la tienda en 7 días, el sistema puede
  borrar lo guardado. Es una regla de Apple (ITP) y no hay forma de evitarla desde una web;
  se salva si tiene la tienda instalada en la pantalla de inicio. Cuando pasa, el formulario
  sale vacío como siempre: **no falla nada**, solo hay que reescribirlo.
- **No se guarda la nota** del pedido: es de cada pedido, no del cliente.
- **El modal de encargos** no usa la libreta; tiene su propio borrador (`encargoBorrador`).
