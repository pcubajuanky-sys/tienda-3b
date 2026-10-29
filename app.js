// app.js — tienda 3B. Lee catalogo.json y pinta el catálogo.
// Sin dependencias, sin backend: todo pasa en el navegador del cliente.
let CAT = null;          // el catalogo.json cargado
// De quien es ESTA pagina: lo dice <body data-negocio>. index.html no lo lleva
// (= la casa); electripower.html lo lleva.
const NEGOCIO = window.Negocio ? window.Negocio.deLaPagina(document) : '3b';
const CLAVE_CARRITO = window.Negocio ? window.Negocio.claveCarrito(NEGOCIO) : 'carrito';
// ¿Esta pagina es la de la casa? Lo usan las reglas que SOLO valen para 3B.
function esCasaWeb() {
  return NEGOCIO === (window.Negocio ? window.Negocio.CASA : '3b');
}
// La pagina de este negocio, para el historial de capas y para prepararHistorial.
const RAIZ = NEGOCIO === (window.Negocio ? window.Negocio.CASA : '3b') ? '/' : '/' + NEGOCIO;
// Marca de "ya envie mi pedido" (traspedido.js). Por negocio, por lo mismo que el
// carrito: la de la casa se queda con el nombre de siempre, asi 3B se comporta
// exactamente igual que ahora.
const CLAVE_ENVIADO = NEGOCIO === (window.Negocio ? window.Negocio.CASA : '3b')
  ? 'pedidoEnviado'
  : 'pedidoEnviado:' + NEGOCIO;
// Marca de «la ultima vez que estuvo aqui» (regreso.js). Por negocio, por lo mismo que
// el carrito y la marca de pedido enviado.
const CLAVE_VISITA = NEGOCIO === (window.Negocio ? window.Negocio.CASA : '3b')
  ? 'ultimaVisita'
  : 'ultimaVisita:' + NEGOCIO;
let gestorRecargo = null;   // el gestor cuyos precios se estan enseñando, si los hay
let filtroCat = '';      // categoría activa ('' = todas)
let filtroOferta = false;
let ordenSel = 'az';          // criterio de orden elegido; 'az' es el de siempre
let soloEnvioGratis = false;  // filtro de mensajería gratis incondicional
let busqueda = '';
let elementoAnteriorFoco = null;   // para devolver el foco al cerrar modal/carrito
let productoModal = null;
let seleccionVar = [];   // un valor por eje, del producto abierto en el detalle
let catsExpandidas = false;   // estado de "Ver todas" en categorías (solo escritorio); sobrevive a los re-render
const CATS_VISIBLES_PLEGADO = 8;   // debe coincidir con :nth-child(n+9) en estilos.css
const CTA_COMI_TRAS_N = 6;   // «Gana dinero con 3B» entra en la parrilla tras estos productos

// Destino de pago fijo en el código, NO en el catálogo (2026-08-16).
// El panel de Stock+ que genera catalogo.json NO tiene autenticación de
// servidor — cualquiera en la red local o el tailnet puede llamar a
// PUT /api/config — así que confiar en tienda.pagoUrl tal cual viene del
// catálogo no es seguro. Y una lista de dominios permitidos tampoco basta:
// alguien podría poner un dominio LEGÍTIMO de QvaPay pero de OTRO usuario
// (ej. https://otrousuario.qvpay.me) y los clientes le pagarían a un
// tercero. Por eso el destino real vive aquí, fijo: cambiarlo exige tocar
// el código y queda como un commit visible. Si el dueño cambia de página
// de cobro, se cambia ESTA constante (ver pagoDestinoAutorizado más abajo).
const PAGO_URL_FIJA = 'https://j3b.qvpay.me';
const PAGO_DOMINIO_FIJO = new URL(PAGO_URL_FIJA).hostname;

// ── Utilidades ──

