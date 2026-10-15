# Precio por gestor — Plan 2 de 2: la tienda (`tienda-3b`)

> **Para ejecutores:** SUB-SKILL OBLIGATORIO: `superpowers:subagent-driven-development` (recomendado)
> o `superpowers:executing-plans`. Los pasos usan casillas (`- [ ]`) para ir marcando.

**Objetivo:** que el enlace de un gestor con recargo enseñe SUS precios, que la página se identifique
como suya, y que el pedido salga a SU WhatsApp para que él lo reenvíe al número de 3B.

**Arquitectura:** la tienda **no calcula** ningún precio. Stock+ publica `precios-gestores.json` (una
tabla `código de gestor → código de producto → precio`, ya calculada en el servidor) y la tienda solo
sustituye los precios de los productos cuando el visitante entra por el enlace de un gestor que está
en esa tabla. Un módulo puro nuevo (`preciosGestor.js`) hace la sustitución en un único punto, así
que las tarjetas, la ficha, el carrito, la foto para compartir y el texto de WhatsApp siguen leyendo
los mismos campos y no se tocan.

**Tech Stack:** HTML/CSS/JS sin framework, módulos del navegador en IIFE + `window.X`, pruebas con
`node --test` desde la raíz usando `node:vm`, PWA con service worker, funciones de Vercel en `api/`.

**Diseño:** `C:\inventario\inventario-stockmas\docs\superpowers\specs\2026-10-15-precio-por-gestor-design.md`

🔴 **ESTE PLAN VA DESPUÉS DEL PLAN 1.** Antes de empezar, comprueba que Stock+ ya publica el archivo:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.3bqba.com/precios-gestores.json
```

Si devuelve **404**, el Plan 1 no está desplegado (Ruth no ha reiniciado y publicado). **Puedes
ejecutar este plan igual** —todo degrada a los precios de la casa cuando el archivo no está, y hay un
test que lo fija— pero **no se puede verificar de verdad** hasta que el archivo exista. Déjalo escrito
en el informe.

---

## Antes de empezar (obligatorio)

- Repo: `C:\inventario\tienda-3b`. `git status` limpio; si hay cambios de otra sesión, **para y
  pregunta**.
- Pruebas: **`node --test` desde la raíz del repo**. 🔴 **NO `node --test test/`**: con Node 24 eso
  falla. Mide la baseline antes de tocar nada (la última observada es **71/71**).
- 🔴 **`catalogo.json` lo publica Stock+.** Se puede tocar **temporalmente** para probar, pero se
  restaura con `git checkout -- catalogo.json` y **jamás se commitea editado**.
- 🔴 **Regla permanente de la PWA:** cualquier cambio en `app.js`, `estilos.css`, `index.html` o
  cualquier archivo de `ARMAZON` **obliga a subir `CACHE` en `sw.js`**. Hoy va en `tienda-3b-v11`.
- **No hagas `git push`** salvo que el plan lo diga explícitamente (Task 7).

## Las reglas rojas de este plan

1. **La tienda no calcula precios.** Solo sustituye los que vienen ya calculados. Si te ves
   multiplicando por un porcentaje en el navegador, paras: ese atajo es el bug del 2026-08-16 (la web
   cobrando 449 por algo que Stock+ cobra 450) multiplicado por 240 productos.
2. **Si el archivo no está, o falla, o el gestor no aparece en él: precios de la casa.** Nunca un
   precio a medias, nunca un precio inventado.
3. **No metas un `await` antes del `window.open`** de `enviarPorWhatsApp`: el bloqueador de ventanas
   emergentes se come el enlace de WhatsApp (iOS sobre todo).
4. **La banda solo sale con gestor con recargo.** Un gestor sin recargo tiene que ver la tienda
   exactamente igual que hoy.

---

## Estructura de archivos

| Archivo | Qué hace | Task |
|---|---|---|
| `preciosGestor.js` | **Crear**: módulo puro. `aplicar(items, tabla)` sustituye los 4 campos de precio; `nombreCorto(nombre)` da la primera palabra | 1 |
| `test/preciosGestor.test.js` | **Crear**: sus pruebas con `node:vm` | 1 |
| `app.js` | **Modificar**: baja la tabla y la aplica (2), pinta la banda (3), manda el pedido al móvil del gestor (4) | 2, 3, 4 |
| `index.html` | **Modificar**: el hueco de la banda y el `<script src>` nuevo | 1, 3 |
| `estilos.css` | **Modificar**: el estilo de la banda | 3 |
| `api/producto.js` | **Modificar**: aplica la tabla antes de componer las `og:` | 5 |
| `sw.js` | **Modificar**: `preciosGestor.js` a `ARMAZON`, el archivo nuevo por red primero, y **subir `CACHE`** | 6 |

---

### Task 1: el módulo que sustituye los precios

**Archivos:**
- Crear: `preciosGestor.js`
- Crear: `test/preciosGestor.test.js`
- Modificar: `index.html` (un `<script src>` más)

- [ ] **Paso 1: escribe el test que falla**

Crea `test/preciosGestor.test.js` (mismo molde que `test/orden.test.js`):

```js
// test/preciosGestor.test.js — pruebas de preciosGestor.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'preciosGestor.js'), 'utf8'), sandbox);
const { aplicar, nombreCorto } = sandbox.window.PreciosGestor;

