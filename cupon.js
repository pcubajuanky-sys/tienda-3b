// cupon.js — cupones de descuento del carrito. Modulo PURO (IIFE con window.Cupon): sin DOM
// ni red, se prueba con node:vm.
//
// GEMELO de inventario-stockmas/lib/cupones.js (`calcular`, `huella`, `normalizaCodigo`).
// Si cambias la regla en uno, cambia el otro: test/cupon.test.js los compara.
// El dato viene de `catalogo.json -> cupones` ({visibles, huellas}); AUSENTE si esta apagado.
//
// 🔴 El cupon que aqui «vale» es solo una vista previa: lo que manda es Stock+ al recibir
// el pedido (la linea `Cupon: CODIGO`). Un cupon que no vale NUNCA bloquea el pedido.
// 🔴 Los cupones personales/de primera compra viajan como HUELLA (sha256), no como codigo:
// la web no publica codigos que no son para todos.
(function () {
  'use strict';

  var TEXTOS = {
    'con-gestor': 'Ese cupón no se puede usar con el enlace de un gestor.',
    'vencido': 'Ese cupón ya venció.',
    'sin-elegibles': 'Ese cupón no aplica a los productos de tu pedido (los que están en oferta no entran).',
    'no-existe': 'Ese cupón no existe. Revisa que esté bien escrito.',
    'sin-tasa': 'Ahora mismo no podemos calcular el cupón.',
  };

  function normaliza(v) {
    return String(v == null ? '' : v)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
  }

  function hex(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }

  // sha256('3b-cupon:' + CODIGO) en hexadecimal. null si el navegador no tiene crypto.subtle.
  async function huella(codigo) {
    var c = window.crypto;
    if (!c || !c.subtle || typeof TextEncoder === 'undefined') return null;
    var datos = new TextEncoder().encode('3b-cupon:' + normaliza(codigo));
    return hex(await c.subtle.digest('SHA-256', datos));
  }

  // → {codigo, ...reglas} o null. Los visibles se buscan por codigo; el resto, por huella.
  async function buscar(bloque, codigo) {
    var cod = normaliza(codigo);
    if (!bloque || !cod) return null;
    var vis = (bloque.visibles || []).find(function (x) { return normaliza(x.codigo) === cod; });
    if (vis) return Object.assign({}, vis, { codigo: cod });
    var h = await huella(cod);
    if (!h) return null;
    var hu = (bloque.huellas || []).find(function (x) { return x.h === h; });
    if (!hu) return null;
    var r = Object.assign({}, hu, { codigo: cod });
    delete r.h;
    return r;
  }

  function esElegible(it, regla) {
    if (it.enOferta) return false;
    var cats = (regla && regla.cats) || [];
    if (cats.length && cats.indexOf(it.cat) === -1) return false;
    return true;
  }

  // items: [{price (CUP unitario), qty, enOferta, cat}] → {descuentoCUP, lineas:[{idx, descUnit}]}.
  // GEMELO EXACTO de `calcular` de lib/cupones.js: mismos floors, mismo reparto.
  function calcular(items, regla, tasa) {
    var lista = items || [];
    var elegibles = [];
    lista.forEach(function (it, idx) {
      if (esElegible(it, regla)) elegibles.push({ idx: idx, price: Number(it.price) || 0, qty: Number(it.qty) || 0 });
    });
    var sub = elegibles.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
    if (!regla || sub <= 0) return { descuentoCUP: 0, lineas: [] };

    var D = null;
    if (regla.tipo === 'pct') {
      var pct = Number(regla.valor) || 0;
      var sinTope = elegibles.reduce(function (s, l) { return s + Math.floor((l.price * pct) / 100) * l.qty; }, 0);
      if (regla.topeCUP > 0 && sinTope > regla.topeCUP) D = regla.topeCUP;
    } else {
      var v = Number(regla.valor) || 0;
      if (regla.monedaFijo === 'usd') D = tasa > 1 ? Math.round(v * tasa) : 0;
      else D = Math.round(v);
    }

    var lineas = [];
    var total = 0;
    if (D == null) {
      var p2 = Number(regla.valor) || 0;
      elegibles.forEach(function (l) {
        var descUnit = Math.floor((l.price * p2) / 100);
        if (descUnit > 0) { lineas.push({ idx: l.idx, descUnit: descUnit }); total += descUnit * l.qty; }
      });
    } else {
      D = Math.min(Math.max(0, D), sub);
      elegibles.forEach(function (l) {
        var descUnit = Math.floor((D * l.price) / sub);
        if (descUnit > 0) { lineas.push({ idx: l.idx, descUnit: descUnit }); total += descUnit * l.qty; }
      });
    }
    return { descuentoCUP: total, lineas: lineas };
  }

  // ctx: {vendedor (bool), ahora (ms), items}. → null si no hay motivo local para rechazar.
  // Mismo orden que el servidor: vencido, con-gestor, sin-elegibles, minimo.
  function motivoLocal(regla, ctx) {
    var c = ctx || {};
    var ahora = c.ahora == null ? Date.now() : c.ahora;
    if (regla.hasta > 0 && ahora > regla.hasta) return 'vencido';
    if (c.vendedor && regla.conGestor !== true) return 'con-gestor';
    var items = c.items || [];
    var hay = items.some(function (it) { return esElegible(it, regla) && (Number(it.price) || 0) * (Number(it.qty) || 0) > 0; });
    if (!hay) return 'sin-elegibles';
    if (regla.minimoCUP > 0) {
      var sub = 0;
      items.forEach(function (it) { if (esElegible(it, regla)) sub += (Number(it.price) || 0) * (Number(it.qty) || 0); });
      if (sub < regla.minimoCUP) return 'minimo';
    }
    return null;
  }

  function texto(motivo, regla) {
    if (motivo === 'minimo') {
      var m = regla && regla.minimoCUP ? ' de ' + regla.minimoCUP + ' CUP' : '';
      return 'Tu compra no llega al mínimo' + m + ' para este cupón (los productos en oferta no cuentan).';
    }
    return TEXTOS[motivo] || 'Ese cupón no se pudo aplicar.';
  }

  window.Cupon = {
    normaliza: normaliza, huella: huella, buscar: buscar,
    calcular: calcular, motivoLocal: motivoLocal, texto: texto,
  };
})();
