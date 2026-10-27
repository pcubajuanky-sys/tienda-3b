// regreso.js — ¿hay que saludar a quien vuelve con el carrito puesto?
//
// Modulo PURO (ni DOM ni reloj propio: el ahora se le pasa). Se prueba con node:vm
// desde test/regreso.test.js.
//
// Por que existe: el carrito ya sobrevive en localStorage, pero quien se fue y vuelve
// otro dia se lo encuentra igual y la tienda no le dice nada. Es el «carrito abandonado»
// del comercio electronico, hecho sin servidores ni correos: todo esta ya en el
// navegador de la clienta.
//
// 🔴 Seis horas. Una recarga, un cambio de pestaña o un paseo por el catalogo y vuelta
// NO son volver — un aviso que reaparece cada vez que se toca «atras» es exactamente lo
// que hace odiosa esta funcion. Volver por la noche o al dia siguiente, si.
(function () {
  'use strict';

  const VENTANA_MS = 6 * 60 * 60 * 1000;

  // (marca, ahora, unidades) -> boolean. Sin marca previa no se saluda: no se sabe
  // cuando estuvo, e inventarselo seria saludar a quien entra por primera vez.
  function debeSaludar(marca, ahora, unidades) {
    const u = Number(unidades);
    if (!Number.isFinite(u) || u <= 0) return false;
    const t = Number(marca);
    if (!Number.isFinite(t) || t <= 0) return false;
    const pasado = Number(ahora) - t;
    if (!Number.isFinite(pasado)) return false;
    return pasado >= VENTANA_MS;
  }

  function texto(unidades) {
    const u = Number(unidades);
    if (!Number.isFinite(u) || u <= 0) return '';
    return 'Tienes ' + u + (u === 1 ? ' producto' : ' productos') + ' esperando en tu pedido';
  }

  window.Regreso = { VENTANA_MS, debeSaludar, texto };
})();
