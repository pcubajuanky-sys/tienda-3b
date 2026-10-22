# Preguntar por un producto + completar la mensajería gratis — Plan de implementación

> **Para ejecutores:** SUB-SKILL OBLIGATORIO: usa `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea a tarea.
> Los pasos llevan casilla (`- [ ]`) para ir marcando.

**Objetivo:** cerrar los dos huecos donde la tienda pierde a una clienta ya convencida:
(1) no hay forma de **preguntar** por un producto, y (2) se le dice «te faltan X CUP para la
mensajería gratis» sin ofrecerle **qué añadir**.

**Arquitectura:** dos módulos puros nuevos (`preguntar.js` y `completar.js`) que solo hacen
aritmética y texto, más su cableado en `app.js`. Es exactamente el patrón que ya usan
`faltante.js`, `orden.js` y `espera.js`: IIFE + `window.X`, probados con `node:vm` desde
`node --test`. **Ninguna regla de negocio nueva vive en el navegador**: el destino de
WhatsApp y el umbral de mensajería se leen de funciones que ya existen.

**Stack:** JavaScript de navegador sin framework ni build. Pruebas con `node:test` + `node:vm`.
Despliegue: `git push` a `main` (Vercel publica solo).

---

## Contexto que el ejecutor necesita (léelo antes del Task 1)

Trabajas en `C:\inventario\tienda-3b`, la tienda web de 3B (www.3bqba.com). Es un catálogo
**estático**: no hay backend ni base de datos. `catalogo.json` lo publica otro programa
(Stock+) y el pedido sale por WhatsApp.

**Las seis reglas que NO puedes romper:**

1. 🔴 **Si tocas `app.js`, `estilos.css`, `index.html` o cualquier archivo de `ARMAZON`,
   SUBE `CACHE` en `sw.js`** (hoy `tienda-3b-v20` → lo dejarás en `tienda-3b-v21`). Si no,
   quien tenga la tienda instalada sigue viendo el código viejo y parece que el cambio «no
   llegó». Un archivo `.js` nuevo **además** hay que añadirlo a la lista `ARMAZON`.
2. 🔴 **Nada de manejadores en línea** (`onclick=`): la CSP de producción los bloquea. Los
   clics se enganchan por delegación desde `app.js`.
3. 🔴 **Todo texto que venga del catálogo pasa por `escapeHtml()`** antes de entrar en un
   `innerHTML`.
4. 🔴 **No mientas en los textos.** Esta tienda ya rechaza decir «te faltan» cuando el
   carrito solo lleva productos de transporte aparte (ver el comentario de
   `lineaEnvioTexto`). El mismo criterio manda aquí: solo se ofrece como «te sale gratis» lo
   que **de verdad** cruza el umbral.
5. 🔴 **Las pruebas se corren con `node --test` desde la raíz**, nunca `node --test test/`
   (con Node 24 falla).
6. 🔴 **`catalogo.json` lo publica Stock+**: puedes mirarlo, nunca lo edites ni lo commitees.

**Baseline medida el 2026-10-22, antes de empezar:** `node --test` → **158/158, exit 0**.
Si al empezar no te da eso, para y avisa: alguien dejó el árbol sucio.

**De dónde sale cada dato** (no lo recalcules, llama a lo que ya existe):

| Lo que necesitas | Quién lo sabe ya |
|---|---|
| Número de WhatsApp al que escribir | `(esCasaWeb() && gestorRecargo && gestorRecargo.telPublico) \|\| CAT.whatsapp` |
| Cuánto falta para la mensajería gratis | `envioGratis()` → `{activo, umbral, falta, alcanzado}` |
| Si un producto no suma para el umbral | `esAparte(p)` (es `p.envioAparte`) |
| Si un producto está pedido y no se vende | `Espera.enEspera(p, clave)` |
| Lo que ya está en el carrito | `carrito` (objeto `clave → cantidad`), `itemsCarrito()` |

---

## Estructura de archivos

| Archivo | Qué hace | Acción |
|---|---|---|
| `preguntar.js` | Módulo puro: arma el texto y el enlace de WhatsApp para preguntar por **un producto**. | Crear |
| `test/preguntar.test.js` | Sus pruebas. | Crear |
| `completar.js` | Módulo puro: elige qué productos ofrecer para cruzar el umbral de mensajería gratis. | Crear |
| `test/completar.test.js` | Sus pruebas. | Crear |
| `index.html` | Dos contenedores vacíos + dos `<script src>`. | Modificar |
| `app.js` | Dos funciones que pintan, y sus llamadas. | Modificar |
| `estilos.css` | Estilos de los dos bloques nuevos. | Modificar |
| `sw.js` | `CACHE` a `v21` + los dos archivos nuevos en `ARMAZON`. | Modificar |

**Por qué dos módulos y no uno:** son dos responsabilidades sin nada en común (texto de
WhatsApp vs. aritmética de umbral) y se prueban por separado. Juntarlos obligaría a cargar
las dos en cualquier prueba de una.

---

## Task 1: `preguntar.js` — el módulo puro

**Files:**
- Create: `C:\inventario\tienda-3b\preguntar.js`
- Test: `C:\inventario\tienda-3b\test\preguntar.test.js`

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/preguntar.test.js` con este contenido exacto:

