# Informe — logo con más presencia y grupo de WhatsApp (tienda) — 2026-11-07

Sobre main (v45 publicada). Sin commit ni push. Caché `sw.js`: v45 → v46.

## Piezas
1. **Marca de agua en el pedido** (`estilos.css`): `.panel-caja::before, .carrito-lateral::before`,
   `position:absolute; inset:0; z-index:-1; pointer-events:none`, fondo `var(--marca-agua)` centrado a
   65 % del ancho, `opacity: var(--marca-agua-op)` = **.06** en claro y **.045** en oscuro. Las cajas llevan
   `isolation:isolate` para que el z-index:-1 quede sobre su fondo y bajo el texto. El logo sale de una
   variable CSS por cáscara: `:root` = `logo-3b.png`; `body[data-negocio="electripower"]` y `"delmar"` la
   sustituyen por su logo. CSP: `img-src 'self'` ya permite el `url()` local (`vercel.json`/`_headers`).
2. **Pantalla de gracias** (`#gracias`, idéntica en las 3 cáscaras): al pulsar «Sí, vaciar mi carrito»,
   `cerrarAvisoEnviado(true)` limpia y llama a `abrirGracias()` (antes: un aviso de texto). Logo 128 px circular
   (src por `Grupo.logoDe(NEGOCIO)`), «¡Gracias por tu pedido!», «Te escribimos por WhatsApp para confirmar la
   entrega.», bloque del grupo solo con enlace válido y «Seguir mirando». Cierra con ✕, fondo, Escape y foco
   atrapado; todo con addEventListener. «No, conservarlo» no cambia.
3. **Tarjeta del grupo** (`.cta-grupo`, `tarjetaGrupoHtml`): en `renderGrid`, tras `CTA_GRUPO_TRAS_N = 14`
   productos, solo sin búsqueda ni filtros (mismo criterio que `cta-comi`) y con enlace válido. Se inserta
   antes que la de gestores (que va tras 6) para no desplazarla. Estilo: superficie neutra, borde fino y
   acento `var(--wa)` a la izquierda; botón de contorno ≥44 px que abre en pestaña nueva.
4. **Enlace del grupo** (`grupo.js`, puro, `window.Grupo`): `enlaceValido` exige `https://chat.whatsapp.com/`
   + código; `enlaceDe(tienda, negocio)`: la casa lee `tienda.grupoWA`; un socio solo lee
   `tienda.negocios.<id>.grupoWA` (porque `Negocio.aplicar` ya mezcló en `tienda` el grupo de la casa, no
   distinguible). `logoDe(negocio)` elige el logo por negocio (cae a la casa).

## Cableado
`grupo.js` tras `aviso.js` en las 3 cáscaras, en `MODULOS` de `test/paginas.test.js` y en ARMAZON de `sw.js`.

## Evidencia observada
- `node --check` app.js, grupo.js, sw.js: OK.
- `node --test --test-concurrency=1`: 298 tests, 298 pass, 0 fail (294 + 4 de `test/grupo.test.js`).

## ⚠ NO VERIFICADO
- Nada visto en navegador: opacidad real de la marca de agua (en el modal con scroll la marca cubre la altura
  visible y se desplaza con el contenido), contraste, tema oscuro y la tarjeta/pantalla a 375 px.
- Hoy ningún bloque de socio trae `grupoWA`, así que en sus páginas no sale grupo (comportamiento pedido).

## Retoque: marca de agua visible en oscuro (caché v47)
- Claro: `--marca-agua-op` .06 → .08. Oscuro (mismo `@media (prefers-color-scheme: dark)` sin guardas que
  los tokens): opacidad .08 y `filter: grayscale(1) invert(1) brightness(1.2)` sobre el `::before`, para que
  el emblema oscuro con rojo se lea como silueta clara. El logo de #gracias no se toca.
- Tests: 298/298. ⚠ NO VERIFICADO a ojo (sin navegador).

## Corrección: marca de agua como máscara (caché v48)
- Causa: `logo-3b.png` es opaco con fondo negro cuadrado; en oscuro el filtro lo volvía un recuadro claro.
- Nuevos `marca-3b.png`, `marca-electripower.png`, `marca-delmar.png`: píxeles blancos con alfa =
  luminancia × alfa original (3b: fondo negro opaco; electripower: fondo oscuro, círculo con exterior
  transparente; delmar: círculo transparente fuera, interior azul marino con zonas claras — la silueta por
  luminancia deja ver lo claro, ⚠ a revisar a ojo). Tamaños: 58,9 / 15,5 / 22,5 KB.
- CSS: `background-color: var(--text)` + `mask: var(--marca-agua) center / 65% auto no-repeat`;
  opacidad .07 claro / .09 oscuro; sin `filter`. Los tres PNG van en ARMAZON de `sw.js`.
- Tests: 298/298. ⚠ NO VERIFICADO a ojo.
