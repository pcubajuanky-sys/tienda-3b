# Revisión: qué le falta a 3bqba.com para parecer (y ser) la mejor tienda

Fecha: 2026-10-12 · Solo lectura, no se modificó nada · Árbol en `4922c69` (limpio, `main`)

## Cómo se miró

Se abrió **la tienda de producción** `https://www.3bqba.com/` en un navegador real, no una
vista previa local, y se recorrió de arriba a abajo en **móvil 375×812 (modo claro)** y en
escritorio (modo oscuro): portada, categorías, servicios, «Los más vendidos», parrilla,
ficha de producto, carrito y formulario de pedido. Se midió desde la propia página
(`performance`, DOM) y se leyeron `index.html`, `app.js`, `catalogo.json`, `vercel.json`,
`sitemap.xml` y `robots.txt`.

**Lo que ya está bien y no hay que tocar:** el rendimiento (99 KB transferidos, 54 recursos,
fotos servidas por Cloudinary con `f_auto,q_auto,w_400` y `srcset`), la CSP cerrada, el
carrito con total en CUP **y** USD, los topes de existencias («Es todo lo que queda»), el pie
con quiénes somos / zonas / contactos, las páginas de producto `/p/<CODIGO>` con `og:` de
verdad, y la tipografía Outfit servida desde el propio dominio.

---

## A. Lo que delata que no es una tienda «de verdad» (barato, impacto inmediato)

**A1 — El pie dice «Admin principal» y «Admin secundario».**
Son nombres de marcador, en producción, a la vista de todo el que baje. Ya lo señalaba la
auditoría del 2026-08-27 (Sprint 0, punto 7) y sigue ahí 46 días después. Se arregla **en el
panel de Stock+**, sin tocar código. Es lo más barato y lo más visible de toda esta lista.

**A2 — Las fotos traen pegada la interfaz del proveedor.**
En la parrilla se ven píldoras grises con «9/9», «4/4», «12/13» en la esquina de la foto.
No las pinta la tienda (se comprobó: `tarjetaHtml()` no genera nada ahí): están **dentro de
la imagen**. Son el contador de fotos de la app donde se capturó (Shein/Temu/AliExpress).
Un cliente que compara con otra tienda ve capturas de pantalla ajenas, no producto propio.

**A3 — Cada foto tiene una forma y un fondo distintos.**
La parrilla mezcla fotos cuadradas de catálogo, fotos de ambiente y collages con texto en
inglés incrustado. La URL de Cloudinary usa `c_limit`, que respeta la forma original. Pasar
a relación **1:1 con relleno** (`c_pad,b_auto,ar_1:1`) ordena las 238 de golpe, sin volver a
subir ninguna foto: es un cambio en `fotoCard()` de `app.js` (3 líneas).

**A4 — En la misma parrilla conviven dos formatos de precio.**
«$5 · 3,925 CUP» junto a «2,500 CUP · $3.18», porque el campo `moneda` cambia de producto a
producto. Es correcto por dentro y se lee como desorden por fuera. Decidir **una** moneda
principal para toda la tienda (o mostrar siempre las dos en el mismo orden) unifica la lectura.

**A5 — Los textos son del proveedor, no del negocio.**
«Aceite especial de **gengibre**» (con erratas), «Abrigo de Chihuahua **1**» y «**2**» como si
fueran productos distintos en vez de variantes, y descripciones cortadas a mitad de palabra
en la tarjeta. Esto no es código: es una pasada de redacción sobre el catálogo en Stock+.

---

## B. Lo que falta para que venda más

**B1 — No se puede ordenar ni filtrar.** 238 productos en una parrilla plana. Faltan los
cuatro de siempre: *más baratos*, *más caros*, *novedades*, *solo ofertas* — y uno propio del
negocio: *solo con mensajería gratis*. Es lo que más separa una tienda de un álbum de fotos.

**B2 — Una sola foto por producto, sin galería ni zoom.** Se verificó en `catalogo.json`: el
campo es `photo`, singular, en los 238. Nadie compra ropa o electrodomésticos con una foto.
Esto empieza **arriba, en Stock+** (guardar varias fotos), no en la tienda.