```js
// test/preguntar.test.js — pruebas de preguntar.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'preguntar.js'), 'utf8'), sandbox);
const { mensaje, enlace, TEXTO_BOTON, TEXTO_BOTON_ESPERA } = sandbox.window.Preguntar;

const P = { name: 'Nebulizador portátil', codigo: '24PU' };

test('el mensaje lleva el nombre y el codigo del producto', () => {
  const m = mensaje(P, false);
  assert.match(m, /Nebulizador portátil/);
  assert.match(m, /24PU/);
});

test('el mensaje normal pregunta por informacion, no por una reserva', () => {
  const m = mensaje(P, false);
  assert.match(m, /informaci[óo]n/i);
  assert.ok(!/se libera/i.test(m), 'el mensaje normal no debe hablar de liberarse');
});

test('en espera el mensaje pide que le avisen', () => {
  const m = mensaje(P, true);
  assert.match(m, /se libera/i);
  assert.match(m, /24PU/);
});

test('un producto sin codigo no escribe un parentesis vacio', () => {
  const m = mensaje({ name: 'Cosa sin codigo' }, false);
  assert.match(m, /Cosa sin codigo/);
  assert.ok(!/\(\s*\)/.test(m), `parentesis vacio en: ${m}`);
  assert.ok(!/c[óo]digo/i.test(m), `habla de un codigo que no existe: ${m}`);
});

test('sin producto no hay mensaje', () => {
  assert.strictEqual(mensaje(null, false), '');
  assert.strictEqual(mensaje({}, false), '');
  assert.strictEqual(mensaje({ name: '   ' }, false), '');
});

test('el enlace lleva el telefono en digitos y el texto codificado', () => {
  const url = enlace('+53 5363-268423', P, false);
  assert.match(url, /^https:\/\/api\.whatsapp\.com\/send\?phone=5363268423&text=/);
  assert.match(url, /24PU/);
  assert.ok(!url.includes(' '), 'el texto tiene que ir codificado');
});

test('sin telefono o sin producto no hay enlace', () => {
  assert.strictEqual(enlace('', P, false), '');
  assert.strictEqual(enlace(null, P, false), '');
  assert.strictEqual(enlace('5363268423', null, false), '');
  assert.strictEqual(enlace('sin-digitos', P, false), '');
});

test('los dos textos de boton existen y son cortos', () => {
  assert.ok(TEXTO_BOTON.length > 0 && TEXTO_BOTON.length <= 30, TEXTO_BOTON);
  assert.ok(TEXTO_BOTON_ESPERA.length > 0 && TEXTO_BOTON_ESPERA.length <= 30, TEXTO_BOTON_ESPERA);
  assert.notStrictEqual(TEXTO_BOTON, TEXTO_BOTON_ESPERA);
});
```

- [ ] **Step 2: Corre la prueba y comprueba que falla**

```bash
cd "C:/inventario/tienda-3b" && node --test test/preguntar.test.js
```

Esperado: FALLA con `ENOENT ... preguntar.js` (el archivo todavía no existe).

- [ ] **Step 3: Escribe el módulo**

Crea `preguntar.js` con este contenido exacto:

```js
// preguntar.js — «quiero preguntar por ESTE producto».
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js
// en la ficha, debajo de la accion de compra. Se prueba con node:vm desde
// test/preguntar.test.js.
//
// Por que existe: esta tienda no tiene pasarela de pago — la conversacion de WhatsApp ES
// el checkout. Hasta hoy los tres botones de WhatsApp de la ficha servian para COMPARTIR
// el producto, no para preguntar por el, asi que la clienta que dudaba («¿me sirve esta
// talla?», «¿llega a Güira?») no tenia donde escribir y se iba.
//
// 🔴 El CODIGO del producto va en el mensaje a proposito: es lo mismo que Stock+ usa para
// emparejar un pedido (ver la linea `Ref:` de enviarPorWhatsApp), asi que Ruth y Mia saben
// de que producto se habla sin adivinar por el nombre.
(function () {
  'use strict';

  const TEXTO_BOTON = 'Preguntar por este producto';
  const TEXTO_BOTON_ESPERA = 'Avísame si se libera';

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim();
  }

  // (producto, enEspera) -> texto para WhatsApp. Sin producto o sin nombre, ''.
  function mensaje(p, enEspera) {
    const nombre = limpiar(p && p.name);
    if (!nombre) return '';
    const codigo = limpiar(p && p.codigo);
    // Sin codigo no se escribe el parentesis: «(código )» le dice a Ruth que algo falla
    // en el catalogo, y a la clienta no le dice nada.
    const quien = codigo ? nombre + '* (código ' + codigo + ')' : nombre + '*';
    return enEspera
      ? 'Hola 3B 👋\nMe interesa *' + quien + ', que está pedido.\n¿Me avisan si se libera?'
      : 'Hola 3B 👋\nMe interesa *' + quien + '.\n¿Me pueden dar más información?';
  }

  // (telefono, producto, enEspera) -> URL de WhatsApp, o '' si falta algo.
  // api.whatsapp.com/send, nunca wa.me: es lo que usa el resto de la tienda.
  function enlace(destino, p, enEspera) {
    const texto = mensaje(p, enEspera);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  window.Preguntar = { mensaje, enlace, TEXTO_BOTON, TEXTO_BOTON_ESPERA };
})();
```