const ITEMS = [
  { id: 'a', codigo: '5HP4', name: 'Abrigo', precioUSD: 5, precioCUP: 4000, moneda: 'usd' },
  { id: 'b', codigo: '9K2V', name: 'Cable', precioUSD: 2.5, precioCUP: 2000, moneda: 'cup', enOferta: true, precioNormalUSD: 3, precioNormalCUP: 2400 },
];
const TABLA = {
  '5HP4': { u: 5.5, c: 4400 },
  '9K2V': { u: 2.75, c: 2200, nu: 3.3, nc: 2640 },
};

test('sustituye los precios por los de la tabla', () => {
  const r = aplicar(ITEMS, TABLA);
  assert.strictEqual(r[0].precioUSD, 5.5);
  assert.strictEqual(r[0].precioCUP, 4400);
  assert.strictEqual(r[1].precioNormalUSD, 3.3);
  assert.strictEqual(r[1].precioNormalCUP, 2640);
});

test('no toca nada mas del producto', () => {
  const r = aplicar(ITEMS, TABLA);
  assert.strictEqual(r[0].name, 'Abrigo');
  assert.strictEqual(r[0].moneda, 'usd');
  assert.strictEqual(r[1].enOferta, true);
});

test('no muta la lista de entrada', () => {
  aplicar(ITEMS, TABLA);
  assert.strictEqual(ITEMS[0].precioCUP, 4000);
});

test('sin tabla, o con tabla vacia, devuelve los mismos precios', () => {
  // Las listas nacen dentro del sandbox: se comparan con JSON.stringify, nunca con
  // deepStrictEqual (el Array de aqui no es el Array de alla).
  assert.strictEqual(JSON.stringify(aplicar(ITEMS, null)), JSON.stringify(ITEMS));
  assert.strictEqual(JSON.stringify(aplicar(ITEMS, {})), JSON.stringify(ITEMS));
});

test('un producto que no esta en la tabla se queda con el precio de la casa', () => {
  const r = aplicar(ITEMS, { '5HP4': { u: 5.5, c: 4400 } });
  assert.strictEqual(r[1].precioCUP, 2000);
});

test('una entrada sin precio valido se ignora: nunca un precio a medias', () => {
  const r = aplicar(ITEMS, { '5HP4': { u: 0, c: 0 }, '9K2V': { c: 2200 } });
  assert.strictEqual(r[0].precioCUP, 4000);   // c en 0 no vale
  assert.strictEqual(r[1].precioCUP, 2000);   // le falta u: no se aplica a medias
});

