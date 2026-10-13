// galeria.js — las fotos de la ficha de producto, en orden.
// Script de navegador (IIFE con window.Galeria), mismo patron que tarjeta.js: la logica
// pura vive aqui para poder probarla con `node --test` sin navegador. app.js no sirve
// para eso: llama a iniciar() al final y toca document.
//
// `p.fotos` es opcional y SOLO lo trae el catalogo de la tienda web. La foto principal
// (`p.photo`) es la que publican el goteo al grupo, Facebook y Mia: aqui solo se enseña,
// nunca se cambia de sitio.
(function () {
  'use strict';

  // Todas las fotos del producto, sin repetir y con la principal SIEMPRE primera.
  function fotosDe(p) {
    const out = [];
    function mete(u) {
      if (typeof u !== 'string') return;
      const s = u.trim();
      if (!s || out.indexOf(s) !== -1) return;
      out.push(s);
    }
    if (!p) return out;
    mete(p.photo);
    if (Array.isArray(p.fotos)) p.fotos.forEach(mete);
    return out;
  }

  window.Galeria = { fotosDe: fotosDe };
})();