- [ ] **Step 4: Corre la prueba y comprueba que pasa**

```bash
cd "C:/inventario/tienda-3b" && node --test test/preguntar.test.js
```

Esperado: `pass 8`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add preguntar.js test/preguntar.test.js && git commit -m "feat: modulo puro para preguntar por un producto por WhatsApp"
```

---

## Task 2: el botón de preguntar en la ficha

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html` (dentro de `#modal-detalle`, tras `#espera-ficha`)
- Modify: `C:\inventario\tienda-3b\app.js`
- Modify: `C:\inventario\tienda-3b\estilos.css`

- [ ] **Step 1: Añade el contenedor vacío en `index.html`**

Busca este bloque exacto (está dentro de `<div class="modal-body">` de `#modal-detalle`):

```html
        <p class="espera-ficha" id="espera-ficha" hidden></p>
        <p class="garantia-ficha" id="garantia-ficha" hidden></p>
```

Déjalo así (una línea nueva en medio):

```html
        <p class="espera-ficha" id="espera-ficha" hidden></p>
        <!-- Botón para preguntar por ESTE producto (2026-10-22). Va después del aviso de
             espera a propósito: con el producto pedido se lee «está pedido… / avísame si se
             libera», que es la secuencia que tiene sentido. Lo pinta pintarPreguntarProducto()
             en app.js; vacío/oculto si el catálogo no trae número de WhatsApp. -->
        <div class="ficha-preguntar" id="ficha-preguntar" hidden></div>
        <p class="garantia-ficha" id="garantia-ficha" hidden></p>
```

- [ ] **Step 2: Añade el `<script src>` en `index.html`**

Busca esta línea:

```html
<script src="espera.js"></script>
```

Déjala así (la nueva debajo):

```html
<script src="espera.js"></script>
<script src="preguntar.js"></script>
```

- [ ] **Step 3: Escribe la función que pinta, en `app.js`**

Busca la función `pintarEsperaFicha` (empieza en la línea ~607) y pega **justo debajo de su
llave de cierre** esta función nueva:

```js
// El botón de preguntar de la ficha. Se repinta junto a la acción porque el texto cambia
// si la combinación elegida está pedida.
//
// 🔴 Mismo destino que el pedido y que la búsqueda sin resultados: quien pone el precio,
// atiende. Si la visita entró por la página de un gestor con recargo, le escribe a ÉL; si
// no, al número de la casa. No lo "arregles" mandándolo siempre a la casa: el gestor pone
// ese precio y es quien responde por él.
function pintarPreguntarProducto(id, clave) {
  const caja = document.getElementById('ficha-preguntar');
  if (!caja) return;
  const p = productoDe(id);
  const esperando = Espera.enEspera(p, clave || null);
  const destino = (esCasaWeb() && gestorRecargo && gestorRecargo.telPublico) || (CAT && CAT.whatsapp);
  const url = window.Preguntar.enlace(destino, p, esperando);
  if (!url) { caja.hidden = true; caja.innerHTML = ''; return; }   // sin número no se enseña
  const texto = esperando ? window.Preguntar.TEXTO_BOTON_ESPERA : window.Preguntar.TEXTO_BOTON;
  caja.hidden = false;
  caja.innerHTML = '<a class="btn btn-suave btn-secundario ficha-preguntar-btn" href="' +
    escapeHtml(url) + '" target="_blank" rel="noopener">💬 ' + escapeHtml(texto) + '</a>';
}
```

- [ ] **Step 4: Llámala desde los dos sitios donde se repinta la acción**

**(a)** En `refrescarAcciones`, busca esta línea exacta:

```js
    pintarEsperaFicha(id, claveActual);
```

Déjala así:

```js
    pintarEsperaFicha(id, claveActual);
    pintarPreguntarProducto(id, claveActual);
```

**(b)** En `mostrarDetalle` (empieza en la línea ~784) busca estas dos líneas exactas:

```js
  document.getElementById('modal-accion').innerHTML = accionHtml(id, null);
  pintarEsperaFicha(id, null);
```

Déjalas así:

