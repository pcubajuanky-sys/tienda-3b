# El botón «atrás» cierra lo abierto + la búsqueda sin resultados vende

**Fecha:** 2026-10-18 · **Rama:** `atras-y-busqueda` (4 commits de código + 1 de docs; **sin push**)
**Plan:** `docs/superpowers/plans/2026-10-18-atras-cierra-y-busqueda-que-vende.md`

---

## Qué se arregló y por qué

### 1. El «atrás» del teléfono sacaba al cliente de la tienda

Medido en producción antes de tocar nada, con una ficha abierta en `www.3bqba.com`:

```
{"antes":"https://www.3bqba.com/","ahora":"https://www.3bqba.com/",
 "modalSigueAbierto":true,"histLen":1}
```

Abrir una ficha no metía ninguna entrada en el historial, la URL seguía en `/` y un
`history.back()` **no la cerraba**: se salía del sitio. En el móvil «atrás» es el gesto
natural para cerrar, así que quien llegaba desde WhatsApp, abría un producto y daba
atrás, se iba de la tienda.

Ahora cada cosa que tapa el catálogo —la ficha y el carrito— es una **capa** con su
entrada de historial. La ficha pone además la URL `/p/<CODIGO>`, la misma que ya servía
`api/producto.js`, así que una ficha abierta se puede compartir desde la barra del
navegador y recargar.

### 2. La búsqueda sin resultados era un callejón sin salida

Con 232 productos, buscar algo que no está daba «No hay productos que coincidan con tu
búsqueda» y un «Ver todo el catálogo». Ahora sale primero un botón
**«Pregúntanos por «lo que escribió»»** que abre WhatsApp con el mensaje ya redactado.

De paso es la única forma que tiene la tienda —sin backend ni analítica— de enterarse de
qué le están pidiendo y no tiene: la demanda llega sola al WhatsApp donde Ruth ya trabaja.

---

## Cómo está hecho

| Archivo | Qué es |
|---|---|
| `historial.js` **(nuevo)** | Módulo puro. `clave`, `rutaDe(capas, search)`, `transicion(abiertas, destino)`. Decide; no toca ni el DOM ni el historial. |
| `faltante.js` **(nuevo)** | Módulo puro. `limpiar`, `mensaje`, `enlace`: arma el WhatsApp de «no lo encontré». |
| `app.js` | `sincronizarCapas` / `abrirCapa` / `pedirCierreCapa` / `alCambiarHistorial` / `prepararHistorial`, y `pintarPregunta`. |
| `encargos.js` | Sus dos `replaceState(null, …)` pasan a `replaceState(history.state, …)`. |
| `index.html`, `estilos.css`, `sw.js` | Los dos scripts nuevos, el hueco `#vacio-pregunta`, su estilo y `CACHE` → `tienda-3b-v13`. |

**El refactor fue un renombrado, no una reescritura.** `abrirDetalle`, `cerrarDetalle`,
`abrirCarrito` y `cerrarCarrito` conservan nombre y firma y pasan a ser de una línea;
el cuerpo de siempre vive ahora en `mostrarDetalle` / `ocultarDetalle` /
`mostrarCarrito` / `ocultarCarrito`. Por eso **ninguna de las llamadas que ya existían
se tocó**.

### 🔴 Reglas que hay que respetar a partir de ahora

- **Nunca ocultes una capa a mano fuera de `sincronizarCapas`.** Dejarías una entrada de
  historial sin nada que cerrar, y el siguiente «atrás» volvería a sacar al cliente.
  Para cerrar se llama a `cerrarDetalle()` / `cerrarCarrito()`, que hacen `history.back()`
  y dejan que el `popstate` cierre de verdad.
- **Una capa nueva** (por ejemplo el modal de encargos, hoy fuera) se añade a
  `historial.js` y a las dos ramas de `sincronizarCapas`, no con un `hidden = true` suelto.
- `codigoDeFichaDeLaUrl()` **se lee antes de `prepararHistorial()`**, que deja la URL en
  la raíz. Si se invierte el orden, los enlaces `/p/CODIGO` dejan de abrir el producto.
- `CACHE` subió a `tienda-3b-v13`. Cualquier cambio futuro en `app.js`, `index.html`,
  `estilos.css` o `ARMAZON` obliga a subirlo otra vez.

