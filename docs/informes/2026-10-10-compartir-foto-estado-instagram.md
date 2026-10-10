# Compartir foto — estado de WhatsApp e historias de Instagram (informe de relevo)

**Fecha:** 2026-10-10 · **Piloto:** Opus 5 (pilot-mode) · **Ejecutores:** 3 tandas de Sonnet
**Repos:** `C:\inventario\tienda-3b` (rama `main`) y `C:\inventario\inventario-stockmas` (rama `mensajeria-zonas`)
**Plan:** `docs/superpowers/plans/2026-10-10-compartir-foto-estado-instagram.md`
**Desplegado:** **NO.** Sin commit y sin push en ninguno de los dos repos.

---

## 1. Qué pidió Ruth y qué hay ahora

Pidió dos cosas: que los gestores puedan **compartir a Instagram** y «lo del **estado de WhatsApp**».
Las dos se resuelven con la misma pieza, porque en los dos sitios lo que se publica es **una foto con
el precio encima**, no un enlace.

En la ficha de producto hay ahora un cuarto botón, **📸 Compartir foto**, el primero de la fila y con
el fondo de marca. Al pulsarlo:

1. arma en el propio teléfono una imagen vertical de **1080×1920** con la foto del producto, su
   nombre, el precio (con el anterior tachado si está rebajado) y el logo 3B con `3bqba.com`;
2. abre la **hoja de compartir del sistema** con esa imagen dentro → el gestor elige «Estado de
   WhatsApp», «Historia de Instagram», Telegram, lo que tenga;
3. le deja **copiado** el texto del producto (con su `?ref=` y el grupo de ofertas) para pegarlo en
   el pie.

En un navegador que no sabe compartir archivos —cualquier computadora— el mismo botón **descarga** el
JPEG. No es un caso de error: es el camino previsto, y es el único que se pudo probar aquí.

## 2. 🔴 Instagram no acepta nada desde una web

No existe un `instagram.com/share?url=`. Instagram cerró esa puerta: no se puede prerellenar el pie,
ni pasar un enlace, ni publicar por el gestor. **Que nadie vuelva a plantear un botón «publicar en
Instagram»**: la imagen más la hoja de compartir es el camino, no un apaño.

Y de ahí sale una consecuencia que había que **enseñarle al gestor**, no solo programar: en Instagram
**el enlace del pie de foto no se puede pinchar**. Un gestor que pegue ahí su enlace personal pierde
la comisión sin enterarse. La capacitación 📲 ahora se lo dice con todas las letras: su enlace va en
la **biografía** o como **pegatina de enlace** en la historia.

## 3. Archivos

En `tienda-3b`:

| Archivo | Qué es |
|---|---|
| `tarjeta.js` | **nuevo.** Dibuja la imagen. IIFE con `window.Tarjeta = { dibujar, _puro }`, igual que `mundos.js`/`encargos.js`. |
| `test/tarjeta.test.js` | **nuevo.** 7 pruebas de las funciones puras, con `node:vm`. |
| `index.html` | el botón `#compartir-foto` y la carga de `tarjeta.js` antes de `app.js`. |
| `estilos.css` | `.compartir-btn-foto`, con los tokens de marca; se invierte sola en modo oscuro. |
| `app.js` | `compartirFoto()` y su `addEventListener`. |

En `inventario-stockmas`: `lib/capacitacionGestor.js` y `tests/capacitacionGestor.test.js` (la
capacitación 📲; ver también el informe hermano
`docs/informes/2026-10-10-capacitacion-compartir-sin-tabla.md`, del recorte de la misma mañana).

## 4. Las tres trampas del terreno, para quien venga detrás

1. **`crossOrigin = 'anonymous'` se pone ANTES de `src`.** Sin eso el canvas queda contaminado y
   `toBlob`/`toDataURL` fallan. Cloudinary sí manda `Access-Control-Allow-Origin: *` — verificado con
   `curl -I` contra una foto real del catálogo.
2. **Nada de `fetch` para traer la foto.** La CSP del repo lleva `connect-src 'self'` y la bloquea.
   Se carga con `<img>`, que sí está permitido por `img-src`.
3. **La descarga va por `dataUrl`, no por `blob:`.** `blob:` no está en `img-src`, y por este camino
   no hizo falta tocar `vercel.json` ni `_headers` — que, recuerda, están **duplicados a propósito**,
   uno por proveedor: si algún día hay que tocar la CSP, se tocan los dos.

