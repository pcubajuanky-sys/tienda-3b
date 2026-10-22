# Preguntar por un producto + completar la mensajería gratis (2026-10-22)

**Rama:** `preguntar-y-completar` (5 commits de código + documentos). **SIN PUSH.**
**Plan:** `docs/superpowers/plans/2026-10-22-preguntar-y-completar-mensajeria.md`
**Revisión que lo originó:** `docs/auditorias/2026-10-22-revision-ux-y-ganchos-de-venta.md`

---

## Qué se hizo y por qué

La revisión del 22/10 encontró dos huecos donde la tienda perdía a una clienta **ya
convencida**. Los dos están cerrados.

**(1) «Te faltan 1.550 CUP para la mensajería gratis» y nada que tocar.** Se le decía lo que
le faltaba y se la dejaba volver sola a una parrilla de 225 productos a calcular cuál cabe.
Ahora, debajo del total, salen hasta 4 productos **que de verdad cruzan el umbral**.

**(2) Una tienda que vende por WhatsApp y no tenía un botón para preguntar.** Los tres
botones de WhatsApp de la ficha servían para **compartir** el producto, no para preguntar por
él. Sin pasarela de pago, la conversación de WhatsApp *es* el checkout: poner una barrera
antes de ella es cerrar la caja. Esto arrastra además el hueco A6 de la revisión: el aviso de
`espera.js` decía *«Escríbenos y te avisamos si se libera»* sin nada que pulsar.

---

## Piezas nuevas

| Archivo | Qué es |
|---|---|
| `preguntar.js` | Módulo puro: texto y enlace de WhatsApp para preguntar por un producto. |
| `completar.js` | Módulo puro: elige qué ofrecer para cruzar el umbral de mensajería. |
| `app.js` → `destinoWhatsApp()` | **Helper nuevo**: el único sitio que decide a qué WhatsApp se escribe. |
| `app.js` → `pintarPreguntarProducto()` | Pinta el botón de la ficha. |
| `app.js` → `completarEnvioHtml()` / `pintarCompletarEnvio()` | Pintan la tira, en panel y aside. |

### 🔴 Reglas que no se pueden romper

- **Solo se ofrece lo que `precioCUP >= falta`**, es decir lo que de verdad cruza el umbral.
  Un producto más barato que el hueco no da mensajería gratis, y ofrecerlo como si la diera
  sería mentir. Van **de más barato a más caro**: el primero que cruza es el que menos le
  cuesta a la clienta.
- **El destino de WhatsApp sale SIEMPRE de `destinoWhatsApp()`.** No vuelvas a escribir la
  expresión a mano: hay un test que lo impide (ver abajo).
- `completar.js` descarta los productos **con variantes** a propósito: la tira añade de un
  toque con `data-add="<id>"`, y con variantes la clave de carrito no es el id a secas.
- El precio de la tira va **siempre en CUP**, aunque el resto de la tienda respete `p.moneda`:
  el hueco que se está llenando es en CUP, y enseñar «$2» al lado de «te faltan 1.550 CUP»
  obligaría a la clienta a convertir de cabeza.

---

## El refactor que no estaba en el plan: `destinoWhatsApp()`

Al cablear el botón saltó en rojo `test/negocio.test.js`. Esa prueba **cuenta** cuántas veces
aparece `gestorRecargo && gestorRecargo.telPublico` en `app.js` y exige que todas lleven la
guarda `esCasaWeb()`. Existe porque esa lógica duplicada ya causó un fallo real: en la tienda
del socio el pedido se desviaba a un gestor que no pone ese precio.

El plan añadía una **tercera** copia. La salida elegida (decisión del usuario) no fue subir el
contador, sino **extraer el helper** y usarlo en los tres sitios: `pintarPregunta` (búsqueda
sin resultados), `pintarPreguntarProducto` (nuevo) y `enviarPorWhatsApp` (el pedido).

La barrera pasó de *contar copias* a ser **estructural**: con un solo sitio, olvidar la guarda
deja de ser detectable para ser imposible. La prueba se reescribió para exigir **una sola**
aparición más `function destinoWhatsApp()`.

🔴 **Cambio de comportamiento, intencionado:** en `enviarPorWhatsApp` la expresión terminaba
en `|| CAT.whatsapp`, sin la guarda `CAT &&` que sí tenían las otras dos. El helper lleva la
forma defensiva. Con un catálogo cargado no cambia nada.

---

## Verificación — lo que SÍ se observó

### Pruebas automáticas

| Momento | Resultado |
|---|---|
| Baseline, antes de tocar nada | **158/158, exit 0** |
| Tras `preguntar.js` (+8) | **166/166, exit 0** |
| Tras cablear la ficha + helper | **166/166, exit 0** |
| Tras `completar.js` (+11) | **177/177, exit 0** |
| Final | **177/177, fail 0, exit 0** |

Corridas con `node --test` desde la raíz y **observadas**, no deducidas.

### En navegador, a 375 px, contra un servidor local

Las 8 comprobaciones del plan, todas pasadas:

1. ✅ El botón sale debajo de «Añadir», **327 × 44 px**, secundario, sin competir con la compra.
2. ✅ El enlace lleva el mensaje escrito con nombre **y código**:
   `Hola 3B 👋 / Me interesa *Abrigo de Chihuahua…* (código 5HP4). / ¿Me pueden dar más información?`
   Destino `5354978966` (el número de la casa), `target=_blank` + `rel=noopener`.
