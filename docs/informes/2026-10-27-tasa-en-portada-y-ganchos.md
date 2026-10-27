# 2026-10-27 — La tasa en la portada y tres ganchos de venta

**Sesión:** Opus 5 pilotando · ejecutor Sonnet 5.5 (un solo agente, reusado) ·
**Commit inicial → final:** `0f38032` → `b97f359`, rama **`tasa-portada-y-ganchos`**, **SIN PUSH**
**Origen:** petición del usuario («en la portada ponme el cambio de cup por usd, quiero que el
cliente vea eso apenas entre» + «dale con los ganchos de venta») · plan
`docs/superpowers/plans/2026-10-27-tasa-en-portada-y-ganchos.md` · revisión
`docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md` §3.1.2, §3.4 y §3.5.

## TL;DR

El cambio CUP↔USD pasa de ser el tercer chip de la portada (12 px, en `y=520`, por debajo de
los botones) a una línea propia de 15 px en negrita **encima** de los botones. Más tres ganchos
de venta que no dependen de ninguna decisión de negocio: la ficha dice cuánto falta para la
mensajería gratis, se saluda a quien vuelve con el carrito puesto, y la tira de relacionados
deja de enseñar solo dólares. Y se cerró **una mina en producción**: `/electripower` no cargaba
cuatro de los módulos que `app.js` usa, y se habría quedado en blanco el día que se publicara
su primer producto.

Tests **224/224, exit 0** (baseline 199). Verificado en navegador a 375 px en los dos temas:
las cuatro ramas de la frase del umbral, el ciclo completo del aviso de regreso y los precios
en CUP de la tira. **Nada desplegado: la rama está sin push y el despliegue necesita el visto
bueno de Ruth.**

## Cambios realizados

| # | Cambio | Archivos | Motivo |
|---|---|---|---|
| 1 | `TasaVista.portada()` sustituye a `chip()`; línea nueva `#hero-tasa` entre el subtítulo y los botones; el `<li>` vuelve a su texto fijo y pierde el `id` | `tasa.js`, `index.html`, `electripower.html`, `estilos.css`, `app.js` (`renderHero`), `test/tasa.test.js` | Medido en producción: la tasa caía en `y=520`, a 12 px y de tercera. Se veía; no la veía nadie |
| 2 | Módulo puro `umbral.js` + `pintarUmbralFicha()` + `#ficha-umbral` | `umbral.js`, `app.js`, las dos páginas, `estilos.css`, `test/umbral.test.js` | Sobre 196 pedidos de 30 días la mediana del pedido web cae **clavada** en el umbral y el 43 % queda por debajo. El aviso solo existía en el carrito, que es el final del camino |
| 3 | Módulo puro `regreso.js` + `saludarSiVuelve()` + `#aviso-regreso` | `regreso.js`, `app.js`, las dos páginas, `estilos.css`, `test/regreso.test.js`, `test/colores.test.js` | El carrito ya sobrevivía en `localStorage`, pero a quien volvía otro día la tienda no le decía nada |
| 4 | `Relacionados.precioTexto()`: la tira siempre en CUP | `relacionados.js`, `app.js`, `test/relacionados.test.js` | **189 de 209 productos** son `moneda: 'usd'` → la tira enseñaba `$5` y ni un CUP, justo en el upsell |
| 5 | `electripower.html` carga los 4 módulos que le faltaban + los 2 nuevos; `test/paginas.test.js` compara una lista única contra las dos páginas y contra `ARMAZON`; `CACHE` → `tienda-3b-v24` | `electripower.html`, `index.html`, `sw.js`, `test/paginas.test.js` | Ver «Hallazgo» abajo |
| 6 | Las tres rutas del aviso de regreso llaman a `medirHeader()` | `app.js`, `test/regreso.test.js` | **Fallo del plan**, ver «Decisiones» |
| 7 | Se borra `CHIP_BASE`, muerto al sustituir `chip()` por `portada()` | `tasa.js` | Código muerto creado en esta misma sesión |

## 🔴 Hallazgo: `/electripower` era una mina

Comprobado **en el sitio vivo** antes de tocar nada: `https://www.3bqba.com/electripower`
comparte `app.js` con la tienda de la casa pero **no cargaba `espera.js`, `preguntar.js`,
`completar.js` ni `listo.js`**. No se notaba porque su catálogo tiene **0 productos**
(`CAT.items.length === 0`, medido), así que `renderGrid` no dibuja ni una tarjeta.

