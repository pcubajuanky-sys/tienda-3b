# Plan v2 — el aviso de negocios socios se queda fijo y resalta más

Continúa lo implementado hoy en `docs/superpowers/plans/2026-09-13-mundos-3b-destacado-y-aviso.md`
(ya en producción, commit `812304c`). Proyecto: `C:\inventario\tienda-3b`.

**Decisión del dueño (2026-09-13, tras verlo en vivo):** el aviso se apagaba al tocar un logo y no
volvía nunca. Lo quiere **siempre visible**, con la **franja pegada arriba de la pantalla** (que no
se vaya con el scroll) y **más llamativo** (letra más grande + el globo latiendo, sin cambiar el
morado de la marca).

**Ejecuta EXACTAMENTE estos pasos. No añadas nada que no esté aquí.** Si algo no encaja con el
archivo real, PARA y pregunta.

---

## Task 1 — `mundos.js`: fuera la memoria

Sustituye el contenido COMPLETO de `C:\inventario\tienda-3b\mundos.js` por:

```js
// mundos.js — el aviso que descubre los otros negocios de 3B.
// Vive en las DOS páginas (index.html y taxi.html). No sabe nada del catálogo ni
// de la calculadora del taxi: solo mira qué logos hay visibles en la cabecera.
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea los inline.
//
// El aviso NO se recuerda ni se apaga (decisión del dueño, 2026-09-13): sale en
// todas las visitas, tocado o no. Lo único que lo esconde es que no haya ningún
// otro negocio que enseñar.
(function () {
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
    var hay = hayOtrosNegocios();
    franja.hidden = !hay;
    globo.hidden = !hay;
  }

  document.addEventListener('DOMContentLoaded', refrescar);

  // app.js la llama al final de renderMundos(): la visibilidad del taxi se
  // decide tarde, cuando llega catalogo.json.
  window.Mundos = { refrescar: refrescar };
})();
```

Desaparecen: la clave `3b_mundos_visto`, `yaLoVio`, `marcarVisto`, el listener de `click` y el de
`scroll`. **Verifica:** `node --check mundos.js`.

---

## Task 2 — `index.html` y `taxi.html`: envolver franja + cabecera

En LAS DOS páginas, el `<div id="promo-mundos">` y el `<header class="header" id="header">` pasan a
vivir dentro de un envoltorio nuevo. Es decir, donde hoy hay:

```html
<div id="promo-mundos" class="promo promo-mundos" hidden> … </div>

<header class="header" id="header">
  …
</header>
```

queda:

```html
<!-- Franja + cabecera viajan juntas y pegadas arriba: así la franja no se va
     nunca con el scroll (decisión del dueño, 2026-09-13) y no hay que calcular
     a mano cuánto mide para separar una de otra. -->
<div class="barra-fija">
  <div id="promo-mundos" class="promo promo-mundos" hidden> … </div>

  <header class="header" id="header">
    …
  </header>
</div>
```

El contenido interior del `<div id="promo-mundos">` y del `<header>` NO se toca: solo se indentan
dentro del envoltorio. El `</div>` de cierre va justo después del `</header>`. Nada más del HTML
cambia (ni los `<script>`, ni el resto del `<body>`).

---

## Task 3 — `estilos.css`

**3a.** Añade al final del archivo:

```css
/* Franja + cabecera, pegadas arriba de la pantalla como una sola pieza. El
   .header de dentro conserva su propio sticky (inofensivo: el envoltorio ya
   está clavado) para no tocar nada de lo que ya funcionaba. */
.barra-fija{position:sticky;top:0;z-index:21;background:var(--surface)}
```

**3b.** En el bloque que añadiste hoy (final del archivo, «Conmutador de mundos»), **sustituye**
estas reglas por sus versiones nuevas — el aviso tiene que resaltar más:

- En `.mundos-globo`, cambia `font-size:11.5px` por `font-size:13px` y añade al final de la regla
  `animation:latido-globo 2.4s ease-in-out infinite;`
- Cambia `@media (min-width:600px){ .mundos-globo{font-size:13px;padding:8px 12px} }`
  por `@media (min-width:600px){ .mundos-globo{font-size:15px;padding:9px 13px} }`
- Cambia `.promo-mundos .promo-linea{font-size:13.5px}` por:

```css
.promo-mundos .promo-linea{font-size:15px}
@media (min-width:600px){ .promo-mundos .promo-linea{font-size:16px} }
```

**3c.** Y añade, justo detrás de esas reglas:

```css
/* El globo late despacio para pedir el toque. Solo el globo se mueve: los logos
   se quedan quietos para que se lean. */
@keyframes latido-globo{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.06)}
}
@media (prefers-reduced-motion:reduce){
  .mundos-globo{animation:none}
}
```

---

## Task 4 — `app.js`: medir la barra entera

El aside lateral (≥1024 px) se pega con `top:var(--header-h)`, que sale de `medirHeader()`
(~línea 849). Ahora lo que ocupa el alto de arriba es la barra entera, no solo la cabecera:

```js
function medirHeader() {
  // La franja del aviso viaja pegada a la cabecera dentro de .barra-fija: lo que
  // hay que medir es la pieza entera, no solo el <header>.
  const barra = document.querySelector('.barra-fija') || document.getElementById('header');
  if (!barra) return;
  const h = barra.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
```

Y en `renderMundos()` (~línea 1134), como la franja aparece tarde (cuando llega `catalogo.json`) y
cambia el alto de la barra, remide justo después:

```js
function renderMundos() {
  const pastilla = document.getElementById('mundo-taxi');
  if (!pastilla) return;
  pastilla.hidden = !(CAT && CAT.tienda && CAT.tienda.taxiActivo);
  if (window.Mundos) window.Mundos.refrescar();   // el aviso depende de si el taxi se ve
  medirHeader();                                   // la franja cambia el alto de la barra fija
}
```

`taxi.js` NO se toca.

---

## Task 5 — Verificación (obligatoria, con los ojos)

```
cd "C:\inventario\tienda-3b"
python -m http.server 8779 --bind 127.0.0.1
```

En `http://127.0.0.1:8779/` y `http://127.0.0.1:8779/taxi.html`, a 430×820 y a 1280×800:

1. La franja se ve arriba y **sigue ahí después de bajar mucho** (no se va con el scroll).
2. El globo se ve **desde el principio**, más grande que antes, y late.
3. Nada de la cabecera tapa el contenido: el primer producto del catálogo se ve entero al bajar.
4. A 1280 px: el carrito lateral (`#carrito-lateral`) NO queda tapado por la barra fija — su borde
   superior debe quedar POR DEBAJO de la barra (compruébalo con `getBoundingClientRect()` de los
   dos elementos y dilo con números).
5. Recargar varias veces y navegar tienda↔taxi: el aviso **sale siempre**, se toque lo que se toque.
6. `localStorage` ya no guarda `3b_mundos_visto` (compruébalo tras tocar un logo).

Captura la pantalla de (1) ya con scroll hecho. Para el servidor al terminar.

---

## Task 6 — Cierre

- Añade una sección al informe de hoy `docs/informes/2026-09-13-mundos-3b-destacado-y-aviso.md`
  contando este cambio v2 y la evidencia OBSERVADA. Lo no ejecutado, «⚠ NO VERIFICADO».
- **No hagas commit ni push.**
