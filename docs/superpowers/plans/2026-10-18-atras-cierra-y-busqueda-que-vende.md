# El botón «atrás» cierra lo abierto + la búsqueda sin resultados vende

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el gesto «atrás» del teléfono cierre la ficha de producto y el carrito en vez de sacar al cliente de la tienda, y que una búsqueda sin resultados ofrezca preguntar por WhatsApp con lo que el cliente escribió.

**Architecture:** Dos módulos puros nuevos al estilo de los que ya hay (IIFE + `window.X`, probados con `node:vm`): `historial.js` decide qué capas abrir/cerrar y qué URL poner; `faltante.js` arma el mensaje de WhatsApp. `app.js` separa «pintar/ocultar» de «abrir/cerrar» — las funciones que ya se llaman desde todas partes (`abrirDetalle`, `cerrarDetalle`, `abrirCarrito`, `cerrarCarrito`) conservan su nombre y su firma, así que **ninguna llamada existente se toca**: solo cambia su cuerpo.

**Tech Stack:** JavaScript de navegador sin dependencias ni empaquetador · `node --test` con `node:vm` · PWA con service worker versionado.

---

## Lo que hay hoy (medido en producción el 2026-10-18, no supuesto)

Ejecutado en la consola de `https://www.3bqba.com` con una ficha abierta:

```
{"antes":"https://www.3bqba.com/","ahora":"https://www.3bqba.com/",
 "modalSigueAbierto":true,"histLen":1}
```

Es decir: abrir una ficha **no mete ninguna entrada en el historial**, la URL sigue
siendo `/` y un `history.back()` **no la cierra** — se sale del sitio. En el móvil
«atrás» es el gesto natural para cerrar, así que el cliente que llega desde WhatsApp,
abre un producto y da atrás, se va de la tienda.

Y buscando «televisor plasma» (232 productos, ninguno coincide) el bloque `#vacio`
dice «No hay productos que coincidan con tu búsqueda» y ofrece solo «Ver todo el
catálogo»: un callejón sin salida.

## Decisiones tomadas (no las cambies por tu cuenta)

1. **Cerrar es siempre `history.back()`**, nunca ocultar a mano. El cierre real lo hace
   el manejador de `popstate`. Así no se queda una entrada huérfana en el historial ni
   se cierra dos veces.
2. **La URL de la ficha es `/p/<CODIGO>`**, la misma que ya sirve `api/producto.js` y la
   misma que genera `urlProducto()` al compartir. Con eso la ficha abierta se puede
   compartir desde la barra del navegador y recargar.
3. **La query se conserva siempre** (`location.search`): ahí viaja el `?ref=` del gestor.
4. **El segmento del gestor (`/ELAINE`) no se pierde**: al abrir la ficha se apila
   `/p/COD` encima, y «atrás» devuelve exactamente a `/ELAINE`. El `ref` ya vive además
   en `localStorage` (`resolverVendedor()`).
5. **El carrito también es una capa**, pero su URL es la de abajo (`/` o `/ELAINE`): un
   carrito no se comparte por enlace.
6. **Fuera de alcance a propósito:** el modal de encargos y el recuadro de gestor
   («comisionista»). Encargos usa `replaceState` con el hash `#encargos` y no crea
   entradas de historial; lo único que se le toca es conservar el `state` (Tarea 3), que
   si no borraría el nuestro.

## Estructura de archivos

| Archivo | Qué hace | Tarea |
|---|---|---|
| `historial.js` **(nuevo)** | Puro. `rutaDe(capas, search)` y `transicion(abiertas, destino)`. | 1 |
| `test/historial.test.js` **(nuevo)** | Pruebas del anterior con `node:vm`. | 1 |
| `faltante.js` **(nuevo)** | Puro. `limpiar`, `mensaje`, `enlace` para el WhatsApp de «no lo encontré». | 4 |
| `test/faltante.test.js` **(nuevo)** | Pruebas del anterior. | 4 |
| `app.js` | Separa mostrar/ocultar de abrir/cerrar; `popstate`; pinta el botón del vacío. | 2, 3, 5 |
| `index.html` | Dos `<script src>` nuevos y el hueco `#vacio-pregunta`. | 1, 4, 5 |
| `estilos.css` | Estilo del botón del vacío. | 5 |
| `encargos.js` | Dos `replaceState(null, …)` pasan a conservar el `state`. | 3 |
| `sw.js` | Los dos archivos nuevos en `ARMAZON` y `CACHE` a `tienda-3b-v13`. | 1, 4, 6 |

## Cómo se corren las pruebas

Desde la raíz del repo (`C:\inventario\tienda-3b`), en PowerShell:

```
node --test
```