function fmt(n) { return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

// Búsqueda insensible a acentos: "audifonos" debe encontrar "Audífonos".
function normaliza(s) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// El código del vendedor puede venir por ?ref=CODIGO (enlaces viejos, siguen valiendo)
// o por el path (www.3bqba.com/CODIGO, vía el rewrite de vercel.json). Sobrevive a la
// navegación porque se guarda al entrar.
function codigoDeLaUrl() {
  const q = new URLSearchParams(location.search).get('ref');
  if (q) return q;
  // Un solo segmento y sin punto: los archivos reales llevan extensión y no llegan aquí.
  const seg = location.pathname.split('/').filter(Boolean);
  if (seg.length === 1 && seg[0].indexOf('.') === -1) return seg[0];
  return '';
}

function resolverVendedor() {
  const url = codigoDeLaUrl();
  if (url) localStorage.setItem('ref', url.toUpperCase());
  const code = localStorage.getItem('ref') || '';
  const v = (CAT.vendedores || []).find((x) => x.code === code);
  if (!v) { localStorage.removeItem('ref'); return null; }   // código inválido o dado de baja
  return v;
}

// Quien pone el precio, atiende: si la visita entro por la pagina de un gestor con
// recargo, lo que se le escriba va a SU WhatsApp; si no, al numero de la casa.
//
// 🔴 ESTE ES EL UNICO SITIO donde se decide ese destino. Antes la expresion estaba
// copiada en el pedido y en la busqueda sin resultados, y test/negocio.test.js contaba
// las copias para que ninguna se quedara sin la guarda. Al aparecer un tercer sitio (el
// boton de preguntar de la ficha, 2026-10-22) se extrajo aqui: ahora olvidarse de la
// guarda es imposible, no solo detectable. NO vuelvas a copiar la expresion.
//
// 🔴 La guarda esCasaWeb() no es opcional: en la tienda de un negocio asociado NO cae
// recargo y precios-gestores.json no lleva sus productos, asi que el gestor no pone ese
// precio y el mensaje tiene que ir al numero de la casa.
function destinoWhatsApp() {
  return (esCasaWeb() && gestorRecargo && gestorRecargo.telPublico) || (CAT && CAT.whatsapp);
}

// ── Cloudinary: transformación de URL (rendimiento en móvil) ──
// Guarda: solo se toca si la URL trae /image/upload/ y NO trae ya una transformación.
// Los 2 productos que no están en Cloudinary se sirven tal cual (no entran a esta rama).
function esCloudinary(url) {
  return !!url && url.indexOf('/image/upload/') !== -1;
}

function fotoUrl(url, transform) {
  const marcador = '/image/upload/';
  const i = url.indexOf(marcador);
  if (i === -1) return url;
  const despues = url.slice(i + marcador.length);
  const primerSegmento = despues.split('/')[0];
  const yaTransformada = !/^v\d+$/.test(primerSegmento) &&
    primerSegmento.split(',').every((tok) => /^[a-z]+_[\w.:]+$/i.test(tok));
  if (yaTransformada) return url;
  return url.slice(0, i + marcador.length) + transform + '/' + despues;
}

function fotoCard(url) {
  if (!esCloudinary(url)) return { src: url, srcset: '' };
  // `ar_1:1,c_pad,b_auto` en vez de `c_limit`: la tarjeta ya era cuadrada por CSS
  // (`aspect-ratio:1` + `object-fit:cover`), así que lo que hacía era RECORTAR —medido el
  // 2026-10-15: 10 % de media y hasta un 33 % en una foto de 536×800—. Rellenando, el
  // producto se ve entero y el borde lo pone Cloudinary con el color de la propia foto.
  const w400 = fotoUrl(url, 'f_auto,q_auto,w_400,ar_1:1,c_pad,b_auto');
  const w800 = fotoUrl(url, 'f_auto,q_auto,w_800,ar_1:1,c_pad,b_auto');
  return { src: w400, srcset: `${w400} 400w, ${w800} 800w` };
}

function fotoDetalle(url) {
  // Misma razón que en la tarjeta, y aquí pesa más: la ficha es donde se decide la compra,
  // y `.modal-foto` también recorta con `object-fit:cover`.
  return esCloudinary(url) ? fotoUrl(url, 'f_auto,q_auto,w_900,ar_1:1,c_pad,b_auto') : url;
}

function fotoMosaico(url) {
  return esCloudinary(url) ? fotoUrl(url, 'f_auto,q_auto,w_200,c_limit') : url;
}

// Marcador con la inicial cuando la foto no carga (tarjetas de producto y modal).
// Las fotos del mosaico de categorías usan su propio fallback: cat3dImgFallback.
//
// 🔴 NO se sustituye el contenido del contenedor. Hacerlo destruía `<img id="modal-img">`
// para siempre y la SIGUIENTE ficha que se abriera reventaba al buscarlo (fallo real
// encontrado el 2026-10-14: el cliente perdía ese producto y el siguiente). Además
// borraba los sellos OFERTA / ⭐ MÁS VENDIDO, que son hermanos de la imagen.
// Ahora se oculta la imagen y se le pone un hermano: el <img> sobrevive y los sellos
// también. El `hidden` necesita ayuda del CSS, porque `.card-foto img` y `.modal-foto img`
// declaran `display:block`, que gana sobre el atributo (ver estilos.css).
function imgFallback(img) {
  // `.linea` es el carrito: su imagen cuelga directa de ahí y antes la función salía por el
  // `return`, así que esas fotos rotas enseñaban el icono roto del navegador.
  const cont = img.closest('.card-foto') || img.closest('.modal-foto') || img.closest('.linea');
  if (!cont) return;
  img.hidden = true;
  if (cont.querySelector('.inicial')) return;   // ya puesto: no duplicar
  const nombre = (img.alt || '').trim();
  const inicial = nombre.charAt(0).toUpperCase() || '?';
  const marca = document.createElement('div');
  marca.className = 'inicial';
  marca.setAttribute('aria-hidden', 'true');
  marca.textContent = inicial;
  // En la línea del carrito (fila flex) el marcador tiene que ocupar el HUECO de la foto: con
  // appendChild iría al final de la fila, a la derecha del subtotal.
  if (cont.classList.contains('linea')) img.after(marca); else cont.appendChild(marca);
}

// Devuelve la imagen a la vista y quita el marcador. Se llama ANTES de poner un `src`
// nuevo: si no, una foto rota dejaría su inicial encima de la foto siguiente.
function limpiarFallback(img) {
  if (!img) return;
  img.hidden = false;
  // Mismo contenedor que en imgFallback (incluye `.linea`, el carrito).
  const cont = img.closest('.card-foto') || img.closest('.modal-foto') || img.closest('.linea');
  const marca = cont && cont.querySelector('.inicial');
  if (marca) marca.remove();
}

// ── Filtro y búsqueda ──

function visibles() {
  const q = normaliza(busqueda);
  return (CAT.items || []).filter((p) => {
    if (filtroOferta && !p.enOferta) return false;
    if (!filtroOferta && filtroCat && p.cat !== filtroCat) return false;
    if (!q) return true;
    return normaliza(p.name + ' ' + p.notes + ' ' + p.subcat).includes(q);
  });
}

function setCat(n) { filtroCat = n; filtroOferta = false; renderFiltroPill(); renderCategorias3D(); renderGrid(); }
function setOferta() { filtroOferta = true; filtroCat = ''; renderFiltroPill(); renderCategorias3D(); renderGrid(); }

// Píldora de estado junto al encabezado de la parrilla: no es un menú, solo
// dice qué filtro está puesto (si hay alguno) y deja quitarlo con la ✕.
// Elegir el filtro se hace SOLO desde las tarjetas de categoría de arriba.
function renderFiltroPill() {
  const pill = document.getElementById('filtro-pill');
  if (!pill) return;
  // Mismo criterio que las tarjetas de categoría: la cifra es la de lo que se ve.
  const items = window.Orden.filtrar(CAT.items || [], soloEnvioGratis);
  const activo = filtroOferta || filtroCat !== '';
  pill.hidden = !activo;
  if (!activo) return;
  const texto = filtroOferta
    ? `🏷️ Ofertas (${items.filter((p) => p.enOferta).length})`
    : `${filtroCat} (${items.filter((p) => p.cat === filtroCat).length})`;
  document.getElementById('filtro-pill-texto').textContent = texto;
  pill.setAttribute('aria-label', `Quitar filtro: ${texto}`);
}

// ── Categorías 3D (portada) ──
// Únicas: sustituyen del todo a la barra de chips (ver renderFiltroPill).
// Tarjetas a media escala (2026-08-15, pedido del dueño): a 78px/66px de
// ancho el mosaico 2×2 deja de leerse (cada foto quedaría en ~39px), así que
// cada tarjeta muestra UNA sola foto — la primera de las que ya calcula
// mosaicoFotos()/categoriaFotos()/fotosOferta() (mismo origen y mismo orden
// que el mosaico viejo, sin duplicar esa lógica: solo se toma fotos[0]).
// Reversible: para volver al mosaico 2×2 basta con quitar el .slice(0,1) de
// las dos llamadas a cat3dFotoHtml() en renderCategorias3D() — nada más: el
// tercer argumento (los repuestos) se anula solo cuando hay más de una foto.

// Cuántas fotos distintas puede llegar a probar una tarjeta antes de rendirse
// al emoji (ver cat3dImgFallback). Tope bajo a propósito: si están todas
// muertas, son 4 peticiones fallidas y para, no una por producto.
const CAT3D_MAX_INTENTOS = 4;

// Las fotos candidatas de un grupo, en el orden que ya usaba el mosaico:
// primero las de Cloudinary y, si no hay ninguna, las que tengan foto igual.
function mosaicoFuente(items) {
  const conFoto = items.filter((p) => esCloudinary(p.photo));
  const fuente = conFoto.length ? conFoto : items.filter((p) => p.photo);
  return fuente.map((p) => fotoMosaico(p.photo));
}

function mosaicoFotos(items) {
  const fuente = mosaicoFuente(items);
  if (!fuente.length) return [];
  const salida = [];
  for (let i = 0; i < 4; i++) salida.push(fuente[i % fuente.length]);
  return salida;
}

function itemsDeCategoria(catName) {
  return (CAT.items || []).filter((p) => p.cat === catName);
}

function itemsEnOferta() {
  return (CAT.items || []).filter((p) => p.enOferta);
}

function categoriaFotos(catName) {
  return mosaicoFotos(itemsDeCategoria(catName));
}

function fotosOferta() {
  return mosaicoFotos(itemsEnOferta());
}

// Una foto que no carga solo se cae ella. En el mosaico (4 fotos, modo
// reversible) queda una celda vacía porque las otras 3 bastan; en la
// tarjeta pequeña actual (1 sola foto) no hay otras 3 que salven la tarjeta,
// así que cae a la inicial/emoji — igual que cat3dFotoHtml() cuando no hay
// fotos. Se distingue mirando si el <img> es hijo único de .cat3d-foto.
function cat3dImgFallback(img) {
  // Una foto muerta (borrada en Cloudinary → 404) no debe tumbar la tarjeta
  // entera cuando la categoría tiene más fotos sanas: se prueba la siguiente
  // y solo se cae a la inicial/emoji cuando se acaban los repuestos.
  const repuesto = (img.dataset.repuesto || '').split(' ').filter(Boolean);
  if (repuesto.length) {
    img.dataset.repuesto = repuesto.slice(1).join(' ');
    img.src = repuesto[0];
    return;
  }
  if (img.parentElement && img.parentElement.children.length === 1) {
    const inicial = document.createElement('span');
    inicial.className = 'inicial';
    inicial.setAttribute('aria-hidden', 'true');
    inicial.textContent = img.dataset.marcador || '?';
    img.replaceWith(inicial);
    return;
  }
  const celda = document.createElement('span');
  celda.className = 'cat3d-celda-vacia';
  celda.setAttribute('aria-hidden', 'true');
  img.replaceWith(celda);
}

function cat3dFotoHtml(fotos, marcador, alternas) {
  if (!fotos.length) return `<span class="inicial" aria-hidden="true">${marcador}</span>`;
  // Los repuestos solo tienen sentido con UNA foto en la tarjeta (modo actual):
  // en el mosaico de 4 la celda que falla se vacía y las otras 3 sostienen la
  // tarjeta, así que ahí este atributo no se emite y el comportamiento es el de antes.
  const repuesto = fotos.length === 1
    ? [...new Set(alternas || [])].filter((f) => f !== fotos[0]).slice(0, CAT3D_MAX_INTENTOS - 1)
    : [];
  const attr = repuesto.length ? ` data-repuesto="${escapeHtml(repuesto.join(' '))}"` : '';
  return fotos.map((f) => `<img src="${f}" alt="" loading="lazy" data-marcador="${marcador}"${attr} onerror="cat3dImgFallback(this)">`).join('');
}

function renderCategorias3D() {
  const cont = document.getElementById('categorias-3d');
  if (!cont) return;
  // Las cifras tienen que describir lo que el cliente VA A VER: si el chip 🛵 está
  // puesto, contar sobre el catálogo entero hace que una categoría prometa 8 y la
  // parrilla enseñe 2 (fallo real, 2026-10-14, «Ropa Interior»). Con el filtro puesto,
  // una categoría que se queda sin productos desaparece de la tira: es lo mismo que hace
  // `cats` cuando una categoría está vacía, y evita que se pueda entrar a una nada.
  const items = window.Orden.filtrar(CAT.items || [], soloEnvioGratis);
  const cats = (CAT.categorias || []).filter((c) => items.some((p) => p.cat === c.n));
  const nOfertas = items.filter((p) => p.enOferta).length;
  const totalTarjetas = (nOfertas === 0 ? 0 : 1) + cats.length;

  // El nombre va DEBAJO del círculo, fuera de la caja (2026-08-15, pedido
  // del dueño): .cat3d-info ya NO vive dentro de .cat3d-inner, es hermano —
  // así el círculo (foto) y el texto (nombre + contador) se apilan con el
  // flex column de .cat3d, sin quedar "dentro de un recuadro".
  const tarjetaOferta = nOfertas === 0 ? '' : (() => {
    const activo = filtroOferta;
    return `<button class="cat3d ${activo ? 'on' : ''}" type="button" data-oferta="1" aria-pressed="${activo}">` +
      `<span class="cat3d-inner">` +
      `<span class="cat3d-foto">${cat3dFotoHtml(fotosOferta().slice(0, 1), '🏷️', mosaicoFuente(itemsEnOferta()))}</span>` +
      `<span class="cat3d-emoji" aria-hidden="true">🏷️</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre">Ofertas</span>` +
      `<span class="cat3d-n">${nOfertas} producto${nOfertas === 1 ? '' : 's'}</span>` +
      `</span></button>`;
  })();

  const tarjetasCat = cats.map((c) => {
    const n = items.filter((p) => p.cat === c.n).length;
    const activo = !filtroOferta && filtroCat === c.n;
    const marcador = escapeHtml(c.e || c.n.charAt(0).toUpperCase());
    return `<button class="cat3d ${activo ? 'on' : ''}" type="button" data-cat="${escapeHtml(c.n)}" aria-pressed="${activo}">` +
      `<span class="cat3d-inner">` +
      `<span class="cat3d-foto">${cat3dFotoHtml(categoriaFotos(c.n).slice(0, 1), marcador, mosaicoFuente(itemsDeCategoria(c.n)))}</span>` +
      `${c.e ? `<span class="cat3d-emoji" aria-hidden="true">${escapeHtml(c.e)}</span>` : ''}` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre">${escapeHtml(c.n)}</span>` +
      `<span class="cat3d-n">${n} producto${n === 1 ? '' : 's'}</span>` +
      `</span></button>`;
  }).join('');

  cont.innerHTML = tarjetaOferta + tarjetasCat;

  // "Ver todas (N)" — visible en todos los anchos (2026-08-16). En
  // escritorio oculta las tarjetas 13+ (regla dentro de @media
  // min-width:760px); en móvil las 21 ya estaban todas en la tira, así que
  // aquí solo cambia la presentación (tira ↔ rejilla, ver estilos.css
  // @media max-width:759px). El estado (catsExpandidas) es de módulo:
  // sobrevive a que setCat()/setOferta() vuelvan a llamar
  // renderCategorias3D() al filtrar.
  cont.classList.toggle('plegada', !catsExpandidas);
  const boton = document.getElementById('btn-cats-ver-todas');
  if (boton) {
    boton.hidden = totalTarjetas <= CATS_VISIBLES_PLEGADO;
    boton.setAttribute('aria-expanded', String(catsExpandidas));
    boton.textContent = catsExpandidas ? 'Ver menos' : `Ver todas (${totalTarjetas})`;
  }
}

function toggleCatsExpandidas() {
  catsExpandidas = !catsExpandidas;
  renderCategorias3D();
}

// ── Parrilla ──

// ── Variantes (2026-09-07) ──
// Un producto puede tener uno o dos ejes (Talla, Color…). El catálogo trae
// `variantes: {ejes:['Talla','Color'], opciones:['M / ROJO','L / ROJO']}` — solo las
// combinaciones DISPONIBLES, nunca las cantidades.
// El carrito se indexa por `id` para los productos sin variantes (compatible con lo
// que ya haya guardado el navegador) y por `id|CLAVE` para los que las llevan.
const SEP_VAR = ' / ';
function variantesDe(p) {
  const v = p && p.variantes;
  return (v && Array.isArray(v.opciones) && v.opciones.length) ? v : null;
}
function productoDe(id) { return (CAT.items || []).find((x) => x.id === id) || null; }
function claveCarrito(id, clave) { return clave ? id + '|' + clave : id; }
function idDeClave(k) { return String(k).split('|')[0]; }

// Unidades de ESTE producto en el carrito, sumando todas sus combinaciones. Es lo que
// se enseña en la tarjeta de la parrilla, donde no hay una combinación que enseñar.
function qtyEnCarrito(id) {
  return Object.entries(carrito).reduce((s, [k, q]) => (k === id || k.startsWith(id + '|')) ? s + q : s, 0);
}

// Tope de existencias (2026-10-07). El catálogo solo publica lo que queda BAJO: un producto
// sin `max` está bien surtido y no tiene límite aquí. Con variantes el tope va por
// combinación en `maxOpciones` (misma clave que `variantes.opciones`), NO en `variantes`.
// Devuelve null = sin límite. El servidor sigue siendo quien manda al recibir el pedido.
function topeDe(id, clave) {
  const p = productoDe(id);
  if (!p) return null;
  const t = variantesDe(p) ? (clave && p.maxOpciones ? p.maxOpciones[clave] : undefined) : p.max;
  return (typeof t === 'number' && isFinite(t) && t > 0) ? Math.floor(t) : null;
}

// Todos los valores que existen en el eje i (con existencias, porque el catálogo solo
// publica lo disponible).
function valoresDeEje(v, i) {
  const out = [];
  for (const clave of v.opciones) {
    const val = clave.split(SEP_VAR)[i];
    if (val && !out.includes(val)) out.push(val);
  }
  return out;
}

// ¿Ese valor del eje i sigue siendo posible con lo ya elegido en los OTROS ejes? Es lo
// que hace que, al elegir la talla M, se apaguen los colores que no vienen en M.
function valorPosible(v, i, val, seleccion) {
  return v.opciones.some((clave) => {
    const partes = clave.split(SEP_VAR);
    if (partes[i] !== val) return false;
    return partes.every((p, j) => j === i || !seleccion[j] || seleccion[j] === p);
  });
}

// La combinación elegida, solo si están todos los ejes y esa combinación existe.
function claveElegida(v, seleccion) {
  if (!v) return null;
  if (seleccion.length !== v.ejes.length || seleccion.some((x) => !x)) return null;
  const k = seleccion.join(SEP_VAR);
  return v.opciones.includes(k) ? k : null;
}

// Sin la combinación completa, un producto con variantes NO se puede añadir: el botón
// manda al detalle, que es donde hay sitio para los selectores y la foto grande.
function accionHtml(id, clave) {
  if (cerrada()) return '';          // tienda cerrada: la tarjeta informa, no vende
  const p = productoDe(id);
  // Pedido y esperando confirmación: se ve, pero no se vende (decisión de Ruth,
  // 2026-10-20). Mismo criterio que `cerrada()` arriba: la tarjeta informa, no vende.
  if (Espera.enEspera(p, clave || null)) {
    return `<button class="btn add" type="button" disabled>${Espera.AVISO_BOTON}</button>`;
  }
  const v = variantesDe(p);
  if (v && !clave) {
    const q = qtyEnCarrito(id);
    const que = v.ejes.join(' y ').toLowerCase();
    return `<button class="btn btn-primario add" data-detalle="${id}">${q ? `Añadir otra (${q})` : `Elegir ${que}`}</button>`;
  }
  const k = claveCarrito(id, clave);
  const q = carrito[k] || 0;
  if (q === 0) return `<button class="btn btn-primario add" data-add="${k}">Añadir</button>`;
  const tope = topeDe(id, clave);
  const alTope = tope !== null && q >= tope;
  return `<div class="qty">` +
    `<button data-minus="${k}" aria-label="Quitar una unidad">−</button>` +
    `<strong aria-hidden="true">${q}</strong><span class="sr-only">${q} en el pedido</span>` +
    `<button data-plus="${k}" aria-label="Añadir una unidad"${alTope ? ' disabled' : ''}>+</button>` +
    `</div>` +
    (alTope ? `<p class="tope-aviso" role="status">Es todo lo que queda</p>` : '');
}

// Precio: cada producto manda su moneda (2026-08-16, contrato tienda.ter.1 de
// catalogo.json: p.moneda = 'usd'|'cup', derivado de fixedCurrency en Stock+).
// moneda:'usd' ⇒ el USD es la fuente de verdad (precio grande) y el CUP es
// una conversión que cambia con la tasa (chico, debajo); moneda:'cup' (o
// ausente, comportamiento de siempre) ⇒ al revés. El tachado de las ofertas
// sigue la misma moneda que el precio efectivo. Una sola función pinta la
// tarjeta y el detalle: nunca se duplica esta lógica en dos sitios.
// `conDescuento` solo lo pide la ficha: en la parrilla el porcentaje ya lo grita el sello
// de la foto, y repetirlo al lado del precio seria decir dos veces lo mismo en 165 px.
function precioHtml(p, conDescuento) {
  const usd = `$${p.precioUSD}`;
  const cup = `${fmt(p.precioCUP)} CUP`;
  const esUsd = p.moneda === 'usd';
  const principal = esUsd ? usd : cup;
  const secundario = esUsd ? cup : usd;
  // 🔴 El tachado solo cuando el «antes» es MAYOR. Hay un producto en el catalogo cuya
  // «oferta» sube el precio (595 -> 612 CUP): tacharle un 595 encima de un 612 es
  // mentir. Lo decide descuento.js; el dato lo arregla Ruth en Stock+.
  const tachado = window.Descuento.hayRebaja(p)
    ? `<span class="tachado">${esUsd ? `$${p.precioNormalUSD}` : `${fmt(p.precioNormalCUP)} CUP`}</span>`
    : '';
  const pct = conDescuento ? window.Descuento.porciento(p) : null;
  const chip = pct !== null ? `<span class="precio-desc">Ahorras ${pct}%</span>` : '';
  return tachado + `<span class="precio">${principal}<span class="usd">· ${secundario}</span></span>` + chip;
}

// Cuántas quedan, solo cuando de verdad quedan pocas.
//
// 🔴 Hasta 3 y no más: Stock+ publica `max` siempre que queden menos de 10, y hoy eso son
// 152 productos de 240 (46 con 1, 24 con 2, 22 con 3, y el resto hasta 9). «Quedan 9» no es
// urgencia, es ruido, y un aviso que sale en medio catálogo enseña al cliente a no mirarlo.
//
// 🔴 Los productos con variantes se quedan fuera: publican `maxOpciones` (cuánto queda de
// cada combinación) y sumarlas sería mentir — «Quedan 3» cuando es 1 roja y 2 azules engaña
// a quien quiere la roja.
const QUEDAN_AVISO_MAX = 3;

function avisoQuedanHtml(p) {
  // La marca de pedido manda sobre el «Queda 1»: decir las dos cosas a la vez sería
  // contradictorio («queda 1» invita a comprar lo que no se puede comprar).
  if (Espera.enEspera(p, null)) return `<div class="card-espera">${Espera.AVISO_CORTO}</div>`;
  if (variantesDe(p)) return '';
  const n = Number(p.max);
  if (!(n > 0) || n > QUEDAN_AVISO_MAX) return '';
  return `<div class="card-quedan">${n === 1 ? 'Queda 1' : `Quedan ${n}`}</div>`;
}

function tarjetaHtml(p) {
  const foto = fotoCard(p.photo);
  return `
    <div class="card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalle de ${escapeHtml(p.name)}">
      <div class="card-foto">
        <img src="${foto.src}" ${foto.srcset ? `srcset="${foto.srcset}" sizes="(max-width:480px) 45vw, 220px"` : ''}
             alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="imgFallback(this)">
        ${p.enOferta || p.destacado ? `<div class="card-sellos">
          ${window.Descuento.sello(p) ? `<span class="card-oferta">${window.Descuento.sello(p)}</span>` : ''}
          ${p.destacado ? `<span class="card-mv">⭐ MÁS VENDIDO</span>` : ''}
        </div>` : ''}
      </div>
      <div class="body">
        <div class="nom">${escapeHtml(p.name)}</div>
        ${p.notes ? `<div class="desc">${escapeHtml(p.notes)}</div>` : ''}
        <div class="precio-linea">${precioHtml(p)}</div>
        ${avisoQuedanHtml(p)}
        ${p.envio ? `<div class="envio-chip">${escapeHtml(p.envio.corto)}</div>` : ''}
        <div class="card-accion" id="acc-${p.id}">${accionHtml(p.id)}</div>
      </div>
    </div>`;
}

// Reclamo de gestores. Es un <button>, no una .card: la rejilla delega los
// clics con closest('.card'), así que esto no puede confundirse con un producto.
// Sin cifra de comisión a propósito (decisión del usuario): lo que se publica en
// Internet compromete, y los porcentajes se hablan con Ruth caso por caso.
function tarjetaComisionistaHtml() {
  return `<button type="button" class="cta-comi" id="cta-comi">
    <span class="cta-comi-txt">
      <span class="cta-comi-tit">Gana dinero con 3B</span>
      <span class="cta-comi-sub">Comparte los productos con tu gente y cobra tu comisión por cada venta que entre por tu enlace.</span>
    </span>
    <span class="btn cta-comi-btn">Quiero mi enlace</span>
  </button>`;
}

// Los destacados van SOLO aquí en la portada (renderGrid los excluye): si el mismo
// producto se pintara dos veces, sus dos bloques de acción compartirían el id
// `acc-<id>` y refrescarAcciones solo encontraría el primero — la cantidad de una
// de las copias dejaría de actualizarse en silencio.
function renderMasVendidos() {
  const buscando = busqueda.trim() !== '' || filtroCat !== '' || filtroOferta;
  // El chip de mensajería manda también aquí: con el filtro puesto, un carrusel de
  // productos que NO la llevan contradice lo que el cliente acaba de pedir. Si no queda
  // ninguno, la sección entera se esconde sola (lo decide `mostrar`, más abajo).
  // El ORDEN no se toca a propósito: esto es una tira curada de «más vendidos», no una
  // parrilla que el cliente esté ordenando.
  const destacados = window.Orden.filtrar((CAT.items || []).filter((p) => p.destacado), soloEnvioGratis);
  const sec = document.getElementById('mas-vendidos');
  const mostrar = !buscando && destacados.length > 0;
  sec.hidden = !mostrar;
  if (mostrar) document.getElementById('mv-tira').innerHTML = destacados.map(tarjetaHtml).join('');
  else document.getElementById('mv-tira').innerHTML = '';
}

// Pinta los controles de orden y filtro según lo que soporte el catálogo cargado. Si no
// hay ninguna opción útil, la fila entera queda oculta: mientras Stock+ no publique
// `creado` ni `envioGratis`, la tienda se ve exactamente como antes.
function renderControles() {
  const cont = document.getElementById('controles');
  const sel = document.getElementById('orden-sel');
  const chip = document.getElementById('btn-envio-gratis');
  if (!cont || !sel || !chip) return;
  const items = CAT.items || [];
  const ops = window.Orden.opcionesUtiles(items);
  sel.innerHTML = ops.map((o) => `<option value="${o.id}">${escapeHtml(o.texto)}</option>`).join('');
  sel.value = ops.some((o) => o.id === ordenSel) ? ordenSel : 'az';
  ordenSel = sel.value;   // si la opción elegida ya no existe en este catálogo, vuelve a A–Z
  const hayEnvio = window.Orden.hayEnvioGratis(items);
  chip.hidden = !hayEnvio;
  if (!hayEnvio) soloEnvioGratis = false;   // chip oculto => filtro apagado, o la parrilla quedaría vacía sin salida
  chip.setAttribute('aria-pressed', String(soloEnvioGratis));
  // Con una sola opción de orden y sin filtro no hay nada que elegir: fuera.
  cont.hidden = ops.length < 2 && !hayEnvio;
}

// Buscó algo que no está: en vez de un callejón sin salida, un botón que abre WhatsApp
// con lo que escribió. El destino es el mismo criterio que el del pedido —quien pone el
// precio, atiende—: el gestor con recargo si se entró por su página, y si no, la casa.
function pintarPregunta(termino) {
  const caja = document.getElementById('vacio-pregunta');
  if (!caja) return;
  const t = window.Faltante.limpiar(termino);
  // 🔴 "Quien pone precio, atiende" vale para la mercancia de la CASA. En la tienda
  // de un negocio asociado no cae recargo ninguno (lo apaga lib/catalogoWeb.js) y
  // precios-gestores.json no lleva sus productos: el gestor no pone ese precio, asi
  // que el pedido va al numero de la casa, donde el bot lo anota y lo reenvia al socio.
  // (El ?ref= y la linea `Vendedor:` NO se tocan: el gestor sigue cobrando su comision.)
  const destino = destinoWhatsApp();
  const url = window.Faltante.enlace(destino, t);
  if (!url) { caja.hidden = true; caja.innerHTML = ''; return; }   // vacío por el chip, no por una búsqueda
  caja.hidden = false;
  caja.innerHTML = '<a class="btn btn-primario" href="' + escapeHtml(url) +
    '" target="_blank" rel="noopener">Pregúntanos por «' + escapeHtml(t) + '»</a>' +
    '<p class="vacio-sub">Te decimos si lo tenemos o si te lo podemos conseguir.</p>';
}

function renderGrid() {
  const items = visibles();
  const buscando = busqueda.trim() !== '' || filtroCat !== '' || filtroOferta;
  // En la portada los destacados viven en el carrusel de arriba; aquí se omiten
  // para no duplicar ids. Al buscar o filtrar no hay carrusel, así que entran.
  const base = buscando ? items : items.filter((p) => !p.destacado);
  const lista = window.Orden.ordenar(window.Orden.filtrar(base, soloEnvioGratis), ordenSel);
  // El aviso de «sin resultados» se decide con la lista FINAL, ya filtrada y ordenada, y
  // el chip de mensajería cuenta como filtro: si no, al dejar la parrilla vacía solo con
  // el chip, el cliente se queda ante una pantalla en blanco sin explicación.
  document.getElementById('vacio').hidden = !(lista.length === 0 && (buscando || soloEnvioGratis));
  pintarPregunta(busqueda);
  const tarjetas = lista.map(tarjetaHtml);
  // El reclamo de gestores va DENTRO de la parrilla, ocupando una fila entera
  // (.cta-comi trae grid-column:1/-1). Antes vivía en un hueco aparte: pegado
  // encima del catálogo competía con la tarjeta de encargos, y debajo quedaba
  // detrás de 224 productos y no lo veía nadie. Al buscar o filtrar no sale.
  if (!buscando && tarjetas.length > CTA_COMI_TRAS_N) {
    tarjetas.splice(CTA_COMI_TRAS_N, 0, tarjetaComisionistaHtml());
  }
  document.getElementById('grid').innerHTML = tarjetas.join('');
  renderMasVendidos();
}

// El aviso largo de la ficha. Se repinta junto a la acción porque la combinación elegida
// puede estar pedida aunque el producto tenga otras libres.
function pintarEsperaFicha(id, clave) {
  const el = document.getElementById('espera-ficha');
  if (!el) return;
  if (Espera.enEspera(productoDe(id), clave || null)) {
    el.textContent = Espera.AVISO_LARGO;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

// El botón de preguntar de la ficha. Se repinta junto a la acción porque el texto cambia
// si la combinación elegida está pedida.
//
// 🔴 El destino sale de destinoWhatsApp(), el mismo que usan el pedido y la búsqueda sin
// resultados: quien pone el precio, atiende.
function pintarPreguntarProducto(id, clave) {
  const caja = document.getElementById('ficha-preguntar');
  if (!caja) return;
  const p = productoDe(id);
  const esperando = Espera.enEspera(p, clave || null);
  const destino = destinoWhatsApp();
  const url = window.Preguntar.enlace(destino, p, esperando);
  if (!url) { caja.hidden = true; caja.innerHTML = ''; return; }   // sin número no se enseña
  const texto = esperando ? window.Preguntar.TEXTO_BOTON_ESPERA : window.Preguntar.TEXTO_BOTON;
  caja.hidden = false;
  caja.innerHTML = '<a class="btn btn-suave btn-secundario ficha-preguntar-btn" href="' +
    escapeHtml(url) + '" target="_blank" rel="noopener">💬 ' + escapeHtml(texto) + '</a>';
}

// La confirmación de la ficha: «✓ Listo — ver mi pedido (N)». Solo sale si ESTE producto
// tiene alguna línea en el pedido (con o sin combinación elegida).
//
// 🔴 Es un <button>, no un <a>: abre el carrito, que es una capa del historial. Un enlace
// metería una entrada de más y el «atrás» dejaría de cerrar bien.
function pintarListoFicha(id) {
  const caja = document.getElementById('ficha-listo');
  if (!caja) return;
  // Tienda cerrada: la ficha informa, no vende — mismo criterio que accionHtml(), que
  // devuelve vacío, y que la barra inferior, que se esconde. Sin esto el botón sería el
  // único camino al pedido que queda abierto justo cuando el negocio está cerrado.
  if (cerrada()) { caja.hidden = true; caja.innerHTML = ''; return; }
  const hay = window.Listo.enElPedido(id, carrito);
  const txt = hay ? window.Listo.texto(unidadesEnCarrito()) : '';
  if (!txt) { caja.hidden = true; caja.innerHTML = ''; return; }
  caja.hidden = false;
  caja.innerHTML = '<button type="button" class="btn btn-primario ficha-listo-btn" ' +
    'data-ver-pedido="1">' + escapeHtml(txt) + '</button>';
}

// La frase del umbral en la ficha: «añádelo y te faltarán X para la mensajería gratis».
// Se repinta junto a la accion porque depende del carrito, y el carrito cambia sin
// cerrar la ficha (el boton «Añadir» esta justo encima de esta linea).
//
// 🔴 El umbral y el elegible salen de envioGratis() / totalCarritoElegible(), que ya
// descuentan el transporte aparte. No se recalculan aqui: si cambia la regla del
// umbral, cambia en un solo sitio.
//
// 🔴 Con la tienda cerrada no se empuja a comprar: mismo criterio que accionHtml() y
// que pintarListoFicha().
function pintarUmbralFicha(id, clave) {
  const caja = document.getElementById('ficha-umbral');
  if (!caja) return;
  const p = productoDe(id);
  const eg = envioGratis();
  const txt = cerrada() ? '' : window.Umbral.mensaje({
    activo: eg.activo,
    umbral: eg.umbral,
    elegible: totalCarritoElegible(),
    precio: p && p.precioCUP,
    aparte: esAparte(p),
    espera: Espera.enEspera(p, clave || null)
  });
  caja.hidden = !txt;
  caja.textContent = txt;
}

function refrescarAcciones(id) {
  const el = document.getElementById('acc-' + id);
  if (el) el.innerHTML = accionHtml(id);
  if (productoModal === id) {
    const v = variantesDe(productoDe(id));
    const m = document.getElementById('modal-accion');
    const claveActual = claveElegida(v, seleccionVar);
    if (m) m.innerHTML = accionHtml(id, claveActual);
    pintarEsperaFicha(id, claveActual);
    pintarPreguntarProducto(id, claveActual);
    pintarListoFicha(id);
    pintarUmbralFicha(id, claveActual);
    pintarChipsVariante(id);
  }
}

// Una fila de chips POR EJE. Los valores que no existen con lo ya elegido en el otro
// eje salen deshabilitados: así el cliente ve que ese color no viene en esa talla, en
// vez de poder elegirlo y llevarse un chasco.
function pintarChipsVariante(id) {
  const wrap = document.getElementById('modal-tallas');
  if (!wrap) return;
  const v = variantesDe(productoDe(id));
  if (!v) { wrap.hidden = true; wrap.innerHTML = ''; return; }
  wrap.hidden = false;
  wrap.innerHTML = v.ejes.map((eje, i) => {
    const chips = valoresDeEje(v, i).map((val) => {
      const sel = seleccionVar[i] === val;
      const posible = valorPosible(v, i, val, seleccionVar);
      return `<button type="button" class="chip-var" data-eje="${i}" data-val="${escapeHtml(val)}"` +
        ` aria-pressed="${sel}"${posible ? '' : ' disabled'}>${escapeHtml(val)}</button>`;
    }).join('');
    return `<div class="var-fila"><div class="var-tit">${escapeHtml(eje)}:</div>${chips}</div>`;
  }).join('');
}

// ── Detalle de producto (modal) ──

// Relacionados de la ficha abierta. Con menos de dos candidatos la seccion no se pinta
// (lo decide relacionados.js, no esta funcion).
function pintarRelacionados(p) {
  const sec = document.getElementById('modal-rel');
  const tira = document.getElementById('rel-tira');
  if (!sec || !tira) return;
  const lista = window.Relacionados.elegir(p, CAT.items || [], 6);
  if (!lista.length) { sec.hidden = true; tira.innerHTML = ''; return; }
  sec.hidden = false;
  tira.innerHTML = lista.map((x) =>
    `<button type="button" class="rel-card" data-rel="${x.id}">` +
    `<span class="rel-foto"><img src="${fotoMosaico(x.photo)}" alt="" loading="lazy"></span>` +
    `<span class="rel-nom">${escapeHtml(x.name)}</span>` +
    `<span class="rel-precio">${window.Relacionados.precioTexto(x)}</span>` +
    `</button>`).join('');
}

// Galería de la ficha: las fotos del producto abierto y cuál se está viendo.
let galeriaFotos = [];
let galeriaIndice = 0;

// Pinta la tira y pone la foto `i` en grande. Con una sola foto la tira queda oculta:
// un carrusel de un elemento es ruido.
function pintarGaleria(i) {
  galeriaIndice = i;
  const img = document.getElementById('modal-img');
  const tira = document.getElementById('modal-miniaturas');
  limpiarFallback(img);   // por si la foto anterior falló: si no, su inicial tapa esta
  img.src = fotoDetalle(galeriaFotos[i]);
  if (galeriaFotos.length < 2) { tira.hidden = true; tira.innerHTML = ''; return; }
  tira.hidden = false;
  tira.innerHTML = galeriaFotos.map((u, n) =>
    `<button type="button" class="modal-miniatura" data-foto="${n}" aria-current="${n === i}" aria-label="Ver foto ${n + 1}">` +
    `<img src="${fotoMosaico(u)}" alt="" loading="lazy"></button>`).join('');
}

// Deslizar sobre la foto grande para pasar a la siguiente. Eventos de PUNTERO: el mismo
// codigo sirve para el dedo y para el raton.
//
// 🔴 Aqui NO se llama a preventDefault() ni se toca touch-action, a proposito: el
// navegador sigue mandando sobre el desplazamiento vertical de la pagina. Si decide que
// el gesto es un scroll suyo, emite 'pointercancel' y nosotros abandonamos. Esa es la
// señal, y por eso el cliente puede seguir bajando por la ficha con el dedo encima de la
// foto. Quien cambie esto por touchstart/touchmove con preventDefault, lo romperá.
let gestoX = null;
let gestoY = null;

function engancharGestoGaleria() {
  const caja = document.querySelector('.modal-foto');
  if (!caja) return;
  caja.addEventListener('pointerdown', (e) => {
    if (galeriaFotos.length < 2) return;
    gestoX = e.clientX;
    gestoY = e.clientY;
  });
  caja.addEventListener('pointercancel', () => { gestoX = null; gestoY = null; });
  caja.addEventListener('pointerup', (e) => {
    if (gestoX === null) return;
    const paso = window.Galeria.pasoDelGesto(e.clientX - gestoX, e.clientY - gestoY);
    gestoX = null;
    gestoY = null;
    if (!paso) return;
    pintarGaleria(window.Galeria.indiceSiguiente(galeriaIndice, galeriaFotos.length, paso));
  });
}

// ── Historial: el boton "atras" cierra lo que esta abierto ──
// Cada capa abierta (ficha, carrito) es una entrada del historial. Abrir hace
// pushState; cerrar hace history.back() y es el popstate quien cierra de verdad.
// 🔴 Nunca ocultes una capa a mano fuera de sincronizarCapas: dejarias una entrada
// del historial sin nada que cerrar y el siguiente "atras" sacaria al cliente.
let capasAbiertas = [];

function sincronizarCapas(destino) {
  const plan = window.Historial.transicion(capasAbiertas, destino);
  plan.cerrar.forEach((k) => {
    if (k === 'carrito') ocultarCarrito(); else ocultarDetalle();
  });
  plan.abrir.forEach((c) => {
    if (c.tipo === 'carrito') mostrarCarrito(); else mostrarDetalle(c.id);
  });
  capasAbiertas = (destino || []).filter(Boolean);
  // La ficha es UN solo modal: cerrar la de arriba lo oculta entero, aunque debajo
  // quede otra ficha (pasa al volver atras desde "Mas de esta categoria"). Si en el
  // destino queda una ficha y el modal esta oculto, se repinta la que toca.
  const fichaViva = capasAbiertas.filter((c) => c.tipo === 'ficha').pop();
  if (fichaViva && document.getElementById('modal-detalle').hidden) mostrarDetalle(fichaViva.id);
}

function abrirCapa(capa) {
  const destino = capasAbiertas.concat([capa]);
  history.pushState({ capas: destino }, '', window.Historial.rutaDe(destino, location.search, RAIZ));
  sincronizarCapas(destino);
}

// Cierra la capa `tipo` SOLO si es la de arriba. Si no lo es (o el historial se
// perdio: una restauracion de pestaña, otro script que pisara el state...), se oculta
// a mano sin tocar el historial, que es preferible a arrastrarse otra capa por
// delante con un back() a ciegas.
function pedirCierreCapa(tipo) {
  const st = history.state;
  const capas = (st && Array.isArray(st.capas)) ? st.capas : [];
  const arriba = capas[capas.length - 1];
  if (arriba && arriba.tipo === tipo) { history.back(); return; }
  if (tipo === 'carrito') ocultarCarrito(); else ocultarDetalle();
  capasAbiertas = capasAbiertas.filter((c) => c.tipo !== tipo);
}

// El cliente dio "atras" (o "adelante"): el navegador ya cambio la URL; aqui solo
// se pone la pantalla de acuerdo con el punto del historial al que ha llegado.
function alCambiarHistorial(e) {
  const st = e.state;
  sincronizarCapas((st && Array.isArray(st.capas)) ? st.capas : []);
}

// Punto de partida: la entrada actual es "nada abierto". Si se entro por /p/CODIGO
// la URL vuelve a la raiz AQUI y la ficha se apila encima (Step 5), para que el
// primer "atras" lleve al catalogo y no fuera de la tienda.
function prepararHistorial() {
  const esFicha = /^\/p\//.test(location.pathname);
  const base = esFicha ? RAIZ + location.search : location.pathname + location.search;
  history.replaceState({ capas: [] }, '', base);
}

function abrirDetalle(id) {
  const p = (CAT.items || []).find((x) => x.id === id);
  if (!p) return;
  abrirCapa({ tipo: 'ficha', id: id, codigo: p.codigo });
}

// Pinta la ficha. NO toca el historial: la llama sincronizarCapas.
function mostrarDetalle(id) {
  const p = (CAT.items || []).find((x) => x.id === id);
  if (!p) return;
  productoModal = id;
  document.getElementById('modal-img').alt = p.name;
  document.getElementById('modal-img').setAttribute('onerror', 'imgFallback(this)');
  galeriaFotos = window.Galeria.fotosDe(p);
  pintarGaleria(0);
  document.getElementById('modal-cat').textContent = p.cat || '';
  document.getElementById('modal-nombre').textContent = p.name;
  document.getElementById('modal-desc').textContent = p.notes || '';
  document.getElementById('modal-precio').innerHTML = precioHtml(p, true) +
    (p.envio ? `<div class="envio-detalle">${escapeHtml(p.envio.largo)}</div>` : '');
  seleccionVar = [];
  pintarChipsVariante(id);
  document.getElementById('modal-accion').innerHTML = accionHtml(id, null);
  pintarEsperaFicha(id, null);
  pintarPreguntarProducto(id, null);
  pintarListoFicha(id);
  pintarUmbralFicha(id, null);
  pintarRelacionados(p);
  const avisoComp = document.getElementById('compartir-aviso');
  if (avisoComp) avisoComp.textContent = '';   // no arrastrar el «copiado» del producto anterior

  elementoAnteriorFoco = document.activeElement;
  const modal = document.getElementById('modal-detalle');
  modal.hidden = false;
  document.getElementById('modal-cerrar').focus();
  document.addEventListener('keydown', capturarTecladoModal);
}

function cerrarDetalle() { pedirCierreCapa('ficha'); }

// Oculta la ficha. NO toca el historial: la llama sincronizarCapas.
function ocultarDetalle() {
  document.getElementById('modal-detalle').hidden = true;
  productoModal = null;
  const secRel = document.getElementById('modal-rel');
  if (secRel) { secRel.hidden = true; document.getElementById('rel-tira').innerHTML = ''; }
  seleccionVar = [];
  galeriaFotos = [];
  galeriaIndice = 0;
  const tira = document.getElementById('modal-miniaturas');
  if (tira) { tira.hidden = true; tira.innerHTML = ''; }
  const img = document.getElementById('modal-img');
  // Un src="" hace que el navegador re-pida la página entera como si fuera la imagen.
  // Sin el atributo, no hay petición: la foto vuelve a ponerse solo al abrir el detalle.
  if (img) img.removeAttribute('src');
  document.removeEventListener('keydown', capturarTecladoModal);
  if (elementoAnteriorFoco && elementoAnteriorFoco.isConnected) elementoAnteriorFoco.focus();
}

// Entrada por un enlace compartido: /p/<codigo>. El codigo es el corto del catalogo,
// no el id largo: es el que se comparte y el que entiende api/producto.js.
// Dos segmentos a proposito: codigoDeLaUrl() toma un solo segmento como codigo de
// gestor (/MARIA), asi que /p/XXXX no puede confundirse con un vendedor.
// 🔴 Se lee ANTES de prepararHistorial(), que deja la URL en la raiz.
function codigoDeFichaDeLaUrl() {
  const m = location.pathname.match(/^\/p\/([A-Za-z0-9]{1,8})\/?$/);
  return m ? m[1].toUpperCase() : '';
}

function abrirFichaPorCodigo(cod) {
  const p = (CAT.items || []).find((x) => String(x.codigo).toUpperCase() === cod);
  if (p) { abrirDetalle(p.id); return; }
  mostrarAvisoTexto('Ese producto ya no está disponible. Mira el resto del catálogo.');
}

// ── Compartir un producto ──
// OJO, duplicacion consciente: api/_og.js tiene su propio precioTexto() para la
// tarjeta de Facebook. Son dos entornos (navegador aqui, Node alli) y no hay forma
// de compartir codigo sin montar un empaquetador. Si cambias el formato aqui,
// cambialo alli tambien.
function precioTexto(p) {
  const usd = '$' + p.precioUSD + ' USD';
  const cup = fmt(p.precioCUP) + ' CUP';
  const esUsd = p.moneda === 'usd';
  const base = (esUsd ? usd : cup) + ' · ' + (esUsd ? cup : usd);
  if (!p.enOferta) return base;
  const antes = esUsd ? '$' + p.precioNormalUSD : fmt(p.precioNormalCUP) + ' CUP';
  return 'Oferta ' + base + ' (antes ' + antes + ')';
}

// location.origin y no el dominio fijo: asi funciona igual en los despliegues de
// prueba de Vercel. El ?ref= viaja solo si el gestor es uno de verdad del catalogo.
function urlProducto(p) {
  const v = resolverVendedor();
  return location.origin + '/p/' + String(p.codigo).toUpperCase() +
         (v ? '?ref=' + encodeURIComponent(v.code) : '');
}

function textoCompartir(p, url) {
  const lineas = ['*' + p.name + '*', precioTexto(p)];
  if (p.envio && p.envio.corto) lineas.push(p.envio.corto);
  const desc = String(p.notes || '').trim();
  if (desc) lineas.push('', desc);
  // El enlace del PRODUCTO va antes que el del grupo a proposito: WhatsApp pinta la
  // vista previa del PRIMER enlace del mensaje, y la que queremos es la del producto.
  lineas.push('', '👉 Míralo aquí: ' + url);
  const grupo = String((CAT.tienda || {}).grupoWA || '').trim();
  if (grupo) lineas.push('', '👥 Únete a nuestro grupo de ofertas: ' + grupo);
  return lineas.join('\n');
}

let temporizadorAvisoCompartir = null;
function avisoCompartir(texto) {
  const el = document.getElementById('compartir-aviso');
  if (!el) return;
  el.textContent = texto;
  clearTimeout(temporizadorAvisoCompartir);
  temporizadorAvisoCompartir = setTimeout(() => { el.textContent = ''; }, 3000);
}

function copiarAlPortapapeles(texto) {
  try {
    if (!navigator.clipboard) return Promise.resolve(false);
    return navigator.clipboard.writeText(texto).then(() => true, () => false);
  } catch (e) { return Promise.resolve(false); }
}

function compartirWhatsApp() {
  const p = productoDe(productoModal);
  if (!p) return;
  const url = urlProducto(p);
  // wa.me SIN numero: WhatsApp pregunta a quien, y el gestor elige chat, grupo o estado.
  window.open('https://wa.me/?text=' + encodeURIComponent(textoCompartir(p, url)), '_blank', 'noopener');
}

function compartirFacebook() {
  const p = productoDe(productoModal);
  if (!p) return;
  const url = urlProducto(p);
  // El orden importa y no es casual:
  // 1) la copia se LANZA ya, mientras el documento sigue enfocado (si se hiciera
  //    despues de abrir la ventana, el portapapeles falla por falta de foco);
  // 2) la ventana se abre SIN await delante — un await aqui la convierte en
  //    emergente bloqueada (mismo motivo que el comentario de revalidarCierre);
  // 3) el aviso se pinta cuando la promesa termine.
  // Facebook no deja rellenar el texto de la publicacion desde fuera (quito el
  // parametro quote), por eso se copia para que el gestor solo pegue.
  const copia = copiarAlPortapapeles(textoCompartir(p, url));
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
  copia.then((ok) => avisoCompartir(ok
    ? 'Texto copiado — pégalo en tu publicación'
    : 'No se pudo copiar: escribe tu texto en Facebook'));
}

function compartirEnlace() {
  const p = productoDe(productoModal);
  if (!p) return;
  copiarAlPortapapeles(urlProducto(p))
    .then((ok) => avisoCompartir(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'));
}

// Foto para el estado de WhatsApp o una historia de Instagram. Instagram no deja
// publicar desde una web: lo que si hay es la hoja de compartir del sistema con la
// imagen dentro. El orden importa (mismo motivo que compartirFacebook): la copia del
// texto se lanza ANTES de cualquier await, o el portapapeles falla por falta de foco.
async function compartirFoto() {
  const p = productoDe(productoModal);
  if (!p) return;
  const boton = document.getElementById('compartir-foto');
  // Solo se LANZA aqui; su resultado (true/false) se espera al final para no mentir en el aviso.
  const copia = copiarAlPortapapeles(textoCompartir(p, urlProducto(p)));
  if (boton) boton.disabled = true;
  avisoCompartir('Preparando la foto…');
  try {
    // El enlace del pie lleva el codigo del gestor: en el estado y en las historias no se
    // pincha, asi que lo que se lee en la foto es lo que le apunta la venta.
    const v = resolverVendedor();
    const tarjeta = await Tarjeta.dibujar(p, { codigoGestor: v ? v.code : '' });
    const archivo = new File([tarjeta.blob], tarjeta.nombreArchivo, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo] });
        avisoCompartir(await copia
          ? 'Foto lista — el texto ya está copiado, pégalo en el pie'
          : 'Foto lista — no se pudo copiar el texto; escríbelo tú');
      } catch (e) {
        // AbortError = el gestor cerro la hoja de compartir: no es un fallo.
        if (!e || e.name !== 'AbortError') throw e;
      }
    } else {
      // Escritorio y navegadores viejos: se descarga. data: esta en la CSP; blob: no.
      const a = document.createElement('a');
      a.href = tarjeta.dataUrl || URL.createObjectURL(tarjeta.blob);
      a.download = tarjeta.nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      avisoCompartir(await copia
        ? 'Foto guardada — súbela a tu estado y pega el texto'
        : 'Foto guardada — súbela a tu estado; no se pudo copiar el texto');
    }
  } catch (e) {
    avisoCompartir('No se pudo preparar la foto; comparte el enlace');
  } finally {
    if (boton) boton.disabled = false;
  }
}

function capturarTecladoModal(e) {
  const modal = document.getElementById('modal-detalle');
  if (modal.hidden) return;
  if (e.key === 'Escape') { cerrarDetalle(); return; }
  if (e.key === 'Tab') atraparFoco(e, modal);
}

// Recuadro del gestor. Mismo patrón que abrirDetalle/cerrarDetalle:
// guarda el foco anterior, lo devuelve al cerrar y atrapa el Tab dentro.
function abrirComisionista() {
  const wa = document.getElementById('comi-wa');
  if (CAT.whatsapp) {
    wa.href = `https://api.whatsapp.com/send?phone=${CAT.whatsapp}&text=${encodeURIComponent('QUIERO SER GESTOR')}`;
    wa.hidden = false;
  } else {
    // Sin número configurado el enlace iría a wa.me/ vacío: mejor no enseñarlo.
    wa.hidden = true;
  }
  elementoAnteriorFoco = document.activeElement;
  const modal = document.getElementById('modal-comi');
  modal.hidden = false;
  document.getElementById('comi-cerrar').focus();
  document.addEventListener('keydown', capturarTecladoComi);
}

function cerrarComisionista() {
  document.getElementById('modal-comi').hidden = true;
  document.removeEventListener('keydown', capturarTecladoComi);
  if (elementoAnteriorFoco && elementoAnteriorFoco.isConnected) elementoAnteriorFoco.focus();
}

function capturarTecladoComi(e) {
  const modal = document.getElementById('modal-comi');
  if (modal.hidden) return;
  if (e.key === 'Escape') { cerrarComisionista(); return; }
  if (e.key === 'Tab') atraparFoco(e, modal);
}

function atraparFoco(e, contenedor) {
  const enfocables = contenedor.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  if (!enfocables.length) return;
  const primero = enfocables[0];
  const ultimo = enfocables[enfocables.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

// ── Carrito ──
// { id: cantidad }. Vive en localStorage para que un refresco no borre el pedido.
let carrito = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '{}');

// Unidades totales del pedido. Es lo que enseña el contador 🛒 de la cabecera y lo que
// repite el botón «Listo» de la ficha: tienen que decir lo MISMO o se contradicen.
function unidadesEnCarrito() {
  return Object.values(carrito).reduce((s, q) => s + q, 0);
}

function guardarCarrito() {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  const n = unidadesEnCarrito();
  document.getElementById('carrito-count').textContent = n;
  actualizarBarraMovil();
}

// Reciben la CLAVE del carrito (`id` o `id|TALLA`), no el id: quien pulsa el botón ya
// sabe de qué talla habla, y así no hay que adivinarlo aquí.
function addCarrito(clave) {
  if (cerrada()) return;             // guarda defensiva: cubre parrilla, modal y teclado
  const id = idDeClave(clave);
  const tope = topeDe(id, String(clave).split('|')[1] || null);
  if (tope !== null && (carrito[clave] || 0) >= tope) { refrescarAcciones(id); return; }   // el + ya sale apagado: esto es la red
  carrito[clave] = (carrito[clave] || 0) + 1;
  guardarCarrito(); refrescarAcciones(idDeClave(clave)); renderCarrito();
}

// Quita la línea ENTERA, no una unidad: es lo que espera quien pulsa la ✕. Antes la única
// forma de sacar un producto era salir del carrito, encontrarlo en la parrilla y bajarle
// la cantidad, o vaciar el pedido entero.
function quitarLineaCarrito(clave) {
  delete carrito[clave];
  guardarCarrito(); refrescarAcciones(idDeClave(clave)); renderCarrito();
}

function quitarCarrito(clave) {
  carrito[clave] = (carrito[clave] || 0) - 1;
  if (carrito[clave] <= 0) delete carrito[clave];
  guardarCarrito(); refrescarAcciones(idDeClave(clave)); renderCarrito();
}

// El carrito guardado en localStorage puede traer cantidades de antes (5 en el carrito y
// ahora quedan 2). Al cargar el catálogo se recorta cada línea a su tope SIN vaciar el
// carrito, y se avisa una vez: el carrito recortado ya queda guardado, así que al
// recargar no hay nada más que avisar.
function ajustarCarritoATopes() {
  const recortes = [];
  for (const k of Object.keys(carrito)) {
    const comb = String(k).split('|')[1] || null;
    const p = productoDe(idDeClave(k));
    const tope = topeDe(idDeClave(k), comb);
    if (!p || tope === null || !(carrito[k] > tope)) continue;
    carrito[k] = tope;
    recortes.push({ nombre: p.name, comb, tope });
  }
  if (recortes.length) mostrarAvisoAjuste(recortes);
}

// La franja descartable de arriba. La usan dos cosas: el carrito recortado y un
// enlace a un producto que ya no esta.
function mostrarAvisoTexto(texto) {
  const caja = document.getElementById('aviso-ajuste');
  if (!caja) return;
  document.getElementById('aviso-ajuste-texto').textContent = texto;
  caja.hidden = false;
  medirHeader();   // vive dentro de .barra-fija: el alto de la cabecera cambia
}

function mostrarAvisoAjuste(recortes) {
  const partes = recortes.map((r) => `«${r.nombre}${r.comb ? ' · ' + r.comb : ''}» (${r.tope === 1 ? 'queda 1' : 'quedan ' + r.tope})`);
  mostrarAvisoTexto('Ajustamos tu pedido a lo que queda: ' + partes.join(', ') + '.');
}

function itemsCarrito() {
  return Object.entries(carrito)
    .map(([k, qty]) => {
      const partes = String(k).split('|');
      return { p: productoDe(partes[0]), qty, clave: partes[1] || null };
    })
    // Un producto agotado desaparece del catálogo y se cae del carrito solo. Y una
    // línea guardada de antes, sin combinación, de un producto que AHORA se vende por
    // variantes también se cae: no hay forma de adivinar qué combinación quería el cliente.
    .filter((x) => x.p && !(variantesDe(x.p) && !x.clave));
}

// 🔴 TODA la aritmética del carrito en las dos monedas vive en dinero.js (una sola fuente). Se
// suma el precioUSD de cada línea (la moneda de los precios) y el CUP se DERIVA del total por la
// tasa. Aquí no se suma precioCUP a mano en ningún sitio.
function totalesCarrito() {
  return window.Dinero.totales(itemsCarrito(), CAT && CAT.tasa);
}

// ¿Hay una tasa con la que convertir? Sin ella la tienda enseña SOLO dólares (y la
// mensajería, que es una regla en CUP): jamás un «NaN CUP» delante de una clienta.
function hayTasa() {
  return window.Dinero.aCUP(1, CAT && CAT.tasa) !== null;
}

// Total de los PRODUCTOS en CUP, derivado del USD. null sin tasa válida.
function totalCarrito() {
  return totalesCarrito().cup;
}

// Un artículo con transporte aparte no empuja al cliente hacia la mensajería gratis:
// su precio no cuenta para el umbral, porque su envío nunca va a ser gratis.
function esAparte(p) { return !!(p && p.envioAparte); }

// En CUP porque el umbral de la mensajería gratis es una regla del negocio en CUP (no se
// convierte a dólares). Sin tasa válida el umbral no se puede evaluar: 0, o sea que nunca se
// promete mensajería gratis a ciegas.
function totalCarritoElegible() {
  const cup = window.Dinero.aCUP(window.Dinero.elegibleUSD(itemsCarrito()), CAT && CAT.tasa);
  return cup === null ? 0 : cup;
}

function itemsAparte() {
  return itemsCarrito().filter(({ p }) => esAparte(p));
}

// El USD de los productos: la cifra grande del carrito (los precios están en dólares).
function totalCarritoUSD() {
  return totalesCarrito().usd;
}

function usdTxt(n) { return '$' + Number(n).toFixed(2); }

// Bloque de total, compartido por panel modal y aside (una sola fuente de verdad).
//
// Ruth vende en dólares y el cliente paga EN UNA MONEDA O EN LA OTRA, no en las dos: por eso el
// total da las dos formas con un «o» en medio.
//     Pagas: $7.40 USD + 150 CUP de mensajería
//     o:     6,440 CUP
// 🔴 La mensajería es una regla en CUP (tarifa fija, gratis desde un umbral en CUP) y va SIEMPRE
// aparte y SIEMPRE en CUP: nunca dentro del total en dólares ni convertida. Los 150 CUP se SUMAN
// TAL CUAL a la rama del «o»; no se convierten de ida y vuelta.
// 🔴 Sin tasa válida se enseña SOLO el USD (y la mensajería en CUP): jamás un «NaN CUP».
// 🔴 Sin nada rebajado en el carrito no se pinta ni una fila de rebaja. Hay test.
function totalBloqueHtml(claseTotal, claseO) {
  const m = mensajeria();
  const d = totalesCarrito();
  const cupTxt = (n) => (hayTasa() ? `${fmt(n)} CUP` : '');
  // Cada fila: el USD y, pequeño al lado, su equivalente en CUP (solo si hay tasa).
  const fila = (etiqueta, usd, cup, extra) =>
    `<div class="desglose-linea${extra ? ' ' + extra : ''}"><span>${etiqueta}</span><span>${usd}` +
    (cup ? ` <small class="desglose-cup">${cup}</small>` : '') + '</span></div>';
  const rebaja = d.usdAhorro > 0
    ? fila('Precio normal', usdTxt(d.usdNormal), cupTxt(d.cupNormal)) +
      fila('Descuento', '−' + usdTxt(d.usdAhorro), hayTasa() ? `−${fmt(d.cupAhorro)} CUP` : '', 'desglose-descuento')
    : '';
  const mas = m.monto > 0 ? `<span class="total-mas"> + ${fmt(m.monto)} CUP de mensajería</span>` : '';
  const cupTotal = totalGeneralCUP();
  const pagar =
    `<span class="${claseTotal}">Pagas: ${usdTxt(d.usd)} USD${mas}</span>` +
    (cupTotal !== null ? `<span class="${claseO}">o: ${fmt(cupTotal)} CUP</span>` : '');
  // La tasa en su propia línea, no pegada al total: en 375px «o: 6,440 CUP · 850 CUP por USD»
  // se parte feo justo donde la clienta está mirando el dinero.
  const nota = (window.TasaVista && TasaVista.carrito(CAT && CAT.tasa)) || '';
  const tasa = nota ? `<span class="total-tasa">${nota}</span>` : '';
  if (!m.activa) {
    return rebaja + notaAparteHtml() + pagar + tasa;
  }
  return (
    rebaja +
    fila('Productos', usdTxt(d.usd), cupTxt(d.cup)) +
    `<div class="desglose-linea"><span>Mensajería</span><span>${m.coordinar ? 'a coordinar' : (m.gratis ? 'GRATIS' : fmt(m.monto) + ' CUP')}</span></div>` +
    // 🔴 La nota solo cuando hay algo que cobrar. Antes salía SIEMPRE, así que un pedido con
    // envío gratis leía «Mensajería GRATIS» e inmediatamente debajo «el costo depende de la
    // zona»: se le sembraba la duda justo donde se le acababa de dar una buena noticia.
    (m.gratis || m.coordinar ? '' : `<p class="desglose-nota">El costo de mensajería depende de la zona; se confirma por WhatsApp.</p>`) +
    notaAparteHtml() +
    `<div class="total-pagas">${pagar}</div>` +
    tasa
  );
}

// Nombres reales de itemsAparte(), escapados como todo lo que viene del catálogo
// público. "debajo" de la fila Mensajería, según el plan: avisa cuál producto
// paga transporte aparte y por qué el monto de arriba es "a coordinar".
function notaAparteHtml() {
  const aparte = itemsAparte();
  if (!aparte.length) return '';
  const nombres = aparte.map(({ p }) => escapeHtml(p.name)).join(', ');
  const verbo = aparte.length > 1 ? 'pagan' : 'paga';
  return `<p class="desglose-nota">⚠️ ${nombres} ${verbo} transporte aparte: se coordina por WhatsApp.</p>`;
}

// Mensajería gratis a partir de un umbral en CUP, configurable desde el panel
// de Stock+ (CAT.tienda.envioGratisCUP / envioGratisTexto). Ausente o 0 ⇒
// activo=false y nada de esto se pinta en ningún sitio (tienda idéntica a hoy).
// «desde», no «más de»: un pedido de exactamente el umbral SÍ cuenta.
function envioGratis() {
  const t = (CAT && CAT.tienda) || {};
  const umbral = Math.max(0, Number(t.envioGratisCUP) || 0);
  const activo = umbral > 0;
  const total = totalCarritoElegible();
  const alcanzado = activo && total >= umbral;
  const falta = activo && !alcanzado ? umbral - total : 0;
  return { activo, umbral, falta, alcanzado, textoFino: (t.envioGratisTexto || '').trim() };
}

// Misma frase en aside, panel modal y barra móvil: una sola fuente de verdad.
function lineaEnvioTexto(eg) {
  if (!eg.activo) return '';
  // Con solo productos "aparte" en el carrito el elegible es 0: por mucho que sume
  // el pedido, ese producto nunca lleva mensajería gratis. No mentir con "te faltan".
  if (totalCarritoElegible() === 0) return '';
  return eg.alcanzado
    ? '🎉 Tu pedido lleva mensajería gratis'
    : `Te faltan ${fmt(eg.falta)} CUP para la mensajería gratis`;
}

// Mensajería contabilizada (2026-08-16). tienda.mensajeriaCUP = costo fijo en
// CUP; 0/ausente ⇒ inactiva y nada de esto se cobra ni se pinta (la tienda
// queda igual que antes de esta tarea). Si está activa, se cobra salvo que el
// pedido alcance el umbral que YA existe (envioGratis) — ahí es gratis.
function mensajeria() {
  const t = (CAT && CAT.tienda) || {};
  const costo = Math.max(0, Number(t.mensajeriaCUP) || 0);
  const activa = costo > 0;
  const eg = envioGratis();
  const gratis = activa && eg.activo && eg.alcanzado;
  // Con transporte aparte en el carrito no se cobra el fijo a ciegas: se coordina
  // por WhatsApp, así que no hay monto fijo que anunciar de antemano.
  if (itemsAparte().length > 0) return { activa, costo, gratis: false, monto: 0, coordinar: true };
  return { activa, costo, gratis, monto: activa && !gratis ? costo : 0, coordinar: false };
}

// Lo que se paga si se paga TODO en pesos: productos (derivados del USD) + mensajería TAL CUAL
// (0 si es gratis o inactiva; nunca convertida de ida y vuelta). null sin tasa válida.
function totalGeneralCUP() {
  const c = totalCarrito();
  return c === null ? null : c + mensajeria().monto;
}

// USD del total general: la mensajería se convierte con CAT.tasa (no tiene
// precioUSD propio, a diferencia de los productos). Con mensajería inactiva
// esto es exactamente totalCarritoUSD() — no cambia nada de lo que ya había.
function totalGeneralUSD() {
  const m = mensajeria();
  const envioUSD = m.monto > 0 && CAT.tasa ? m.monto / CAT.tasa : 0;
  return Math.round((totalCarritoUSD() + envioUSD) * 100) / 100;
}

// La garantía en positivo (tienda.garantia). Vacía o ausente ⇒ no se pinta nada, ni en la
// portada ni en la ficha: más vale un hueco que una promesa a medias.
function garantiaTexto() {
  const t = (CAT && CAT.tienda) || {};
  return (t.garantia || '').toString().trim();
}

function pintarGarantia() {
  const txt = garantiaTexto();
  for (const id of ['garantia', 'garantia-ficha']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.hidden = !txt;
    el.textContent = txt;
  }
}

// El boton de preguntar de un negocio asociado: su WhatsApp, no el de la casa.
// Se esconde si el catalogo no trae su numero. api.whatsapp.com/send, nunca wa.me.
function pintarPreguntarSocio() {
  const a = document.getElementById('preguntar-socio');
  if (!a) return;
  const tel = (CAT && CAT.tienda && CAT.tienda.whatsappSocio) || '';
  a.hidden = !tel;
  if (tel) a.href = 'https://api.whatsapp.com/send?phone=' + encodeURIComponent(tel);
}

// La pagina de un gestor con recargo se identifica como SUYA: el precio que se ve es el
// que el puso y es el quien responde por el. Solo el nombre, sin apellidos (decision de
// Ruth, 2026-10-15). Si no hay gestor con recargo, la banda no existe para el visitante.
function pintarBandaGestor() {
  const el = document.getElementById('banda-gestor');
  if (!el) return;
  // 🔴 En la tienda del socio la banda no se enseña: insinua que los precios son de esa
  // persona, y alli no lo son (no cae recargo y la tabla de gestores no lleva sus productos).
  const corto = (esCasaWeb() && gestorRecargo) ? window.PreciosGestor.nombreCorto(gestorRecargo.nombre) : '';
  if (!corto) { el.hidden = true; el.innerHTML = ''; }
  else {
    el.hidden = false;
    // 🔴 Texto NEUTRO: entre los gestores hay hombres y mujeres (Diego, Boris, Elaine...).
    // «le llega a ella» le pondria el genero equivocado a una persona real en su propia pagina.
    el.innerHTML = `🤝 Estás en la página de <b>${escapeHtml(corto)}</b> — sus precios y su atención. `
      + `Tu pedido le llega directamente.`;
  }
  const ficha = document.getElementById('banda-gestor-ficha');
  if (ficha) { ficha.hidden = el.hidden; ficha.innerHTML = el.innerHTML; }
}

// Cláusulas de entrega (tienda.politica). Vacío/ausente ⇒ no se pinta nada.
function politicaTexto() {
  const t = (CAT && CAT.tienda) || {};
  return (t.politica || '').toString().trim();
}

// El catálogo solo decide si el bloque de pago se ENCIENDE o no (tienda.pagoUrl
// vacío/ausente ⇒ apagado, sin warning: es el estado normal, no un incidente).
// El destino real SIEMPRE es PAGO_URL_FIJA, nunca lo que traiga el catálogo:
// comparamos por ORIGEN (protocolo + hostname) con new URL(...), nunca con
// includes/startsWith sobre la cadena cruda — "https://j3b.qvpay.me.evil.com"
// empieza igual que el dominio válido y debe rechazarse igual que cualquier
// dominio ajeno (ej. https://otrousuario.qvpay.me, un dominio LEGÍTIMO de
// QvaPay pero de otro usuario). Cualquier cosa que no matchee exacto (o una
// URL malformada) se rechaza y deja un console.warn con rastro.
function pagoDestinoAutorizado(candidato) {
  const c = (candidato || '').toString().trim();
  if (!c) return false;   // apagado a propósito: no es un incidente, sin warning
  try {
    const u = new URL(c);
    const fija = new URL(PAGO_URL_FIJA);
    if (u.protocol.toLowerCase() === fija.protocol.toLowerCase() &&
        u.hostname.toLowerCase() === fija.hostname.toLowerCase()) {
      return true;
    }
  } catch (e) {
    // URL malformada: cae al warning de abajo, mismo trato que un dominio no autorizado.
  }
  console.warn('Enlace de pago ignorado: destino no autorizado', c);
  return false;
}

// Pago por adelantado con QvaPay (2026-08-16). tienda.pagoUrl vacío/ausente ⇒
// apagado, comportamiento por defecto (no se pinta nada). Opción SECUNDARIA:
// el camino normal sigue siendo "Pedir por WhatsApp", que es donde se
// confirma existencia y precio final (ver .pago-link en estilos.css, nunca
// más prominente que .btn-enviar/#btn-lateral-pedir).
// 🔴 El importe SIEMPRE sale de totalGeneralUSD() (dólares), NUNCA del CUP:
// pasar el total en CUP convertiría un pedido de 34.200 CUP en una petición
// de pago de $34.200 — es el punto más importante de esta función.
// El href SIEMPRE se arma sobre PAGO_URL_FIJA (nunca sobre el texto que venga
// del catálogo, aunque haya pasado la validación) — así ningún query/path
// extra colado en tienda.pagoUrl llega a afectar el enlace real. El cliente
// tiene derecho a ver el destino antes de pulsar: el dominio se muestra en
// letra pequeña junto al texto del enlace. Misma plantilla en panel modal y
// aside — una sola fuente de verdad, como el resto del carrito.
function pagoWrapHtml() {
  const t = (CAT && CAT.tienda) || {};
  if (!pagoDestinoAutorizado(t.pagoUrl)) return '';
  const sep = PAGO_URL_FIJA.indexOf('?') !== -1 ? '&' : '?';
  const href = `${PAGO_URL_FIJA}${sep}amount=${totalGeneralUSD().toFixed(2)}`;
  return `<a class="pago-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">Pagar por adelantado (opcional) ` +
    `<span class="pago-dominio">· ${escapeHtml(PAGO_DOMINIO_FIJO)}</span></a>` +
    `<p class="pago-nota">Se cobra en dólares (USD) y no reserva el producto hasta confirmar tu pedido por WhatsApp.</p>`;
}

// Banda bajo la cabecera, sobre la portada. El texto principal lo compone la
// tienda a partir del número (nunca un texto libre que pueda contradecirlo);
// lo único editable desde el panel es la letra pequeña.
function renderPromoEnvio() {
  const el = document.getElementById('promo-envio');
  if (!el) return;
  const eg = envioGratis();
  el.hidden = !eg.activo;
  if (!eg.activo) return;
  document.getElementById('promo-envio-texto').textContent =
    `Pedidos desde ${fmt(eg.umbral)} CUP: mensajería gratis 🚚`;
  const fina = document.getElementById('promo-envio-fina');
  fina.hidden = !eg.textoFino;
  fina.textContent = eg.textoFino;
}

// Banda de campaña. El texto llega ya compuesto desde Stock+
// (CAT.tienda.campana); la tienda no calcula reglas de negocio. Ausente o null ⇒
// la banda no se pinta y la portada queda idéntica a como estaba.
function pintarCampana() {
  const el = document.getElementById('promo-campana');
  if (!el) return;
  const c = (CAT && CAT.tienda && CAT.tienda.campana) || null;
  const texto = c ? String(c.texto || '').trim() : '';
  el.hidden = !texto;
  if (!texto) return;
  const pct = Number(c.pct) || 0;
  document.getElementById('promo-campana-texto').textContent =
    pct > 0 ? `${texto} · ${pct}% de descuento 🎉` : `${texto} 🎉`;
}

// ── Tienda cerrada (2026-09-19) ──
// El estado lo decide Stock+ (CAT.tienda.cierre); la tienda solo pinta, como con la
// campaña. Cerrada: el catálogo se SIGUE viendo (escaparate) y desaparece todo lo que
// sirve para pedir. El carrito guardado no se toca: cuando abran, el cliente lo
// encuentra igual. Esto NO afecta a los encargos ni al taxi.
function cerrada() {
  return !!(CAT && CAT.tienda && CAT.tienda.cierre && CAT.tienda.cierre.activo);
}

function pintarCierre() {
  const c = (CAT && CAT.tienda && CAT.tienda.cierre) || {};
  const off = !!c.activo;
  const titulo = String(c.titulo || '').trim();
  const texto = String(c.texto || '').trim();

  const franja = document.getElementById('aviso-cierre');
  if (franja) {
    document.getElementById('aviso-cierre-titulo').textContent = titulo;
    document.getElementById('aviso-cierre-texto').textContent = texto;
    franja.hidden = !off;
  }
  const cartel = document.getElementById('hero-cierre');
  if (cartel) {
    document.getElementById('hero-cierre-titulo').textContent = titulo;
    document.getElementById('hero-cierre-texto').textContent = texto;
    cartel.hidden = !off;
  }
  const acciones = document.querySelector('.hero-acciones');
  if (acciones) acciones.hidden = off;

  document.getElementById('btn-carrito').hidden = off;
  if (off) {
    document.getElementById('barra-movil').hidden = true;
    const lateral = document.getElementById('carrito-lateral');
    if (lateral) lateral.hidden = true;
    cerrarCarrito();          // por si el cliente lo tenía abierto al llegar el cierre
  }
  medirHeader();              // la franja cambia el alto de la barra pegada
}

function lineaCarritoHtml(p, qty, clave) {
  const foto = fotoCard(p.photo);
  // `k` es la clave del CARRITO (id|combinación), que es lo que entienden addCarrito y
  // quitarCarrito. `data-minus` y `data-plus` ya los escucha la delegación global, así que
  // estos dos botones no necesitan lógica nueva: salen gratis, y con el tope de existencias
  // ya respetado por addCarrito.
  const k = claveCarrito(p.id, clave);
  const tope = topeDe(p.id, clave);
  const alTope = tope !== null && qty >= tope;
  // El USD es la cifra grande de la línea y el CUP va debajo, pequeño, como equivalente. El
  // «antes» tachado también va en USD y solo si hay rebaja de verdad; sale de la misma fuente
  // que el desglose del total, para que la resta de la pantalla cuadre.
  const ahorro = window.Dinero.ahorroUSD(p);
  const lin = window.Dinero.totales([{ p, qty }], CAT && CAT.tasa);
  // `alt` lleva el nombre para que imgFallback saque la inicial del producto y no un «?».
  return `<div class="linea">
      <img src="${foto.src}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="imgFallback(this)">
      <div class="linea-info">
        <div class="linea-nom">${escapeHtml(p.name)}${clave ? ` <span class="linea-talla">· ${escapeHtml(clave)}</span>` : ''}</div>
        <div class="qty qty-linea">
          <button type="button" data-minus="${escapeHtml(k)}" aria-label="Quitar una unidad de ${escapeHtml(p.name)}">−</button>
          <strong aria-hidden="true">${qty}</strong><span class="sr-only">${qty} en el pedido</span>
          <button type="button" data-plus="${escapeHtml(k)}" aria-label="Añadir una unidad de ${escapeHtml(p.name)}"${alTope ? ' disabled' : ''}>+</button>
        </div>
      </div>
      <div class="linea-derecha">
        <div class="linea-precios">
          ${ahorro > 0 ? `<span class="tachado linea-antes">${usdTxt(lin.usdNormal)}</span>` : ''}
          <div class="linea-sub">${usdTxt(lin.usd)}</div>
          ${hayTasa() ? `<div class="linea-cup">${fmt(p.precioCUP * qty)} CUP</div>` : ''}
        </div>
        <button type="button" class="linea-quitar" data-quitar-linea="${escapeHtml(k)}" aria-label="Quitar ${escapeHtml(p.name)} del pedido">✕</button>
      </div>
    </div>`;
}

function actualizarBarraMovil() {
  const items = itemsCarrito();
  const n = items.reduce((s, { qty }) => s + qty, 0);
  const barra = document.getElementById('barra-movil');
  if (n === 0 || cerrada()) {        // cerrada: la barra solo sirve para ir a pedir
    barra.hidden = true;
    reservarEspacioBarraMovil();
    return;
  }
  barra.hidden = false;
  const eg = envioGratis();
  const aviso = eg.activo && eg.alcanzado ? ' · 🎉 Mensajería gratis' : '';
  document.getElementById('barra-movil-info').textContent =
    `${n} producto${n === 1 ? '' : 's'} · ${usdTxt(totalCarritoUSD())} USD${aviso}`;
  reservarEspacioBarraMovil();
}

// La barra es "position:fixed": tapa lo que tenga debajo si el body no le
// reserva su alto real. Se mide de verdad (no un número fijo a ciegas) porque
// el texto "N productos · TOTAL" cambia de largo. En escritorio la barra se
// oculta por CSS (display:none) y su alto medido da 0: ahí no se reserva nada.
function reservarEspacioBarraMovil() {
  const barra = document.getElementById('barra-movil');
  const h = barra.getBoundingClientRect().height;
  if (h === 0) {
    document.body.classList.remove('con-barra-movil');
    return;
  }
  document.documentElement.style.setProperty('--barra-movil-h', (h + 16) + 'px');
  document.body.classList.add('con-barra-movil');
}

// El aside lateral (≥1024px) es "position:sticky; top:var(--header-h)": se
// mide el alto real de la cabecera (mismo patrón que reservarEspacioBarraMovil,
// nada de números mágicos a ciegas) al cargar y en cada resize.
function medirHeader() {
  // La franja del aviso viaja pegada a la cabecera dentro de .barra-fija: lo que
  // hay que medir es la pieza entera, no solo el <header>.
  const barra = document.querySelector('.barra-fija') || document.getElementById('header');
  if (!barra) return;
  const h = barra.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}

// ── La libreta de direcciones del cliente ──
// 🔴 Vive SOLO en su telefono (localStorage). La tienda no tiene servidor y estos datos
// no salen de ahi mas que en el mensaje de WhatsApp que el propio cliente envia.
// 🔴 localStorage LANZA en modo incognito y con los datos del sitio bloqueados: todo
// acceso va en try/catch y la tienda tiene que funcionar igual sin el.
const DIRS_CLAVE = 'direcciones';

function leerDirecciones() {
  try { return window.Direcciones.cargar(localStorage.getItem(DIRS_CLAVE)); } catch (e) { return []; }
}

function escribirDirecciones(lista) {
  try { localStorage.setItem(DIRS_CLAVE, JSON.stringify(lista)); } catch (e) { /* sin sitio donde guardar: se sigue igual */ }
}

function pintarDirecciones() {
  const caja = document.getElementById('dir-guardadas');
  const tira = document.getElementById('dir-guardadas-tira');
  if (!caja || !tira) return;
  const lista = leerDirecciones();
  caja.hidden = lista.length === 0;
  tira.innerHTML = lista.map((d) =>
    `<button type="button" class="dir-chip" data-dir="${escapeHtml(d.dir)}">${escapeHtml(d.etiqueta)}</button>`
  ).join('');
}

// Rellena el formulario con una ficha guardada. El horario puede ser uno de los del
// desplegable o uno escrito a mano: si no esta en la lista, se usa "Otro horario…".
function usarDireccion(dir) {
  const d = leerDirecciones().find((x) => window.Direcciones.mismaDireccion(x, { dir: dir }));
  if (!d) return;
  document.getElementById('c-nombre').value = d.nombre;
  document.getElementById('c-tel').value = d.tel;
  document.getElementById('c-dir').value = d.dir;
  const sel = document.getElementById('c-horario');
  const libre = document.getElementById('c-horario-libre');
  const opciones = [...sel.options].map((o) => o.value);
  if (d.horario && opciones.indexOf(d.horario) !== -1) {
    sel.value = d.horario;
    libre.hidden = true;
    libre.value = '';
  } else if (d.horario) {
    sel.value = '__libre';
    libre.hidden = false;
    libre.value = d.horario;
  }
  // Los avisos de campo vacio que hubiera se quedarian mintiendo.
  marcarError('c-nombre', 'err-nombre', false);
  marcarError('c-tel', 'err-tel', false);
  marcarError('c-dir', 'err-dir', false);
  marcarError('c-horario', 'err-horario', false);
}

function olvidarDirecciones() {
  if (!confirm('¿Olvidar tus datos guardados en este teléfono? Tendrás que escribirlos la próxima vez.')) return;
  try { localStorage.removeItem(DIRS_CLAVE); } catch (e) { /* nada que borrar */ }
  pintarDirecciones();
}

// Saludar a quien vuelve horas despues con el carrito puesto.
//
// 🔴 La marca se escribe SIEMPRE al cargar, se salude o no: es «la ultima vez que estuvo
// aqui». Si solo se escribiera al saludar, la segunda visita del mismo dia volveria a
// saludar.
//
// 🔴 Con la tienda cerrada no se saluda: el pedido no se puede mandar, asi que empujar
// hacia el carrito solo serviria para frustrar.
function saludarSiVuelve() {
  let marca = null;
  try { marca = localStorage.getItem(CLAVE_VISITA); } catch (e) { marca = null; }
  try { localStorage.setItem(CLAVE_VISITA, String(Date.now())); } catch (e) { /* incognito: no se saluda */ }
  const caja = document.getElementById('aviso-regreso');
  if (!caja || cerrada()) return;
  const unidades = unidadesEnCarrito();
  if (!window.Regreso.debeSaludar(marca, Date.now(), unidades)) return;
  document.getElementById('aviso-regreso-texto').textContent = window.Regreso.texto(unidades);
  caja.hidden = false;
  medirHeader();   // vive dentro de .barra-fija: el alto de la cabecera cambia
}

// El cliente volvio a la tienda despues de irse a WhatsApp. Como la tienda NO puede saber
// si llego a enviar el mensaje, se le pregunta en vez de decidir por el.
function preguntarSiEnvio() {
  const caja = document.getElementById('aviso-enviado');
  if (!caja || !caja.hidden) return;   // ya esta puesto: no se repite
  let marca = null;
  try { marca = localStorage.getItem(CLAVE_ENVIADO); } catch (e) { return; }
  if (!window.TrasPedido.debePreguntar(marca, Date.now(), Object.keys(carrito).length > 0)) {
    olvidarMarcaPedido();
    return;
  }
  caja.hidden = false;
}

function olvidarMarcaPedido() {
  try { localStorage.removeItem(CLAVE_ENVIADO); } catch (e) { /* nada */ }
}

function cerrarAvisoEnviado(vaciar) {
  const caja = document.getElementById('aviso-enviado');
  if (caja) caja.hidden = true;
  olvidarMarcaPedido();
  if (vaciar) {
    limpiarCarrito();
    cerrarCarrito();
    mostrarAvisoTexto('¡Gracias! Tu carrito quedó vacío. Te escribimos por WhatsApp.');
  }
}

// Pinta el panel modal (móvil y respaldo en escritorio) Y el aside lateral
// (solo visible ≥1024px) con las MISMAS líneas (lineaCarritoHtml) y el mismo
// total CUP — una sola fuente de verdad, nada de lógica duplicada.
// La tira de «añade uno de estos y la mensajería te sale gratis». Se pinta en el panel y en
// el aside con el MISMO html: una sola fuente de verdad, igual que lineaEnvioTexto().
//
// 🔴 El hueco sale de envioGratis(), que ya descuenta el transporte aparte. No lo
// recalcules aquí: si mañana cambia la regla del umbral, cambia en un sitio.
//
// 🔴 Los botones llevan `data-add="<id>"`, que es exactamente lo que ya escucha la
// delegación global de clics (la misma que usa accionHtml). Por eso completar.js descarta
// los productos con variantes: su clave de carrito no es el id a secas.
function completarEnvioHtml(eg) {
  if (!eg.activo || eg.alcanzado) return '';
  // Mismo criterio que lineaEnvioTexto: con solo transporte aparte en el carrito no hay
  // umbral que alcanzar, así que tampoco hay nada que ofrecer.
  if (totalCarritoElegible() === 0) return '';
  const enCarrito = itemsCarrito().map(({ p }) => p.id);
  const lista = window.Completar.candidatos(CAT.items || [], { falta: eg.falta, excluirIds: enCarrito });
  if (!lista.length) return '';
  return '<p class="completar-tit">Añade uno de estos y la mensajería te sale gratis</p>' +
    '<div class="completar-tira">' +
    lista.map((x) =>
      '<button type="button" class="rel-card completar-card" data-add="' + escapeHtml(x.id) + '">' +
      '<span class="rel-foto"><img src="' + fotoMosaico(x.photo) + '" alt="" loading="lazy"></span>' +
      '<span class="rel-nom">' + escapeHtml(x.name) + '</span>' +
      '<span class="rel-precio">' + fmt(x.precioCUP) + ' CUP</span>' +
      '</button>').join('') +
    '</div>';
}

function pintarCompletarEnvio(idCaja, html) {
  const caja = document.getElementById(idCaja);
  if (!caja) return;
  caja.hidden = !html;
  caja.innerHTML = html;
}

function renderCarrito() {
  const items = itemsCarrito();
  const hayItems = items.length > 0;
  const html = items.map(({ p, qty, clave }) => lineaCarritoHtml(p, qty, clave)).join('');
  const eg = envioGratis();
  const envioTexto = lineaEnvioTexto(eg);
  const politica = politicaTexto();
  // Con carrito vacío no tiene sentido construir el href (total sería 0):
  // se calcula solo cuando hay items, igual que el resto de bloques del total.
  const pagoHtml = hayItems && !cerrada() ? pagoWrapHtml() : '';
  const completarHtml = hayItems && !cerrada() ? completarEnvioHtml(eg) : '';

  // Panel modal (sin cambios de fondo: sigue siendo el que lleva el formulario).
  document.getElementById('carrito-items').innerHTML = html;
  document.getElementById('carrito-vacio').hidden = hayItems;
  document.getElementById('btn-vaciar-panel').hidden = !hayItems;
  document.getElementById('carrito-total').hidden = !hayItems;
  document.getElementById('form-pedido').hidden = !hayItems || cerrada();
  document.getElementById('carrito-total').innerHTML = hayItems
    ? (envioTexto ? `<span class="envio-linea">${escapeHtml(envioTexto)}</span>` : '') +
      totalBloqueHtml('total-linea', 'total-o')
    : '';
  const panelPolitica = document.getElementById('panel-politica');
  panelPolitica.hidden = !hayItems || !politica;
  panelPolitica.innerHTML = politica ? escapeHtml(politica) : '';
  pintarCompletarEnvio('completar-envio', completarHtml);
  document.getElementById('panel-terminos').hidden = !hayItems;
  const panelPago = document.getElementById('panel-pago-wrap');
  panelPago.hidden = !pagoHtml;
  panelPago.innerHTML = pagoHtml;

  // Aside lateral — mismas líneas, mismo total CUP, más el ≈ $X USD.
  // El aside NO lleva formulario: su botón abre el panel modal de siempre.
  // El `hidden` del HTML es solo para evitar el parpadeo antes de que cargue
  // el catálogo; a partir de aquí la visibilidad real la decide el @media de
  // estilos.css (display:none <1024px, display:block ≥1024px) — [hidden]
  // tiene !important y taparía esa regla si no se quita aquí.
  const lateral = document.getElementById('carrito-lateral');
  if (!lateral) return;
  lateral.hidden = cerrada();
  if (cerrada()) return;             // cerrada: nada del pedido lateral se pinta
  document.getElementById('lateral-items').innerHTML = hayItems
    ? html
    : '<p class="estado-lateral">Tu pedido está vacío.</p>';
  document.getElementById('btn-vaciar-lateral').hidden = !hayItems;
  const envioEl = document.getElementById('lateral-envio');
  envioEl.hidden = !hayItems || !envioTexto;
  envioEl.textContent = envioTexto;
  const totalEl = document.getElementById('lateral-total');
  totalEl.hidden = !hayItems;
  totalEl.innerHTML = hayItems ? totalBloqueHtml('lateral-total-cup', 'lateral-total-o') : '';
  const lateralPolitica = document.getElementById('lateral-politica');
  lateralPolitica.hidden = !hayItems || !politica;
  lateralPolitica.innerHTML = politica ? escapeHtml(politica) : '';
  pintarCompletarEnvio('lateral-completar', completarHtml);
  document.getElementById('lateral-terminos').hidden = !hayItems;
  document.getElementById('btn-lateral-pedir').hidden = !hayItems;
  const lateralPago = document.getElementById('lateral-pago-wrap');
  lateralPago.hidden = !pagoHtml;
  lateralPago.innerHTML = pagoHtml;
}

// Vaciar pedido (2026-08-16): pide confirmación porque no hay deshacer.
// Limpia el estado (carrito + localStorage) y repinta TODO lo que depende de
// él — parrilla (para que las tarjetas vuelvan a "Añadir"), carrito (panel +
// aside) y barra móvil (vía guardarCarrito). Si el modal de detalle está
// abierto sobre un producto que estaba en el pedido, también se refresca.
// Vacia de verdad. NO pregunta: quien llama ya se encargo de eso.
function limpiarCarrito() {
  carrito = {};
  guardarCarrito();
  localStorage.removeItem(CLAVE_CARRITO);
  renderGrid();
  renderCarrito();
  if (productoModal) refrescarAcciones(productoModal);
}

function vaciarPedido() {
  if (!Object.keys(carrito).length) return;   // guarda defensiva: el botón está oculto si ya está vacío
  const ok = confirm('¿Vaciar tu pedido? Perderás lo que agregaste y no se puede deshacer.');
  if (!ok) return;
  limpiarCarrito();
}

function abrirCarrito() { abrirCapa({ tipo: 'carrito' }); }
function cerrarCarrito() { pedirCierreCapa('carrito'); }

// Pinta el carrito. NO toca el historial: la llama sincronizarCapas.
function mostrarCarrito() {
  renderCarrito();
  pintarDirecciones();
  elementoAnteriorFoco = document.activeElement;
  const panel = document.getElementById('panel');
  panel.hidden = false;
  document.getElementById('btn-cerrar-carrito').focus();
  document.addEventListener('keydown', capturarTecladoCarrito);
}

// Oculta el carrito. NO toca el historial: la llama sincronizarCapas.
function ocultarCarrito() {
  document.getElementById('panel').hidden = true;
  document.removeEventListener('keydown', capturarTecladoCarrito);
  if (elementoAnteriorFoco && elementoAnteriorFoco.isConnected) elementoAnteriorFoco.focus();
}

function capturarTecladoCarrito(e) {
  const panel = document.getElementById('panel');
  if (panel.hidden) return;
  if (e.key === 'Escape') { cerrarCarrito(); return; }
  if (e.key === 'Tab') atraparFoco(e, panel);
}

// Validación con errores bajo el campo (nada de alert()).
function marcarError(idCampo, idError, mostrar) {
  document.getElementById(idCampo).classList.toggle('invalido', mostrar);
  document.getElementById(idError).hidden = !mostrar;
}

// Horario en que el cliente puede recibir (2026-10-06). El vocabulario es el MISMO que
// el del panel de Stock+ (carrito-horario), para que Envíos y la mensajera lean siempre
// las mismas cuatro frases. "Otro horario…" abre un campo libre.
function horarioElegido() {
  const sel = document.getElementById('c-horario');
  if (!sel) return '';
  if (sel.value === '__libre') return document.getElementById('c-horario-libre').value.trim().slice(0, 80);
  return sel.value;
}

function engancharHorario() {
  const sel = document.getElementById('c-horario');
  const libre = document.getElementById('c-horario-libre');
  if (!sel || !libre) return;
  sel.addEventListener('change', () => {
    libre.hidden = sel.value !== '__libre';
    if (!libre.hidden) libre.focus();
  });
}

function enviarPorWhatsApp(ev) {
  if (ev) ev.preventDefault();
  // Pestaña abierta desde antes de que Ruth cerrara: aquí se corta. La comprobación es
  // SINCRÓNICA a propósito — un await antes del window.open de abajo hace que el
  // bloqueador de ventanas emergentes se coma el enlace de WhatsApp (iOS sobre todo).
  if (cerrada()) {
    cerrarCarrito();
    window.scrollTo({ top: 0, behavior: 'smooth' });   // que vea la franja
    return;
  }
  const items = itemsCarrito();
  if (!items.length) return;   // el formulario está oculto sin items; guarda defensiva

  const nombre = document.getElementById('c-nombre').value.trim();
  const tel = document.getElementById('c-tel').value.trim();
  const dir = document.getElementById('c-dir').value.trim();
  const nota = document.getElementById('c-nota').value.trim();
  const horario = horarioElegido();

  marcarError('c-nombre', 'err-nombre', !nombre);
  marcarError('c-tel', 'err-tel', !tel);
  marcarError('c-dir', 'err-dir', !dir);
  marcarError('c-horario', 'err-horario', !horario);
  if (!nombre || !tel || !dir || !horario) {
    const primerInvalido = !nombre ? 'c-nombre' : (!tel ? 'c-tel' : (!dir ? 'c-dir' : 'c-horario'));
    document.getElementById(primerInvalido).focus();
    return;
  }

  const v = resolverVendedor();
  const eg = envioGratis();
  const m = mensajeria();
  const lineas = ['🛒 *Pedido desde la web*'];
  if (v) lineas.push(`👤 Vendedor: ${v.code}`);
  lineas.push('');
  const etiqueta = (p, clave) => {
    const v = variantesDe(p);
    if (!v || !clave) return '';
    const vals = clave.split(SEP_VAR);
    return ' (' + v.ejes.map((e, i) => `${e} ${vals[i]}`).join(', ') + ')';
  };
  items.forEach(({ p, qty, clave }) => lineas.push(`• ${p.name}${etiqueta(p, clave)} x${qty} — ${fmt(p.precioCUP * qty)} CUP`));
  lineas.push('');
  if (m.activa) {
    // Mismo desglose que el carrito: Productos / Mensajería / Total.
    lineas.push(`Productos: ${fmt(totalCarrito())} CUP`);
    lineas.push(m.coordinar
      ? 'Mensajería: a coordinar (transporte aparte)'
      : (m.gratis
        ? `Mensajería: GRATIS (pedido desde ${fmt(eg.umbral)} CUP)`
        : `Mensajería: ${fmt(m.monto)} CUP (se confirma según la zona)`));
    lineas.push(`*Total: ${fmt(totalGeneralCUP())} CUP*`);
  } else {
    lineas.push(`*Total: ${fmt(totalCarrito())} CUP*`);
    if (eg.activo && eg.alcanzado) lineas.push(`Mensajería: GRATIS (pedido desde ${fmt(eg.umbral)} CUP)`);
  }
  // El cambio con el que estan hechas estas cuentas, pegado al total: asi el cliente
  // puede comprobar la conversion y Ruth sabe con que tasa se cerro ESTE pedido, aunque
  // la cambie despues. Sin tasa valida no se escribe nada.
  const notaTasa = (window.TasaVista && TasaVista.pedido(CAT.tasa)) || '';
  if (notaTasa) lineas.push(notaTasa);
  // Lo que se ahorro con las ofertas de ESTE pedido. Va despues de la tasa y no entre el total
  // y la tasa: esa pareja no se separa (decision del 2026-10-27, el cambio va pegado al total).
  // Solo si hay algo que presumir, para no escribirle a Ruth un «Ahorraste 0 CUP».
  const dWA = window.Descuento.totales(items);
  if (dWA.descuento > 0) lineas.push(`Ahorraste ${fmt(dWA.descuento)} CUP`);
  lineas.push('');
  const aparteWA = itemsAparte();
  if (aparteWA.length) {
    lineas.push(`⚠️ Transporte aparte: ${aparteWA.map(({ p }) => p.name).join(', ')} — se coordina por WhatsApp`);
    lineas.push('');
  }
  lineas.push(`Nombre: ${nombre}`, `Tel: ${tel}`, `Dirección: ${dir}`, `Horario: ${horario}`);
  if (nota) lineas.push(`Nota: ${nota}`);
  const politica = politicaTexto();
  if (politica) lineas.push('', politica);

  // Línea técnica para que Stock+ anote el pedido solo, emparejando POR CÓDIGO
  // (nunca por nombre). Si el catálogo publicado todavía no trae `codigo` —o si algún
  // item no lo tiene— no se escribe: el servidor cae al emparejado por nombre y avisa.
  const refs = items.filter(({ p }) => p.codigo).map(({ p, qty, clave }) => `${p.codigo}${clave ? '/' + clave.split(SEP_VAR).join('+') : ''} x${qty}`);
  // 🔴 CONTRATO con lib/pedidoWeb.js de Stock+ (igual que `Horario:`): si se cambia
  // esta etiqueta en un lado y no en el otro, el pedido entra sin negocio y nadie se
  // entera. La casa NO la escribe, para que su mensaje siga siendo el de siempre.
  if (NEGOCIO !== (window.Negocio ? window.Negocio.CASA : '3b')) {
    lineas.push(`Negocio: ${(CAT.tienda && CAT.tienda.nombre) || NEGOCIO}`);
  }
  if (refs.length && refs.length === items.length) lineas.push('', `Ref: ${refs.join(', ')}`);

  // Quien pone el precio, atiende: si el cliente entro por la pagina de un gestor con
  // recargo, el pedido va a SU WhatsApp y el lo reenvia al numero de la casa (el mensaje
  // lleva `Vendedor: CODIGO`, asi que Stock+ lo anota igual al reenviarlo). Sin gestor con
  // recargo, el numero de la casa, como siempre.
  // 🔴 NADA de `await` antes de este window.open: el bloqueador de emergentes se come el
  // enlace de WhatsApp (iOS sobre todo).
  // 🔴 "Quien pone precio, atiende" vale para la mercancia de la CASA. En la tienda
  // de un negocio asociado no cae recargo ninguno (lo apaga lib/catalogoWeb.js) y
  // precios-gestores.json no lleva sus productos: el gestor no pone ese precio, asi
  // que el pedido va al numero de la casa, donde el bot lo anota y lo reenvia al socio.
  // (El ?ref= y la linea `Vendedor:` NO se tocan: el gestor sigue cobrando su comision.)
  const destino = destinoWhatsApp();
  window.open(`https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');

  // Ya se fue a WhatsApp. Ahora si: guardar sus datos si lo pidio, y dejar la marca para
  // preguntarle al volver si llego a enviarlo.
  const chk = document.getElementById('c-guardar');
  if (chk && chk.checked) {
    const etiquetaDir = document.getElementById('c-etiqueta').value.trim();
    escribirDirecciones(window.Direcciones.guardar(leerDirecciones(), {
      etiqueta: etiquetaDir, nombre: nombre, tel: tel, dir: dir, horario: horario,
    }));
    pintarDirecciones();
  }
  try { localStorage.setItem(CLAVE_ENVIADO, String(Date.now())); } catch (e) { /* sin marca: no se preguntara */ }
}

// ── Portada: mosaico de fotos reales + dato de productos ──

function renderHero() {
  const items = (CAT.items || []).filter((p) => esCloudinary(p.photo));
  const porCategoria = new Map();
  items.forEach((p) => { if (!porCategoria.has(p.cat)) porCategoria.set(p.cat, p); });
  let elegidos = Array.from(porCategoria.values());
  if (elegidos.length < 12) {
    for (const p of items) {
      if (elegidos.length >= 12) break;
      if (!elegidos.includes(p)) elegidos.push(p);
    }
  }
  elegidos = elegidos.slice(0, 12);
  document.getElementById('hero-mosaico').innerHTML =
    elegidos.map((p) => `<img src="${fotoMosaico(p.photo)}" alt="" loading="lazy">`).join('');
  document.getElementById('hero-dato-productos').textContent = `${(CAT.items || []).length} productos disponibles`;
  // El cambio, en una linea fina encima de la banda del umbral (y no en el centro de la
  // portada, donde se veia demasiado grande). Sin tasa valida queda oculto: la pagina se
  // ve entonces exactamente como antes.
  const tasaBanda = document.getElementById('banda-tasa');
  if (tasaBanda) {
    const txt = TasaVista.portada(CAT.tasa);
    tasaBanda.textContent = txt;
    tasaBanda.hidden = !txt;
  }
}

// ── Marca: nombre de la tienda (CAT.tienda.nombre, con '3B Store' de reserva) ──

function renderMarca() {
  const t = (CAT && CAT.tienda) || {};
  const nombre = (t.nombre && t.nombre.trim()) || '3B Store';
  // El <title> vive en index.html (lleva las palabras con las que la gente busca en Google: nombre de la tienda + San Antonio de los Baños, Cuba). No reasignar el titulo del documento desde aqui.
  document.querySelectorAll('.logo').forEach((el) => el.setAttribute('aria-label', nombre + ' — inicio'));
  const footerNombre = document.getElementById('footer-nombre');
  if (footerNombre) footerNombre.textContent = nombre;
}

// ── Pie: Quiénes somos / Zonas de reparto / Contáctanos ──
// Todo viene de CAT.tienda (puede no existir todavía, o traer campos vacíos).
// Programación defensiva: si un campo falta, esa parte del pie simplemente no se pinta.
// Nunca innerHTML con texto del catálogo sin escapar: quienSomos/zonas van por textContent.

function renderFooterExtra() {
  const t = (CAT && CAT.tienda) || {};

  const quienesSec = document.getElementById('footer-quienes');
  const quienesTexto = document.getElementById('footer-quienes-texto');
  const tieneQuienes = !!(t.quienSomos && t.quienSomos.trim());
  quienesSec.hidden = !tieneQuienes;
  quienesTexto.textContent = tieneQuienes ? t.quienSomos : '';

  const zonasSec = document.getElementById('footer-zonas');
  const zonasTexto = document.getElementById('footer-zonas-texto');
  const tieneZonas = !!(t.zonas && t.zonas.trim());
  zonasSec.hidden = !tieneZonas;
  zonasTexto.textContent = tieneZonas ? t.zonas : '';

  // grupoWA/contactos: contrato nuevo de catalogo.json→tienda (2026-08-15,
  // otro ejecutor los añade en Stock+ en paralelo). Ausentes/vacíos ⇒ esa
  // pieza no se pinta, igual que facebook/email de abajo. Todo lo que viene
  // del catálogo (público) se escapa con escapeHtml antes de insertarse.
  const contactoSec = document.getElementById('footer-contacto');
  const links = document.getElementById('footer-contacto-links');
  const piezas = [];
  if (CAT.whatsapp) {
    piezas.push(`<a class="footer-link footer-link-wa" href="https://wa.me/${escapeHtml(CAT.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
  }
  // Alta de gestor: abre el recuadro de los tres pasos (no WhatsApp
  // directo), para que todo el mundo lea antes de escribir.
  if (CAT.whatsapp) {
    piezas.push(`<button type="button" class="footer-link" id="pie-comi">🤝 Quiero ser gestor</button>`);
  }
  if (t.grupoWA && t.grupoWA.trim()) {
    piezas.push(`<a class="footer-link" href="${escapeHtml(t.grupoWA.trim())}" target="_blank" rel="noopener">👥 Únete a nuestro grupo</a>`);
  }
  (Array.isArray(t.contactos) ? t.contactos : []).forEach((c) => {
    const tel = c && c.tel ? String(c.tel).trim() : '';
    if (!tel) return;
    const nombre = (c.nombre || '').trim();
    // "a" + "el" se contrae en "al" (p.ej. "el admin secundario" → "al admin secundario").
    // Solo cuando "el" es palabra suelta (seguida de espacio), para no comerse
    // nombres como "Elena"/"Eloy" que solo empiezan con esas letras.
    const contraccion = /^el\s+(.*)$/i.exec(nombre);
    const etiqueta = contraccion
      ? `Escríbele al ${contraccion[1]}`
      : (nombre ? `Escríbele a ${nombre}` : 'Escríbele por WhatsApp');
    piezas.push(`<a class="footer-link footer-link-wa" href="https://wa.me/${escapeHtml(tel)}" target="_blank" rel="noopener">💬 ${escapeHtml(etiqueta)}</a>`);
  });
  if (t.facebook && t.facebook.trim()) {
    piezas.push(`<a class="footer-link" href="${escapeHtml(t.facebook)}" target="_blank" rel="noopener">📘 Facebook</a>`);
  }
  if (t.email && t.email.trim()) {
    piezas.push(`<a class="footer-link" href="mailto:${escapeHtml(t.email)}">✉️ ${escapeHtml(t.email)}</a>`);
  }
  links.innerHTML = piezas.join('');
  contactoSec.hidden = piezas.length === 0;

  document.getElementById('footer-grid').hidden = !tieneQuienes && !tieneZonas && piezas.length === 0;
}

// ── Cabecera compacta al hacer scroll ──

function actualizarHeaderScroll() {
  document.getElementById('header').classList.toggle('compacta', window.scrollY > 8);
}

// ── Carga del catálogo, con estado de error y reintento ──

// ── Conmutador de mundos ──
// La pastilla del taxi solo aparece si Ruth lo ha encendido en Stock+
// (catalogo.json -> tienda.taxiActivo). Asi el taxi puede estar publicado y
// probandose sin que ningun cliente lo descubra antes de tiempo.
function renderMundos() {
  const pastilla = document.getElementById('mundo-taxi');
  if (pastilla) pastilla.hidden = !(CAT && CAT.tienda && CAT.tienda.taxiActivo);
  // Tercera pastilla: el negocio asociado, con su propio interruptor en el catalogo.
  const pastillaEp = document.getElementById('mundo-electripower');
  if (pastillaEp) pastillaEp.hidden = !(CAT && CAT.tienda && CAT.tienda.electripowerActivo);
  if (window.Mundos) window.Mundos.refrescar();   // el aviso depende de cuantos negocios se ven
  medirHeader();                                   // la franja cambia el alto de la barra fija
}

// ── Otros servicios de 3B (hoy solo el taxi) ──
// Misma regla que renderMundos: una tarjeta solo se ve si Ruth encendio ESE servicio
// (catalogo.json -> tienda.taxiActivo). La seccion entera se esconde si no hay ninguno.
// El texto, el banner y el enlace viven en index.html: del catalogo publico solo viaja
// el interruptor.
function renderServicios() {
  const t = (CAT && CAT.tienda) || {};
  const taxi = document.getElementById('serv-taxi');
  if (taxi) taxi.hidden = !t.taxiActivo;
  const seccion = document.getElementById('servicios');
  if (seccion) seccion.hidden = !t.taxiActivo;
}

async function cargarCatalogo() {
  document.getElementById('error-carga').hidden = true;
  document.getElementById('vacio').hidden = true;
  document.getElementById('grid').hidden = true;
  document.getElementById('skeleton').hidden = false;
  try {
    const r = await fetch('catalogo.json?v=' + Date.now());   // sin caché: el precio tiene que ser el de ahora
    if (!r.ok) throw new Error('HTTP ' + r.status);
    CAT = await r.json();
    // 🔴 EL UNICO FILTRO POR NEGOCIO DE TODA LA TIENDA. Aqui el catalogo pasa a ser
    // el de ESTA pagina: sus items, su marca, su WhatsApp. Todo lo que viene
    // despues (parrilla, buscador, ficha, relacionados, orden, carrito, tarjeta,
    // mensaje de WhatsApp) acierta sin saber que existen dos tiendas.
    if (window.Negocio) CAT = window.Negocio.aplicar(CAT, NEGOCIO);
  } catch (err) {
    document.getElementById('skeleton').hidden = true;
    document.getElementById('error-carga').hidden = false;
    return;
  }

  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
  // La pagina de un gestor con recargo: sus precios los publica Stock+ en otro archivo
  // y la tienda SOLO los sustituye (ver preciosGestor.js). Se baja unicamente si hay
  // gestor; si falla, o el gestor no esta en la tabla, se queda el precio de la casa.
  gestorRecargo = null;
  if (v) {
    try {
      const rp = await fetch('precios-gestores.json?v=' + Date.now());
      if (rp.ok) {
        const tabla = await rp.json();
        const suya = tabla && tabla[String(v.code).toUpperCase()];
        if (suya && Object.keys(suya).length) {
          CAT.items = window.PreciosGestor.aplicar(CAT.items || [], suya);
          gestorRecargo = v;
        }
      }
    } catch (err) { /* sin red o archivo ausente: precios de la casa */ }
  }
  document.getElementById('actualizado').textContent =
    'Catálogo actualizado el ' + new Date(CAT.generado).toLocaleString('es-MX');
  // La fecha de arriba y esta linea se leen juntas: «actualizado el 27/10 … calculados
  // a 845 CUP». Por eso el aviso no repite la fecha.
  const avisoTasa = document.getElementById('aviso-tasa');
  if (avisoTasa) avisoTasa.textContent = TasaVista.aviso(CAT.tasa);

  renderMarca();
  renderHero();
  ajustarCarritoATopes();
  guardarCarrito();
  renderCarrito();   // el aside lateral (≥1024px) no espera a que se abra el panel modal
  renderFiltroPill();
  renderCategorias3D();
  pintarGarantia();
  pintarPreguntarSocio();
  pintarBandaGestor();
  renderControles();   // antes de renderGrid: valida ordenSel/soloEnvioGratis contra ESTE catálogo
  renderGrid();
  renderFooterExtra();
  renderServicios();
  renderPromoEnvio();
  pintarCampana();
  pintarCierre();
  saludarSiVuelve();   // despues de ajustarCarritoATopes: las unidades ya son las reales
  if (window.Encargos) window.Encargos.iniciar(CAT);   // encargos.js (Fase C): tarjeta + #encargos
  document.getElementById('skeleton').hidden = true;
  document.getElementById('grid').hidden = false;
}

// Pestañas abiertas desde antes de que Ruth cerrara (o abriera) la tienda: al volver la
// pestaña al frente se comprueba el estado. NO se comprueba en el clic de «Pedir por
// WhatsApp»: un await justo antes del window.open lo convierte en emergente bloqueada.
// Si el estado cambió se recarga el catálogo ENTERO (cargarCatalogo), en vez de adoptar
// el JSON nuevo a medias: así no queda una parrilla vieja con datos nuevos detrás.
let ultimaRevalidacion = 0;
async function revalidarCierre() {
  if (!CAT) return;                                        // todavía no cargó por primera vez
  if (Date.now() - ultimaRevalidacion < 60000) return;     // freno: una vez por minuto como mucho
  ultimaRevalidacion = Date.now();
  let fresco;
  try {
    const r = await fetch('catalogo.json?v=' + Date.now());
    if (!r.ok) return;
    fresco = await r.json();
    // Mismo filtro que en cargarCatalogo: en la pagina del socio `cierre` queda a null,
    // y comparar contra el cierre de 3B sin filtrar recargaria el catalogo cada minuto.
    if (window.Negocio) fresco = window.Negocio.aplicar(fresco, NEGOCIO);
  } catch (err) { return; }                                // sin red: se queda como estaba
  const ahora = !!(fresco && fresco.tienda && fresco.tienda.cierre && fresco.tienda.cierre.activo);
  if (ahora === cerrada()) return;
  await cargarCatalogo();
}

async function iniciar() {
  // Buscador: accesible (label real ya en el HTML) y con debounce de 150ms.
  let temporizadorBusqueda = null;
  document.getElementById('buscador').addEventListener('input', (e) => {
    clearTimeout(temporizadorBusqueda);
    const valor = e.target.value;
    temporizadorBusqueda = setTimeout(() => { busqueda = valor; renderGrid(); }, 150);
  });

  document.getElementById('btn-carrito').addEventListener('click', abrirCarrito);
  document.getElementById('btn-ver-pedido').addEventListener('click', abrirCarrito);
  // El aside NO lleva formulario propio: su botón abre el panel modal de
  // siempre (mismos campos c-nombre/c-tel/c-dir, sin duplicar id).
  document.getElementById('btn-lateral-pedir').addEventListener('click', abrirCarrito);
  document.getElementById('btn-vaciar-panel').addEventListener('click', vaciarPedido);
  document.getElementById('btn-vaciar-lateral').addEventListener('click', vaciarPedido);
  document.getElementById('btn-cerrar-carrito').addEventListener('click', cerrarCarrito);
  document.getElementById('btn-cerrar-carrito-2').addEventListener('click', cerrarCarrito);
  document.getElementById('panel-fondo').addEventListener('click', cerrarCarrito);
  document.getElementById('form-pedido').addEventListener('submit', enviarPorWhatsApp);
  engancharHorario();
  const tiraDirs = document.getElementById('dir-guardadas-tira');
  if (tiraDirs) tiraDirs.addEventListener('click', (e) => {
    const chip = e.target.closest('.dir-chip');
    if (chip) usarDireccion(chip.dataset.dir);
  });
  const btnOlvidar = document.getElementById('dir-olvidar');
  if (btnOlvidar) btnOlvidar.addEventListener('click', olvidarDirecciones);
  const chkGuardar = document.getElementById('c-guardar');
  if (chkGuardar) chkGuardar.addEventListener('change', () => {
    const campo = document.getElementById('campo-etiqueta');
    campo.hidden = !chkGuardar.checked;
    if (chkGuardar.checked) document.getElementById('c-etiqueta').focus();
  });

  document.getElementById('modal-cerrar').addEventListener('click', cerrarDetalle);
  document.getElementById('modal-fondo').addEventListener('click', cerrarDetalle);
  window.addEventListener('popstate', alCambiarHistorial);
  document.getElementById('compartir-foto').addEventListener('click', compartirFoto);
  document.getElementById('compartir-wa').addEventListener('click', compartirWhatsApp);
  document.getElementById('compartir-fb').addEventListener('click', compartirFacebook);
  document.getElementById('compartir-link').addEventListener('click', compartirEnlace);

  document.getElementById('comi-cerrar').addEventListener('click', cerrarComisionista);
  document.getElementById('comi-fondo').addEventListener('click', cerrarComisionista);

  document.getElementById('categorias-3d').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat3d');
    if (!btn) return;
    if (btn.dataset.oferta) setOferta(); else setCat(btn.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Delegado porque renderFooterExtra() repinta el pie.
  document.getElementById('footer-contacto-links').addEventListener('click', (e) => {
    if (e.target.closest('#pie-comi')) abrirComisionista();
  });

  document.getElementById('filtro-pill').addEventListener('click', () => setCat(''));
  document.getElementById('btn-cats-ver-todas').addEventListener('click', toggleCatsExpandidas);

  document.getElementById('btn-ver-todo').addEventListener('click', () => {
    // El chip también se quita: el botón dice «Ver todo el catálogo» y con el filtro
    // puesto no enseñaría todo. El ORDEN elegido sí se conserva: es una preferencia del
    // cliente, no un filtro.
    busqueda = ''; filtroCat = ''; filtroOferta = false; soloEnvioGratis = false;
    document.getElementById('buscador').value = '';
    const chipEnvio = document.getElementById('btn-envio-gratis');
    if (chipEnvio) chipEnvio.setAttribute('aria-pressed', 'false');
    renderFiltroPill(); renderCategorias3D(); renderGrid();
  });
  document.getElementById('btn-reintentar').addEventListener('click', cargarCatalogo);

  // Delegación: tarjetas abren el detalle; los controles de cantidad no (viven dentro de .card-accion).
  // Extraída a una constante con nombre para atarla también a la tira de más
  // vendidos: el mismo gesto (tocar la tarjeta abre el detalle, tocar +/−/Añadir
  // no) tiene que funcionar igual en el carrusel que en la rejilla.
  const alPulsarEnTarjetas = (e) => {
    if (e.target.closest('.card-accion')) return;
    const card = e.target.closest('.card');
    if (card) abrirDetalle(card.dataset.id);
  };
  document.getElementById('grid').addEventListener('click', alPulsarEnTarjetas);
  document.getElementById('mv-tira').addEventListener('click', alPulsarEnTarjetas);
  document.getElementById('grid').addEventListener('click', (e) => {
    if (e.target.closest('#cta-comi')) abrirComisionista();
  });
  document.getElementById('grid').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.classList && e.target.classList.contains('card')) {
      e.preventDefault();
      abrirDetalle(e.target.dataset.id);
    }
  });

  // Delegación global: botones de +/−/Añadir, tanto en la parrilla como en el modal de detalle.
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const minus = e.target.closest('[data-minus]');
    const plus = e.target.closest('[data-plus]');
    // `data-quitar-linea` y no `data-quitar`: encargos.js ya usa `data-quitar` (índice de artículo)
    // y este manejador vive en `document`, así que atraparía también sus botones.
    const quitar = e.target.closest('[data-quitar-linea]');
    const rel = e.target.closest('[data-rel]');
    const verPedido = e.target.closest('[data-ver-pedido]');
    if (rel) {
      abrirDetalle(rel.dataset.rel);
      document.querySelector('#modal-detalle .modal-caja').scrollTop = 0;
      return;
    }
    const mini = e.target.closest('[data-foto]');
    if (mini) { pintarGaleria(Number(mini.dataset.foto) || 0); return; }
    const chip = e.target.closest('[data-val]');
    const irDetalle = e.target.closest('[data-detalle]');
    if (chip) {
      e.stopPropagation();
      const i = Number(chip.dataset.eje) || 0;
      // Volver a pulsar el valor ya elegido lo deselecciona.
      seleccionVar[i] = (seleccionVar[i] === chip.dataset.val) ? '' : chip.dataset.val;
      // Si lo elegido en otro eje ya no es compatible, se suelta en vez de dejar una
      // combinación imposible seleccionada.
      const v = variantesDe(productoDe(productoModal));
      if (v) v.ejes.forEach((_, j) => { if (j !== i && seleccionVar[j] && !valorPosible(v, j, seleccionVar[j], seleccionVar)) seleccionVar[j] = ''; });
      refrescarAcciones(productoModal);
    }
    else if (irDetalle) { e.stopPropagation(); abrirDetalle(irDetalle.dataset.detalle); }
    else if (verPedido) { e.stopPropagation(); abrirCarrito(); }
    else if (add) { e.stopPropagation(); addCarrito(add.dataset.add); }
    else if (minus) { e.stopPropagation(); quitarCarrito(minus.dataset.minus); }
    else if (plus) { e.stopPropagation(); addCarrito(plus.dataset.plus); }
    else if (quitar) { e.stopPropagation(); quitarLineaCarrito(quitar.dataset.quitarLinea); }
  });

  document.getElementById('aviso-ajuste-cerrar').addEventListener('click', () => {
    document.getElementById('aviso-ajuste').hidden = true;
    medirHeader();
  });
  document.getElementById('aviso-regreso-cerrar').addEventListener('click', () => {
    document.getElementById('aviso-regreso').hidden = true;
    medirHeader();
  });
  // 🔴 abrirCarrito(), NO mostrarCarrito(): el carrito es una capa del historial y
  // enseñarlo a mano dejaria una entrada sin nada que cerrar (ver historial.js).
  document.getElementById('aviso-regreso-ver').addEventListener('click', () => {
    document.getElementById('aviso-regreso').hidden = true;
    medirHeader();
    abrirCarrito();
  });

  window.addEventListener('scroll', actualizarHeaderScroll, { passive: true });
  // Si la ventana cruza el punto de corte de escritorio/móvil (o gira el
  // teléfono) mientras la barra está o no está, se vuelve a medir.
  window.addEventListener('resize', reservarEspacioBarraMovil, { passive: true });
  window.addEventListener('resize', medirHeader, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { revalidarCierre(); preguntarSiEnvio(); }
  });
  window.addEventListener('focus', revalidarCierre);
  document.getElementById('aviso-enviado-si').addEventListener('click', () => cerrarAvisoEnviado(true));
  document.getElementById('aviso-enviado-no').addEventListener('click', () => cerrarAvisoEnviado(false));

  engancharGestoGaleria();
  const selOrden = document.getElementById('orden-sel');
  if (selOrden) selOrden.addEventListener('change', (e) => { ordenSel = e.target.value; renderGrid(); });
  const chipEnvio = document.getElementById('btn-envio-gratis');
  if (chipEnvio) chipEnvio.addEventListener('click', () => {
    soloEnvioGratis = !soloEnvioGratis;
    chipEnvio.setAttribute('aria-pressed', String(soloEnvioGratis));
    // Las cifras de las categorías y de la píldora dependen del filtro: si no se
    // repintan aquí, siguen anunciando el total del catálogo.
    renderFiltroPill(); renderCategorias3D(); renderGrid();
  });
  medirHeader();
  const codFicha = codigoDeFichaDeLaUrl();   // ANTES de tocar la URL
  await cargarCatalogo();
  renderMundos();
  prepararHistorial();
  if (codFicha) abrirFichaPorCodigo(codFicha);   // despues de cargarCatalogo: necesita CAT.items
}

