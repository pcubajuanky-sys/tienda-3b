# Rediseño de la tienda 3B — informe de relevo (Tareas 11 y 12)

**Fecha:** 2026-09-16
**Ejecutor:** esta sesión (Tareas 11 y 12 del plan; las Tareas 0–10 las hicieron ejecutores anteriores, 12 commits ya en la rama).
**Rama:** `rediseno-2026-09`, worktree `C:\inventario\tienda-3b-rediseno`.
**Plan:** `docs/superpowers/plans/2026-09-16-rediseno-tienda-3b.md`.

---

## Qué se cambió, tarea por tarea

### Tareas 0–10 (heredadas, no tocadas en esta sesión)

Ya estaban commiteadas al empezar (`2dc4f67` … `a04be03`): tokens del sistema, un solo sistema de botones, cabecera y franja de socios, portada (con su corrección 4b), categorías (con su corrección 5b), tarjetas y parrilla, orden de la página, carrito/modales/formularios, pie y barra móvil, tarjeta de encargos y cartel «Muy pronto». No se releyeron en detalle (instrucción explícita de la tarea), solo se verificó que la rama estuviera limpia y en el commit `a04be03` antes de empezar.

### Tarea 11: `/taxi` (commit `9290c1a`)

Se reescribió `taxi.css` sustituyendo por tokens todo literal que tenía un equivalente **exacto** en el sistema:

- Espaciado (`padding`/`margin`/`gap`) en 4/8/12/16 px → `var(--e0)`…`var(--e3)`.
- Tamaños de letra en 12/13/15 px → `var(--t-xs)`/`var(--t-sm)`/`var(--t-md)`.
- Las tres apariciones de `box-shadow:var(--sombra)` (alias) → `var(--sombra-1)` explícito, siguiendo el mismo patrón que la Tarea 8 en el resto del sitio.

Los botones de la calculadora (`.tx-wa`, `.tx-secundario`) se redujeron a lo que **no** cubre `.btn`: `.tx-wa{width:100%}` (alto, radio, relleno, tamaño y peso ya los pone `.btn`+`.btn-wa`) y `.tx-secundario{width:100%;background:var(--surface-2);color:var(--text);border:1px solid var(--border)}` (mismas medidas de `.btn`, pero conserva su propio tono de fondo, más marcado que `--surface` de `.btn-suave`, que es una elección de taxi, no un olvido). En `taxi.html` se añadieron las clases `btn btn-wa` a los cuatro enlaces de WhatsApp (`#tx-wa-apagado`, `#tx-pedir`, `#tx-propon-wa`) y `btn btn-suave` a los dos botones secundarios (`#tx-reintentar`, `#tx-compartir`).

**Hallazgo corregido de paso (dentro del alcance «alinear /taxi al sistema»):** al comprobar el estado real del DOM antes de tocar nada, `#tx-gana-wa` (el botón de WhatsApp del modal «Gana con Taxi 3B», clase `comi-wa`) y el `<span class="cta-comi-btn">` de `#tx-cta-gana` estaban **completamente rotos** — `padding:0`, `border-radius:0`, `display:inline` — porque la Tarea 2 redujo `.comi-wa`/`.cta-comi-btn` en `estilos.css` a solo su delta (asumiendo que el HTML ya llevaría `class="btn btn-wa comi-wa"` / `class="btn cta-comi-btn"`) pero esa tarea solo tocó `index.html`; `taxi.html` tiene su propia copia de este mismo patrón y se quedó sin las clases. Se corrigió añadiendo las mismas clases que Task 2 usó en `index.html` (`#comi-wa` allí ya lleva `class="btn btn-wa comi-wa"`, verificado por grep antes de tocar nada). Verificado en vivo tras el fix: ambos botones miden 48 px de alto, `border-radius:12px`, `padding:0 24px` — igual que el resto del sistema.

Verificado en el navegador (375 px y 1280 px, claro y oscuro): la calculadora sigue calculando igual (probado: destino con 6 opciones, resultado `19,550 CUP ≈ $28.13 USD`), los botones miden 48 px de alto igual que en la tienda, consola sin errores en los cuatro casos.

