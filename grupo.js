// grupo.js — enlace del grupo de WhatsApp y logo por negocio. Modulo PURO (sin DOM ni red);
// se prueba con node:vm desde test/grupo.test.js.
//
// 🔴 El grupo de WhatsApp es de 3B (la casa). En la pagina de un socio NO se enseña el de la
// casa: solo uno propio, si su bloque (tienda.negocios.<id>.grupoWA) trae el suyo. Como
// Negocio.aplicar mezcla el bloque del socio sobre `tienda`, tienda.grupoWA ya no distingue
// de quien es: por eso se lee de tienda.negocios, que se conserva tal cual.
(function () {
  'use strict';

  const CASA = '3b';
  const PREFIJO = 'https://chat.whatsapp.com/';
  const LOGOS = {
    '3b': '/logo-3b.png',
    electripower: '/logo-electripower.png',
    delmar: '/logo-delmar.png',
  };

  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  // Mismo criterio que Stock+: tiene que empezar por https://chat.whatsapp.com/ y llevar codigo.
  function enlaceValido(url) {
    const u = String(url == null ? '' : url).trim();
    return (u.indexOf(PREFIJO) === 0 && u.length > PREFIJO.length && !/\s/.test(u)) ? u : '';
  }

  // (tienda, negocio) -> enlace valido para ESA pagina, o ''.
  function enlaceDe(tienda, negocio) {
    const t = tienda || {};
    const n = norm(negocio) || CASA;
    if (n === CASA) return enlaceValido(t.grupoWA);
    const bloque = t.negocios && t.negocios[n];
    return enlaceValido(bloque && bloque.grupoWA);
  }

  function logoDe(negocio) {
    return LOGOS[norm(negocio) || CASA] || LOGOS[CASA];
  }

  window.Grupo = { enlaceValido, enlaceDe, logoDe };
})();
