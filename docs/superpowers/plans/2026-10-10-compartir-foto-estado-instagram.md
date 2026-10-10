# Compartir foto — estado de WhatsApp e historias de Instagram

**Fecha:** 2026-10-10 · **Piloto:** Opus 5 (pilot-mode) · **Repo:** `C:\inventario\tienda-3b` (rama `main`)
**Repo secundario (Task 6):** `C:\inventario\inventario-stockmas` (rama `mensajeria-zonas`)
**Decisiones de Ruth, tomadas en la sesión:** imagen con nombre + precio + logo 3B · solo vertical 9:16 · **un** botón.

---

## 0. El problema, en una frase

Un gestor que vende por Instagram o por el estado de WhatsApp no tiene nada que compartir: los tres
botones de hoy (WhatsApp, Facebook, Copiar enlace) mandan **texto con un enlace**, y en el estado un
enlace se ve diminuto y en Instagram **no se puede pinchar**. Lo que se vende en esos dos sitios es
una **foto con el precio encima**.

## 1. Lo que NO se puede hacer (y por qué este plan es el que es)

**Instagram no acepta nada desde una web.** No existe un `instagram.com/share?url=`; Instagram cerró
esa puerta a propósito. No hay forma de prerellenar el pie de foto ni de publicar por el gestor.
Cualquier plan que prometa un botón «publicar en Instagram» es mentira.

Lo que sí existe y es el camino real, el mismo para los dos destinos que pidió Ruth:

1. la tienda **genera la imagen** en el propio teléfono;
2. el botón abre la **hoja de compartir del sistema** con la imagen dentro (`navigator.share` con
   `files`) → ahí aparecen «Historia de Instagram», «Estado de WhatsApp», Telegram, lo que tenga;
3. el **texto** (nombre, precio, descripción, su `?ref=`, el grupo) se le copia al portapapeles en el
   mismo gesto, para que lo pegue en el pie.

Y un detalle que hay que **enseñarle** (Task 6), porque si no publica su enlace donde nadie puede
tocarlo: en Instagram el enlace del pie no es clicable → va en su **biografía** o como **pegatina de
enlace** en la historia.

## 2. Hechos del terreno, ya verificados por el piloto

- **Cloudinary permite el canvas.** `curl -I` con `Origin: https://www.3bqba.com` sobre una foto real
  devuelve `Access-Control-Allow-Origin: *`. Con `img.crossOrigin = 'anonymous'` el canvas **no**
  queda contaminado y `toBlob`/`toDataURL` funcionan. Sin ese atributo, fallan: no lo omitas.
- **La CSP sirve tal como está, con una condición.** `_headers` y `vercel.json` llevan
  `img-src 'self' https://res.cloudinary.com data:` y **`connect-src 'self'`**. O sea:
  - cargar la foto con `<img crossOrigin>` → **permitido**;
  - traerla con `fetch()` → **BLOQUEADO** (`connect-src 'self'`). No uses `fetch` para la foto;
  - `blob:` no está en `img-src`. Si algo tuyo necesita `blob:` (una previsualización, o un
    `<a href="blob:…">`), **primero** prueba con `toDataURL` (`data:` sí está permitido). Si no hay
    más remedio, añade `blob:` a `img-src` **en los DOS archivos** (`vercel.json` y `_headers`) —
    están duplicados a propósito, uno por proveedor — y dilo en el informe.
- **`script-src` lleva dos hashes** para handlers inline concretos. **No añadas ningún atributo
  `onclick`** ni `<script>` inline: rompes la CSP. Se cablea con `addEventListener`, como ya hacen
  las líneas ~1473-1475 de `app.js`.
- **Los scripts del navegador son IIFE con un global.** `mundos.js` acaba en
  `window.Mundos = {...}`, `encargos.js` en `window.Encargos = {...}`. El archivo nuevo sigue ese
  patrón. Se cargan en `index.html` líneas 401-403.
- **Pruebas:** `node --test` **desde la raíz** del repo. El README avisa: `node --test test/` falla
  con Node 24. Hoy hay 26 pruebas en `test/og.test.js` y `test/producto.test.js`; **mídelas antes de
  tocar nada** y anota la cifra.
