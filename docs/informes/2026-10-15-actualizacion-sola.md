# Que la version nueva llegue sola (2026-10-15)

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-15-tienda-actualizacion-sola.md`

## Que se hizo
- `app.js`: el bloque de registro del service worker (final del archivo) se sustituyo, tal como el plan lo dice, por la version con escucha de `controllerchange` y las tres guardas: (1) `habiaControlador` medido antes de registrar, (2) `recargando` para una sola recarga, (3) `escribiendoPedido()` que no recarga si `#form-pedido` es visible y tiene algun campo con texto. El bloque original estaba literal (con un comentario encima, que se conserva).
- `sw.js`: `CACHE` de `tienda-3b-v10` a `tienda-3b-v11`.
- Commit `672e01e`. Sin push.

## Evidencia observada
- `node --check app.js` y `node --check sw.js`: sin salida, exit 0.
- `node --test`: 71/71, fail 0, antes y despues del cambio.
- CRLF intacto: 0 saltos LF sueltos en `app.js` y `sw.js`.

## Task 2 - comprobaciones en navegador
Memoria libre medida: 321 MB (limite del plan: 400 MB). **No se abrio navegador.**
1. Pagina carga sin errores en consola: ⚠ NO VERIFICADO
2. `navigator.serviceWorker.controller` existe tras la segunda carga: ⚠ NO VERIFICADO
3. `escribiendoPedido()` true con texto / false con formulario vacio: ⚠ NO VERIFICADO
4. Recargar a mano no entra en bucle: ⚠ NO VERIFICADO (por diseno no deberia: tras la recarga el SW nuevo ya manda y `controllerchange` no se repite)

## Pendiente del proximo despliegue
⚠ NO VERIFICADO: que la pagina se recargue sola cuando entra una version nueva. Solo se puede probar en el despliegue SIGUIENTE: hace falta un service worker viejo mandando y que entre uno nuevo. En este despliegue el arreglo es justo lo que se publica, asi que todavia no esta en el navegador del cliente cuando ocurre el cambio.
