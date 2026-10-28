# 2026-10-27 — El cambio sale del centro de la portada y se pone encima del umbral

**Sesión:** Opus 5 pilotando · ejecutor Sonnet 5.5
**Commit:** `e657796` (era `f9c2520` antes del rebase), en **`main`**, **DESPLEGADO** el 2026-10-27
**Origen:** petición de Ruth («el cambio que usamos quítamelo del centro, está muy grande, y
ponlo encima de "pedidos de más de 2000"») ·
plan `docs/superpowers/plans/2026-10-27-el-cambio-encima-del-umbral.md`

> En la **misma sesión** y **antes** de esto se desplegó el sello de oferta `-X%`
> (`1b05146..04a10ea`, caché `v26`). Eso ya está en producción y verificado; lo de este
> informe no.

## TL;DR

La línea del cambio deja de ser un pill de 15 px en mitad de la portada y pasa a una línea
fina de 12 px **pegada encima** de la banda «Pedidos desde 2,000 CUP: mensajería gratis». Las
dos comparten fondo y color, así que se leen como un solo bloque sobre lo que le va a costar
al cliente — y está **más arriba que antes** (y=151 en vez de y=427), así que se ve al entrar
sin bajar nada.

Tests **236/236, exit 0** (mismo número: no se añadieron tests, se endurecieron los de uno
que ya existía). Medido y **mirado** a 375 px en los dos temas, en local y **en el sitio
real**. **Desplegado y verificado en produccion.**

## Cambios realizados

| # | Cambio | Archivos | Motivo |
|---|---|---|---|
| 1 | El `<p>` sale de `.hero` y se pone justo antes de `#promo-envio`; `hero-tasa` → `banda-tasa` | `index.html`, `electripower.html` | Lo pedido. El id viejo mentiría fuera de la portada |
| 2 | `renderHero()` pinta el id nuevo | `app.js` | Mismo `TasaVista.portada()`: el texto no cambia |
| 3 | Se borra `.hero-tasa`; nace `.banda-tasa` (12 px/600, `--brand` sobre `--brand-soft`) | `estilos.css` | Fuera del hero ya no hereda la tinta blanca: necesita par propio |
| 4 | Se borra un comentario huérfano de 4 líneas y se devuelve a `.promo` su encabezado de sección | `estilos.css` | Describían reglas que ya no están donde decían |
| 5 | `CACHE` → `tienda-3b-v27` | `sw.js` | Obligatorio: se tocaron `index.html`, `estilos.css` y `app.js` |
| 6 | El test exige el id nuevo, **el orden** respecto a `#promo-envio`, y que no quede rastro del viejo | `test/tasa.test.js` | El sitio es el requisito, no un detalle |

## Decisiones tomadas y alternativas descartadas

1. **Fuera de `.barra-fija`, a propósito.** Su vecino `#promo-envio` también lo está. Así no
   entra en `--header-h` y **no hay que tocar `medirHeader()`** — el fallo que costó una
   corrección en el trabajo del aviso de regreso, ese mismo día. Comprobado: `--header-h`
   sigue siendo **150,55 px** y la barra real mide **151**.
2. **El mismo par de colores que la banda** (`--brand` sobre `--brand-soft`), y no uno nuevo:
   ese par ya está medido (7,5:1 en claro, 8,4:1 en oscuro) y lo vigila
   `test/colores.test.js`. Inventar un color habría pedido medir otra vez.
3. **Un paso más pequeña que la del umbral** (12 px/600 contra 13 px/700). Si las dos pesaran
   igual competirían; la que manda tiene que seguir siendo la del umbral, que es la que
   empuja a gastar más.
4. **El texto no se tocó.** Lo compone `TasaVista.portada()` y sigue diciendo «Cambio que
   usamos», sin prometer frescura y sin nombrar la fuente, por lo de siempre (el catálogo se
   republica cada ~5 h y un cambio de tasa a mano no republica).
