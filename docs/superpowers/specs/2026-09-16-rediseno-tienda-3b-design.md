# Rediseño de la tienda 3B (3bqba.com) — Design Doc

**Fecha:** 2026-09-16 · **Piloto:** Opus 5 (pilot-mode) · **Alcance:** todo el sitio
**Repo:** `C:\inventario\tienda-3b` (rama de trabajo `rediseno-2026-09`, worktree `C:\inventario\tienda-3b-rediseno`)

---

## 1. Qué pidió el dueño

1. «El botón *Hacer un encargo* está diferente al de *Ver catálogo*» → igualarlos.
2. «Que la página tenga un estilo moderno que atraiga clientes».
3. «Que esté lo mejor organizada posible».
4. «Pon todo en la página oficial para que se vea lo del encargo; déjalo en pausado que diga muy pronto».

## 2. Decisiones tomadas con el dueño (2026-09-16, no reabrir)

| Pregunta | Respuesta |
|---|---|
| Alcance | **Todo el sitio** (portada, cabecera, categorías, tarjetas, carrito, modales, pie y `/taxi`) |
| Identidad | **Mantener la marca** (morado `#7A2E5D` + logo). Se moderniza la ejecución, no el color |
| Publicación | **Primero en local**, el dueño aprueba, y solo entonces se hace push a `main` (Vercel despliega solo) |
| Interruptor de encargos | **Lo activa el dueño** en el panel de Stock+ al final. Nadie llama a la API por él |
| Franja de socios | **Franja fina de una línea + aro que late. Fuera el globo.** (revierte parcialmente la decisión del 2026-09-13, con el visto bueno del dueño) |

## 3. Diagnóstico — medido, no estimado

Medido en `https://www.3bqba.com/` con el viewport a **375 px**, tema claro, catálogo de 224 productos:

| Pieza | Alto | Empieza en |
|---|---|---|
| `.barra-fija` (franja socios + cabecera + globo) — *sticky, siempre visible* | **217 px** | 0 |
| `#promo-envio` (mensajería gratis + letra fina) | 71 px | 217 |
| `.hero` | 395 px | 288 |
| `.categorias-3d-wrap` | 306 px | 683 |
| `#mas-vendidos` | 404 px | 988 |
| **Primer producto del catálogo** | 371 px | **1.618 px** |

**Los siete problemas, por impacto:**

**P1 — Ruido de entrada.** La barra pegada se come el **27 % de la pantalla del celular de forma permanente**, y hay que bajar **dos pantallas** para llegar al primer producto. Tres mecanismos distintos anuncian lo mismo a la vez: la franja morada (`#promo-mundos`, 59 px), el globo `#mundos-globo` (82 px dentro de la cabecera) y el aro que late (`.mundo:not(.mundo-on)::after`, 0 px). Redundancia triple, toda animada.

**P2 — Los dos botones de la portada no son el mismo botón.** `estilos.css:158` define `.hero-cta` (sólido: fondo `--surface`, texto `--brand`, `padding:12px 26px`) y **800 líneas más abajo**, en `estilos.css:946`, `.hero-cta-encargos` lo pisa con `background:transparent; color:inherit; border:2px solid currentColor; padding:10px 24px`. Distinto relleno, distinto peso visual, distinto padding y distinto color: se leen como dos componentes de dos sistemas distintos, que es exactamente lo que notó el dueño.

**P3 — Portada turbia.** Mosaico de fotos a `opacity:.55` con `blur(2px)` + velo a `opacity:.64`, y el degradado termina en `--surface-2` (gris rosado). El resultado es un barro morado sin foco. En modo oscuro es peor: `--brand` pasa a `#E9A8CE` y la portada entera se vuelve rosa chicle.

**P4 — No hay escala.** Ni de espaciado ni de tipografía: hay más de 40 números mágicos sueltos (26 px, 22 px, 14 px, 11 px, 7 px…). Por eso cada pieza nueva llega con medidas propias y el conjunto no se lee como un sistema — es la causa de fondo de P2.

**P5 — Una sola sombra para todo.** `--sombra` (blur 24 px) se aplica igual a una tarjeta de producto, al carrito lateral y a una hoja modal. En una parrilla de 224 tarjetas eso ensucia el fondo y se lee como algo de 2015.

**P6 — Sin jerarquía tipográfica.** Todo es `system-ui` a 700/800. Los titulares no tienen ni tracking ni escala que los separe del cuerpo.

**P7 — Los dos reclamos grandes empujan el catálogo.** «Gana dinero con 3B» y la tarjeta de encargos se pintan *entre* «Los más vendidos» y la parrilla, sumando altura justo donde el cliente quiere ver producto.

## 4. Restricciones duras (romper una de estas rompe el sitio en producción)