3. ✅ Producto en espera: el botón dice **«💬 Avísame si se libera»**, el mensaje dice
   «…que está pedido. ¿Me avisan si se libera?», «Añadir» sigue deshabilitado y el aviso
   largo sigue encima.
4. ✅ Con 450 CUP en el carrito sale la tira con 4 productos.
5. ✅ **La aritmética es honesta:** «Te faltan 1.550 CUP» → el más barato ofrecido cuesta
   **1.600**. Los 4 cruzan el umbral, van ordenados de menor a mayor y ninguno repite lo que
   ya está en el carrito.
6. ✅ Pulsando una tarjeta: el carrito pasa de **450 → 2.050 CUP**, la línea cambia a
   **«🎉 Tu pedido lleva mensajería gratis»** y la tira desaparece sola.
7. ✅ Al vaciar, la tira queda oculta y su `innerHTML` vacío: no deja basura ni hueco.
8. ✅ A **1280 px** el aside enseña la tira (251 px dentro de 300, sin desbordar) y su HTML es
   **idéntico** al del panel: la «única fuente de verdad» comprobada, no supuesta.

Capturas: `2026-10-22-preguntar-ficha-375px.jpg` y `2026-10-22-completar-carrito-375px.jpg`.

El `localStorage` del navegador de prueba se dejó **vacío** (comprobado) y el servidor local,
parado.

---

## ⚠ Lo que NO está verificado

- ⚠ **Ningún teléfono real.** Todo en Chrome de escritorio con viewport emulado a 375 px.
- ⚠ **No se envió ningún mensaje de WhatsApp.** Se comprobó la URL y su texto, no que llegue.
- ⚠ **No se ha desplegado.** `git push` publica para clientes reales y **requiere el visto
  bueno de Ruth**. La rama está sin push a propósito.
- ⚠ **No se probó sin conexión** (el `ARMAZON` del service worker se validó por lista, no
  desconectando el navegador).
- ⚠ **No se probó el caso del gestor con recargo.** Hoy `precios-gestores.json` no tiene
  ninguno activo, así que el botón apunta al número de la casa, que es la rama por defecto.
  La rama del gestor está cubierta por lectura de código y por el test de `negocio.test.js`,
  **no observada en vivo**.

---

## Al desplegar (para quien lo haga)

1. 🔴 **Pide el visto bueno de Ruth antes del `push`.**
2. Hay que **mergear a `main` y empujar**. Ojo: Stock+ publica el catálogo al remoto por la
   **API de GitHub**, así que `main` habrá avanzado con commits de catálogo mientras tanto.
3. Tras publicar, 🔴 **la primera carga ejecuta el código VIEJO**: el service worker anterior
   sirve su caché mientras el nuevo se instala. **Hay que recargar una segunda vez.** Antes de
   dudar del cambio, comprobar en consola qué corre de verdad:
   ```js
   await caches.keys()            // tiene que decir tienda-3b-v21
   typeof destinoWhatsApp         // "function"
   typeof completarEnvioHtml      // "function"
   ```
4. Repetir en producción las comprobaciones 1, 4 y 5 de arriba.

---

## Corrección pendiente al `CLAUDE.md` del usuario

El gotcha de la tienda sobre `node:vm` está enunciado **demasiado ancho**. Dice que
«`assert.deepStrictEqual` contra un array literal FALLA». Medido el 22/10, la regla real es
más fina:

- Un `return []` **literal dentro del módulo** nace en el sandbox → `r instanceof Array` es
  **false** → `deepStrictEqual` contra un literal falla.
- `items.filter(...)` **hereda el `Array` de `items`**, que se pasa desde fuera → es un Array
  normal → `deepStrictEqual` sobre `.map(...)` funciona sin problema.

Por eso en `test/completar.test.js` los dos tests de salidas tempranas usan
`assert.strictEqual(x.length, 0)` y los otros nueve sí usan `deepStrictEqual`.

---

## Commits de la rama

```
eda810b  chore: cache v21 con preguntar.js y completar.js en el armazon
165b2be  feat: tira para completar el pedido y ganar la mensajeria gratis
523df94  feat: modulo puro que elige que ofrecer para cruzar la mensajeria gratis
c788ad7  feat: boton para preguntar por un producto desde su ficha
135ab31  feat: modulo puro para preguntar por un producto por WhatsApp
1724ddd  docs: revision UX/ganchos de venta y plan de preguntar+completar
```

## Lo que queda abierto de la revisión del 22/10

Tanda 2 (sellos y colocación): **A3** ahorro real en las ofertas — hay 6 con 5-9 % de
descuento anunciadas igual que una del 60 % —, **A4** sello NUEVO, **B2** subir «Los más
vendidos», **B3** ordenar categorías por tamaño, **B5** sacar el titular de comisiones de la
ficha. Tanda 3 (catálogo, en Stock+): subcategorías reales —hoy `subcat` está **vacío en los
225**—, las 10 descripciones que faltan y el nombre cortado. Tanda 4: **A5** el grupo de
WhatsApp visible y **B1** la parrilla por tandas (219 tarjetas de golpe), *después* de medirla
en un teléfono real.
