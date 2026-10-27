// umbral.js — «añadelo y te faltaran X para la mensajeria gratis», en la FICHA.
//
// Modulo PURO (ni DOM ni red). Se prueba con node:vm desde test/umbral.test.js.
//
// Por que existe: la tira de «completa tu mensajeria» (completar.js) vive en el carrito,
// que es el FINAL del camino. Quien esta mirando una ficha todavia no sabe que le falta
// poco. Medido sobre 196 pedidos reales de 30 dias: la mediana del pedido web cae
// CLAVADA en el umbral (2.000 CUP) y 85 de 196 se quedaron por debajo y pagaron
// mensajeria. El umbral ES el ticket medio: decirlo una pantalla antes es la palanca mas
// barata que tiene esta tienda.
//
// 🔴 Habla SIEMPRE de este producto («añadelo»), nunca del carrito en abstracto, y la
// cifra es la de DESPUES de añadirlo. Decir «te faltan 2.000» en la ficha de algo que
// cuesta 500 seria contar un carrito que la clienta ya no va a tener.
//
// 🔴 Nunca promete nada sobre un producto que no cuenta para el umbral (transporte
// aparte: su envio jamas sera gratis) ni sobre uno que no se puede comprar (pedido y
// esperando confirmacion). Es la misma regla que ya cumplen lineaEnvioTexto() y
// completar.js.
(function () {
  'use strict';

  function num(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : NaN;
  }

  function cifra(n) {
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  // ({activo, umbral, elegible, precio, aparte, espera}) -> frase o ''.
  // Cualquier entrada rara devuelve '' (fallo cerrado: mejor callar que mentir).
  function mensaje(d) {
    if (!d || typeof d !== 'object') return '';
    if (!d.activo) return '';
    if (d.aparte || d.espera) return '';
    const umbral = num(d.umbral);
    const elegible = num(d.elegible);
    const precio = num(d.precio);
    if (!(umbral > 0) || !(precio > 0) || !(elegible >= 0)) return '';
    if (elegible >= umbral) return '🎉 Tu pedido ya lleva mensajería gratis';
    if (elegible + precio >= umbral) return '🎉 Añádelo y tu pedido lleva mensajería gratis';
    return 'Añádelo y te faltarán ' + cifra(umbral - elegible - precio) + ' CUP para la mensajería gratis';
  }

  window.Umbral = { mensaje };
})();