5. **La barrera del test se quedó estricta** (`!css.includes('.hero-tasa')`, sin `{`): un
   nombre de regla mencionado en cualquier sitio del CSS es justo lo que no debe sobrevivir.
   Por eso se reescribió el comentario y **no** se suavizó el test.
6. **Descartado** meter la línea DENTRO de `#promo-envio`: esa banda se oculta cuando no hay
   umbral configurado, y se habría llevado la tasa con ella.

### 🔴 Dos fallos del plan, encontrados por el ejecutor

El ejecutor **paró antes de commitear y preguntó**, en vez de parchear o suavizar el test:

1. **El comentario que el plan mandaba escribir contenía `.hero-tasa`** («Antes esto era
   .hero-tasa, un pill de 15px…») — justo la cadena que la aserción del propio plan prohíbe.
   Batería **235/236**. Arreglado reescribiendo el comentario.
2. **Comentario huérfano**, que el plan no vio: encima de `.hero-tasa` había un bloque de 4
   líneas describiéndolo («Mas peso que los chips de abajo… translucido y no solido…»). Al
   borrar la regla quedó pegado a `.hero-acciones`, **describiendo una regla que ya no
   existe**. Borrado.

De paso, al insertar el bloque nuevo el encabezado `── Banner de mensajería gratis ──` quedó
separado de `.promo`, que es lo que describe; se movió a su sitio.

## Evidencia de verificación

**Baterías**, corridas y observadas **por el piloto** (no por el ejecutor):

```
cd C:\inventario\tienda-3b
node --test
```
```
ℹ tests 236
ℹ pass 236
ℹ fail 0
```

- `grep -rn "hero-tasa" index.html electripower.html app.js estilos.css` → **vacío**
  (en `test/tasa.test.js` quedan las dos aserciones que lo prohíben: eso es correcto).
- `node --check app.js` y `node --check sw.js`: sin salida.
- `git show --stat f9c2520`: los **6** archivos del plan, nada más.

**Navegador**, `npx --yes serve -l 4173 .` a **375×812**, catálogo real (206 productos,
tasa 850):

| Comprobación | Observado |
|---|---|
| Dónde está | `#banda-tasa` en **y=150,55**, pegado bajo la barra fija |
| Encima del umbral | «Pedidos desde 2,000 CUP» en **y=182** |
| Hueco entre las dos | **0 px**, y el mismo `background-color`: se leen como un bloque |
| Tamaño | **24 px** de alto, **12 px/600** (antes: pill de 15 px/700 en el centro) |
| Color | `rgb(122,46,93)` sobre `rgb(247,233,242)` = `--brand` / `--brand-soft` |
| Jerarquía | la del umbral sigue ganando: 13 px/700 contra 12 px/600 |
| `--header-h` | **150,55 px**, igual que la barra real (**151**): `medirHeader()` intacto |
| Desbordes | `scrollWidth` 375 = `clientWidth`; el documento no desborda a 375 px |
| El viejo | `#hero-tasa` **no existe** en ninguna de las dos páginas |
| `/electripower` | el elemento existe, visible, **antes** de `#promo-envio`, sin el id viejo |

**Mirado de verdad** (no solo medido): capturas a 375 px con `deviceScaleFactor 2`, Chrome
del sistema con `puppeteer-core` prestado de `bot-mia`, **en el scratchpad**, en **claro y
oscuro**. El centro de la portada quedó limpio y el bloque de arriba se lee bien en los dos.

⚠ Los errores de consola «An unknown error occurred when fetching the script» son el fantasma
ya documentado (el service worker no se registra sobre `http://` en el panel integrado), no
de este cambio.

## Pendiente / próximos pasos

- [x] **Desplegado** el 2026-10-27 (`542818a..e657796`) y verificado en el sitio real (ver
      abajo). El `origin` habia avanzado a `542818a` («precios por gestor: 1 gestores»), asi
      que hubo `git pull --rebase` y la bateria se volvio a correr contra el catalogo nuevo
      antes del push: **236/236**.