test('nombreCorto deja solo la primera palabra', () => {
  assert.strictEqual(nombreCorto('Elaine Ocampo Pino'), 'Elaine');
  assert.strictEqual(nombreCorto('Yessy'), 'Yessy');
  assert.strictEqual(nombreCorto('  Boris  Luís Rodríguez '), 'Boris');
  assert.strictEqual(nombreCorto(''), '');
  assert.strictEqual(nombreCorto(null), '');
});
```

- [ ] **Paso 2: córrelo y comprueba que falla**

```bash
node --test
```

Esperado: FAIL, no existe `preciosGestor.js`.

- [ ] **Paso 3: escribe el módulo**

Crea `preciosGestor.js`:

```js
// preciosGestor.js — los precios de la pagina de un gestor.
//
// 🔴 ESTE ARCHIVO NO CALCULA NINGUN PRECIO. Los precios llegan ya calculados en
// precios-gestores.json, que publica Stock+ con la MISMA funcion que genera el
// catalogo (lib/preciosGestores.js). El navegador no calcula reglas de negocio:
// misma razon por la que el precio del catalogo ya trae el recargo aplicado y por la
// que el texto de mensajeria viaja compuesto. Multiplicar aqui por un porcentaje
// reabre el bug del 2026-08-16 (la web cobrando 449 por algo que Stock+ cobra 450)
// en los 240 productos a la vez.
//
// Modulo puro, patron IIFE + window.X (igual que orden.js, galeria.js y tarjeta.js).
(function () {
  'use strict';

  // 'Elaine Ocampo Pino' -> 'Elaine'. La banda de la tienda dice solo el nombre
  // (decision de Ruth, 2026-10-15): el campo `nombre` de la ficha guarda el completo.
  function nombreCorto(nombre) {
    return String(nombre == null ? '' : nombre).trim().split(/\s+/)[0] || '';
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // (items, tabla) -> copia de items con los precios del gestor. Lo que no este en la
  // tabla, o venga incompleto, se queda con el precio de la casa: nunca un precio a
  // medias. No muta la entrada.
  function aplicar(items, tabla) {
    const lista = Array.isArray(items) ? items : [];
    const t = tabla && typeof tabla === 'object' ? tabla : null;
    if (!t) return lista.slice();
    return lista.map(function (p) {
      const e = t[p && p.codigo];
      if (!e) return p;
      const u = num(e.u);
      const c = num(e.c);
      if (!u || !c) return p;
      const salida = Object.assign({}, p, { precioUSD: u, precioCUP: c });
      // El tachado de una oferta viaja aparte: si no viene entero, se deja el de la
      // casa antes que ensenar «antes 2.400, ahora 2.200» con cifras de dos mundos.
      const nu = num(e.nu);
      const nc = num(e.nc);
      if (nu && nc) { salida.precioNormalUSD = nu; salida.precioNormalCUP = nc; }
      return salida;
    });
  }

  window.PreciosGestor = { aplicar: aplicar, nombreCorto: nombreCorto };
}());
```

- [ ] **Paso 4: córrelo y comprueba que pasa**

```bash
node --test
```

Esperado: baseline (71) + 7 = **78**, cero fallos.

- [ ] **Paso 5: cárgalo en la página**

En `index.html`, busca el `<script src="orden.js"></script>` (o la línea donde se cargan los módulos)
y añade al lado:

```html
<script src="preciosGestor.js"></script>
```

🔴 Tiene que ir **antes** de `app.js`, que es quien lo usa.

- [ ] **Paso 6: commit**

```bash
git add preciosGestor.js test/preciosGestor.test.js index.html
git commit -m "feat: modulo de precios por gestor"
```

---

### Task 2: bajar la tabla y aplicarla

**Archivos:**
- Modificar: `app.js` (`cargarCatalogo`)

- [ ] **Paso 1: añade la descarga**

En `cargarCatalogo`, hoy está esto:

```js
  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
```

Déjalo así:

```js
  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
  // La pagina de un gestor con recargo: sus precios los publica Stock+ en otro archivo
  // y la tienda SOLO los sustituye (ver preciosGestor.js). Se baja unicamente si hay
  // gestor; si falla, o el gestor no esta en la tabla, se queda el precio de la casa.
  gestorRecargo = null;
  if (v) {
    try {
      const rp = await fetch('precios-gestores.json?v=' + Date.now());
      if (rp.ok) {
        const tabla = await rp.json();
        const suya = tabla && tabla[String(v.code).toUpperCase()];
        if (suya && Object.keys(suya).length) {
          CAT.items = window.PreciosGestor.aplicar(CAT.items || [], suya);
          gestorRecargo = v;
        }
      }
    } catch (err) { /* sin red o archivo ausente: precios de la casa */ }
  }
```

- [ ] **Paso 2: declara la variable**

Arriba del archivo, junto a `let CAT = null;`, añade:

```js
let gestorRecargo = null;   // el gestor cuyos precios se estan enseñando, si los hay
```

- [ ] **Paso 3: comprueba que no rompiste nada**

```bash
node --check app.js
node --test
```

Esperado: `node --check` sin salida, y los 78 tests siguen verdes (`app.js` no se carga en las
pruebas: llama a `iniciar()` al final y toca `document`).

- [ ] **Paso 4: commit**

```bash
git add app.js
git commit -m "feat: la tienda aplica los precios del gestor cuando los hay"
```

---

### Task 3: la banda que dice de quién es la página

**Archivos:**
- Modificar: `index.html` (el hueco)
- Modificar: `estilos.css` (el estilo)
- Modificar: `app.js` (pintarla)

- [ ] **Paso 1: el hueco en el HTML**

En `index.html`, justo **después** de la etiqueta de apertura del `<main>` (o inmediatamente antes de
la portada, lo primero que ve el visitante al abrir), inserta:

```html
<div id="banda-gestor" class="banda-gestor" hidden></div>
```

- [ ] **Paso 2: el estilo**

Al final de `estilos.css`:

```css
/* Banda de la pagina de un gestor con recargo (2026-10-15). Solo sale cuando el
   visitante entra por su enlace Y ese gestor tiene precios propios: sin eso, la tienda
   se ve exactamente como siempre. */
.banda-gestor {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface2, var(--surface));
  border: 1px solid var(--border);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text);
}
.banda-gestor b { color: var(--text); }
```

Si `--surface2` no existe en el archivo, usa `var(--surface)` a secas: **comprueba** qué tokens hay
declarados en `:root` y en el bloque de modo oscuro antes de escribir uno nuevo. Un token inexistente
deja la banda sin fondo y no avisa de nada.

- [ ] **Paso 3: pintarla**

En `app.js`, junto a las otras funciones `pintar*` (por ejemplo al lado de `pintarGarantia`), añade:

```js
// La pagina de un gestor con recargo se identifica como SUYA: el precio que se ve es el
// que el puso y es el quien responde por el. Solo el nombre, sin apellidos (decision de
// Ruth, 2026-10-15). Si no hay gestor con recargo, la banda no existe para el visitante.
function pintarBandaGestor() {
  const el = document.getElementById('banda-gestor');
  if (!el) return;
  const corto = gestorRecargo ? window.PreciosGestor.nombreCorto(gestorRecargo.nombre) : '';
  if (!corto) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `🤝 Estás en la página de <b>${escapeHtml(corto)}</b> — sus precios y su atención. `
    + `Tu pedido le llega a ella directamente.`;
}
```

Y llámala dentro de `cargarCatalogo`, en la misma tanda de `pintarGarantia()`:

```js
  pintarBandaGestor();
