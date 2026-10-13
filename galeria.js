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

  // Cuanto tiene que correr el dedo para que cuente como deslizamiento. Por debajo de
  // esto es un toque o un temblor de la mano.
  var UMBRAL_PX = 40;

  // (dx, dy) del gesto -> +1 siguiente, -1 anterior, 0 "no fue un deslizamiento".
  // dx NEGATIVO = el dedo fue hacia la izquierda = quiere ver la foto SIGUIENTE, igual
  // que al pasar hojas. Si el dedo corrio mas en vertical que en horizontal es un
  // desplazamiento de la pagina y aqui NO se hace nada.
  function pasoDelGesto(dx, dy) {
    var x = Number(dx);
    var y = Number(dy);
    if (!isFinite(x) || !isFinite(y)) return 0;
    if (Math.abs(x) < UMBRAL_PX) return 0;
    if (Math.abs(x) <= Math.abs(y)) return 0;
    return x < 0 ? 1 : -1;
  }

  // Indice siguiente/anterior dando la vuelta. Con 0 o 1 foto siempre es 0.
  function indiceSiguiente(actual, total, paso) {
    if (!(total > 1)) return 0;
    return ((actual + paso) % total + total) % total;
  }

  window.Galeria = { fotosDe: fotosDe, pasoDelGesto: pasoDelGesto, indiceSiguiente: indiceSiguiente };
})();
