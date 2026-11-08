// pedido-solo.js — «⚡ Pedir solo este» en la ficha del producto.
//
// Modulo PURO (ni DOM ni red). Decide si el boton se ve, con que cantidad arranca el pedido
// rapido y que dice la franja del panel. Lo pinta app.js. Se prueba con node:vm desde
// test/pedido-solo.test.js.
(function () {
  'use strict';

  const TEXTO_BOTON = '⚡ Pedir solo este';
  const TEXTO_FRANJA = '⚡ Pedido rápido: solo este producto.';

  // ¿Se puede vender ahora? Cualquier duda -> false (el boton queda oculto).
  function puede(e) {
    const x = e || {};
    if (x.cerrada || x.enEspera || x.agotada) return false;
    if (x.conVariantes && !x.clave) return false;
    if (x.tope === 0) return false;
    return true;
  }

  // Cantidad con que arranca el pedido rapido: la que ya tenia en el carrito, o 1.
  // Nunca pasa del tope si lo hay.
  function cantidadInicial(enCarrito, tope) {
    let n = Math.floor(Number(enCarrito));
    if (!isFinite(n) || n < 1) n = 1;
    const t = Number(tope);
    if (isFinite(t) && t >= 1 && n > t) n = Math.floor(t);
    return n;
  }

  // La franja de arriba del panel. Si el carrito tiene algo, avisa de que queda guardado.
  function texto(unidadesCarrito) {
    const n = Math.floor(Number(unidadesCarrito));
    if (isFinite(n) && n > 0) return TEXTO_FRANJA + ' Tu carrito (' + n + ') queda guardado.';
    return TEXTO_FRANJA;
  }

  window.PedidoSolo = { puede, cantidadInicial, texto, TEXTO_BOTON, TEXTO_FRANJA };
})();
