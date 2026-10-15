// preciosGestor.js — los precios de la pagina de un gestor.
//
// 🔴 ESTE ARCHIVO NO CALCULA NINGUN PRECIO. Los precios llegan ya calculados en
// precios-gestores.json, que publica Stock+ con la MISMA funcion que genera el
// catalogo (lib/preciosGestores.js). El navegador no calcula reglas de negocio:
// misma razon por la que el precio del catalogo ya trae el recargo aplicado y por la
// que el texto de mensajeria viaja compuesto. Multiplicar aqui por un porcentaje
// reabre el bug del 2026-08-16 (la web cobrando 449 por algo que Stock+ cobra 450)
// en los 240 productos a la vez.
//
// Modulo puro, patron IIFE + window.X (igual que orden.js, galeria.js y tarjeta.js).
(function () {
  'use strict';

  // 'Elaine Ocampo Pino' -> 'Elaine'. La banda de la tienda dice solo el nombre
  // (decision de Ruth, 2026-10-15): el campo `nombre` de la ficha guarda el completo.
  function nombreCorto(nombre) {
    return String(nombre == null ? '' : nombre).trim().split(/\s+/)[0] || '';
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // (items, tabla) -> copia de items con los precios del gestor. Lo que no este en la
  // tabla, o venga incompleto, se queda con el precio de la casa: nunca un precio a
  // medias. No muta la entrada.
  function aplicar(items, tabla) {
    const lista = Array.isArray(items) ? items : [];
    const t = tabla && typeof tabla === 'object' ? tabla : null;
    if (!t) return lista.slice();
    return lista.map(function (p) {
      const e = t[p && p.codigo];
      if (!e) return p;
      const u = num(e.u);
      const c = num(e.c);
      if (!u || !c) return p;
      const salida = Object.assign({}, p, { precioUSD: u, precioCUP: c });
      // El tachado de una oferta viaja aparte: si no viene entero, se deja el de la
      // casa antes que ensenar «antes 2.400, ahora 2.200» con cifras de dos mundos.
      const nu = num(e.nu);
      const nc = num(e.nc);
      if (nu && nc) { salida.precioNormalUSD = nu; salida.precioNormalCUP = nc; }
      return salida;
    });
  }

  window.PreciosGestor = { aplicar: aplicar, nombreCorto: nombreCorto };
}());
