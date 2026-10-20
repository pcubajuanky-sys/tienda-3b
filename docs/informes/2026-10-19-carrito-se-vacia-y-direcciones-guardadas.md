# El carrito se vacía solo + el cliente guarda sus direcciones

**Fecha:** 2026-10-19 · **Rama:** `carrito-y-direcciones` (8 commits) · **SIN push**
**Plan:** `docs/superpowers/plans/2026-10-19-carrito-se-vacia-y-direcciones-guardadas.md`

---

## Qué hace ahora la tienda

### 1. El carrito se vacía solo, pero preguntando

El cliente toca «Pedir por WhatsApp», se va a WhatsApp y, cuando **vuelve** a la tienda, le
sale abajo: *«¿Ya enviaste tu pedido por WhatsApp?»* → **Sí, vaciar mi carrito** /
**No, conservarlo**.

🔴 **No se vacía al pulsar el botón, y es a propósito.** El pedido no se envía desde la web:
`enviarPorWhatsApp` abre WhatsApp con el mensaje escrito y es el cliente quien pulsa enviar
allí, así que la tienda **nunca sabe** si llegó a mandarlo. Vaciar al pulsar le borraría el
pedido entero a quien se arrepienta, se quede sin WhatsApp o tenga el emergente bloqueado.

Si vuelve **pasada media hora** ya no se le pregunta (no se acordaría de qué va), y con el
carrito ya vacío tampoco. Eso lo decide `traspedido.js` → `debePreguntar(marca, ahora, hayCarrito)`.

### 2. Las direcciones del cliente, en su teléfono

Una casilla en el formulario: *«Guardar mis datos en este teléfono para la próxima vez»*, y
al marcarla pide el nombre (*Casa*, *Trabajo*…). La próxima vez, bajo el campo de dirección
salen sus botones: toca uno y se rellenan **nombre, teléfono, dirección y horario** de golpe.
**Tope de 4**; la quinta hace caer la más vieja. Y un enlace **«Olvidar mis datos»** para
teléfonos compartidos.

🔴 **Viven SOLO en el navegador del cliente** (`localStorage`, clave `direcciones`). La
tienda es estática: no hay servidor donde guardarlas, no se sincronizan entre dispositivos y
3B no asume la custodia de datos personales de nadie. Todo acceso va en `try/catch`: en modo
incógnito `localStorage` lanza, y la tienda tiene que seguir funcionando igual.

## Las piezas

| Archivo | Qué es |
|---|---|
| `direcciones.js` **(nuevo)** | Puro. `MAX`(=4), `normalizar`, `mismaDireccion`, `cargar`, `guardar`. La dirección es la identidad: guardar la misma la actualiza, no la duplica. |
| `traspedido.js` **(nuevo)** | Puro. `VENTANA_MS`(=30 min), `debePreguntar`. |
| `app.js` | `leerDirecciones`/`escribirDirecciones`/`pintarDirecciones`/`usarDireccion`/`olvidarDirecciones`, y `preguntarSiEnvio`/`cerrarAvisoEnviado`. `vaciarPedido` se parte en `limpiarCarrito` (vacía) + `vaciarPedido` (pregunta y llama a la otra). |
| `index.html`, `estilos.css` | La tira de direcciones, la casilla y el aviso. |
| `sw.js` | Los dos módulos en `ARMAZON` y `CACHE` → **`tienda-3b-v14`**. |

### 🔴 Reglas para quien toque esto después

- **`cerrarAvisoEnviado` llama a `cerrarCarrito()`, nunca a `ocultarCarrito()`**: el carrito es
  una capa del historial (ver la entrada del 2026-10-18) y cerrarlo por el camino corto
  dejaría una entrada muerta en el historial del navegador.
- **El código que guarda la dirección y deja la marca va DESPUÉS del `window.open`** de
  WhatsApp, jamás antes: un paso de más antes de abrir y el bloqueador de emergentes se come
  el enlace (iOS sobre todo).
