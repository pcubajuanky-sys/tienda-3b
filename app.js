// app.js — tienda 3B. Lee catalogo.json y pinta el catálogo.
// Sin dependencias, sin backend: todo pasa en el navegador del cliente.
let CAT = null;          // el catalogo.json cargado
let filtroCat = '';      // categoría activa ('' = todas)
let filtroOferta = false;
let busqueda = '';
let elementoAnteriorFoco = null;   // para devolver el foco al cerrar modal/carrito
let productoModal = null;
let catsExpandidas = false;   // estado de "Ver todas" en categorías (solo escritorio); sobrevive a los re-render
const CATS_VISIBLES_PLEGADO = 12;   // debe coincidir con :nth-child(n+13) en estilos.css

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

// El código del vendedor sobrevive a la navegación: se guarda al entrar por su enlace.
function resolverVendedor() {
  const url = new URLSearchParams(location.search).get('ref');
  if (url) localStorage.setItem('ref', url.toUpperCase());
  const code = localStorage.getItem('ref') || '';
  const v = (CAT.vendedores || []).find((x) => x.code === code);
  if (!v) { localStorage.removeItem('ref'); return null; }   // código inválido o dado de baja
  return v;
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
  const w400 = fotoUrl(url, 'f_auto,q_auto,w_400,c_limit');
  const w800 = fotoUrl(url, 'f_auto,q_auto,w_800,c_limit');
  return { src: w400, srcset: `${w400} 400w, ${w800} 800w` };
}

function fotoDetalle(url) {
  return esCloudinary(url) ? fotoUrl(url, 'f_auto,q_auto,w_900,c_limit') : url;
}

function fotoMosaico(url) {
  return esCloudinary(url) ? fotoUrl(url, 'f_auto,q_auto,w_200,c_limit') : url;
}

