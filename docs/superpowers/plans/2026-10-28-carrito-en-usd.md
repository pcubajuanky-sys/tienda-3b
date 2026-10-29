# El carrito cuenta en USD y el total se paga en una moneda o en la otra

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` o
> `executing-plans`. Los pasos llevan casilla (`- [ ]`).

**Goal:** que el carrito se contabilice en **dólares** (la moneda en la que están todos los
precios), que cada línea enseñe el USD como cifra grande, y que el total ofrezca las **dos formas
de pagar** con la mensajería **siempre aparte y en CUP**:

```
Pagas:   $7.40 USD  +  150 CUP de mensajería
   o:    6,440 CUP
```

**Architecture:** un módulo puro nuevo, **`dinero.js`** (`window.Dinero`), con toda la aritmética
de los totales en las dos monedas y sus tests con `node:vm`. `app.js` solo pinta. La mensajería y
el mínimo para que sea gratis **siguen siendo reglas en CUP** y no se convierten nunca.

**Tech Stack:** HTML/CSS/JS plano sin bundler · módulos puros IIFE + `window.X` · `node --test`
desde la raíz · PWA con service worker.

**Rama:** `main` (el repo se publica solo a Vercel). Tests antes de empezar: **244/244, exit 0**.

---

## Las decisiones de Ruth (2026-10-28, no reinterpretarlas)

1. **Todo se contabiliza en USD.** El USD es la cifra grande de cada línea del carrito; el CUP va
   debajo, pequeño.
2. **El total da las dos monedas con un «o» en medio**, porque el cliente paga en una o en la otra,
   no en las dos: `$7.40 USD + 150 CUP de mensajería` **o** `6,440 CUP`.
3. 🔴 **La mensajería SIEMPRE en CUP y SIEMPRE aparte.** Nunca se mete dentro del total en dólares
   ni se enseña convertida. Si el cliente paga en USD, paga «X USD **+** 150 CUP de mensajería».
4. **En el mensaje de WhatsApp el USD va primero** y el CUP debajo.
5. Los 19 productos que tenían el precio en CUP **ya se pasaron a USD** (hecho el 2026-10-28 por la
   API de Stock+, redondeando al múltiplo de 0,05 más cercano).

## Lo medido (no volver a investigarlo)

- 🔴 **Ya NO queda ningún producto con precio nativo en CUP:** los **202** con existencias tienen
  `fixedCurrency:'usd'` (verificado en `data.json` tras la conversión). Por tanto
  `precioCUP === round(precioUSD × tasa)` **para todos**.
- **Consecuencia que sale gratis:** `precioHtml` (`app.js:473`) ya pone el USD como cifra principal
  cuando `p.moneda === 'usd'`. **Las tarjetas y las fichas se vuelven USD solas** en cuanto Stock+
  republique el catálogo (≤5 h por `webAutoHoras`, o con «Publicar catálogo ahora»). **No hay nada
  que programar para eso.**
- `tasa` **850**, `mensajeriaCUP` **150**, `envioGratisCUP` **2.000** (del `catalogo.json` publicado).
- 🔴 **El gestor `QGZUQ` está VIVO** y su tabla `precios-gestores.json` sustituye `precioUSD` **y**
  `precioCUP`. Medido: en su tabla solo 19 de 206 productos tenían `c != round(u × tasa)` y el peor
  desvío era **3 CUP** — y eran justo los 19 que ya se convirtieron, así que al republicar queda
  consistente. **Derivar el CUP del USD por la tasa es correcto también en su página**, porque el
  `precioUSD` que se suma ya es el suyo.
- 🔴 **`test/negocio.test.js` tiene hoy una barrera que PROHÍBE calcular el ahorro desde el USD por
  la tasa.** Se escribió el 28/10 por el caso del gestor. Este plan **la invierte a propósito** (ver
  Task 4): ahora que todos los precios son USD y que la tabla del gestor también sustituye el USD,
  la derivación es la correcta. **No se borra la barrera: se cambia por la nueva invariante.**
- La diferencia entre sumar los CUP de cada línea y derivar el CUP del total en USD es de **1 o 2
  CUP** (suma de redondeos vs redondeo de la suma). Es aceptable porque el CUP de cada línea pasa a
  ser **el equivalente** del precio, no el precio.
- Piezas de `app.js` que tocan dinero hoy: `totalCarrito()` (1215), `totalCarritoElegible()` (1223),
  `totalCarritoUSD()` (1235), `usdLineaHtml()` (1244), `totalBloqueHtml()` (1256), `totalGeneralCUP()`
  (1337), `lineaCarritoHtml()` (1525), `actualizarBarraMovil()` (1558), `enviarPorWhatsApp()` (1887).

---

## Estructura de archivos

**Crear:** `dinero.js` · `test/dinero.test.js`
**Modificar:** `app.js` · `index.html` · `electripower.html` · `sw.js` (CACHE → **`tienda-3b-v29`**)
· `estilos.css` · `test/negocio.test.js` · `test/paginas.test.js`
· `docs/informes/2026-10-28-carrito-en-usd.md` (Task 6)

---

### Task 0: Baseline

- [ ] `cd /c/inventario/tienda-3b && node --test 2>&1 | tail -5` → **244/244, `fail 0`**.
      🔴 `node --test` desde la RAÍZ, nunca `node --test test/` (falla con Node 24). Si no da
      244/244, **PARA y avisa**.

---

### Task 1: `dinero.js` — la aritmética en las dos monedas

**Contrato** (`window.Dinero`), todo puro y sin tocar el DOM:

- `ahorroUSD(p)` → `0` si no hay rebaja de verdad (usa `window.Descuento.hayRebaja`), y si la hay
  `max(0, precioNormalUSD − precioUSD)` redondeado a 2 decimales.
- `elegibleUSD(items)` → suma de `precioUSD × qty` **saltándose los `envioAparte`** (su precio no
  cuenta para el mínimo de mensajería gratis, porque su envío nunca va a ser gratis).
- `aCUP(usd, tasa)` → `Math.round(usd × tasa)`, y **`null`** si `tasa` no es un número > 0.
- `totales(items, tasa)` → un objeto con:
  - `usd` = Σ `precioUSD × qty`, a 2 decimales.
  - `usdAhorro` = Σ `ahorroUSD(p) × qty`, a 2 decimales.
  - `usdNormal` = `usd + usdAhorro`. 🔴 **DERIVADO, nunca una suma aparte de `precioNormalUSD`** —
    es la misma regla que ya tiene `Descuento.totales`: así las tres cifras de la pantalla cuadran
    aunque un `precioNormalUSD` venga mal de Stock+.
  - `cup`, `cupAhorro` = `aCUP` de los dos de arriba; `cupNormal` = `cup + cupAhorro` (derivado
    igual, para que la resta en CUP también cuadre en pantalla).
  - 🔴 Sin tasa válida, los tres campos en CUP valen **`null`** (y la interfaz enseña solo USD).
    Falla cerrado: nunca un `NaN CUP` delante de una clienta.

- [ ] **Step 1:** escribe `test/dinero.test.js` y velo fallar. Carga el módulo con `node:vm` como
  `test/descuento.test.js`. 🔴 **Nada de `assert.deepStrictEqual` contra un objeto literal**: el
  objeto nace DENTRO del sandbox y falla por realms (ya mordió el 28/10). Comprueba **campo por
  campo con `strictEqual`**. Cubre:
  1. Carrito de dos líneas sin rebaja: `usd` exacto, `usdAhorro` 0, `usdNormal === usd`, `cup`
     = `round(usd × 850)`.
  2. Con rebaja: `usdAhorro` correcto y `usdNormal === usd + usdAhorro` (y lo mismo en CUP).
  3. `ahorroUSD` devuelve 0 cuando el «antes» **no** es mayor (el caso del producto cuya «oferta»
     subía el precio).
  4. `elegibleUSD` **excluye** los `envioAparte` y `totales` **los incluye** (son dos cuentas
     distintas a propósito: una es para el umbral, la otra es lo que se paga).
  5. `tasa` ausente, 0, negativa o `'abc'` → `cup`, `cupAhorro` y `cupNormal` son `null` y los USD
     siguen bien.
  6. Carrito vacío → todo 0 (y `cup` 0, no `null`, con tasa válida).
  7. Cantidades: `qty` 3 multiplica bien, y un `qty` basura no rompe (cuenta como 1 o se ignora:
     elige y escríbelo en el test).
- [ ] **Step 2:** escribe `dinero.js` con el patrón IIFE + `window.Dinero` de los demás módulos, con
  el comentario 🔴 de por qué `usdNormal` se deriva y por qué el CUP es `null` sin tasa.
- [ ] **Step 3:** `node --test test/dinero.test.js` en verde. Commit (`dinero.js`,
  `test/dinero.test.js`).

---

### Task 2: cablear `dinero.js` y cambiar el carrito

**Files:** `app.js` · `index.html` · `electripower.html` · `estilos.css` · `sw.js`

🔴 **`dinero.js` se carga ANTES de `app.js` y DESPUÉS de `descuento.js`** (lo usa), en **las dos
páginas**. `test/paginas.test.js` compara la lista de módulos contra las dos páginas y contra el
disco: **añádelo también allí** o el test se pone rojo (y con razón: el 27/10 `/electripower` se
quedó sin cuatro módulos por esto).

- [ ] **Step 1: las líneas del carrito** (`lineaCarritoHtml`, ~1525). El bloque de precios pasa a:
  - el **«antes» tachado en USD** (`$6.00`), solo si `Dinero.ahorroUSD(p) > 0`;
  - el **USD grande**: `$5.00` (la cifra de la línea, `precioUSD × qty`, 2 decimales);
  - el **CUP pequeño debajo**: `4,250 CUP`. 🔴 **Corregido el 28/10 (el ejecutor encontró que el plan
    se contradecía con la Task 4):** el CUP de cada LÍNEA sale del catálogo (`p.precioCUP * qty`), NO
    de `Dinero.aCUP` — así coincide con lo que dice la tarjeta del producto y con lo que la clienta
    calcula a mano. `Dinero.aCUP` es para los TOTALES. Si no hay tasa válida, no se pinta.
  Reutiliza las clases que ya existen para el par grande/pequeño (`.precio` / `.usd`) o añade
  `.linea-usd` / `.linea-cup` en `estilos.css` si hace falta; **el tachado sigue siendo `.tachado`**.
- [ ] **Step 2: el bloque del total** (`totalBloqueHtml`). Queda así, con la mensajería **fuera** del
  total en dólares:

```
Precio normal      $8.40        7,140 CUP      ← solo si hay rebaja
Descuento         -$1.00         -850 CUP      ← solo si hay rebaja
Productos          $7.40        6,290 CUP
Mensajería                        150 CUP      ← GRATIS / a coordinar / 150 CUP
──────────────────────────────────────────
Pagas:   $7.40 USD  +  150 CUP de mensajería
   o:    6,440 CUP
                           1 USD = 850 CUP
