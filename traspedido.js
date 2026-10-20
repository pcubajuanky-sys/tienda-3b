// traspedido.js — ¿hay que preguntarle al cliente si envio su pedido?
//
// Modulo PURO (ni DOM ni reloj propio: el ahora se le pasa). Se prueba con node:vm
// desde test/traspedido.test.js.
//
// Por que existe: el pedido NO se envia desde la web. La tienda abre WhatsApp con el
// mensaje escrito y es el cliente quien pulsa enviar alli, asi que la tienda nunca sabe
// si llego a mandarlo. Por eso no se vacia el carrito al pulsar el boton —perderia el
// pedido quien se arrepintiera o se quedara sin WhatsApp— sino que se le pregunta
// cuando vuelve.
(function () {
  'use strict';

  // Media hora. Si vuelve mas tarde ya no se le pregunta: no se acordaria de que va, y
  // un carrito viejo es menos malo que vaciarle uno que si queria.
  const VENTANA_MS = 30 * 60 * 1000;

  function debePreguntar(marca, ahora, hayCarrito) {
    const t = Number(marca);
    if (!hayCarrito) return false;
    if (!Number.isFinite(t) || t <= 0) return false;
    const pasado = Number(ahora) - t;
    if (!Number.isFinite(pasado)) return false;
    return pasado >= 0 && pasado <= VENTANA_MS;
  }

  window.TrasPedido = { VENTANA_MS, debePreguntar };
})();