- [ ] 🔴 **De la tarea anterior, sigue abierto:** Ruth tiene que arreglar el dato del
      **«Paquete de 4 Tic-Tacs»** en Stock+ — su «oferta» SUBE el precio (595 → 612 CUP). La
      web ya no lo anuncia como rebaja, pero el producto sigue saliendo en el filtro
      «🏷️ Ofertas» sin serlo.
- [ ] 🔴 **Hallazgo de esta sesión, no pedido:** `precios-gestores.json` ya **no da 404** en
      producción — Stock+ publicó un gestor con recargo (`QGZUQ`). O sea que **la página por
      gestor está VIVA**: quien entre por su enlace ve sus precios, la banda «🤝 Estás en la
      página de…» y el pedido sale a su WhatsApp. Estaba documentado como inerte. Confirmar
      con Ruth que es intencional.
- [ ] De antes: prueba social, promesa de entrega, `ELTOQUE_TOKEN`, y que un cambio de tasa a
      mano republique el catálogo.

## Verificacion EN PRODUCCION (www.3bqba.com, 375x812)

Hecha despues del push con Chrome del sistema y `puppeteer-core` en el scratchpad, en los
**dos temas**, y con **dos cargas** por tema para atrapar el desfase del service worker:

| Comprobacion | Observado |
|---|---|
| Cache servida | `const CACHE = 'tienda-3b-v27';` |
| Corre el codigo nuevo | `renderHero.toString()` contiene `banda-tasa` en **las cuatro** cargas |
| HTML servido | `id="banda-tasa"` en la linea 134, `id="promo-envio"` en la 135 |
| El viejo | `#hero-tasa` **no existe**; `estilos.css` servido: 1 `banda-tasa`, **0** `hero-tasa` |
| Donde esta | `top=150,55`, alto **24 px**, ancho 375 |
| Texto | `💵 Cambio que usamos: 1 USD = 850 CUP` |
| Encima del umbral | «Pedidos desde 2,000 CUP» en `top=174`; hueco entre las dos: **0 px** |
| Jerarquia | 12 px/600 contra 13 px/700: sigue mandando la del umbral |
| Color claro | `rgb(122,46,93)` sobre `rgb(247,233,242)` |
| Color oscuro | `rgb(233,168,206)` sobre `rgb(46,27,41)` |
| `--header-h` | **150,546875** = la barra real (**150,55**): `medirHeader()` intacto |
| Desbordes | 0 px a 375 px |
| `/electripower.html` | igual: visible, antes de `#promo-envio`, sin el id viejo |

**Mirado como imagen** en claro y en oscuro: el centro de la portada quedo limpio y las dos
lineas se leen como un solo bloque bajo el buscador.

⚠ En la primera carga en claro la banda salia vacia a los 2 s: es el catalogo, que aun no
habia llegado — no el desfase del service worker (el codigo ya era el nuevo en esa carga).
**Nunca se pulso «Pedir por WhatsApp»**; no salio ningun pedido.

## Riesgos y gotchas nuevos

- 🔴 **`.banda-tasa` vive FUERA de `.barra-fija`.** Si alguien la mete dentro «para que viaje
  pegada arriba», tiene que llamar a `medirHeader()` o la cabecera tapará contenido.
- 🔴 **El comentario de `.banda-tasa` no puede nombrar `.hero-tasa`**: hay un test que falla
  si esa cadena aparece en `estilos.css`. No es un capricho del test, es la forma de que la
  regla vieja no resucite a medias.
- El test de `tasa.test.js` ahora comprueba **el orden** (`banda-tasa` antes que
  `promo-envio`) en las dos páginas: mover una de las dos cosas sin la otra falla.

## Cómo retomar

```bash
cd C:\inventario\tienda-3b
git log --oneline -3      # debe empezar en f9c2520
node --test               # 236/236, exit 0
```

## Lo que NO se verificó

- ⚠ **Ningún teléfono real**; todo en Chrome de escritorio con viewport emulado a 375 px.
- ⚠ **Sin probar sin conexión.**
- ⚠ El contraste del par `--brand`/`--brand-soft` **no se midió en esta sesión**: se reusa el
  que ya mide `test/colores.test.js` y que anota el CSS.
