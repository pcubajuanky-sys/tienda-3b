# Informe — El ahorro a la vista: «Ahorras X%» y el carrito estilo Temu

**Fecha:** 2026-10-28 · **Repo:** `C:\inventario\tienda-3b` · **Plan:**
`docs/superpowers/plans/2026-10-28-ahorro-estilo-temu.md`
**Commits:** `7908511`, `c114b12`, `5addf18` (sobre `a9bb29e`) · **Caché:** `tienda-3b-v28`

---

## 1. Qué pidió Ruth y qué se hizo

> «Que al meter un artículo en oferta en el carrito se contabilice tipo Temu —precio real, menos
> tanto de oferta, pagas tanto—, que no diga `-x%` sino `Ahorras x%`, y revisa porque hay
> artículos que solo dicen OFERTA y no `-x%`.»

Las tres cosas, más la corrección que ella misma hizo sobre el ejemplo del plan (los pedidos
desde 2.000 CUP llevan la mensajería incluida, así que en el ejemplo la mensajería salía GRATIS
y el total no era el que yo había escrito).

### La respuesta a «¿por qué unos dicen solo OFERTA?»

**No era un bug.** `descuento.js` tenía `MINIMO = 10` a propósito desde el 27/10: por debajo del
10 % no se enseñaba número, porque un `-5%` grande y rojo desinfla la oferta en vez de venderla.
Eran 5 productos reales (5 %, 6 %, 6 %, 8 % y 9 %) más el «Paquete de 4 Tic-Tacs», excluido por
otra razón distinta: su «oferta» **subía** el precio (595 → 612 CUP), y eso se apagó por la API
el 28/10.

Ruth decidió **enseñar el porcentaje siempre**, así que el mínimo se eliminó.

### Decisión anotada y descartada (para la próxima vez que salga el tema)

El «Ventilador recargable Camping Fan» ahora dice **«Ahorras 9%»**, cuando lo que se ahorra son
**4.250 CUP** — es la rebaja más grande del catálogo en dinero y la que peor suena en porcentaje.
Se le ofreció a Ruth la variante «ahorro en CUP cuando el % es bajo» y eligió el porcentaje
siempre. **No está implementada**; si algún día se quiere, el sitio es `sello()` en `descuento.js`.

## 2. Qué cambió, pieza por pieza

### `descuento.js` (módulo puro)
- **`MINIMO` eliminado.** El porcentaje se enseña siempre que exista.
- **`sello(p)`** devuelve `"Ahorras 52%"` en vez de `"-52%"`. Se queda `"OFERTA"` solo para el
  caso en que no hay número honesto que dar (una oferta cuyo «antes» no es mayor).
- **`ahorroCUP(p)`** (nueva) → `hayRebaja(p) ? max(0, precioNormalCUP − precioCUP) : 0`.
  🔴 El `max(0, …)` no es adorno: `porciento()` decide la rebaja en la **moneda principal** del
  producto (189 de 206 son `usd`) y el ahorro se cobra en **CUP**; el redondeo del CUP al
  publicar podría dejar los dos pares descompensados.
- **`totales(items)`** (nueva) → `{normal, descuento, pagas}`.
  🔴 **`normal` se DERIVA** (`pagas + descuento`), no se suma aparte, para que las tres cifras
  que el cliente tiene delante siempre cuadren pase lo que pase con un `precioNormalCUP` raro.

### `app.js`
- El chip de la ficha pasa a `Ahorras X%` y deja de comparar contra `MINIMO` (si no, al quitar el
  token la comparación habría dado `pct >= undefined` → `false` y el chip habría desaparecido en
  silencio).
- `lineaCarritoHtml`: cada línea rebajada enseña su «antes» tachado encima del subtotal, dentro
  de un `.linea-precios` nuevo. La `<img>` sigue siendo el primer hijo de `.linea` (de eso
  depende `imgFallback`, que hace `img.after(marca)`).
- `totalBloqueHtml`: dos filas nuevas **arriba** del desglose, solo si `d.descuento > 0`.
- `enviarPorWhatsApp`: línea `Ahorraste N CUP` **después** de la del cambio (esa pareja
  total + tasa no se separa, decisión del 27/10).

### `estilos.css`
- `.desglose-descuento` en `var(--oferta)`. 🔴 Van **dos selectores** porque
  `.desglose-linea span:last-child` ya fija color con la **misma especificidad**: esta regla gana
  por venir después. **No la muevas por encima de aquella.**
- `.linea-precios` / `.linea-antes` reusan `.tachado`: aquí solo se decide la colocación.

