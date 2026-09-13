# Plan — 3B más grande + aviso de negocios socios

Spec: `docs/superpowers/specs/2026-09-13-mundos-3b-destacado-y-aviso-design.md`
Proyecto: `C:\inventario\tienda-3b` (sitio estático, sin build, sin tests).

**Ejecuta EXACTAMENTE estos pasos, en orden. No añadas features, archivos ni "mejoras".**
Si algo no encaja con lo que ves en el archivo real, PARA y pregunta; no improvises.

---

## Task 1 — `mundos.js` (archivo nuevo, en la raíz del proyecto)

Crea `C:\inventario\tienda-3b\mundos.js` con exactamente este contenido:

```js
// mundos.js — el aviso que descubre los otros negocios de 3B.
// Vive en las DOS páginas (index.html y taxi.html). No sabe nada del catálogo ni
// de la calculadora del taxi: solo mira qué logos hay visibles en la cabecera.
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea los inline.
(function () {
  var VISTO = '3b_mundos_visto';

  // Sin localStorage (modo privado) el aviso se enseña igual: molesta menos que
  // no descubrirse nunca.
  function yaLoVio() {
    try { return localStorage.getItem(VISTO) === '1'; } catch (e) { return false; }
  }
  function marcarVisto() {
    try { localStorage.setItem(VISTO, '1'); } catch (e) { /* no se recuerda, no es grave */ }
  }

  // Hay algo que descubrir solo si se ve al menos un negocio que NO es este.
  // En index.html el taxi está hidden hasta que catalogo.json lo enciende.
  function hayOtrosNegocios() {
    var otros = document.querySelectorAll('.mundos .mundo:not(.mundo-on)');
    for (var i = 0; i < otros.length; i++) { if (!otros[i].hidden) return true; }
    return false;
  }

  function refrescar() {
    var franja = document.getElementById('promo-mundos');
    var globo  = document.getElementById('mundos-globo');
    if (!franja || !globo) return;
    if (yaLoVio() || !hayOtrosNegocios()) { franja.hidden = true; globo.hidden = true; return; }
    // La franja NO se esconde al bajar: se va sola con el scroll. Esconderla
    // movería el contenido bajo el dedo del cliente.
    franja.hidden = false;
    globo.hidden = !(window.scrollY > 8);   // mismo umbral que la cabecera compacta
  }

  // Tocó un negocio: ya lo descubrió, no se le repite más.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest('.mundos .mundo:not(.mundo-on)')) marcarVisto();
  });

  window.addEventListener('scroll', refrescar, { passive: true });
  document.addEventListener('DOMContentLoaded', refrescar);

  // app.js la llama al final de renderMundos(): la visibilidad del taxi se
  // decide tarde, cuando llega catalogo.json.
  window.Mundos = { refrescar: refrescar };
})();
```

**Verifica:** `node --check mundos.js` sin errores.

---

## Task 2 — CSS (`estilos.css`)

Al final del bloque «Conmutador de mundos» (justo después del
`@media (prefers-reduced-motion:reduce){ ... }` que cierra ese bloque, ~línea 823), añade:

```css
/* El logo de 3B manda: es la marca paraguas y los socios son satélites. Va
   grande en las DOS páginas, incluso en /taxi. */
.mundo-3b{width:74px;height:74px}
@media (min-width:600px){ .mundo-3b{width:88px;height:88px} }

/* Globo pegado a los logos. Es un hijo más del flex .mundos (no va posicionado
   encima), así nunca tapa el buscador ni el carrito. Como la cabecera es
   sticky, acompaña al cliente por toda la página. Lo enseña/esconde mundos.js. */
.mundos-globo{
  position:relative;flex:0 1 auto;min-width:0;
  margin-left:6px;padding:6px 10px;border-radius:12px;
  background:var(--brand);color:var(--brand-ink);
  font-size:11.5px;font-weight:700;line-height:1.25;text-align:left;
}
.mundos-globo::before{
  content:"";position:absolute;left:-5px;top:50%;transform:translateY(-50%);
  width:0;height:0;border:5px solid transparent;border-right-color:var(--brand);
}
@media (min-width:600px){ .mundos-globo{font-size:13px;padding:8px 12px} }

/* Franja de ancho completo, encima de la cabecera. Reusa .promo entera y solo
   cambia el color. Usa los tokens de marca (no #fff fijo) para que el contraste
   siga bien en modo oscuro. */
.promo-mundos{background:var(--brand);color:var(--brand-ink)}
.promo-mundos .promo-linea{font-size:13.5px}
```

No toques ninguna regla existente. `taxi.css` no se modifica.

---

