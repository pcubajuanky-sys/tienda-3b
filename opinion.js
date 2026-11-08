// opinion.js — «⭐ Dejar mi opinión».
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp de una opinion y los textos
// de estrellas. Lo pinta app.js en la tarjeta y en la ficha. Se prueba con node:vm desde
// test/opinion.test.js.
//
// 🔴 CONTRATO con lib/opiniones.js de Stock+ (igual que `Horario:` y la marca del aviso): la MARCA,
// la linea `Estrellas: ... (N/5)` y la ultima linea `Ref:` las lee el servidor para anotar la
// opinion sola. Si se cambian aqui y no alli, la opinion no se anota y nadie se entera.
//
// 🔴 El destino lo pone quien llama y SIEMPRE es el numero de la casa (CAT.whatsapp), nunca
// destinoWhatsApp(). Y se usa api.whatsapp.com/send, nunca wa.me (rompe los emojis).
(function () {
  'use strict';

  const MARCA = '⭐ *MI OPINIÓN*';
  const TEXTO_BOTON = '⭐ Dejar mi opinión';
  const MAX_TEXTO = 300;
  const MAX_NOMBRE = 40;

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim();
  }

  // Entero 1..5 o 0 si no vale.
  function nota(n) {
    const x = Number(n);
    return Number.isInteger(x) && x >= 1 && x <= 5 ? x : 0;
  }

  // 3.7 -> «★★★★☆» (se redondea al entero mas cercano; fuera de rango se acota).
  function estrellasTexto(prom) {
    const x = Number(prom);
    if (!isFinite(x)) return '';
    const n = Math.max(0, Math.min(5, Math.round(x)));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  // Texto libre: se conservan los saltos de linea (se juntan los vacios repetidos) y se recorta.
  function limpiarTexto(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\r/g, '').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim())
      .join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXTO);
  }

  // {producto, codigo, estrellas, nombre, texto} -> texto del contrato, o '' si falta lo esencial.
  function mensaje(d) {
    const producto = limpiar(d && d.producto);
    const codigo = limpiar(d && d.codigo);
    const n = nota(d && d.estrellas);
    if (!producto || !codigo || !n) return '';
    const nombre = limpiar(d.nombre).slice(0, MAX_NOMBRE);
    const texto = limpiarTexto(d.texto);
    return [
      MARCA,
      'Producto: ' + producto,
      'Estrellas: ' + estrellasTexto(n) + ' (' + n + '/5)',
      'Nombre: ' + nombre,
      'Opinión: ' + texto,
      'Ref: ' + codigo
    ].join('\n');
  }

  // (telefono, datos[, id]) -> URL de WhatsApp, o null si falta el numero o los datos.
  // Con `id` (el del buzon, ver buzon.js) el texto lleva la linea `Código: id` antes de `Ref:`.
  function enlace(destino, datos, id) {
    let texto = mensaje(datos);
    if (texto && id && window.Buzon) texto = window.Buzon.conCodigo(texto, id);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return null;
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  // item con `estrellas: {prom, n}` -> '⭐ 4.7 (12)'; sin ellas, ''.
  function resumen(item) {
    const e = item && item.estrellas;
    if (!e) return '';
    const prom = Number(e.prom);
    const n = Number(e.n);
    if (!isFinite(prom) || !(n > 0) || prom <= 0) return '';
    return '⭐ ' + prom.toFixed(1) + ' (' + n + ')';
  }

  window.Opinion = { mensaje, enlace, estrellasTexto, resumen, MARCA, TEXTO_BOTON, MAX_TEXTO };
})();
