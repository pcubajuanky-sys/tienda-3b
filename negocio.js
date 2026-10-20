// negocio.js — 3bqba.com tiene mas de una tienda: la de la casa (3B) y la de un
// negocio asociado (Electripower). Las dos usan EL MISMO app.js y el MISMO
// catalogo.json; lo unico que cambia es que esta pieza, en un solo punto, se queda
// con los items de este negocio y le pone su marca encima.
//
// 🔴 El valor de todo esto es que el filtro este en UN sitio: parrilla, buscador,
// destacados, ficha, galeria, relacionados, orden, carrito, tarjeta para compartir
// y mensaje de WhatsApp aciertan solos, sin tocarse. Si alguna vez hace falta
// filtrar en otro sitio, es que algo se hizo mal aqui.
//
// Modulo puro + IIFE + window.X, como tarjeta.js / galeria.js / orden.js. Script
// externo a proposito: la CSP bloquea los inline.
(function () {
  var CASA = '3b';

  function normaliza(v) {
    return String(v == null ? '' : v).trim().toLowerCase();
  }

  function deLaPagina(doc) {
    try {
      return normaliza(doc && doc.body && doc.body.dataset && doc.body.dataset.negocio) || CASA;
    } catch (e) { return CASA; }
  }

  function deItem(it) {
    return normaliza(it && it.negocio) || CASA;
  }

  function claveCarrito(neg) {
    var n = normaliza(neg) || CASA;
    return n === CASA ? 'carrito' : 'carrito:' + n;
  }

  function estaActivo(cat, neg) {
    var n = normaliza(neg) || CASA;
    if (n === CASA) return true;
    var t = (cat && cat.tienda) || {};
    return !!(t.negocios && t.negocios[n]);
  }

  // (catalogo, negocio) -> catalogo NUEVO visto desde ese negocio. No muta el de
  // entrada (el original se queda tal cual por si alguna vez hace falta).
  function aplicar(cat, neg) {
    var n = normaliza(neg) || CASA;
    var base = cat || {};
    var tienda = base.tienda || {};
    var salida = {};
    for (var k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) salida[k] = base[k]; }

    salida.items = (base.items || []).filter(function (it) { return it && deItem(it) === n; });

    if (n === CASA) return salida;

    var bloque = (tienda.negocios && tienda.negocios[n]) || null;
    // Sin el bloque del negocio en el catalogo (apagado o no publicado) su pagina no
    // enseña nada: asi un item suelto del socio nunca se ve sin su marca ni su WhatsApp.
    if (!bloque) salida.items = [];
    var t = {};
    for (var j in tienda) { if (Object.prototype.hasOwnProperty.call(tienda, j)) t[j] = tienda[j]; }

    // Lo que es de 3B no se enseña en la tienda del socio. El taxi SI: es el mismo
    // grupo de negocios y la cabecera lo ofrece en las dos paginas.
    t.encargosActivo = false;
    t.campana = null;
    // El cartel de "ahora no atiendo" es el horario de Ruth; no cierra al socio.
    t.cierre = null;

    if (bloque) {
      for (var b in bloque) { if (Object.prototype.hasOwnProperty.call(bloque, b)) t[b] = bloque[b]; }
      // El numero del pedido vive en la raiz del catalogo, no en `tienda`.
      if (bloque.whatsapp) salida.whatsapp = bloque.whatsapp;
    }
    salida.tienda = t;
    return salida;
  }

  window.Negocio = {
    CASA: CASA,
    deLaPagina: deLaPagina,
    deItem: deItem,
    claveCarrito: claveCarrito,
    estaActivo: estaActivo,
    aplicar: aplicar,
  };
})();
