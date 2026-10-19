// faltante.js — lo que el cliente busco y la tienda no tiene.
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js
// en el bloque #vacio. Se prueba con node:vm desde test/faltante.test.js.
//
// Por que existe: una busqueda sin resultados era un callejon sin salida. Ahora abre
// una conversacion, y de paso es la unica forma que tiene la tienda —que no tiene
// backend ni analitica— de contarle a 3B que le estan pidiendo y no tiene.
(function () {
  'use strict';

  const LARGO_MAX = 60;

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX);
  }

  function mensaje(termino) {
    const t = limpiar(termino);
    if (!t) return '';
    return 'Hola 3B 👋\nBusqué *' + t + '* en la web y no lo encontré.\n¿Lo tienen o me lo pueden conseguir?';
  }

  function enlace(destino, termino) {
    const texto = mensaje(termino);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  window.Faltante = { limpiar, mensaje, enlace };
})();
