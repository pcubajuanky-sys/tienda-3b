# Arranque de la próxima sesión — Tienda 3B

> **Léeme primero.** Este archivo es el único contexto que necesitas para seguir.
> Fecha de corte: **2026-10-28**. Si lo que dice aquí no coincide con el código, manda el código.

---

## 1. Dónde estamos hoy

Todo lo trabajado en octubre está **desplegado y verificado en producción** (www.3bqba.com).
`main` = `origin/main` = `4690035`. Árbol limpio. Caché del service worker: **`tienda-3b-v27`**.

Lo último que entró (27/10, en este orden):

| Qué | Caché |
|---|---|
| Tinta accesible (contraste WCAG) + la tasa a la vista | `v23` |
| La tasa en la portada + umbral + aviso de regreso + relacionados en CUP | `v24`/`v25` |
| El sello de oferta dice `-X%` | `v26` |
| La línea del cambio sale del centro y se pega encima del umbral | `v27` |

## 2. Lo que se arregló el 28/10 (ya hecho, no lo repitas)

**El «Paquete de 4 Tic-Tacs» tenía una oferta que SUBÍA el precio.** `saleUSD 0.70` con
`ofertaUSD 0.72`: el cliente pagaba **612 CUP** por algo cuyo precio normal son **595**.
La tienda ya no lo anunciaba como rebaja (eso se tapó el 27/10), pero seguía cobrando de más
y saliendo en el filtro «🏷️ Ofertas».

Arreglado **por la API, nunca tocando `data.json` a mano**:

```bash
curl -X PUT "http://localhost:3000/api/products/p_1780614185839" \
  -H "Content-Type: application/json" -d '{"ofertaActive":false}'
```

Se apagó la oferta y **se dejaron guardados** `oferta: 598` y `ofertaUSD: 0.72`, por si Ruth
quería un descuento de verdad y se equivocó al teclear. Comprobado después: **31 ofertas
activas y CERO que no rebajen**.

🔴 **Pendiente de un clic de Ruth:** el precio nuevo (595 CUP) no llega a la tienda hasta que
Stock+ **republique el catálogo** — solo o con «Publicar catálogo ahora». `webAutoHoras` es
**5**, así que se arregla solo en ≤5 h. No se publicó desde aquí a propósito: eso es una
acción hacia afuera que no se pidió.

## 3. 🔴 Dos cosas que el `CLAUDE.md` dice MAL

1. **«Preguntar por un producto + completar la mensajería gratis (2026-10-22, EN RAMA, SIN
   PUSH)» es FALSO.** Comprobado hoy: `git log main..preguntar-y-completar` está **vacío**
   (ya fusionado) y `preguntar.js` y `completar.js` dan **200 en producción**. Están vivos.
   No intentes desplegarlos.
2. **«La página por gestor está inerte, el archivo da 404» es FALSO** desde el 27/10.
   `precios-gestores.json` da **200** con el gestor **`QGZUQ`**. Quien entre por su enlace ve
   **sus** precios, la banda «🤝 Estás en la página de…» y el pedido sale a **su** WhatsApp.

---

## 4. Mejoras pendientes, por orden de lo que más vende

### A — Decisiones de Ruth (no hay nada que programar hasta que conteste)

- [ ] **A1 · ¿El gestor con recargo es intencional?** Hoy `QGZUQ` está activo y la rama del
      gestor **nunca se probó con uno vivo** (cuando se escribió, no había ninguno). Si NO era
      la idea: quitarle el recargo en Stock+ (🤝 Gestores) y el archivo vuelve a 404 solo.
      Si SÍ: hay que probar de verdad un pedido entrando por `?ref=QGZUQ` y ver que llega al
      WhatsApp del gestor con **sus** precios.
      **Éxito:** una respuesta de Ruth y, si sigue activo, un pedido de prueba comprobado.
- [ ] **A2 · Promesa de entrega.** La tienda no dice en cuánto tiempo llega el pedido. Es de
      lo que más frena una compra, pero el número lo tiene que poner Ruth («24–48 h en San
      Antonio», lo que sea real). Sin dato real **no se inventa**.
      **Éxito:** una frase de Ruth que sea verdad el 90 % de las veces.

### B — Ganchos de venta con dato real detrás

- [ ] **B1 · Prueba social.** Medido hoy sobre `data.json`: **211 pedidos completados en los
      últimos 30 días**, de ellos **173 de la web** (135 completados). Da para una línea
      honesta en la portada tipo «200+ pedidos entregados este mes».
      🔴 **El número lo tiene que publicar Stock+** (`lib/catalogoWeb.js`, junto a `tasa` y
      `generado`); la tienda **no calcula reglas de negocio**, solo pinta lo que recibe.
      **Éxito:** el número viaja en `catalogo.json`, se pinta, y si falta la línea no aparece.
