# La tasa en la portada y tres ganchos de venta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el cambio CUP↔USD sea lo primero que vea quien entra a la tienda, y añadir
los tres ganchos de venta que no dependen de ninguna decisión de negocio ni de Stock+.

**Architecture:** La tienda es estática (Vercel, sin backend). Toda la aritmética y todos
los textos nuevos van en **módulos puros** (patrón IIFE + `window.X`, probados con
`node:vm` desde `node --test`); `app.js` solo los cablea al DOM. Nada de red nueva, nada
de datos nuevos en `catalogo.json`: todo lo que hace falta ya está publicado.

**Tech Stack:** HTML + CSS + JavaScript de navegador, sin dependencias. Pruebas con
`node --test` (Node 24) desde la raíz del repo.

**Origen:** petición del usuario («en la portada ponme el cambio de cup por usd, quiero
que el cliente vea eso apenas entre» + «dale con los ganchos de venta») y la revisión
`docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md`, §3.1.2, §3.4 y §3.5.

**Baseline medida antes de empezar:** `node --test` desde la raíz → **199/199, exit 0**
(corrido y observado el 2026-10-27). Al terminar el plan deben pasar **todos**, los
nuevos incluidos.

---

## Contexto que el ejecutor necesita (leer antes del Task 1)

### Lo que ya existe y NO hay que reinventar

- `envioGratis()` (`app.js:1248`) devuelve `{activo, umbral, falta, alcanzado, textoFino}`
  y **ya descuenta el transporte aparte**. Es la única fuente de verdad del umbral.
- `totalCarritoElegible()` (`app.js:1182`) es el total que cuenta para ese umbral.
- `esAparte(p)` (`app.js:1180`), `Espera.enEspera(p, clave)` (`espera.js`),
  `cerrada()` (`app.js:1441`), `unidadesEnCarrito()` (`app.js:1094`),
  `abrirCarrito()` (`app.js:1757`), `fmt(n)` (`app.js:48`).
- `TasaVista` (`tasa.js`) ya tiene `valida`, `numero`, `chip`, `aviso`, `carrito`.
- El patrón de aviso descartable ya existe: `#aviso-ajuste` dentro de `.barra-fija`
  (`index.html:81-84`, CSS en `estilos.css:740-749`, cableado en `app.js:2275`).

### Reglas del repo que este plan NO puede romper

1. 🔴 **Cualquier cambio en `app.js`, `estilos.css`, `index.html`, `electripower.html` o
   cualquier archivo de `ARMAZON` OBLIGA a subir `CACHE` en `sw.js`.** Se hace una sola
   vez, en el Task 5.
2. 🔴 **`catalogo.json` lo publica Stock+**: no se toca, no se commitea editado.
3. 🔴 Los tests se corren `node --test` **desde la raíz**, nunca `node --test test/`
   (con Node 24 falla).
4. 🔴 Un módulo puro **no toca el DOM, ni la red, ni el reloj**: el `ahora` se le pasa.
   Eso es lo que permite probarlo con `node:vm`.
5. 🔴 **Falla cerrado**: ante una entrada rara, un módulo devuelve `''` o `[]` y la
   tienda se ve como antes. Nunca un `undefined`, un `NaN` ni un hueco.
6. Los comentarios de este repo llevan acentos con normalidad en unos módulos y no en
   otros. **Copia el código de este plan tal cual**, sin "normalizar" acentos.

---

## Estructura de archivos

| Archivo | Qué pasa | Responsabilidad |
|---|---|---|
| `tasa.js` | **modificar** | Gana `portada()`; pierde `chip()` (lo sustituye `portada()`) |
| `umbral.js` | **crear** | Aritmética + texto de «añádelo y te faltarán X» |
| `regreso.js` | **crear** | ¿Hay que saludar a quien vuelve? + el texto |
| `relacionados.js` | **modificar** | Gana `precioTexto()`: la tira siempre en CUP |
| `app.js` | **modificar** | Cableado: `renderHero`, `pintarUmbralFicha`, `saludarSiVuelve`, `pintarRelacionados` |
| `index.html` | **modificar** | 3 elementos nuevos + 2 `<script>` |
| `electripower.html` | **modificar** | Lo mismo + los **4 módulos que hoy le faltan** |
| `estilos.css` | **modificar** | `.hero-tasa`, `.ficha-umbral`, `.aviso-regreso-btn` |
| `sw.js` | **modificar** | `ARMAZON` + `CACHE` → `tienda-3b-v24` |
| `test/umbral.test.js` | **crear** | |
| `test/regreso.test.js` | **crear** | |
| `test/paginas.test.js` | **crear** | Las dos páginas cargan TODO lo que app.js usa |
| `test/tasa.test.js` | **modificar** | `chip` → `portada` |
| `test/relacionados.test.js` | **modificar** | `precioTexto` |
| `test/colores.test.js` | **modificar** | Un par de contraste más |

---

### Task 1: El cambio CUP↔USD, lo primero que se ve

**Por qué.** Medido en producción el 2026-10-27 a 375 px: hoy la tasa vive en el **tercer
chip** de la portada, a 12 px, en `y=520` — por debajo de los botones y del subtítulo. Es
lo que el cliente cubano pregunta **antes** de mirar un precio. Pasa a su propia línea,
entre el subtítulo y los botones, a 15 px y en negrita.

**Decisión: el chip deja de llevar el número.** Si la línea nueva lo dice en grande, el
chip repetiría la misma cifra 60 px más abajo. El `<li>` se queda con su texto de
siempre, «Precios en CUP y USD», que dice otra cosa (que se ven las dos monedas), y como
ya no lo pinta nadie, pierde el `id`. Por eso `chip()` **se borra**: dejarlo sería código
muerto con tests que no protegen nada.

🔴 **El texto sigue sin prometer frescura.** Dice «Cambio que usamos», no «la tasa de
hoy» ni «según elTOQUE»: el catálogo se republica cada 5 horas y un cambio a mano en
Stock+ **no** lo republica, así que prometer que es la de este minuto sería mentir a
ratos. Es la misma regla que ya defiende `test/tasa.test.js`.