### Dos fallos del plan, encontrados durante la ejecución

1. **El test de `historial.js` comparaba contra literales.** Con `node:vm`, un `[]` que
   nace dentro del sandbox no es el mismo `Array` que el del test, así que
   `deepStrictEqual` fallaba con el módulo correcto. Se comprueba el largo. Es la trampa
   que ya estaba documentada en el `CLAUDE.md` del repo; el plan la pisó igualmente y
   quedó corregido en el propio plan.
2. **Dos fichas comparten el mismo modal.** Al abrir un producto desde «Más de esta
   categoría» se apilaban `['ficha:A','ficha:B']`, y al dar «atrás» `ocultarDetalle()`
   escondía el modal entero en vez de repintar la ficha A: el cliente acababa en el
   catálogo. Arreglado en `sincronizarCapas` (commit `5d7ef30`): si en el destino queda
   una ficha y el modal está oculto, se repinta la que toca. **Verificado funcionando**
   (comprobación 5 de abajo).

---

## Evidencia observada

### Pruebas automáticas

`node --test` desde la raíz (🔴 nunca `node --test test/`), corrido y mirado en cada paso:

| Momento | Resultado |
|---|---|
| Baseline, antes de tocar nada | **80/80**, 0 fallos |
| Tras `historial.js` (+12 tests) | **92/92**, 0 fallos |
| Tras el refactor de `app.js` y `encargos.js` | **92/92**, 0 fallos |
| Tras `faltante.js` (+8 tests) y el botón | **100/100**, 0 fallos, `exit 0` |

`node --check app.js` y `node --check encargos.js`: exit 0, sin salida.

### 🔴 Hallazgo aparte: la batería BORRA un archivo versionado del repo

Una ejecución dio **99/100**, la inmediatamente posterior al `git merge` que trajo del remoto
81 commits de datos. Parecía inestabilidad; **no lo era, es determinista**, y la causa está en
`test/producto.test.js`:

- **línea 96:** `assert.strictEqual(fs.existsSync('precios-gestores.json'), false, 'borra ese
  archivo antes de correr los tests')` — el test **falla si el archivo existe**.
- **línea 122:** otro test lo crea con `fs.writeFileSync` y lo elimina con `fs.unlinkSync`.

Secuencia exacta de lo ocurrido: el merge trajo `precios-gestores.json` del remoto (existe allí
y vale `{}`) → la primera ejecución de la batería lo encontró y **falló** → esa misma ejecución
lo **borró** → las cuatro siguientes dieron 100/100 porque ya no estaba.

Dos consecuencias, las dos reales:

1. **La primera batería después de cualquier clonado, merge o `git checkout` que traiga ese
   archivo falla**, y el mensaje del test («borra ese archivo antes de correr los tests») suena
   a instrucción para una persona, no a un defecto.
2. **La batería deja el árbol sucio con un borrado**, y ese borrado es fácil de commitear sin
   querer: quitaría de producción un archivo que `app.js`, `api/producto.js` y `sw.js` piden.
   Aquí se restauró con `git checkout -- precios-gestores.json` y se comprobó que en
   `origin/main` sigue intacto.

**Pendiente, fuera del alcance de este trabajo:** que esos dos tests usen un archivo temporal
o restauren el original, en vez de operar sobre el del repo.

### En el navegador, a 375 px

Tienda servida con `npx --yes serve -l 4173 -s .` (la `-s` replica el rewrite de Vercel,
sin ella `/p/CODIGO` daría 404 en local). Producto de prueba: `5HP4` «Abrigo de
Chihuahua 1». Service worker y cachés borrados antes de empezar.

