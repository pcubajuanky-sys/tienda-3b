# 3B más grande + aviso que descubre a los negocios socios

Fecha: 2026-09-13 · Estado: aprobado por el dueño sobre maqueta visual.

## Problema

En la cabecera de `index.html` y `taxi.html` vive `<nav class="mundos">` con los logos de los
negocios (hoy: 3B Store y Taxi 3B). Los dos logos miden lo mismo (52 px, 62 px en ≥600 px) y
**nada le dice al cliente que se pueden tocar**. El único indicio es un aro que late alrededor
del negocio en el que NO estás — demasiado sutil: la gente no descubre el taxi.

## Qué se construye

1. **Jerarquía de marca.** El logo de 3B pasa a 74 px (88 px en ≥600 px) en las DOS páginas.
   Los socios se quedan en 52/62 px. 3B es la marca paraguas; los socios son satélites, estés
   donde estés.
2. **Aviso en dos tiempos**, con el mismo mensaje:
   - **Franja** de ancho completo justo encima de la cabecera, visible al entrar:
     «3B es más de un negocio 👇 Toca los logos y conoce a nuestros socios».
   - **Globo** pegado a los logos, dentro de la cabecera: «👈 Toca nuestros otros negocios».
     Aparece al bajar (`scrollY > 8`, el mismo umbral que usa la cabecera compacta). Como la
     cabecera es `position:sticky`, el globo **acompaña al cliente por toda la página**.
   La franja NO se esconde al bajar: se va sola con el scroll. Esconderla movería el contenido
   bajo el dedo del cliente.
3. **Se apaga cuando cumple su función.** En cuanto el cliente toca un logo que no es el del
   negocio en el que está, se guarda `3b_mundos_visto=1` en `localStorage` y ni la franja ni el
   globo vuelven a salir en ese navegador. Sin `localStorage` (modo privado) el aviso se enseña
   siempre: molesta menos que no descubrirse nunca.
4. **No se invita al vacío.** El aviso solo aparece si hay al menos un logo de otro negocio
   **visible**. En `index.html` el del taxi está `hidden` hasta que `catalogo.json →
   tienda.taxiActivo` lo enciende; si Ruth lo apaga, el aviso desaparece solo.

## Cómo se reparte el código

Nueva unidad **`mundos.js`**, cargada por las dos páginas antes de su script propio. No sabe nada
del catálogo ni de la calculadora del taxi: mira qué logos hay visibles en la cabecera y decide
qué enseñar. Expone `window.Mundos.refrescar()`, que `app.js` llama al final de `renderMundos()`
(la visibilidad del taxi se decide tarde, cuando llega `catalogo.json`).

Se descarta duplicar la lógica en `app.js` y `taxi.js`: son dos ficheros grandes sin nada
compartido, y este comportamiento es idéntico en ambas páginas.

Script **externo, nunca inline**: la CSP (`vercel.json` y `_headers`) permite `script-src 'self'`
con dos hashes concretos; un `<script>` inline nuevo quedaría bloqueado en producción.

## Decisiones de estilo

- Franja y globo usan `var(--brand)` + `var(--brand-ink)`, no un color fijo: así el contraste
  sigue siendo correcto en modo oscuro (las bandas existentes con `color:#fff` fijo no lo están;
  no se tocan, queda anotado).
- En `taxi.html` el aviso también va en morado de 3B, no en el verde del taxi: señala a 3B.
- El globo es un `<span>` dentro del `<nav class="mundos">`, en el flujo flex — **no** posicionado
  encima del contenido. Así no tapa el buscador ni el carrito en móvil.
- El globo no se anima (el aro que late ya está). Nada nuevo que apagar en
  `prefers-reduced-motion`.

## Cómo crece

Añadir un cuarto negocio = añadir un `<a class="mundo">` más al `<nav>` de las dos páginas. La
jerarquía (3B grande) y el aviso funcionan igual sin tocar `mundos.js`.

## Qué NO se hace

- No se toca el aro que late, ni el carrito, ni el buscador, ni el hero.
- No se crea página de "socios" ni listado: el aviso lleva a los logos, nada más.
- No se cambia `catalogo.json` ni nada de Stock+.
