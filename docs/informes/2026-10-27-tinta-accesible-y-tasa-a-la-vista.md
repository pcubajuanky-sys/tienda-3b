# 2026-10-27 — Tinta accesible y la tasa de cambio a la vista

**Sesión:** piloto Opus (plan, verificación e informe) + dos ejecutores Sonnet (código) · **Commit inicial → final:** `63daaef` → `a5c6fb1` · **Rama:** `tinta-y-tasa`, **SIN PUSH**
**Origen:** petición de Ruth (más ganchos de venta, mejor experiencia, enseñar la tasa, juicio de los colores) → revisión `docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md` → plan `docs/superpowers/plans/2026-10-27-tinta-accesible-y-tasa-a-la-vista.md` (tandas 1 y 2)

## TL;DR

Dos cosas. **(1)** El botón «Pedir por WhatsApp» —el único checkout que tiene esta tienda— estaba en **1.98:1** en modo oscuro y en **4.14:1** en claro, por debajo del mínimo legible en los dos temas; el sello OFERTA, en **2.23:1** en oscuro. Los dos por tinta blanca escrita a mano contra un token de fondo que sí se invierte. Arreglado con tokens de tinta (`--wa-ink`, `--oferta-ink`), más `--text-3` subido a AA en modo claro y un `--error` separado del rojo de las ofertas. **(2)** La tasa de cambio con la que están calculados los precios ya se ve, en tres sitios: el chip de la portada, el aviso del pie y debajo del total del carrito. El número ya viajaba en `catalogo.json`: **no se tocó Stock+**.

Batería: **199/199, exit 0** (corrida y observada por el piloto). Verificado en navegador a 375 px en los dos temas. **Nada desplegado**: la rama está sin push, y publicar lo decide Ruth.

## Cambios realizados

| # | Cambio | Archivos | Motivo |
|---|---|---|---|
| 1 | Prueba nueva que **lee los tokens de `estilos.css` y calcula el contraste WCAG 2.1** (6 pruebas) | `test/colores.test.js` (nuevo) | El CSS ya anotaba contrastes en comentarios, y un comentario no falla cuando alguien lo rompe |
| 2 | `--oferta-ink` (claro `#FFFFFF`, oscuro `#2A0E20`) y `.card-oferta` deja de escribir `#fff` | `estilos.css` `:root` claro y oscuro; `.card-oferta` (~l. 706) | El sello daba 2.23:1 en oscuro: ilegible, con 17 sellos vivos en la parrilla |
| 3 | `--wa` de `#128C7E` a `#0E7566`; `--wa-ink` (claro `#FFFFFF`, oscuro `#1C1A22`); `.btn-wa` usa el token | `estilos.css` `:root` claro y oscuro; `.btn-wa` (l. 199) | Botón de cobrar: 1.98:1 en oscuro y 4.14:1 en claro. `--wa` además es el COLOR de texto de «🛵 MENSAJERÍA GRATIS», `.envio-detalle`, el enlace del pie y `.enc-dominio` |
| 4 | `--text-3` de `#857D89` a `#6F6773` (solo tema claro) | `estilos.css` `:root` claro | Daba 3.72/3.42:1 y pinta el total en USD del carrito y la nota de la tasa a 11–12 px |
| 5 | `--error` nuevo (claro `#B3261E`, oscuro `#FF8A80`); 6 reglas pasan de `--oferta` a `--error` | `estilos.css`: `.campo input.invalido`, `.campo textarea.invalido`, `.campo-error`, `.campo select.invalido`, `.enc-quitar`, `.btn-texto:hover`, `.btn-vaciar:hover` | El rojo de «qué oportunidad» era el mismo que el de «te equivocaste» y «vas a borrar» |
| 6 | Módulo puro `TasaVista` con `valida`, `numero`, `chip`, `aviso`, `carrito` + 7 pruebas | `tasa.js` (nuevo), `test/tasa.test.js` (nuevo) | Que el texto de la tasa se pueda probar sin navegador, y que el fallback sea imposible de romper |
| 7 | Cableado en tres puntos: chip de la portada, aviso del pie, nota bajo el total en USD | `app.js` l. 1206 (`usdLineaHtml`), l. 1938, l. 2094; `index.html` l. 182/321/508; `electripower.html` l. 182/323/491; `.total-tasa` en `estilos.css` l. 934 | La tasa estaba cargada en la página y no se enseñaba; la única frase que la mencionaba era vaga y estaba en el pie |
| 8 | `/tasa.js` en `ARMAZON` y `CACHE` a `tienda-3b-v23` | `sw.js` l. 11 y l. 33 | Regla permanente del repo: todo cambio en el armazón obliga a subir la caché, o los clientes siguen viendo el código viejo |

