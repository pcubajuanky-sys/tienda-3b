# Pedido y confianza — 2026-11-06

Primera tanda de la crítica de impeccable (28/40) elegida por Ruth: «Pedido y confianza».

## Qué cambió
- **El salto a WhatsApp** (`index.html`, formulario del panel): encima de «Pedir por WhatsApp»
  sale `<ol class="que-pasa">` con tres pasos: se abre WhatsApp con el pedido escrito → pulsa
  Enviar y te confirmamos disponibilidad y mensajería → pagas al recibir, después de revisar.
  Se quitó el `<p class="aviso">` de debajo del botón (decía lo mismo y sonaba a advertencia).
  Solo en la página de 3B: Electripower y Del Mar no lo llevan (no consta que su pago sea así).
- **Pasos de la portada compactos en el móvil** (<600 px): tres columnas con lo esencial en
  negrita; el resto del texto va en `.paso-mas` y vuelve a partir de 600 px. El paso 3 dice
  entero «Recibes y revisas antes de pagar».
- **Preguntas frecuentes** (`#faq`, fuera de `.contenido` porque en escritorio esa rejilla da
  celda a cada hijo): acordeón nativo `<details>`. `renderFaq()` en `app.js` la arma SOLO con
  datos que publica Stock+ en `catalogo.json → tienda`: `garantia`, `zonasMensajeria`
  (+ `envioGratisTexto`), `zonas`, `politica`. Sin dato, la pregunta no sale; con menos de 2
  preguntas la sección y su enlace se ocultan. Enlace «¿Dudas? Mira las preguntas frecuentes ↓»
  bajo la garantía. En las otras cáscaras `renderFaq()` no hace nada (no existe `#faq`).
- `sw.js`: caché `v38` → `v39`.

## Evidencia observada
- `node --test --test-concurrency=1`: **265/265**. `node --check app.js sw.js`: ok.
- `renderFaq()` ejecutada con el `catalogo.json` real y un DOM simulado: 5 preguntas, textos
  idénticos a los del panel (p. ej. «San Antonio: 150 CUP, gratis en pedidos desde 2,000 CUP.»).

## ⚠ NO VERIFICADO
- Nada visto en pantalla (RAM ~50–130 MB libres; un navegador arriesgaba a Mía): mirar el bloque
  «qué pasa» en el panel del pedido, los pasos en 3 columnas a 375 px y el acordeón.
- **Opiniones reales** (parte de la tanda) NO hechas: hacen falta capturas o frases de clientes con
  su permiso; no se inventa ninguna.