### Tarea 12: verificación final (esta sesión)

Ver detalle de cada comprobación más abajo. Informe y commit final: este archivo.

### Tarea 4c: el botón principal de la portada se apagaba en modo oscuro (corrección posterior, esta sesión)

Encontrada **por la revisión visual del piloto, no por las mediciones**: el contraste de `.btn-contraste` pasaba de sobra en los dos temas (8,84:1 claro / **9,06:1 oscuro**, ver tabla de Contraste más abajo), pero la jerarquía visual estaba rota — un fallo que ningún número de contraste detecta por sí solo. `.btn-contraste` colgaba de `--surface`/`--brand`, que sí se invierten con el tema; en oscuro eso daba `background: rgb(30,24,34)` (casi negro) sobre la portada, que es ciruela profunda fija (tokens `--hero-*`, que NO se invierten a propósito). Resultado: «Ver el catálogo» se volvía una caja oscura casi invisible sobre fondo oscuro, y el botón secundario «Hacer un encargo» (con borde claro) pasaba a verse más importante que el principal — justo al revés de la intención. Es el mismo problema que los tokens `--hero-*` vinieron a evitar en la Tarea 4, solo que no se había extendido al botón.

**Fix:** dos tokens nuevos fijos (no redefinidos en `@media (prefers-color-scheme: dark)`), `--hero-btn-bg:#FFFFFF` / `--hero-btn-ink:#7A2E5D`, añadidos en `estilos.css` justo debajo de `--hero-ink`. `.btn-contraste` pasó de `background:var(--surface);color:var(--brand)` a `background:var(--hero-btn-bg);color:var(--hero-btn-ink)`. Blanco sobre ciruela: 8,9:1, cumple igual en los dos temas porque ya no depende de ellos.

**Verificado en el navegador integrado, 375 px:**

| | Antes (claro y oscuro daban distinto) | Después (idéntico en los dos temas) |
|---|---|---|
| `background-color` de `.btn-contraste` | claro: color de `--surface` claro · oscuro: `rgb(30,24,34)` (casi negro) | `rgb(255, 255, 255)` |
| `color` de `.btn-contraste` | claro: color de `--brand` claro · oscuro: `rgb(233,168,206)` (rosa) | `rgb(122, 46, 93)` |

Comprobado con el bloque `getComputedStyle` del plan en claro y en oscuro tras esta corrección: mismo resultado exacto en ambos, `{bg:"rgb(255, 255, 255)", color:"rgb(122, 46, 93)"}`. Captura visual en oscuro tras el fix: «Ver el catálogo» se ve blanco sólido, claramente por delante de «Hacer un encargo» (contorno, sin relleno).

Las cinco medidas de layout (Task 0 Step 4) se volvieron a correr a 375 px tras el fix, para confirmar que no se movió nada: `barraFija:151` (≤160 ✅), `hero:349` (≤360 ✅), `cats:264` (≤270 ✅), `primerMV:864` (≤870 ✅), `primerGrid:1526` (≤1530 ✅) — iguales a los de la Tarea 12 (con 1 px de diferencia en `primerGrid`, 1525→1526, ruido de render, no de este cambio).

⚠ **La fila «Botón de portada sólido» de la tabla de Contraste más abajo (línea `--brand` sobre `--surface`, 8,84:1/9,06:1) quedó desactualizada por este cambio**: ahora es `--hero-btn-ink` sobre `--hero-btn-bg` (blanco/ciruela oscuro), 8,9:1, idéntico en los dos temas. No se recalculó el número exacto con el método WCAG completo del resto de la tabla (luminancia relativa en JS); el valor viene del comentario del plan, no de una medición propia en esta sesión.

Commit: `e7dd258` (`estilos.css`).

---

## Las cinco medidas (Task 0 Step 4, servidor de revisión, 375 px)

Medidas observadas con el bloque de JS del plan, en `/`, con los encargos encendidos (servidor de revisión):