🔴 **`node --test` a secas, NUNCA `node --test test/`**: con Node 24 esa forma falla.
La batería de la tienda está hoy en **80/80** (medido el 2026-10-15). Cada tarea dice
cuántas debe haber al terminar.

---

### Task 1: El módulo `historial.js`

**Files:**
- Create: `C:\inventario\tienda-3b\historial.js`
- Create: `C:\inventario\tienda-3b\test\historial.test.js`
- Modify: `C:\inventario\tienda-3b\index.html` (los `<script src>` del final, líneas 453-460)
- Modify: `C:\inventario\tienda-3b\sw.js` (la lista `ARMAZON`)

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/historial.test.js` con este contenido exacto:

```js
// test/historial.test.js — pruebas de historial.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'historial.js'), 'utf8'), sandbox);
const { rutaDe, transicion } = sandbox.window.Historial;

const FICHA = { tipo: 'ficha', id: 'p1', codigo: 'abcd' };
const OTRA = { tipo: 'ficha', id: 'p2', codigo: 'EFGH' };
const CARRITO = { tipo: 'carrito' };

test('sin capas abiertas la ruta es la raiz', () => {
  assert.strictEqual(rutaDe([], ''), '/');
});

test('la ficha pone /p/CODIGO en mayusculas', () => {
  assert.strictEqual(rutaDe([FICHA], ''), '/p/ABCD');
});

test('la query se conserva: ahi viaja el ?ref= del gestor', () => {
  assert.strictEqual(rutaDe([FICHA], '?ref=ELAINE'), '/p/ABCD?ref=ELAINE');
  assert.strictEqual(rutaDe([], '?ref=ELAINE'), '/?ref=ELAINE');
});

test('el carrito encima de la ficha deja la URL de abajo: no se comparte por enlace', () => {
  assert.strictEqual(rutaDe([FICHA, CARRITO], ''), '/');
});

test('una ficha sin codigo cae a la raiz en vez de inventarse una URL', () => {
  assert.strictEqual(rutaDe([{ tipo: 'ficha', id: 'x' }], ''), '/');
});

test('abrir la primera capa: nada que cerrar, una que abrir', () => {
  const t = transicion([], [FICHA]);
  assert.deepStrictEqual(t.cerrar, []);
  assert.strictEqual(t.abrir.length, 1);
  assert.strictEqual(t.abrir[0].id, 'p1');
});

test('cerrar la ultima capa: una que cerrar, nada que abrir', () => {
  const t = transicion([FICHA], []);
  assert.deepStrictEqual(t.cerrar, ['ficha:p1']);
  assert.deepStrictEqual(t.abrir, []);
});

test('pasar de una ficha a otra: cierra la vieja y abre la nueva', () => {
  const t = transicion([FICHA], [OTRA]);
  assert.deepStrictEqual(t.cerrar, ['ficha:p1']);
  assert.strictEqual(t.abrir[0].id, 'p2');
});

test('lo que ya esta abierto y sigue abierto no se toca', () => {
  const t = transicion([FICHA], [FICHA, CARRITO]);
  assert.deepStrictEqual(t.cerrar, []);
  assert.strictEqual(t.abrir.length, 1);
  assert.strictEqual(t.abrir[0].tipo, 'carrito');
});

test('cerrar el carrito deja la ficha donde estaba', () => {
  const t = transicion([FICHA, CARRITO], [FICHA]);
  assert.deepStrictEqual(t.cerrar, ['carrito']);
  assert.deepStrictEqual(t.abrir, []);
});

test('se cierra de arriba abajo, nunca al reves', () => {
  const t = transicion([FICHA, CARRITO], []);
  assert.deepStrictEqual(t.cerrar, ['carrito', 'ficha:p1']);
});

