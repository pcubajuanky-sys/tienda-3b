# El sello de oferta dice cuánto se ahorra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el sello rojo de las ofertas diga **`-36%`** en vez de `OFERTA` cuando el
descuento es de verdad grande, y que la tienda deje de enseñar un «antes» tachado cuando no
hay rebaja real.

**Architecture:** Toda la aritmética y la decisión del texto van en un **módulo puro**
(`descuento.js`, patrón IIFE + `window.X`, probado con `node:vm`). `app.js` y `tarjeta.js`
solo lo consultan. Ningún dato nuevo en `catalogo.json`: `precioNormalCUP`/`precioNormalUSD`
ya viajan.

**Tech Stack:** HTML + CSS + JavaScript de navegador, sin dependencias. `node --test` desde la
raíz (Node 24).

**Origen:** petición del usuario («me gusta el de oferta -x %, vamos a desarrollar eso») y el
ítem A3 de `docs/auditorias/2026-10-22-revision-ux-y-ganchos-de-venta.md`.

**Baseline medida antes de empezar:** `node --test` → **226/226, exit 0** (2026-10-27).

---

## Lo que dicen los datos reales (medido hoy sobre `catalogo.json`, tasa 850)

**17 productos en oferta de 208.** Repartidos así:

```
 52%     425 ->    204   Peine de barbería
 36%    1870 ->   1199   Paquete de 3 Mini Embudos plegable
 33%     600 ->    400   Audífonos de cable
 30%     500 ->    350   PopSockets
 27%    1700 ->   1233   Chancletas de playa
 27%   10200 ->   7425   Sandalias tiras lisas
 17%    5100 ->   4250   Abrigo de Chihuahua (x2 entradas)
 14%    5460 ->   4680   Cafetera 1 taza
 13%    6800 ->   5950   Arnés para perros
 13%    6800 ->   5950   Mono enterizo tallas pequeñas
  9%   46750 ->  42500   Ventilador recargable Camping Fan
  8%   21250 ->  19550   Candado/Alarma de Motos
  7%   25500 ->  23800   Nesquik de chocolate
  6%   13600 ->  12750   Timbre Inalámbrico
  5%   17000 ->  16150   Nebulizador portátil
 -3%     595 ->    612   Paquete de 4 Tic-Tacs Estilo variado
```

De ahí salen las tres decisiones de diseño:

1. 🔴 **Hay una «oferta» que SUBE el precio.** El Tic-Tac tiene `precioNormalUSD: 0.70` y
   `precioUSD: 0.72` — no es redondeo, está mal en Stock+ en las dos monedas. **Y la tienda ya
   lo está enseñando hoy**: pinta `595 CUP` tachado y `612 CUP` al lado. Un `-X%` ahí daría
   `+3%`. Por eso este plan, además del sello, **tapa el tachado cuando el «antes» no es mayor
   que el precio de ahora** — no se puede decir cuánto ahorras cuando no ahorras nada. El dato
   lo tiene que arreglar Ruth en Stock+; la web, mientras tanto, se calla.
2. **Hay seis descuentos pequeños** (9, 8, 7, 6, 5 y el negativo). Un sello que grita `-5%`
   desinfla la oferta en vez de venderla. **Por debajo del 10 % el sello se queda en
   `OFERTA`**, que es lo que dice hoy. Con los datos de hoy: **11 de 17 llevan número**.
3. **El porcentaje se redondea HACIA ABAJO** (`Math.floor`), nunca hacia arriba: prometer un
   37 % cuando es 36,8 % es exagerar. Efecto lateral comprobado: con `floor`, el porcentaje
   calculado por USD y por CUP **coincide en los 17 productos** (con `Math.round` discrepaban
   en 3 por el redondeo del CUP al publicar), así que nadie puede pillar una incoherencia
   entre las dos monedas de la tarjeta.

---

## Estructura de archivos

| Archivo | Qué pasa | Responsabilidad |
|---|---|---|
| `descuento.js` | **crear** | Calcula el %, decide el texto del sello y si hay rebaja real |
| `app.js` | modificar | El sello usa el módulo; `precioHtml` tapa el tachado falso y pinta el % en la ficha |
| `tarjeta.js` | modificar | La imagen para compartir deja de enseñar un «antes» falso |
| `estilos.css` | modificar | `.precio-desc`, el chip del % en la ficha |
| `index.html`, `electripower.html` | modificar | `<script src="descuento.js">` |
| `sw.js` | modificar | `/descuento.js` en `ARMAZON` + `CACHE` → `tienda-3b-v26` |
| `test/descuento.test.js` | **crear** | |
| `test/tarjeta.test.js`, `test/paginas.test.js` | modificar | |

