# Estilo acorde al logo (negro · rojo · plata) — 2026-11-06

Petición de Ruth: un estilo más acorde al logotipo, más personal y menos «tipo IA», con
alguna animación, **sin cargar la página** (los clientes tienen muy mala conexión).
Decisiones de Ruth: fondo claro con cabecera/portada negras y rojo de acento; letra
Outfit (sin fuente nueva); la animación la elige el piloto.

## Qué cambió
- **Paleta** (`estilos.css`, tokens de `:root` y modo oscuro): fuera el ciruela. Neutros
  del negro/plata del logo (`--bg #F6F6F5`, `--text #111114`…) y rojo de marca
  `--brand #C8161D` (blanco encima 5,85:1; como texto 5,41:1). El rojo brillante del
  emblema `--marca-viva #E01F26` solo en el arco y el botón grande de la portada
  (4,78:1, texto grande en negrita). Oscuro: `--brand #FF6166` con tinta `#1A0506`.
  Tokens nuevos: `--marca-viva`, `--negro`.
- **Portada negra**: `--hero-1/2` en carbón, velo neutro, botón principal rojo y el
  mosaico de fotos en **blanco y negro** (`grayscale(1)`): el rojo es lo único con color.
- **Cabecera negra** solo en la tienda de 3B (`<body class="mundo-tienda">`): los tokens
  se redefinen dentro de `.header`, así buscador, carrito y logos se recolorean solos.
  Electripower, Del Mar y el taxi conservan su cabecera.
- **Títulos de sección** (Categorías, Servicios, Más vendidos, Catálogo) en mayúsculas
  espaciadas como el «STORE» del logo, con una raya roja corta debajo.
- **Sello ⭐ MÁS VENDIDO** en negro (el rojo ya es de OFERTA, que pasa a `#C8161D`).
- **Animaciones** (solo CSS, cero imágenes, cero librerías):
  1. **Arco del logo**: dos trazos (rojo + plata) al pie de la portada que se dibujan una
     vez al abrir (`.hero-arco`, `stroke-dashoffset`, 1,1 s).
  2. **Carrito que salta** cuando entra un producto (`guardarCarrito` en `app.js`
     añade `.salta`; solo si sube el número, nunca al quitar ni al cargar).
  Las dos se apagan con `prefers-reduced-motion`.
- Selección de texto, `accent-color` y `caret-color` en el rojo de marca.
- `theme-color` y `manifest.json` en negro; `tarjeta.js` (imagen para compartir) en el
  rojo de marca; caché del service worker `v35` → `v36`.

## Evidencia observada
- `node --test --test-concurrency=1`: **265/265**. `node --check` de app.js, tarjeta.js, sw.js: ok.
- Contrastes calculados (WCAG): todos ≥ 4,5:1 salvo el botón rojo de portada, 4,78:1
  (texto grande). Lista completa en la conversación del 2026-11-06.
- Detector: solo quedan el falso positivo `modal-img` (el `src` lo pone el JS) y la
  cinta de «tienda cerrada» (intencional).

## ⚠ NO VERIFICADO
- **Nada visto en pantalla** (≈108 MB de RAM libres; un navegador arriesgaba a Mía).
  Mirar a 375 px y escritorio, en claro y oscuro: cabecera negra con el buscador, el arco
  de la portada sin pisar los chips, los títulos en mayúsculas, el salto del carrito.