## Task 3 — `index.html`

Tres cambios, nada más:

1. **Franja**, inmediatamente ANTES de `<header class="header" id="header">` (línea 35):

```html
<!-- Aviso que descubre a los negocios socios (2026-09-13). `hidden` por
     defecto: lo destapa mundos.js solo si hay otro negocio visible y el
     cliente no ha tocado ninguno todavía. -->
<div id="promo-mundos" class="promo promo-mundos" hidden>
  <div class="promo-contenido">
    <p class="promo-linea">3B es más de un negocio 👇 Toca los logos y conoce a nuestros socios</p>
  </div>
</div>
```

2. **Logo 3B grande + globo** dentro del `<nav class="mundos">` (líneas 37-44). Solo cambia la
   clase del primer `<a>` y se suma el `<span>` al final:

```html
    <nav class="mundos" aria-label="Nuestros negocios">
      <a class="mundo mundo-on mundo-3b" href="#" id="logo-header" aria-current="page" title="3B Store">
        <img class="mundo-img" src="/logo-3b.png" width="256" height="256" alt="3B Store — tienda">
      </a>
      <a class="mundo" id="mundo-taxi" href="/taxi" hidden title="Taxi 3B">
        <img class="mundo-img" src="/logo-taxi-3b.png" width="256" height="256" alt="Taxi 3B — viajes">
      </a>
      <span class="mundos-globo" id="mundos-globo" hidden>👈 Toca nuestros<br>otros negocios</span>
    </nav>
```

3. **Script**, en la línea 294: `mundos.js` ANTES de `app.js` (app.js llama a `window.Mundos`):

```html
<script src="mundos.js"></script>
<script src="app.js"></script>
```

---

## Task 4 — `taxi.html`

Los mismos tres cambios, adaptados:

1. La misma franja, ANTES de `<header class="header" id="header">` (línea 33).
2. En el `<nav class="mundos">` (líneas 35-42): al PRIMER `<a>` (el de 3B, `href="/"`) se le añade
   la clase `mundo-3b`; el del taxi (`mundo-on`) NO se toca; y el mismo
   `<span class="mundos-globo" id="mundos-globo" hidden>…</span>` al final del `<nav>`.
3. En la línea 218: `<script src="mundos.js"></script>` ANTES de `<script src="taxi.js"></script>`.

`taxi.js` NO se toca: ahí los dos logos son estáticos y el `DOMContentLoaded` de `mundos.js` basta.

---

## Task 5 — `app.js`

En `renderMundos()` (~línea 1133), añade la última línea:

```js
function renderMundos() {
  const pastilla = document.getElementById('mundo-taxi');
  if (!pastilla) return;
  pastilla.hidden = !(CAT && CAT.tienda && CAT.tienda.taxiActivo);
  if (window.Mundos) window.Mundos.refrescar();   // el aviso depende de si el taxi se ve
}
```

Nada más en `app.js`.

---

## Task 6 — Verificación (obligatoria, con los ojos)

Sirve el sitio y míralo. NO declares nada terminado sin haber visto estos seis puntos:

```
cd "C:\inventario\tienda-3b"
python -m http.server 8777 --bind 127.0.0.1
```

En `http://127.0.0.1:8777/` (ancho 430 px) y en `http://127.0.0.1:8777/taxi.html`:

1. Arriba del todo: la franja morada se ve y el logo de 3B es claramente más grande que el del taxi.
2. Al bajar: la franja se va con el scroll (sin saltos) y aparece el globo junto a los logos.
3. El globo sigue ahí al seguir bajando (cabecera sticky) y NO tapa el buscador ni el carrito.
4. En `/taxi.html`: el logo de 3B es el grande y el del taxi lleva su aro verde de página actual.
5. Tocar el logo del taxi → navega; al volver a `/`, NI franja NI globo (localStorage).
6. Borrando `3b_mundos_visto` del localStorage y recargando, el aviso vuelve.

Captura (1) y (2) y pégalas en el informe.

**Prueba del caso "no invitar al vacío":** en la consola del navegador,
`document.getElementById('mundo-taxi').hidden = true; window.Mundos.refrescar()` → franja y globo
deben desaparecer. (No toques `catalogo.json` para probar esto.)

Al terminar: para el servidor.

---

## Task 7 — Cierre

- Informe de relevo en `docs/informes/2026-09-13-mundos-3b-destacado-y-aviso.md`, autocontenido,
  con la evidencia observada. Lo no ejecutado se marca «⚠ NO VERIFICADO».
- **No hagas commit ni push**: lo decide el dueño (el sitio se despliega solo en Vercel al empujar
  a `main`).
