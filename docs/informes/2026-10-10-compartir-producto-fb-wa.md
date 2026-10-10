# Compartir un producto en Facebook y WhatsApp — informe de relevo

**Fecha:** 2026-10-10 · **Piloto:** Opus 5 (pilot-mode) · **Ejecutores:** 2 subagentes Sonnet
**Repo:** `C:\inventario\tienda-3b`, rama `main` · **Desplegado en producción:** sí, commit `43f2a5c`
**Spec:** `docs/superpowers/specs/2026-10-10-compartir-producto-fb-wa-design.md`
**Plan:** `docs/superpowers/plans/2026-10-10-compartir-producto-fb-wa.md`

---

## 1. Qué hay ahora que antes no había

Desde el modal de detalle de cualquier producto hay tres botones —**WhatsApp**, **Facebook** y
**Copiar enlace**— que generan `https://www.3bqba.com/p/<CODIGO>`, con `?ref=<codigo>` si quien
comparte entró por un enlace de gestor. Al abrir ese enlace, Facebook y WhatsApp enseñan la tarjeta
de **ese** producto (foto, nombre, precio y descripción), y la persona que pincha cae en la tienda
con el modal de ese producto ya abierto.

Antes, cualquier enlace que se compartiera —el que fuera— enseñaba la misma tarjeta genérica de la
tienda, porque las etiquetas `og:` de `index.html` eran fijas.

## 2. Cómo funciona, en una pantalla

Facebook y WhatsApp **no ejecutan JavaScript**: leen el HTML tal como sale del servidor. Una web de
una sola página no puede resolver eso en el cliente. Por eso:

1. `vercel.json` manda `/p/:codigo` a `api/producto.js` (regla **antes** del comodín, que si no se
   la traga).
2. `api/producto.js` lee `catalogo.json`, busca el producto por su `codigo` corto, y devuelve el
   `index.html` **de siempre** con lo que hay entre `<!-- og:inicio -->` y `<!-- og:fin -->`
   sustituido por las etiquetas de ese producto. Todo lo demás viaja intacto, así que la página se
   ve y se comporta igual y los hashes de la CSP siguen valiendo.
3. `api/_og.js` es el módulo puro que arma esos textos (precio, descripción recortada a 160, imagen
   de Cloudinary a 1200×630 con relleno blanco). No lee archivos ni red: por eso tiene pruebas.
4. En el navegador, `app.js` detecta `/p/<codigo>` al arrancar y abre el modal; al cerrarlo, la URL
   vuelve a `/` conservando el `?ref=`.

**Si un código no existe**, la función devuelve la tienda normal con 200 y `app.js` enseña la franja
«Ese producto ya no está disponible». Nunca una página rota ni un error.

## 3. Evidencia observada

### Pruebas automáticas

Corridas por el piloto (no por los ejecutores), desde la raíz del repo, con Node v24.16.0:

```
ℹ tests 26
ℹ pass 26
ℹ fail 0
```

Se corrieron **dos veces**: antes del rebase y después de traer las 14 publicaciones de catálogo que
Stock+ había hecho mientras tanto. Verde las dos.

### Auditoría contra los 238 productos reales

```
productos: 238
descripciones pasadas de 161: 0
sin imagen transformada: 0
atributos rotos por comillas: 0
con < o > sin escapar: ninguno
productos con & o comillas en el texto: 2 (6AGD, TCUU) — salen escapados
```

### En producción, tras el despliegue

`curl https://www.3bqba.com/p/U8DN`:

```
<title>Ventilador recargable — 3B Store</title>
<meta property="og:title" content="Ventilador recargable — 3B Store">
<meta property="og:url" content="https://www.3bqba.com/p/U8DN">
<meta property="og:image" content="https://res.cloudinary.com/dvahidqdw/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_white/v1786632028/productos/qm0djp1vcxywnxkshfis.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

`curl "https://www.3bqba.com/p/U8DN?ref=5D9K9"` → el `ref` **sí** sobrevive a la reescritura:

```
<link rel="canonical" href="https://www.3bqba.com/p/U8DN?ref=5D9K9">
<meta property="og:url" content="https://www.3bqba.com/p/U8DN?ref=5D9K9">
```

Cabeceras de seguridad intactas en la respuesta de la función: `Content-Security-Policy`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, y `HTTP/1.1 200`.

Sin regresiones (código HTTP real):

```
200  https://www.3bqba.com/            200  https://www.3bqba.com/catalogo.json
200  https://www.3bqba.com/taxi        200  https://www.3bqba.com/estilos.css
200  https://www.3bqba.com/5D9K9       200  https://www.3bqba.com/p/ZZZZ
```

Y mirado con los ojos en el navegador, no solo medido: `https://www.3bqba.com/p/U8DN?ref=5D9K9`
carga la tienda entera con su CSS, la foto del producto, el modal abierto y los tres botones. Las
peticiones de red confirman que `estilos.css`, `app.js`, `mundos.js`, `encargos.js` y
`catalogo.json` se piden **a la raíz** y devuelven 200.