| Medida | Objetivo | Observado | Cumple |
|---|---|---|---|
| `.barra-fija` | ≤ 160 | **151** | ✅ |
| `.hero` | ≤ 360 | **349** | ✅ |
| `.categorias-3d-wrap` | ≤ 270 | **264** | ✅ |
| Primer producto en pantalla (`#mv-tira .card`) | ≤ 870 | **864** | ✅ |
| Primer producto del catálogo (`#grid .card`) | ≤ 1530 | **1525** | ✅ |

Las cinco cumplen. `primerGrid` (1525) cae dentro del rango 1450–1530 que el propio plan marcó como aceptable tras la corrección de objetivo del 2026-09-16 (ver el punto siguiente).

### Las dos correcciones que sufrió el plan a mitad de ejecución

1. **Tarea 4b** («Bajar la portada de verdad»): tras la Tarea 4, `.hero` midió 402 px — por encima incluso del punto de partida (395). La causa no fue un error de ejecución: el propio plan subía `.hero-sub` de 14 a 17 px y convertía `.hero-datos` en chips con relleno y borde, y eso pesaba más de lo que se ahorraba en el padding de `.hero-contenido`. La Tarea 4b lo corrigió (titular más chico con `--t-3xl` a 28px de mínimo, subtítulo a 15px en móvil, chips más finos, logo más pequeño), dejando `.hero` en 349 (verificado en esta sesión, dentro del objetivo ≤360).
2. **Tarea 5b** («Recuperar los 22 px que se comió Ver todas»): tras la Tarea 5, `.categorias-3d-wrap` midió 292 px en vez de ≤270. Causa: el botón «Ver todas (24)» pasó de ~36 a 52 px al heredar `.btn`/`.btn-secundario` en la Tarea 2. La Tarea 5b apretó los rellenos alrededor (sin bajar el botón de los 44 px de mínimo táctil), dejando `.categorias-3d-wrap` en 264 (verificado, dentro de ≤270).

### El objetivo de `primerGrid` revisado de 1.450 a 1.530

El plan original fijaba `primerGrid ≤ 1450`, pero esa cifra era una estimación del autor del plan, no una medida real: no contaba con que la tarjeta de encargos se queda permanentemente en el flujo de la página (no solo durante la revisión). Bajar de ~1.500 exigiría recortar «Los más vendidos» (que ya es catálogo) o la tarjeta de encargos (que el dueño quiere que se vea), y las dos opciones serían peores que el problema que se intenta resolver. El plan se corrigió el mismo día (2026-09-16) para aceptar el rango 1.450–1.530 sin seguir recortando a ojo. El valor observado en esta sesión, 1525, cae dentro de ese rango.

---

## Contraste (WCAG, luminancia relativa calculada en JavaScript sobre los tokens reales)

Método: se leyeron los tokens con `getComputedStyle(document.documentElement)` en el navegador (no se supusieron valores) y se calculó la razón de contraste WCAG estándar (luminancia relativa sRGB) en JavaScript, ejecutado en el propio navegador contra `http://localhost:4173`, en los dos temas (`prefers-color-scheme` claro y oscuro). Para el titular de la portada y el botón de cristal, que se leen sobre una foto+velo variable, se calculó el **peor caso**: una foto blanca atenuada por `brightness(.75)` (según especifica el CSS) compuesta al 42% de opacidad sobre el degradado `--hero-1`, y encima el velo en su punto de menor opacidad (`.72`, el stop del 40%, que es el que más deja pasar el fondo).

| Par | Claro | Oscuro | Mínimo exigido | Cumple |
|---|---|---|---|---|
| Titular de la portada sobre el velo (peor caso) | **12.22:1** | **12.22:1** | 4.5:1 | ✅ |
| Texto de la franja de socios (`--brand` sobre `--brand-soft`) | **7.53:1** | **8.40:1** | 4.5:1 | ✅ |
| `.enc-pausado-titulo` sobre su fondo (peor de los 2 stops del degradado) | **7.53:1** | **7.99:1** | 4.5:1 | ✅ |
| Botón de portada sólido (`.btn-contraste`: `--brand` sobre `--surface`) | **8.84:1** | **9.06:1** | 4.5:1 | ✅ |
| Botón de portada de cristal (`.btn-contraste-linea`: `--hero-ink` sobre negro 18% + backdrop peor caso) | **14.05:1** | **14.05:1** | 4.5:1 | ✅ |

