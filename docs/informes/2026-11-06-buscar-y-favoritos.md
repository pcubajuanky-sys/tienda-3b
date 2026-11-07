# Buscar y favoritos — 2026-11-06

Segunda tanda de la crítica de impeccable. Plan: `docs/superpowers/plans/2026-11-06-buscar-y-favoritos.md`.
Lo implementó un subagente (sonnet). El piloto revisó el diff completo de `app.js`, `estilos.css`,
`index.html` y `sw.js`.

## Qué cambió
- **Sugerencias del buscador** (`buscar.js`, `#sugerencias`): a partir de 2 letras salen hasta 6
  productos, sin foto, con texto y precio. Primero los que empiezan por lo escrito. Al tocar uno se
  abre la ficha, y la última línea es «Ver todos los resultados». Se cierra con Esc o al perder el
  foco, y las flechas y Enter funcionan. El filtrado de la parrilla sigue igual.
- **Vistos hace poco** (`#recientes`): al abrir una ficha, el producto se apunta en `localStorage`
  (máximo 10). En la portada se pintan como `rel-card`, sin botones de cantidad, para no duplicar
  `acc-<id>`, y se esconden cuando hay una búsqueda o un filtro.
- **Favoritos** (`favoritos.js`): un ♡ arriba a la derecha de cada tarjeta y «♡ Guardar» en la ficha.
  El chip «♥ Favoritos (N)» de `#controles` filtra la parrilla, y con ese filtro sale «Enviar mi
  lista por WhatsApp» (`api.whatsapp.com`, destino `destinoWhatsApp()`).
- **Filtro por precio** (`orden.js`: `RANGOS`, `filtrarPrecio`, `rangosUtiles`): un select con los
  rangos que tienen producto. Se oculta si queda menos de dos.
- Las claves de `localStorage` van por negocio (`favoritos`/`recientes` en la casa, `-<negocio>` en
  los asociados), y toda lectura y escritura va en `try/catch`.
- Hay scripts y elementos nuevos en las tres cáscaras, en `MODULOS` de `test/paginas.test.js` y en el
  ARMAZON de `sw.js`. La caché pasa de `v42` a `v43`.
- Desviación del plan, aceptada: la lista de sugerencias usa los tokens de la cabecera, que es negra
  en 3B, así que la lista sale oscura, coherente con la cabecera.

## Evidencia observada
- `node --test --test-concurrency=1`: **282/282** (baseline 265). Corrido por el piloto.
- `node --check` de los cinco JS sin errores (según el subagente).

## ⚠ NO VERIFICADO
- No se miró nada en pantalla: la PC tenía unos 60 MB de RAM libres y abrir un navegador podía
  desconectar a Mía. Hay que revisar a 375 px: la lista de sugerencias bajo el buscador (tanto
  pegada como sin pegar), que el ♡ no tape los sellos, el chip de favoritos, el botón de WhatsApp y
  la tira «Vistos hace poco».
- No hay commit ni push todavía.
