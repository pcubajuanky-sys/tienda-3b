// descuento.js — cuanto se ahorra de verdad en una oferta, y que dice el sello.
//
// Modulo PURO (ni DOM ni red). Se prueba con node:vm desde test/descuento.test.js.
//
// Por que existe: el sello rojo decia «OFERTA» y nada mas. «-36%» es otra cosa. Pero el
// numero solo se puede enseñar cuando dice algo, y los datos reales obligan a tres reglas.
//
// 🔴 REDONDEO HACIA ABAJO, siempre. Prometer un 37 % cuando es 36,8 % es exagerar la
// rebaja. Efecto lateral medido sobre los 17 productos en oferta del 2026-10-27: con
// floor, el porcentaje por USD y por CUP COINCIDE en los 17 (con round discrepaban en 3,
// por el redondeo del CUP al publicar el catalogo), asi que nadie puede pillar una
// incoherencia entre las dos monedas de la tarjeta.
//
// 🔴 POR DEBAJO DEL 10 % NO SE ENSEÑA NUMERO. Hoy hay seis ofertas de 9 % o menos; un
// sello que grita «-5%» desinfla la oferta en vez de venderla. Esas se quedan con el
// «OFERTA» de siempre.
//
// 🔴 UNA «OFERTA» QUE SUBE EL PRECIO NO ES UNA REBAJA. El «Paquete de 4 Tic-Tacs» del
// catalogo real va de 595 a 612 CUP (0,70 -> 0,72 USD): no es redondeo, es un dato mal
// puesto en Stock+. Mientras siga asi, la tienda no lo anuncia como rebaja ni le tacha un
// «antes» que es mentira. Por eso existe hayRebaja(): la usan el sello, el precio de la
// ficha y la imagen para compartir.
(function () {
  'use strict';

  var MINIMO = 10;

  function num(n) {
    var v = Number(n);
    return isFinite(v) ? v : NaN;
  }

  // El par de precios de la moneda PRINCIPAL del producto: es el que el cliente ve
  // tachado, asi que es con el que tiene que poder comprobar la cuenta.
  function par(p) {
    if (!p || typeof p !== 'object') return null;
    var esUsd = p.moneda === 'usd';
    var ahora = num(esUsd ? p.precioUSD : p.precioCUP);
    var antes = num(esUsd ? p.precioNormalUSD : p.precioNormalCUP);
    if (!(ahora > 0) || !(antes > 0)) return null;
    return { ahora: ahora, antes: antes };
  }

  // Entero > 0, o null. null significa «no hay nada que anunciar».
  function porciento(p) {
    if (!p || !p.enOferta) return null;
    var d = par(p);
    if (!d || d.antes <= d.ahora) return null;
    // 🔴 EL EPSILON NO ES ADORNO. Sin el, `1 - 900/1000` da 0.09999999999999998 y un
    // descuento del 10 % EXACTO se calcula como 9: justo los numeros redondos que una
    // tienda pone de verdad (10, 20, 25, 50) se quedarian por debajo del minimo y sin
    // sello. Medido sobre el catalogo real: el «Candado/Alarma de Motos» (21250 ->
    // 19550, 8 % exacto) se calculaba como 7. El epsilon solo corrige el error del
    // coma flotante: una rebaja de 36,8 % sigue dando 36, y una de 9,99 % sigue dando 9.
    var pct = Math.floor((1 - d.ahora / d.antes) * 100 + 1e-9);
    return pct > 0 ? pct : null;
  }

  // ¿El «antes» es de verdad mayor que el precio de ahora? Lo que decide si se tacha.
  function hayRebaja(p) {
    return porciento(p) !== null;
  }

  // El texto del sello rojo. '' si el producto no esta en oferta.
  function sello(p) {
    if (!p || !p.enOferta) return '';
    var pct = porciento(p);
    return pct !== null && pct >= MINIMO ? '-' + pct + '%' : 'OFERTA';
  }

  window.Descuento = { MINIMO: MINIMO, porciento: porciento, hayRebaja: hayRebaja, sello: sello };
})();