El titular y el botón de cristal dan igual en los dos temas porque los tokens `--hero-*` están deliberadamente fijados y no se redefinen en modo oscuro (comentario en `estilos.css`). Los otros tres pares sí cambian porque usan `--brand`/`--brand-soft`/`--surface`/`--surface-2`, que sí se redefinen. Las cinco combinaciones superan holgadamente el mínimo de 4.5:1 en ambos temas.

---

## CSP y diff contra `origin/main`

**CSP** (`Select-String -Path app.js -Pattern 'onerror=' -AllMatches`): cuenta = **3**. Las tres coincidencias son exactas, `imgFallback(this)` (×2, `app.js:385` y `app.js:805`) y `cat3dImgFallback(this)` (×1, `app.js:224`) — el mismo texto que autoriza la CSP por sha256. La búsqueda ampliada (`onclick=|onload=|onerror=` en `app.js,encargos.js,taxi.js,index.html,taxi.html`) devuelve una cuarta línea, `encargos.js:5`, pero es un **comentario** (`// Por eso NO hay ni un onclick="": todo va con addEventListener.`), no un manejador real — no afecta a la CSP.

**Diff:** `git diff origin/main --stat` (7 archivos, 339 inserciones / 289 eliminaciones): `app.js`, `encargos.js`, `estilos.css`, `index.html`, `mundos.js`, `taxi.css`, `taxi.html`. **`catalogo.json` y `taxi.json` no aparecen en la lista** — confirmado, no se comiteó ningún dato.

---

## Recorrido del flujo de compra (móvil, 375 px)

Hecho desde la interfaz (algunos pasos vía `click()` real sobre el elemento cuando la herramienta de captura de pantalla del navegador integrado devolvía frames obsoletos o expiraba por timeout — incidencia ya avisada por un ejecutor anterior; se verificó cada paso leyendo el DOM/`localStorage` real, no solo confiando en la captura):

1. **Buscar un producto:** campo de búsqueda, texto «candado» → 1 resultado (`Candado/Alarma de Motos y Bicicletas`). Funciona.
2. **Abrir el detalle:** producto «Abrigo de Chihuahua 1» → modal abre con nombre, precio ($6 · 4,170 CUP), descripción y botón `Añadir` con clase `btn btn-primario add` (confirma en vivo la clase que puso la Tarea 2 en `accionHtml()`). Este producto no tiene tallas (`#modal-tallas` vacío y oculto) — no se pudo probar el selector de talla con este producto; no se buscó uno con tallas por ir al grano.
3. **Añadir:** clic en el botón del modal → `localStorage.carrito` pasa a incluir el producto añadido. Funciona.
4. **Abrir el carrito:** `#btn-ver-pedido` → abre `.panel-caja` (hoja inferior en móvil). Funciona.
5. **Rellenar los cuatro campos:** `#c-nombre`, `#c-tel`, `#c-dir`, `#c-nota` — los cuatro existen y aceptan valor.
6. **Botón de WhatsApp (`#btn-enviar`, clase `btn btn-wa btn-enviar`):** se interceptó `window.open` (sin dejar que abriera nada ni navegara) y se hizo clic real en el botón. El enlace capturado fue:
   `https://api.whatsapp.com/send?phone=5354978966&text=...` con el mensaje armado correctamente: los dos productos con cantidad y precio, el total (21,375 + ... = 21,545 CUP), mensajería gratis, y los cuatro campos (Nombre/Tel/Dirección/Nota) tal cual se escribieron, más la política de devoluciones y la referencia. **No se envió el mensaje** (no se abrió ninguna pestaña ni se navegó a WhatsApp).