- **El aviso `#aviso-enviado` es hijo directo de `<body>`.** Si alguien lo mete dentro de
  `.barra-fija`, vuelve a quedar tapado (ver abajo).

## Dos fallos del plan, encontrados al verificar

### 1. 🔴 La casilla habría congelado las actualizaciones de la tienda en todos los teléfonos

`escribiendoPedido()` decide si el service worker puede recargar la página, y miraba
`c.value` de cada campo del formulario. **El `value` de un checkbox es `"on"` esté marcado o
no**, así que al añadir la casilla habría devuelto **siempre** `true` y el service worker no
habría vuelto a recargar la tienda **nunca, en ningún teléfono**: los clientes se habrían
quedado con el código viejo para siempre, sin que nada pareciera roto.

Arreglado en el mismo commit que añade la casilla:

```js
    return [...f.querySelectorAll('input, textarea, select')]
      .some((c) => (c.type === 'checkbox' ? c.checked : String(c.value || '').trim() !== ''));
```

Comprobado en el navegador: con el formulario vacío devuelve `false`; marcando la casilla,
`true`.

### 2. El aviso quedaba tapado por el carrito (invisible justo cuando hace falta)

El plan lo colocaba detrás de `#aviso-ajuste`, y ese sitio está **dentro de
`<div class="barra-fija">`**, que tiene `z-index: 21` y crea su propio contexto de
apilamiento: el `z-index: 60` del aviso solo competía ahí dentro, y frente al panel del
carrito (`z-index: 30`, hermano de la barra) toda la barra valía 21. Medido con el carrito
abierto y el aviso ya visible:

```
padres del aviso: ["barra-fija"]   position: fixed   zIndex: 60   zIndexPanel: 30
elementFromPoint(centro del aviso) → "c-etiqueta"     esElAviso: false
```

Respondía a los clics, pero **el cliente no lo veía** — y el caso normal es justo ese: envía
con el carrito abierto y vuelve con el panel todavía abierto. Arreglado moviendo el bloque a
hijo directo de `<body>` (commit `9f89e02`). 🔴 Subir el número no habría servido de nada: el
problema era el ancestro, no el valor.

## Evidencia observada

### Pruebas automáticas

`node --test` desde la raíz (🔴 nunca `node --test test/`), corrido y mirado en cada paso:

| Momento | Resultado |
|---|---|
| Baseline | **100/100**, 0 fallos |
| Tras `direcciones.js` (+13) | **113/113** |
| Tras `traspedido.js` (+8) | **121/121** |
| Tras toda la parte visible | **121/121**, `exit 0` |

`node --check app.js`: exit 0, sin salida.

### En el navegador, a 375 px

Servida con `npx --yes serve -l 4173 -s .`, con el service worker y el `localStorage`
borrados antes de empezar y `window.open` interceptado para no abrir WhatsApp de verdad.

| # | Comprobación | Lo que pasó |
|---|---|---|
| 1 | Enviar el pedido | WhatsApp se abre (1 llamada), **el carrito sigue lleno**, queda la marca |
| 2 | Volver a la tienda | Sale «¿Ya enviaste tu pedido por WhatsApp?» |
| 3 | «No, conservarlo» | Aviso fuera, **carrito intacto**, marca borrada |
| 4 | «Sí, vaciar mi carrito» | Carrito a **0**, panel cerrado, sale «¡Gracias! Tu carrito quedó vacío…» |
| 5 | Volver otra vez | **No** repregunta (la marca se consumió) |
| 6 | Carrito vacío con marca puesta a mano | **No** pregunta, y limpia la marca |
| 7 | Marcar la casilla | Aparece «¿Con qué nombre?»; al enviar queda el botón **Casa** y 1 ficha en `localStorage` |
| 8 | Tocar el botón «Casa» | Rellena nombre, teléfono, dirección y horario de una vez |
| 9 | Horario escrito a mano | Vuelve como «Otro horario…» + «despues de las 6» en su campo |
| 10 | Guardar 5 direcciones | Quedan **4** botones (`Playa, Suegra, Trabajo, Abuela`); «Casa», la más vieja, desapareció |
| 11 | «Olvidar mis datos» | 0 botones, tira oculta, `localStorage` a `null` |
| 12 | `escribiendoPedido()` con el formulario vacío | **`false`** ✅ |
| 13 | `escribiendoPedido()` con la casilla marcada | `true` ✅ |
| 14 | El aviso con el carrito abierto, tras el arreglo | `padre: BODY`, `ESTA_ENCIMA: true`, `elementFromPoint` → `aviso-enviado-txt`, botón clicable, dentro de la pantalla |

