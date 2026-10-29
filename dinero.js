// dinero.js — la aritmetica del carrito en las DOS monedas (USD y CUP).
//
// Modulo PURO (ni DOM ni red). Se prueba con node:vm desde test/dinero.test.js.
// Necesita window.Descuento (descuento.js), asi que se carga DESPUES de el y ANTES de app.js.
//
// Por que existe: Ruth contabiliza todo en DOLARES (la moneda de los precios) y el cliente paga
// en dolares o en pesos, no en las dos. Se suma el precioUSD de cada linea y el CUP se DERIVA
// del total multiplicando por la tasa. La mensajeria y el minimo para que sea gratis son reglas
// del negocio en CUP: este modulo no las toca ni las convierte nunca.
//
// 🔴 `usdNormal` (y `cupNormal`) se DERIVAN de «lo que pagas + lo que ahorras» y NO se suman
// aparte desde precioNormalUSD. Es la misma regla que Descuento.totales: asi las tres cifras
// que el cliente tiene delante (normal - descuento = pagas) siempre cuadran, pase lo que pase
// con un precioNormalUSD mal puesto en Stock+. Si alguien lo cambia por una suma independiente,
// la pantalla podra mentir en la resta.
//
// 🔴 SIN TASA VALIDA, EL CUP ES `null`, NUNCA 0 NI NaN. Falla cerrado: la interfaz enseña solo
// el USD en vez de un «NaN CUP» delante de una clienta. Con carrito vacio y tasa valida, en
// cambio, el CUP es 0.
//
// Una linea con `qty` que no sea > 0 (0, negativa, texto, undefined) se IGNORA; no cuenta como
// 1. Es el mismo criterio que Descuento.totales.
(function () {
  'use strict';

  function num(n) {
    var v = Number(n);
    return isFinite(v) ? v : NaN;
  }

  // Dos decimales sin arrastrar colas de coma flotante (0.1 + 0.2 -> 0.3).
  function r2(n) {
    return Math.round((n + 1e-9) * 100) / 100;
  }

  // La tasa solo vale si es un numero (o su texto) estrictamente positivo.
  function tasaValida(tasa) {
    if (typeof tasa !== 'number' && typeof tasa !== 'string') return null;
    var t = num(tasa);
    return t > 0 ? t : null;
  }

  // Dolares -> pesos. null sin tasa valida.
  function aCUP(usd, tasa) {
    var t = tasaValida(tasa);
    var u = num(usd);
    if (t === null || isNaN(u)) return null;
    return Math.round(u * t);
  }

  // Lo que se ahorra por unidad, en USD. 0 si no hay rebaja DE VERDAD (Descuento.hayRebaja:
  // hay una «oferta» en el catalogo real que sube el precio y no puede restar ni sumar nada).
  function ahorroUSD(p) {
    var D = typeof window !== 'undefined' ? window.Descuento : null;
    if (!p || !D || typeof D.hayRebaja !== 'function' || !D.hayRebaja(p)) return 0;
    var ahora = num(p.precioUSD);
    var antes = num(p.precioNormalUSD);
    if (!(ahora > 0) || !(antes > 0)) return 0;
    return r2(Math.max(0, antes - ahora));
  }

  function lineas(items) {
    return Array.isArray(items) ? items : [];
  }

  // Suma de precioUSD x qty SIN los `envioAparte`: su precio no cuenta para el minimo de
  // mensajeria gratis, porque su envio nunca va a ser gratis. totales() SI los incluye (es lo
  // que se paga); son dos cuentas distintas a proposito.
  function elegibleUSD(items) {
    var s = 0;
    lineas(items).forEach(function (it) {
      if (!it || !it.p || it.p.envioAparte) return;
      var qty = num(it.qty);
      var precio = num(it.p.precioUSD);
      if (qty > 0 && precio > 0) s += precio * qty;
    });
    return r2(s);
  }

  // El desglose del carrito en las dos monedas. `items` es [{p, qty}] (itemsCarrito de app.js).
  function totales(items, tasa) {
    var usd = 0;
    var ahorro = 0;
    lineas(items).forEach(function (it) {
      if (!it || !it.p) return;
      var qty = num(it.qty);
      if (!(qty > 0)) return;
      var precio = num(it.p.precioUSD);
      if (precio > 0) usd += precio * qty;
      ahorro += ahorroUSD(it.p) * qty;
    });
    usd = r2(usd);
    ahorro = r2(ahorro);
    var cup = aCUP(usd, tasa);
    var cupAhorro = aCUP(ahorro, tasa);
    return {
      usd: usd,
      usdAhorro: ahorro,
      usdNormal: r2(usd + ahorro),
      cup: cup,
      cupAhorro: cupAhorro,
      cupNormal: cup === null || cupAhorro === null ? null : cup + cupAhorro,
    };
  }

  window.Dinero = {
    ahorroUSD: ahorroUSD, elegibleUSD: elegibleUSD, aCUP: aCUP, totales: totales,
  };
})();