```js
  document.getElementById('modal-accion').innerHTML = accionHtml(id, null);
  pintarEsperaFicha(id, null);
  pintarPreguntarProducto(id, null);
```

> ℹ️ El `null` es correcto y no es un descuido: al **abrir** la ficha todavía no hay
> combinación elegida (`seleccionVar = []` dos líneas antes). En cuanto la clienta elija
> talla o color, `refrescarAcciones` lo repinta con la clave real — por eso hacen falta las
> dos llamadas, (a) y (b), y no basta con una.

- [ ] **Step 5: Añade el estilo en `estilos.css`**

Busca esta línea:

```css
.espera-ficha{font-size:13px;color:var(--text-2);background:rgba(107,114,128,.08);
```

Pega **encima** de ella este bloque:

```css
/* Preguntar por este producto (2026-10-22). Secundario a propósito: nunca debe competir
   con «Añadir» — es la salida de quien duda, no la de quien ya decidió. Ancho completo
   para que el pulgar lo alcance a 375 px, igual que el botón de compra. */
.ficha-preguntar{margin-top:var(--e1)}
.ficha-preguntar-btn{display:flex;width:100%;justify-content:center;align-items:center;gap:6px}
```

- [ ] **Step 6: Comprueba que no rompiste nada**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `pass 166`, `fail 0` (158 de baseline + 8 nuevos).

- [ ] **Step 7: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add index.html app.js estilos.css && git commit -m "feat: boton para preguntar por un producto desde su ficha"
```

---

## Task 3: `completar.js` — el módulo puro de la mensajería gratis

**Files:**
- Create: `C:\inventario\tienda-3b\completar.js`
- Test: `C:\inventario\tienda-3b\test\completar.test.js`

**La decisión de diseño que no puedes cambiar sin pensarlo:** solo se ofrecen productos cuyo
precio **llega o pasa** lo que falta (`precioCUP >= falta`). Un producto más barato que el
hueco **no** da mensajería gratis al añadirlo, y anunciarlo como si la diera sería mentir —
que es justo lo que esta tienda lleva meses evitando. Se ordenan de **más barato a más caro**:
el primero que cruza el umbral es el que menos le cuesta a la clienta.

Comprobado contra el catálogo real del 21/10: con huecos de 500, 1.000, 1.550 y 1.900 CUP
siempre salen 4 candidatos, entre 500 y 2.000 CUP.

- [ ] **Step 1: Escribe la prueba que falla**

Crea `test/completar.test.js` con este contenido exacto:

```js
// test/completar.test.js — pruebas de completar.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'completar.js'), 'utf8'), sandbox);
const { candidatos, MAX } = sandbox.window.Completar;

const items = [
  { id: 'a', name: 'Barato', precioCUP: 300 },
  { id: 'b', name: 'Justo', precioCUP: 500 },
  { id: 'c', name: 'Pasa', precioCUP: 900 },
  { id: 'd', name: 'Caro', precioCUP: 5000 },
];

test('solo ofrece lo que de verdad cruza el umbral', () => {
  const r = candidatos(items, { falta: 500, excluirIds: [] });
  assert.deepStrictEqual(r.map((p) => p.id), ['b', 'c', 'd']);
});

test('lo que cuesta justo lo que falta SI cuenta: el umbral es «desde»', () => {
  const r = candidatos(items, { falta: 500, excluirIds: [] });
  assert.ok(r.some((p) => p.id === 'b'), 'el de 500 tiene que estar con falta 500');
});

test('van de mas barato a mas caro: lo que menos le cuesta, primero', () => {
  const r = candidatos(items, { falta: 100, excluirIds: [] });
  assert.deepStrictEqual(r.map((p) => p.precioCUP), [300, 500, 900, 5000]);
});

test('no ofrece lo que ya esta en el carrito', () => {
  const r = candidatos(items, { falta: 500, excluirIds: ['b', 'd'] });
  assert.deepStrictEqual(r.map((p) => p.id), ['c']);
});

test('nunca ofrece transporte aparte: ese producto NO suma para el umbral', () => {
  const lista = items.concat([{ id: 'x', name: 'Mueble', precioCUP: 900, envioAparte: true }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'x'), 'un envioAparte no puede dar mensajeria gratis');
});

test('nunca ofrece lo que esta pedido y esperando confirmacion', () => {
  const lista = items.concat([{ id: 'y', name: 'Pedido', precioCUP: 900, espera: true }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'y'), 'lo que no se vende no se ofrece');
});

test('nunca ofrece productos con variantes: el boton de añadir necesitaria una talla', () => {
  const lista = items.concat([{ id: 'z', name: 'Camisa', precioCUP: 900, variantes: { ejes: ['Talla'] } }]);
  const r = candidatos(lista, { falta: 500, excluirIds: [] });
  assert.ok(!r.some((p) => p.id === 'z'), 'con variantes no se puede añadir de un toque');
});

