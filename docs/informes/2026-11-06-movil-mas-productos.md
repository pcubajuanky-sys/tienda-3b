# Móvil: más productos y ficha instantánea — 2026-11-06

Revisión en el navegador integrado (375 px y escritorio, claro y oscuro) pedida por Ruth.

## Qué cambió
- **Círculo de los pasos** (`.paso-n`): en móvil la fila pasa a columna y `flex:0 0 24px`
  fijaba el alto, dejando un óvalo estrecho. Ahora `width/height:26px` y `flex:none`.
- **Portada más transparente**: mosaico al 72 % y en color (`saturate(.9) brightness(.7)`,
  blur 1,5 px), velo más fino (.42 en el centro) y sombra bajo el título. El techo de brillo
  (.7) mantiene el texto blanco ≥ 6:1 en el peor caso.
- **Móvil (<600 px), solo 3B**: fuera el logo grande de la portada (repetía el de la
  cabecera), la letra pequeña del envío (está en las preguntas frecuentes), la descripción de
  la tarjeta y la línea condicional «Gratis desde 2,000 CUP» (`.envio-chip-cond`). La línea
  «Mensajería gratis» sin condición se queda.
- **Ficha instantánea** (`pintarGaleria`, `app.js`): muestra primero la foto de la tarjeta
  (`fotoCard(...).src`, 400 px, casi siempre en caché) y cambia a la de 900 px al llegar,
  solo si la ficha sigue en esa foto.
- `sw.js`: `v39` → `v41`.

## Evidencia observada (navegador, CSS inyectado sobre la versión publicada)
- Antes: más vendidos a 1.297 px, catálogo a 2.027 px. Después: 1.213 y 1.906; tarjeta del
  catálogo 306 px de alto (caben ~2,5 filas por pantalla).
- Círculos redondos, mosaico visible y texto legible, mirados en captura.
- `node --test`: 265/265.

## ⚠ NO VERIFICADO
- La ficha instantánea solo se probó leyendo el código (el `app.js` publicado era el viejo
  al mirar). Comprobar tras publicar: abrir una ficha con mala conexión.

## Segunda tanda (mismo día)
- **Cabecera al bajar (móvil, <760 px):** la franja «toca los logos» se pliega (`:has(.header.compacta)`, con transición) y los logos pasan a 34 px. Medido en el navegador: barra pegada 151 → 101 px. En navegadores sin `:has()` la franja no se pliega (nada se rompe).
- **Categorías sin círculos vacíos:** `.cat3d-foto` lleva `data-ph` con el emoji/inicial y lo pinta detrás de la foto mientras baja. Comprobado ocultando la foto de «Ropa»: sale 👕.
- `sw.js` → `v42`. Tests 265/265.