**Files:**
- Modify: `tasa.js`
- Modify: `index.html:167` (tras `.hero-sub`) y `index.html:182`
- Modify: `electripower.html:167` y `electripower.html:182`
- Modify: `estilos.css` (tras la regla `.hero-sub` / su `@media`, línea ~325)
- Modify: `app.js` (`renderHero`, ~línea 1935)
- Test: `test/tasa.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

En `test/tasa.test.js`, **sustituye** el test `'🔴 el chip dice CON QUE tasa estan
calculados, no «la tasa de hoy»'` entero por este:

```js
test('🔴 la portada dice CON QUE tasa estan calculados, no «la tasa de hoy»', () => {
  // La diferencia no es de estilo: el catalogo se republica cada 5 horas y un cambio
  // a mano no lo republica, asi que prometer frescura seria mentir a ratos.
  const t = portada(845);
  assert.ok(t.includes('1 USD = 845 CUP'), 'falta el numero');
  assert.ok(!/tasa del d[ií]a/i.test(t), 'no puede prometer que es la tasa de hoy');
  assert.ok(!/toque/i.test(t), 'no puede atribuirsela a elTOQUE');
  assert.ok(t.length < 42, 'en 375px una linea mas larga se parte fea');
});
```

En el mismo archivo, **cambia la línea del `require` del módulo** para que pida `portada`
en lugar de `chip`:

```js
const { valida, numero, portada, aviso, carrito } = sandbox.window.TasaVista;
```

En el test `'🔴 sin tasa, la pagina se ve exactamente como antes'`, **sustituye** las dos
líneas de `chip` por:

```js
  assert.strictEqual(portada(undefined), '', 'sin tasa, la linea de la portada no se pinta');
  assert.strictEqual(portada(0), '');
```

Y en el test `'🔴 el cableado existe en los TRES sitios y en las DOS paginas'`,
**sustituye** la línea de `TasaVista.chip(` y la del `id="hero-dato-moneda"` por:

```js
  assert.ok(app.includes('TasaVista.portada('), 'falta la linea de la portada');
```

```js
    assert.ok(html.includes('id="hero-tasa"'), pagina + ': falta el id de la linea de la portada');
```

- [ ] **Step 2: Correr los tests y verlos fallar**

Run: `node --test test/tasa.test.js` (excepción a la regla de la raíz: aquí se corre UN
archivo a propósito, para ver el fallo rápido; la batería completa se corre en el Step 4
desde la raíz, sin ruta).
Expected: FAIL — `portada is not a function`.

- [ ] **Step 3: Implementar**

En `tasa.js`, **borra** la función `chip` entera y su comentario, y pon en su lugar:

```js
  // La portada. Es lo PRIMERO que ve quien entra, asi que va en su propia linea y no
  // metida en un chip al final: la clienta cubana pregunta «¿a cuanto esta el cambio?»
  // antes de mirar un precio.
  //
  // 🔴 «Cambio que usamos», nunca «la tasa de hoy» ni «segun elTOQUE»: el catalogo se
  // republica cada 5 horas y un cambio a mano en Stock+ no lo republica. Decimos CON QUE
  // numero estan calculados estos precios, que es verdad siempre.
  function portada(tasa) {
    if (!valida(tasa)) return '';
    return '💵 Cambio que usamos: 1 USD = ' + numero(tasa) + ' CUP';
  }
```

Y cambia la línea de exportación:

```js
  window.TasaVista = { valida, numero, portada, aviso, carrito };
```

En **`index.html`**, tras la línea `<p class="hero-sub">…</p>` (línea 167) inserta:

```html
    <!-- El cambio, lo primero que se ve (2026-10-27). Va aqui, entre el subtitulo y los
         botones, y no en un chip al final: medido en produccion, el chip caia en y=520 a
         375px, por debajo de los botones. Lo pinta renderHero() desde TasaVista.portada();
         sin tasa en el catalogo se queda oculto y la portada se ve igual que antes. -->
    <p class="hero-tasa" id="hero-tasa" hidden></p>
```

En **`index.html:182`**, quita el `id` (el `<li>` ya no lo pinta nadie):

```html
      <li>Precios en CUP y USD</li>
```

Haz **exactamente los dos mismos cambios** en `electripower.html` (líneas 167 y 182: el
HTML de la portada es idéntico).

En **`estilos.css`**, justo después de la línea
`@media (min-width:760px){ .hero-sub{font-size:var(--t-lg)} }` (~325):

```css
/* El cambio en la portada. Mas peso que los chips de abajo —es lo que la clienta busca
   al entrar— pero translucido y no solido, para no competir con los botones. Blanco
   sobre el velo del hero, el mismo contraste que el resto de la portada (8,2:1 medido).
   inline-block + el text-align:center de .hero-contenido lo centran solo. */
.hero-tasa{
  display:inline-block;margin:0 auto var(--e3);padding:6px var(--e3);
  border-radius:var(--radio-pill);font-size:var(--t-md);font-weight:700;line-height:1.3;
  background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.34);
}
```

En **`app.js`**, dentro de `renderHero()`, **sustituye** el bloque del chip
(el comentario `// El numero con el que estan calculados…` y las dos líneas de
`chipMoneda`) por:

```js
  // El cambio, en su propia linea y arriba del todo. Sin tasa valida queda oculto: la
  // portada se ve entonces exactamente como antes de esta tarea.
  const tasaPortada = document.getElementById('hero-tasa');
  if (tasaPortada) {
    const txt = TasaVista.portada(CAT.tasa);
    tasaPortada.textContent = txt;
    tasaPortada.hidden = !txt;
  }
```

- [ ] **Step 4: Correr la batería completa**

Run: `node --test`
Expected: PASS, 199 tests, 0 fallos (el conteo no cambia: se sustituyó un test, no se añadió).

- [ ] **Step 5: Commit**

