# Logos de WhatsApp y Facebook, y la web en el pie de la tarjeta (informe de relevo)

**Fecha:** 2026-10-10 (segunda tanda del día) · **Piloto:** Opus 5 (pilot-mode) · **Ejecutor:** 1 Sonnet
**Repo:** `C:\inventario\tienda-3b`, rama `main` · **Publicado:** sí, commit **`943e140`**
**Tanda anterior:** `docs/informes/2026-10-10-compartir-foto-estado-instagram.md` (commit `8a44a3c`)

---

## 1. Qué pidió Ruth, después de probarlo en su teléfono

Probó el botón 📸 en un móvil real y **funciona**. Pidió tres cosas:

1. que antes del enlace dijera «busca más productos y detalles en www…»;
2. que los iconos de WhatsApp y Facebook fueran **los de las aplicaciones**, no emojis;
3. saber si el botón nuevo ya estaba en la capacitación (sí lo estaba).

## 2. 🔴 El malentendido, y por qué importa

Lo primero se entendió mal: se añadió la frase al **mensaje de texto** que se comparte. Ruth lo
corrigió — **la frase era para la foto del estado**, y el mensaje de texto «estaba perfecto como lo
teníamos». Se revirtió `app.js` por completo (`git checkout -- app.js`, cero bytes de diff) y la
frase se llevó al pie de la imagen.

**Tiene todo el sentido donde ella lo quería y ninguno donde se puso:** en el estado de WhatsApp y en
una historia **el enlace no se puede pinchar**, así que quien ve la foto necesita *leer* a dónde ir.
En el mensaje de texto, en cambio, el enlace ya está ahí y es clicable — y una frase con el dominio
**antes** del enlace del producto habría hecho que WhatsApp previsualizara la portada de la tienda en
lugar del producto, que es justo lo que el código evitaba a propósito.

## 3. Qué hay ahora

- **Los dos botones llevan el logo real**, en SVG inline y en su color de marca (WhatsApp `#25D366`,
  Facebook `#1877F2`), con el nombre al lado — la capacitación los llama por su nombre, así que se
  mantiene. Los otros dos (📸 y 🔗) conservan su emoji: no hay logo de marca para ellos. Los SVG van
  con `aria-hidden="true"` y `focusable="false"`, para que un lector de pantalla lea solo el texto.
- **El pie de la tarjeta** dice «Busca más productos y detalles en» y, junto al logo 3B,
  **`www.3bqba.com`** (antes solo `3bqba.com`).
- **`app.js` no se tocó.** El texto que se comparte por WhatsApp y Facebook es exactamente el de antes,
  con su línea del grupo de ofertas.

## 4. 🔴 La zona muerta de los últimos 220 px

El primer intento dejó el pie hacia y≈1850, a 70 px del borde. **Mal:** el estado de WhatsApp y las
historias de Instagram dibujan **su propia interfaz encima** de la imagen —el «Responder», la barra
del sistema, los botones de la app— y se comen del orden de 250 px por abajo. La dirección web habría
quedado tapada justo en el único sitio donde hace falta leerla.

Ahora **ningún elemento baja de y = 1695**, y el código lleva la regla escrita: `LIMITE_SEGURO = ALTO
- 220`, y `dibujar` **lanza** si el pie lo rebasa, en vez de generar una imagen mala en silencio. Todo
cuelga de `ALTO_FOTO` (bajó de 1280 a 1080), así que mover ese número mueve el bloque entero.

Coordenadas: nombre y=1150 · precio 92 px y=1340 · tachado 48 px y=1430 · frase 36 px y=1540 · logo
80 px y=1655 (1615–1695).

> ⚠ **Los 220 px son una estimación del piloto, no una medida tomada en un teléfono.** Si en el estado
> real la dirección sigue quedando tapada, hay que subir ese número — es un solo sitio.

## 5. Evidencia observada por el piloto

- `node --test` en la raíz, antes del push: **33 pass / 0 fail**.
- `git diff app.js` → **vacío**, comprobado por el piloto, no por el resumen del ejecutor.
- Las dos imágenes, abiertas y miradas: la de oferta (el caso apretado, con tachado) y la de los
  botones a 375 px en claro.
- **Producción, con `curl` tras el despliegue:**
  - `https://www.3bqba.com/tarjeta.js | grep -c "Busca más productos"` → **1**
  - `https://www.3bqba.com/ | grep -c "compartir-logo"` → **2** (uno por logo)
  - `origin/main` en `943e140`, encima de `ba34758 catalogo: 242 productos`, que entró por rebase
    limpio mientras trabajábamos.

## 6. ⚠ NO VERIFICADO

> - **La tarjeta dentro del estado de WhatsApp y de una historia de Instagram en un teléfono real**:
>   si el margen de 220 px basta, y cómo se ve el pie. Lo tiene que mirar Ruth.
> - Una tarjeta con el **nombre en dos líneas** tras el recolocado (se miraron una en oferta y una
>   normal, las dos de nombre corto).
> - Los **paths de los logos** se escribieron a mano con la silueta de marca; se vieron renderizados y
>   se reconocen, pero no se compararon trazo a trazo con el archivo oficial.
> - **Este informe no está commiteado.** El commit `943e140` llevó el código y las cuatro capturas.

## 7. Pendiente de decisión de Ruth

El precio sigue saliendo `3,900 CUP`, con coma, porque es el formato `es-MX` de toda la tienda. En una
imagen de venta puede leerse como «3.90». Cambiarlo solo en la tarjeta la dejaría distinta de la web.
