// favoritos.js — la lista de favoritos del cliente.
// Modulo PURO (IIFE con window.Favoritos): ni DOM ni localStorage. Se prueba con node:vm.
(function () {
  'use strict';

  // Un array NUEVO: si el id estaba lo quita; si no, lo añade al final.
  function alternar(lista, id) {
    const base = Array.isArray(lista) ? lista : [];
    if (base.indexOf(id) !== -1) return base.filter((x) => x !== id);
    return base.concat([id]);
  }

  // Solo los ids que siguen en el catalogo, en el orden de `lista`.
  function vigentes(lista, items) {
    const ids = {};
    for (const p of (Array.isArray(items) ? items : [])) if (p) ids[p.id] = true;
    return (Array.isArray(lista) ? lista : []).filter((id) => ids[id] === true);
  }

  // El texto de WhatsApp. `fmt` (formato de miles de app.js) se inyecta para no duplicarlo.
  function mensaje(productos, fmt) {
    if (!Array.isArray(productos) || !productos.length) return '';
    const f = typeof fmt === 'function' ? fmt : String;
    const lineas = productos.map((p) => '• ' + p.name + ' — ' + f(p.precioCUP) + ' CUP');
    return ['Hola 👋 Me interesan estos productos de la tienda:'].concat(lineas, ['¿Están disponibles?']).join('\n');
  }

  window.Favoritos = { alternar: alternar, vigentes: vigentes, mensaje: mensaje };
})();
