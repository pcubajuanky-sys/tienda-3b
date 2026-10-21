// espera.js — ¿esta unidad está pedida y esperando que el cliente confirme?
//
// Lo decide Stock+, no el navegador: el catálogo publica `espera` (el producto entero) y
// `esperaOpciones` (las combinaciones pedidas). Aquí solo se LEE, igual que con el precio
// y la mensajería. Si mañana cambia la regla de qué cuenta como pedido, se cambia en
// lib/pedidoReserva.js y esta página no se toca.
//
// 🔴 Un producto en espera SÍ se enseña (decisión de Ruth, 2026-10-20): lo que se quita es
// el botón de añadir. Desaparecer sería el comportamiento viejo del agotado, y lo que ella
// pidió es justo lo contrario: «que se muestre pero que especifique».
(function () {
  const AVISO_CORTO = '🕒 Pedido — esperando confirmación';
  const AVISO_LARGO = 'La última unidad está pedida y esperamos la confirmación del cliente. Escríbenos y te avisamos si se libera.';

  // `clave` es la combinación elegida (misma forma que variantes.opciones, 'TALLA / COLOR')
  // o null si el producto no tiene variantes o la clienta aún no eligió.
  //
  // 🔴 Con `esperaOpciones` y SIN combinación elegida devuelve false a propósito: que una
  // talla esté pedida no puede bloquear las otras. El bloqueo de esa talla salta en cuanto
  // la elige, que es cuando el botón se refresca con su clave.
  function enEspera(p, clave) {
    if (!p) return false;
    if (p.espera === true) return true;
    if (!clave) return false;
    const lista = Array.isArray(p.esperaOpciones) ? p.esperaOpciones : [];
    return lista.indexOf(clave) !== -1;
  }

  window.Espera = { enEspera, AVISO_CORTO, AVISO_LARGO };
})();