```

- [ ] **Paso 4: la misma banda en la ficha del producto**

La ficha es donde se decide la compra, así que ahí también tiene que estar. Busca en `index.html` el
contenedor del modal de detalle y añade, justo antes del bloque de la acción de compra
(`id="modal-accion"`):

```html
<div id="banda-gestor-ficha" class="banda-gestor" hidden></div>
```

Y en `pintarBandaGestor`, después de pintar el primero, añade:

```js
  const ficha = document.getElementById('banda-gestor-ficha');
  if (ficha) { ficha.hidden = el.hidden; ficha.innerHTML = el.innerHTML; }
```

🔴 Dos `id` distintos a propósito: duplicar un `id` rompe `getElementById` en silencio (ya pasó en
esta tienda con el formulario del aside).

- [ ] **Paso 5: comprueba**

```bash
node --check app.js
node --test
```

- [ ] **Paso 6: commit**

```bash
git add index.html estilos.css app.js
git commit -m "feat: la pagina de un gestor con recargo se identifica como suya"
```

---

### Task 4: el pedido va al WhatsApp del gestor

**Archivos:**
- Modificar: `app.js` (`enviarPorWhatsApp` y `resolverVendedor`)

El `catalogo.json` trae el móvil del gestor en `vendedores[].telPublico`, y **solo** para los que
tienen recargo: lo publica el Plan 1 (Task 1, paso 6). 🔴 **Compruébalo antes de empezar**:

```bash
node -e "const c=require('./catalogo.json');console.log(JSON.stringify(c.vendedores.slice(0,3)))"
```

- Si ves `telPublico` en alguno: adelante.
- Si **ningún** gestor lo trae y tampoco tiene recargo en el panel, es lo esperado hoy: el campo
  aparece en cuanto Ruth le ponga el recargo a alguien y se publique. Sigue con la task y
  **verifícala en la Task 7 con el `catalogo.json` de prueba**.
- Si el `catalogo.json` del repo es más viejo que el Plan 1 (no tiene `telPublico` en ningún gestor y
  **sí** hay gestores con recargo en Stock+), falta que Ruth publique. Déjalo escrito en el informe.

🔴 Nunca inventes el campo desde aquí: el que decide qué sale al JSON público es Stock+.

- [ ] **Paso 1: manda el pedido a su número**

En `enviarPorWhatsApp`, busca la última línea:

```js
  window.open(`https://api.whatsapp.com/send?phone=${CAT.whatsapp}&text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');
```

y déjala así:

```js
  // Quien pone el precio, atiende: si el cliente entro por la pagina de un gestor con
  // recargo, el pedido va a SU WhatsApp y el lo reenvia al numero de la casa (el mensaje
  // lleva `Vendedor: CODIGO`, asi que Stock+ lo anota igual al reenviarlo). Sin gestor con
  // recargo, el numero de la casa, como siempre.
  // 🔴 NADA de `await` antes de este window.open: el bloqueador de emergentes se come el
  // enlace de WhatsApp (iOS sobre todo).
  const destino = (gestorRecargo && gestorRecargo.telPublico) || CAT.whatsapp;
  window.open(`https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');
```

- [ ] **Paso 2: comprueba que `resolverVendedor` devuelve el móvil**

`resolverVendedor` devuelve el objeto tal cual viene de `CAT.vendedores`, así que `telPublico` llega
solo. Confírmalo leyendo la función; no hace falta tocarla.

- [ ] **Paso 3: comprueba**

```bash
node --check app.js
node --test
```

- [ ] **Paso 4: commit**

```bash
git add app.js
git commit -m "feat: el pedido de la pagina de un gestor va a su WhatsApp"
```

---

### Task 5: la tarjeta que se comparte dice el precio del gestor

**Archivos:**
- Modificar: `api/producto.js`
- Test: `test/producto.test.js`

Sin esto, un enlace `/p/5HP4?ref=ELA` compartido por WhatsApp enseña en la tarjeta el precio de la
casa y, al abrirlo, la página dice otro. Es la contradicción más visible de todas.

- [ ] **Paso 1: escribe el test que falla**

Al final de `test/producto.test.js`. Reutiliza el `pedir(query)`, el `CAT` y el `UNO` que ese archivo
ya define arriba (no los redeclares):

```js
// El archivo de precios por gestor NO está en el repo (lo publica Stock+), así que estos
// tests lo escriben, prueban y lo borran. `cacheGest` del handler se cachea en el primer
// uso: por eso el test del archivo AUSENTE va antes de escribirlo.
test('sin precios-gestores.json la pagina sale normal, con el precio de la casa', () => {
  assert.strictEqual(fs.existsSync('precios-gestores.json'), false, 'borra ese archivo antes de correr los tests');
  const r = pedir({ c: UNO.codigo, ref: 'ELA' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.cuerpo.includes(String(UNO.precioCUP)) || r.cuerpo.includes(UNO.precioCUP.toLocaleString('en-US')));
});

test('con precios-gestores.json la tarjeta lleva el precio del gestor', () => {
  const cod = String(UNO.codigo).toUpperCase();
  const tabla = { ELA: {} };
  tabla.ELA[cod] = { u: Math.round(UNO.precioUSD * 1.5 * 100) / 100, c: UNO.precioCUP * 2 };
  fs.writeFileSync('precios-gestores.json', JSON.stringify(tabla));
  try {
    // El handler ya cacheó `null` en el test anterior: se recarga en un proceso limpio.
    delete require.cache[require.resolve('../api/producto')];
    delete require.cache[require.resolve('../api/_og')];
    const limpio = require('../api/producto');
    const res = {
      statusCode: 0, cabeceras: {}, cuerpo: '',
      setHeader(k, v) { this.cabeceras[String(k).toLowerCase()] = v; },
      end(b) { this.cuerpo = b == null ? '' : String(b); },
    };
    limpio({ query: { c: UNO.codigo, ref: 'ELA' }, url: '/api/producto' }, res);
    const esperado = (UNO.precioCUP * 2).toLocaleString('en-US');
    assert.ok(res.cuerpo.includes(esperado) || res.cuerpo.includes(String(UNO.precioCUP * 2)),
      'la tarjeta no lleva el precio del gestor');
  } finally {
    fs.unlinkSync('precios-gestores.json');
    delete require.cache[require.resolve('../api/producto')];
    delete require.cache[require.resolve('../api/_og')];
  }
});
```

🔴 El primer test es el que de verdad importa: hoy ese archivo **no existe en el repo** y la función
no puede caerse por eso. Si el formato del precio en el HTML no cuadra con ninguna de las dos formas
que prueba el `assert`, **córrelo y mira la salida real** (`console.log(res.cuerpo.slice(0, 600))`) y
ajusta la cadena a lo que imprime `precioTexto` de `api/_og.js`.

- [ ] **Paso 2: córrelo y comprueba que falla**

```bash
node --test
```

- [ ] **Paso 3: lee la tabla**

En `api/producto.js`, junto al `cacheCat` que ya existe, añade su gemelo:

```js
let cacheGest = undefined;   // undefined = sin intentar; null = no hay archivo
function preciosGestores() {
  if (cacheGest === undefined) {
    try { cacheGest = JSON.parse(leer('precios-gestores.json')); }
    catch (e) { cacheGest = null; }   // no existe o esta roto: precios de la casa
  }
  return cacheGest;
}
```

- [ ] **Paso 4: aplícala antes de componer las `og:`**

Busca este bloque:

```js
    const p = cod
      ? (catalogo().items || []).find((x) => String(x.codigo).toUpperCase() === cod)
      : null;
```

y déjalo así:

```js
    let p = cod
      ? (catalogo().items || []).find((x) => String(x.codigo).toUpperCase() === cod)
      : null;
    // El precio de la tarjeta compartida tiene que ser el MISMO que vera el visitante al
    // abrirla. La tabla la publica Stock+ ya calculada; aqui solo se sustituye.
    if (p && ref) {
      const tabla = preciosGestores();
      const suya = tabla && tabla[ref];
      const e = suya && suya[String(p.codigo).toUpperCase()];
      if (e && Number(e.u) > 0 && Number(e.c) > 0) {
        p = Object.assign({}, p, { precioUSD: Number(e.u), precioCUP: Number(e.c) });
        if (Number(e.nu) > 0 && Number(e.nc) > 0) {
          p.precioNormalUSD = Number(e.nu);
          p.precioNormalCUP = Number(e.nc);
        }
      }
    }
```

(`ref` ya está limpiado y en mayúsculas unas líneas más arriba; no lo vuelvas a sanear.)

- [ ] **Paso 5: córrelo**

```bash
node --test
```

Esperado: 78 + los tests nuevos, cero fallos.

- [ ] **Paso 6: commit**

```bash
git add api/producto.js test/producto.test.js
git commit -m "feat: la tarjeta compartida lleva el precio del gestor"
```

---

### Task 6: el service worker

**Archivos:**
- Modificar: `sw.js`

- [ ] **Paso 1: el módulo nuevo, a `ARMAZON`**

En la lista `ARMAZON`, añade `'/preciosGestor.js',` junto a `'/orden.js',`. Lo que falte en esa lista
no está disponible sin conexión.

- [ ] **Paso 2: el archivo de precios, por red primero**

Junto a `const CATALOGO = '/catalogo.json';` añade:

```js
// Los precios por gestor son precios: misma regla que el catalogo (red primero, clave
// fija porque app.js los pide con ?v=<fecha>).
const PRECIOS_GESTOR = '/precios-gestores.json';
```

Y en el `fetch`, cambia la condición de la rama del catálogo:

```js
  if (url.pathname === CATALOGO) {
```

por:

```js
  if (url.pathname === CATALOGO || url.pathname === PRECIOS_GESTOR) {
```

🔴 Dentro de esa rama hay **dos** usos de `CATALOGO` (el `c.put(...)` y el `caches.match(...)`): los
dos tienen que usar la clave del archivo que se está pidiendo, o los precios del gestor se guardarían
encima del catálogo. Déjala así:

```js
  if (url.pathname === CATALOGO || url.pathname === PRECIOS_GESTOR) {
    const clave = url.pathname;   // sin query: ver el comentario de CATALOGO
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(clave, copia));
      }
      return r;
    }).catch(() => caches.match(clave)));
    return;
  }
