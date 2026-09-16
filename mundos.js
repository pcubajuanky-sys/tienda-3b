// mundos.js — el aviso que descubre los otros negocios de 3B.
// Vive en las DOS páginas (index.html y taxi.html). No sabe nada del catálogo ni
// de la calculadora del taxi: solo mira qué logos hay visibles en la cabecera.
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea los inline.
//
// El aviso NO se recuerda ni se apaga: sale en todas las visitas. Lo único que
// lo esconde es que no haya ningún otro negocio que enseñar.
// 2026-09-16: el globo «👈 Toca nuestros otros negocios» se retiró. Anunciaba lo
// mismo que la franja y que el aro que late sobre el logo del socio, y se comía
// 82 px de la cabecera pegada en un celular de 375 px. Quedan los otros dos.
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
    if (!franja) return;
    franja.hidden = !hayOtrosNegocios();
  }

  document.addEventListener('DOMContentLoaded', refrescar);

  // app.js la llama al final de renderMundos(): la visibilidad del taxi se
  // decide tarde, cuando llega catalogo.json.
  window.Mundos = { refrescar: refrescar };
})();