Capturas: `docs/informes/2026-10-10-botones-compartir.jpg` (el modal con los tres botones) y
`docs/informes/2026-10-10-pagina-producto.jpg` (la página de producto tras el arreglo del `base`).

## 4. El fallo que casi se nos cuela, y por qué no se vio antes

El plan original no llevaba el `<base href="/">`. Sin él, **la página de producto salía sin estilos y
sin JavaScript**: `index.html` referencia `estilos.css`, `mundos.js`, `app.js`, `encargos.js`,
`taxi-portada.jpg` y `terminos.html` en relativo, y `app.js` hace dos `fetch('catalogo.json?v=…')`
también relativos. Servidos en `/p/U8DN`, el navegador los resuelve contra el directorio `/p/` y los
pide a `/p/estilos.css`, `/p/app.js`, `/p/catalogo.json`…, que el comodín de `vercel.json` responde
con HTML.

**Por qué nunca había pasado:** los enlaces de gestor (`/5D9K9`) son de **un solo segmento** y
resuelven contra la raíz. Los **dos** segmentos son los que rompen, y hasta hoy no había ninguna ruta
de dos segmentos.

**Por qué casi se cuela:** el robot de Facebook no se habría enterado —él solo lee las etiquetas, que
estaban bien— y las 25 pruebas pasaban. Lo encontró el ejecutor al abrir la página de verdad en un
simulador de las reescrituras de Vercel. Es la lección de la sesión: **una batería verde no sustituye
a mirar la página**.

Arreglado en el commit `43f2a5c` con una etiqueta `<base href="/">` (una línea en lugar de volver
absolutas las diez referencias, y así protege también a cualquier URL relativa futura), con una
prueba que impide que alguien la borre sin darse cuenta.

## 5. Lo que NO está verificado

- ⚠ **La tarjeta real en Facebook NO VERIFICADA.** El depurador
  (`developers.facebook.com/tools/debug`) exige una cuenta de Facebook. Hay que pegar
  `https://www.3bqba.com/p/U8DN`, pulsar **Extraer nueva información** y comprobar foto, título y
  descripción. Lo que sí está verificado es el HTML que ese robot va a leer (§3).
- ⚠ **La miniatura real en WhatsApp NO VERIFICADA.** Hay que mandarse el enlace a uno mismo.
- ⚠ **Los botones desde un teléfono real NO VERIFICADOS.** En el navegador integrado el portapapeles
  está denegado (`NotAllowedError`) y los emergentes bloqueados, así que el ejecutor comprobó el
  camino de fallo («No se pudo copiar») y, con un doble de prueba, el de éxito y el texto exacto que
  se copia. Falta verlo en un teléfono de verdad.
- ⚠ **La caché del borde no se puede leer desde fuera.** Vercel devuelve al cliente
  `Cache-Control: public, max-age=0` aunque la función pide `s-maxage=300`; que sí lo respeta se
  deduce de `X-Vercel-Cache: HIT` con `Age: 40`. No es un fallo.

## 6. Avisos para quien venga detrás

- **`node --test test/` no funciona con Node 24** (trata `test/` como un módulo). Es **`node --test`**
  a secas, desde la raíz del repo. El plan traía el comando malo; queda corregido en el README.
- **No quites el `<base href="/">`** del `<head>` ni los marcadores `og:inicio`/`og:fin`. Los dos
  tienen su comentario encima explicando por qué.
- **No le quites el guion bajo a `api/_og.js`.** Vercel publica como endpoint todo archivo dentro de
  `api/`; el guion bajo es lo que lo deja fuera.
- **Duplicación consciente:** `precioTexto()` existe dos veces, en `api/_og.js` (Node) y en `app.js`
  (navegador). No hay forma de compartirlo sin montar un empaquetador. Si cambias el formato del
  precio, cámbialo en los dos; los dos llevan el aviso.
- **El orden del botón de Facebook no es casual:** primero se lanza la copia al portapapeles (con el
  documento todavía enfocado) y después se abre la ventana **sin `await` delante**, porque un `await`
  ahí la convierte en emergente bloqueada. Es el mismo motivo que ya documenta `revalidarCierre`.
- **Stock+ publica el catálogo al repo cada pocas horas.** Antes de un push hay que traer esos
  commits (`git pull --rebase`); tocan solo `catalogo.json`, así que no chocan con el código.

## 7. Pendiente, y no es de código

**8 productos tienen la foto rota** (404 en Cloudinary). No lo causa este cambio, pero ahora pesa
más: compartir uno de ellos da una tarjeta sin imagen. Se arreglan volviendo a subir la foto desde
Stock+:

| Código | Producto | Código | Producto |
|---|---|---|---|
| `NM9F` | Calcomanía para tanque de moto 1 | `YL97` | Medias Negras (2 pares) |
| `TF6K` | Esponjas de baño | `WDWV` | Moledor de sazones recargable |
| `R4L3` | Glucomanan | `ZREY` | Mono enterizo 3 |
| `S23D` | Pulover Unisex Negro de Pantera | `5VE5` | Sandalias suela negra 🖤 |

