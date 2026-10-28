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
// 🔴 EL MINIMO DEL 10 % YA NO EXISTE (2026-10-28, decision de Ruth). Hasta esa fecha una rebaja
// menor del 10 % se quedaba con el «OFERTA» pelado, por no gritar un «-5%» que desinfla la
// oferta. Ruth pidio que el numero se enseñe SIEMPRE. Si vuelves a ver un `MINIMO` por aqui es
// que alguien revirtio una decision suya: preguntale antes de restaurarlo.
//
// 🔴 EL AHORRO SE COBRA EN CUP, PERO LA REBAJA SE DECIDE EN LA MONEDA DEL PRODUCTO. porciento()
// mira el par de la moneda principal (189 de los 206 productos son 'usd'); el dinero que se
// descuenta en el carrito sale del par de CUP, que es lo que de verdad se paga. El max(0, ...)
// de ahorroCUP cubre el unico caso en que los dos no concuerden: que el redondeo del CUP al
// publicar deje el «antes» igual o por debajo del precio de ahora.
//
// 🔴 UNA «OFERTA» QUE SUBE EL PRECIO NO ES UNA REBAJA. El «Paquete de 4 Tic-Tacs» del
// catalogo real va de 595 a 612 CUP (0,70 -> 0,72 USD): no es redondeo, es un dato mal
// puesto en Stock+. Mientras siga asi, la tienda no lo anuncia como rebaja ni le tacha un
// «antes» que es mentira. Por eso existe hayRebaja(): la usan el sello, el precio de la
// ficha y la imagen para compartir.
(function () {
  'use strict';

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

  // El texto del sello rojo de la parrilla y del chip de la ficha. '' si no esta en oferta.
  // «Ahorras 52%» y no «-52%»: un porcentaje con menos delante es una resta; el ahorro es una
  // ganancia, y la ganancia es lo que se lleva el cliente. Queda «OFERTA» a secas para el unico
  // caso en que no hay numero honesto que dar: una oferta cuyo «antes» no es mayor (dato mal
  // puesto en Stock+).
  function sello(p) {
    if (!p || !p.enOferta) return '';
    var pct = porciento(p);
    return pct !== null ? 'Ahorras ' + pct + '%' : 'OFERTA';
  }

  // Lo que se descuenta de verdad en el carrito, en CUP. 0 cuando no hay rebaja real, asi que
  // una «oferta» que sube el precio no resta (ni suma) nada.
  function ahorroCUP(p) {
    if (!hayRebaja(p)) return 0;
    var ahora = num(p.precioCUP);
    var antes = num(p.precioNormalCUP);
    if (!(ahora > 0) || !(antes > 0)) return 0;
    return Math.max(0, antes - ahora);
  }

  // El desglose del carrito: lo que costaria a precio normal, lo que se descuenta y lo que se
  // paga. `items` es [{p, qty}], tal cual lo devuelve itemsCarrito() de app.js.
  //
  // 🔴 `normal` se DERIVA de los otros dos (pagas + descuento) y NO se suma aparte. Asi las tres
  // cifras que el cliente tiene delante siempre cuadran —normal - descuento = pagas— pase lo que
  // pase con un precioNormalCUP mal puesto en Stock+. Si algun dia alguien lo cambia por una
  // suma independiente de precioNormalCUP, la pantalla podra mentir en la resta.
  function totales(items) {
    var lista = Array.isArray(items) ? items : [];
    var pagas = 0;
    var descuento = 0;
    lista.forEach(function (it) {
      if (!it || !it.p) return;
      var qty = num(it.qty);
      if (!(qty > 0)) return;
      var precio = num(it.p.precioCUP);
      if (precio > 0) pagas += precio * qty;
      descuento += ahorroCUP(it.p) * qty;
    });
    return { normal: pagas + descuento, descuento: descuento, pagas: pagas };
  }

  window.Descuento = {
    porciento: porciento, hayRebaja: hayRebaja, sello: sello,
    ahorroCUP: ahorroCUP, totales: totales,
  };
})();