- **Piezas que ya existen y se reusan, no se reescriben:** `fotoUrl(url, transform)` (app.js ~l.70)
  añade una transformación a una URL de Cloudinary; `textoCompartir(p, url)` (~l.577) arma el texto
  que se comparte; `urlProducto(p)` (~l.572) pone el `?ref=` del gestor; `avisoCompartir(texto)`
  (~l.591) pinta el aviso de debajo de los botones; `copiarAlPortapapeles(texto)` (~l.599).
- **Campos del producto:** `p.name`, `p.photo`, `p.codigo`, `p.precioUSD`, `p.precioCUP`, `p.moneda`
  (`'usd'` o no), `p.enOferta`, `p.precioNormalUSD`, `p.precioNormalCUP`, `p.notes`, `p.envio.corto`.

## 3. Reglas de esta tanda (no negociables)

- **Nada de commits y NADA de push.** Este repo despliega a producción con el push: desplegar es
  decisión de Ruth, no del ejecutor. Deja el árbol sucio y repórtalo.
- No toques `api/_og.js`, `api/producto.js`, `taxi.*`, `catalogo.json` ni `mundos.js`.
- No reescribas los tres botones actuales: se **añade** uno.
- La tienda tiene que seguir funcionando **igual** en un navegador que no sepa compartir archivos
  (escritorio): ahí el mismo botón **descarga** la imagen.

---

## Task 1 — `tarjeta.js`: la imagen 1080×1920

Archivo **nuevo** en la raíz, `tarjeta.js`, IIFE que expone `window.Tarjeta`. Cargarlo en
`index.html` **antes** de `app.js` (línea ~401, junto a `mundos.js`).

Expone:

- `Tarjeta.dibujar(p)` → `Promise<{ blob, dataUrl, nombreArchivo }>`. Dibuja en un `<canvas>` de
  **1080×1920** creado al vuelo (no se añade al DOM) y resuelve con el JPEG
  (`toBlob('image/jpeg', 0.9)`).
- `Tarjeta._puro = { precioTarjeta, lineasNombre, nombreArchivo }` — las funciones **sin canvas**,
  que son las que se prueban en Task 2.

### Las tres funciones puras

```
precioTarjeta(p)  → { grande: '$12 USD · 8.100 CUP', antes: '' | '$15 USD' }
```

Misma regla que `precioTexto` de `app.js` (la moneda de `p.moneda` va **primero**). Si `p.enOferta`,
`antes` lleva el precio normal en la **misma** moneda que abre `grande`; si no, `antes` es `''`. Usa
el mismo `fmt()` de miles que la tienda (`toLocaleString('es-MX')`).

```
lineasNombre(nombre, maxPorLinea, maxLineas)  → ['Clóset Armario Portátil', 'de Acero…']
```

Corta por palabras, nunca a mitad de palabra; si no cabe, la última línea termina en `…`. Una palabra
más larga que `maxPorLinea` se corta a lo bruto (hay nombres con `*asteriscos*` y sin espacios).
Devuelve como máximo `maxLineas` elementos. `maxPorLinea` por defecto **22**, `maxLineas` **2**.

```
nombreArchivo(p)  → '3b-U8DN.jpg'
```

Con el `codigo` en mayúsculas; si no hay código, `3b-producto.jpg`. Solo `[A-Za-z0-9-]`.

### El dibujo (1080×1920)

Orden y medidas concretas; si algo no cabe, manda la legibilidad en un teléfono pequeño:

1. Fondo **blanco** entero.
2. **Foto** en la zona de arriba, `0,0 → 1080×1280`, recortada estilo *cover* (centrada, calculada a
   mano con `drawImage` de 9 argumentos: nunca deformar la foto). La URL se obtiene con
   `fotoUrl(p.photo, 'f_jpg,q_auto,w_1080,c_limit')` y se carga con un `new Image()` con
   **`crossOrigin = 'anonymous'` puesto ANTES de `src`**. Si no es de Cloudinary, se usa tal cual
   (puede fallar el CORS: ver el rechazo de abajo).
3. **Nombre** debajo, desde y≈1400, hasta 2 líneas, `bold 64px system-ui, sans-serif`, color casi
   negro, centrado.
4. **Precio grande** en y≈1600, `bold 92px`, color de marca. Si hay `antes`, debajo o a su derecha en
   `48px` gris **tachado** (una línea dibujada sobre el texto; mide con `measureText`).
5. **Pie** en y≈1830: el `logo-3b.png` del propio dominio (`img-src 'self'`) a la izquierda, alto
   ~90px, y `3bqba.com` en `44px` gris a su derecha.