```

- [ ] **Paso 3: SUBE la caché** (obligatorio)

```js
const CACHE = 'tienda-3b-v12';
```

Sin esto, quien tenga la tienda instalada sigue con el `app.js` viejo y **parece que el cambio no
llegó**.

- [ ] **Paso 4: comprueba**

```bash
node --check sw.js
node --test
```

- [ ] **Paso 5: commit**

```bash
git add sw.js
git commit -m "feat(pwa): precios-gestores.json por red primero y cache v12"
```

---

### Task 7: verificación en un navegador de verdad

🔴 **Esto no se salta.** Esta tienda tiene cuatro arreglos en su historia que los tests dieron por
buenos y que solo se vieron abriendo la página.

- [ ] **Paso 1: prepara datos de prueba (y recuerda restaurarlos)**

```bash
node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync('catalogo.json','utf8'));
const g=c.vendedores[0];
g.telPublico='5350000000';
fs.writeFileSync('catalogo.json',JSON.stringify(c));
const t={};
t[g.code]={};
for(const it of c.items) t[g.code][it.codigo]={u:Math.round(it.precioUSD*1.1*100)/100,c:Math.round(it.precioCUP*1.1)};
fs.writeFileSync('precios-gestores.json',JSON.stringify(t));
console.log('gestor de prueba:',g.code,g.nombre);
console.log('primer producto:',c.items[0].codigo,c.items[0].precioCUP,'->',t[g.code][c.items[0].codigo].c);
"
```

- [ ] **Paso 2: sirve la tienda**

```bash
npx --yes serve -l 4173 .
```

🔴 Mira la página con el **Chrome del sistema por `puppeteer-core`, desde el scratchpad** (nunca
instalando nada en el repo): el panel de navegador integrado mide ~294 px y escala las capturas a un
tercio.

- [ ] **Paso 3: comprueba los nueve puntos, a 375 px de ancho**

1. `http://localhost:4173/` → precios **de la casa**, **sin** banda.
2. `http://localhost:4173/<CODIGO_GESTOR>` → precios **un 10 % más altos** y la banda arriba.
3. La banda dice **solo el nombre**, sin apellidos.
4. Abre una ficha → el precio de la ficha coincide con el de la tarjeta, y la banda también está ahí.
5. Añade al carrito → el total del carrito sale con los precios del gestor.
6. El botón de pedir apunta a `api.whatsapp.com/send?phone=5350000000` (léelo en el `href`/en la URL
   que abre, no hace falta mandar nada).