7. **Vaciar pedido (`#btn-vaciar-panel`):** pide confirmación (`window.confirm`, interceptada para no bloquear la sesión de verificación) y al confirmar vacía `localStorage.carrito` a `null`. Funciona.
8. **Filtro por categoría:** clic en «Electrodomésticos» (chip con «11 productos») → la parrilla pasa a mostrar exactamente 11 tarjetas. Funciona.

Consola sin errores durante todo el recorrido.

---

## Literales de `taxi.css` que quedaron sin tokenizar, y por qué

El archivo tenía, por diseño propio (ver su comentario de cabecera: «valores hand-tuned»), muchos números que no coinciden con ningún punto de la escala del sistema (4/8/12/16/24/32 px de espaciado; 12/13/15/17 px de letra). Siguiendo la instrucción de no inventar tokens nuevos, se dejaron literales, entre otros:

- **Espaciado sin match exacto:** 18px (`.tx-main`), 14px (varios `padding`/`margin`), 10px, 9px, 6px, 5px, 2px, 1px — no coinciden con ningún `--e*`.
- **Tamaños de letra sin match exacto:** 30px (`.tx-portada h1` — el mínimo de `--t-3xl` es 28px, no 30, y convertirlo habría cambiado el tamaño y añadido crecimiento por viewport que el original no tenía), 22px (`.tx-campo-km input[type=number]`), 18px (los `h2` de sección y `.tx-gana-cifra b` — ningún token cae en 18: `--t-lg` es 17 y el mínimo de `--t-xl` es 19), 32px (`.tx-precio`, la cifra grande del resultado), 14px, 13.5px, 11px.
- **`border-radius:7px`** (`.tx-cal-mitad`, la pastilla del calendario) y **`border-radius:3px`** (`.tx-cal-muestra`, el cuadradito de la leyenda) — no coinciden con `--radio-control`(12) ni `--radio-card`(16).
- Ninguna regla de `taxi.css` usaba ya `clamp()` en su `font-size`, así que la instrucción del plan de mapear «titulares con clamp() → `--t-xl`/`--t-2xl` según tamaño» no tuvo ningún caso al que aplicarse.

Sí se convirtieron los tres usos de `box-shadow:var(--sombra)` (el alias) a `var(--sombra-1)` explícito, y todos los `padding`/`margin`/`gap`/`font-size` que sí coincidían exactamente con un token (ver el commit `9290c1a` para el detalle completo).

---

## Todo lo que quedó sin verificar

- **⚠ NO VERIFICADO:** cualquier comportamiento en un navegador real de celular (Android/iOS) — todo lo anterior se probó en el navegador integrado del entorno de desarrollo, emulando 375 px / 1280 px.
- **⚠ NO VERIFICADO:** el selector de tallas de un producto que sí las tenga (el producto usado para el recorrido de compra, «Abrigo de Chihuahua 1», no tiene tallas; no se probó con otro producto por ir al grano según lo pedido).
- **⚠ NO VERIFICADO:** el envío real del mensaje de WhatsApp — se comprobó que el enlace se arma bien y se interceptó deliberadamente antes de que se abriera, tal como se pidió.
- **⚠ NO VERIFICADO:** el sitio publicado en producción (`3bqba.com`) — todo lo anterior es contra el worktree/servidor de revisión local, antes de mergear a `main`.
- **⚠ NO VERIFICADO:** rendimiento/Lighthouse, SEO, u otros aspectos fuera de las seis comprobaciones del design doc.
- Las capturas de pantalla tomadas durante esta sesión (8 combinaciones: `/` y `/taxi`, 375px y 1280px, claro y oscuro) se observaron directamente en el navegador integrado durante la verificación pero no se guardaron como archivos adjuntos a este informe.

---

## Pendiente del dueño

> **Pendiente del dueño:** Stock+ → pestaña 🛍️ → interruptor de encargos a **Pausado**, cartel **«🚀 Muy pronto»** → Guardar. Eso publica `catalogo.json` solo y la sección aparece en 3bqba.com.
