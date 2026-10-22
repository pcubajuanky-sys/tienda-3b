// preguntar.js — «quiero preguntar por ESTE producto».
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js
// en la ficha, debajo de la accion de compra. Se prueba con node:vm desde
// test/preguntar.test.js.
//
// Por que existe: esta tienda no tiene pasarela de pago — la conversacion de WhatsApp ES
// el checkout. Hasta hoy los tres botones de WhatsApp de la ficha servian para COMPARTIR
// el producto, no para preguntar por el, asi que la clienta que dudaba («¿me sirve esta
// talla?», «¿llega a Güira?») no tenia donde escribir y se iba.
//
// 🔴 El CODIGO del producto va en el mensaje a proposito: es lo mismo que Stock+ usa para
// emparejar un pedido (ver la linea `Ref:` de enviarPorWhatsApp), asi que Ruth y Mia saben
// de que producto se habla sin adivinar por el nombre.
(function () {
  'use strict';

  const TEXTO_BOTON = 'Preguntar por este producto';
  const TEXTO_BOTON_ESPERA = 'Avísame si se libera';

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim();
  }

  // (producto, enEspera) -> texto para WhatsApp. Sin producto o sin nombre, ''.
  function mensaje(p, enEspera) {
    const nombre = limpiar(p && p.name);
    if (!nombre) return '';
    const codigo = limpiar(p && p.codigo);
    // Sin codigo no se escribe el parentesis: «(código )» le dice a Ruth que algo falla
    // en el catalogo, y a la clienta no le dice nada.
    const quien = codigo ? nombre + '* (código ' + codigo + ')' : nombre + '*';
    return enEspera
      ? 'Hola 3B 👋\nMe interesa *' + quien + ', que está pedido.\n¿Me avisan si se libera?'
      : 'Hola 3B 👋\nMe interesa *' + quien + '.\n¿Me pueden dar más información?';
  }

  // (telefono, producto, enEspera) -> URL de WhatsApp, o '' si falta algo.
  // api.whatsapp.com/send, nunca wa.me: es lo que usa el resto de la tienda.
  function enlace(destino, p, enEspera) {
    const texto = mensaje(p, enEspera);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  window.Preguntar = { mensaje, enlace, TEXTO_BOTON, TEXTO_BOTON_ESPERA };
})();
