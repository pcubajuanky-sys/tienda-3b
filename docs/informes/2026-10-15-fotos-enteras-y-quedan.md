# 2026-10-15 — Fotos enteras en la parrilla y «Quedan N» en la tarjeta

Plan: `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-15-tienda-fotos-enteras-y-quedan.md`
Commits (sin push): `81c7bf0` fotos enteras, `0c7d1ee` aviso «Quedan N», `b06fa9f` caché v10.

## Observado

- **Task 1 (puerta).** `curl` a la URL del plan con `c_pad,b_auto`: **200 image/jpeg**. Con `Accept: image/avif,image/webp`
  y `f_auto`: 200 image/webp para w_400, w_800 y w_900 (la foto del Bikini). La transformación funciona.
- **Bikini 3 en 1 Manga larga.** Antes (`c_limit`, recortada a cuadrado centrado como hace `object-fit:cover`): se pierde
  cabeza y pies. Después (`ar_1:1,c_pad,b_auto`): se ve entera, con bandas laterales gris azuladas tomadas de la propia foto
  (no desentonan). Comparación en `docs/informes/2026-10-15-foto-antes-despues.png` (izq. antes, der. después).
  Peso w_400 webp: 19.890 B antes (sin recorte) → 12.032 B después.
- **Tests:** baseline 71/71 exit 0; tras los tres cambios 71/71 exit 0. `node --check app.js` y `sw.js`: 0.
- **Aviso.** Contado con el código real de `app.js` sobre `catalogo.json` (240 items): **92 productos** enseñarían aviso
  (46 «Queda 1», 24 «Quedan 2», 22 «Quedan 3»). 49 productos con variantes quedan fuera, ninguno de ellos con `max` ≤ 3 publicado.
- `--oferta` existe en `estilos.css`.

## ⚠ NO VERIFICADO

Memoria libre medida: 241 MB (≤ 400): no se abrió navegador. Sin mirar en pantalla a 375 px, claro/oscuro:
1. que las fotos de la parrilla no cortan y el relleno no desentona en ambos modos;
2. que la ficha enseña la foto entera;
3. que círculos de categoría y miniaturas de galería siguen igual (`fotoMosaico` no se tocó);
4. que sale «Queda 1/Quedan 2/Quedan 3» donde toca y no en 4+ ni en variantes (solo verificado por script);
5. que no desborda a 375 px ni la tarjeta crece de más.
Falta también `docs/informes/2026-10-15-fotos-y-quedan-375px.png`. El orquestador verifica contra producción.
Tampoco se comprobó el 200 de las URLs de las ~240 fotos, solo las del Bikini y la del plan.