iniciar();

// Service worker: va aqui y no en un <script> del HTML porque la CSP de produccion
// lleva script-src con hashes y un <script> nuevo exigiria recalcularlos. Si falla,
// falla callando: la tienda funciona igual sin el.
if ('serviceWorker' in navigator) {
  // ¿Había ya un service worker mandando cuando se cargó esta página? Se mira AQUÍ, antes
  // de registrar nada: si no lo había, esta es la primera visita y el código que se está
  // ejecutando ya viene de la red, así que recargar no aportaría nada.
  const habiaControlador = !!navigator.serviceWorker.controller;
  let recargando = false;

  // ¿El cliente ya empezó a escribir su pedido? Entonces NO se recarga: perdería su
  // nombre, su teléfono y su dirección. Se queda con la versión vieja esta visita, que es
  // mucho menos malo. El carrito en sí no se pierde nunca: vive en localStorage.
  function escribiendoPedido() {
    const f = document.getElementById('form-pedido');
    if (!f || f.hidden) return false;
    // 🔴 Un checkbox vale "on" aunque no este marcado: se mira `checked`, no `value`.
    // Si esto se hace mal, escribiendoPedido() devuelve siempre true y el service worker
    // no vuelve a recargar la tienda en ningun telefono.
    return [...f.querySelectorAll('input, textarea, select')]
      .some((c) => (c.type === 'checkbox' ? c.checked : String(c.value || '').trim() !== ''));
  }

  // El service worker nuevo acaba de tomar el mando: la caché ya tiene el código nuevo,
  // pero esta página sigue ejecutando el viejo. Una recarga y queda al día.
  // 🔴 Sin esto, el cliente ve la versión nueva solo en su SEGUNDA visita, y casi nadie
  // recarga dos veces (medido en producción varias veces el 2026-10-14 y el 15).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControlador || recargando || escribiendoPedido()) return;
    recargando = true;
    location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