test('devuelve como mucho MAX', () => {
  const muchos = [];
  for (let i = 0; i < 30; i++) muchos.push({ id: 'p' + i, name: 'P' + i, precioCUP: 1000 + i });
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [] }).length, MAX);
});

test('el tope se puede bajar, nunca subir por encima de MAX', () => {
  const muchos = [];
  for (let i = 0; i < 30; i++) muchos.push({ id: 'p' + i, name: 'P' + i, precioCUP: 1000 + i });
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [], max: 2 }).length, 2);
  assert.strictEqual(candidatos(muchos, { falta: 100, excluirIds: [], max: 99 }).length, MAX);
});

test('sin hueco que llenar no se ofrece nada', () => {
  assert.deepStrictEqual(candidatos(items, { falta: 0, excluirIds: [] }), []);
  assert.deepStrictEqual(candidatos(items, { falta: -5, excluirIds: [] }), []);
});

test('no lanza con basura', () => {
  assert.deepStrictEqual(candidatos(null, { falta: 500, excluirIds: [] }), []);
  assert.deepStrictEqual(candidatos(items, null), []);
  assert.deepStrictEqual(candidatos([null, undefined, {}], { falta: 500, excluirIds: [] }), []);
  assert.deepStrictEqual(candidatos(items, { falta: 'mucho', excluirIds: [] }), []);
});
```

- [ ] **Step 2: Corre la prueba y comprueba que falla**

```bash
cd "C:/inventario/tienda-3b" && node --test test/completar.test.js
```

Esperado: FALLA con `ENOENT ... completar.js`.

- [ ] **Step 3: Escribe el módulo**

Crea `completar.js` con este contenido exacto:

```js
// completar.js — «añade uno de estos y la mensajeria te sale gratis».
//
// Modulo PURO (ni DOM ni red): elige QUE productos ofrecer cuando al carrito le falta poco
// para el umbral de mensajeria gratis. Lo pinta app.js en el carrito. Se prueba con node:vm
// desde test/completar.test.js.
//
// Por que existe: la tienda ya decia «Te faltan 1,550 CUP para la mensajeria gratis» y ahi
// se acababa — la clienta tenia que volver a una parrilla de 225 productos y calcular cual
// cabe. Ahora se los ponemos delante.
//
// 🔴 SOLO se ofrece lo que precioCUP >= falta, es decir lo que de VERDAD cruza el umbral.
// Un producto mas barato que el hueco no da mensajeria gratis, y ofrecerlo como si la diera
// seria mentir. Es la misma regla que ya cumple lineaEnvioTexto() al negarse a decir «te
// faltan» cuando el carrito solo lleva transporte aparte.
//
// 🔴 De mas BARATO a mas caro: el primero que cruza el umbral es el que menos le cuesta a
// la clienta. Ordenarlo al reves subiria el pedido medio una vez y espantaria a la clienta
// la siguiente.
(function () {
  'use strict';

  const MAX = 4;

  function precio(p) {
    const n = Number(p && p.precioCUP);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // Un producto se puede ofrecer aqui solo si las cuatro cosas son ciertas:
  //  - no es de transporte aparte  -> si lo fuera NO sumaria para el umbral (ver esAparte /
  //    totalCarritoElegible en app.js): ofrecerlo seria ofrecer algo que no cumple
  //  - no esta pedido y esperando confirmacion -> no se vende, no se ofrece
  //  - no tiene variantes -> la tira añade de un toque con data-add, y con variantes haria
  //    falta elegir talla/color: eso es la ficha, no el carrito
  //  - tiene precio
  function ofertable(p) {
    if (!p || typeof p !== 'object') return false;
    if (p.envioAparte) return false;
    if (p.espera === true) return false;
    if (p.variantes) return false;
    return precio(p) > 0;
  }

  // (items, {falta, excluirIds, max}) -> productos que cruzan el umbral, del mas barato al
  // mas caro. Cualquier entrada rara devuelve [] (fallo cerrado: mejor no enseñar la tira).
  function candidatos(items, opciones) {
    if (!Array.isArray(items) || !opciones || typeof opciones !== 'object') return [];
    const falta = Number(opciones.falta);
    if (!Number.isFinite(falta) || falta <= 0) return [];
    const fuera = Array.isArray(opciones.excluirIds) ? opciones.excluirIds : [];
    const pedido = Number(opciones.max);
    // El tope se puede bajar, nunca subir: la tira se desplaza en horizontal y mas de
    // cuatro tarjetas en 375 px es una segunda parrilla dentro del carrito.
    const tope = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, MAX) : MAX;
    return items
      .filter((p) => ofertable(p) && precio(p) >= falta && fuera.indexOf(p.id) === -1)
      .sort((a, b) => precio(a) - precio(b))
      .slice(0, tope);
  }

  window.Completar = { candidatos, MAX };
})();
```

- [ ] **Step 4: Corre la prueba y comprueba que pasa**

```bash
cd "C:/inventario/tienda-3b" && node --test test/completar.test.js
```

Esperado: `pass 11`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add completar.js test/completar.test.js && git commit -m "feat: modulo puro que elige que ofrecer para cruzar la mensajeria gratis"
```