1. **CSP sin JS inline.** `vercel.json` y `_headers` traen `script-src 'self' 'unsafe-hashes' 'sha256-Igfvs…' 'sha256-VCRuw…'`. Esos dos hashes son, literalmente, los manejadores `onerror="imgFallback(this)"` (`app.js:385`, `app.js:805`) y `onerror="cat3dImgFallback(this)"` (`app.js:224`) — verificado calculando el sha256 de cada cadena. **Esas cadenas están congeladas byte a byte y no se puede añadir ningún manejador inline nuevo.** Todo evento nuevo va con `addEventListener`.
2. **`font-src` cae en `default-src 'self'`** → **no hay Google Fonts ni ningún CDN de tipografía**. Además el público está en Cuba con datos móviles caros: **no se añade ninguna webfont**, ni siquiera autoalojada. La personalidad tipográfica se consigue con escala, tracking y peso sobre `system-ui`. *(decisión de diseño, no una limitación que haya que sortear)*
3. **`catalogo.json` y `taxi.json` no se tocan ni se comitean nunca desde esta rama.** Stock+ los publica **directo a `origin/main` por la API de Contenidos de GitHub** (`lib/publicarWeb.js`), sin pasar por ningún clon local. Comitear una copia local desde la rama pisaría el catálogo publicado. Antes de mezclar: `git pull --rebase`.
4. **`img-src` solo permite `'self'`, `res.cloudinary.com` y `data:`.** Nada de fondos ni iconos de terceros.
5. **El blur del mosaico de la portada tiene una razón** (informe del 2026-08-15): borra las marcas de agua que traen algunas fotos de producto. Al 22 % de opacidad una marca de agua nítida se sigue leyendo; desenfocada se vuelve mancha. **No se quita el blur** — la turbiedad se arregla por el lado del velo.
6. **Contraste mínimo 4.5:1** en texto, verificado en claro **y** en oscuro, como ya venía haciéndose.
7. **44 × 44 px de área táctil mínima** en todo lo pulsable (hoy se respeta; hay que seguir respetándolo).

## 5. El sistema nuevo

### 5.1 Tokens (sustituyen a los números mágicos)

```
Espaciado   --e0:4  --e1:8  --e2:12  --e3:16  --e4:24  --e5:32  --e6:48  --e7:64
Tipografía  --t-xs:12  --t-sm:13  --t-md:15  --t-lg:17
            --t-xl:clamp(19px,2.6vw,22px)   --t-2xl:clamp(22px,3.4vw,28px)
            --t-3xl:clamp(30px,6vw,46px)
Radios      --radio-control:12  --radio-card:16  --radio-hoja:22  --radio-pill:999px
Sombras     --sombra-1 (reposo)  --sombra-2 (hover/elevado)  --sombra-3 (hoja/modal)
Movimiento  --dur:.2s  --dur-lento:.32s  --ease:cubic-bezier(.2,.7,.3,1)
Portada     --hero-1 --hero-2 --hero-ink   (propios: NO se invierten en oscuro)
```

`--sombra` (la vieja, única) se mantiene como alias de `--sombra-1` para no romper reglas no migradas.

### 5.2 Botones — un solo sistema (esto resuelve P2)

Una clase base `.btn` fija **altura (48 px), radio, padding, tamaño y peso de letra, y transición**. Los modificadores solo cambian relleno y color:

| Clase | Uso |
|---|---|
| `.btn-primario` | acción de marca (Añadir, Hacer un encargo dentro de la ventana) |
| `.btn-wa` | WhatsApp (verde `--wa`), nunca para otra cosa |
| `.btn-contraste` | sobre la portada, relleno sólido claro → **«Ver el catálogo»** |
| `.btn-contraste-linea` | sobre la portada, relleno translúcido + borde → **«Hacer un encargo»** |
| `.btn-suave` | secundario sobre fondo claro (`Ver todas`, `Reintentar`) |
| `.btn-texto` | terciario sin caja (`Vaciar pedido`) |

**«Ver el catálogo» y «Hacer un encargo» quedan con la misma altura, el mismo radio, el mismo padding y el mismo tamaño de letra.** La única diferencia será el relleno — que es lo que debe distinguir a una acción principal de una secundaria. Eso es lo que pidió el dueño.

`.hero-cta`, `.add`, `.btn-secundario`, `.btn-enviar`, `#btn-lateral-pedir`, `.cta-comi-btn`, `.enc-cta-accion`, `.comi-wa` y `.barra-movil button` pasan a apoyarse en `.btn` en vez de repetir sus medidas.

### 5.3 Orden de la página (esto resuelve P1 y P7)

| Hoy | Después |
|---|---|
| franja socios (59) + cabecera con globo (158) | **franja de una línea (~34) + cabecera sin globo (~110)** |
| banner mensajería (71) | banner mensajería, una línea, la letra fina solo si existe |
| portada (395) | portada (~300), más aire y menos velo |
| categorías (306) | categorías (~250), 8 visibles en móvil plegado |
| más vendidos (404) | más vendidos |
| **Gana dinero con 3B** | **tarjeta de encargos** (el dueño quiere que se vea) |
| tarjeta de encargos | catálogo |
| catálogo → primer producto en **1.618 px** | **Gana dinero con 3B**, después del catálogo |