```bash
git add tasa.js app.js index.html electripower.html estilos.css test/tasa.test.js
git commit -m "feat(tienda): el cambio CUP/USD en su propia linea de la portada

El chip de la tasa caia en y=520 a 375px, por debajo de los botones. Pasa a una
linea propia entre el subtitulo y los botones, a 15px y en negrita. El chip
vuelve a su texto de siempre y TasaVista.chip() se borra: con la linea nueva
seria el mismo numero repetido 60px mas abajo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: «Añádelo y te faltarán X para la mensajería gratis», en la ficha

**Por qué, con datos.** Medido sobre los **196 pedidos completados de los últimos 30
días**: la mediana del pedido web cae **clavada en 2,000 CUP**, que es el umbral de
mensajería gratis, y **85 de 196 (43 %)** se quedaron por debajo y pagaron mensajería. El
umbral **es** el ticket medio. Hoy la tira de «completa tu mensajería» (`completar.js`)
vive en el **carrito**, que es el final del camino: quien está mirando una ficha todavía
no sabe que le falta poco. Esta frase lo dice una pantalla antes, pegada al botón
«Añadir».

**Files:**
- Create: `umbral.js`
- Create: `test/umbral.test.js`
- Modify: `app.js` (función nueva + 2 llamadas)
- Modify: `index.html` (tras `ficha-listo`, línea 354) y `electripower.html` (tras
  `modal-accion`, línea 351)
- Modify: `estilos.css`

- [ ] **Step 1: Escribir el test que falla**

Crea `test/umbral.test.js`:

```js
// test/umbral.test.js — pruebas de umbral.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'umbral.js'), 'utf8'), sandbox);
const { mensaje } = sandbox.window.Umbral;

const base = { activo: true, umbral: 2000, elegible: 0, precio: 500, aparte: false, espera: false };

test('con el carrito vacio dice cuanto faltaria DESPUES de añadirlo', () => {
  // 2000 - 0 - 500 = 1500. La cifra habla del pedido CON este producto dentro: si
  // dijera 2000 estaria contando un carrito que la clienta ya no va a tener.
  const t = mensaje(base);
  assert.ok(t.includes('1,500 CUP'), 'la cifra tiene que ser la de DESPUES de añadirlo: ' + t);
  assert.ok(/A[ñn][aá]delo/i.test(t), 'tiene que hablar de ESTE producto');
  assert.ok(/mensajer[ií]a gratis/i.test(t));
});

test('🔴 cuando ESTE producto cruza el umbral, se dice y se celebra', () => {
  // Es el momento de mayor intencion de compra de toda la tienda: no se puede
  // desperdiciar con un «te faltan 0 CUP».
  const t = mensaje({ ...base, elegible: 1600, precio: 500 });
  assert.ok(/lleva mensajer[ií]a gratis/i.test(t), t);
  assert.ok(!/faltar/i.test(t), 'no puede decir que falta nada: ya no falta');
});

test('justo en el umbral cuenta como alcanzado («desde», no «mas de»)', () => {
  const t = mensaje({ ...base, elegible: 1500, precio: 500 });
  assert.ok(/lleva mensajer[ií]a gratis/i.test(t), '1500 + 500 = 2000 YA es gratis: ' + t);
});

test('con el umbral ya alcanzado, tranquiliza en vez de empujar', () => {
  const t = mensaje({ ...base, elegible: 3000 });
  assert.ok(/ya lleva mensajer[ií]a gratis/i.test(t), t);
  assert.ok(!/A[ñn][aá]delo/i.test(t), 'ya no hace falta empujar');
});

test('🔴 nunca promete nada sobre lo que no cuenta para el umbral', () => {
  // Transporte aparte: su envio NUNCA va a ser gratis, asi que ni suma ni se ofrece.
  assert.strictEqual(mensaje({ ...base, aparte: true }), '');
  // Pedido y esperando confirmacion: no se puede comprar, no se empuja.
  assert.strictEqual(mensaje({ ...base, espera: true }), '');
});

test('🔴 sin umbral configurado la ficha se ve exactamente como antes', () => {
  assert.strictEqual(mensaje({ ...base, activo: false }), '');
  assert.strictEqual(mensaje({ ...base, umbral: 0 }), '');
});

test('cualquier entrada rara calla, nunca enseña NaN ni undefined', () => {
  assert.strictEqual(mensaje(null), '');
  assert.strictEqual(mensaje(undefined), '');
  assert.strictEqual(mensaje('2000'), '');
  assert.strictEqual(mensaje({ ...base, precio: undefined }), '');
  assert.strictEqual(mensaje({ ...base, precio: 0 }), '');
  assert.strictEqual(mensaje({ ...base, umbral: 'dos mil' }), '');
  assert.strictEqual(mensaje({ ...base, elegible: NaN }), '');
});

test('la cifra se lee como dinero, con separador de miles', () => {
  const t = mensaje({ ...base, umbral: 12000, elegible: 0, precio: 500 });
  assert.ok(t.includes('11,500 CUP'), t);
});

test('🔴 el cableado existe en app.js y en las DOS paginas', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('window.Umbral.mensaje('), 'app.js no llama al modulo');
  // Se repinta con la accion: el carrito cambia sin cerrar la ficha (el boton
  // «Añadir» esta justo encima), asi que la frase tiene que seguirle el paso.
  assert.ok(app.includes('pintarUmbralFicha('), 'falta la funcion que lo pinta');
  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="ficha-umbral"'), pagina + ': falta el hueco en la ficha');
  }
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `node --test test/umbral.test.js`
Expected: FAIL — `Cannot find module` / `umbral.js` no existe.

- [ ] **Step 3: Crear el módulo**

Crea `umbral.js`:

```js
// umbral.js — «añadelo y te faltaran X para la mensajeria gratis», en la FICHA.
//
// Modulo PURO (ni DOM ni red). Se prueba con node:vm desde test/umbral.test.js.
//
// Por que existe: la tira de «completa tu mensajeria» (completar.js) vive en el carrito,
// que es el FINAL del camino. Quien esta mirando una ficha todavia no sabe que le falta
// poco. Medido sobre 196 pedidos reales de 30 dias: la mediana del pedido web cae
// CLAVADA en el umbral (2.000 CUP) y 85 de 196 se quedaron por debajo y pagaron
// mensajeria. El umbral ES el ticket medio: decirlo una pantalla antes es la palanca mas
// barata que tiene esta tienda.
//
// 🔴 Habla SIEMPRE de este producto («añadelo»), nunca del carrito en abstracto, y la
// cifra es la de DESPUES de añadirlo. Decir «te faltan 2.000» en la ficha de algo que
// cuesta 500 seria contar un carrito que la clienta ya no va a tener.
//
// 🔴 Nunca promete nada sobre un producto que no cuenta para el umbral (transporte
// aparte: su envio jamas sera gratis) ni sobre uno que no se puede comprar (pedido y
// esperando confirmacion). Es la misma regla que ya cumplen lineaEnvioTexto() y
// completar.js.
(function () {
  'use strict';

  function num(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : NaN;
  }

  function cifra(n) {
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  // ({activo, umbral, elegible, precio, aparte, espera}) -> frase o ''.
  // Cualquier entrada rara devuelve '' (fallo cerrado: mejor callar que mentir).
  function mensaje(d) {
    if (!d || typeof d !== 'object') return '';
    if (!d.activo) return '';
    if (d.aparte || d.espera) return '';
    const umbral = num(d.umbral);
    const elegible = num(d.elegible);
    const precio = num(d.precio);
    if (!(umbral > 0) || !(precio > 0) || !(elegible >= 0)) return '';
    if (elegible >= umbral) return '🎉 Tu pedido ya lleva mensajería gratis';
    if (elegible + precio >= umbral) return '🎉 Añádelo y tu pedido lleva mensajería gratis';
    return 'Añádelo y te faltarán ' + cifra(umbral - elegible - precio) + ' CUP para la mensajería gratis';
  }

  window.Umbral = { mensaje };
})();
```

- [ ] **Step 4: Cablearlo**

En **`app.js`**, justo **antes** de `function refrescarAcciones(id) {` (~línea 673):

```js
// La frase del umbral en la ficha: «añádelo y te faltarán X para la mensajería gratis».
// Se repinta junto a la accion porque depende del carrito, y el carrito cambia sin
// cerrar la ficha (el boton «Añadir» esta justo encima de esta linea).
//
// 🔴 El umbral y el elegible salen de envioGratis() / totalCarritoElegible(), que ya
// descuentan el transporte aparte. No se recalculan aqui: si cambia la regla del
// umbral, cambia en un solo sitio.
//
// 🔴 Con la tienda cerrada no se empuja a comprar: mismo criterio que accionHtml() y
// que pintarListoFicha().
function pintarUmbralFicha(id, clave) {
  const caja = document.getElementById('ficha-umbral');
  if (!caja) return;
  const p = productoDe(id);
  const eg = envioGratis();
  const txt = cerrada() ? '' : window.Umbral.mensaje({
    activo: eg.activo,
    umbral: eg.umbral,
    elegible: totalCarritoElegible(),
    precio: p && p.precioCUP,
    aparte: esAparte(p),
    espera: Espera.enEspera(p, clave || null)
  });
  caja.hidden = !txt;
  caja.textContent = txt;
}
```

En `mostrarDetalle(id)`, **tras** la línea `pintarListoFicha(id);`:

```js
  pintarUmbralFicha(id, null);
```

En `refrescarAcciones(id)`, **tras** la línea `pintarListoFicha(id);`:

```js
    pintarUmbralFicha(id, claveActual);
```

En **`index.html`**, tras `<div class="ficha-listo" id="ficha-listo" hidden></div>`
(línea 354):

```html
        <!-- «Añádelo y te faltarán X CUP para la mensajería gratis» (2026-10-27). Va
             pegado a la acción de compra porque es el empujón de ESE botón: medido sobre
             196 pedidos reales, la mediana del pedido web cae clavada en el umbral y el
             43 % se queda por debajo. Lo pinta pintarUmbralFicha() en app.js; sin umbral
             configurado queda oculto y la ficha se ve como antes. -->
        <p class="ficha-umbral" id="ficha-umbral" hidden></p>
```

En **`electripower.html`**, el mismo bloque, pero tras
`<div class="modal-accion" id="modal-accion"></div>` (línea 351) — esa página **no tiene**
`ficha-listo`.

En **`estilos.css`**, justo antes de la regla `.aviso-ajuste{` (~línea 740):

```css
/* El empujón del umbral en la ficha. Verde de mensajería (--wa, el mismo del chip
   «🛵 MENSAJERIA GRATIS») para que se lea como una buena noticia y no como un error.
   --wa como TEXTO ya está medido contra los tres fondos y en los dos temas en
   test/colores.test.js: no hace falta par nuevo. */
.ficha-umbral{
  margin:var(--e1) 0 0;font-size:var(--t-sm);font-weight:700;line-height:1.35;
  text-align:center;color:var(--wa);
}
```

- [ ] **Step 5: Correr la batería completa**

Run: `node --test`
Expected: PASS — 208 tests (199 + 9 nuevos), 0 fallos.

- [ ] **Step 6: Commit**

```bash
git add umbral.js test/umbral.test.js app.js index.html electripower.html estilos.css
git commit -m "feat(tienda): la ficha dice cuanto falta para la mensajeria gratis

Medido sobre 196 pedidos de 30 dias: la mediana del pedido web cae clavada en el
umbral de 2.000 CUP y 85 de 196 se quedaron por debajo. La tira de «completa tu
mensajeria» solo existia en el carrito, que es el final del camino; ahora la
cuenta sale pegada al boton «Añadir», con la cifra de DESPUES de añadirlo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Saludar a quien vuelve con el carrito puesto

**Por qué.** El carrito ya sobrevive en `localStorage` y desde el 19/10 la tienda
pregunta «¿Ya enviaste tu pedido?» al volver de WhatsApp (ventana de 30 min). Falta el
caso de **la que se fue y vuelve otro día**: hoy se encuentra el carrito igual y la
tienda no le dice nada. Es el «carrito abandonado» del comercio electrónico, hecho sin
servidores ni correos — todo está ya en el navegador de la clienta.

**Ventana: 6 horas.** Una recarga, un cambio de pestaña o un paseo por el catálogo y
vuelta **nunca** disparan el saludo; volver por la noche o al día siguiente, sí.

**Files:**
- Create: `regreso.js`, `test/regreso.test.js`
- Modify: `app.js` (clave nueva + función + 1 llamada + 2 manejadores)
- Modify: `index.html` (tras `#aviso-ajuste`, línea 84) y `electripower.html` (línea 87)
- Modify: `estilos.css`, `test/colores.test.js`