---

## Task 4: la tira en el carrito

**Files:**
- Modify: `C:\inventario\tienda-3b\index.html` (dos contenedores + un `<script src>`)
- Modify: `C:\inventario\tienda-3b\app.js` (`renderCarrito`)
- Modify: `C:\inventario\tienda-3b\estilos.css`

- [ ] **Step 1: Añade los dos contenedores en `index.html`**

**(a)** En el **panel modal** del carrito, busca esta línea exacta:

```html
    <div id="carrito-total" class="total"></div>
```

Déjala así:

```html
    <div id="carrito-total" class="total"></div>
    <!-- «Añade uno de estos y la mensajería te sale gratis» (2026-10-22). Va ANTES del
         formulario: si fuera después, la clienta ya estaría escribiendo su dirección y no
         vuelve. Lo pinta pintarCompletarEnvio() en app.js. -->
    <div id="completar-envio" class="completar" hidden></div>
```

**(b)** En el **aside lateral** (escritorio), busca esta línea exacta:

```html
    <div id="lateral-total" class="lateral-total" hidden></div>
```

Déjala así:

```html
    <div id="lateral-total" class="lateral-total" hidden></div>
    <div id="lateral-completar" class="completar" hidden></div>
```

**(c)** Busca la línea del script que añadiste en el Task 2:

```html
<script src="preguntar.js"></script>
```

Déjala así:

```html
<script src="preguntar.js"></script>
<script src="completar.js"></script>
```

- [ ] **Step 2: Escribe la función que pinta, en `app.js`**

Busca la función `renderCarrito` (empieza en la línea ~1569) y pega **justo encima** de ella
esta función nueva:

```js
// La tira de «añade uno de estos y la mensajería te sale gratis». Se pinta en el panel y en
// el aside con el MISMO html: una sola fuente de verdad, igual que lineaEnvioTexto().
//
// 🔴 El hueco sale de envioGratis(), que ya descuenta el transporte aparte. No lo
// recalcules aquí: si mañana cambia la regla del umbral, cambia en un sitio.
//
// 🔴 Los botones llevan `data-add="<id>"`, que es exactamente lo que ya escucha la
// delegación global de clics (la misma que usa accionHtml). Por eso completar.js descarta
// los productos con variantes: su clave de carrito no es el id a secas.
function completarEnvioHtml(eg) {
  if (!eg.activo || eg.alcanzado) return '';
  // Mismo criterio que lineaEnvioTexto: con solo transporte aparte en el carrito no hay
  // umbral que alcanzar, así que tampoco hay nada que ofrecer.
  if (totalCarritoElegible() === 0) return '';
  const enCarrito = itemsCarrito().map(({ p }) => p.id);
  const lista = window.Completar.candidatos(CAT.items || [], { falta: eg.falta, excluirIds: enCarrito });
  if (!lista.length) return '';
  return '<p class="completar-tit">Añade uno de estos y la mensajería te sale gratis</p>' +
    '<div class="completar-tira">' +
    lista.map((x) =>
      '<button type="button" class="rel-card completar-card" data-add="' + escapeHtml(x.id) + '">' +
      '<span class="rel-foto"><img src="' + fotoMosaico(x.photo) + '" alt="" loading="lazy"></span>' +
      '<span class="rel-nom">' + escapeHtml(x.name) + '</span>' +
      '<span class="rel-precio">' + fmt(x.precioCUP) + ' CUP</span>' +
      '</button>').join('') +
    '</div>';
}

function pintarCompletarEnvio(idCaja, html) {
  const caja = document.getElementById(idCaja);
  if (!caja) return;
  caja.hidden = !html;
  caja.innerHTML = html;
}
```

> ℹ️ **Por qué el precio va siempre en CUP aquí** y no respeta `p.moneda` como el resto de la
> tienda: el hueco que se está llenando es en CUP (`Te faltan 1,550 CUP`). Enseñar `$2` al
> lado de «te faltan 1,550 CUP» obliga a la clienta a convertir de cabeza para saber si llega.

- [ ] **Step 3: Llámala desde `renderCarrito`, en los dos sitios**

**(a)** Dentro de `renderCarrito`, busca esta línea exacta:

```js
  const pagoHtml = hayItems && !cerrada() ? pagoWrapHtml() : '';
```

Déjala así:

```js
  const pagoHtml = hayItems && !cerrada() ? pagoWrapHtml() : '';
  const completarHtml = hayItems && !cerrada() ? completarEnvioHtml(eg) : '';
```

**(b)** Busca esta línea exacta (es la del panel modal):

```js
  document.getElementById('panel-terminos').hidden = !hayItems;
```

Pega **encima** de ella:

```js
  pintarCompletarEnvio('completar-envio', completarHtml);
```