**Objetivos medibles** (a 375 px, mismo `getBoundingClientRect()` de la sección 3):

| Medida | Hoy | Objetivo |
|---|---|---|
| `.barra-fija` | 217 px | ≤ 160 |
| `.hero` | 395 px | ≤ 360 |
| `.categorias-3d-wrap` | 306 px | ≤ 270 |
| Primer producto en pantalla (`#mv-tira .card`) | 1.020 px | ≤ 870 |
| Primer producto del catálogo (`#grid .card`) | 1.618 px (encargos **apagados**) · 1.839 (encendidos) | ≤ 1.530 (encendidos) |

Dos salvedades, las dos por errores míos al fijar los primeros números y corregidas a mitad de ejecución con medidas reales:

- **`.hero` iba a ≤ 340 y se subió a ≤ 360.** El propio diseño subía el subtítulo de 14 a 17 px y convertía los datos en chips con relleno y borde: eso pesa más de lo que se ahorra en el relleno de la portada. Corregido en la Tarea 4b del plan.
- **`primerGrid` iba a ≤ 1.450 y se subió a ≤ 1.530.** No contaba con que la tarjeta de encargos (~150 px) se queda permanentemente en el flujo. Bajar de ~1.500 exigiría recortar «Los más vendidos» —que ya **es** producto— o la tarjeta de encargos, que es justo lo que el dueño quiere que se vea. Recortar cualquiera de las dos sería peor que el problema.

«Los más vendidos» (404 px) **no se recorta**: es lo que hace que el cliente vea mercancía antes de los 900 px.

### 5.4 Portada (P3)

- Se **mantiene** el mosaico y su `blur` (restricción 5).
- El velo plano `opacity:.64` se sustituye por un **degradado vertical**: opaco detrás del titular, transparente en los bordes. El titular gana contraste y la foto se ve donde no estorba.
- El degradado de fondo deja de morir en `--surface-2` y pasa a dos tonos de marca (`--hero-1` → `--hero-2`).
- `--hero-ink` es blanco fijo en los dos temas: la portada no se vuelve rosa chicle en oscuro.
- Titular a `--t-3xl` con `letter-spacing:-.03em` y `text-wrap:balance`.
- `.hero-datos` pasa de «✓ sueltos» a chips translúcidos.

### 5.5 Tarjetas y parrilla (P5)

- `.card` pierde la sombra permanente: queda `border:1px solid var(--border)` + `--sombra-1`; solo en hover sube a `--sombra-2`.
- `minmax(150px,1fr)` → `minmax(156px,1fr)`; los `gap` pasan a tokens.
- Precios con `font-variant-numeric:tabular-nums` (hoy los precios bailan de una tarjeta a otra).
- Sellos (`.card-oferta`, `.card-mv`) con `--radio-pill`.

### 5.6 Carrito, modales y pie

Misma operación: `.btn`, tokens de espaciado, `--sombra-3` en las hojas, foco de marca visible en los `input`, miniaturas de línea a 52 px.

### 5.7 `/taxi`

`taxi.css` recibe los mismos tokens para que los dos negocios se lean como un sistema. No se rediseña la calculadora: solo se alinean tokens, botones y sombras.

## 6. Qué NO se toca

- La lógica de negocio de `app.js` (carrito, precios, variantes, envío, mensaje de WhatsApp).
- `encargos.js` salvo el HTML de la tarjeta y del cartel de pausa.
- `catalogo.json`, `taxi.json` (restricción 3).
- Las cadenas de los dos `onerror` inline (restricción 1).
- `terminos.html` más allá de heredar los tokens.
- El interruptor de encargos en Stock+: lo mueve el dueño.

## 7. Verificación (no hay suite de tests en este repo)

Cada tarea se da por terminada solo con evidencia observada:

1. El sitio se levanta en local y **carga sin errores en consola** (0 errores, y ninguno de CSP).
2. Capturas a **375 px** y **1280 px**, en **claro** y en **oscuro**.
3. `getBoundingClientRect()` del primer producto a 375 px **< 1.150 px**.
4. Contraste ≥ 4.5:1 en cada par de colores tocado, en los dos temas.
5. `grep -c 'onerror=' app.js` sigue dando **3**, y las cadenas siguen siendo idénticas.
6. `git status` no muestra `catalogo.json` ni `taxi.json` modificados.

## 8. Cierre

El dueño revisa en local. Con su visto bueno: `git pull --rebase` → merge a `main` → push (Vercel despliega). Después, **el dueño** pone el interruptor de encargos en **Pausado** con el cartel **«🚀 Muy pronto»** desde Stock+ → pestaña 🛍️ → Guardar (eso publica `catalogo.json` solo).
