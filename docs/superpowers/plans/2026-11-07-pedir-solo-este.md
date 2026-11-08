# Plan: «⚡ Pedir solo este» en la ficha del producto (2026-11-07)

**Qué pide Ruth:** un botón en la ficha del producto que abra el pedido con **solo ese producto**,
sin pasar por el carrito y **sin tocar lo que el cliente ya tiene en el carrito**. Sirve a quien
viene por un enlace `/p/XXXX`, quiere una sola cosa y no busca armar un carrito. También sirve a
quien tiene otras cosas guardadas y quiere pedir solo esta ahora.

## Cómo funciona (decisiones)
- En la ficha (`#modal-detalle`), debajo de la acción de siempre (`#modal-accion`), aparece un
  botón secundario y discreto: **«⚡ Pedir solo este»** (clase `btn btn-texto` o el estilo de
  botón secundario que ya exista; 44 px de alto como mínimo). **No** sale en la tarjeta de la
  parrilla.
- El botón se ve **solo cuando el producto se puede vender ahora**:
  - la tienda no está cerrada (`cerrada()`);
  - no está en espera (`Espera.enEspera(p, clave)`);
  - la combinación elegida no está agotada (`Aviso.esAgotada`);
  - si el producto tiene variantes, hay una combinación completa elegida (`claveElegida`);
  - el tope no es 0.
  En cualquier otro caso el botón queda oculto.
- Al pulsarlo se abre el **mismo panel del carrito** (`abrirCarrito()`) en **modo «solo este»**:
  - `itemsCarrito()` devuelve ese único producto. Así el total, la mensajería, el umbral de envío
    gratis, el «completa tu envío», la política, el pago y el mensaje de WhatsApp salen bien **sin
    tocar ninguno**.
  - Cantidad inicial: la que ese producto (con esa combinación) ya tenga en el carrito; si no
    tiene, **1**. Siempre respeta `topeDe`.
  - Las líneas del panel cambian la cantidad (−, +, ✕) **del pedido solo**, no del carrito.
  - Arriba del panel sale una franja corta: «⚡ Pedido rápido: solo este producto.» Si el carrito
    tiene algo, añade «Tu carrito (N) queda guardado.».
- **Nada del modo solo se guarda en `localStorage`.** El carrito de siempre queda intacto.
- Al cerrar el panel (de cualquier forma: ✕, Escape, botón atrás, historial), el modo solo **se
  apaga** y se repinta el carrito normal (panel y aside).
- Si el cliente quita con ✕ la única línea en modo solo, se cierra el panel.
- **Al enviar en modo solo:** se abre WhatsApp igual (mismo `enviarPorWhatsApp`, mismo formato,
  misma línea `Ref:` y mismo destino). También se guardan los datos si marcó «guardar». Pero **NO
  se escribe la marca `CLAVE_ENVIADO`**, porque el «¿Lo enviaste? → vaciar» borraría el carrito
  guardado, que este pedido no incluía. Después del `window.open`, se apaga el modo solo y se
  cierra el panel.
  🔴 **Ningún `await` antes del `window.open`** (regla de siempre, por el bloqueador de iOS).
- El aside de escritorio (`#carrito-lateral`) puede mostrar el pedido solo mientras el panel está
  abierto: queda tapado por el modal y se repinta al cerrar. No hace falta separarlo.

## Implementación
1. **Módulo puro nuevo `pedido-solo.js`** (patrón IIFE + `window.PedidoSolo`, como `aviso.js` o
   `espera.js`), con tests `node:vm` en `tests/pedido-solo.test.js`:
   - `puede({cerrada, enEspera, agotada, conVariantes, clave, tope})` → boolean;
   - `cantidadInicial(enCarrito, tope)` → entero ≥1, recortado al tope si lo hay;
   - `texto(unidadesCarrito)` → el texto de la franja.
2. **`app.js`:**
   - Variable de módulo `let soloEste = null;` (forma `{ [claveCarrito]: qty }`), junto a
     `carrito`.
   - `itemsCarrito()` lee `soloEste || carrito`.
   - `addCarrito`, `quitarCarrito` y `quitarLineaCarrito`: si `soloEste` está activo, modifican
     `soloEste` (respetando `topeDe` en el +), **no llaman a `guardarCarrito()`** y repintan con
     `renderCarrito()`. Si el pedido solo queda vacío, cierran el panel.
   - `pintarSoloFicha(id, clave)`: pinta o esconde el botón en un elemento nuevo `#modal-solo`. Se
     llama en `mostrarDetalle` y en `refrescarAcciones` (bloque de `productoModal`), igual que
     `pintarListoFicha`.
   - El clic va con **delegación** y atributo `data-solo="<claveCarrito>"`, en el mismo escuchador
     que `data-add` (el CSP prohíbe `onclick`).
   - Al pulsar: `soloEste = { [k]: cantidadInicial }`, se pinta la franja y `abrirCarrito()`.
   - `ocultarCarrito()`: si `soloEste`, se pone a `null`, se esconde la franja y se llama a
     `renderCarrito()`; `refrescarAcciones(productoModal)` si hay ficha abierta.
   - `enviarPorWhatsApp`: con `soloEste` activo, no se escribe `CLAVE_ENVIADO`; después del
     `window.open` se cierra el panel con `cerrarCarrito()` (que acaba en `ocultarCarrito`).
   - Revisa con grep cualquier otro sitio que lea `carrito` y que se pinte **dentro del panel**
     (por ejemplo el botón vaciar, `vaciarPedido` o «completa tu envío»). En modo solo, el botón
     **vaciar** del panel se oculta, porque vaciaría el carrito guardado.
3. **Las TRES cáscaras** (`index.html`, `electripower.html` y `delmar.html`): `<div
   id="modal-solo" hidden></div>` justo después de `#modal-accion`; la franja `<p
   id="panel-solo" class="..." hidden></p>` arriba del panel del carrito; y `<script
   src="pedido-solo.js"></script>` junto a `aviso.js`.
4. **`estilos.css`:** estilos mínimos para el botón y la franja, con los tokens existentes y bien
   en modo claro y oscuro.
5. **`sw.js`:** añadir `'/pedido-solo.js'` al armazón y subir el caché `v49` → `v50`.

## Verificación
- `node --test --test-concurrency=1` en `tienda-3b`, con el total observado (baseline: el actual).
- `node --check app.js pedido-solo.js sw.js`.
- Comprueba con grep que el `<script src="pedido-solo.js">`, `#modal-solo` y `#panel-solo` están en
  las tres cáscaras.
- Visual: lo hace el piloto en el navegador.

## Fuera de alcance
Tarjeta de la parrilla, Stock+ y bot (el mensaje es idéntico al de siempre).