// 🔴 Aqui se comprueba el LARGO y no se compara con deepStrictEqual contra un objeto
// o un array literal: cuando los argumentos son undefined, el `[]` nace DENTRO del
// sandbox de node:vm y no es el mismo Array que el del test, asi que deepStrictEqual
// falla aunque el modulo este bien. (En los tests de mas arriba si vale: alli el array
// sale de `.filter()` sobre el que le pasa el test, o sea del mismo realm.)
test('argumentos ausentes o basura no revientan', () => {
  const vacia = transicion(undefined, undefined);
  assert.strictEqual(vacia.cerrar.length, 0);
  assert.strictEqual(vacia.abrir.length, 0);
  assert.strictEqual(rutaDe(undefined, undefined), '/');
  const nula = transicion([null], [null]);
  assert.strictEqual(nula.cerrar.length, 0);
  assert.strictEqual(nula.abrir.length, 0);
});
```

- [ ] **Step 2: Córrela y comprueba que falla**

Run: `node --test`
Expected: falla al cargar `test/historial.test.js` porque `historial.js` no existe
(`ENOENT: no such file or directory ... historial.js`). El resto de la batería sigue en verde.

- [ ] **Step 3: Escribe el módulo**

Crea `historial.js` con este contenido exacto:

```js
// historial.js — el boton "atras" del telefono cierra lo que esta abierto.
//
// Modulo PURO (ni DOM ni history): solo decide. Quien empuja y escucha el historial
// es app.js. Se prueba con node:vm desde test/historial.test.js.
//
// Una "capa" es algo que tapa el catalogo:
//   { tipo: 'ficha', id: '<id del producto>', codigo: '<codigo corto>' }
//   { tipo: 'carrito' }
// Las capas van de abajo arriba: la ultima es la que se ve por encima.
(function () {
  'use strict';

  // Identidad de una capa. La ficha lleva el id dentro porque pasar de un producto
  // a otro SI es un cambio (hay que repintar), y sin el id parecerian la misma capa.
  function clave(c) {
    if (!c || !c.tipo) return '';
    return c.id ? c.tipo + ':' + c.id : c.tipo;
  }

  // La URL que le toca a la pila de capas. La manda la de arriba.
  // 🔴 search SIEMPRE se conserva: ahi viaja el ?ref= del gestor.
  function rutaDe(capas, search) {
    const q = search || '';
    const lista = (capas || []).filter(Boolean);
    const arriba = lista[lista.length - 1];
    if (arriba && arriba.tipo === 'ficha' && arriba.codigo) {
      return '/p/' + String(arriba.codigo).toUpperCase() + q;
    }
    return '/' + q;
  }

  // De las capas abiertas AHORA a las que pide el historial: que cerrar y que abrir.
  // Devuelve `cerrar` como CLAVES (de arriba abajo) y `abrir` como las capas enteras
  // (de abajo arriba), porque para abrir hace falta el id y el codigo.
  function transicion(abiertas, destino) {
    const a = (abiertas || []).filter(Boolean);
    const d = (destino || []).filter(Boolean);
    let comun = 0;
    while (comun < a.length && comun < d.length && clave(a[comun]) === clave(d[comun])) comun++;
    return {
      cerrar: a.slice(comun).map(clave).reverse(),
      abrir: d.slice(comun),
    };
  }

  window.Historial = { clave, rutaDe, transicion };
})();
```

- [ ] **Step 4: Córrela y comprueba que pasa**

Run: `node --test`
Expected: **92/92** (80 de antes + 12 nuevas), `exit 0`.

- [ ] **Step 5: Regístralo en la página y en el service worker**

En `index.html`, entre la línea de `galeria.js` y la de `tarjeta.js`:

```html
<script src="galeria.js"></script>
<script src="historial.js"></script>
<script src="tarjeta.js"></script>
```

En `sw.js`, dentro de `ARMAZON`, justo después de `'/galeria.js',`:

```js
  '/galeria.js',
  '/historial.js',
  '/tarjeta.js',
