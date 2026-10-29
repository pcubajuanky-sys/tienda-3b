# El carrito cuenta en USD y el total se paga en una moneda o en la otra

**Fecha:** plan y ejecución el 2026-10-28, cerrado la madrugada del 2026-10-29.
**Plan:** `docs/superpowers/plans/2026-10-28-carrito-en-usd.md`
**Cómo se hizo:** piloto (Opus) planificando y verificando; dos ejecutores (Sonnet) escribiendo el
código. **Desplegado** (ver el final).

---

## Qué pidió Ruth

> «quiero q el carrito q hoy contabiliza en cup, lo haga en usd y aplique la tasa de cambio para
> los totales; la idea es q la tienda tenga todo en usd y muestre ambas monedas en el total»

Y al concretar: **la mensajería solo en CUP**, el **USD grande en cada línea**, el total con las dos
formas de pagar separadas por un «o», el **USD primero** en el mensaje de WhatsApp, y que los 19
productos que tenían el precio en CUP **los convirtiera yo**, a la tasa de hoy y «a cerrado»
(múltiplos de 0,05, al más cercano: ella eligió esa regla sobre la de redondear siempre hacia
arriba, que subía el Teflón un 13 %).

## Lo que había antes, medido

- **El carrito ya sumaba los dólares** (`totalCarritoUSD` sumaba `precioUSD`) y ya enseñaba las dos
  monedas; lo que pasaba es que **el CUP mandaba** y el USD llevaba un «≈» delante, porque Stock+
  redondea el CUP de cada producto al publicar.
- De los 206 productos, **187 tenían el precio nativo en USD y 19 en CUP**. 🔴 En los 187 de USD
  `precioCUP` era **exactamente** `round(precioUSD × tasa)`: para ellos, que mandara una moneda o la
  otra **daba el mismo número**. Los únicos 17 que se desviaban eran de los 19 en CUP, con un desvío
  máximo de **4 CUP**.
- Con el gestor `QGZUQ` vivo, su tabla `precios-gestores.json` tenía el mismo patrón: solo 19 de 206
  desviados y **3 CUP** de desvío máximo. Como su tabla sustituye `precioUSD` **y** `precioCUP`,
  sumar el USD sigue dando **sus** precios: derivar el CUP del USD es correcto también en su página.

## Lo que quedó hecho

### 1. Los 19 productos pasados a USD (en Stock+, por la API)

Se escribió `fixedCurrency:'usd'` y el `saleUSD` calculado a la tasa de hoy (850) redondeado al
múltiplo de 0,05 más cercano; en los dos que tenían **oferta activa** (`PUJL` PopSockets y `MY9U`
Audífonos de cable) se escribió además el `ofertaUSD`, o la oferta se habría roto. 🔴 **Nunca se
tocó `data.json` a mano**; 19 `PUT /api/products/:id`, los 19 con HTTP 200.

🔴 **Dos trampas que se encontraron antes de escribir nada:**

- **El `saleUSD` que esos 19 tenían guardado estaba VIEJO** (calculado con una tasa anterior). El
  Teflón tenía `sale 300` con `saleUSD 0.45`, y 0,45 × 850 = **382**. Cambiar solo la moneda sin
  reescribir el dólar le habría subido el precio de 300 a 382 CUP de golpe, sin que nadie lo
  decidiera.
- **Los dos con oferta** publican como precio el de la OFERTA, no el `sale`: si se convierte solo
  `saleUSD`, el cliente ve un precio y paga otro.

Verificado por el piloto leyendo `data.json` y calculando con la propia función del proyecto
(`lib/pricing.getPrecioEfectivo`): los 19 con `fixedCurrency:'usd'`, los 19 con el CUP esperado,
los dos con su `ofertaUSD`, y **ninguno perdió la foto**. Los precios se movieron entre **−23 y +25
CUP** y la lista en conjunto quedó **50 CUP más barata**.

🔴 **Resultado que importa: ya NO queda ningún producto con precio nativo en CUP** (202 con
existencias, 0 fuera de USD). **Consecuencia que sale gratis:** `precioHtml` ya pone como cifra
grande la moneda nativa del producto, así que **las tarjetas y las fichas se vuelven USD solas** en
cuanto Stock+ republique. No se programó nada para eso.

### 2. `dinero.js` — la aritmética (módulo puro nuevo)

`Dinero.totales(items, tasa)` → `{usd, usdAhorro, usdNormal, cup, cupAhorro, cupNormal}`, más
`ahorroUSD(p)`, `elegibleUSD(items)` (que **excluye los `envioAparte`**, para el umbral) y
`aCUP(usd, tasa)`.

- `usdNormal` es **DERIVADO** de `usd + usdAhorro`, igual que ya hacía `Descuento.totales`: así las
  tres cifras de la pantalla cuadran aunque un `precioNormalUSD` venga mal de Stock+.
- 🔴 **Sin tasa válida los tres campos en CUP valen `null`** y la interfaz enseña solo USD: falla
  cerrado, nunca un `NaN CUP` delante de una clienta.
- Un `qty` basura (0, negativo, texto) **ignora esa línea**, no la cuenta como 1 (mismo criterio que
  `Descuento.totales`).

### 3. El carrito y el mensaje

- Cada línea: el **USD grande**, el CUP pequeño debajo y el «antes» tachado en USD.
  🔴 **El CUP de la LÍNEA sale del catálogo (`p.precioCUP * qty`), no de multiplicar** — el plan se
  contradecía en esto y el ejecutor lo cazó: así la cifra coincide con la tarjeta del producto y con
  lo que la clienta calcula a mano. `Dinero.aCUP` es solo para los TOTALES.