### Barreras nuevas (lo que impide que esto se rompa dentro de dos meses)
- `test/colores.test.js` mide `--oferta` **como texto** sobre los tres fondos en los dos temas y
  exige que la fila del descuento pida el color al token, sin colores a mano.
- `test/negocio.test.js` exige que las cifras salgan de `Descuento.totales` / `Descuento.ahorroCUP`
  y 🔴 **que el ahorro nunca se calcule desde el USD por la tasa** — hay un gestor con recargo
  vivo (`QGZUQ`) y `preciosGestor.js` ya sustituye `precioNormalCUP`, así que calcularlo por la
  tasa daría una cifra distinta a la que el cliente tiene delante.

## 3. El fallo del plan, y por qué es una buena noticia

El plan pedía esta aserción:

```js
assert.deepStrictEqual(totales([]), { normal: 0, descuento: 0, pagas: 0 });
```

y **falla** (242 tests, 241 pass, 1 fail): el objeto nace **dentro** del sandbox de `node:vm`, su
prototipo es el `Object` de ESE realm, y `deepStrictEqual` lo rechaza con «Values have same
structure but are not reference-equal» aunque los valores sean idénticos. El `CLAUDE.md` del
proyecto ya avisaba de esto **para los arrays**; vale igual para los objetos, y el plan lo repitió.

**El ejecutor paró y lo reportó en vez de parchearlo**, que es exactamente lo que debía hacer.
Se corrigió a tres `strictEqual` por campo, con el comentario explicando por qué.

## 4. Evidencia observada

### Pruebas
- **Baseline antes de tocar nada: 236/236, exit 0** (corrida y observada por el piloto).
- **Al terminar: 244/244, `pass 244`, `fail 0`, exit 0** (corrida y observada por el piloto, no
  por el ejecutor). Por tarea: 242 → 243 → 244.
- 9 tests nuevos; 1 borrado a propósito (`el minimo para enseñar un numero es el 10 %`) y 2
  reescritos a propósito (los que afirmaban el mínimo y el formato `-52%`), porque el
  comportamiento cambió por decisión de Ruth.

### En navegador, a 375 px, los dos temas (Chrome del sistema, `deviceScaleFactor 2`)

| # | Comprobación | Observado |
|---|---|---|
| 1 | Sellos de la parrilla | 16, **ninguno en dos líneas**, 79 px máx. sobre foto de 135 px |
| 2 | Los de menos del 10 % | `Ahorras 5%`, `6%`, `6%`, `8%`, `9%` |
| 3 | Ficha del Peine | `Ahorras 52%` **una sola vez**, con `$0.5` tachado; 0 sellos en la ficha |
| 4 | Carrito qty 1 | `425` tachado / `204`; Precio normal 425 · Descuento −221 · Productos 204 · Mensajería 150 · **Total 354** |
| 5 | Carrito qty 3 | 1.275 · −663 · 612 → **la resta cuadra** |
| 6 | Umbral (Camping Fan, 42.500) | 46.750 · −4.250 · 42.500 · **Mensajería GRATIS** · Total = Productos |
| 7 | Carrito **sin** rebajas | **3 filas, 0 tachados** — idéntico a antes del cambio |
| 8 | WhatsApp | `*Total: 354 CUP*` → `Cambio: 1 USD = 850 CUP` → `Ahorraste 221 CUP`; sin ofertas la línea **no** aparece |
| 9 | Modo oscuro | Descuento en `rgb(255,138,166)` (= `--oferta` oscuro), peso 800, tachado real |

**Mirado como imagen** (no solo medido): carrito en claro y en oscuro, parrilla en oscuro con el
sello `Ahorras 8%` sin chocar con `⭐ MÁS VENDIDO`, y ficha en claro con el chip junto al precio.

🔴 **Para probar el mensaje de WhatsApp se sustituyó `window.open` por una función que solo
captura la URL**, y se restauró después. **Ningún pedido real salió.**

🔴 **Gotcha confirmado otra vez:** el panel de navegador integrado mide ~294 px y escala las
capturas hasta hacerlas ilegibles. Para mirar de verdad hay que usar Chrome del sistema con
`puppeteer-core` **en el scratchpad**, nunca instalado en el repo.

## 5. ⚠ NO VERIFICADO

- **Ningún teléfono real.** Todo está medido y mirado en Chrome de escritorio con viewport
  emulado a 375 px.
- **Sin probar sin conexión**, pese a ser una PWA.
- **La imagen para compartir no se generó.** `tarjeta.js` no cambia en esta tanda (usa
  `hayRebaja`, no `sello`), pero sigue sin dibujarse nunca desde que depende de `descuento.js`.
- **La rama del gestor con recargo no se probó** con un pedido entrando por `?ref=QGZUQ`.
- **Ningún pedido real enviado**, a propósito.