Capturas: `2026-10-19-direcciones-guardadas-375px.jpg` (la tira, la casilla y el campo del
nombre) y `2026-10-19-aviso-pedido-enviado-375px.jpg` (el aviso sobre el carrito).
⚠ La segunda salió **escalada a un tercio** por el panel de navegador integrado (mide ~294 px),
que es justo lo que advierte el `CLAUDE.md`; se entiende el montaje, pero el texto no se lee.
La prueba de que el aviso queda por delante es la medición de la fila 14, no esa imagen.

## Desplegado y verificado en producción

Ruth pidió fusionar y publicar. `main` estaba al día con el remoto (Stock+ no había
publicado nada desde el push anterior), así que la fusión fue directa y `node --test` en
`main` dio **121/121, exit 0** antes de publicar. Push: `1060ee7..079ccbf`.

Comprobado en `https://www.3bqba.com` (segunda carga, por el desfase del service worker):

| Comprobación | Resultado |
|---|---|
| Caché del service worker | `tienda-3b-v14` |
| `cerrarAvisoEnviado`, `window.Direcciones`, `window.TrasPedido` | los tres presentes → corre el código nuevo |
| `#aviso-enviado` | hijo directo de `<body>` ✅ |
| Enviar un pedido (con `window.open` interceptado) | 1 llamada interceptada, **nada salió hacia WhatsApp**, carrito intacto |
| Volver a la tienda | Aviso visible, `ESTA_ENCIMA: true`, botón «Sí» clicable, con el carrito abierto |
| «No, conservarlo» | Aviso fuera, carrito intacto |

🔴 **La prueba en producción se hizo sin enviarle un pedido falso a Ruth**: se sustituyó
`window.open` por una función que solo cuenta la llamada, así que la URL de WhatsApp nunca
se abrió. Después se limpiaron `carrito`, `pedidoEnviado` y `direcciones` del navegador de
prueba. Si alguien repite esto, **que haga lo mismo**: sin interceptar, se le abre un
WhatsApp real al número de la tienda.

## ⚠ NO VERIFICADO
- **Ningún teléfono real.** Todo en Chrome de escritorio con el viewport emulado a 375×812.
  En particular, **el viaje de verdad a WhatsApp y la vuelta** se simularon: `window.open` se
  interceptó y el regreso se disparó con `document.dispatchEvent(new Event('visibilitychange'))`,
  que es el mismo evento que usa el código, pero no es lo mismo que salir de la app y volver.
- **El borrado de datos de Safari a los 7 días** (ITP) no se puede comprobar aquí.

## Lo que sigue pendiente (y ya lo estaba)

- El carrusel «Los más vendidos» no se ordena ni se filtra.
- La franja de ~35 px a la derecha de la foto grande a 375 px.
- Solo 20 de 232 productos tienen fotos extra.

## Si se despliega

Lo decide Ruth: `git push` tras fusionar la rama. La **primera** carga tras el despliegue
todavía corre el código viejo (el service worker viejo sirve su caché mientras el nuevo se
instala); hace falta una segunda. Para comprobar qué corre de verdad,
`cerrarAvisoEnviado.toString()` en la consola, no el `curl` del archivo.