7. El texto del pedido lleva `Vendedor: <CODIGO>` y la línea `Ref: …`.
8. Entra por `/<CODIGO_GESTOR>` y luego navega a la portada: los precios **siguen** siendo los suyos
   (el código se guarda en `localStorage`).
9. Borra `precios-gestores.json` y recarga con `/<CODIGO_GESTOR>`: precios de la casa, **sin** banda,
   **cero errores en la consola**.

Apunta en el informe lo que **viste**, con las cifras concretas.

- [ ] **Paso 4: restaura los datos**

```bash
git checkout -- catalogo.json
rm -f precios-gestores.json
git status
```

Esperado: `catalogo.json` sin cambios y **ningún** `precios-gestores.json` sin trackear. 🔴 Ese
archivo lo publica Stock+: **no se commitea desde aquí nunca**.

- [ ] **Paso 5: deja el informe**

En `docs/informes/2026-10-15-precio-por-gestor-tienda.md`: qué quedó hecho, el número de tests
observado, los nueve puntos con lo que viste, y marcado con **⚠ NO VERIFICADO** lo que no se pudo
comprobar (al menos: un pedido real llegando al WhatsApp de un gestor, y el reenvío entrando en
Envíos; eso necesita que Ruth reinicie `server.js`, publique y pruebe con un gestor de verdad).

- [ ] **Paso 6: despliega** (y solo aquí se hace `push`)

```bash
git push
```

Después comprueba en producción:

```bash
curl -s https://www.3bqba.com/sw.js | findstr tienda-3b-v12
```

🔴 Y recuerda: **la primera carga tras el despliegue sigue corriendo el código viejo** (el service
worker viejo sirve su caché mientras el nuevo se instala). Hace falta **recargar otra vez**. Antes de
dudar de un cambio recién publicado, comprueba qué código corre de verdad con
`pintarBandaGestor.toString()` en la consola, no solo el `curl` del archivo.

## Lo que este plan NO hace

- **No toca Mía, el goteo al grupo, Facebook ni el catálogo en PDF**: siguen con el precio de la casa.
- **No añade ningún panel para el gestor.** El recargo lo pone Ruth en Stock+.
- **No calcula precios en el navegador.** Si el archivo no está, la tienda es la de siempre.