Commits (pathspec explícito en todos):

```
a5c6fb1 chore(sw): cache a tienda-3b-v23 (tinta accesible y tasa a la vista)
02b2d30 feat(tasa): la tasa a la vista en la portada, el pie y el carrito
89e51d9 feat(tasa): modulo puro con los textos de la tasa de cambio
c070bfc fix(color): el rojo de error deja de ser el rojo de las ofertas
35e9dcb fix(color): el gris tenue llega a AA en modo claro
3f5a145 fix(color): el boton de pagar y el sello OFERTA se leen en modo oscuro
```

## Decisiones tomadas y alternativas descartadas

**🔴 La tasa que se enseña es «con la que están calculados estos precios», NUNCA «la tasa del día».** No es una cuestión de estilo. `catalogo.json` se republica cada 5 h (`webAutoHoras = 5` en Stock+) y, verificado leyendo `server.js`, **un cambio de tasa a mano NO republica el catálogo**: el `PUT /api/config` sella `manualTs` pero no llama a `publicarAhora`. Solo republican la tasa automática, el botón «Aplicar N» y el reloj de 5 h. Así que puede haber un rato con el número viejo junto a unos precios viejos — correcto, y útil, **mientras la etiqueta lo diga así**. Se descartó «Tasa del día: 845 CUP» por prometer una frescura que no tenemos.

**🔴 No se menciona elTOQUE en ninguna parte, y es a propósito.** Stock+ tiene la lectura automática (`lib/tasaFuente.js`, `lib/tasaAuto.js`, encendida: `config.tasaAuto.activo = true`) pero **hoy no funciona**: `ultima.accion = 'nada'`, `motivo = 'sin-red'`, y **`ELTOQUE_TOKEN` no está en el `.env`**. El número lo pone Ruth a mano. Atribuírselo a elTOQUE sería inventar una fuente.

**Sin tasa, la página se ve exactamente como antes.** El texto de reserva se queda escrito en el HTML (`Precios en CUP y USD`, `Los precios pueden variar según la tasa del día.`) y el JS solo lo pisa si la tasa es válida. Se descartó generar el texto entero desde JS: si el módulo no cargara, quedaría un hueco.

**`valida()` exige tasa > 1, no > 0.** En este catálogo `tasa: 1` significa «sin conversión»; enseñar «1 USD = 1 CUP» sería absurdo.

**El verde de WhatsApp sube de tono (`#128C7E` → `#0E7566`), no se cambia solo la tinta.** Se descartó dejar `--wa` quieto y arreglar únicamente el botón: ese token también pinta TEXTO a 12–13 px en cuatro sitios, incluido el chip «🛵 MENSAJERÍA GRATIS», que es una señal de venta. Con el verde anterior ese texto estaba en 4.14:1. Se eligió `#0E7566` y no uno más hondo porque es el valor más claro que pasa 4.5:1 en los **tres** fondos del tema claro (4.82:1 sobre `--surface-2`, el peor caso) sin dejar de leerse como WhatsApp.

**El «Queda 1» se queda con `--oferta`.** Se separó el rojo de *error*, no el de *escasez*: «Queda 1» es una señal de venta, no un aviso de que algo va mal.

**La nota de la tasa en el carrito va en su propia línea, no pegada al total.** A 375 px, `≈ $12.34 USD · 845 CUP por USD` se parte justo donde la clienta mira el dinero.

**El contraste se prueba calculándolo, no comparando cadenas.** La alternativa (un test que exija `color:var(--wa-ink)` y nada más) deja pasar un token mal elegido. La prueba hace las dos cosas: calcula el contraste de los tokens **y** exige que las reglas los usen, porque los números solo valen si las reglas no escriben el color a mano.

## Evidencia de verificación

**Baseline medida antes de tocar nada** (`node --test` desde la raíz): `tests 186 / pass 186 / fail 0`, exit 0.

**Batería completa al final, corrida y observada por el piloto:**

```
ℹ tests 199
ℹ pass 199
ℹ fail 0
ℹ duration_ms 9715.5274
EXIT=0
```

199 = 186 de base + 6 de `colores.test.js` + 7 de `tasa.test.js`. **Cero fallos preexistentes.**

**TDD observado por el ejecutor en cada paso** (pruebas vistas fallar antes de implementar): `falta el token --wa-ink en el :root claro`; `--text-3 claro sobre --bg: #857D89 sobre #FAF7F5 da 3.72:1, hace falta 4.5:1`; `falta el token --error en el :root claro`; `ENOENT ... tasa.js`; `falta el chip de la portada`.