- [ ] **Step 1: Escribir el test que falla**

Crea `test/regreso.test.js`:

```js
// test/regreso.test.js — pruebas de regreso.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'regreso.js'), 'utf8'), sandbox);
const { VENTANA_MS, debeSaludar, texto } = sandbox.window.Regreso;

const HORA = 60 * 60 * 1000;
const AHORA = 1800000000000;

test('la ventana es de seis horas: ni una ni un dia', () => {
  assert.strictEqual(VENTANA_MS, 6 * HORA);
});

test('quien vuelve al dia siguiente con el carrito puesto SI se saluda', () => {
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, AHORA, 3), true);
});

test('🔴 recargar la pagina NO es volver', () => {
  // Es el fallo que haria odiosa esta funcion: un aviso que reaparece cada vez que
  // la clienta toca «atras» o recarga.
  assert.strictEqual(debeSaludar(AHORA - 1000, AHORA, 3), false);
  assert.strictEqual(debeSaludar(AHORA - 5 * HORA, AHORA, 3), false);
});

test('justo en las seis horas ya se saluda', () => {
  assert.strictEqual(debeSaludar(AHORA - 6 * HORA, AHORA, 1), true);
});

test('🔴 sin nada en el carrito no hay nada que recordar', () => {
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, AHORA, 0), false);
});

test('la primera visita de su vida no se saluda', () => {
  // Sin marca previa no se sabe cuando estuvo: saludarla seria inventarse una visita.
  assert.strictEqual(debeSaludar(null, AHORA, 2), false);
  assert.strictEqual(debeSaludar('', AHORA, 2), false);
  assert.strictEqual(debeSaludar('ayer', AHORA, 2), false);
  assert.strictEqual(debeSaludar(0, AHORA, 2), false);
});

test('un reloj del telefono cambiado no rompe nada', () => {
  assert.strictEqual(debeSaludar(AHORA + 10 * HORA, AHORA, 2), false, 'marca del futuro');
  assert.strictEqual(debeSaludar(AHORA - 30 * HORA, NaN, 2), false);
});

test('el texto cuenta bien el singular y el plural', () => {
  assert.strictEqual(texto(1), 'Tienes 1 producto esperando en tu pedido');
  assert.strictEqual(texto(3), 'Tienes 3 productos esperando en tu pedido');
  assert.strictEqual(texto(0), '', 'sin unidades no hay frase');
  assert.strictEqual(texto('x'), '');
});

test('🔴 el cableado existe en app.js y en las DOS paginas', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('window.Regreso.debeSaludar('), 'app.js no llama al modulo');
  assert.ok(app.includes('saludarSiVuelve('), 'falta la funcion que lo pinta');
  // 🔴 El boton abre el carrito, que es una CAPA del historial: abrirCarrito() y nunca
  // mostrarCarrito(), o el «atras» del telefono dejaria de cerrarlo (ver historial.js).
  assert.ok(!/aviso-regreso-ver[\s\S]{0,260}mostrarCarrito\(/.test(app),
    'el boton del aviso tiene que usar abrirCarrito(), no mostrarCarrito()');
  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="aviso-regreso"'), pagina + ': falta el aviso');
    assert.ok(html.includes('id="aviso-regreso-ver"'), pagina + ': falta el boton de ver el pedido');
    assert.ok(html.includes('id="aviso-regreso-cerrar"'), pagina + ': el aviso tiene que poderse cerrar');
  }
});
```

Y en `test/colores.test.js`, **añade al final** del archivo:

```js
test('el boton de marca se lee en los dos temas', () => {
  // --brand/--brand-ink pintan .btn-primario, el contador del carrito, los chips de
  // filtro y, desde el 2026-10-27, el boton «Ver mi pedido» del aviso de regreso.
  exige('boton de marca claro', claro('brand-ink'), claro('brand'), 4.5);
  exige('boton de marca oscuro', oscuro('brand-ink'), oscuro('brand'), 4.5);
});
```

- [ ] **Step 2: Correr los tests y verlos fallar**

Run: `node --test test/regreso.test.js`
Expected: FAIL — `regreso.js` no existe.

- [ ] **Step 3: Crear el módulo**

Crea `regreso.js`:

```js
// regreso.js — ¿hay que saludar a quien vuelve con el carrito puesto?
//
// Modulo PURO (ni DOM ni reloj propio: el ahora se le pasa). Se prueba con node:vm
// desde test/regreso.test.js.
//
// Por que existe: el carrito ya sobrevive en localStorage, pero quien se fue y vuelve
// otro dia se lo encuentra igual y la tienda no le dice nada. Es el «carrito abandonado»
// del comercio electronico, hecho sin servidores ni correos: todo esta ya en el
// navegador de la clienta.
//
// 🔴 Seis horas. Una recarga, un cambio de pestaña o un paseo por el catalogo y vuelta
// NO son volver — un aviso que reaparece cada vez que se toca «atras» es exactamente lo
// que hace odiosa esta funcion. Volver por la noche o al dia siguiente, si.
(function () {
  'use strict';

  const VENTANA_MS = 6 * 60 * 60 * 1000;

  // (marca, ahora, unidades) -> boolean. Sin marca previa no se saluda: no se sabe
  // cuando estuvo, e inventarselo seria saludar a quien entra por primera vez.
  function debeSaludar(marca, ahora, unidades) {
    const u = Number(unidades);
    if (!Number.isFinite(u) || u <= 0) return false;
    const t = Number(marca);
    if (!Number.isFinite(t) || t <= 0) return false;
    const pasado = Number(ahora) - t;
    if (!Number.isFinite(pasado)) return false;
    return pasado >= VENTANA_MS;
  }

  function texto(unidades) {
    const u = Number(unidades);
    if (!Number.isFinite(u) || u <= 0) return '';
    return 'Tienes ' + u + (u === 1 ? ' producto' : ' productos') + ' esperando en tu pedido';
  }

  window.Regreso = { VENTANA_MS, debeSaludar, texto };
})();
```