// Recuadro con la inicial cuando la foto no carga (tarjetas de producto y modal).
// Las fotos del mosaico de categorías usan su propio fallback: cat3dImgFallback.
function imgFallback(img) {
  const cont = img.closest('.card-foto') || img.closest('.modal-foto');
  if (!cont) return;
  const nombre = (img.alt || '').trim();
  const inicial = nombre.charAt(0).toUpperCase() || '?';
  cont.innerHTML = `<div class="inicial" aria-hidden="true">${inicial}</div>`;
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
  const items = CAT.items || [];
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
// las dos llamadas a cat3dFotoHtml() en renderCategorias3D() — nada más.
function mosaicoFotos(items) {
  const conFoto = items.filter((p) => esCloudinary(p.photo));
  const fuente = conFoto.length ? conFoto : items.filter((p) => p.photo);
  if (!fuente.length) return [];
  const salida = [];
  for (let i = 0; i < 4; i++) salida.push(fotoMosaico(fuente[i % fuente.length].photo));
  return salida;
}

function categoriaFotos(catName) {
  return mosaicoFotos((CAT.items || []).filter((p) => p.cat === catName));
}

function fotosOferta() {
  return mosaicoFotos((CAT.items || []).filter((p) => p.enOferta));
}

// Una foto que no carga solo se cae ella. En el mosaico (4 fotos, modo
// reversible) queda una celda vacía porque las otras 3 bastan; en la
// tarjeta pequeña actual (1 sola foto) no hay otras 3 que salven la tarjeta,
// así que cae a la inicial/emoji — igual que cat3dFotoHtml() cuando no hay
// fotos. Se distingue mirando si el <img> es hijo único de .cat3d-foto.
function cat3dImgFallback(img) {
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

function cat3dFotoHtml(fotos, marcador) {
  if (!fotos.length) return `<span class="inicial" aria-hidden="true">${marcador}</span>`;
  return fotos.map((f) => `<img src="${f}" alt="" loading="lazy" data-marcador="${marcador}" onerror="cat3dImgFallback(this)">`).join('');
}

function renderCategorias3D() {
  const cont = document.getElementById('categorias-3d');
  if (!cont) return;
  const items = CAT.items || [];
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
      `<span class="cat3d-foto">${cat3dFotoHtml(fotosOferta().slice(0, 1), '🏷️')}</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre"><span class="cat3d-emoji" aria-hidden="true">🏷️</span>Ofertas</span>` +
      `<span class="cat3d-n">${nOfertas} producto${nOfertas === 1 ? '' : 's'}</span>` +
      `</span></button>`;
  })();

  const tarjetasCat = cats.map((c) => {
    const n = items.filter((p) => p.cat === c.n).length;
    const activo = !filtroOferta && filtroCat === c.n;
    const marcador = escapeHtml(c.e || c.n.charAt(0).toUpperCase());
    return `<button class="cat3d ${activo ? 'on' : ''}" type="button" data-cat="${escapeHtml(c.n)}" aria-pressed="${activo}">` +
      `<span class="cat3d-inner">` +
      `<span class="cat3d-foto">${cat3dFotoHtml(categoriaFotos(c.n).slice(0, 1), marcador)}</span>` +
      `</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre"><span class="cat3d-emoji" aria-hidden="true">${c.e || ''}</span>${escapeHtml(c.n)}</span>` +
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

function accionHtml(id) {
  const q = carrito[id] || 0;
  if (q === 0) return `<button class="add" data-add="${id}">Añadir</button>`;
  return `<div class="qty">` +
    `<button data-minus="${id}" aria-label="Quitar una unidad">−</button>` +
    `<strong aria-hidden="true">${q}</strong><span class="sr-only">${q} en el pedido</span>` +
    `<button data-plus="${id}" aria-label="Añadir una unidad">+</button>` +
    `</div>`;
}

// Precio: cada producto manda su moneda (2026-08-16, contrato tienda.ter.1 de
// catalogo.json: p.moneda = 'usd'|'cup', derivado de fixedCurrency en Stock+).
// moneda:'usd' ⇒ el USD es la fuente de verdad (precio grande) y el CUP es
// una conversión que cambia con la tasa (chico, debajo); moneda:'cup' (o
// ausente, comportamiento de siempre) ⇒ al revés. El tachado de las ofertas
// sigue la misma moneda que el precio efectivo. Una sola función pinta la
// tarjeta y el detalle: nunca se duplica esta lógica en dos sitios.
function precioHtml(p) {
  const usd = `$${p.precioUSD}`;
  const cup = `${fmt(p.precioCUP)} CUP`;
  const esUsd = p.moneda === 'usd';
  const principal = esUsd ? usd : cup;
  const secundario = esUsd ? cup : usd;
  const tachado = p.enOferta
    ? `<span class="tachado">${esUsd ? `$${p.precioNormalUSD}` : `${fmt(p.precioNormalCUP)} CUP`}</span>`
    : '';
  return tachado + `<span class="precio">${principal}<span class="usd">· ${secundario}</span></span>`;
}

function tarjetaHtml(p) {
  const foto = fotoCard(p.photo);
  return `
    <div class="card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalle de ${escapeHtml(p.name)}">
      <div class="card-foto">
        <img src="${foto.src}" ${foto.srcset ? `srcset="${foto.srcset}" sizes="(max-width:480px) 45vw, 220px"` : ''}
             alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="imgFallback(this)">
        ${p.enOferta ? `<span class="card-oferta">OFERTA</span>` : ''}
      </div>
      <div class="body">
        <div class="nom">${escapeHtml(p.name)}</div>
        ${p.notes ? `<div class="desc">${escapeHtml(p.notes)}</div>` : ''}
        <div class="precio-linea">${precioHtml(p)}</div>
        <div class="card-accion" id="acc-${p.id}">${accionHtml(p.id)}</div>
      </div>
    </div>`;
}

function renderGrid() {
  const items = visibles();
  const buscando = busqueda.trim() !== '' || filtroCat !== '' || filtroOferta;
  document.getElementById('vacio').hidden = !(items.length === 0 && buscando);
  document.getElementById('grid').innerHTML = items.map(tarjetaHtml).join('');
}

function refrescarAcciones(id) {
  const el = document.getElementById('acc-' + id);
  if (el) el.innerHTML = accionHtml(id);
  if (productoModal === id) {
    const m = document.getElementById('modal-accion');
    if (m) m.innerHTML = accionHtml(id);
  }
}

// ── Detalle de producto (modal) ──

function abrirDetalle(id) {
  const p = (CAT.items || []).find((x) => x.id === id);
  if (!p) return;
  productoModal = id;
  document.getElementById('modal-img').src = fotoDetalle(p.photo);
  document.getElementById('modal-img').alt = p.name;
  document.getElementById('modal-img').setAttribute('onerror', 'imgFallback(this)');
  document.getElementById('modal-cat').textContent = p.cat || '';
  document.getElementById('modal-nombre').textContent = p.name;
  document.getElementById('modal-desc').textContent = p.notes || '';
  document.getElementById('modal-precio').innerHTML = precioHtml(p);
  document.getElementById('modal-accion').innerHTML = accionHtml(id);

  elementoAnteriorFoco = document.activeElement;
  const modal = document.getElementById('modal-detalle');
  modal.hidden = false;
  document.getElementById('modal-cerrar').focus();
  document.addEventListener('keydown', capturarTecladoModal);
}

function cerrarDetalle() {
  document.getElementById('modal-detalle').hidden = true;
  productoModal = null;
  const img = document.getElementById('modal-img');
  // Un src="" hace que el navegador re-pida la página entera como si fuera la imagen.
  // Sin el atributo, no hay petición: la foto vuelve a ponerse solo al abrir el detalle.
  if (img) img.removeAttribute('src');
  document.removeEventListener('keydown', capturarTecladoModal);
  if (elementoAnteriorFoco && elementoAnteriorFoco.isConnected) elementoAnteriorFoco.focus();
}

function capturarTecladoModal(e) {
  const modal = document.getElementById('modal-detalle');
  if (modal.hidden) return;
  if (e.key === 'Escape') { cerrarDetalle(); return; }
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
let carrito = JSON.parse(localStorage.getItem('carrito') || '{}');

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
  const n = Object.values(carrito).reduce((s, q) => s + q, 0);
  document.getElementById('carrito-count').textContent = n;
  actualizarBarraMovil();
}

function addCarrito(id) { carrito[id] = (carrito[id] || 0) + 1; guardarCarrito(); refrescarAcciones(id); renderCarrito(); }

function quitarCarrito(id) {
  carrito[id] = (carrito[id] || 0) - 1;
  if (carrito[id] <= 0) delete carrito[id];
  guardarCarrito(); refrescarAcciones(id); renderCarrito();
}

function itemsCarrito() {
  return Object.entries(carrito)
    .map(([id, qty]) => ({ p: (CAT.items || []).find((x) => x.id === id), qty }))
    .filter((x) => x.p);   // un producto agotado desaparece del catálogo: se cae del carrito solo
}

function totalCarrito() {
  return itemsCarrito().reduce((s, { p, qty }) => s + p.precioCUP * qty, 0);
}

// El CUP manda (es lo que se cobra y viaja a WhatsApp); el USD es orientativo
// porque el CUP de cada producto se redondea hacia arriba al publicar el
// catálogo, así que suma(CUP) no es exactamente suma(USD) × tasa. Por eso el
// USD del carrito siempre se pinta con "≈" delante.
function totalCarritoUSD() {
  const n = itemsCarrito().reduce((s, { p, qty }) => s + Number(p.precioUSD) * qty, 0);
  return Math.round(n * 100) / 100;
}

// Misma función y mismo formato del USD en panel modal y aside — nunca se
// duplica el cálculo, solo la clase CSS cambia según dónde se pinte.
// Usa totalGeneralUSD() (productos + mensajería si aplica) para que el "≈"
// siga siendo coherente con el total real que se cobra.
function usdLineaHtml(clase) {
  return `<span class="${clase}">≈ $${totalGeneralUSD().toFixed(2)} USD</span>`;
}

// Bloque de total, compartido por panel modal y aside (una sola fuente de
// verdad, como el resto del carrito). Con mensajería inactiva es la línea
// única de siempre; activa, pasa a tres líneas (Productos/Mensajería/Total)
// con una nota de que el costo depende de la zona.
function totalBloqueHtml(claseTotalCup, claseTotalUsd) {
  const m = mensajeria();
  if (!m.activa) {
    return `<span class="${claseTotalCup}">Total: ${fmt(totalCarrito())} CUP</span>` + usdLineaHtml(claseTotalUsd);
  }
  return (
    `<div class="desglose-linea"><span>Productos</span><span>${fmt(totalCarrito())} CUP</span></div>` +
    `<div class="desglose-linea"><span>Mensajería</span><span>${m.gratis ? 'GRATIS' : fmt(m.monto) + ' CUP'}</span></div>` +
    `<p class="desglose-nota">El costo de mensajería depende de la zona; se confirma por WhatsApp.</p>` +
    `<div class="desglose-linea desglose-total"><span>Total</span><span>${fmt(totalGeneralCUP())} CUP</span></div>` +
    usdLineaHtml(claseTotalUsd)
  );
}

// Mensajería gratis a partir de un umbral en CUP, configurable desde el panel
// de Stock+ (CAT.tienda.envioGratisCUP / envioGratisTexto). Ausente o 0 ⇒
// activo=false y nada de esto se pinta en ningún sitio (tienda idéntica a hoy).
// «desde», no «más de»: un pedido de exactamente el umbral SÍ cuenta.
function envioGratis() {
  const t = (CAT && CAT.tienda) || {};
  const umbral = Math.max(0, Number(t.envioGratisCUP) || 0);
  const activo = umbral > 0;
  const total = totalCarrito();
  const alcanzado = activo && total >= umbral;
  const falta = activo && !alcanzado ? umbral - total : 0;
  return { activo, umbral, falta, alcanzado, textoFino: (t.envioGratisTexto || '').trim() };
}

// Misma frase en aside, panel modal y barra móvil: una sola fuente de verdad.
function lineaEnvioTexto(eg) {
  if (!eg.activo) return '';
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
  return { activa, costo, gratis, monto: activa && !gratis ? costo : 0 };
}

// Total real que se cobra: productos + mensajería (0 si es gratis o si la
// mensajería está inactiva). Es lo que se manda por WhatsApp y lo que debe
// coincidir con la barra móvil y el carrito.
function totalGeneralCUP() {
  return totalCarrito() + mensajeria().monto;
}

// USD del total general: la mensajería se convierte con CAT.tasa (no tiene
// precioUSD propio, a diferencia de los productos). Con mensajería inactiva
// esto es exactamente totalCarritoUSD() — no cambia nada de lo que ya había.
function totalGeneralUSD() {
  const m = mensajeria();
  const envioUSD = m.monto > 0 && CAT.tasa ? m.monto / CAT.tasa : 0;
  return Math.round((totalCarritoUSD() + envioUSD) * 100) / 100;
}

// Cláusulas de entrega (tienda.politica). Vacío/ausente ⇒ no se pinta nada.
function politicaTexto() {
  const t = (CAT && CAT.tienda) || {};
  return (t.politica || '').toString().trim();
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

function lineaCarritoHtml(p, qty) {
  const foto = fotoCard(p.photo);
  return `<div class="linea">
      <img src="${foto.src}" alt="" loading="lazy" onerror="imgFallback(this)">
      <div class="linea-info">
        <div class="linea-nom">${escapeHtml(p.name)}</div>
        <div class="linea-qty">x${qty}</div>
      </div>
      <div class="linea-sub">${fmt(p.precioCUP * qty)} CUP</div>
    </div>`;
}

function actualizarBarraMovil() {
  const items = itemsCarrito();
  const n = items.reduce((s, { qty }) => s + qty, 0);
  const barra = document.getElementById('barra-movil');
  if (n === 0) {
    barra.hidden = true;
    reservarEspacioBarraMovil();
    return;
  }
  barra.hidden = false;
  const eg = envioGratis();
  const aviso = eg.activo && eg.alcanzado ? ' · 🎉 Mensajería gratis' : '';
  document.getElementById('barra-movil-info').textContent =
    `${n} producto${n === 1 ? '' : 's'} · ${fmt(totalGeneralCUP())} CUP${aviso}`;
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
  const header = document.getElementById('header');
  if (!header) return;
  const h = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}

// Pinta el panel modal (móvil y respaldo en escritorio) Y el aside lateral
// (solo visible ≥1024px) con las MISMAS líneas (lineaCarritoHtml) y el mismo
// total CUP — una sola fuente de verdad, nada de lógica duplicada.
function renderCarrito() {
  const items = itemsCarrito();
  const hayItems = items.length > 0;
  const html = items.map(({ p, qty }) => lineaCarritoHtml(p, qty)).join('');
  const eg = envioGratis();
  const envioTexto = lineaEnvioTexto(eg);
  const politica = politicaTexto();

  // Panel modal (sin cambios de fondo: sigue siendo el que lleva el formulario).
  document.getElementById('carrito-items').innerHTML = html;
  document.getElementById('carrito-vacio').hidden = hayItems;
  document.getElementById('btn-vaciar-panel').hidden = !hayItems;
  document.getElementById('carrito-total').hidden = !hayItems;
  document.getElementById('form-pedido').hidden = !hayItems;
  document.getElementById('carrito-total').innerHTML = hayItems
    ? (envioTexto ? `<span class="envio-linea">${escapeHtml(envioTexto)}</span>` : '') +
      totalBloqueHtml('total-linea', 'total-usd')
    : '';
  const panelPolitica = document.getElementById('panel-politica');
  panelPolitica.hidden = !hayItems || !politica;
  panelPolitica.innerHTML = politica ? escapeHtml(politica) : '';

  // Aside lateral — mismas líneas, mismo total CUP, más el ≈ $X USD.
  // El aside NO lleva formulario: su botón abre el panel modal de siempre.
  // El `hidden` del HTML es solo para evitar el parpadeo antes de que cargue
  // el catálogo; a partir de aquí la visibilidad real la decide el @media de
  // estilos.css (display:none <1024px, display:block ≥1024px) — [hidden]
  // tiene !important y taparía esa regla si no se quita aquí.
  const lateral = document.getElementById('carrito-lateral');
  if (!lateral) return;
  lateral.hidden = false;
  document.getElementById('lateral-items').innerHTML = hayItems
    ? html
    : '<p class="estado-lateral">Tu pedido está vacío.</p>';
  document.getElementById('btn-vaciar-lateral').hidden = !hayItems;
  const envioEl = document.getElementById('lateral-envio');
  envioEl.hidden = !hayItems || !envioTexto;
  envioEl.textContent = envioTexto;
  const totalEl = document.getElementById('lateral-total');
  totalEl.hidden = !hayItems;
  totalEl.innerHTML = hayItems ? totalBloqueHtml('lateral-total-cup', 'lateral-total-usd') : '';
  const lateralPolitica = document.getElementById('lateral-politica');
  lateralPolitica.hidden = !hayItems || !politica;
  lateralPolitica.innerHTML = politica ? escapeHtml(politica) : '';
  document.getElementById('btn-lateral-pedir').hidden = !hayItems;
}

// Vaciar pedido (2026-08-16): pide confirmación porque no hay deshacer.
// Limpia el estado (carrito + localStorage) y repinta TODO lo que depende de
// él — parrilla (para que las tarjetas vuelvan a "Añadir"), carrito (panel +
// aside) y barra móvil (vía guardarCarrito). Si el modal de detalle está
// abierto sobre un producto que estaba en el pedido, también se refresca.
function vaciarPedido() {
  if (!Object.keys(carrito).length) return;   // guarda defensiva: el botón está oculto si ya está vacío
  const ok = confirm('¿Vaciar tu pedido? Perderás lo que agregaste y no se puede deshacer.');
  if (!ok) return;
  carrito = {};
  guardarCarrito();
  localStorage.removeItem('carrito');
  renderGrid();
  renderCarrito();
  if (productoModal) refrescarAcciones(productoModal);
}

function abrirCarrito() {
  renderCarrito();
  elementoAnteriorFoco = document.activeElement;
  const panel = document.getElementById('panel');
  panel.hidden = false;
  document.getElementById('btn-cerrar-carrito').focus();
  document.addEventListener('keydown', capturarTecladoCarrito);
}

function cerrarCarrito() {
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

function enviarPorWhatsApp(ev) {
  if (ev) ev.preventDefault();
  const items = itemsCarrito();
  if (!items.length) return;   // el formulario está oculto sin items; guarda defensiva

  const nombre = document.getElementById('c-nombre').value.trim();
  const tel = document.getElementById('c-tel').value.trim();
  const dir = document.getElementById('c-dir').value.trim();
  const nota = document.getElementById('c-nota').value.trim();

  marcarError('c-nombre', 'err-nombre', !nombre);
  marcarError('c-tel', 'err-tel', !tel);
  marcarError('c-dir', 'err-dir', !dir);
  if (!nombre || !tel || !dir) {
    const primerInvalido = !nombre ? 'c-nombre' : (!tel ? 'c-tel' : 'c-dir');
    document.getElementById(primerInvalido).focus();
    return;
  }

  const v = resolverVendedor();
  const eg = envioGratis();
  const m = mensajeria();
  const lineas = ['🛒 *Pedido desde la web*'];
  if (v) lineas.push(`👤 Vendedor: ${v.code}`);
  lineas.push('');
  items.forEach(({ p, qty }) => lineas.push(`• ${p.name} x${qty} — ${fmt(p.precioCUP * qty)} CUP`));
  lineas.push('');
  if (m.activa) {
    // Mismo desglose que el carrito: Productos / Mensajería / Total.
    lineas.push(`Productos: ${fmt(totalCarrito())} CUP`);
    lineas.push(m.gratis
      ? `Mensajería: GRATIS (pedido desde ${fmt(eg.umbral)} CUP)`
      : `Mensajería: ${fmt(m.monto)} CUP (se confirma según la zona)`);
    lineas.push(`*Total: ${fmt(totalGeneralCUP())} CUP*`);
  } else {
    lineas.push(`*Total: ${fmt(totalCarrito())} CUP*`);
    if (eg.activo && eg.alcanzado) lineas.push(`Mensajería: GRATIS (pedido desde ${fmt(eg.umbral)} CUP)`);
  }
  lineas.push('');
  lineas.push(`Nombre: ${nombre}`, `Tel: ${tel}`, `Dirección: ${dir}`);
  if (nota) lineas.push(`Nota: ${nota}`);
  const politica = politicaTexto();
  if (politica) lineas.push('', politica);

  window.open(`https://wa.me/${CAT.whatsapp}?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');
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
}

// ── Marca: nombre de la tienda (CAT.tienda.nombre, con '3B Store' de reserva) ──

function renderMarca() {
  const t = (CAT && CAT.tienda) || {};
  const nombre = (t.nombre && t.nombre.trim()) || '3B Store';
  document.title = nombre + ' — Tienda';
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

async function cargarCatalogo() {
  document.getElementById('error-carga').hidden = true;
  document.getElementById('vacio').hidden = true;
  document.getElementById('grid').hidden = true;
  document.getElementById('skeleton').hidden = false;
  try {
    const r = await fetch('catalogo.json?v=' + Date.now());   // sin caché: el precio tiene que ser el de ahora
    if (!r.ok) throw new Error('HTTP ' + r.status);
    CAT = await r.json();
  } catch (err) {
    document.getElementById('skeleton').hidden = true;
    document.getElementById('error-carga').hidden = false;
    return;
  }

  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
  document.getElementById('actualizado').textContent =
    'Catálogo actualizado el ' + new Date(CAT.generado).toLocaleString('es-MX');

  renderMarca();
  renderHero();
  guardarCarrito();
  renderCarrito();   // el aside lateral (≥1024px) no espera a que se abra el panel modal
  renderFiltroPill();
  renderCategorias3D();
  renderGrid();
  renderFooterExtra();
  renderPromoEnvio();
  document.getElementById('skeleton').hidden = true;
  document.getElementById('grid').hidden = false;
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

  document.getElementById('modal-cerrar').addEventListener('click', cerrarDetalle);
  document.getElementById('modal-fondo').addEventListener('click', cerrarDetalle);

  document.getElementById('categorias-3d').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat3d');
    if (!btn) return;
    if (btn.dataset.oferta) setOferta(); else setCat(btn.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('filtro-pill').addEventListener('click', () => setCat(''));
  document.getElementById('btn-cats-ver-todas').addEventListener('click', toggleCatsExpandidas);

  document.getElementById('btn-ver-todo').addEventListener('click', () => {
    busqueda = ''; filtroCat = ''; filtroOferta = false;
    document.getElementById('buscador').value = '';
    renderFiltroPill(); renderCategorias3D(); renderGrid();
  });
  document.getElementById('btn-reintentar').addEventListener('click', cargarCatalogo);

  // Delegación: tarjetas abren el detalle; los controles de cantidad no (viven dentro de .card-accion).
  document.getElementById('grid').addEventListener('click', (e) => {
    if (e.target.closest('.card-accion')) return;
    const card = e.target.closest('.card');
    if (card) abrirDetalle(card.dataset.id);
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
    if (add) { e.stopPropagation(); addCarrito(add.dataset.add); }
    else if (minus) { e.stopPropagation(); quitarCarrito(minus.dataset.minus); }
    else if (plus) { e.stopPropagation(); addCarrito(plus.dataset.plus); }
  });

  window.addEventListener('scroll', actualizarHeaderScroll, { passive: true });
  // Si la ventana cruza el punto de corte de escritorio/móvil (o gira el
  // teléfono) mientras la barra está o no está, se vuelve a medir.
  window.addEventListener('resize', reservarEspacioBarraMovil, { passive: true });
  window.addEventListener('resize', medirHeader, { passive: true });

  medirHeader();
  await cargarCatalogo();
}

iniciar();
