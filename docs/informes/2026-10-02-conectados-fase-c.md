# Informe de relevo — Conectados (remesas) · Fase C: el icono

**Fecha:** 2026-10-02 · **Plan:** `inventario-stockmas/docs/superpowers/plans/2026-09-30-conectados-fase-c-icono-y-publicar.md`
**Ejecución:** sesión nativa, piloto (Opus) orquestando subagentes sonnet. **La verificación del
navegador la hizo el piloto**, abriendo las tres páginas; no es el resumen de ningún subagente.

**Estado: las Tasks 1 a 5 están hechas. La Task 6 (publicar) NO: la pulsa Ruth.**

## Qué quedó hecho

| Task | Qué | Commit |
|---|---|---|
| 1 | Los tres booleanos que cruzan entre negocios (`conectadosActivo` en `catalogo.json` y `taxi.json`, `taxiActivo` en `conectados.json`) + tests | `fadc757` (stockmas) |
| — | `logo-conectados.png` (160×160) y `conectados-emblema.png` (320×320) | `0c0b5ab` |
| 2 | Pastilla en la tienda (`index.html` + `app.js`) | `3f1cbce` |
| 3 | Pastilla en el taxi (`taxi.html` + `taxi.js`) | `4308c5e` |
| 4 | Cabecera completa en Conectados + emblema en la portada y en `og:image` | `53ae93f` |

## El logo: por qué el icono no es el emblema que dio Ruth

La imagen que entregó Ruth (`Downloads\conectados .png`, 1254×1254) es un emblema circular con
mucho texto fino: «Remesas del mundo a Cuba», el eslogan y cuatro iconos con sus leyendas. **La
pastilla de la cabecera mide 44 px en móvil y 52 en escritorio** (`estilos.css:870` y `:903`), así
que todo ese texto se convierte en una mancha.

Se le enseñó a Ruth una comparación al tamaño real con dos candidatos y **eligió el recorte del
globo** con las flechas convergiendo en Cuba: es legible a 44 px y dice de qué va el negocio sin
leer una letra. El emblema completo no se tira — se usa en la portada de la página y como imagen al
compartir el enlace, donde sí se ve grande.

- `logo-conectados.png` — 160×160, 73 KB (los de la casa pesan 105-120 KB). 160 px cubre pantallas
  de 3× densidad sobre una pastilla de 52.
- `conectados-emblema.png` — 320×320, 180 KB, **recortado en círculo con las esquinas
  transparentes**: el original tiene fondo blanco y en modo oscuro habría salido un cuadro blanco.

Las dos salen de la imagen de Ruth. **No se inventó ningún logo.**

## Evidencia OBSERVADA en el navegador

Para no tocar los `catalogo.json` y `taxi.json` reales (son datos publicados), se sirvió una **copia
de la carpeta** en otro puerto, con los tres JSON parcheados. El repo real no se modificó en ningún
momento, y la copia se borró al terminar.

**Con Conectados ENCENDIDO**, a 375 px:

| Página | Resultado |
|---|---|
| `/preview/` (tienda) | Tres pastillas, la de la tienda como actual, las otras dos visibles |
| `/preview/taxi` | Tres pastillas, la del taxi como actual |
| `/preview/conectados` | Tres pastillas, la de Conectados como actual, y **el emblema cargado** en la portada |

**Sin scroll horizontal en ninguna**: `scrollWidth` = 375 exactos, que era el riesgo principal de
meter un tercer logo donde había dos.

**Con Conectados APAGADO** (la prueba que de verdad importa):

- Tienda: la pastilla de Conectados **oculta**, la del taxi sigue visible.
- Taxi: la pastilla de Conectados **oculta**.
- La propia página: cartel «Muy pronto», cuerpo oculto, **y la cabecera se sigue pintando con las
  tres pastillas**. Esto confirma que el bloque quedó **antes** del `return` del interruptor, que
  era el punto que el plan marcaba en rojo: puesto después, la cabecera habría quedado en blanco.

**Consola:** solo los 404 de los logos con ruta absoluta (`/logo-3b.png`…), el fallo cosmético que
`/preview` ya tenía con el taxi antes de todo esto. **Cero errores de CSP y cero de JavaScript.**

**Tests (Task 1):** `npm test` en Stock+ → **1185 pass / 0 fail**, corrido y observado por el piloto.
Las Tasks 2-4 no tocan Stock+, así que no mueven ese número.

**Hallazgo del ejecutor en la Task 1:** `tests/catalogoWeb.test.js` tiene un test de lista blanca que
enumera las claves publicadas, y la clave nueva lo rompía. Se actualizó — es exactamente para lo que
está ese test. El plan no lo preveía.

## ⚠ NO VERIFICADO

- **Nada está publicado.** Todo vive en disco. En `www.3bqba.com` no hay ningún cambio.
- **El panel como Admin** sigue pendiente de Ruth (desde la Fase A).
- El emblema en `og:image` **no se ha visto compartido de verdad** en WhatsApp o Facebook.

## Lo que falta: Task 6, y la pulsa Ruth

1. `git -C "C:/inventario/tienda-3b" push` → Vercel despliega solo.
2. En el panel, **en este orden**: 💸 Conectados → publicar · 🚕 Taxi → publicar · Tienda web →
   publicar catálogo. Al revés, habría unos minutos con pastillas apuntando a datos que aún no están.
3. Comprobar en un teléfono real: `/remesas`, `/conectados`, el tercer logo en las otras dos páginas,
   la consola sin errores de CSP, un envío de prueba de punta a punta, y abrir
   `www.3bqba.com/conectados.json` para ver con los ojos que **no** aparece el correo de Zelle ni la
   dirección USDT.
4. Cerrar documentación: entrada de Conectados en el `CLAUDE.md` de Stock+, y de paso **quitar de ahí
   la mención al fallo preexistente de `tests/miaContacts.test.js`, que está caducado** (la batería
   va entera en verde desde el 2026-10-01).

## 🔴 Dos avisos para quien siga

- **`conectados.json` sigue sin seguimiento en `tienda-3b` y tiene datos INVENTADOS** (tasa 755, 128
  envíos, teléfonos de mentira). Se generó para poder probar. Ruth debe configurar lo suyo en el
  panel y pulsar «Generar para vista previa» para sobrescribirlo. **No commitearlo como está.**
- **Otra sesión está editando `inventario-stockmas`**: aparecieron `lib/publicadorColas.js` y
  `tests/publicadorColas.test.js` sin seguimiento, ajenos a este trabajo. Ese repo arrastra 111
  archivos modificados de otras sesiones; **todos los commits de este trabajo se hicieron nombrando
  los archivos uno a uno, y varios preparando solo los hunks propios en el índice**. Un `git add -A`
  ahí se lleva por delante el trabajo a medias de los demás.