```

🔴 Lo que no esté en `ARMAZON` no existe sin conexión. **No subas `CACHE` todavía**: se
sube una sola vez en la Tarea 6.

- [ ] **Step 6: Commit**

```bash
git add historial.js test/historial.test.js index.html sw.js
git commit -m "feat: modulo de historial para las capas de la tienda"
```

---

### Task 2: La ficha entra en el historial

**Files:**
- Modify: `C:\inventario\tienda-3b\app.js` (líneas ~658-726, ~856-861, ~1754-1901)

Este es el refactor central. La regla que lo hace seguro: **las funciones que se llaman
desde fuera conservan su nombre** (`abrirDetalle`, `cerrarDetalle`), así que ninguno de
los 8 sitios que las llaman se toca.

ℹ️ Al terminar esta tarea, `sincronizarCapas` nombra `mostrarCarrito` y `ocultarCarrito`,
que no existen hasta la Tarea 3. **No es un error:** entre una tarea y otra el carrito
sigue abriéndose por el camino viejo, así que esas dos ramas nunca llegan a ejecutarse.
No te adelantes a crearlas aquí; hazlo en la Tarea 3, con su commit.

- [ ] **Step 1: Añade el motor de capas**

En `app.js`, justo **antes** de `function abrirDetalle(id) {` (línea ~658), inserta:

```js
// ── Historial: el boton "atras" cierra lo que esta abierto ──
// Cada capa abierta (ficha, carrito) es una entrada del historial. Abrir hace
// pushState; cerrar hace history.back() y es el popstate quien cierra de verdad.
// 🔴 Nunca ocultes una capa a mano fuera de sincronizarCapas: dejarias una entrada
// del historial sin nada que cerrar y el siguiente "atras" sacaria al cliente.
let capasAbiertas = [];

function sincronizarCapas(destino) {
  const plan = window.Historial.transicion(capasAbiertas, destino);
  plan.cerrar.forEach((k) => {
    if (k === 'carrito') ocultarCarrito(); else ocultarDetalle();
  });
  plan.abrir.forEach((c) => {
    if (c.tipo === 'carrito') mostrarCarrito(); else mostrarDetalle(c.id);
  });
  capasAbiertas = (destino || []).filter(Boolean);
}

function abrirCapa(capa) {
  const destino = capasAbiertas.concat([capa]);
  history.pushState({ capas: destino }, '', window.Historial.rutaDe(destino, location.search));
  sincronizarCapas(destino);
}

// Cierra la capa `tipo` SOLO si es la de arriba. Si no lo es (o el historial se
// perdio: una restauracion de pestaña, otro script que pisara el state...), se oculta
// a mano sin tocar el historial, que es preferible a arrastrarse otra capa por
// delante con un back() a ciegas.
function pedirCierreCapa(tipo) {
  const st = history.state;
  const capas = (st && Array.isArray(st.capas)) ? st.capas : [];
  const arriba = capas[capas.length - 1];
  if (arriba && arriba.tipo === tipo) { history.back(); return; }
  if (tipo === 'carrito') ocultarCarrito(); else ocultarDetalle();
  capasAbiertas = capasAbiertas.filter((c) => c.tipo !== tipo);
}

// El cliente dio "atras" (o "adelante"): el navegador ya cambio la URL; aqui solo
// se pone la pantalla de acuerdo con el punto del historial al que ha llegado.
function alCambiarHistorial(e) {
  const st = e.state;
  sincronizarCapas((st && Array.isArray(st.capas)) ? st.capas : []);
}

// Punto de partida: la entrada actual es "nada abierto". Si se entro por /p/CODIGO
// la URL vuelve a la raiz AQUI y la ficha se apila encima (Step 5), para que el
// primer "atras" lleve al catalogo y no fuera de la tienda.
function prepararHistorial() {
  const esFicha = /^\/p\//.test(location.pathname);
  const base = esFicha ? '/' + location.search : location.pathname + location.search;
  history.replaceState({ capas: [] }, '', base);
}
```

- [ ] **Step 2: Parte `abrirDetalle` en mostrar + abrir**

Renombra la función existente `abrirDetalle` a `mostrarDetalle` (solo la cabecera: el
cuerpo no cambia ni una línea) y añade la nueva `abrirDetalle` justo encima:

```js
function abrirDetalle(id) {
  const p = (CAT.items || []).find((x) => x.id === id);
  if (!p) return;
  abrirCapa({ tipo: 'ficha', id: id, codigo: p.codigo });
}

// Pinta la ficha. NO toca el historial: la llama sincronizarCapas.
function mostrarDetalle(id) {
  const p = (CAT.items || []).find((x) => x.id === id);
  if (!p) return;
  productoModal = id;
  // … el resto del cuerpo que ya tenía abrirDetalle, sin cambiar nada …
}
```

- [ ] **Step 3: Parte `cerrarDetalle` en ocultar + pedir cierre**

Renombra la función existente `cerrarDetalle` a `ocultarDetalle` y **borra de su cuerpo**
estas cuatro líneas, que ya no hacen falta (la URL la devuelve el `back()`):

```js
  // 🔴 BORRA esto de ocultarDetalle:
  // if (location.pathname.indexOf('/p/') === 0) {
  //   history.replaceState(null, '', '/' + location.search);
  // }
```

Y añade encima la nueva `cerrarDetalle`:

```js
function cerrarDetalle() { pedirCierreCapa('ficha'); }

// Oculta la ficha. NO toca el historial: la llama sincronizarCapas.
function ocultarDetalle() {
  document.getElementById('modal-detalle').hidden = true;
  // … el resto del cuerpo que ya tenía cerrarDetalle, MENOS el replaceState …
}
```

- [ ] **Step 4: Comprueba que no quedó ninguna llamada suelta**

Run: `grep -n "abrirDetalle\|cerrarDetalle\|mostrarDetalle\|ocultarDetalle" app.js`

Expected: las llamadas de las líneas ~719, ~859, ~1776, ~1777, ~1820, ~1831, ~1845 y
~1864 siguen diciendo `abrirDetalle` / `cerrarDetalle` tal cual. `mostrarDetalle` y
`ocultarDetalle` aparecen **solo** en su definición y dentro de `sincronizarCapas`.

- [ ] **Step 5: La entrada por `/p/CODIGO`**

Sustituye la función `abrirProductoDeLaUrl` (línea ~714) por estas dos:

```js
// Entrada por un enlace compartido: /p/<codigo>. El codigo es el corto del catalogo,
// no el id largo: es el que se comparte y el que entiende api/producto.js.
// Dos segmentos a proposito: codigoDeLaUrl() toma un solo segmento como codigo de
// gestor (/MARIA), asi que /p/XXXX no puede confundirse con un vendedor.
// 🔴 Se lee ANTES de prepararHistorial(), que deja la URL en la raiz.
function codigoDeFichaDeLaUrl() {
  const m = location.pathname.match(/^\/p\/([A-Za-z0-9]{1,8})\/?$/);
  return m ? m[1].toUpperCase() : '';
}

function abrirFichaPorCodigo(cod) {
  const p = (CAT.items || []).find((x) => String(x.codigo).toUpperCase() === cod);
  if (p) { abrirDetalle(p.id); return; }
  mostrarAvisoTexto('Ese producto ya no está disponible. Mira el resto del catálogo.');
}
```

- [ ] **Step 6: Engánchalo en `iniciar()`**

Sustituye el final de `iniciar()` (líneas ~1896-1900) por:

```js
  medirHeader();
  const codFicha = codigoDeFichaDeLaUrl();   // ANTES de tocar la URL
  await cargarCatalogo();
  renderMundos();
  prepararHistorial();
  if (codFicha) abrirFichaPorCodigo(codFicha);   // despues de cargarCatalogo: necesita CAT.items
```

Y añade el oyente del historial junto a los demás `addEventListener` de `iniciar()`,
justo después de `document.getElementById('modal-fondo').addEventListener('click', cerrarDetalle);`:

```js
  window.addEventListener('popstate', alCambiarHistorial);
```

- [ ] **Step 7: Comprueba la sintaxis y la batería**

Run: `node --check app.js` y después `node --test`
Expected: `node --check` sin salida (exit 0) y **92/92** otra vez. `app.js` no tiene
pruebas propias: no es cargable fuera del navegador porque llama a `iniciar()` al final.

- [ ] **Step 8: Commit**

```bash
git add app.js
git commit -m "feat: la ficha de producto entra en el historial del navegador"
```

---

### Task 3: El carrito entra en el historial (y encargos deja de borrar el estado)

**Files:**
- Modify: `C:\inventario\tienda-3b\app.js` (líneas ~1419-1433)
- Modify: `C:\inventario\tienda-3b\encargos.js` (líneas 351 y 359)

- [ ] **Step 1: Parte `abrirCarrito` y `cerrarCarrito`**

Mismo patrón que la ficha. Renombra `abrirCarrito` → `mostrarCarrito` y
`cerrarCarrito` → `ocultarCarrito` (solo las cabeceras; los cuerpos no cambian) y añade
encima las dos nuevas:

```js
function abrirCarrito() { abrirCapa({ tipo: 'carrito' }); }
function cerrarCarrito() { pedirCierreCapa('carrito'); }

// Pinta el carrito. NO toca el historial: la llama sincronizarCapas.
function mostrarCarrito() {
  renderCarrito();
  // … el resto del cuerpo que ya tenía abrirCarrito …
}

// Oculta el carrito. NO toca el historial: la llama sincronizarCapas.
function ocultarCarrito() {
  document.getElementById('panel').hidden = true;
  // … el resto del cuerpo que ya tenía cerrarCarrito …
}
```

- [ ] **Step 2: Comprueba las dos llamadas delicadas**

Run: `grep -n "cerrarCarrito()" app.js`

Expected: dos llamadas internas, y **las dos se quedan como están**:
- línea ~1264 (`pintarCierre`, cierra el carrito cuando llega el cierre de la tienda):
  si el carrito no estaba arriba, `pedirCierreCapa` va por la rama manual y no arrastra
  la ficha. Correcto.
- línea ~1473 (`enviarPorWhatsApp`, tienda cerrada): `history.back()` es síncrono
  respecto al `window.open` de WhatsApp, así que **no** reintroduce el problema del
  bloqueador de emergentes. 🔴 No metas ningún `await` ahí.

- [ ] **Step 3: Que encargos deje de borrar el estado del historial**

`encargos.js` usa `replaceState(null, …)`, y ese `null` borra el `{capas:[…]}` que acaba
de poner la tienda. Dos líneas, mismo arreglo: conservar lo que ya hubiera.

Línea 351:

```js
    if (location.hash !== '#encargos') history.replaceState(history.state, '', location.pathname + location.search + '#encargos');
```

Línea 359:

```js
    if (location.hash === '#encargos') history.replaceState(history.state, '', location.pathname + location.search);
```

- [ ] **Step 4: Sintaxis y batería**

Run: `node --check app.js`, `node --check encargos.js`, `node --test`
Expected: los dos `--check` sin salida y **92/92**.

- [ ] **Step 5: Commit**

```bash
git add app.js encargos.js
git commit -m "feat: el carrito entra en el historial y encargos conserva el estado"
```

---

### Task 4: El módulo `faltante.js`

**Files:**
- Create: `C:\inventario\tienda-3b\faltante.js`
- Create: `C:\inventario\tienda-3b\test\faltante.test.js`
- Modify: `C:\inventario\tienda-3b\index.html`, `C:\inventario\tienda-3b\sw.js`

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/faltante.test.js`:

```js
// test/faltante.test.js — pruebas de faltante.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'faltante.js'), 'utf8'), sandbox);
const { limpiar, mensaje, enlace } = sandbox.window.Faltante;

test('limpiar quita los espacios de sobra', () => {
  assert.strictEqual(limpiar('  televisor   plasma '), 'televisor plasma');
});

test('limpiar recorta lo larguisimo: nadie busca una parrafada', () => {
  assert.strictEqual(limpiar('a'.repeat(200)).length, 60);
});

test('limpiar aguanta lo que no es texto', () => {
  assert.strictEqual(limpiar(undefined), '');
  assert.strictEqual(limpiar(null), '');
  assert.strictEqual(limpiar(12), '12');
});

test('el mensaje dice que viene de la web y repite lo buscado', () => {
  const m = mensaje('televisor plasma');
  assert.ok(m.includes('televisor plasma'), 'tiene que citar lo que busco');
  assert.ok(/web/i.test(m), 'tiene que decir que fue en la web');
});

test('sin termino no hay mensaje: no se manda un WhatsApp vacio', () => {
  assert.strictEqual(mensaje('   '), '');
  assert.strictEqual(mensaje(undefined), '');
});

test('el enlace lleva el telefono en digitos y el texto codificado', () => {
  const u = enlace('+53 5 555 1234', 'faja moldeadora');
  assert.ok(u.startsWith('https://api.whatsapp.com/send?phone=5355551234&text='), u);
  assert.ok(u.includes(encodeURIComponent('faja moldeadora')), u);
});

test('sin telefono o sin termino no hay enlace', () => {
  assert.strictEqual(enlace('', 'algo'), '');
  assert.strictEqual(enlace('5355551234', ''), '');
  assert.strictEqual(enlace(undefined, undefined), '');
});

test('un termino con caracteres raros va codificado, no crudo', () => {
  const u = enlace('5355551234', 'niño & "algo"');
  assert.ok(!u.includes('"'), 'las comillas no pueden ir crudas: ' + u);
  assert.ok(!u.includes(' '), 'los espacios no pueden ir crudos: ' + u);
});
```

- [ ] **Step 2: Córrela y comprueba que falla**

Run: `node --test`
Expected: falla al cargar `test/faltante.test.js` (`ENOENT … faltante.js`).

- [ ] **Step 3: Escribe el módulo**

Crea `faltante.js`:

```js
// faltante.js — lo que el cliente busco y la tienda no tiene.
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js
// en el bloque #vacio. Se prueba con node:vm desde test/faltante.test.js.
//
// Por que existe: una busqueda sin resultados era un callejon sin salida. Ahora abre
// una conversacion, y de paso es la unica forma que tiene la tienda —que no tiene
// backend ni analitica— de contarle a 3B que le estan pidiendo y no tiene.
(function () {
  'use strict';

  const LARGO_MAX = 60;

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX);
  }

  function mensaje(termino) {
    const t = limpiar(termino);
    if (!t) return '';
    return 'Hola 3B 👋\nBusqué *' + t + '* en la web y no lo encontré.\n¿Lo tienen o me lo pueden conseguir?';
  }

  function enlace(destino, termino) {
    const texto = mensaje(termino);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  window.Faltante = { limpiar, mensaje, enlace };
})();
```

- [ ] **Step 4: Córrela y comprueba que pasa**

Run: `node --test`
Expected: **100/100** (92 + 8 nuevas), `exit 0`.

- [ ] **Step 5: Regístralo**

En `index.html`, tras `<script src="historial.js"></script>`:

```html
<script src="faltante.js"></script>
```

En `sw.js`, en `ARMAZON`, tras `'/historial.js',`:

```js
  '/faltante.js',
```

- [ ] **Step 6: Commit**

```bash
git add faltante.js test/faltante.test.js index.html sw.js
git commit -m "feat: modulo del mensaje para lo que no esta en el catalogo"
```

---

### Task 5: El botón «Pregúntanos por …» en la búsqueda sin resultados

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html` (el bloque `#vacio`, líneas 263-266)
- Modify: `C:\inventario\tienda-3b\estilos.css` (al final)
- Modify: `C:\inventario\tienda-3b\app.js` (`renderGrid`, línea ~536)

- [ ] **Step 1: El hueco en el HTML**

El bloque `#vacio` queda así. El botón nuevo va **antes** de «Ver todo el catálogo»: a
quien no encontró algo le interesa preguntar, no volver a empezar.

```html
    <div id="vacio" class="estado" hidden>
      <p>No hay productos que coincidan con tu búsqueda.</p>
      <div id="vacio-pregunta" class="vacio-pregunta" hidden></div>
      <button id="btn-ver-todo" class="btn btn-suave btn-secundario" type="button">Ver todo el catálogo</button>
    </div>
```

- [ ] **Step 2: El estilo**

Al final de `estilos.css`:

```css
/* Búsqueda sin resultados: el botón que abre WhatsApp con lo que el cliente buscó.
   Va por encima de «Ver todo el catálogo» y pesa más que él a propósito. */
.vacio-pregunta { margin: 0 0 14px; }
.vacio-pregunta .btn { display: inline-flex; max-width: 100%; }
.vacio-pregunta .vacio-sub {
  margin: 8px 0 0;
  font-size: .9rem;
  opacity: .75;
}
```

- [ ] **Step 3: Píntalo desde `renderGrid`**

En `app.js`, justo **antes** de `function renderGrid() {`, inserta:

```js
// Buscó algo que no está: en vez de un callejón sin salida, un botón que abre WhatsApp
// con lo que escribió. El destino es el mismo criterio que el del pedido —quien pone el
// precio, atiende—: el gestor con recargo si se entró por su página, y si no, la casa.
function pintarPregunta(termino) {
  const caja = document.getElementById('vacio-pregunta');
  if (!caja) return;
  const t = window.Faltante.limpiar(termino);
  const destino = (gestorRecargo && gestorRecargo.telPublico) || (CAT && CAT.whatsapp);
  const url = window.Faltante.enlace(destino, t);
  if (!url) { caja.hidden = true; caja.innerHTML = ''; return; }   // vacío por el chip, no por una búsqueda
  caja.hidden = false;
  caja.innerHTML = '<a class="btn btn-primario" href="' + escapeHtml(url) +
    '" target="_blank" rel="noopener">Pregúntanos por «' + escapeHtml(t) + '»</a>' +
    '<p class="vacio-sub">Te decimos si lo tenemos o si te lo podemos conseguir.</p>';
}
```

Y dentro de `renderGrid`, **justo después** de la línea que decide `#vacio`:

```js
  document.getElementById('vacio').hidden = !(lista.length === 0 && (buscando || soloEnvioGratis));
  pintarPregunta(busqueda);
```

- [ ] **Step 4: Sintaxis y batería**

Run: `node --check app.js` y después `node --test`
Expected: sin salida del `--check` y **100/100**.

- [ ] **Step 5: Commit**

```bash
git add index.html estilos.css app.js
git commit -m "feat: la busqueda sin resultados ofrece preguntar por WhatsApp"
```

---

### Task 6: Caché nueva, verificación en navegador de verdad e informe

**Files:**
- Modify: `C:\inventario\tienda-3b\sw.js` (línea 11)
- Create: `C:\inventario\tienda-3b\docs\informes\2026-10-18-atras-cierra-y-busqueda-que-vende.md`

- [ ] **Step 1: Sube la caché**

🔴 **Regla permanente de este repo:** se tocaron `app.js`, `index.html` y `estilos.css`.
Sin subir `CACHE`, quien tenga la tienda instalada sigue viendo el código viejo y parece
que «el cambio no llegó».

En `sw.js`, línea 11:

```js
const CACHE = 'tienda-3b-v13';
```

- [ ] **Step 2: Levanta la tienda en local**

En una terminal aparte, desde la raíz del repo:

```bash
npx --yes serve -l 4173 -s .
```

🔴 La `-s` importa: hace que cualquier ruta desconocida sirva `index.html`, que es lo que
hace en producción el rewrite de `vercel.json`. Sin ella, `/p/CODIGO` daría 404 en local
y no podrías probar la entrada por enlace compartido.

- [ ] **Step 3: Saca un código de producto real para las pruebas**

```bash
node -e "const c=require('./catalogo.json');const p=c.items.find(x=>x.codigo);console.log(p.codigo,'|',p.name)"
```

Apunta ese código: es el `<COD>` de los pasos siguientes.

- [ ] **Step 4: Las nueve comprobaciones, a 375 px**

Usa Chrome del sistema con `puppeteer-core` **desde el scratchpad**, nunca instalado en
el repo (el panel de navegador integrado mide ~294 px y escala las capturas a un tercio).
Chrome está en `C:\Program Files\Google\Chrome\Application\chrome.exe`.

Comprueba una por una y **anota lo que viste**, no lo que esperabas:

1. Portada → tocar un producto: la URL pasa a `/p/<COD>` y `history.length` sube en 1.
2. Con la ficha abierta, «atrás»: la ficha se cierra, la URL vuelve a `/` y **sigues en
   la tienda** (`document.getElementById('modal-detalle').hidden === true`).
3. Cerrar con la ✕: mismo resultado que el «atrás», y `history.length` **no** sube (el
   cierre consume la entrada, no añade otra).
4. Entrar directo a `http://localhost:4173/p/<COD>`: la ficha se abre sola y el primer
   «atrás» deja el catálogo, **no** sale del sitio.
5. Desde la ficha, abrir otro producto en «Más de esta categoría»: «atrás» vuelve al
   primero, no al catálogo.
6. Abrir el carrito con algo dentro: «atrás» lo cierra y deja el catálogo.
7. Ficha abierta → botón del carrito → «atrás»: se cierra el carrito y **queda la ficha
   abierta**, con la URL otra vez en `/p/<COD>`.
8. Entrar por `http://localhost:4173/?ref=<CODIGO_DE_GESTOR>`, abrir una ficha y cerrar:
   la query `?ref=` sigue en la URL en todo momento.
9. Buscar «televisor plasma»: sale «Pregúntanos por «televisor plasma»», y su `href`
   apunta a `api.whatsapp.com` con el teléfono de la tienda y el texto codificado.
   Activar solo el chip 🛵 hasta vaciar la parrilla **no** debe sacar ese botón.

- [ ] **Step 5: Guarda una captura de la búsqueda sin resultados**

A 375 px, con la búsqueda «televisor plasma» puesta, guarda la captura en
`docs/informes/2026-10-18-busqueda-sin-resultados-375px.png`.

- [ ] **Step 6: La batería completa, una última vez**

Run: `node --test`
Expected: **100/100**, `exit 0`. Apunta el número real que viste.

- [ ] **Step 7: Deja el informe de relevo**

Crea `docs/informes/2026-10-18-atras-cierra-y-busqueda-que-vende.md`: autocontenido, con
la evidencia **observada** (las nueve comprobaciones, con lo que pasó de verdad en cada
una, y el recuento de pruebas). Lo que no hayas ejecutado se marca literalmente
**⚠ NO VERIFICADO** — por ejemplo, el gesto «atrás» en un teléfono real si solo lo
probaste en el Chrome de escritorio.

- [ ] **Step 8: Actualiza el `CLAUDE.md`**

Añade una entrada a la sección «Proyecto: Tienda web 3B» de `C:\Users\JyR\CLAUDE.md`
con: qué hace el historial de capas, la regla 🔴 de no ocultar capas fuera de
`sincronizarCapas`, que encargos conserva el `state`, y la caché en `tienda-3b-v13`.
Corrige de paso un dato viejo de ese archivo: **«Ver todo el catálogo» SÍ limpia el chip
🛵** desde el 14/10 (`app.js:1801-1810`); lo que sigue pendiente es que el carrusel «Los
más vendidos» no se ordena ni se filtra.

- [ ] **Step 9: Commit**

```bash
git add sw.js docs/informes/
git commit -m "docs: informe y cache v13 del historial y la busqueda que vende"
```

- [ ] **Step 10: Despliegue**

🔴 **No lo hagas tú.** El despliegue a producción es un `git push` del repo de la tienda
y lo decide Ruth. Cuando lo haga: la **primera** visita tras el despliegue todavía corre
el código viejo (el service worker viejo sirve su caché mientras el nuevo se instala);
hace falta una segunda carga. Antes de dudar del cambio, comprueba en la consola qué
código corre de verdad con `cerrarDetalle.toString()`, no solo el `curl` del archivo.

---

## Lo que este plan NO hace (y es a propósito)

- El modal de **encargos** y el recuadro de **gestor** no entran en el historial: el
  «atrás» no los cierra. Son dos capas más y multiplicaban el riesgo del refactor.
- El carrusel **«Los más vendidos»** sigue sin ordenarse ni filtrarse.
- La franja de ~35 px a la derecha de la foto grande a 375 px sigue ahí
  (`.modal-foto{aspect-ratio:1;max-height:340px}`).
- No se añade analítica de ninguna clase. La demanda que falta llega por WhatsApp, que es
  donde Ruth ya trabaja.
