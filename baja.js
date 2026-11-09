// baja.js — «📉 Avísame si baja de precio».
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js en la
// ficha de un producto con stock que NO esta en oferta. Se prueba con node:vm desde
// test/baja.test.js.
//
// 🔴 CONTRATO con lib/avisoBaja.js de Stock+ (igual que aviso.js con avisoVuelta.js): la MARCA y
// la ultima linea `Ref:` las lee el servidor. La linea «Precio ahora» es informativa: el precio
// de referencia lo toma el SERVIDOR al anotar, nunca este texto.
//
// 🔴 El destino es SIEMPRE el numero de la casa (CAT.whatsapp), nunca destinoWhatsApp(): con un
// gestor con recargo ese seria el del gestor, donde no vive el bot.
(function () {
  'use strict';

  const MARCA = '📉 *AVÍSAME SI BAJA DE PRECIO*';
  const TEXTO_BOTON = '📉 Avísame si baja de precio';

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim();
  }

  // Miles con coma, sin depender del ICU del entorno.
  function miles(n) {
    const x = Math.round(Number(n));
    if (!isFinite(x)) return '0';
    return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // El precio como lo pinta la tarjeta (precioTexto de app.js, sin oferta).
  function precioAhora(p) {
    const usd = '$' + p.precioUSD + ' USD';
    const cup = miles(p.precioCUP) + ' CUP';
    return p.moneda === 'usd' ? usd + ' · ' + cup : cup + ' · ' + usd;
  }

  // (producto, id del buzon opcional) -> texto. Sin nombre o sin codigo, ''.
  function texto(p, id) {
    const nombre = limpiar(p && p.name);
    const codigo = limpiar(p && p.codigo);
    if (!nombre || !codigo) return '';
    const t = [
      'Hola 3B 👋',
      MARCA,
      'Producto: ' + nombre,
      'Precio ahora: ' + precioAhora(p),
      'Ref: ' + codigo,
    ].join('\n');
    return (id && window.Buzon) ? window.Buzon.conCodigo(t, id) : t;
  }

  // (CAT o numero, producto, id) -> URL de WhatsApp, o '' si falta algo.
  function enlace(cat, p, id) {
    const crudo = (cat && typeof cat === 'object') ? cat.whatsapp : cat;
    const tel = ((crudo === undefined || crudo === null) ? '' : String(crudo)).replace(/\D/g, '');
    const t = texto(p, id);
    if (!t || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(t);
  }

  // Solo tiene sentido en un producto que se puede comprar hoy (el catalogo solo publica lo que
  // tiene stock) y que no esta ya rebajado.
  function puede(p, ctx) {
    if (!p || p.enOferta) return false;
    const c = ctx || {};
    return !c.cerrada && !c.enEspera;
  }

  window.Baja = { texto, enlace, puede, precioAhora, MARCA, TEXTO_BOTON };
})();
