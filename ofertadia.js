// ofertadia.js — la «Oferta del dia» con cuenta atras.
// Script de navegador (IIFE con window.OfertaDia), mismo patron que novedades.js: la logica
// vive aqui para poder probarla con `node --test` sin navegador. Modulo PURO (ni DOM ni red).
//
// El dato es `catalogo.json -> ofertaDia: {codigo, hasta}` (hasta = ms del fin). El PRECIO no
// viaja ahi: ya esta en el item (`enOferta`, `precioNormal*`), asi no hay dos verdades.
//
// 🔴 La cuenta atras tiene que ser VERDAD: si `hasta` ya paso, `vigente` devuelve null aunque
// el catalogo (publicado hace menos de un minuto) todavia traiga la oferta vieja.
(function () {
  'use strict';

  function num(n) {
    var v = Number(n);
    return isFinite(v) ? v : NaN;
  }

  // Lo que falta, nunca negativo. Los ms se redondean HACIA ARRIBA: a 400 ms de acabar el
  // reloj dice 00:01, no 00:00 (un «00:00» con la oferta aun viva seria un reloj mentiroso).
  function restante(hastaMs, ahoraMs) {
    var h = num(hastaMs), a = num(ahoraMs);
    var ms = (isNaN(h) || isNaN(a)) ? 0 : Math.max(0, h - a);
    var total = Math.ceil(ms / 1000);
    return {
      h: Math.floor(total / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
      terminada: total <= 0,
    };
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  // «05:12:09»; con menos de 1 h, «12:09».
  function formato(r) {
    var x = r || { h: 0, m: 0, s: 0 };
    return (x.h > 0 ? dos(x.h) + ':' : '') + dos(x.m) + ':' + dos(x.s);
  }

  // Los telefonos de Cuba suelen tener la hora mal. Se corrige con la cabecera `Date` de la
  // respuesta de catalogo.json (mismo origen, legible): desfase = hora del servidor - hora
  // local. Sin cabecera o ilegible, 0.
  function desfase(cabeceraDate, ahoraLocal) {
    if (!cabeceraDate) return 0;
    var srv = Date.parse(cabeceraDate);
    var loc = num(ahoraLocal);
    if (isNaN(srv) || isNaN(loc)) return 0;
    return srv - loc;
  }

  // La oferta de hoy si de verdad esta viva: el item existe en ESTE catalogo, sigue en
  // oferta y `hasta` esta en el futuro. `ahora` ya viene corregido con el desfase.
  function vigente(cat, ahora) {
    var o = cat && cat.ofertaDia;
    if (!o || !o.codigo) return null;
    var hasta = num(o.hasta);
    var a = num(ahora);
    if (isNaN(hasta) || isNaN(a) || hasta <= a) return null;
    var items = (cat && cat.items) || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it && it.codigo === o.codigo) {
        return it.enOferta ? { item: it, hasta: hasta } : null;
      }
    }
    return null;
  }

  window.OfertaDia = { restante: restante, formato: formato, desfase: desfase, vigente: vigente };
})();
