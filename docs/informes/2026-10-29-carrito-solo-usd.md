# La línea del carrito, solo en USD

**Fecha:** 2026-10-29. **Plan:** `docs/superpowers/plans/2026-10-29-carrito-solo-usd.md`
**Cómo se hizo:** piloto (Opus) planificando y verificando; un ejecutor (Sonnet) escribiendo el
código. **Desplegado y verificado en producción** (ver el final).

---

## Qué pidió Ruth

> «quiero q en el carrito no salga el precio en cup del producto, solo usd, y entoces solo salga el
> total tal cual sale hoy»

Un día después de poner el carrito en dólares: el CUP pequeño de cada línea repetía una cifra que
ya está en el total, y el total ya ofrece las dos monedas. Era ruido.

Y al preguntarle por el mensaje de WhatsApp, que sigue llevando el CUP en cada línea: **«mensaje
esta ok»** → no se tocó.

## Lo que quedó hecho

Un cambio de **resta**. `dinero.js` no se tocó: no hay aritmética nueva.

1. **`app.js`, `lineaCarritoHtml`** — fuera el `<div class="linea-cup">`. La línea queda con el
   **USD grande** (`.linea-sub`) y, si hay rebaja de verdad, el **«antes» tachado en USD**. El
   comentario de la función se reescribió para que diga la verdad nueva.
   🔴 **No se tocó nada más:** ni `totalBloqueHtml`, ni `totalesCarrito`, ni la barra móvil, ni
   `enviarPorWhatsApp`. El total se ve **exactamente igual que ayer**, que es lo que Ruth pidió.
2. **`estilos.css`** — fuera la regla `.linea .linea-cup`, que quedaba muerta (era su único uso).
3. **`test/negocio.test.js`** — la barrera que **exigía** `p.precioCUP * qty` en la línea se
   **cambió, no se borró**: ahora exige lo contrario, que la línea **no pinte ni nombre CUP**.
   Siguen vivas la aserción de que la línea no convierte por la tasa y la que prohíbe sumar
   `precioCUP` a mano en todo `app.js`.
4. **`sw.js`** — `CACHE` → `tienda-3b-v30`.

Un solo cambio cubre los **dos** carritos: el móvil y el panel de escritorio (≥1024 px) comparten
`lineaCarritoHtml`.

## Evidencia OBSERVADA por el piloto

**Tests:** `node --test` desde la raíz → **258/258, pass 258, fail 0, exit 0**. Corridos **dos
veces**: antes y después del rebase que trajo el catálogo nuevo de Stock+.

**La barrera muerde de verdad.** Sin tocar el árbol, se sacó el `app.js` anterior de git
(`git show c042a4f:app.js`) y se le aplicaron las dos aserciones nuevas:

```
app.js VIEJO (c042a4f)    sin precioCUP: false   sin la palabra CUP: false
app.js NUEVO              sin precioCUP: true    sin la palabra CUP: true
```

**El HTML real de la línea**, generado por el ejecutor cargando el `app.js` de verdad en un
sandbox de `node:vm` (producto en oferta, 2 unidades, tasa 850):

```html
<div class="linea-precios">
  <span class="tachado linea-antes">$1.00</span>
  <div class="linea-sub">$0.48</div>
</div>
```

Ni un `CUP`. El ejecutor corrió el mismo script contra `HEAD` como control y allí **sí** salía
`<div class="linea-cup">408 CUP</div>`, así que el sandbox aplicaba la tasa: la ausencia es el
cambio, no un fallo de la prueba.

**En el sitio real** (`https://www.3bqba.com`, tras el despliegue):

| Comprobación | Resultado |
|---|---|
| `sw.js` | `tienda-3b-v30` |
| `app.js` servido (122.714 bytes), cuerpo de `lineaCarritoHtml` | `linea-cup` **no**, `precioCUP` **no**, la palabra `CUP` **no**, `linea-sub` **sí** |
| `estilos.css` servido, `linea-cup` | **0** apariciones |
| El TOTAL, intacto | `total-pagas` ✓ · `total-mas` ✓ · `desglose-cup` ✓ · `TasaVista` ✓ |
| `totalesCarrito` → `Dinero.totales` · `totalBloqueHtml` → `totalesCarrito` | ✓ los dos |

**Hallazgo de paso, bueno:** el rebase trajo el catálogo que Stock+ publicó hoy a las 15:53 y ahí
se ve que **la conversión de los 19 productos del 28/10 ya está en producción**: `203 productos,
los 203 con moneda "usd"`, tasa **855**, y el Teflón a **0,35 USD / 299 CUP** — no a los 382 que
habría dado la trampa del `saleUSD` viejo. Con eso, las tarjetas y las fichas de la tienda ya
enseñan el dólar como cifra grande, que era la consecuencia que salía gratis.

**Commits** (`main`, publicados en `0396d60..723959e`): `ce2c4d6` (la línea, el CSS y la caché) ·
`723959e` (la barrera).

## ⚠ NO VERIFICADO

- 🔴 **Nada se vio en un navegador.** Había **398 MB libres de 3.919** y 25 procesos de Chrome
  abiertos; por debajo de ~600 MB abrir otro asfixia la máquina y **desconecta a Mía de WhatsApp**.
  Queda sin **mirar** a 375 px cómo cae la línea con una sola cifra y el tachado encima (está
  medida y ejecutada, no vista).
- **Ningún teléfono real**, ningún pedido enviado, sin probar sin conexión.
- 🔴 **La primera carga tras el despliegue sigue sirviendo el código viejo** (el service worker
  viejo sirve su caché mientras el nuevo se instala). Hace falta **recargar otra vez**. Para saber
  qué corre de verdad: `lineaCarritoHtml.toString()` en la consola, no el `curl`.

## Nota para quien venga

🔴 **La aserción `!/CUP/.test(linea)` lee el cuerpo de la función CON sus comentarios.** O sea que
un comentario dentro de `lineaCarritoHtml` que escriba la palabra «CUP» pone el test en rojo, aunque
el código esté bien. Es a propósito —así nadie reintroduce la cifra «solo como nota»— pero el
mensaje del test lo explica; es el mismo patrón que la cadena `.hero-tasa` prohibida en
`estilos.css`.