**(c)** Busca esta línea exacta (es la del aside):

```js
  document.getElementById('lateral-terminos').hidden = !hayItems;
```

Pega **encima** de ella:

```js
  pintarCompletarEnvio('lateral-completar', completarHtml);
```

- [ ] **Step 4: Añade el estilo en `estilos.css`**

Busca esta línea exacta:

```css
.envio-linea{display:block;font-size:12px;font-weight:600;color:var(--brand);margin-bottom:4px}
```

Pega **debajo** de ella este bloque:

```css
/* Completar para la mensajería gratis (2026-10-22). Reusa .rel-card/.rel-foto/.rel-nom/
   .rel-precio de los relacionados: misma tira, mismo tamaño de dedo, cero CSS duplicado. */
.completar{margin:var(--e2) 0}
.completar-tit{font-size:13px;font-weight:700;color:var(--brand);margin:0 0 8px}
.completar-tira{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.completar-card{flex:0 0 108px}
.completar-card .rel-foto{width:108px;height:108px}
```

- [ ] **Step 5: Comprueba que no rompiste nada**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: `pass 177`, `fail 0` (158 + 8 + 11).

- [ ] **Step 6: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add index.html app.js estilos.css && git commit -m "feat: tira para completar el pedido y ganar la mensajeria gratis"
```

---

## Task 5: service worker — que el cambio llegue a los teléfonos

**Files:**
- Modify: `C:\inventario\tienda-3b\sw.js`

🔴 **Sin esta tarea el trabajo de las cuatro anteriores no llega a nadie que tenga la tienda
instalada.** No la saltes.

- [ ] **Step 1: Sube la versión de la caché**

En `sw.js`, busca:

```js
const CACHE = 'tienda-3b-v20';
```

Déjalo:

```js
const CACHE = 'tienda-3b-v21';
```

- [ ] **Step 2: Añade los dos archivos nuevos a `ARMAZON`**

En la lista `ARMAZON`, busca la línea de `espera.js` y añade las dos debajo. Debe quedar así:

```js
  '/espera.js',
  '/preguntar.js',
  '/completar.js',
```

> Si `/espera.js` no estuviera en la lista, añade las dos líneas nuevas junto a los otros
> `.js` igualmente: lo que importa es que estén.

- [ ] **Step 3: Comprueba que la lista no tiene erratas**

```bash
cd "C:/inventario/tienda-3b" && node -e "const s=require('fs').readFileSync('sw.js','utf8'); const m=s.match(/const ARMAZON = \[([^\]]+)\]/)[1]; const fs=require('fs'); m.split(',').map(x=>x.trim().replace(/['\/]/g,'')).filter(Boolean).forEach(f=>{ if(f && f.includes('.') && !fs.existsSync(f)) console.log('FALTA EN DISCO:', f); }); console.log('cache:', s.match(/const CACHE = '([^']+)'/)[1]);"
```

Esperado: `cache: tienda-3b-v21` y **ninguna** línea `FALTA EN DISCO`.

- [ ] **Step 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add sw.js && git commit -m "chore: cache v21 con preguntar.js y completar.js en el armazon"
```

---

## Task 6: verificación en navegador — mirar, no solo medir

🔴 **Los tests en verde NO bastan.** Nada de lo anterior ha sido visto funcionando todavía.

- [ ] **Step 1: Levanta la tienda en local**

```bash
cd "C:/inventario/tienda-3b" && npx --yes serve -l 4173 .
```

Déjalo corriendo. Abre `http://localhost:4173` en un Chrome a **375 px** de ancho
(DevTools → Toggle device toolbar → 375×812).

> 🔴 **No instales `puppeteer` en el repo.** Si automatizas, usa `puppeteer-core` contra el
> Chrome del sistema **desde el scratchpad**, nunca dentro de `C:\inventario\tienda-3b`.

- [ ] **Step 2: Comprueba las 8 cosas, una por una**

Marca cada una solo cuando la hayas **visto**:

- [ ] 1. Abre una ficha cualquiera. Debajo de «Añadir» aparece **💬 Preguntar por este
      producto**, secundario (no compite con «Añadir»), de ancho completo.
- [ ] 2. Púlsalo. Se abre WhatsApp (o la pantalla de WhatsApp Web) con el mensaje escrito,
      con el **nombre y el código** del producto. **No envíes el mensaje.**
- [ ] 3. Abre la ficha de un producto en espera. El botón dice **💬 Avísame si se libera**,
      el de «Añadir» sigue deshabilitado y el aviso largo sigue encima.
      Para encontrar uno, en la consola: `CAT.items.filter(p=>p.espera===true).map(p=>p.codigo)`.
      Si no hay ninguno hoy, fuérzalo en la consola:
      `CAT.items[0].espera = true; abrirDetalle(CAT.items[0].id)` — y **recarga** después.
