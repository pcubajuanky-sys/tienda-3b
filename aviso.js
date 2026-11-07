// aviso.js — «🔔 Avísame cuando vuelva».
//
// Modulo PURO (ni DOM ni red): arma el texto y el enlace de WhatsApp. Lo pinta app.js en la
// ficha de lo que esta en espera, en la tarjeta de un producto agotado y en la busqueda.
// Se prueba con node:vm desde test/aviso.test.js.
//
// 🔴 CONTRATO con lib/avisoVuelta.js de Stock+ (igual que `Horario:` y `Negocio:`): la MARCA y la
// ultima linea `Ref:` las lee el servidor para anotar la peticion sola. Si se cambian aqui y no
// alli, el aviso no se anota y nadie se entera. El resto del texto es libre.
//
// 🔴 El destino lo pone quien llama y SIEMPRE es el numero de la casa (CAT.whatsapp), nunca
// destinoWhatsApp(): con un gestor con recargo ese seria el del gestor, donde no vive el bot.
(function () {
  'use strict';

  const MARCA = '🔔 *AVÍSAME CUANDO VUELVA*';
  const TEXTO_BOTON = '🔔 Avísame cuando vuelva';
  const TEXTO_BOTON_ESPERA = '🔔 Avísame cuando se libere';
  const SEP_VAR = ' / ';

  function limpiar(t) {
    const s = (t === undefined || t === null) ? '' : String(t);
    return s.replace(/\s+/g, ' ').trim();
  }

  // (producto, clave de variante «M / ROJO» o null) -> texto. Sin nombre o sin codigo, ''.
  function mensaje(p, variante) {
    const nombre = limpiar(p && p.name);
    const codigo = limpiar(p && p.codigo);
    if (!nombre || !codigo) return '';
    const clave = limpiar(variante);
    const lineas = [
      'Hola 3B 👋',
      MARCA,
      'Quiero que me avisen cuando vuelva *' + nombre + '* (código ' + codigo + ')',
    ];
    if (clave) {
      const vals = clave.split(SEP_VAR);
      const ejes = p && p.variantes && Array.isArray(p.variantes.ejes) ? p.variantes.ejes : null;
      lineas.push(ejes && ejes.length === vals.length
        ? ejes.map((e, i) => e + ' ' + vals[i]).join(', ')
        : clave);
    }
    // Mismo transporte que la linea Ref de enviarPorWhatsApp: «/» tras el codigo, «+» entre ejes.
    lineas.push('Ref: ' + codigo + (clave ? '/' + clave.split(SEP_VAR).join('+') : ''));
    return lineas.join('\n');
  }

  // (telefono, producto, variante) -> URL de WhatsApp, o '' si falta algo.
  function enlace(destino, p, variante) {
    const texto = mensaje(p, variante);
    const crudo = (destino === undefined || destino === null) ? '' : String(destino);
    const tel = crudo.replace(/\D/g, '');
    if (!texto || !tel) return '';
    return 'https://api.whatsapp.com/send?phone=' + tel + '&text=' + encodeURIComponent(texto);
  }

  // (agotados, categoria, max) -> los agotados de ESA categoria, en el orden recibido (ya vienen
  // alfabeticos), recortados a `max` (def. 12). Sin categoria, ninguno: en «Todo» no se pintan.
  function porCategoria(lista, cat, max) {
    const c = limpiar(cat);
    if (!c || !Array.isArray(lista)) return [];
    const tope = max > 0 ? max : 12;
    return lista.filter((a) => a && limpiar(a.cat) === c).slice(0, tope);
  }

  window.Aviso = { mensaje, enlace, porCategoria, MARCA, TEXTO_BOTON, TEXTO_BOTON_ESPERA };
})();