```

  Reglas exactas:
  - La fila **Mensajería** se enseña **solo en CUP**, jamás convertida. `GRATIS` y `a coordinar` se
    conservan tal cual, con la nota de la zona y `notaAparteHtml()` como hoy.
  - La línea **«Pagas»**: `$<usd> USD` y, **solo si `m.monto > 0`**, ` + <monto> CUP de mensajería`.
  - La línea **«o»**: `<cup + m.monto> CUP` — el CUP de los productos (derivado del USD) **más** la
    mensajería exacta en CUP. 🔴 **Los 150 CUP se suman tal cual, no se convierten de ida y vuelta.**
  - Con la mensajería **inactiva o gratis** desaparecen el «+» y la fila: queda
    `Pagas: $7.40 USD  o  6,290 CUP`.
  - 🔴 **Sin tasa válida** no se pinta la rama del «o» ni los CUP de las filas: solo el USD y la
    mensajería en CUP. Nunca un `NaN`.
  - La nota `1 USD = 850 CUP` sigue saliendo de `TasaVista.carrito(CAT.tasa)`, en su propia línea.
  - Se mantiene la regla del 28/10: **sin nada rebajado en el carrito no se pinta ni una fila de
    rebaja** (hay test).
- [ ] **Step 3: la barra móvil** (`actualizarBarraMovil`): pasa a `N productos · $7.40 USD`
  (más `· 🎉 Mensajería gratis` cuando toque). 🔴 A 375 px no caben las dos monedas con el aviso:
  manda el USD, que es la moneda de la tienda.
- [ ] **Step 4:** `totalCarrito()`, `totalCarritoElegible()`, `totalCarritoUSD()` y
  `totalGeneralCUP()` pasan a apoyarse en `Dinero` (una sola fuente). 🔴 **`envioGratis()` compara
  en CUP contra el umbral** (es una regla de negocio en CUP): usa `Dinero.aCUP(Dinero.elegibleUSD(...), tasa)`.
  Comprueba con `grep` que no queda ningún sitio sumando `precioCUP` a mano.
- [ ] **Step 5:** `sw.js` → `CACHE = 'tienda-3b-v29'`. 🔴 Obligatorio al tocar `app.js`,
  `estilos.css` o el HTML, o quien tenga la tienda instalada sigue viendo el código viejo.
- [ ] **Step 6:** comprobador de sintaxis y `node --test`; commit.

---

### Task 3: el mensaje de WhatsApp, con el USD primero

**Files:** `app.js` (`enviarPorWhatsApp`, ~1887)

```
• Abrigo de Chihuahua x1 — $5.00 USD (4,250 CUP)
• Anillos de acero x2 — $2.40 USD (2,040 CUP)

