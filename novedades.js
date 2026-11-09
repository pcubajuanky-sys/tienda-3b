// novedades.js — que es «nuevo» en el catalogo de la tienda.
// Script de navegador (IIFE con window.Novedades), mismo patron que orden.js: la logica
// vive aqui para poder probarla con `node --test` sin navegador.
//
// El dato es `items[].creado` (fecha de alta en ms) que Stock+ ya publica en catalogo.json.
(function () {
  'use strict';

  var DIAS = 7;
  var DIA_MS = 86400000;

  // Una fecha futura (reloj mal puesto del telefono) NO es nueva; sin `creado`, tampoco.
  function esNuevo(p, ahora, dias) {
    var creado = Number(p && p.creado);
    if (!(creado > 0)) return false;
    var edad = Number(ahora) - creado;
    return edad >= 0 && edad <= (dias == null ? DIAS : dias) * DIA_MS;
  }

  // Los nuevos, del mas reciente al mas viejo, con tope. Array NUEVO: no muta la entrada.
  function lista(items, ahora, opts) {
    var o = opts || {};
    var max = o.max == null ? 12 : o.max;
    var src = Array.isArray(items) ? items : [];
    return src
      .filter(function (p) { return esNuevo(p, ahora, o.dias); })
      .sort(function (a, b) { return Number(b.creado) - Number(a.creado); })
      .slice(0, max);
  }

  window.Novedades = { DIAS: DIAS, esNuevo: esNuevo, lista: lista };
})();
