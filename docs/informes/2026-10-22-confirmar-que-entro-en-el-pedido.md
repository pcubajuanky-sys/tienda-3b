# «✓ Listo — ver mi pedido»: confirmar que el producto entró (2026-10-22)

**Rama:** `confirmar-en-el-pedido` (3 commits de código + plan + este informe). **SIN PUSH.**
**Plan:** `docs/superpowers/plans/2026-10-22-confirmar-que-entro-en-el-pedido.md`

---

## Qué pedía el dueño

> *«en los productos tipo el tablet que tenía que marcar azul y agregar 1 o más, me gustaría
> que debajo del 1 y encima de preguntar esté "listo" o "pedir"… es que entra en el carrito
> pero no se sabe que está ahí y causa dudas»*

## El problema, medido en producción antes de tocar nada

Reproducido en www.3bqba.com a 375 px con `Ajusta invisible sin tirantes` (C76G, con
variantes): elegir color → «Añadir» → y esto es **todo** lo que recibía la clienta:

| Señal que debería confirmar | Qué pasaba de verdad |
|---|---|
| `− 1 +` en la ficha | Lo único visible. El «1» se puede leer como stock, no como «lo tienes» |
| `1 en el pedido` | Existía en el DOM pero **`sr-only`**: invisible salvo lector de pantalla |
| Barra inferior «1 producto · 1.790 CUP» | Activa (`hidden:false`) pero **tapada por el modal** — `elementFromPoint` devolvía el `.qty` de la ficha |
| Contador 🛒 de la cabecera | Decía «1», pero el modal tapa también la cabecera |

**Mientras la ficha está abierta había cero señales visibles.** Y la ficha es donde se decide
la compra. La intuición del dueño era exacta.

---

## Qué se hizo

Un botón entre la acción de compra y el de preguntar:

```
───  −   2   +  ───
   ✓ Listo — ver mi pedido (2)
   💬 Preguntar por este producto
```

| Pieza | Qué hace |
|---|---|
| `listo.js` | Módulo puro: `texto(unidades)` y `enElPedido(id, carrito)`. |
| `app.js` → `unidadesEnCarrito()` | **Helper**: el único sitio que cuenta las unidades del pedido. |
| `app.js` → `pintarListoFicha()` | Pinta el botón; 2 llamadas (`mostrarDetalle`, `refrescarAcciones`). |
| `index.html` / `estilos.css` / `sw.js` | Contenedor, estilo, y `CACHE` → `tienda-3b-v22`. |

### 🔴 Decisiones que no se pueden cambiar a la ligera

- **La cifra son UNIDADES, la misma del contador 🛒.** Por eso se extrajo
  `unidadesEnCarrito()` en vez de copiar la expresión: si los dos números se calcularan por
  separado podrían contradecirse, y en vez de quitar la duda la multiplicarían. Es la misma
  lección que dejó `destinoWhatsApp()` esta mañana. `grep -c "Object.values(carrito).reduce"
  app.js` → **1**.
- **Sale solo si ESTE producto está en el pedido**, no si el carrito tiene algo. Abrir una
  ficha nueva y ver «Listo» sería mentir.
- 🔴 **`enElPedido` compara `k === id` o `k` empieza por `id + '|'`, nunca un `startsWith`
  pelado**: con `startsWith` el producto `p1` daría positivo con una línea de `p12`. Hay test.
- 🔴 **Es un `<button>`, no un `<a>`.** El carrito es una capa del historial; un enlace
  metería una entrada de más y el «atrás» del teléfono dejaría de cerrar bien (lo que se
  arregló el 18/10).
- **El `1 en el pedido` de `sr-only` se deja donde está**: sigue sirviendo al lector de
  pantalla. Alguien ya había resuelto este problema, pero solo para accesibilidad.

---

## Verificación — lo que SÍ se observó

**Pruebas:** baseline **177/177** → **185/185, fail 0, exit 0** (+8 de `listo.test.js`),
corridas con `node --test` desde la raíz.

**En navegador, a 375 px, contra servidor local — las 9 comprobaciones del plan:**

1. ✅ Oculto antes de añadir. Tras elegir color y «Añadir»: **`✓ Listo — ver mi pedido (1)`**, 327 × 48 px.
2. ✅ Pulsar `+` → la cifra sube sola a **(2)**.
3. ✅ Pulsarlo abre el carrito **encima** de la ficha (`elementFromPoint` lo confirma) y la ficha sigue debajo.
4. ✅ «Atrás» cierra el carrito y **vuelve a la ficha** (`/p/C76G`), sin sacar de la tienda.
5. ✅ Bajar a 0 con `−` → el botón desaparece y vuelve «Añadir».
6. ✅ Producto **sin** variantes: sale igual.
7. ✅ **Con 2 unidades de OTRO producto en el carrito, una ficha que no está en el pedido deja el botón oculto.** No miente.
8. ✅ La cifra del botón coincide con el contador 🛒 de la cabecera (los dos decían «2»).
9. ✅ Orden en el DOM: `modal-accion` → `ficha-listo` → `espera-ficha` → `ficha-preguntar`.

Captura: `2026-10-22-listo-ver-mi-pedido-375px.jpg`. `localStorage` del navegador de prueba
vaciado y servidor local parado (comprobado).

---

## ⚠ Lo que NO está verificado

- ⚠ **Ningún teléfono real.** Chrome de escritorio con viewport emulado a 375 px.
- ⚠ **No se ha desplegado.** La rama está sin push.
- ⚠ **No se probó a 1280 px** (comprobación 9 del plan hecha solo sobre el orden del DOM, no
  a ancho de escritorio).
- ⚠ No se probó con la tienda cerrada (`tienda.cierre.activo`), donde `accionHtml` devuelve
  vacío: el botón tampoco debería salir, porque `enElPedido` miraría un carrito que sí puede
  tener líneas. **Revisar esto antes de desplegar si Ruth usa el cierre.**

---

## Al desplegar

🔴 `CACHE` sube a **`tienda-3b-v22`**. Tras publicar, **la primera carga ejecuta el código
viejo** (el service worker anterior sirve su caché mientras el nuevo se instala): hace falta
**recargar una segunda vez**. Comprobar en consola `await caches.keys()` → `tienda-3b-v22` y
`typeof pintarListoFicha` → `"function"`.