`avisoQuedanHtml()` (`app.js:489`) llama a `Espera.enEspera` **sin guarda**. Con el primer
producto publicado de Electripower, esa página se habría quedado en blanco con un
`ReferenceError` en mitad de la parrilla.

Entraba en el alcance igualmente: los dos módulos nuevos los usa `app.js` **en cada carga**
(`regreso.js`) y en cada ficha (`umbral.js`), así que cablearlos solo en `index.html` habría
roto Electripower **ya**, sin esperar a ningún producto.

**La barrera es `test/paginas.test.js`, no los seis `<script>`**: una lista única de lo que
`app.js` da por cargado, comprobada contra las dos páginas, contra `ARMAZON` y contra el disco.

## Decisiones tomadas y alternativas descartadas

- **El chip pierde el número, no lo duplica.** Con la línea grande diciendo la tasa, dejar el
  chip con «· 1 USD = 845 CUP» repetía la misma cifra 80 px más abajo. El `<li>` se queda con
  «Precios en CUP y USD», que dice otra cosa. Por eso `chip()` **se borró**: mantenerlo sería
  código muerto con tests que no protegen nada.
- **«Cambio que usamos», nunca «la tasa de hoy» ni «según elTOQUE».** Mismo compromiso que el
  27/10: el catálogo se republica cada 5 h y un cambio de tasa a mano en Stock+ **no** lo
  republica, así que prometer frescura sería mentir a ratos. Y la lectura automática de elTOQUE
  está encendida pero no funciona (falta `ELTOQUE_TOKEN`): el número lo pone Ruth a mano.
- **La frase del umbral habla de ESTE producto y da la cifra de DESPUÉS de añadirlo.** Decir
  «te faltan 2.000» en la ficha de algo que cuesta 203 sería contar un carrito que la clienta
  ya no va a tener. Verificado: con el carrito vacío y un producto de 203 CUP dice **1.797**.
- **La tira de relacionados solo CUP, no «$5 · 4.225 CUP».** La tarjeta mide ~100 px: dos
  cifras se parten. Y es lo que ya hace la tira de «completa tu mensajería», así que las dos
  se leen igual.
- **Ventana del saludo: 6 horas.** Una recarga, un cambio de pestaña o un paseo por el catálogo
  no son volver. Un aviso que reaparece al tocar «atrás» es lo que hace odiosa esta función.
- **La marca de visita se escribe SIEMPRE al cargar**, se salude o no. Si solo se escribiera al
  saludar, la segunda visita del mismo día volvería a saludar.
- **Descartado a propósito, por no ser decisión del código:** la prueba social («196 pedidos
  entregados este mes») la tendría que calcular y publicar Stock+ — escrita a mano se congela y
  miente; la promesa de entrega («24–48 h») es un dato del negocio; y subir o escalonar el
  umbral de 2.000 CUP tiene riesgo real sobre los 85 pedidos pequeños al mes.

### Dos fallos del plan, cazados al ejecutar y al revisar

1. 🔴 **`medirHeader()` olvidado en las tres rutas del aviso de regreso** (fallo mío, de
   planificación). `#aviso-regreso` vive **dentro de `.barra-fija`**, igual que `#aviso-ajuste`,
   y `--header-h` sale de `medirHeader()`. Todas las demás piezas de esa barra lo llaman
   (`mostrarAvisoTexto` `app.js:1188`, `pintarCierre` `app.js:1507`, el cierre del aviso de
   ajuste `app.js:2335`) y el plan no lo pidió. Sin ello la cabecera tapaba contenido al
   aparecer el aviso y dejaba **62 px** de hueco al cerrarlo. Corregido en `b97f359`, con test
   que exige las tres rutas.
2. **El anclaje de `saludarSiVuelve()`.** El plan decía «justo antes de
   `function preguntarSiEnvio() {`»; seguido al pie de la letra, el bloque nuevo se metía
   **entre el comentario de `preguntarSiEnvio` y su función**, dejando ese comentario
   describiendo la función equivocada. El ejecutor lo vio, lo puso por encima del comentario y
   lo reportó. Desviación aprobada.

También: los números de línea del plan estaban desfasados (el repo había avanzado 262 commits).
Se ancló todo por texto. **Para el próximo plan: anclar por texto desde el principio.**

## Evidencia de verificación

**Baterías** (corridas y observadas por el piloto, no por el ejecutor):

```
cd C:\inventario\tienda-3b
node --test
```
- Baseline antes de empezar: **199 tests, 199 pass, 0 fail, exit 0**
- Tras Task 1: 199/199 · Task 2: 208/208 · Task 3: 218/218 · Task 4: 221/221 ·
  Task 5: 224/224 · tras el arreglo de `medirHeader`: **224 tests, 224 pass, 0 fail, exit 0**