- [ ] **Step 4: Cablearlo**

En **`app.js`**, justo después del bloque `const CLAVE_ENVIADO = …` (línea 19):

```js
// Marca de «la ultima vez que estuvo aqui» (regreso.js). Por negocio, por lo mismo que
// el carrito y la marca de pedido enviado.
const CLAVE_VISITA = NEGOCIO === (window.Negocio ? window.Negocio.CASA : '3b')
  ? 'ultimaVisita'
  : 'ultimaVisita:' + NEGOCIO;
```

Justo **antes** de `function preguntarSiEnvio() {` (~línea 1608):

```js
// Saludar a quien vuelve horas despues con el carrito puesto.
//
// 🔴 La marca se escribe SIEMPRE al cargar, se salude o no: es «la ultima vez que estuvo
// aqui». Si solo se escribiera al saludar, la segunda visita del mismo dia volveria a
// saludar.
//
// 🔴 Con la tienda cerrada no se saluda: el pedido no se puede mandar, asi que empujar
// hacia el carrito solo serviria para frustrar.
function saludarSiVuelve() {
  let marca = null;
  try { marca = localStorage.getItem(CLAVE_VISITA); } catch (e) { marca = null; }
  try { localStorage.setItem(CLAVE_VISITA, String(Date.now())); } catch (e) { /* incognito: no se saluda */ }
  const caja = document.getElementById('aviso-regreso');
  if (!caja || cerrada()) return;
  const unidades = unidadesEnCarrito();
  if (!window.Regreso.debeSaludar(marca, Date.now(), unidades)) return;
  document.getElementById('aviso-regreso-texto').textContent = window.Regreso.texto(unidades);
  caja.hidden = false;
}
```

En `cargarCatalogo()`, **tras** la línea `pintarCierre();` (~línea 2112):

```js
  saludarSiVuelve();   // despues de ajustarCarritoATopes: las unidades ya son las reales
```

En `iniciar()`, junto al manejador de `aviso-ajuste-cerrar` (~línea 2275), añade:

```js
  document.getElementById('aviso-regreso-cerrar').addEventListener('click', () => {
    document.getElementById('aviso-regreso').hidden = true;
  });
  // 🔴 abrirCarrito(), NO mostrarCarrito(): el carrito es una capa del historial y
  // enseñarlo a mano dejaria una entrada sin nada que cerrar (ver historial.js).
  document.getElementById('aviso-regreso-ver').addEventListener('click', () => {
    document.getElementById('aviso-regreso').hidden = true;
    abrirCarrito();
  });
```

En **`index.html`**, tras el `</div>` que cierra `#aviso-ajuste` (línea 84):

```html
  <!-- «Tienes N productos esperando» (2026-10-27): solo para quien vuelve mas de seis
       horas despues con el carrito puesto. Mismo sitio y mismo patron que #aviso-ajuste
       (dentro de .barra-fija para que medirHeader() lo cuente en --header-h) y SI se
       puede cerrar: es un recordatorio, no el estado del negocio. Lo pinta
       saludarSiVuelve() en app.js. -->
  <div id="aviso-regreso" class="aviso-ajuste aviso-regreso" role="status" hidden>
    <p id="aviso-regreso-texto" class="aviso-ajuste-texto"></p>
    <button id="aviso-regreso-ver" class="aviso-regreso-btn" type="button">Ver mi pedido</button>
    <button id="aviso-regreso-cerrar" class="aviso-ajuste-x" type="button" aria-label="Cerrar aviso">✕</button>
  </div>
```

El mismo bloque en **`electripower.html`**, tras el `</div>` de su `#aviso-ajuste`
(línea 87).

En **`estilos.css`**, tras la regla `.aviso-ajuste-x{…}` (~línea 749):

```css
/* «Ver mi pedido» del aviso de regreso. Boton de marca (el par --brand/--brand-ink esta
   medido en test/colores.test.js), 36px de alto para que quepa en la banda sin
   empujarla, y flex-shrink:0 para que el texto largo no lo aplaste a 375px. */
.aviso-regreso-btn{
  flex-shrink:0;align-self:center;min-height:36px;padding:0 var(--e2);
  border-radius:var(--radio-pill);border:1px solid var(--brand);
  background:var(--brand);color:var(--brand-ink);
  font-size:var(--t-xs);font-weight:700;cursor:pointer;
}
```

- [ ] **Step 5: Correr la batería completa**

Run: `node --test`
Expected: PASS — 218 tests (208 + 9 de regreso + 1 de colores), 0 fallos.

- [ ] **Step 6: Commit**