**Lectura directa de los artefactos por el piloto** (no el resumen del ejecutor):

```
$ grep -c "var(--error)" estilos.css   → 6
$ grep -c "var(--oferta)" estilos.css  → 2   (.card-quedan y el background de .card-oferta)
l. 199  .btn-wa{background:var(--wa);color:var(--wa-ink)}
l. 707  background:var(--oferta);color:var(--oferta-ink);
$ node --check sw.js → sintaxis OK
$ git diff 63daaef..HEAD -- sw.js → exactamente 2 líneas: CACHE v22→v23 y '/tasa.js' en ARMAZON
```

**En navegador, servidor local (`npx serve -l 4173`) a 375 px, observado por el piloto:**

- **Claro, portada:** el chip dice `Precios en CUP y USD · 1 USD = 825 CUP`, en una sola línea, sin desborde. (825 porque la copia local de `catalogo.json` es la del 22/10; en producción hoy es 845.)
- **Oscuro, carrito:** bajo `Total 4,125 CUP` y `≈ $5.00 USD` aparece `825 CUP por USD` a 11 px en `rgb(148,138,147)`, una sola línea.
- **Oscuro, botón de pagar:** `getComputedStyle(document.querySelector('#btn-enviar'))` → `backgroundColor: rgb(37, 211, 102)`, `color: rgb(28, 26, 34)`, 17 px. **Y se miró la captura**: «Pedir por WhatsApp» en tinta oscura sobre el verde, legible de un vistazo. Antes era blanco sobre ese mismo verde.
- **Oscuro, sello OFERTA:** `color: rgb(42, 14, 32)` sobre `rgb(255, 138, 166)`.
- **Claro, chip de mensajería:** `rgb(14, 117, 102)` = `#0E7566`.
- **Claro, errores de formulario:** `rgb(179, 38, 30)` = `#B3261E`, distinto del sello OFERTA claro `rgb(200, 30, 76)` = `#C81E4C`.
- **Catálogo sin tasa:** borrada la línea `"tasa"`, el chip vuelve a `Precios en CUP y USD` a secas, el pie a su frase de siempre, hay 0 elementos `.total-tasa` y **ningún `undefined` ni `NaN`** en la página. `catalogo.json` restaurado con `git checkout --` y comprobado con `git status`.
- **`electripower.html`:** chip y aviso con el número, igual que la tienda de la casa.
- El ejecutor repitió las comprobaciones de navegador tras desregistrar service workers, vaciar cachés y `localStorage`, para no estar mirando código viejo.
- Se limpió el `localStorage` del navegador de prueba al terminar (`carrito`, `pedidoEnviado`, `direcciones`): comprobado vacío. **No se pulsó «Pedir por WhatsApp»** en ningún momento; cuando el ejecutor probó la validación del formulario sustituyó `window.open` por un contador (llamadas: 0), así que **no se envió ningún pedido falso al WhatsApp de la tienda**.

**Un falso positivo descartado con evidencia.** El ejecutor reportó errores en consola del tipo *«An unknown error occurred when fetching the script»*. Reproducidos por el piloto y **diagnosticados**: es el registro del service worker, que falla **solo sobre `http://127.0.0.1:4173`** en el navegador integrado (`navigator.serviceWorker.register('/sw.js')` → `An unknown error occurred when fetching the script`, con `/sw.js` respondiendo 200 y `content-type: application/javascript`). El **mismo navegador registra el service worker sin problema sobre `https://www.3bqba.com`** (`registroOk: true`, `scope: https://www.3bqba.com/`), y la consola de producción está limpia. **No es una regresión de este trabajo**: el fallo ocurre al *descargar* el script, antes de tocar la lista `ARMAZON`.

## Pendiente / próximos pasos