- [ ] 4. Añade al carrito un producto de menos de 2.000 CUP. Ábrelo. Debajo del total sale
      **«Añade uno de estos y la mensajería te sale gratis»** con hasta 4 productos.
- [ ] 5. 🔴 **Comprueba la aritmética a mano:** el precio del primer producto de la tira
      tiene que ser **mayor o igual** que la cifra que dice «Te faltan X CUP». Si es menor,
      hay un fallo: para y arréglalo.
- [ ] 6. Pulsa uno de la tira. Se añade al carrito, el total sube, y la línea pasa a
      **🎉 Tu pedido lleva mensajería gratis**. La tira **desaparece**.
- [ ] 7. Vacía el carrito. La tira no queda colgada ni deja un hueco.
- [ ] 8. Pon la ventana a **1280 px**. El aside de escritorio enseña la misma tira, debajo
      del total, sin desbordarse.

- [ ] **Step 3: Captura la prueba**

Guarda dos capturas a 375 px en `docs/informes/`:
`2026-10-22-preguntar-ficha-375px.jpg` y `2026-10-22-completar-carrito-375px.jpg`.

- [ ] **Step 4: Commit de las capturas**

```bash
cd "C:/inventario/tienda-3b" && git add docs/informes/2026-10-22-*.jpg && git commit -m "docs: capturas de la verificacion en navegador"
```

---

## Task 7: batería completa, documentación y despliegue

- [ ] **Step 1: Corre TODA la batería y observa el resultado**

```bash
cd "C:/inventario/tienda-3b" && node --test
```

Esperado: **`pass 177`, `fail 0`, exit 0**. Copia las cifras reales al informe: si no son
estas, escribe las que salgan y explica la diferencia. **No inventes el número.**

- [ ] **Step 2: Escribe el informe de relevo**

Crea `docs/informes/2026-10-22-preguntar-y-completar-mensajeria.md`. Autocontenido, con:
- qué se hizo y por qué (los dos huecos que cerraba, de la revisión del 22/10);
- las cifras de tests **observadas** (baseline 158 → final);
- las 8 comprobaciones del Task 6, con cuáles pasaste y cuáles no;
- ⚠ **NO VERIFICADO:** ningún teléfono real, y ningún mensaje de WhatsApp enviado de verdad.

- [ ] **Step 3: Actualiza el `CLAUDE.md` del usuario**

En `C:\Users\JyR\CLAUDE.md`, sección **Proyecto: Tienda web 3B**, añade una entrada con la
fecha, qué hacen los dos módulos nuevos, las dos reglas 🔴 (solo se ofrece lo que cruza el
umbral; el destino de WhatsApp respeta al gestor con recargo) y la caché en `tienda-3b-v21`.

- [ ] **Step 4: Commit**

```bash
cd "C:/inventario/tienda-3b" && git add docs/informes/2026-10-22-preguntar-y-completar-mensajeria.md && git commit -m "docs: informe de relevo de preguntar y completar"
```

- [ ] **Step 5: Despliega — pregunta antes**

🔴 **`git push` publica en www.3bqba.com para clientes reales. PREGUNTA A RUTH ANTES.**
No lo hagas por tu cuenta aunque todo esté en verde.

Con su visto bueno:

```bash
cd "C:/inventario/tienda-3b" && git push origin main
```

- [ ] **Step 6: Verifica EN EL SITIO REAL**

Espera a que Vercel publique (~1 min) y abre `https://www.3bqba.com` a 375 px.

🔴 **La primera carga tras un despliegue ejecuta el código VIEJO**: el service worker
anterior sirve su caché mientras el nuevo se instala. **Recarga una segunda vez.** Antes de
dudar de nada, comprueba qué código corre de verdad en la consola:

```js
(await caches.keys())                     // tiene que decir tienda-3b-v21
typeof pintarPreguntarProducto            // "function"
typeof completarEnvioHtml                 // "function"
```

Y repite en producción las comprobaciones 1, 4 y 5 del Task 6.

---

## Repaso del plan contra la revisión

| Punto de la revisión del 22/10 | Dónde se implementa |
|---|---|
| A1 — «Te faltan X» sin nada que tocar | Tasks 3, 4 |
| A2 — no hay botón para preguntar | Tasks 1, 2 |
| A6 — 42 productos con 1 unidad y ninguna forma de decir «avísame» | Task 1 (`TEXTO_BOTON_ESPERA`) + Task 2 |

A3 (ahorro real en las ofertas), A4 (sello NUEVO), A5 (grupo de WhatsApp), B1–B5 y la
sección C **no entran en este plan** a propósito: son la tanda 2 y siguientes.

## Lo que este plan NO hace

- No toca Stock+ ni `catalogo.json`: todo sale de datos que ya se publican.
- No añade analítica: sigue sin haber forma de medir si esto funciona (sección D de la revisión).
- No cambia el mensaje del pedido (`enviarPorWhatsApp`) ni su destino.
- No arregla el defecto conocido de la franja de ~35 px en la foto de la ficha.