6. **Sin webfonts**: la CSP no tiene `font-src` y la tienda no carga ninguna. Fuentes del sistema.

Si la foto o el logo no cargan (`img.onerror`), **rechaza** la promesa con un `Error` que diga qué
falló. No dibujes una tarjeta a medias ni con un hueco: el gestor publicaría eso.

**Verificación de esta tarea:** `node --test` desde la raíz sigue en la cifra que midió al empezar
(este archivo no entra en las pruebas de Node todavía: eso lo hace Task 2).

---

## Task 2 — `test/tarjeta.test.js`

Las funciones puras se prueban en Node cargando `tarjeta.js` en un sandbox de `node:vm` con un
`window` falso (`const sandbox = { window: {} }`), y leyendo `sandbox.window.Tarjeta._puro`. El
canvas **no** se prueba aquí: no hay canvas en Node y montar uno no vale lo que cuesta (mismo
criterio que `publishToGroup` en bot-face, que se verifica a ojo con el navegador).

Casos, uno por `test()`:

1. `precioTarjeta` de un producto en USD → `grande` empieza por `$`, lleva ` · ` y acaba en `CUP`;
   `antes` es `''`.
2. `precioTarjeta` de un producto **en oferta** → `antes` trae el precio normal, en la misma moneda
   que abre `grande`, y `grande` **no** dice la palabra «Oferta» (eso es texto, no imagen).
3. `lineasNombre` con un nombre corto → una sola línea, sin `…`.
4. `lineasNombre` con un nombre largo de verdad (usa uno real: `Clóset Armario Portátil de Acero
   Inoxidable`) → 2 líneas, la segunda acaba en `…`, y **ninguna** línea pasa de `maxPorLinea`.
5. `lineasNombre` con una sola palabra larguísima → se corta, no devuelve `undefined` ni una línea
   vacía.
6. `nombreArchivo` → `3b-<CODIGO>.jpg` en mayúsculas; y sin código → `3b-producto.jpg`.

**Verificación:** `node --test` desde la raíz → la cifra inicial **+6**, `fail 0`. Pégala literal.

---

## Task 3 — el botón, en `index.html` y `estilos.css`

En `index.html` (~l.303, dentro de `.compartir-botones`), **el primero** de la fila porque es el que
más se va a usar:

```html
<button type="button" class="compartir-btn compartir-btn-foto" id="compartir-foto">📸 Compartir foto</button>
```

Sin `onclick`. En `estilos.css` (junto a `.compartir-btn`, ~l.699) añade `.compartir-btn-foto` con el
fondo de marca y texto claro, para que se vea que es el principal; reusa las variables que ya existen
(`--brand`, `--brand-soft`). Respeta el modo oscuro: mira cómo lo hacen los botones de al lado.

Cambia también el rótulo de arriba (`.compartir-tit`, l.302) solo si hace falta para que se entienda
que ahora hay una foto; si ya se entiende, **no lo toques**.

**Verificación:** abre la tienda en el navegador (basta un estático desde la raíz del repo), abre un
producto y comprueba a 375px de ancho que los cuatro botones caben sin desbordar, en claro y en
oscuro.

---

## Task 4 — `app.js`: el handler

Función `compartirFoto()` junto a las otras tres (~l.606-637) y su `addEventListener` junto a las
líneas ~1473-1475.

El orden de las operaciones **importa** y no es negociable (es el mismo aprendizaje que ya está
comentado en `compartirFacebook`): el portapapeles falla si el documento pierde el foco, y una
ventana abierta después de un `await` se convierte en emergente bloqueada.

1. Coge el producto con `productoDe(productoModal)`; si no hay, sal.
2. **Copia el texto ya**, sin `await` delante:
   `const copia = copiarAlPortapapeles(textoCompartir(p, urlProducto(p)))`.
3. Deshabilita el botón y `avisoCompartir('Preparando la foto…')` — dibujar tarda un instante en un
   teléfono lento, y si no hay señal el gestor lo pulsa cinco veces.
4. `await Tarjeta.dibujar(p)` → `new File([blob], nombreArchivo, { type: 'image/jpeg' })`.
5. Si `navigator.canShare && navigator.canShare({ files: [f] })` →
   `await navigator.share({ files: [f] })` y al volver
   `avisoCompartir('Foto lista — el texto ya está copiado, pégalo en el pie')`.
   **Captura el `AbortError`** (el gestor cerró la hoja de compartir) y no pintes error: eso no es un
   fallo.
