# Carrito editable, sin contradicciones y con inicial en foto rota (2026-10-15)

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-15-carrito-editable-y-coherente.md`
Commit de código: `3295c1c`. Archivos: `app.js`, `estilos.css`, `sw.js` (`CACHE` v8 -> v9).

## Hecho
- Cada línea del carrito (modal y lateral de escritorio, misma `lineaCarritoHtml`) lleva **−**, cantidad,
  **+** y una **✕**. − y + reutilizan `data-minus`/`data-plus` (la delegación global y el tope de
  existencias ya existían). La ✕ llama a `quitarLineaCarrito` (borra la línea entera).
- La nota «el costo de mensajería depende de la zona» ya no sale con envío gratis ni con «a coordinar».
- `imgFallback` / `limpiarFallback` reconocen `.linea`; la imagen del carrito lleva `alt` con el nombre
  del producto para que la inicial sea la letra del producto y no «?».

## Decisiones en los puntos 🔴
1. **`.linea-qty`**: solo la usaba `estilos.css` (una regla) y `lineaCarritoHtml`; ni `index.html` ni
   las pruebas la citan. Al desaparecer el `div`, la regla quedaba muerta y **se eliminó**.
2. **`transform:scale(.85)` descartado.** Dejaba los botones en ~37 px y la zona táctil desfasada del
   dibujo. Los botones conservan los 44 px de la parrilla (`.qty button`); el contador es `inline-flex`
   con `gap:4px` para no estirarse. La ✕ mide mín. 40x40. El plan usaba `var(--texto,inherit)`: esa
   variable no existe (`--text` sí), se usó `var(--text)`.
3. **Dos `closest`**: confirmado, son dos (`imgFallback` y `limpiarFallback`) y no hay un tercero.
   Cambio extra necesario: con `cont.appendChild(marca)` el marcador habría ido al **final** de la fila
   flex (a la derecha del subtotal), no en el hueco de la foto; en `.linea` se usa `img.after(marca)`.
4. **`alt`**: se cambió a `alt="${escapeHtml(p.name)}"` como pide el plan. Coste: un lector de pantalla
   dice el nombre dos veces (foto + título). Aceptado por el plan.

## Discrepancia no prevista por el plan (desviación avisada)
El plan usa `data-quitar` para la ✕, pero **`encargos.js` ya usa `data-quitar="<índice>"`** en sus
botones «Quitar» (su manejador cuelga de un contenedor, no hace `stopPropagation`). El manejador
global de `app.js` vive en `document`, así que habría atrapado esos clics y ejecutado
`quitarLineaCarrito("0")` (repintado del carrito y `stopPropagation` espurios; no borra nada porque los
ids son `p_...`). **Se usó `data-quitar-linea`** en el HTML y en `closest(...)`. El resto, tal cual el plan.

## Verificación
- `node --test`: 71/71 antes y 71/71 después, exit 0. `node --check app.js` y `sw.js`: exit 0.
- Memoria libre al verificar: **318 MB y 359 MB (<= 400)** -> según el plan **no se abrió navegador**.

⚠ NO VERIFICADO: memoria insuficiente. Los 9 puntos del Step 3 quedan sin mirar:
1. Cada línea con −, cantidad, + y ✕. 2. + sube cantidad, subtotal y total. 3. − baja y a 0 la línea
desaparece. 4. ✕ quita la línea entera (con 3 unidades). 5. + deshabilitado en el tope de existencias.
6. Sin líneas: «Tu pedido está vacío» y formulario oculto. 7. Con envío gratis NO sale la nota; bajo el
umbral SÍ. 8. Foto rota (quitando también `srcset`) -> inicial del producto, en el hueco de la foto.
9. Botones pulsables con el dedo a 375 px (y que el ancho de la línea aguante: columna del nombre
~140 px en 375 px, estimado, no medido). Tampoco se miró el carrito lateral de escritorio.
Captura prevista `docs/informes/2026-10-15-carrito-375px.png`: **no existe**.
Sin push.