**B3 — Sin productos relacionados.** La ficha termina en «Añadir» y botones de compartir. No
hay «también te puede interesar» ni «de la misma categoría»: cada visita compra como mucho
lo que vino a buscar.

**B4 — Sin señales de confianza.** No hay valoraciones, ni «cómo comprar en 3 pasos», ni
fotos de entregas reales, ni la garantía arriba. La política de revisar la mercancía delante
de la mensajera está en **gris pequeño al final del carrito**, donde ya no tranquiliza a nadie:
dicha en positivo y arriba («revisas todo delante de la mensajera antes de pagar») vende.

**B5 — El reclamo de comisionistas le compite al botón de comprar.** «Comparte los productos
para que ganes comisiones» sale debajo de «Añadir» **a todo el mundo**, incluido el cliente
que solo quiere comprar. Lo natural es enseñarlo a quien entra con `?ref=` o tras comprar,
no en medio de la decisión de compra.

---

## C. Para que Google y Facebook te encuentren

**C1 — Cero datos estructurados.** Medido en la página viva: `script[type="application/ld+json"]`
→ **0**. Sin eso Google no puede enseñar precio, moneda ni disponibilidad en los resultados.
Falta `Organization` + `LocalBusiness` (San Antonio de los Baños), `Product` por producto y
`BreadcrumbList`. Es HTML estático, no abre la CSP y no cambia nada de lo que ve el cliente.

**C2 — El `sitemap.xml` solo declara 2 URL** (portada y taxi), con `lastmod` del 2026-08-27.
Las **238 páginas de producto `/p/<CODIGO>` existen y funcionan** (las sirve `api/producto.js`
con sus `og:` propias), pero ningún buscador sabe que están ahí. Generar el sitemap completo
en la misma publicación que ya hace Stock+ es la mejor relación esfuerzo/alcance de la lista.

**C3 — El `<h1>` es el eslogan: «Compras + Pagas -».**
Para quien ya conoce el negocio es la frase del dueño; para un desconocido que llega de
Google o de un enlace compartido no dice **qué** se vende ni **dónde**. El `<title>` sí lo
dice bien. Dejar el eslogan visible como línea de apoyo y poner en el `h1` lo que la tienda
es, cuesta una línea y no quita personalidad.

---

## D. Que se pueda instalar en el teléfono

**D1 — No hay `manifest.json` ni service worker** (verificado en la página viva: sin
`link[rel=manifest]`, sin service worker registrado). Con ellos, el cliente le da a «Añadir a
la pantalla de inicio» y la tienda queda como una app, con su icono, y el catálogo abre
**aunque la conexión esté mala** — que en Cuba no es un adorno. Estaba previsto en el Sprint 5
de la auditoría del 2026-08-27 y nunca se ejecutó.

---

## Orden recomendado

**Tanda 1 — una tarde, casi todo fuera del código:** A1 (nombres reales), A5 (repasar textos
y nombres del catálogo), C2 (sitemap con los 238 productos), C1 (JSON-LD), C3 (h1).
Cambia cómo te ve un desconocido y cómo te encuentra Google, sin tocar la lógica de la tienda.

**Tanda 2 — la cara de la tienda:** A3 (fotos a 1:1), A4 (un solo formato de precio),
B1 (ordenar y filtrar), B4 (confianza arriba), B5 (mover el reclamo de comisionistas).

**Tanda 3 — requiere plan propio:** B2 (varias fotos por producto; empieza en Stock+),
B3 (relacionados), D1 (PWA + service worker), y una política de foto propia que cierre A2.

## Lo que esta revisión NO verificó

- No se midió contraste ni accesibilidad con herramienta; las observaciones visuales son a ojo.
- No se probó un pedido real por WhatsApp (sería una acción hacia afuera, no autorizada).
- No se revisó `taxi.html` ni el flujo de encargos: la pregunta era por la tienda.
- La afirmación de que el JSON-LD no choca con la CSP (es un bloque de datos, no un script
  ejecutable) está razonada, **no comprobada en el navegador**: compruébala al implementarla.
