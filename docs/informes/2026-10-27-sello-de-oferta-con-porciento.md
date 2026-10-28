# 2026-10-27 — El sello de oferta dice cuánto se ahorra

**Sesión:** Opus 5 pilotando · ejecutor Sonnet 5.5 (mismo agente, reusado)
**Commit inicial → final:** `da05b2b` → `bf0f438`, en **`main`**, **SIN PUSH**
**Origen:** petición del usuario («me gusta el de oferta -x %, vamos a desarrollar eso») ·
plan `docs/superpowers/plans/2026-10-27-sello-de-oferta-con-porciento.md` · ítem A3 de
`docs/auditorias/2026-10-22-revision-ux-y-ganchos-de-venta.md`.

## TL;DR

El sello rojo de las ofertas pasa de decir `OFERTA` a decir **`-52%`** cuando la rebaja es de
verdad grande (≥10 %), y el mismo número aparece en la ficha junto al precio. De paso, la
tienda **deja de tachar un «antes» que no es mayor que el precio de ahora**: el catálogo trae
una «oferta» que SUBE el precio y se estaba anunciando como rebaja, también en la imagen que
se comparte por WhatsApp y Facebook.

Tests **236/236, exit 0** (baseline 226). Verificado en navegador a 375 px, los dos temas,
sobre los 17 productos en oferta reales. **Sin desplegar: el push necesita el visto bueno de
Ruth.**

## Cambios realizados

| # | Cambio | Archivos | Motivo |
|---|---|---|---|
| 1 | Módulo puro `descuento.js`: `porciento`, `hayRebaja`, `sello`, `MINIMO` | `descuento.js`, `test/descuento.test.js` | Toda la aritmética y la decisión del texto en un sitio, probable sin navegador |
| 2 | El sello de la tarjeta sale de `Descuento.sello(p)` | `app.js:521` | `OFERTA` no dice nada; `-52%` sí |
| 3 | `precioHtml(p, conDescuento)`: el tachado solo si hay rebaja real; chip `-X%` en la ficha | `app.js:471-490`, `app.js:885`, `estilos.css` | Ver «la oferta que sube el precio» |
| 4 | `precioTarjeta` solo pone el «antes» si hay rebaja real | `tarjeta.js:41` | Esa imagen viaja por WhatsApp y Facebook: la mentira llega más lejos que la página |
| 5 | `descuento.js` en las dos páginas (**antes** de `tarjeta.js`) y en `ARMAZON`; `CACHE` → `tienda-3b-v26` | `index.html`, `electripower.html`, `sw.js`, `test/paginas.test.js` | `tarjeta.js` lo consulta |

## Decisiones tomadas y alternativas descartadas

Las tres salieron de **medir los 17 productos en oferta reales**, no de criterio general:

1. **Mínimo del 10 %.** Hay seis ofertas de 9 % o menos (9, 8, 7, 6, 5 y una negativa). Un
   sello que grita `-5%` desinfla la oferta en vez de venderla. Por debajo del mínimo se queda
   con el `OFERTA` de siempre. Hoy: **11 de 17 llevan número**.
2. **Redondeo hacia abajo.** Prometer 37 % cuando es 36,8 % es exagerar. Efecto lateral
   medido: con `floor`, el porcentaje por USD y por CUP **coincide en los 17**; con `round`
   discrepaban en 3 por el redondeo del CUP al publicar. Nadie puede pillar una incoherencia
   entre las dos cifras de la tarjeta.
3. 🔴 **Una «oferta» que sube el precio no es una rebaja.** El «Paquete de 4 Tic-Tacs» va de
   **595 a 612 CUP** (`precioNormalUSD: 0.70` → `precioUSD: 0.72`): no es redondeo, está mal
   el dato en Stock+ en las dos monedas. La tienda **ya lo estaba anunciando**, con el 595
   tachado encima del 612. Por eso este trabajo, además del sello, tapa el tachado cuando el
   «antes» no es mayor. **Decisión consciente de ampliar un poco el alcance**: poner un sello
   nuevo al lado de una mentira vieja no era una opción.
4. **El porcentaje se calcula con el par de la moneda PRINCIPAL del producto**, que es el que
   el cliente ve tachado: así puede comprobar la cuenta con los dos números que tiene delante.
5. **El chip `-X%` va solo en la ficha, no en la parrilla**: allí ya lo grita el sello de la
   foto, y repetirlo al lado del precio sería decir dos veces lo mismo en 165 px. Comprobado:
   `0` chips en la parrilla.
6. **Descartado:** enseñar el ahorro en dinero («ahorras 221 CUP»). Compite por el mismo sitio
   que el porcentaje; si se quiere, es otra decisión.

### 🔴 Un bug del plan, encontrado por el ejecutor y confirmado por el piloto

El `porciento()` del plan era `Math.floor((1 - ahora/antes) * 100)`. **Un descuento del 10 %
exacto se calculaba como 9**, y uno del 20 % como 19:

```
1 - 900/1000 = 0.09999999999999998   *100 = 9.999999999999998   floor = 9
```

Es decir: **justo los números redondos que una tienda pone de verdad** (10, 20, 25, 50) se
habrían quedado por debajo del mínimo y **sin sello**, sin dar ningún error. El ejecutor lo
vio al correr el test del propio plan (el de «10 % justo ya sí»), **paró y preguntó** en vez
de parchear el código o suavizar el test.

Arreglo elegido: **epsilon**, `Math.floor((1 - ahora/antes) * 100 + 1e-9)`. Verificado por el
piloto:
- 36,8 % sigue dando **36** y 9,99 % sigue dando **9**: no exagera ninguna rebaja.
- El porcentaje por USD y por CUP **sigue coincidiendo en los 17**.

