// mundos.js — el aviso que descubre los otros negocios de 3B.
// Vive en las DOS páginas (index.html y taxi.html). No sabe nada del catálogo ni
// de la calculadora del taxi: solo mira qué logos hay visibles en la cabecera.
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea los inline.
//
// El aviso NO se recuerda ni se apaga (decisión del dueño, 2026-09-13): sale en
// todas las visitas, tocado o no. Lo único que lo esconde es que no haya ningún
// otro negocio que enseñar.
(function () {
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
    var hay = hayOtrosNegocios();
    franja.hidden = !hay;
    globo.hidden = !hay;
  }

  document.addEventListener('DOMContentLoaded', refrescar);

  // app.js la llama al final de renderMundos(): la visibilidad del taxi se
  // decide tarde, cuando llega catalogo.json.
  window.Mundos = { refrescar: refrescar };
})();