Productos: $7.40 USD (6,290 CUP)
Mensajería: 150 CUP (se confirma según la zona)
*Total: $7.40 USD + 150 CUP de mensajería*
o 6,440 CUP
Cambio: 1 USD = 850 CUP
Ahorraste $1.00 USD (850 CUP)
```

- El **total en negrita lleva el USD**, y el `o <CUP>` va en la línea de debajo.
- `Mensajería` conserva sus tres variantes de hoy (`GRATIS (pedido desde 2,000 CUP)` / `a coordinar
  (transporte aparte)` / `150 CUP (se confirma según la zona)`), **siempre en CUP**.
- La línea del cambio (`TasaVista.pedido`) sigue **pegada al total** (decisión del 27/10: esa pareja
  no se separa) y `Ahorraste` sigue **después** de ella.
- 🔴 Sin tasa válida: el mensaje va solo en USD, sin los paréntesis en CUP ni la línea del «o».
- [ ] Steps: cambiar las líneas · comprobar sintaxis · `node --test` · commit.

---

### Task 4: invertir la barrera de `test/negocio.test.js` (a propósito)

**Files:** `test/negocio.test.js`

Hoy hay una aserción que **prohíbe** derivar el ahorro del USD por la tasa. Este plan hace
exactamente eso, así que la barrera se **cambia**, no se borra:

- [ ] **Quita** la aserción vieja y escribe en su lugar, con un comentario que explique el cambio y
  la fecha:
  1. **El CUP de cada línea del carrito sale del catálogo** (`precioCUP`), no de multiplicar.
  2. **El CUP del TOTAL se deriva del USD** (`Dinero.aCUP`), que es la decisión del 28/10.
  3. 🔴 **La derivación respeta al gestor:** con una tabla de gestor simulada (su `precioUSD` y su
     `precioCUP` sustituidos, como hace `preciosGestor.js`), el total en USD y su conversión salen
     de **los precios del gestor**, no de los de la casa. Escribe el test con dos productos y un
     recargo del 10 %, y comprueba el número exacto.
  4. **La mensajería nunca se convierte:** una aserción que exija que el código **no** divide ni
     multiplica `mensajeriaCUP` por la tasa (busca el símbolo en `app.js`, como ya hacen otras
     barreras de este repo).
- [ ] `node --test` entero en verde. Commit.

---

### Task 5: verificación

- [ ] **Step 1:** `node --test` desde la raíz → **244 + los nuevos**, `fail 0`. Apunta el número real.
- [ ] **Step 2: mirarlo de verdad**, solo si hay RAM:

```powershell
[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)
```

  🔴 Por debajo de **600 MB no abras navegador**: esta PC tiene 3,9 GB y es lo que asfixia la
  máquina y **desconecta a Mía de WhatsApp** (el 27 y el 28/10 había ~250 MB). Si no se puede,
  marca `⚠ NO VERIFICADO` y sigue. Si se puede: `npx --yes serve -l 4173 .` y Chrome **del sistema**
  con `puppeteer-core` en el scratchpad (el navegador integrado mide ~294 px y escala las capturas).
  Comprueba a 375 px, en los dos temas:
  1. Una línea con el USD grande, el CUP pequeño y, en una rebajada, el «antes» tachado en USD.
  2. El bloque del total con el «o» y la mensajería en CUP aparte.
  3. Con el carrito por encima de 2.000 CUP: `Mensajería GRATIS` y el total **sin** el «+».
  4. Un producto con transporte aparte: `a coordinar` y su nota.
  5. La barra móvil en USD.
  6. 🔴 **El mensaje de WhatsApp: sustituye `window.open` por una función que solo capture la URL**,
     o a Ruth le llega un pedido falso. Pega el texto que sale.
  7. Entrando por `?ref=QGZUQ` (el gestor vivo): sus precios y que el total cuadra con ellos.
  8. Después, limpia `carrito`, `pedidoEnviado`, `direcciones` y `ultimaVisita` del navegador.
- [ ] **Step 3:** `git status` limpio salvo lo que toque este plan; `catalogo.json`,
  `precios-gestores.json` y `sitemap.xml` **sin tocar** (los publica Stock+).

---

### Task 6: documentación

- [ ] Entrada en la sección «Tienda web 3B» de `C:\Users\JyR\CLAUDE.md` y informe en
  `docs/informes/2026-10-28-carrito-en-usd.md`, con: las decisiones de Ruth, que **ya no queda
  ningún producto en CUP** (y que por eso las tarjetas se volvieron USD solas al republicar), que la
  mensajería y el umbral siguen siendo reglas en CUP, la **inversión de la barrera** de
  `test/negocio.test.js` con su motivo, la salida real de `node --test` y una sección
  `⚠ NO VERIFICADO`.
- [ ] Actualiza `docs/SIGUIENTE-SESION.md` (es el archivo que se lee al empezar): caché `v29`, lo
  hecho, y tacha de la lista de pendientes lo que este plan resuelva.
- [ ] Commit de documentos.

---

## Lo que este plan NO hace

- **No toca las tarjetas ni la ficha:** ya enseñan el USD grande por sí solas, porque todos los
  productos son `moneda:'usd'`. Lo único que falta ahí es que Stock+ republique.
- **No convierte la mensajería ni el umbral a USD.** Son reglas en CUP del negocio.
- **No publica el catálogo** ni despliega: eso se decide aparte, con Ruth.
- **No cambia el precio de ningún producto.** La conversión de los 19 ya se hizo el 28/10 por la API.
