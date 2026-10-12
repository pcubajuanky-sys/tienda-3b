// relacionados.js — que productos se enseñan debajo de la ficha abierta.
// Script de navegador (IIFE con window.Relacionados), mismo patron que tarjeta.js y
// galeria.js: la logica vive aqui para poder probarla con `node --test` sin navegador.
//
// El orden es DETERMINISTA a proposito (nada de Math.random): una lista que cambia en
// cada apertura no se puede probar y al cliente le parece que la tienda se mueve sola.
(function () {
  'use strict';

  var TOPE_POR_DEFECTO = 6;
  var MINIMO = 2;   // con una sola tarjeta la seccion no se pinta

  // Dentro de un grupo: primero los destacados, luego los de oferta, luego por nombre.
  function comparar(a, b) {
    var da = a.destacado ? 0 : 1;
    var db = b.destacado ? 0 : 1;
    if (da !== db) return da - db;
    var oa = a.enOferta ? 0 : 1;
    var ob = b.enOferta ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  }

  // Los parecidos al producto `p`, hasta `tope`. Misma subcategoria primero, luego el
  // resto de su categoria. Nunca el propio `p`, nunca otra categoria.
  function elegir(p, items, tope) {
    var max = tope > 0 ? tope : TOPE_POR_DEFECTO;
    if (!p || !Array.isArray(items)) return [];
    var cat = p.cat || '';
    var sub = p.subcat || '';
    var mismos = items.filter(function (x) { return x && x.id !== p.id && (x.cat || '') === cat; });
    if (mismos.length < MINIMO) return [];
    var deSub = mismos.filter(function (x) { return sub && (x.subcat || '') === sub; }).sort(comparar);
    var resto = mismos.filter(function (x) { return !sub || (x.subcat || '') !== sub; }).sort(comparar);
    return deSub.concat(resto).slice(0, max);
  }

  window.Relacionados = { elegir: elegir };
})();
