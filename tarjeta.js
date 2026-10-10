// tarjeta.js — la imagen 1080x1920 que el gestor comparte al estado de WhatsApp o a
// una historia de Instagram: foto del producto + nombre + precio + logo 3B.
// IIFE con un global (window.Tarjeta), igual que mundos.js y encargos.js.
// Script externo a proposito: la CSP (vercel.json / _headers) bloquea los inline.
//
// Las tres funciones de _puro no tocan el canvas y se prueban en Node
// (test/tarjeta.test.js). El dibujo en si se verifica a ojo en el navegador.
(function () {
  var ANCHO = 1080;
  var ALTO = 1920;
  var ALTO_FOTO = 1040;
  // ZONA MUERTA: los ultimos 220 px (y > 1700) NO llevan contenido. La interfaz del estado
  // de WhatsApp y de las historias de Instagram (campo «Responder», barra del sistema,
  // botones de la app) se dibuja ENCIMA de la imagen y tapa esa franja; ahi iba la llamada
  // a la accion y no se leia. No bajar nada de aqui: si falta sitio, se encoge la foto
  // (ALTO_FOTO), nunca el precio. Todo el texto cuelga de ALTO_FOTO, asi que cambiarla
  // mueve el bloque entero; el pie acaba justo en LIMITE_SEGURO.
  var LIMITE_SEGURO = ALTO - 220; // 1700
  var Y_NOMBRE = ALTO_FOTO + 70;  // centro de la 1.a linea del nombre
  var Y_PRECIO = ALTO_FOTO + 260;
  var Y_ANTES = ALTO_FOTO + 350;
  var Y_FRASE = ALTO_FOTO + 465;
  var Y_PIE = ALTO_FOTO + 595;    // centro del logo; con 96 px de alto acaba en 1683
  var ANCHO_TEXTO = 960; // 1080 menos 60 de margen a cada lado
  var COLOR_MARCA = '#7A2E5D';
  var FUENTE = 'system-ui, sans-serif'; // sin webfonts: la CSP no tiene font-src

  // Mismo formato de miles que fmt() de app.js.
  function fmt(n) { return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

  // Misma regla que precioTexto() de app.js: la moneda de p.moneda va primero.
  function precioTarjeta(p) {
    var usd = '$' + p.precioUSD + ' USD';
    var cup = fmt(p.precioCUP) + ' CUP';
    var esUsd = p.moneda === 'usd';
    var grande = (esUsd ? usd : cup) + ' · ' + (esUsd ? cup : usd);
    var antes = '';
    if (p.enOferta) {
      antes = esUsd ? '$' + p.precioNormalUSD + ' USD' : fmt(p.precioNormalCUP) + ' CUP';
    }
    return { grande: grande, antes: antes };
  }

  // Parte el nombre por palabras, nunca a mitad de palabra. `cabe(texto)` dice si ese
  // texto entra en el ancho disponible (quien dibuja la hace con measureText; asi esta
  // funcion sigue siendo pura). Una palabra que no cabe sola se corta a lo bruto. Si
  // hay mas de maxLineas, la ultima acaba en «…» (y aun asi cabe).
  function lineasNombre(nombre, cabe, maxLineas) {
    var tope = maxLineas || 2;
    var palabras = String(nombre == null ? '' : nombre).split(/\s+/).filter(Boolean);
    var trozos = [];
    palabras.forEach(function (w) {
      while (w && !cabe(w)) {
        var n = w.length - 1;
        while (n > 1 && !cabe(w.slice(0, n))) n--;
        trozos.push(w.slice(0, n));
        w = w.slice(n);
      }
      if (w) trozos.push(w);
    });
    var lineas = [];
    var actual = '';
    trozos.forEach(function (w) {
      if (!actual) { actual = w; return; }
      if (cabe(actual + ' ' + w)) { actual += ' ' + w; return; }
      lineas.push(actual);
      actual = w;
    });
    if (actual) lineas.push(actual);
    if (lineas.length <= tope) return lineas;
    var res = lineas.slice(0, tope);
    var ult = res[tope - 1];
    // Quita palabras del final hasta que quepa con el «…»; si queda una sola, recorta letras.
    while (!cabe(ult + '…') && ult.indexOf(' ') !== -1) ult = ult.slice(0, ult.lastIndexOf(' '));
    while (!cabe(ult + '…') && ult.length > 1) ult = ult.slice(0, -1);
    res[tope - 1] = ult.replace(/[\s.,;:]+$/, '') + '…';
    return res;
  }

  function nombreArchivo(p) {
    var cod = String((p && p.codigo) || '').toUpperCase().replace(/[^A-Za-z0-9-]/g, '');
    return '3b-' + (cod || 'producto') + '.jpg';
  }

  // ── Dibujo (solo navegador) ──
  function cargarImagen(src, que, anonima) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      // crossOrigin ANTES de src: sin esto el canvas queda contaminado y toBlob falla.
      if (anonima) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('No se pudo cargar ' + que)); };
      img.src = src;
    });
  }

  // Encoge la letra hasta que el texto cabe en `ancho` (el precio no se corta nunca).
  function ajustarFuente(ctx, texto, px, minPx, ancho, peso) {
    var t = px;
    ctx.font = peso + ' ' + t + 'px ' + FUENTE;
    while (t > minPx && ctx.measureText(texto).width > ancho) {
      t -= 2;
      ctx.font = peso + ' ' + t + 'px ' + FUENTE;
    }
    return t;
  }

  function dibujar(p) {
    var urlFoto = String(p.photo || '');
    var transform = 'f_jpg,q_auto,w_1080,c_limit';
    var src = typeof fotoUrl === 'function' ? fotoUrl(urlFoto, transform) : urlFoto;
    return Promise.all([
      cargarImagen(src, 'la foto del producto', true),
      cargarImagen('logo-3b.png', 'el logo de 3B', false)
    ]).then(function (imgs) {
      var foto = imgs[0];
      var logo = imgs[1];
      var canvas = document.createElement('canvas');
      canvas.width = ANCHO;
      canvas.height = ALTO;
      var ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('El navegador no pudo crear el lienzo');

      // 1) fondo blanco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, ANCHO, ALTO);

      // 2) foto en modo «cover», centrada y sin deformar
      var escala = Math.max(ANCHO / foto.naturalWidth, ALTO_FOTO / foto.naturalHeight);
      var sw = ANCHO / escala;
      var sh = ALTO_FOTO / escala;
      var sx = (foto.naturalWidth - sw) / 2;
      var sy = (foto.naturalHeight - sh) / 2;
      ctx.drawImage(foto, sx, sy, sw, sh, 0, 0, ANCHO, ALTO_FOTO);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 3) nombre (hasta 2 lineas). Se mide con el canvas; si no entra en 2 lineas a 64px,
      //    baja la letra hasta 48px antes de resignarse a truncar con «…».
      ctx.fillStyle = '#1A141C';
      var cabe = function (t) { return ctx.measureText(t).width <= ANCHO_TEXTO; };
      var tam = 64;
      var lineas;
      for (;;) {
        ctx.font = 'bold ' + tam + 'px ' + FUENTE;
        lineas = lineasNombre(p.name, cabe, 3); // pide 3: si salen 3, no entra en 2
        if (lineas.length <= 2 || tam <= 48) break;
        tam -= 2;
      }
      if (lineas.length > 2) lineas = lineasNombre(p.name, cabe, 2);
      lineas.forEach(function (l, i) { ctx.fillText(l, ANCHO / 2, Y_NOMBRE + i * Math.round(tam * 1.19)); });

      // 4) precio grande y, si hay oferta, el de antes tachado
      var precio = precioTarjeta(p);
      ctx.fillStyle = COLOR_MARCA;
      ajustarFuente(ctx, precio.grande, 92, 56, ANCHO - 80, 'bold');
      ctx.fillText(precio.grande, ANCHO / 2, Y_PRECIO);
      if (precio.antes) {
        ctx.fillStyle = '#6B6370';
        ctx.font = '48px ' + FUENTE;
        var w = ctx.measureText(precio.antes).width;
        ctx.fillText(precio.antes, ANCHO / 2, Y_ANTES);
        ctx.fillRect(ANCHO / 2 - w / 2, Y_ANTES, w, 4);
      }

      // 5) pie. En el estado de WhatsApp y en una historia el enlace no se puede pinchar:
      //    quien ve la foto tiene que LEER a donde ir. Arriba, una frase en gris (48 px);
      //    debajo, el logo a la izquierda y el dominio a su derecha, el conjunto centrado.
      ctx.fillStyle = '#6B6370';
      ctx.textAlign = 'center';
      ctx.font = '48px ' + FUENTE;
      ctx.fillText('Busca más productos y detalles en', ANCHO / 2, Y_FRASE);

      var altoLogo = 96;
      var anchoLogo = altoLogo * (logo.naturalWidth / logo.naturalHeight);
      var hueco = 28;
      var dominio = 'www.3bqba.com';
      // Si no cupiera junto al logo se baja el cuerpo de la letra; el dominio no se recorta.
      // El dominio es lo unico que se puede LEER para llegar a la tienda (en el estado y en las
      // historias el enlace no se pincha): va en negrita y es lo segundo en jerarquia tras el precio.
      ctx.fillStyle = '#3B2F40';
      ajustarFuente(ctx, dominio, 60, 40, ANCHO - 120 - anchoLogo - hueco, 'bold');
      ctx.textAlign = 'left';
      var anchoDominio = ctx.measureText(dominio).width;
      var x0 = (ANCHO - (anchoLogo + hueco + anchoDominio)) / 2;
      ctx.drawImage(logo, x0, Y_PIE - altoLogo / 2, anchoLogo, altoLogo);
      ctx.fillText(dominio, x0 + anchoLogo + hueco, Y_PIE);
      if (Y_PIE + altoLogo / 2 > LIMITE_SEGURO) throw new Error('El pie de la tarjeta invade la zona muerta');

      var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('El navegador no pudo generar el JPEG')); return; }
          resolve({ blob: blob, dataUrl: dataUrl, nombreArchivo: nombreArchivo(p) });
        }, 'image/jpeg', 0.9);
      });
    });
  }

  window.Tarjeta = {
    dibujar: dibujar,
    _puro: { precioTarjeta: precioTarjeta, lineasNombre: lineasNombre, nombreArchivo: nombreArchivo }
  };
})();
