// tasa.js — el numero con el que estan calculados los precios, a la vista.
//
// Modulo PURO (ni DOM ni red): compone tres textos a partir de CAT.tasa, que ya viaja
// en catalogo.json. Lo pinta app.js en el chip de la portada, en el aviso del pie y
// debajo del total del carrito. Se prueba con node:vm desde test/tasa.test.js.
//
// 🔴 La regla que manda aqui: lo que se enseña es LA TASA CON LA QUE ESTAN CALCULADOS
// ESTOS PRECIOS, no «la tasa de hoy». El catalogo se republica cada 5 horas y un cambio
// de tasa a mano en Stock+ no lo republica: puede haber un rato con el numero viejo
// junto a unos precios viejos. Eso es correcto —y util— mientras la etiqueta lo diga
// asi. Decir «tasa del dia» seria prometer una frescura que no tenemos, y decir
// «segun elTOQUE» seria inventar una fuente: la lectura automatica existe en Stock+
// pero hoy no funciona, y el numero lo pone Ruth a mano.
(function () {
  'use strict';

  const CHIP_BASE = 'Precios en CUP y USD';
  const AVISO_BASE = 'Los precios pueden variar según la tasa del día.';

  function valida(tasa) {
    const n = Number(tasa);
    return Number.isFinite(n) && n > 1;
  }

  function numero(tasa) {
    if (!valida(tasa)) return '';
    return Math.round(Number(tasa)).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  function chip(tasa) {
    if (!valida(tasa)) return CHIP_BASE;
    return CHIP_BASE + ' · 1 USD = ' + numero(tasa) + ' CUP';
  }

  function aviso(tasa) {
    if (!valida(tasa)) return AVISO_BASE;
    return 'Los precios están calculados a 1 USD = ' + numero(tasa) + ' CUP.';
  }

  function carrito(tasa) {
    if (!valida(tasa)) return '';
    return numero(tasa) + ' CUP por USD';
  }

  window.TasaVista = { valida, numero, chip, aviso, carrito };
})();