| # | Comprobación | Lo que pasó |
|---|---|---|
| 1 | Abrir ficha desde la parrilla | URL `/` → `/p/5HP4`, `history.length` 2 → 3, modal visible |
| 2 | «Atrás» con la ficha abierta | Modal cerrado, URL `/`, **sigue en la tienda** (parrilla presente) |
| 3 | Cerrar con la ✕ | Modal cerrado, URL `/`, `history.length` 3 → **3** (no crece) |
| 4 | Entrar directo a `/p/5HP4` | La ficha se abre sola; el **primer** «atrás» deja el catálogo, no sale del sitio |
| 5 | Ficha A → relacionado B → «atrás» | Vuelve a **A** («Abrigo de Chihuahua 1»), URL `/p/5HP4`, modal visible |
| 6 | Carrito con un producto → «atrás» | Panel cerrado, URL `/` |
| 7 | Carrito **encima** de la ficha → «atrás» | Carrito cerrado y **la ficha sigue abierta**, URL de vuelta en `/p/5HP4` |
| 8 | Entrar por `/?ref=N89WN`, abrir y cerrar ficha | `?ref=N89WN` presente en los tres momentos (`/?ref=` → `/p/5HP4?ref=` → `/?ref=`) |
| 9 | Buscar «televisor plasma» | Sale «Pregúntanos por «televisor plasma»» → `https://api.whatsapp.com/send?phone=5354978966&text=…`, texto decodificado correcto |
| 9b | Buscar `<img src=x onerror=alert(1)>` | **0 imágenes inyectadas**: el término sale como texto. `escapeHtml` cumple |
| 9c | Sin texto en el buscador | La caja del botón queda oculta y vacía |

Captura: `docs/informes/2026-10-18-busqueda-sin-resultados-375px.jpg` — el botón rosa
por encima de «Ver todo el catálogo», con su subtítulo, sin desborde a 375 px.

---

## ⚠ NO VERIFICADO

- **El gesto «atrás» en un teléfono de verdad.** Todo se probó en Chrome de escritorio
  con el viewport emulado a 375×812 y `history.back()` por consola. El botón físico de
  Android y el gesto de deslizar desde el borde en iOS **no se han probado**.
- **El sub-caso «vaciar la parrilla solo con el chip 🛵»** no se pudo provocar: con 137
  productos de mensajería gratis la parrilla nunca queda vacía solo con el chip. Lo que
  sí se comprobó es lo que importa: sin texto en el buscador, el botón no aparece.
- **El modal de encargos y el recuadro de gestor siguen fuera del historial**: el «atrás»
  no los cierra. Fue una decisión del plan, no un olvido.

## Desplegado y verificado en producción

Ruth pidió fusionar a `main` y hacer `push`. El clon local estaba **81 commits por detrás**
del remoto: todos de datos (`catalogo.json`, `sitemap.xml`, `taxi.json`,
`precios-gestores.json`, publicados por Stock+ desde el 15/10), **ni una línea de código**,
así que se integraron con `git merge` —no rebase, para no reescribir los SHAs que cita este
informe— sin un solo conflicto. Publicado en `origin/main` (`0e49296..5672366`).

**Comprobado en `https://www.3bqba.com` a 375 px, con el código nuevo ya en marcha:**

| Comprobación | Resultado |
|---|---|
| Caché del service worker | `tienda-3b-v13` |
| `cerrarDetalle.toString()` | contiene `pedirCierreCapa` → **corre el código nuevo** |
| Abrir una ficha | URL `/` → `/p/5HP4`, `history.length` 1 → 2 |
| «Atrás» con la ficha abierta | ficha cerrada, URL `/`, **sigue en la tienda** |
| Buscar «televisor plasma» | «Pregúntanos por «televisor plasma»» → `api.whatsapp.com` |

🔴 **El desfase del service worker se vio en vivo, tal como lo avisa el `CLAUDE.md`:** en la
primera carga tras el despliegue la caché seguía en `v12` y `cerrarDetalle` era **el viejo**,
con el `replaceState` que este trabajo elimina. Hizo falta **otra recarga** para que entrara
el código nuevo. Si Ruth dice «no veo el cambio», que recargue otra vez antes de dudar del
arreglo; y para comprobarlo, `cerrarDetalle.toString()` en la consola, no el `curl` del
archivo (el `curl` ya traía lo nuevo mientras la página ejecutaba lo viejo).

## Lo que sigue pendiente (y era pendiente antes)

- El carrusel «Los más vendidos» no se ordena ni se filtra.
- La franja de ~35 px a la derecha de la foto grande a 375 px
  (`.modal-foto{aspect-ratio:1;max-height:340px}`).
- Solo 20 de los 232 productos tienen fotos extra: la galería de 4 fotos está vacía en el
  91 % del catálogo. Eso es trabajo en el panel de Stock+, no en la tienda.

- 🔴 **La batería borra `precios-gestores.json`** (ver el hallazgo de arriba): dos tests de
  `test/producto.test.js` deberían usar un archivo temporal en vez del del repo.