6. Si no se pueden compartir archivos (escritorio, navegadores viejos) → **descarga**: un `<a>` al
   vuelo con `download = nombreArchivo`, y el aviso
   `'Foto guardada — súbela a tu estado y pega el texto'`. Para el `href` intenta el `dataUrl`
   (`data:` ya está en la CSP) antes que `URL.createObjectURL`.
7. Si `Tarjeta.dibujar` rechaza → `avisoCompartir('No se pudo preparar la foto; comparte el enlace')`
   y deja los otros botones como están. Reactiva el botón **siempre** (`finally`).

**Verificación:** en el navegador, con la consola abierta: pulsa el botón en tres productos (uno en
oferta, uno con nombre larguísimo, uno sin descripción). **Cero errores de CSP en la consola** (si
sale uno, es lo que avisa §2: arréglalo en los dos archivos de cabeceras y dilo). En escritorio tiene
que **descargar** el JPEG: ábrelo y míralo de verdad.

---

## Task 5 — evidencia visual

Guarda en `docs/informes/` (el repo ya tiene este hábito, mira los `.jpg` del 7 y el 10 de octubre):

- la imagen generada de un producto normal y la de uno **en oferta**, tal cual salen (son el
  entregable: si el precio no se lee de un vistazo en un teléfono, el trabajo no está hecho);
- captura de la ficha a **375px** con los cuatro botones, en claro y en oscuro.

---

## Task 6 — la capacitación 📲 (OTRO REPO: Stock+)

Repo `C:\inventario\inventario-stockmas`, rama `mensajeria-zonas`. **Árbol compartido con otras
sesiones**: `bot-mia/knowledge/catalogo.json` sale modificado y es ajeno — no lo toques y no
commitees nada.

En `lib/capacitacionGestor.js`, la función `pasosCompartir(cfg)` es el texto que Ruth manda por
WhatsApp. Hoy explica los tres botones. Hay que añadirle el cuarto y el truco de Instagram:

- un paso nuevo para **📸 Compartir foto**: hace una foto con el precio encima y abre la ventanita del
  teléfono para mandarla al **estado de WhatsApp** o a una **historia de Instagram**, y el texto queda
  copiado para pegarlo;
- el aviso de Instagram, con palabras de gestor: **en Instagram el enlace del pie no se puede
  pinchar** → su enlace va en su **biografía**, o como **pegatina de enlace** en la historia.

🔴 **Ni una cifra** en ese texto: es la regla roja de la cabecera del módulo (las ganancias las calcula
el código desde la configuración viva, nunca un texto a mano). Y recuerda que esta capacitación **ya
no lleva la tabla de ganancias**: entra directo en los pasos (cambio de hoy mismo).

Actualiza en `tests/capacitacionGestor.test.js` la prueba `compartir: el paquete lleva los pasos, el
enlace personal y el grupo` (~l.296) para que exija también el paso nuevo, y **añade** una que exija
el aviso de la biografía de Instagram.

**Verificación:** `npm test` desde `C:\inventario\inventario-stockmas` → baseline medida hoy
**1453 pass / 0 fail**; con la prueba nueva, **1454 pass / 0 fail**. Pega el resumen literal.

---

## Verificación final (la que decide si esto está hecho)

1. `node --test` en la raíz de `tienda-3b`: 26 + 6 = **32 pass, 0 fail** (mide el 26 tú mismo al
   empezar; si no es 26, usa tu cifra y dilo).
2. `npm test` en `inventario-stockmas`: **1454 pass, 0 fail**.
3. Las imágenes de Task 5, miradas de verdad.
4. Consola del navegador sin errores de CSP.

## Lo que queda ⚠ NO VERIFICADO al cerrar, pase lo que pase

- **Que la hoja de compartir del teléfono ofrezca Instagram y el estado de WhatsApp**, y que la foto
  entre bien en los dos. Eso solo se comprueba **en un teléfono real**, y lo tiene que hacer Ruth.
  `navigator.share` con archivos funciona en Android Chrome y en iOS Safari 16+; en escritorio casi
  nunca, y por eso existe el camino de la descarga.
- Que el panel de Stock+ muestre la capacitación con el paso nuevo: requiere **reiniciar `server.js`**.
- Que esto llegue a la web: requiere **commit y push** de `tienda-3b`, que decide Ruth.
