// listo.js — «ya esta en tu pedido»: la confirmacion que faltaba en la ficha.
//
// Modulo PURO (ni DOM ni red). Lo pinta app.js en la ficha, debajo de la accion de compra.
// Se prueba con node:vm desde test/listo.test.js.
//
// Por que existe (medido en produccion el 2026-10-22): al añadir desde la ficha, la clienta
// no recibia NINGUNA señal visible. El «1 en el pedido» que ya habia es `sr-only`, la barra
// inferior y el contador de la cabecera existen pero el modal los TAPA. Lo unico que se veia
// era el «1» entre el menos y el mas, que se puede leer como stock y no como «lo tienes».
(function () {
  'use strict';

  // El separador que usa claveCarrito() en app.js: `id` a secas, o `id|COMBINACION`.
  const SEP = '|';

  // (unidades) -> texto del boton, o '' si no hay nada que confirmar.
  function texto(unidades) {
    const n = Number(unidades);
    if (!Number.isFinite(n) || n <= 0) return '';
    return '✓ Listo — ver mi pedido (' + n + ')';
  }

  // (id, carrito) -> ¿hay alguna linea de ESTE producto, con o sin combinacion?
  //
  // 🔴 La comparacion es `k === id` o `k empieza por id + '|'`, NUNCA un startsWith pelado:
  // con startsWith(id) el producto 'p1' daria positivo con una linea de 'p12'.
  function enElPedido(id, carrito) {
    if (!id || !carrito || typeof carrito !== 'object') return false;
    const clave = String(id);
    return Object.keys(carrito).some(function (k) {
      if (!(Number(carrito[k]) > 0)) return false;
      return k === clave || k.indexOf(clave + SEP) === 0;
    });
  }

  window.Listo = { texto, enElPedido };
})();