- El bloque del total, con la **mensajería siempre en CUP y aparte**:

```
Productos          $7.40        6,290 CUP
Mensajería                        150 CUP
──────────────────────────────────────────
Pagas:   $7.40 USD  +  150 CUP de mensajería
   o:    6,440 CUP
                           1 USD = 850 CUP
```

  🔴 Los 150 CUP **se suman tal cual** a la rama del «o»: no se convierten de ida y vuelta. Con la
  mensajería gratis o inactiva desaparece el «+» y queda `Pagas: $7.40 USD o 6,290 CUP`.
- La barra móvil pasa a `N productos · $7.40 USD` (a 375 px no caben las dos monedas con el aviso de
  mensajería gratis).
- 🔴 **El enlace de pago por adelantado (QvaPay) ya no cobra la mensajería.** Antes
  `totalGeneralUSD()` sumaba `m.monto / CAT.tasa`: está apagado hoy (`pagoUrl` vacío), pero el día
  que Ruth lo encienda habría cobrado el viaje de la mensajera **en dólares**. La función se
  **eliminó** (su único llamador usa `totalCarritoUSD()`) y la barrera de tests lo vigila.

### 4. La barrera de `test/negocio.test.js`, invertida a propósito

Hasta hoy había una aserción que **prohibía** derivar el ahorro del USD por la tasa (se escribió el
28/10 por el caso del gestor). Este trabajo hace exactamente eso, así que la barrera **no se borró:
se cambió** por la nueva invariante, con comentario y fecha:

1. el CUP de cada **línea** sale del catálogo;
2. el CUP del **total** se deriva del USD;
3. la derivación **respeta al gestor** (probado con una tabla simulada y un recargo del 10 %);
4. 🔴 **la mensajería NUNCA se convierte** — ninguna división ni multiplicación de `monto`, `costo`
   o `mensajeriaCUP` por la tasa, en ningún orden, ni siquiera para el pago por adelantado.

El ejecutor comprobó la barrera **mutando `app.js` a mano** cinco veces (cuatro en la Task 4 y una
reintroduciendo la conversión en el enlace de pago): cada mutación puso el test en rojo, y después
restauró el archivo.

## Evidencia OBSERVADA por el piloto

**Tests:** `node --test` desde la raíz → **`tests 258 / pass 258 / fail 0`, exit 0** (baseline antes
de empezar, ya con el repo al día: 244/244).

**La aritmética contra el catálogo REAL** (no un fixture), cargando `dinero.js` con `node:vm`:

```
carrito real -> {"usd":7.4,"usdAhorro":1,"usdNormal":8.4,"cup":6290,"cupAhorro":850,"cupNormal":7140}
suma de los CUP publicados de las líneas: 6290  | derivado del USD: 6290
sin tasa -> {"usd":7.4,...,"cup":null,"cupAhorro":null,"cupNormal":null}
```

El CUP derivado **coincide exacto** con la suma de las líneas, y sin tasa falla cerrado.

**El mensaje de WhatsApp**, generado por el ejecutor ejecutando el `app.js` real con un
`window.open` de pega (el piloto no lo re-generó):

```
• Chancletas de playa 🏖️ x1 — $1.45 USD (1,233 CUP)
• Peine de barbería x2 — $0.48 USD (408 CUP)

Productos: $1.93 USD (1,641 CUP)
Mensajería: 150 CUP (se confirma según la zona)
*Total: $1.93 USD + 150 CUP de mensajería*
o 1,791 CUP
Cambio: 1 USD = 850 CUP
Ahorraste $1.07 USD (910 CUP)
```

Con mensajería gratis: `*Total: $9.00 USD*` / `o 7,650 CUP`. Con `tasa = 0`: solo USD, sin
paréntesis ni línea «o». Barra móvil: `3 productos · $1.93 USD`.

**Otras comprobaciones del piloto:** `sw.js` dice `tienda-3b-v29`; `dinero.js` se carga en las dos
páginas en el orden correcto (`descuento.js` 534 → `dinero.js` 535 → `app.js`); **las 20 clases CSS
que usan la línea y el total tienen todas regla en `estilos.css`**; `totalGeneralUSD` solo sobrevive
en los comentarios que explican su eliminación; y no queda ninguna conversión de la mensajería en
`app.js`.

**Commits** (`main`): `e7196ea` (dinero.js) · `1c6f2df` (carrito) · `d65563c` (WhatsApp) ·
`ffb29a6` (barrera) · `4d06a41` (el adelanto sin mensajería).

## ⚠ NO VERIFICADO

- 🔴 **Nada se vio en un navegador.** Había **452 MB libres de 3.919** y 25 procesos de Chrome ya
  abiertos: por debajo de 600 MB no se abre otro navegador, porque es lo que asfixia la máquina y
  **desconecta a Mía de WhatsApp**. Quedan sin mirar a 375 px la línea con el USD grande, el bloque
  del total con el «o», el contraste de las clases nuevas y el botón de pago. Lo que sí se hizo fue
  ejecutar el `app.js` real en `node:vm` y leer el HTML y el mensaje que produce.
- **El gestor `QGZUQ` solo se probó con una tabla simulada**, no entrando por `?ref=QGZUQ`.
- **Ningún pedido real enviado** (el `window.open` se sustituyó por un capturador) y la URL de
  QvaPay no se abrió contra su servicio.
- **Ningún teléfono real**, sin probar sin conexión: lo de siempre en este repo.
- Los precios nuevos de los 19 **no llegan a la tienda hasta que Stock+ republique** el catálogo
  (≤5 h por `webAutoHoras`, o con «Publicar catálogo ahora»).
