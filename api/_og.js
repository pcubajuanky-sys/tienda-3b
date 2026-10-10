// api/_og.js — construye las etiquetas og:/twitter: de UN producto.
//
// Vive dentro de api/ pero empieza por guion bajo: Vercel no publica como endpoint
// los archivos que empiezan por "_". Si se le quita el guion, aparece una URL
// publica /api/og que nadie pidio.
//
// Modulo PURO a proposito: no lee archivos, no toca la red, no depende de Vercel.
// Por eso se puede probar entero con node --test (test/og.test.js).
//
// OJO, duplicacion consciente: app.js tiene su propio precioTexto() para el texto
// que se manda por WhatsApp. Son dos entornos distintos (Node aqui, navegador alli)
// y no hay forma de compartir codigo sin montar un empaquetador. Si cambias el
// formato del precio aqui, cambialo tambien en app.js, igual que pasa con la
// pareja vercel.json / _redirects.

const IMG_TRANSFORM = 'f_jpg,q_auto,w_1200,h_630,c_pad,b_white';
const IMG_FALLBACK = 'https://www.3bqba.com/og-3b.jpg';
const MARCADOR_CLOUDINARY = '/image/upload/';
const MAX_DESC = 160;

function escapar(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mismo formato que app.js:29, para que la tarjeta y la web digan el mismo numero.
function fmt(n) { return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

function precioTexto(p) {
  const usd = '$' + p.precioUSD + ' USD';
  const cup = fmt(p.precioCUP) + ' CUP';
  const esUsd = p.moneda === 'usd';
  const base = (esUsd ? usd : cup) + ' · ' + (esUsd ? cup : usd);
  if (!p.enOferta) return base;
  const antes = esUsd ? '$' + p.precioNormalUSD : fmt(p.precioNormalCUP) + ' CUP';
  return 'Oferta ' + base + ' (antes ' + antes + ')';
}

function descripcionOg(p) {
  const notas = String(p.notes || '').replace(/\s+/g, ' ').trim();
  let d = notas ? precioTexto(p) + ' — ' + notas : precioTexto(p);
  if (d.length > MAX_DESC) {
    d = d.slice(0, MAX_DESC);
    const i = d.lastIndexOf(' ');
    if (i > 0) d = d.slice(0, i);
    d += '…';
  }
  return d;
}

function imagenOg(p) {
  const url = String(p.photo || '');
  if (!url) return IMG_FALLBACK;
  const i = url.indexOf(MARCADOR_CLOUDINARY);
  if (i === -1) return url;   // las fotos que no son de Cloudinary van tal cual
  const corte = i + MARCADOR_CLOUDINARY.length;
  return url.slice(0, corte) + IMG_TRANSFORM + '/' + url.slice(corte);
}

function ogDeProducto(p, url) {
  return {
    titulo: p.name + ' — 3B Store',
    descripcion: descripcionOg(p),
    imagen: imagenOg(p),
    url: url,
  };
}

function bloqueOg(d) {
  const t = escapar(d.titulo);
  const desc = escapar(d.descripcion);
  const img = escapar(d.imagen);
  const u = escapar(d.url);
  const lineas = [
    '<title>' + t + '</title>',
    '<meta name="description" content="' + desc + '">',
    '<link rel="canonical" href="' + u + '">',
    '<meta property="og:type" content="product">',
    '<meta property="og:site_name" content="3B Store">',
    '<meta property="og:title" content="' + t + '">',
    '<meta property="og:description" content="' + desc + '">',
    '<meta property="og:url" content="' + u + '">',
    '<meta property="og:image" content="' + img + '">',
  ];
  // Solo se declaran las medidas si la imagen pasa por nuestra transformacion:
  // de una foto ajena no sabemos cuanto mide y mentir confunde al robot.
  if (img.indexOf('w_1200,h_630') !== -1) {
    lineas.push('<meta property="og:image:width" content="1200">');
    lineas.push('<meta property="og:image:height" content="630">');
  }
  lineas.push('<meta property="og:locale" content="es_CU">');
  lineas.push('<meta name="twitter:card" content="summary_large_image">');
  lineas.push('<meta name="twitter:title" content="' + t + '">');
  lineas.push('<meta name="twitter:description" content="' + desc + '">');
  lineas.push('<meta name="twitter:image" content="' + img + '">');
  return lineas.join('\n');
}

module.exports = { ogDeProducto, bloqueOg, precioTexto, descripcionOg, imagenOg, escapar };