`node --check` de `app.js`, `sw.js`, `umbral.js`, `regreso.js`, `tasa.js` y `relacionados.js`:
sin salida, exit 0.

**Diffs leídos por el piloto** (no el resumen del ejecutor): `git diff` de los seis commits
coincide con el plan; `sw.js` toca exactamente `CACHE = 'tienda-3b-v24'` más `/umbral.js` y
`/regreso.js` en `ARMAZON`.

**Navegador**, `npx --yes serve -l 4173 .` + panel a **375×812**, catálogo real de producción
(209 productos, tasa 845):

| Comprobación | Observado |
|---|---|
| Línea del cambio | `💵 Cambio que usamos: 1 USD = 845 CUP` · 15 px/700 · 314×34 px · **una línea** · `top=427`, **encima** de los botones (`top=477`) |
| El número no se repite | El chip dice solo `Precios en CUP y USD` (142 px) |
| Umbral, carrito vacío, producto de 203 CUP | «Añádelo y te faltarán **1.797** CUP para la mensajería gratis» (2000 − 0 − 203) |
| Repintado al pulsar «Añadir» | pasa a «te faltarán **1.594** CUP» (2000 − 203 − 203) sin cerrar la ficha |
| Producto que cruza (2.028 CUP) | «🎉 Añádelo y tu pedido lleva mensajería gratis» |
| Umbral ya alcanzado (carrito 2.535 CUP) | «🎉 Tu pedido ya lleva mensajería gratis» |
| Transporte aparte (Bicicleta Eléctrica) | **oculto**, sin promesa |
| Tira de relacionados | `608 CUP · 203 CUP · 1,690 CUP · 2,535 CUP · 1,690 CUP · 1,943 CUP` — **las seis en CUP** (189 de 209 productos son `moneda: usd`) |
| Aviso de regreso (marca de hace 7 h, 3 unidades) | «Tienes 3 productos esperando en tu pedido», botón 102×36, ✕ 44×44, sin desborde a 375 px |
| 🔴 `--header-h` con el aviso visible | `212.55px` contra `.barra-fija` real de **213 px** → coinciden |
| 🔴 `--header-h` tras cerrarlo | `150.55px` contra **151 px** → coinciden (sin el arreglo se habría quedado en 212,55) |
| «Ver mi pedido» | abre el carrito y oculta el aviso |
| El «atrás» del teléfono | cierra el carrito y **sigue en la tienda** (`host` sin cambiar) |
| Recargar | **no** vuelve a saludar (la marca ya es de hace 76 s) |
| Modo **claro** | `.ficha-umbral` en `rgb(14,117,102)` (#0E7566, el `--wa` medido AA); botón «Ver mi pedido» `rgb(122,46,93)` con tinta blanca |
| Modo **oscuro** | `.ficha-umbral` en `rgb(37,211,102)`; botón `rgb(233,168,206)` con tinta `rgb(42,14,32)` |
| `/electripower` | los **7** módulos definidos (`Espera`, `Preguntar`, `Completar`, `Listo`, `Umbral`, `Regreso`, `TasaVista`); `avisoQuedanHtml()` con un producto de mentira **en memoria** devuelve `"string"` en vez de lanzar → la mina está desactivada |
| Clave por negocio | apareció `ultimaVisita:electripower` aparte de `ultimaVisita` → la marca es por negocio, como el carrito |

Captura de la portada hecha con el Chrome del sistema (`--headless=new --screenshot`, archivo en
el scratchpad): se ve la píldora del cambio entre el subtítulo y los botones, con más peso que
los chips de abajo. **La captura sale recortada por la derecha** (Chrome sin ventana no respeta
`--window-size=375`); el encaje a 375 px está probado por medición, no por esa imagen.

`localStorage` del navegador de prueba vaciado al terminar (`Object.keys(localStorage)` → `[]`).
**En ningún momento se pulsó «Pedir por WhatsApp»**, y todo fue contra `127.0.0.1`, no contra
producción.

## Pendiente / próximos pasos

- [ ] **Decidir el despliegue.** La rama `tasa-portada-y-ganchos` está **sin push**. Para
      desplegar: `git checkout main; git pull --ff-only; git merge tasa-portada-y-ganchos;
      node --test; git push origin main`. 🔴 Tras publicar, **la primera carga sigue corriendo
      el código viejo**: hay que recargar una segunda vez (comprobar con
      `caches.keys()` → `tienda-3b-v24` y `saludarSiVuelve.toString()`).
- [ ] **Mirar con ojos lo que aquí solo está medido**: la frase del umbral y la banda de regreso
      como píxeles, y cualquier cosa en un teléfono real.
- [ ] **Conseguir `ELTOQUE_TOKEN`** y correr `POST /api/tasa/leer-ahora` en Stock+. Hasta
      entonces la tasa es manual y la página no puede atribuírsela a elTOQUE.
- [ ] **Que `PUT /api/config` republique el catálogo** cuando Ruth cambia la tasa a mano. Ahora
      el número está en grande en la portada, así que la ventana de hasta 5 h se nota más.
- [ ] Ganchos que siguen fuera, y por qué: **prueba social** (196 pedidos del mes — lo tiene que
      publicar Stock+), **promesa de entrega** (decisión de Ruth) y **escalonar o subir el
      umbral** (decisión de Ruth, con riesgo sobre los 85 pedidos pequeños al mes).
- [ ] Del 22/10 sigue abierto: A3 (importe del descuento en el sello OFERTA), A4 (sello NUEVO),
      A5 (el grupo de WhatsApp enterrado en el pie) y B1–B5.
- [ ] Decidido **NO hacer**: llevar `ficha-listo` y `ficha-preguntar` a `electripower.html`.
      Sus pintores ya salen limpios si el hueco no existe (`if (!caja) return;`), así que no hay
      nada roto; es una tarea aparte con su propia decisión.

## Riesgos y gotchas nuevos

- 🔴 **Cualquier cosa que entre o salga de `.barra-fija` tiene que llamar a `medirHeader()`.**
  Es el fallo que se coló en este plan. Hay test en `test/regreso.test.js` para el aviso de
  regreso, pero no para una pieza futura: si añades otra banda ahí, acuérdate.
- 🔴 **`itemsCarrito()` no resuelve una clave de carrito que sea el `id` pelado de un producto
  CON variantes** (necesita `id|CLAVE`). Me costó un falso positivo al verificar: escribí
  `carrito[id]=1` a mano sobre un producto con variantes y `totalCarritoElegible()` devolvió
  **0**, lo que parecía un fallo de la rama «umbral ya alcanzado». No lo era: era la prueba. Usa
  `addCarrito()` o un producto sin variantes.
- **Chrome sin ventana no respeta `--window-size=375`** en esta máquina: la captura sale de una
  página maquetada a ~500 px y recortada. Para medir a 375 px, el panel con
  `javascript_exec`; la captura solo sirve para mirar la jerarquía.
- El `localStorage` del aviso usa la clave **`ultimaVisita`** (y `ultimaVisita:<negocio>` en la
  tienda del socio). Vive solo en el navegador de la clienta, como el carrito y las direcciones:
  en Safari se borra solo a los 7 días sin visita salvo con la tienda instalada.
- Los seis «An unknown error occurred when fetching the script» de la consola en local son el
  **service worker, que no se registra sobre `http://` en el navegador integrado** — gotcha ya
  documentado el 27/10. No es una regresión.

## Cómo retomar

```bash
cd C:\inventario\tienda-3b
git log --oneline -7          # debe terminar en b97f359
node --test                   # 224/224, exit 0
```

Primer archivo a leer si hay que seguir: el plan
`docs/superpowers/plans/2026-10-27-tasa-en-portada-y-ganchos.md`, que lleva al final la lista de
lo que deliberadamente quedó fuera y por qué.

## Lo que NO se verificó

- ⚠ **Ningún teléfono real.** Todo en Chrome de escritorio con viewport emulado a 375×812.
- ⚠ **Nada desplegado.** La rama está sin push; el `CACHE = v24` no se ha probado contra el
  service worker real, solo por test de texto.
- ⚠ **Nadie ha MIRADO** la frase del umbral ni la banda de regreso como imagen: están medidas
  (texto, color, tamaño, posición, sin desborde) pero no vistas.
- ⚠ **Sin probar sin conexión.** `/umbral.js` y `/regreso.js` están en `ARMAZON` por test de
  texto; no se ha cargado la tienda en modo avión.
- ⚠ **La tienda de Electripower sigue con 0 productos**, así que la parrilla con tarjetas de
  verdad allí no se ha visto nunca. Lo que sí se probó es que `avisoQuedanHtml()` ya no lanza.
- ⚠ Ningún mensaje de WhatsApp enviado, ningún pedido real.