- [ ] **Desplegar.** La rama `tinta-y-tasa` está **sin push** a propósito: publicar pone esto en producción para todas las clientas y lo decide Ruth. Para desplegar: `git checkout main && git merge tinta-y-tasa && git push`. Criterio de éxito: en `https://www.3bqba.com`, `getComputedStyle(document.querySelector('#btn-enviar')).color` da `rgb(28, 26, 34)` y el chip de la portada lleva el número. 🔴 **La primera carga tras el despliegue corre el código VIEJO** (el service worker anterior sirve su caché mientras el nuevo se instala): hace falta una segunda recarga antes de dudar del cambio.
- [ ] **Conseguir `ELTOQUE_TOKEN`** y comprobar una lectura real (`POST /api/tasa/leer-ahora` en Stock+). Solo entonces tiene sentido publicar la fuente y la fecha de la tasa y decir «según elTOQUE». Criterio: `config.tasaAuto.ultima.fuente === 'eltoque'` con `accion` distinta de `nada`.
- [ ] **Republicar el catálogo al cambiar la tasa a mano** (`server.js`, `PUT /api/config`): hoy el hueco es de hasta 5 h y ahora el número es visible. Criterio: cambiar la tasa en el panel y ver `config.webUltimaPub.ts` moverse.
- [ ] Los ganchos de la revisión del 27/10 que **no** entraron aquí: prueba social con los 196 pedidos reales (§3.2, necesita Stock+), el plazo de entrega (§3.3, **lo decide Ruth**, hoy la tienda no dice *cuándo* llega nada), y llevar el aviso de «te faltan X» a la ficha (§3.1.2).
- [ ] Sigue abierto de la revisión del 22/10: A3 (el sello OFERTA no dice cuánto se ahorra), A4 (sello NUEVO), A5 (el grupo de WhatsApp solo está en el pie), B1, B2, B3, B4, B5.
- [ ] **Decidido NO hacer en esta tanda:** tocar la portada, el ciruela, las sombras o la tipografía. Están medidos y funcionan (30 de 37 pares de color pasan AA, la mayoría AAA); rediseñar la marca sería gastar en lo único que ya no es el problema.

## Riesgos y gotchas nuevos

- 🔴 **Nunca escribas `color:#fff` contra un token que se invierte en modo oscuro.** Es exactamente lo que falló aquí, en los dos sitios que más venden. El patrón de la casa es un token de tinta por cada token de fondo (`--brand-ink`, y desde hoy `--wa-ink` y `--oferta-ink`). `test/colores.test.js` ahora lo impide en esas dos reglas; si añades un fondo de color nuevo, añade su tinta **y su par al test**.
- 🔴 **`--wa` no es solo un fondo de botón:** es color de texto en cuatro sitios a 12–13 px. Si alguien lo aclara para «parecerse más al verde de WhatsApp», el chip «🛵 MENSAJERÍA GRATIS» vuelve a caer por debajo de AA. El test lo cubre.
- 🔴 **La convención de «comentarios sin acentos en los módulos puros» que el plan daba por buena es FALSA.** Comprobado: de 7 módulos, `completar.js` (3), `espera.js` (13), `listo.js` (3), `preguntar.js` (3) y `traspedido.js` (1) tienen comentarios acentuados; solo `faltante.js` y `direcciones.js` no. El plan la enunció a partir de un solo archivo. `tasa.js` quedó con acentos, como la mayoría del repo. **No hay nada que arreglar**; lo que hay que corregir es la regla inventada.
- **El service worker NO se registra sobre `http://` en el navegador integrado**, aunque sea `127.0.0.1` y `isSecureContext` sea `true`. Si pruebas en local y ves *«An unknown error occurred when fetching the script»*, no persigas un fantasma: no es tu cambio.
- **La copia local de `catalogo.json` se queda atrás.** La publica Stock+ por GitHub; si no haces `git pull`, pruebas contra precios y tasa viejos (en esta sesión: 825 en local, 845 en producción). No confundas eso con un fallo.
- **`electripower.html` no carga los mismos módulos que `index.html`** (le faltan `completar.js` y `listo.js`) pero **sí comparte `app.js`**. Cualquier `getElementById` nuevo en `app.js` tiene que tener su elemento en **las dos** páginas, o el guard correspondiente. Aquí los tres cableados llevan guard (`if (el)` o `window.TasaVista &&`).

## Cómo retomar

```bash
cd "C:\inventario\tienda-3b"
git checkout tinta-y-tasa
node --test          # tiene que dar 199/199, exit 0
```

Primer archivo a leer: `docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md` — ahí está, con los números medidos, todo lo que NO entró en esta tanda y en qué orden conviene hacerlo. El plan ejecutado, con las casillas marcadas, está en `docs/superpowers/plans/2026-10-27-tinta-accesible-y-tasa-a-la-vista.md`.

## Lo que esta sesión NO verificó

- ⚠ **Ningún teléfono real.** Todo en Chrome de escritorio con viewport emulado a 375 px y `prefers-color-scheme` emulado.
- ⚠ **No se envió ningún pedido** ni se pulsó «Pedir por WhatsApp» de verdad.
- ⚠ **No se probó sin conexión** (el modo offline del service worker con `/tasa.js` en la caché) — en local el service worker ni se registra, ver arriba.
- ⚠ **No está desplegado.** La rama está sin push y en producción sigue corriendo el código anterior.
