// tasa.js — el numero con el que estan calculados los precios, a la vista.
//
// Modulo PURO (ni DOM ni red): compone tres textos a partir de CAT.tasa, que ya viaja
// en catalogo.json. Lo pinta app.js en una linea propia de la portada, en el aviso del pie y
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

  const AVISO_BASE = 'Los precios pueden variar según la tasa del día.';

  function valida(tasa) {
    const n = Number(tasa);
    return Number.isFinite(n) && n > 1;
  }

  function numero(tasa) {
    if (!valida(tasa)) return '';
    return Math.round(Number(tasa)).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  // La portada. Es lo PRIMERO que ve quien entra, asi que va en su propia linea y no
  // metida en un chip al final: la clienta cubana pregunta «¿a cuanto esta el cambio?»
  // antes de mirar un precio.
  //
  // 🔴 «Cambio que usamos», nunca «la tasa de hoy» ni «segun elTOQUE»: el catalogo se
  // republica cada 5 horas y un cambio a mano en Stock+ no lo republica. Decimos CON QUE
  // numero estan calculados estos precios, que es verdad siempre.
  function portada(tasa) {
    if (!valida(tasa)) return '';
    return '💵 Cambio que usamos: 1 USD = ' + numero(tasa) + ' CUP';
  }

  function aviso(tasa) {
    if (!valida(tasa)) return AVISO_BASE;
    return 'Los precios están calculados a 1 USD = ' + numero(tasa) + ' CUP.';
  }

  function carrito(tasa) {
    if (!valida(tasa)) return '';
    return numero(tasa) + ' CUP por USD';
  }

  window.TasaVista = { valida, numero, portada, aviso, carrito };
})();
