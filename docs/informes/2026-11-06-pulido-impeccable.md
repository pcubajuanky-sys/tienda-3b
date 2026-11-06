# Pulido de estilo con impeccable — 2026-11-06

Ruth eligió **pulir el estilo actual** (no rediseñar) tras el audit de impeccable (15/20).
Se conserva la identidad de 3B: ciruela, Outfit, tokens y sistema de botones.

## Qué cambió
- **Texto pequeño → suelo de 12 px (`--t-xs`)** en lo que se lee para decidir:
  `.cat3d-n`, `.desglose-nota`, `.politica-texto`, `.total-tasa`, `.aviso`, `.pago-dominio`
  (era 10 px), `.pago-nota`, `.terminos-nota`. Sellos de la foto (`.card-oferta`,
  `.card-mv`) de 10 a 11 px.
- **`.enc-cta`** sin la franja lateral de 4 px (`border-left`): la marca la lleva ya el
  círculo del icono; el borde se pone ciruela al pasar, como antes.
- **`.cta-comi`**: el relieve deja de ser un borde inferior de 4 px sobre esquinas
  redondas y pasa a la sombra del sistema (`--sombra-1`, `--sombra-2` al pasar). El
  `prefers-reduced-motion` de siempre sigue anulando el movimiento.
- **Mosaico de la portada** (`fotoMosaico`, `app.js`): `w_200,q_auto` → `w_120,q_auto:eco`.
  Las fotos se pintan desenfocadas y al 42 %, así que no se nota y baja los datos.
- `sw.js`: caché `tienda-3b-v34` → `v35` (cambiaron archivos del armazón).

## Lo que NO se tocó, a propósito
- La cinta de rayas ámbar de `.aviso-cierre`: es la señal de «tienda cerrada» (cinta de
  precaución), tiene significado; el detector la marca como aviso, no como defecto.
- `.filtro-pill-x` (11 px): es el glifo «×» dentro de un círculo de 24 px, no texto.

## Evidencia observada
- `node --test --test-concurrency=1`: **265/265, 0 fallos**.
- `node --check app.js sw.js`: sin errores.
- Detector de impeccable sobre `estilos.css` tras el cambio: `[]` (antes: side-tab y
  border-accent-on-rounded).

## ⚠ NO VERIFICADO
- **Nada visto en pantalla**: la PC tenía ~110 MB de RAM libres y abrir un navegador
  arriesgaba desconectar a Mía. Pendiente mirar a 375 px y escritorio: sellos «⭐ MÁS
  VENDIDO» a 11 px dentro de la tarjeta del carrusel (144 px), la tarjeta de gestores y la
  de encargos, y el mosaico de portada.
- **Sin desplegar**: el commit es local; llega a 3bqba.com solo con `git push` (Vercel).