## 5. Evidencia observada por el piloto (no por los ejecutores)

- `node --test` en la raíz de `tienda-3b` (la baseline eran 26):

```
ℹ tests 33
ℹ pass 33
ℹ fail 0
```

- `npm test` en `inventario-stockmas`: **1453/1453** tras el recorte de la capacitación y
  **1454/1454** con la prueba del aviso de Instagram. Cero fallos en las dos; la baseline del día era
  1453 y no había ningún fallo preexistente.
- **Las imágenes, abiertas y miradas una a una**, no leídas en un resumen.

## 6. Un defecto encontrado mirando la imagen, no los tests

La primera tanda generó **«Anillos de acero quirúrgico…»**: el nombre truncado **con ancho de sobra a
los dos lados**. Los 33 tests estaban en verde y la imagen estaba mal.

La culpa era del plan: fijé el corte en **22 caracteres por línea**, un número puesto a ojo. Una `i` y
una `M` no miden igual, y en 1080 px con letra de 64 px caben bastantes más de 22. Arreglado:
`lineasNombre(nombre, cabe, maxLineas)` ya no cuenta caracteres, recibe una función `cabe(texto)` que
**mide con el canvas** contra 960 px útiles; si no entra en dos líneas, **baja la letra de 64 a 48 px**
antes de resignarse a truncar. Sigue siendo pura y probable sin canvas: en las pruebas se le pasa un
`cabe` de mentira. La tarjeta nueva dice **«Anillos de acero quirúrgico / fluorescentes»**, entera
(`docs/informes/2026-10-10-tarjeta-nombre-largo-v2.jpg`).

**La lección, que es la de siempre en este repo:** las pruebas en verde no dicen que la imagen se vea
bien. Hay que abrirla.

Segundo arreglo de la misma tanda: el aviso daba por copiado el texto **sin mirar si la copia
funcionó**. Ahora espera el resultado y dice la verdad en los dos caminos. (La copia se sigue
**lanzando** antes de cualquier `await`: si se hace después, el portapapeles falla por falta de foco.
Solo se espera el resultado al final.)

## 7. Lo que NO se arregló aquí, a propósito

Varias fotos del catálogo traen **incrustada** la pastilla gris de la tienda de origen («2/1», «9/9»)
y los puntitos del carrusel. Salen en la tarjeta porque están dentro del JPEG original. No es del
código: se arregla subiendo fotos limpias desde Stock+.

**Pendiente de decisión de Ruth:** el precio sale como `3,850 CUP`, con coma, porque es el formato
`es-MX` que usa toda la tienda. En una imagen de venta eso puede leerse como «3.85». Cambiarlo solo en
la tarjeta la dejaría distinta del resto de la web; cambiarlo en toda la tienda es otra tanda.

## 8. ⚠ NO VERIFICADO

> - **Que la hoja de compartir del teléfono ofrezca «Historia de Instagram» y «Estado de WhatsApp», y
>   que la foto entre bien.** Solo se comprueba en un teléfono real y lo tiene que hacer Ruth. El
>   navegador del panel no tiene `canShare`, así que aquí solo se probó la descarga.
> - Que la hoja cierre limpia si el gestor la cancela (`AbortError`): el código lo contempla, no se
>   pudo simular.
> - Que el texto llegue de verdad al portapapeles (no se leyó el portapapeles).
> - Los dos avisos del caso «la copia falló»: no se vieron en pantalla.
> - Que el panel de Stock+ muestre la capacitación con el paso nuevo: requiere **reiniciar
>   `server.js`**.
> - **Que esto llegue a la web: requiere `commit` y `push` de `tienda-3b`, que decide Ruth.** Hasta
>   entonces la tienda en producción no tiene el botón.

## 9. Estado del árbol

Los dos repos quedan **sucios y sin commitear**, a propósito:

- `tienda-3b`: `app.js`, `estilos.css`, `index.html` modificados; `tarjeta.js`, `test/tarjeta.test.js`,
  el plan y siete `.jpg` de evidencia sin trackear.
- `inventario-stockmas`: `lib/capacitacionGestor.js` y `tests/capacitacionGestor.test.js` modificados,
  más `bot-mia/knowledge/catalogo.json`, que es **ajeno** (lo escribe el bot) y no se tocó.