- [ ] **B2 · El carrusel «Los más vendidos» no se ordena ni se filtra.** El desplegable y el
      chip 🛵 solo afectan a la parrilla. Pendiente desde el 14/10. Decidir si debe seguirlos
      o quedarse fijo a propósito (hay argumento para las dos cosas).

### C — Deuda técnica que ya mordió una vez

- [ ] **C1 · Falta `ELTOQUE_TOKEN` en `bot-mia/.env`.** La lectura automática de la tasa está
      encendida pero **no funciona** (`eltoque: sin-clave`, `valor: null`), así que la tasa la
      transcribe Ruth a mano mirando elTOQUE. 🔴 El **origen** sí es elTOQUE (por eso los
      textos de la web son honestos); lo roto es el **mecanismo**.
      **Éxito:** `ultima.valor` deja de ser `null`.
- [ ] **C2 · Un cambio de tasa a mano NO republica el catálogo.** `PUT /api/config` sella
      `manualTs` pero no llama a `publicarAhora`, así que la tienda puede enseñar hasta **5 h**
      una tasa vieja. Por eso los textos dicen «Cambio que usamos» y **nunca** «la tasa del
      día» — si se arregla esto, se puede ser más ambicioso con el texto.
      **Éxito:** cambiar la tasa en el panel y ver el `catalogo.json` publicado al momento.

### D — Defectos conocidos, viejos y sin arreglar

- [ ] **D1 · La foto grande de la ficha deja una franja de ~35 px a la derecha a 375 px**, por
      `.modal-foto{aspect-ratio:1;max-height:340px}`.
- [ ] **D2 · El modal de encargos y el recuadro de gestor están fuera del historial de capas**:
      el «atrás» del teléfono no los cierra. Fue decisión del plan del 18/10, no un olvido —
      si se mete alguno, va a `transicion` **y** a las dos ramas de `sincronizarCapas`.

### E — Lo que nadie ha verificado nunca (no es trabajo, es honestidad)

- **Ningún teléfono real.** Todo está medido en Chrome de escritorio con viewport emulado:
  el gesto de deslizar fotos, el «atrás», los avisos, los botones de 44 px.
- **Sin probar sin conexión**, pese a ser una PWA.
- **La imagen para compartir no se ha generado nunca** desde que `tarjeta.js` depende de
  `descuento.js` (probado por unidad, nunca dibujado).
- **Ningún pedido real enviado** en ninguna prueba, a propósito.

---

## 5. Cómo arrancar

```bash
cd C:\inventario\tienda-3b
git pull --ff-only          # Stock+ publica a este repo solo
node --test                 # 236/236, exit 0
```

Lo que de verdad hay que tener en la cabeza:

1. 🔴 **Tocar `app.js`, `estilos.css`, `index.html` o cualquier archivo de `ARMAZON` OBLIGA a
   subir `CACHE` en `sw.js`** (`v27` → `v28` → …). Si no, quien tenga la tienda instalada
   sigue viendo el código viejo.
2. 🔴 **La primera carga tras un despliegue corre el código VIEJO.** Comprueba
   `<funcion>.toString()` en la consola, no el `curl` del archivo. Hace falta recargar otra vez.
3. 🔴 **`node --test` desde la raíz, NUNCA `node --test test/`** (falla con Node 24).
4. 🔴 **`catalogo.json`, `precios-gestores.json` y `sitemap.xml` los publica Stock+.** Se
   pueden tocar para probar, se restauran con `git checkout --` y **jamás** se commitean.
5. 🔴 **Para probar «Pedir por WhatsApp» en producción, sustituye `window.open` por una
   función que solo capture la URL**, o a Ruth le llega un pedido falso. Después limpia
   `carrito`, `pedidoEnviado`, `direcciones` y `ultimaVisita` del navegador de prueba.
6. 🔴 **`data.json` de Stock+ NO se edita a mano, nunca.** Solo por la API, como el arreglo
   del Tic-Tac de arriba.
7. Para **mirar** de verdad: `npx --yes serve -l 4173 .` y Chrome del sistema con
   `puppeteer-core` **en el scratchpad** (nunca instalado en el repo). El panel de navegador
   integrado mide ~294 px y escala las capturas: son ilegibles.

## 6. De dónde sale todo esto

- Revisiones: `docs/auditorias/2026-10-22-revision-ux-y-ganchos-de-venta.md` y
  `docs/auditorias/2026-10-27-tasa-visible-colores-y-ganchos.md`
- Informes de las últimas tandas: `docs/informes/2026-10-27-*.md`
- Estado estable del proyecto: la sección «Tienda web 3B» de `C:\Users\JyR\CLAUDE.md`
  (con las dos correcciones del §3 de este archivo ya aplicadas)