**Descartada la aritmética entera** (`(antes-ahora)*100/antes`) que proponía el ejecutor:
funciona con los CUP enteros pero no está garantizada con los precios en USD con decimales —
ahí coincide por suerte, no por construcción.

**Corrección al reporte del ejecutor:** dijo que «en los datos reales de hoy no se nota». Sí
se nota. Medido sobre `catalogo.json`: el **«Candado/Alarma de Motos y Bicicletas»** va de
21.250 a 19.550, que es **8 % exacto**, y la fórmula vieja lo calculaba como **7**. Hoy no
cambia ningún sello porque está por debajo del mínimo, pero la cifra estaba mal.

## Evidencia de verificación

**Baterías**, corridas y observadas por el piloto:

```
cd C:\inventario\tienda-3b
node --test
```
- Baseline: **226/226, exit 0** · tras Task 1: 234/234 · tras Task 2 y 3: **236/236, exit 0**
- `node --check` de `app.js`, `tarjeta.js`, `descuento.js` y `sw.js`: sin salida.
- `grep -n "1e-9" descuento.js` → línea 55, el epsilon está puesto.
- Orden de carga comprobado en las dos páginas: `descuento.js` **antes** que `tarjeta.js`, y
  `app.js` después de los dos.

**Navegador**, `npx --yes serve -l 4173 .` a **375×812**, filtro «Ofertas», catálogo real
(208 productos, 17 en oferta, tasa 850):

| Comprobación | Observado |
|---|---|
| Los 17 sellos | 11 con número y 6 con `OFERTA`, exactamente el reparto esperado |
| Peine de barbería | sello **`-52%`**, tachado `$0.5`, precio `$0.24 · 204 CUP` |
| Audífonos de cable | **`-33%`**, tachado `600 CUP` |
| PopSockets | **`-30%`** · Chancletas y Sandalias **`-27%`** · Mini Embudos **`-35%`** |
| Nebulizador (5 %) | **`OFERTA`**, con su tachado `$20` intacto |
| Candado (8 %) | **`OFERTA`** — por debajo del mínimo, como se diseñó |
| 🔴 Tic-Tacs | **`OFERTA` y `tachado: null`** — el «antes» falso desapareció |
| Ficha del Peine | chip **`-52%`** junto al precio, 45 px |
| Ficha del Nebulizador | **sin chip** (5 % < 10), tachado intacto |
| Ficha de los Tic-Tacs | **sin chip y sin tachado**: solo `$0.72 · 612 CUP` |
| La parrilla no repite el chip | `0` elementos `.precio-desc` en `#grid` |
| Ancho de los sellos | 38–41 px los de número, 58 px los de `OFERTA`; **sin desborde** a 375 px |
| Tema **claro** | `rgb(200,30,76)` sobre tinta blanca (`--oferta` / `--oferta-ink`) |
| Tema **oscuro** | `rgb(255,138,166)` con tinta `rgb(42,14,32)` — el par que mide `test/colores.test.js` |

## Pendiente / próximos pasos

- [ ] **Decidir el despliegue.** Los tres commits están en `main` sin push. 🔴 **Van los tres
      juntos o ninguno**: entre `cbaf695` y `bf0f438` `app.js` ya usa `window.Descuento` pero
      las páginas todavía no lo cargan, así que un despliegue a medias deja la tienda rota.
- [ ] 🔴 **Ruth tiene que arreglar el dato del Tic-Tac en Stock+**: o le quita la oferta, o le
      pone un precio rebajado de verdad. La web solo deja de anunciarlo; el dato sigue mal.
      Mientras tanto ese producto aparece en el filtro «🏷️ Ofertas» sin ser una oferta.
- [ ] Mirar como imagen el sello y el chip: están medidos (texto, color, ancho, sin desborde)
      pero **no vistos**.
- [ ] Pendiente de antes: prueba social (208 pedidos entregados este mes, lo tiene que
      publicar Stock+), promesa de entrega (decisión de Ruth), `ELTOQUE_TOKEN`, y que un
      cambio de tasa a mano republique el catálogo.

## Riesgos y gotchas nuevos

- 🔴 **`tarjeta.js` depende ahora de `window.Descuento`** y por eso `descuento.js` va antes en
  los `<script>`. Si falta, `precioTarjeta` **falla cerrado**: no enseña el «antes» en ninguna
  oferta. Lo protege `test/paginas.test.js`, que exige el módulo en las dos páginas y en
  `ARMAZON`.
- 🔴 **El epsilon de `porciento()` no es adorno.** Si alguien lo quita «por limpieza», los
  descuentos redondos (10, 20, 25, 50 %) dejan de enseñar sello en silencio. Hay test.
- `precioHtml` **cambió de firma**: `precioHtml(p, conDescuento)`. Solo la ficha pasa `true`.
  Un `precioHtml(p)` nuevo en otro sitio no enseñará el chip, que es lo correcto por defecto.

## Cómo retomar

```bash
cd C:\inventario\tienda-3b
git log --oneline -5      # debe terminar en bf0f438
node --test               # 236/236, exit 0
```

## Lo que NO se verificó

- ⚠ **Ningún teléfono real**; todo en Chrome de escritorio con viewport emulado.
- ⚠ **Nada desplegado.** `CACHE = v26` no se ha probado contra el service worker real.
- ⚠ **Nadie ha MIRADO** el sello ni el chip como imagen.
- ⚠ **La imagen para compartir no se generó.** El cambio de `tarjeta.js` está probado por
  unidad (`precioTarjeta(tictac).antes === ''`), pero no se dibujó ni una tarjeta real.
- ⚠ Sin probar sin conexión.