```bash
git add regreso.js test/regreso.test.js test/colores.test.js app.js index.html electripower.html estilos.css
git commit -m "feat(tienda): saludar a quien vuelve con el carrito puesto

El carrito ya sobrevivia en localStorage, pero quien se iba y volvia otro dia se
lo encontraba igual sin que la tienda le dijera nada. Ventana de seis horas: una
recarga o un paseo por el catalogo no disparan el aviso; volver al dia siguiente,
si. La marca se escribe en cada carga, se salude o no.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: La tira de relacionados, siempre en CUP

**Por qué.** Comprobado en la ficha: la tira «Más de esta categoría» enseña `$5`, `$7`,
`$12` **sin un solo CUP** cuando el producto tiene `moneda: 'usd'`. La clienta cubana
piensa en CUP, y la tira existe precisamente para que compre **otra cosa más**: obligarla
a multiplicar por 845 de cabeza es poner un peaje justo en el upsell.

**Decisión: solo CUP, no «$5 · 4,225 CUP».** La tarjeta de la tira mide ~100 px: dos
cifras se parten o se recortan. Y es lo mismo que ya hace la tira de «completa tu
mensajería», así que las dos tiras se leen igual.

**Files:**
- Modify: `relacionados.js`
- Modify: `app.js` (`pintarRelacionados`, ~línea 723)
- Test: `test/relacionados.test.js`

- [ ] **Step 1: Escribir el test que falla**

Añade al final de `test/relacionados.test.js`:

```js
test('🔴 la tira de relacionados SIEMPRE dice el precio en CUP', () => {
  // Antes, un producto con moneda 'usd' enseñaba «$5» y ni un CUP. La clienta cubana
  // piensa en CUP y esta tira existe para que compre otra cosa mas: obligarla a
  // multiplicar de cabeza es poner un peaje justo en el upsell.
  assert.strictEqual(precioTexto({ precioCUP: 4225, precioUSD: 5, moneda: 'usd' }), '4,225 CUP');
  assert.strictEqual(precioTexto({ precioCUP: 395, moneda: 'cup' }), '395 CUP');
});

test('sin precio en CUP la tira no inventa una cifra', () => {
  assert.strictEqual(precioTexto({ precioUSD: 5 }), '');
  assert.strictEqual(precioTexto({ precioCUP: 0 }), '');
  assert.strictEqual(precioTexto(null), '');
  assert.strictEqual(precioTexto(undefined), '');
});

test('🔴 app.js pinta la tira con el modulo, no con su propia formula', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = app.match(/function pintarRelacionados\(p\)\{?[\s\S]*?\n\}/);
  assert.ok(fn, 'no se encuentra pintarRelacionados');
  assert.ok(fn[0].includes('Relacionados.precioTexto('), 'tiene que pedirselo al modulo');
  assert.ok(!/moneda === 'usd'/.test(fn[0]), 'ya no decide la moneda a mano');
});
```

🔴 Antes de escribirlo, **mira la cabecera de `test/relacionados.test.js`**: si no
desestructura ya el módulo, añade `precioTexto` a la lista que saca de
`sandbox.window.Relacionados`, y si no tiene `fs`/`path` requeridos, añádelos como en
`test/tasa.test.js`.

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `node --test test/relacionados.test.js`
Expected: FAIL — `precioTexto is not a function`.

- [ ] **Step 3: Implementar**

En `relacionados.js`, antes de la línea que exporta `window.Relacionados = …`:

```js
  // El precio de la tira, SIEMPRE en CUP. La parrilla enseña la moneda del producto
  // («$5 · 4.225 CUP»), pero aqui la tarjeta mide ~100px y la tira existe para que la
  // clienta compre OTRA cosa: dos cifras se parten, y enseñar solo «$5» —que es lo que
  // pasaba hasta el 2026-10-27 con los productos en moneda usd— la obliga a multiplicar
  // por la tasa de cabeza justo en el upsell.
  function precioTexto(p) {
    const n = Number(p && p.precioCUP);
    if (!Number.isFinite(n) || n <= 0) return '';
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' CUP';
  }
```

Y añade `precioTexto` a la exportación de `window.Relacionados`.

En `app.js`, dentro de `pintarRelacionados`, **sustituye** la línea del precio:

```js
    `<span class="rel-precio">${window.Relacionados.precioTexto(x)}</span>` +
```

- [ ] **Step 4: Correr la batería completa**

Run: `node --test`
Expected: PASS — 221 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add relacionados.js app.js test/relacionados.test.js
git commit -m "fix(tienda): la tira de relacionados enseña el precio en CUP

Un producto con moneda usd enseñaba «\$5» y ni un CUP. La clienta piensa en CUP y
esa tira existe para que compre otra cosa mas: multiplicar por 845 de cabeza es
un peaje justo en el upsell. Solo CUP, como la tira de «completa tu mensajeria»:
la tarjeta mide ~100px y dos cifras se parten.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Que las dos páginas carguen lo MISMO (y subir la caché)

**Por qué — esto no es limpieza, es una mina.** Comprobado en producción el 2026-10-27:
`https://www.3bqba.com/electripower` **no carga `espera.js`, `preguntar.js`,
`completar.js` ni `listo.js`**, aunque comparte `app.js` con la tienda de la casa. Hoy no
se nota porque el catálogo de Electripower tiene **0 productos publicados**
(`CAT.items.length === 0`, medido en el sitio vivo), así que la parrilla no llega a
dibujar ni una tarjeta. **El día que Ruth publique el primer producto de Electripower, la
página se queda en blanco**: `avisoQuedanHtml()` (`app.js:489`) llama a `Espera.enEspera`
**sin guarda**, y `Espera` no existe allí → `ReferenceError` en mitad de `renderGrid`.

Este plan mete dos módulos nuevos que `app.js` usa **en cada carga** (`regreso.js`) y en
cada ficha (`umbral.js`): si solo se cablean en `index.html`, Electripower se rompe
**ya**, sin esperar a ningún producto. Así que el cableado hay que hacerlo igualmente —
y de paso se cierra el agujero que ya estaba abierto.

**La barrera de verdad es el test**, no los seis `<script>`: una lista única de lo que
`app.js` necesita, comprobada contra las dos páginas **y** contra `ARMAZON`. Es lo que
impide que la deriva vuelva a pasar.

**Files:**
- Create: `test/paginas.test.js`
- Modify: `electripower.html` (6 `<script>`)
- Modify: `index.html` (2 `<script>`)
- Modify: `sw.js` (`ARMAZON` + `CACHE`)

- [ ] **Step 1: Escribir el test que falla**

Crea `test/paginas.test.js`:

```js
// test/paginas.test.js — las DOS paginas cargan todo lo que app.js necesita.
//
// Por que existe: el 2026-10-27 se comprobo en produccion que electripower.html NO
// cargaba espera.js, preguntar.js, completar.js ni listo.js, aunque comparte app.js con
// index.html. No se notaba porque el catalogo de Electripower tiene 0 productos: el dia
// que se publique el primero, avisoQuedanHtml() llama a Espera.enEspera SIN guarda y la
// pagina se queda en blanco con un ReferenceError.
//
// Un comentario no falla cuando alguien añade un modulo y se olvida de la segunda
// pagina. Esto si.
//
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Todo lo que app.js (o encargos.js) da por cargado. Si añades un modulo nuevo, va aqui
// Y en las dos paginas Y en ARMAZON — los tres sitios, o no sirve de nada.
const MODULOS = [
  'mundos.js', 'negocio.js', 'orden.js', 'preciosGestor.js', 'relacionados.js',
  'galeria.js', 'historial.js', 'faltante.js', 'direcciones.js', 'traspedido.js',
  'espera.js', 'preguntar.js', 'completar.js', 'listo.js', 'tasa.js', 'umbral.js',
  'regreso.js', 'tarjeta.js', 'app.js', 'encargos.js'
];

const PAGINAS = ['index.html', 'electripower.html'];

test('🔴 las dos paginas cargan todos los modulos', () => {
  for (const pagina of PAGINAS) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    for (const m of MODULOS) {
      assert.ok(html.includes('src="' + m + '"'), pagina + ' no carga ' + m);
    }
  }
});

test('🔴 todos los modulos estan en ARMAZON: sin conexion tambien', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  for (const m of MODULOS) {
    assert.ok(sw.includes("'/" + m + "'"), m + ' no esta en ARMAZON del service worker');
  }
});

test('🔴 todos los modulos de la lista existen de verdad', () => {
  for (const m of MODULOS) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', m)), 'no existe el archivo ' + m);
  }
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `node --test test/paginas.test.js`
Expected: FAIL — `electripower.html no carga espera.js` (y varios más).

- [ ] **Step 3: Cablear**

En **`index.html`**, tras `<script src="tasa.js"></script>` (línea 508):

```html
<script src="umbral.js"></script>
<script src="regreso.js"></script>
```

En **`electripower.html`**, tras `<script src="traspedido.js"></script>` (línea 490):

```html
<script src="espera.js"></script>
<script src="preguntar.js"></script>
<script src="completar.js"></script>
<script src="listo.js"></script>
```

y tras `<script src="tasa.js"></script>` (línea 491 antes de este cambio):

```html
<script src="umbral.js"></script>
<script src="regreso.js"></script>
```

En **`sw.js`**, dentro de `ARMAZON`, tras `'/tasa.js',`:

```js
  '/umbral.js',
  '/regreso.js',
```

Y 🔴 **sube la caché** (regla permanente del repo: cualquier cambio en `app.js`,
`estilos.css`, `index.html` o un archivo de `ARMAZON` la obliga):

```js
const CACHE = 'tienda-3b-v24';
```

- [ ] **Step 4: Correr la batería completa**

Run: `node --test`
Expected: PASS — 224 tests, 0 fallos.

- [ ] **Step 5: Comprobar que no hay nada roto de sintaxis**

Run: `node --check app.js; node --check sw.js; node --check umbral.js; node --check regreso.js; node --check tasa.js; node --check relacionados.js`
Expected: sin salida (los seis correctos).

- [ ] **Step 6: Commit**

```bash
git add index.html electripower.html sw.js test/paginas.test.js
git commit -m "fix(tienda): electripower.html carga los mismos modulos que index.html

Comprobado en produccion: /electripower no cargaba espera.js, preguntar.js,
completar.js ni listo.js, aunque comparte app.js. No se notaba porque su catalogo
tiene 0 productos; con el primero publicado, avisoQuedanHtml() llama a
Espera.enEspera sin guarda y la pagina se queda en blanco. El test nuevo compara
una lista unica contra las dos paginas y contra ARMAZON. CACHE -> v24.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificación final (la hace el piloto, no el ejecutor)

1. `node --test` desde la raíz → **224/224, exit 0**, observado.
2. Navegador a 375 px (`npx --yes serve -l 4173 .` + Chrome del sistema con
   `puppeteer-core` **desde el scratchpad**, nunca instalado en el repo):
   - La línea del cambio se ve **sin bajar** y dice `💵 Cambio que usamos: 1 USD = 845 CUP`.
   - El chip de abajo dice solo `Precios en CUP y USD` (el número no se repite).
   - Ficha de un producto con el carrito vacío → «Añádelo y te faltarán N CUP…» con la
     cifra de **después** de añadirlo; se pulsa «Añadir» y la frase cambia sola.
   - Ficha de un producto que cruza el umbral → «🎉 Añádelo y tu pedido lleva…».
   - Tira de relacionados de un producto en USD → precios **en CUP**.
   - Aviso de regreso: con `localStorage.setItem('ultimaVisita', String(Date.now() - 7*3600*1000))`
     y algo en el carrito, recargar → sale la banda; «Ver mi pedido» abre el carrito y el
     «atrás» lo cierra **sin salir de la tienda**; la ✕ lo quita.
   - Modo oscuro: las tres piezas nuevas legibles.
3. **Limpiar el navegador de prueba** (`carrito`, `pedidoEnviado`, `direcciones`,
   `ultimaVisita`) y 🔴 **no pulsar «Pedir por WhatsApp»** en producción, o le llega un
   pedido falso a Ruth.

## Lo que este plan NO hace, y por qué

- **Prueba social («196 pedidos entregados este mes»).** Es el gancho más fuerte que
  queda, pero el número lo tiene que **calcular y publicar Stock+** de los pedidos
  reales; escrito a mano se congela y miente. Toca el otro repo.
- **Promesa de entrega («en 24–48 h»).** Es un dato del negocio: lo decide Ruth, no el
  código.
- **Escalonar o subir el umbral de 2.000 CUP.** Decisión de Ruth, con riesgo real sobre
  los 85 pedidos pequeños al mes.
- **Los divs `ficha-listo` / `ficha-preguntar` en `electripower.html`.** Sus pintores ya
  salen limpios si el hueco no existe (`if (!caja) return;`), así que no hay nada roto;
  llevarles esas dos funciones es una tarea aparte, con su decisión.
