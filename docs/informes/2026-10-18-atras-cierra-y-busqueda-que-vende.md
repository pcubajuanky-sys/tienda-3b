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
- **Nada de esto está en producción.** No se hizo `git push`; sigue todo en la rama
  `atras-y-busqueda`. `www.3bqba.com` sirve hoy el código anterior.
- **El sub-caso «vaciar la parrilla solo con el chip 🛵»** no se pudo provocar: con 137
  productos de mensajería gratis la parrilla nunca queda vacía solo con el chip. Lo que
  sí se comprobó es lo que importa: sin texto en el buscador, el botón no aparece.
- **El modal de encargos y el recuadro de gestor siguen fuera del historial**: el «atrás»
  no los cierra. Fue una decisión del plan, no un olvido.

## Lo que sigue pendiente (y era pendiente antes)

- El carrusel «Los más vendidos» no se ordena ni se filtra.
- La franja de ~35 px a la derecha de la foto grande a 375 px
  (`.modal-foto{aspect-ratio:1;max-height:340px}`).
- Solo 20 de los 232 productos tienen fotos extra: la galería de 4 fotos está vacía en el
  91 % del catálogo. Eso es trabajo en el panel de Stock+, no en la tienda.

## Si hay que desplegar

Lo decide Ruth: es un `git push` del repo de la tienda tras fusionar la rama. Cuando se
haga, la **primera** visita todavía corre el código viejo (el service worker viejo sirve
su caché mientras el nuevo se instala); hace falta una segunda carga. Antes de dudar del
cambio, mirar en la consola qué código corre de verdad con `cerrarDetalle.toString()`,
no solo el `curl` del archivo.
