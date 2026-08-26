# 2026-08-26 — Hogar salía con la casita 🏠 en vez de foto

## Síntoma reportado
En la tienda (3bqba.com), la tarjeta de la categoría **Hogar** mostraba el emoji 🏠
("una casita") en lugar de una foto, como sí hacían las otras 21 categorías.

## Causa raíz (verificada)
No era un fallo de la categoría: **la foto que le tocaba está borrada en Cloudinary**.

Cada tarjeta de categoría muestra UNA sola foto: la del **primer producto** de esa
categoría (`mosaicoFotos()` → `fotos[0]`, `app.js`). Si esa imagen no carga, el
`onerror` la cambiaba directamente por el emoji de la categoría (`cat3dImgFallback`).

El primer producto de Hogar (orden alfabético) es **"Accesorio de baño"**
(`p_1781004937627`), cuya foto devuelve **404**:

```
https://res.cloudinary.com/dvahidqdw/image/upload/v1781004862/productos/lhvet1oij0ftij9eepf8.jpg
→ 404 (Cloudinary responde un GIF vacío)
```

Evidencia observada (curl a la primera foto de las 22 categorías con productos):

```
404  Hogar  (Accesorio de baño)
200  las otras 21 (Electrodomésticos, Ropa, Muebles, Cabello, ...)
```

Los otros 9 productos de Hogar tienen foto y cargan bien (200 OK). O sea: la
categoría tenía 9 fotos sanas y aun así se rendía porque la elegida estaba muerta.

**La foto no es recuperable:** la misma URL muerta aparece en los 14 backups de
`data.json` (`backups/data-2026-08-13.json` … `data-2026-08-26.json`). No hay
versión anterior que rescatar; hay que volver a subir la imagen desde el panel.

## Qué se cambió (solo `app.js` de la tienda)
Que una foto muerta no tumbe la tarjeta entera cuando la categoría tiene más fotos:

1. `mosaicoFuente(items)` (nueva): la lista de fotos candidatas de un grupo, en el
   mismo orden y con el mismo origen que ya usaba el mosaico. `mosaicoFotos()` pasa
   a construirse sobre ella — su resultado no cambia.
2. `itemsDeCategoria()` / `itemsEnOferta()` (nuevas): para no repetir el filtro.
3. `cat3dFotoHtml(fotos, marcador, alternas)`: cuando la tarjeta lleva UNA sola foto
   (modo actual), el `<img>` sale con `data-repuesto` = hasta 3 fotos distintas de
   repuesto. En modo mosaico de 4 no se emite el atributo → comportamiento idéntico al de antes.
4. `cat3dImgFallback(img)`: si quedan repuestos, prueba el siguiente; solo cae a la
   inicial/emoji cuando se acaban. Tope `CAT3D_MAX_INTENTOS = 4`.

### ⚠ Trampa de la CSP — NO tocar el texto del `onerror`
La CSP (en `vercel.json` **y** en `_headers`) lleva `'unsafe-hashes'` + dos sha256 que
son exactamente los de los dos manejadores inline del código:

```
imgFallback(this)       → sha256-IgfvsMxU0cNd1rO/xYd7q/idqoiQwZM9Fab8C6FXfbM=
cat3dImgFallback(this)  → sha256-VCRuweeAncgzJx/l38EeCb2/+3XWgxt5JBezOkk5E+w=
```

(Comprobado con `openssl dgst -sha256`.) Cambiar **una sola letra** de esos atributos
deja el fallback bloqueado en producción sin que se note en local. Por eso el fix mete
los repuestos en un `data-*` y deja el `onerror` byte a byte igual.

## Verificación (observada, servidor estático local en :4173)
- `node --check app.js` → sintaxis OK. CRLF del archivo intacto. Los 2 manejadores
  inline siguen siendo los mismos (hashes de la CSP válidos).
- Tarjeta de Hogar tras el fix: la foto muerta falla, salta a la siguiente
  (`isqaptoba6wgp0ogrwni.jpg`) y **carga** (`naturalWidth = 200`), sin emoji, con
  2 repuestos aún en reserva.
- Las 23 tarjetas: **ninguna** cae al emoji; 0 regresiones.
- Caso extremo (todas las fotos muertas, forzado en el DOM): 3 intentos y para,
  terminando en `<span class="inicial">🏠</span>`. No hay bucle.

## Lo que este cambio NO arregla
La **tarjeta del producto "Accesorio de baño"** sigue sin foto (muestra la inicial "A"),
porque su imagen ya no existe. Solución: **volver a subirla desde el panel de Stock+**
(nunca editando `data.json` a mano) y republicar el catálogo.

## Estado — PUBLICADO Y VERIFICADO EN PRODUCCIÓN

- Commit `9e252e3` sobre `main`, empujado a GitHub (`5d941bd..9e252e3`). Antes del push
  hubo rebase sobre los 15 commits automáticos de catálogo que Stock+ había publicado
  desde el 23/8 (solo tocaban `catalogo.json`; sin conflictos).
- Vercel desplegó solo. El `app.js` servido en https://www.3bqba.com es **idéntico** al
  local (única diferencia: la normalización CRLF→LF que hace git al versionarlo).
- **Comprobado en el sitio real**, no solo en local: la tarjeta de Hogar carga foto
  (`naturalWidth = 200`, la de "Alarma de puertas y ventanas"), sin emoji, con 3
  repuestos en reserva. Esto además demuestra que **la CSP no bloquea el `onerror`**:
  si el hash no casara, el intercambio nunca habría ocurrido. El único error en consola
  es el 404 esperado de la foto muerta.
- Sin captura de pantalla: el panel del navegador no estaba visible para componer
  fotogramas. La evidencia es la inspección del DOM en producción, descrita arriba.
- El catálogo vivo (157 productos) **sigue trayendo la URL muerta**: queda pendiente que
  Ruth vuelva a subir la foto de "Accesorio de baño" desde el panel de Stock+.
- Se añadió una entrada `tienda-3b` (servidor estático local, puerto 4173) al
  `launch.json` de la sesión, para poder verificar la tienda en el navegador.

### Nota: `docs/` se publica junto al sitio
Vercel sirve el repo entero, así que este informe queda accesible en
`https://www.3bqba.com/docs/informes/...` (igual que ya pasaba con `README.md`).
No lleva nada sensible — las URLs de Cloudinary y los hashes de la CSP ya son públicos —
pero si se prefiere que no se publique, basta con un `.vercelignore` que liste `docs/`.
