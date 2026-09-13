// mundos.js — el aviso que descubre los otros negocios de 3B.
// Vive en las DOS páginas (index.html y taxi.html). No sabe nada del catálogo ni
// de la calculadora del taxi: solo mira qué logos hay visibles en la cabecera.
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea los inline.
(function () {
  var VISTO = '3b_mundos_visto';

  // Sin localStorage (modo privado) el aviso se enseña igual: molesta menos que
  // no descubrirse nunca.
  function yaLoVio() {
    try { return localStorage.getItem(VISTO) === '1'; } catch (e) { return false; }
  }
  function marcarVisto() {
    try { localStorage.setItem(VISTO, '1'); } catch (e) { /* no se recuerda, no es grave */ }
  }

  // Hay algo que descubrir solo si se ve al menos un negocio que NO es este.
  // En index.html el taxi está hidden hasta que catalogo.json lo enciende.
  function hayOtrosNegocios() {
    var otros = document.querySelectorAll('.mundos .mundo:not(.mundo-on)');
    for (var i = 0; i < otros.length; i++) { if (!otros[i].hidden) return true; }
    return false;
  }

  function refrescar() {
    var franja = document.getElementById('promo-mundos');
    var globo  = document.getElementById('mundos-globo');
    if (!franja || !globo) return;
    if (yaLoVio() || !hayOtrosNegocios()) { franja.hidden = true; globo.hidden = true; return; }
    // La franja NO se esconde al bajar: se va sola con el scroll. Esconderla
    // movería el contenido bajo el dedo del cliente.
    franja.hidden = false;
    globo.hidden = !(window.scrollY > 8);   // mismo umbral que la cabecera compacta
  }

  // Tocó un negocio: ya lo descubrió, no se le repite más.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest('.mundos .mundo:not(.mundo-on)')) marcarVisto();
  });

  window.addEventListener('scroll', refrescar, { passive: true });
  document.addEventListener('DOMContentLoaded', refrescar);

  // app.js la llama al final de renderMundos(): la visibilidad del taxi se
  // decide tarde, cuando llega catalogo.json.
  window.Mundos = { refrescar: refrescar };
})();