También quedó fuera de alcance, a propósito, indexar las 238 páginas de producto en Google (bastaría
con generar el `sitemap.xml` con esas URL: la función ya devuelve HTML real) y limpiar las fotos del
catálogo, que son capturas de la tienda de origen y traen flechas, «1/9» e iconos de interfaz —
inapreciables en la rejilla a 220 px, bien visibles en una tarjeta de Facebook.

## 8. Commits de esta sesión

```
43f2a5c web: base href raiz, sin ella /p/<codigo> sale sin estilos ni JS
bd441af web: botones de compartir por WhatsApp y Facebook en el detalle
cda9410 web: /p/<codigo> abre el detalle de ese producto
7b1c45f web: ruta /p/<codigo> hacia la funcion del producto
c47684d web: funcion que sirve /p/<codigo> con las etiquetas del producto
fbcbc45 web: marcadores og:inicio/og:fin en la cabecera
0f6e2d2 web: modulo puro de etiquetas og: por producto
```

Archivos nuevos: `api/_og.js`, `api/producto.js`, `test/og.test.js`, `test/producto.test.js`.
Modificados: `index.html`, `estilos.css`, `app.js`, `vercel.json`, `_redirects`, `README.md`.

---

## 9. Segunda tanda del mismo día: lo que pidió Ruth al probarlo

Ruth usó los botones en cuanto se desplegaron y pidió cuatro ajustes. Todos hechos y en producción
(commits `745c4c7`, `fa78688`, `1c65f92`).

| Lo que dijo | Qué se hizo |
|---|---|
| «en el portapapeles no se copia la explicación del producto» | El texto compartido lleva ahora la descripción completa (`notes`), entre el precio y el enlace |
| «me gustaría que esté el link del grupo cada vez que comparten» | Se añade `👥 Únete a nuestro grupo de ofertas:` con `CAT.tienda.grupoWA`, **después** del enlace del producto |
| «el texto diga comparte los productos para que ganes comisiones» | El rótulo del bloque pasó a «Comparte los productos para que ganes comisiones» |
| «los botones son muy pequeños» | De 40 px y letra de 13 a **48 px y letra de 15** (el mismo alto que «Añadir»), repartidos con `flex:1 1 140px` |

**Dos decisiones que se tomaron aquí, con su motivo:**

1. **El enlace del producto va ANTES que el del grupo, siempre.** WhatsApp dibuja la vista previa del
   **primer** enlace del mensaje: si el grupo fuera primero, la tarjeta sería la del grupo y no la
   del producto, que es justo lo que costó construir. Si alguien reordena ese texto, lo rompe.
2. **«Copiar enlace» sigue copiando solo la URL**, sin el texto ni el grupo: es lo que dice su
   nombre, y sirve para pegar la dirección en un estado o un perfil. Se le dijo a Ruth.

**Sobre el rótulo:** se le advirtió que un cliente sin enlace de gestor no cobra comisión y que ese
texto se lo promete igual. Decidió el mismo texto para todos. Queda escrito porque es una decisión
suya, no un descuido.

**Verificado en producción** (`https://www.3bqba.com/p/U8DN?ref=5D9K9`, a 375 px): el rótulo se lee
entero, WhatsApp y Facebook caen arriba y Copiar enlace abajo, sin desbordamiento. Tienda: 26/26
pruebas.

**Aviso para quien despliegue:** al comprobar el despliegue con `curl` sobre `/` y `/app.js`, las
cinco primeras lecturas devolvieron el contenido **viejo** aunque la versión nueva ya estaba
publicada —caché del borde de Vercel, que un `?v=<timestamp>` no siempre esquiva—. No es un
despliegue fallido. Antes de volver a desplegar «porque no se ve», compruébalo contra
`raw.githubusercontent.com` y con otra ruta (`/index.html` en vez de `/`).

## 10. Lo que se arregló en los datos ese mismo día

Las **8 fotos rotas** del §7 están recuperadas, y con ellas otras **2** que tenían la foto en
`/uploads/` en vez de en Cloudinary (`Pulover Unisex Navideño 3` y `Pulover de hombre 4`). Se
recuperaron de la copia local que Stock+ guarda en `fotos/<categoria>/<id>.jpg`, se volvieron a
subir con `POST /api/upload` y cada producto se apuntó a la URL nueva con
`PUT /api/products/<id>` — nunca tocando `data.json` a mano. Catálogo publicado: **240 productos,
cero fotos rotas** comprobado contra `https://www.3bqba.com/catalogo.json`.

La capacitación «📲 Compartir productos de la 3B» vive en el otro repo:
`C:\inventario\inventario-stockmas\docs\informes\2026-10-10-capacitacion-compartir-productos.md`.
⚠ Requiere que Ruth **reinicie Stock+** para verla en el panel.