🔴 **`descuento.js` va ANTES de `tarjeta.js`** en los `<script>` de las dos páginas: `tarjeta.js`
lo consulta.

---

### Task 1: El módulo `descuento.js`

**Files:**
- Create: `descuento.js`, `test/descuento.test.js`

- [ ] **Step 1: Escribir el test que falla**

Crea `test/descuento.test.js`:

```js
// test/descuento.test.js — pruebas de descuento.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'descuento.js'), 'utf8'), sandbox);
const { MINIMO, porciento, hayRebaja, sello } = sandbox.window.Descuento;

// Productos reales del catalogo del 2026-10-27.
const PEINE = { enOferta: true, moneda: 'usd', precioCUP: 204, precioNormalCUP: 425, precioUSD: 0.24, precioNormalUSD: 0.5 };
const NEBU  = { enOferta: true, moneda: 'usd', precioCUP: 16150, precioNormalCUP: 17000, precioUSD: 19, precioNormalUSD: 20 };
const TICTAC = { enOferta: true, moneda: 'usd', precioCUP: 612, precioNormalCUP: 595, precioUSD: 0.72, precioNormalUSD: 0.7 };
const NORMAL = { enOferta: false, moneda: 'cup', precioCUP: 1000, precioNormalCUP: 0 };

test('el minimo para enseñar un numero es el 10 %', () => {
  assert.strictEqual(MINIMO, 10);
});

test('el porcentaje se redondea HACIA ABAJO: nunca se exagera la rebaja', () => {
  // 1 - 204/425 = 52,0 % justo; 1 - 1199/1870 = 35,88 % -> 35, no 36.
  assert.strictEqual(porciento(PEINE), 52);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 1199, precioNormalCUP: 1870 }), 35);
  assert.strictEqual(porciento(NEBU), 5);
});

test('🔴 una «oferta» que SUBE el precio no es una rebaja', () => {
  // El Tic-Tac existe de verdad en el catalogo: 595 -> 612. Esta mal el dato en Stock+,
  // y hasta que lo arreglen la tienda no puede anunciarlo como rebaja.
  assert.strictEqual(porciento(TICTAC), null);
  assert.strictEqual(hayRebaja(TICTAC), false);
  assert.strictEqual(sello(TICTAC), 'OFERTA', 'sigue siendo oferta en el panel, pero sin numero');
});

test('sin oferta no hay ni sello ni rebaja', () => {
  assert.strictEqual(porciento(NORMAL), null);
  assert.strictEqual(hayRebaja(NORMAL), false);
  assert.strictEqual(sello(NORMAL), '');
});

test('🔴 por debajo del minimo el sello se queda como esta hoy', () => {
  // Un sello que grita «-5%» desinfla la oferta en vez de venderla.
  assert.strictEqual(sello(NEBU), 'OFERTA');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 910, precioNormalCUP: 1000 }), 'OFERTA', '9 % todavia no');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 900, precioNormalCUP: 1000 }), '-10%', '10 % justo ya si');
});

test('a partir del minimo el sello dice el numero', () => {
  assert.strictEqual(sello(PEINE), '-52%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 400, precioNormalCUP: 600 }), '-33%');
});

test('el precio de referencia es el de la MONEDA del producto', () => {
  // El cliente ve tachado el precio en la moneda principal: tiene que poder
  // comprobar la cuenta con los dos numeros que tiene delante.
  const soloUsdCoherente = { enOferta: true, moneda: 'usd', precioUSD: 5, precioNormalUSD: 10, precioCUP: 4250, precioNormalCUP: 8500 };
  assert.strictEqual(porciento(soloUsdCoherente), 50);
  const enCup = { enOferta: true, moneda: 'cup', precioCUP: 350, precioNormalCUP: 500, precioUSD: 1, precioNormalUSD: 1 };
  assert.strictEqual(porciento(enCup), 30, 'en cup manda el par de CUP');
});

test('cualquier entrada rara calla, nunca enseña NaN', () => {
  assert.strictEqual(porciento(null), null);
  assert.strictEqual(porciento(undefined), null);
  assert.strictEqual(porciento('x'), null);
  assert.strictEqual(sello(null), '');
  assert.strictEqual(hayRebaja(undefined), false);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 100, precioNormalCUP: 0 }), null);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 0, precioNormalCUP: 100 }), null);
  assert.strictEqual(porciento({ enOferta: true, moneda: 'cup', precioCUP: 100, precioNormalCUP: 100 }), null, 'mismo precio no es rebaja');
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `node --test test/descuento.test.js`
Expected: FAIL — `descuento.js` no existe.

- [ ] **Step 3: Crear el módulo**

Crea `descuento.js`:

```js
// descuento.js — cuanto se ahorra de verdad en una oferta, y que dice el sello.
//
// Modulo PURO (ni DOM ni red). Se prueba con node:vm desde test/descuento.test.js.
//
// Por que existe: el sello rojo decia «OFERTA» y nada mas. «-36%» es otra cosa. Pero el
// numero solo se puede enseñar cuando dice algo, y los datos reales obligan a tres reglas.
//
// 🔴 REDONDEO HACIA ABAJO, siempre. Prometer un 37 % cuando es 36,8 % es exagerar la
// rebaja. Efecto lateral medido sobre los 17 productos en oferta del 2026-10-27: con
// floor, el porcentaje por USD y por CUP COINCIDE en los 17 (con round discrepaban en 3,
// por el redondeo del CUP al publicar el catalogo), asi que nadie puede pillar una
// incoherencia entre las dos monedas de la tarjeta.
//
// 🔴 POR DEBAJO DEL 10 % NO SE ENSEÑA NUMERO. Hoy hay seis ofertas de 9 % o menos; un
// sello que grita «-5%» desinfla la oferta en vez de venderla. Esas se quedan con el
// «OFERTA» de siempre.
//
// 🔴 UNA «OFERTA» QUE SUBE EL PRECIO NO ES UNA REBAJA. El «Paquete de 4 Tic-Tacs» del
// catalogo real va de 595 a 612 CUP (0,70 -> 0,72 USD): no es redondeo, es un dato mal
// puesto en Stock+. Mientras siga asi, la tienda no lo anuncia como rebaja ni le tacha un
// «antes» que es mentira. Por eso existe hayRebaja(): la usan el sello, el precio de la
// ficha y la imagen para compartir.
(function () {
  'use strict';

  var MINIMO = 10;

  function num(n) {
    var v = Number(n);
    return isFinite(v) ? v : NaN;
  }

  // El par de precios de la moneda PRINCIPAL del producto: es el que el cliente ve
  // tachado, asi que es con el que tiene que poder comprobar la cuenta.
  function par(p) {
    if (!p || typeof p !== 'object') return null;
    var esUsd = p.moneda === 'usd';
    var ahora = num(esUsd ? p.precioUSD : p.precioCUP);
    var antes = num(esUsd ? p.precioNormalUSD : p.precioNormalCUP);
    if (!(ahora > 0) || !(antes > 0)) return null;
    return { ahora: ahora, antes: antes };
  }

  // Entero > 0, o null. null significa «no hay nada que anunciar».
  function porciento(p) {
    if (!p || !p.enOferta) return null;
    var d = par(p);
    if (!d || d.antes <= d.ahora) return null;
    // 🔴 EL EPSILON NO ES ADORNO. Sin el, `1 - 900/1000` da 0.09999999999999998 y un
    // descuento del 10 % EXACTO se calcula como 9: justo los numeros redondos que una
    // tienda pone de verdad (10, 20, 25, 50) se quedarian por debajo del minimo y sin
    // sello. Medido sobre el catalogo real: el «Candado/Alarma de Motos» (21250 ->
    // 19550, 8 % exacto) se calculaba como 7. El epsilon solo corrige el error del
    // coma flotante: una rebaja de 36,8 % sigue dando 36, y una de 9,99 % sigue dando 9.
    var pct = Math.floor((1 - d.ahora / d.antes) * 100 + 1e-9);
    return pct > 0 ? pct : null;
  }

  // ¿El «antes» es de verdad mayor que el precio de ahora? Lo que decide si se tacha.
  function hayRebaja(p) {
    return porciento(p) !== null;
  }

  // El texto del sello rojo. '' si el producto no esta en oferta.
  function sello(p) {
    if (!p || !p.enOferta) return '';
    var pct = porciento(p);
    return pct !== null && pct >= MINIMO ? '-' + pct + '%' : 'OFERTA';
  }

  window.Descuento = { MINIMO: MINIMO, porciento: porciento, hayRebaja: hayRebaja, sello: sello };
})();
```

- [ ] **Step 4: Correr la batería completa**

Run: `node --test`
Expected: PASS — 234 tests (226 + 8 nuevos), 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add descuento.js test/descuento.test.js
git commit -m "feat(tienda): modulo que calcula cuanto se ahorra en una oferta

Redondeo hacia abajo (con floor, el porcentaje por USD y por CUP coincide en
los 17 productos en oferta de hoy; con round discrepaban en 3). Por debajo del
10 % no se enseña numero: hay seis ofertas de 9 % o menos y un «-5%» desinfla.
Y una «oferta» que sube el precio no es una rebaja: el Tic-Tac del catalogo va
de 595 a 612 CUP.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: El sello, el precio de la ficha y la imagen para compartir

**Files:**
- Modify: `app.js` (`tarjetaHtml` ~línea 512, `precioHtml` ~línea 471, la llamada de
  `mostrarDetalle` ~línea 885), `tarjeta.js`, `estilos.css`
- Modify: `test/tarjeta.test.js`

- [ ] **Step 1: Escribir el test que falla**

En `test/tarjeta.test.js`, **antes** de la línea que ejecuta `tarjeta.js` en el sandbox, añade
la carga de `descuento.js` en el **mismo** sandbox (ancla por texto: busca el
`vm.runInContext(... 'tarjeta.js' ...)` y pon esta línea justo encima):

```js
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'descuento.js'), 'utf8'), sandbox);
```

Y añade al final del archivo:

```js
test('🔴 la imagen para compartir no tacha un «antes» que no es mayor', () => {
  // El «Paquete de 4 Tic-Tacs» del catalogo real va de 595 a 612 CUP. Esa imagen se
  // manda por WhatsApp y Facebook: si enseña «595 CUP» tachado encima de «612 CUP»,
  // la mentira viaja mas lejos que la pagina.
  const tictac = { name: 'Tic-Tacs', enOferta: true, moneda: 'usd', precioCUP: 612, precioNormalCUP: 595, precioUSD: 0.72, precioNormalUSD: 0.7 };
  assert.strictEqual(precioTarjeta(tictac).antes, '');
  const peine = { name: 'Peine', enOferta: true, moneda: 'usd', precioCUP: 204, precioNormalCUP: 425, precioUSD: 0.24, precioNormalUSD: 0.5 };
  assert.ok(precioTarjeta(peine).antes.indexOf('0.5') >= 0, 'una rebaja real si lleva el antes');
});

