# Informe de relevo: retirada de Conectados (remesas) del dominio 3bqba.com

Fecha: 2026-10-07 · Repo: `C:\inventario\tienda-3b` (rama `main`) · Plan: `docs/superpowers/plans/2026-10-07-sacar-remesas-del-dominio-3b.md` (Plan A)

## Por que
Decision del dueno del negocio: el servicio de remesas («Conectados») no debe aparecer relacionado con la marca 3B. Puede relanzarse mas adelante en otro dominio. Esto saca una puerta publica; no es una limpieza de codigo.

## Commits (en orden)
- `8df7716` web: la portada deja de anunciar Conectados (remesas)
- `9551cc3` web: la pagina del taxi deja de anunciar Conectados
- `03c948f` web: fuera la pagina de Conectados y sus rutas del dominio 3B
- `801dba6` web: fuera el CSS que quedaba de la tarjeta de remesas
- (este informe y el plan van en un commit `docs:` posterior)

## Que se modifico, archivo por archivo
- `index.html`: fuera el icono `#mundo-conectados` de la cabecera y la tarjeta `#serv-remesas` de Servicios; comentarios de la seccion ajustados (hoy solo el taxi).
- `app.js`: fuera las dos lineas que leian `conectadosActivo`; `renderServicios()` queda solo con el taxi.
- `taxi.html`: fuera el icono `#mundo-conectados`.
- `taxi.js`: fuera el bloque que destapaba ese icono (con el, la unica llamada a `Mundos.refrescar()` de ese archivo; `mundos.js` ya se refresca solo en `DOMContentLoaded`).
- `vercel.json` y `_redirects`: fuera las reescrituras `/remesas` y `/conectados` (los dos son gemelos). La CSP NO se toco.
- `sitemap.xml`: fuera la entrada `/remesas`.
- `estilos.css` (limpieza posterior): comprobado con `grep -n "serv-banner-emblema" *.html *.css *.js` que la clase solo aparecia en su propia regla del CSS (ya no la usa ningun HTML ni JS). Se borro la regla `.serv-banner-emblema img{...}` y su comentario («El emblema de remesas...»), y el comentario de cabecera de la seccion paso de «Servicios de 3B (taxi, remesas)» a «(hoy solo el taxi)» y de «dos tarjetas» a «hasta dos tarjetas» (la parrilla sigue siendo de 2 columnas). `.serv-banner` y el resto de reglas `.serv*` quedan intactas. Tras el cambio, `grep -n -i "remesa\|conectad" estilos.css` no devuelve nada.

## Que se borro del repo
`conectados.html`, `conectados.css`, `conectados.js`, `remesa-calc.js`, `conectados.json`, `logo-conectados.png`, `conectados-emblema.png`.

## Donde queda la copia
- Copia fuera del repo: `C:\inventario\conectados-apartado\` (no es un repo git). Contenido observado al cerrar: los 7 archivos de arriba, `LEEME.md` y un `tuto-remesa.png` (este ultimo no estaba en la lista del plan; no lo anadio este ejecutor).
- El historial de git conserva todo: `git log -- conectados.html`.
- El motor del lado servidor (tarifa, registro de remesas, panel 💸) NO se borro: sigue en Stock+.

## Evidencia observada (produccion, tras el despliegue)
- `curl -sL https://3bqba.com/remesas | grep -c -i Conectados` -> `0`
- `curl -sL -o /dev/null -w "%{http_code}" https://3bqba.com/conectados.json` -> `404`
- `curl -sL https://3bqba.com/sitemap.xml | grep -c remesas` -> `0`
- `git log origin/main -1 --oneline` -> `03c948f web: fuera la pagina de Conectados y sus rutas del dominio 3B`
- Comprobado EN VIVO en el navegador por el orquestador tras el despliegue:
  - `https://3bqba.com/taxi`: quedan dos logos («3B Store — tienda» y «Taxi 3B — viajes») y `#mundo-conectados` ya no existe en el DOM.
  - Portada: esos mismos dos logos, una sola tarjeta de servicio (`serv-taxi`) y la palabra «remesa» no aparece en el HTML.
  - `https://3bqba.com/remesas` sirve la tienda («3B Store — Tienda online en San Antonio de los Baños, Cuba») sin mencionar «conectados» ni «remesa».
- Esta ultima limpieza de CSS (`801dba6`): verificada solo con `grep` en local (salida vacia). ⚠ NO VERIFICADO: no se vio la portada en el navegador tras este commit ni se confirmo que se haya desplegado; el cambio solo quita una regla que ningun elemento usa y retoca comentarios, por lo que no deberia alterar nada visible.

## Nota: `/remesas` NO da 404
Tras quitar las reescrituras, `https://3bqba.com/remesas` responde 200 y sirve la portada de la tienda: el comodin `/((?!.*\.).*)` de `vercel.json` captura cualquier ruta sin punto. Es lo esperado y el plan lo anticipaba (le pasa igual a cualquier ruta inventada del sitio). No se anadio ninguna regla especial.

## Pendientes
- ⚠ NO VERIFICADO / PENDIENTE (a): Google puede tardar semanas en dejar de mostrar `3bqba.com/remesas` en sus resultados. Se pide la retirada desde Search Console; lo hace una persona con la cuenta del sitio.
- ⚠ NO VERIFICADO / PENDIENTE (b): el boton «🚀 Publicar a Internet» de la seccion 💸 del panel de Stock+ puede volver a subir `conectados.json` al dominio hasta que se ejecute el Plan B (`inventario-stockmas/docs/superpowers/plans/2026-10-07-cortar-remesas-de-los-canales-3b.md`), que esta en marcha en otra sesion. Avisar a Ruth de no usar ese boton mientras tanto.
- `catalogo.json` y `taxi.json` del repo local todavia traen el campo `conectadosActivo` (observado: una coincidencia en cada uno). Lo escribe Stock+; ya no lo lee nadie en la web, y deja de emitirse con el Plan B. No se edito a mano (son datos que publica Stock+).

## Fuera de alcance (a proposito)
No se toco la CSP de `vercel.json` ni de `_headers`; no se corto ningun canal de Stock+ (eso es el Plan B).
