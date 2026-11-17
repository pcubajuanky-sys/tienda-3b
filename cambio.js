// cambio.js — «¿Hay que llevar cambio?» del formulario del pedido (2026-11-17). Modulo PURO
// (IIFE con window.Cambio): sin DOM ni red, se prueba con node:vm.
//
// 🔴 CONTRATO con inventario-stockmas/lib/pedidoWeb.js + lib/cambioPedido.js: la linea
// `Cambio: 20 USD` (numero y luego moneda). Solo se escribe si el cliente marco «Si»; con
// «No» el mensaje sale exactamente como siempre. No toca ninguna cuenta del pedido.
(function () {
  'use strict';

  var MONEDAS = ['usd', 'cup'];

  function numero(v) {
    var t = String(v == null ? '' : v).trim().replace(/\s+/g, '').replace(',', '.');
    return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  }

  // (si, monto, moneda) -> { ok:true, linea } | { ok:false } (marco Si pero sin cantidad valida)
  // Con si=false -> { ok:true, linea:'' }.
  function linea(si, monto, moneda) {
    if (!si) return { ok: true, linea: '' };
    var n = numero(monto);
    if (!(n > 0) || n > 1000000) return { ok: false };
    var m = MONEDAS.indexOf(String(moneda || '').toLowerCase()) >= 0 ? String(moneda).toLowerCase() : 'usd';
    n = Math.round(n * 100) / 100;
    return { ok: true, linea: 'Cambio: ' + n + ' ' + m.toUpperCase() };
  }

  window.Cambio = { linea: linea, MONEDAS: MONEDAS };
})();