test('🔴 app.js pide el sello y el tachado al modulo, no los decide a mano', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('Descuento.sello('), 'el sello tiene que salir del modulo');
  assert.ok(!/class="card-oferta">OFERTA</.test(app), 'ya no se escribe OFERTA a mano');
  assert.ok(app.includes('Descuento.hayRebaja('), 'el tachado tiene que preguntar si hay rebaja real');
});
```

🔴 Mira primero la cabecera de `test/tarjeta.test.js`: si no desestructura ya `precioTarjeta`
de `sandbox.window.Tarjeta`, añádelo. Si `fs`/`path` no están requeridos, añádelos como en
`test/tasa.test.js`.

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `node --test test/tarjeta.test.js`
Expected: FAIL — el `antes` del Tic-Tac todavía trae `595`/`0.7`.

- [ ] **Step 3: Implementar**

En **`tarjeta.js`**, dentro de `precioTarjeta`, sustituye:

```js
    if (p.enOferta) {
```

por:

```js
    // 🔴 Solo si hay rebaja de verdad. Esta imagen viaja por WhatsApp y Facebook: un
    // «antes» tachado que no es mayor que el precio de ahora miente mas lejos que la
    // pagina. Lo decide descuento.js, que se carga antes que este modulo.
    if (p.enOferta && window.Descuento && window.Descuento.hayRebaja(p)) {
```

En **`app.js`**, en `tarjetaHtml`, sustituye la línea del sello:

```js
          ${p.enOferta ? `<span class="card-oferta">OFERTA</span>` : ''}
```

por:

```js
          ${window.Descuento.sello(p) ? `<span class="card-oferta">${window.Descuento.sello(p)}</span>` : ''}
```

En **`app.js`**, `precioHtml` pasa a aceptar un segundo argumento y a preguntar por la rebaja.
Sustituye la función entera por:

```js
// `conDescuento` solo lo pide la ficha: en la parrilla el porcentaje ya lo grita el sello
// de la foto, y repetirlo al lado del precio seria decir dos veces lo mismo en 165 px.
function precioHtml(p, conDescuento) {
  const usd = `$${p.precioUSD}`;
  const cup = `${fmt(p.precioCUP)} CUP`;
  const esUsd = p.moneda === 'usd';
  const principal = esUsd ? usd : cup;
  const secundario = esUsd ? cup : usd;
  // 🔴 El tachado solo cuando el «antes» es MAYOR. Hay un producto en el catalogo cuya
  // «oferta» sube el precio (595 -> 612 CUP): tacharle un 595 encima de un 612 es
  // mentir. Lo decide descuento.js; el dato lo arregla Ruth en Stock+.
  const tachado = window.Descuento.hayRebaja(p)
    ? `<span class="tachado">${esUsd ? `$${p.precioNormalUSD}` : `${fmt(p.precioNormalCUP)} CUP`}</span>`
    : '';
  const pct = conDescuento ? window.Descuento.porciento(p) : null;
  const chip = pct !== null && pct >= window.Descuento.MINIMO
    ? `<span class="precio-desc">-${pct}%</span>`
    : '';
  return tachado + `<span class="precio">${principal}<span class="usd">· ${secundario}</span></span>` + chip;
}
```

En **`app.js`**, `mostrarDetalle`, la llamada pasa a pedir el chip:

```js
  document.getElementById('modal-precio').innerHTML = precioHtml(p, true) +
```

En **`estilos.css`**, justo después de la regla `.tachado{...}`:

```css
/* El «-36%» de la ficha, al lado del precio grande. Mismos colores que el sello de la
   foto (--oferta/--oferta-ink, el par ya medido en test/colores.test.js), para que se
   lean como la misma cosa. En la parrilla no va: alli lo dice el sello. */
.precio-desc{
  font-size:var(--t-xs);font-weight:800;letter-spacing:.03em;
  padding:var(--e0) var(--e1);border-radius:var(--radio-pill);
  background:var(--oferta);color:var(--oferta-ink);
}
```

- [ ] **Step 4: Correr la batería completa**

Run: `node --test`
Expected: PASS — 236 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add app.js tarjeta.js estilos.css test/tarjeta.test.js
git commit -m "feat(tienda): el sello de oferta dice -X% cuando la rebaja es grande

Por debajo del 10 % se queda en OFERTA. La ficha enseña el mismo numero al lado
del precio. Y el tachado desaparece cuando el «antes» no es mayor que el precio
de ahora, en la pagina y en la imagen para compartir: el catalogo trae una
«oferta» que va de 595 a 612 CUP.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Cablear el módulo en las dos páginas y subir la caché

**Files:**
- Modify: `index.html`, `electripower.html`, `sw.js`, `test/paginas.test.js`

- [ ] **Step 1: El test, primero**

En `test/paginas.test.js`, añade `'descuento.js'` al array `MODULOS`, **justo antes de
`'tarjeta.js'`** (el orden del array no importa para el test, pero deja claro el orden real de
carga).

Run: `node --test test/paginas.test.js`
Expected: FAIL — `index.html no carga descuento.js`.

- [ ] **Step 2: Cablear**

En **las dos páginas**, 🔴 **antes** de `<script src="tarjeta.js"></script>`:

```html
<script src="descuento.js"></script>
```

En **`sw.js`**, en `ARMAZON`, tras `'/regreso.js',`:

```js
  '/descuento.js',
```

Y sube la caché:

```js
const CACHE = 'tienda-3b-v26';
```

- [ ] **Step 3: Verificar**

Run: `node --test`
Expected: PASS — 236/236, 0 fallos.

Run: `node --check app.js; node --check tarjeta.js; node --check descuento.js; node --check sw.js`
Expected: sin salida.

Run: `grep -n '<script src=' index.html electripower.html`
Expected: en las dos, `descuento.js` aparece **antes** que `tarjeta.js`.

- [ ] **Step 4: Commit**

```bash
git add index.html electripower.html sw.js test/paginas.test.js
git commit -m "chore(tienda): descuento.js en las dos paginas y en ARMAZON, CACHE -> v26

Va antes que tarjeta.js, que lo consulta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificación final (la hace el piloto)

1. `node --test` → 236/236, exit 0, observado.
2. Navegador a 375 px, los dos temas: el sello del Peine dice **`-52%`**, el del Nebulizador
   sigue diciendo **`OFERTA`**, y el del Tic-Tac dice **`OFERTA` sin tachado**. La ficha del
   Peine enseña el chip `-52%` junto al precio; la de la parrilla **no** lo repite.
3. Que el sello no desborde la tarjeta a 375 px ni tape la foto.

## Lo que este plan NO hace

- **No arregla el dato del Tic-Tac.** Eso es de Stock+ y lo decide Ruth: o le quita la oferta o
  le pone un precio rebajado de verdad. La web solo deja de anunciarlo mientras tanto.
- **No enseña el ahorro en dinero** («ahorras 221 CUP»). El porcentaje y el importe compiten
  por el mismo sitio; si se quiere el importe, es otra decisión.
- **No toca el carrusel de «Los más vendidos»** más allá de lo que herede de `tarjetaHtml`.
