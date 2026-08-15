// app.js — tienda 3B. Lee catalogo.json y pinta el catálogo.
// Sin dependencias, sin backend: todo pasa en el navegador del cliente.
let CAT = null;          // el catalogo.json cargado
let filtroCat = '';      // categoría activa ('' = todas)
let filtroOferta = false;
let busqueda = '';
let elementoAnteriorFoco = null;   // para devolver el foco al cerrar modal/carrito
let productoModal = null;

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

// Recuadro con la inicial cuando la foto no carga.
// data-fallback (si viene, p.ej. el emoji de categoría) manda sobre el alt.
function imgFallback(img) {
  const cont = img.closest('.card-foto') || img.closest('.modal-foto') || img.closest('.cat3d-foto');
  if (!cont) return;
  const desdeAlt = (img.alt || '').trim().charAt(0).toUpperCase();
  const inicial = img.dataset.fallback || desdeAlt || '?';
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

function setCat(n) { filtroCat = n; filtroOferta = false; renderFiltros(); renderCategorias3D(); renderGrid(); }
function setOferta() { filtroOferta = true; filtroCat = ''; renderFiltros(); renderCategorias3D(); renderGrid(); }

function renderFiltros() {
  const items = CAT.items || [];
  const cats = (CAT.categorias || []).filter((c) => items.some((p) => p.cat === c.n));
  const nOfertas = items.filter((p) => p.enOferta).length;
  const chipsCat = cats.map((c) => {
    const n = items.filter((p) => p.cat === c.n).length;
    const activo = !filtroOferta && filtroCat === c.n;
    return `<button class="chip ${activo ? 'on' : ''}" aria-pressed="${activo}" onclick="setCat('${c.n}')">` +
      `<span class="icono" aria-hidden="true">${c.e || ''}</span> ${escapeHtml(c.n)} <span class="n">${n}</span></button>`;
  }).join('');
  const activoTodo = !filtroOferta && filtroCat === '';
  document.getElementById('filtros').innerHTML =
    `<button class="chip ${activoTodo ? 'on' : ''}" aria-pressed="${activoTodo}" onclick="setCat('')">Todo</button>` +
    (nOfertas > 0 ? `<button class="chip ${filtroOferta ? 'on' : ''}" aria-pressed="${filtroOferta}" onclick="setOferta()">🏷️ Ofertas <span class="n">${nOfertas}</span></button>` : '') +
    chipsCat;
}

// ── Categorías 3D (portada) ──
// Tarjetas grandes con foto real de la categoría; hacen lo mismo que un chip de filtro.

function categoriaFoto(catName) {
  const items = (CAT.items || []).filter((p) => p.cat === catName);
  const p = items.find((x) => esCloudinary(x.photo)) || items.find((x) => x.photo);
  return p ? fotoCard(p.photo).src : '';
}

function renderCategorias3D() {
  const cont = document.getElementById('categorias-3d');
  if (!cont) return;
  const items = CAT.items || [];
  const cats = (CAT.categorias || []).filter((c) => items.some((p) => p.cat === c.n));
  cont.innerHTML = cats.map((c) => {
    const n = items.filter((p) => p.cat === c.n).length;
    const activo = !filtroOferta && filtroCat === c.n;
    const foto = categoriaFoto(c.n);
    const marcador = escapeHtml(c.e || c.n.charAt(0).toUpperCase());
    const fotoHtml = foto
      ? `<img src="${foto}" alt="" loading="lazy" data-fallback="${marcador}" onerror="imgFallback(this)">`
      : `<span class="inicial" aria-hidden="true">${marcador}</span>`;
    return `<button class="cat3d ${activo ? 'on' : ''}" type="button" data-cat="${escapeHtml(c.n)}" aria-pressed="${activo}">` +
      `<span class="cat3d-inner">` +
      `<span class="cat3d-foto">${fotoHtml}</span>` +
      `<span class="cat3d-info">` +
      `<span class="cat3d-nombre"><span class="cat3d-emoji" aria-hidden="true">${c.e || ''}</span>${escapeHtml(c.n)}</span>` +
      `<span class="cat3d-n">${n} producto${n === 1 ? '' : 's'}</span>` +
      `</span></span></button>`;
  }).join('');
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
        <div class="precio-linea">
          ${p.enOferta ? `<span class="tachado">${fmt(p.precioNormalCUP)} CUP</span>` : ''}
          <span class="precio">${fmt(p.precioCUP)} CUP<span class="usd">· $${p.precioUSD}</span></span>
        </div>
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
  document.getElementById('modal-precio').innerHTML =
    (p.enOferta ? `<span class="tachado">${fmt(p.precioNormalCUP)} CUP</span>` : '') +
    `<span class="precio">${fmt(p.precioCUP)} CUP<span class="usd">· $${p.precioUSD}</span></span>`;
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
  if (n === 0) { barra.hidden = true; return; }
  barra.hidden = false;
  document.getElementById('barra-movil-info').textContent = `${n} producto${n === 1 ? '' : 's'} · ${fmt(totalCarrito())} CUP`;
}

function renderCarrito() {
  const items = itemsCarrito();
  const hayItems = items.length > 0;
  document.getElementById('carrito-items').innerHTML = items.map(({ p, qty }) => lineaCarritoHtml(p, qty)).join('');
  document.getElementById('carrito-vacio').hidden = hayItems;
  document.getElementById('carrito-total').hidden = !hayItems;
  document.getElementById('form-pedido').hidden = !hayItems;
  document.getElementById('carrito-total').textContent = hayItems ? `Total: ${fmt(totalCarrito())} CUP` : '';
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
  const lineas = ['🛒 *Pedido desde la web*'];
  if (v) lineas.push(`👤 Vendedor: ${v.code}`);
  lineas.push('');
  items.forEach(({ p, qty }) => lineas.push(`• ${p.name} x${qty} — ${fmt(p.precioCUP * qty)} CUP`));
  lineas.push('', `*Total: ${fmt(totalCarrito())} CUP*`, '');
  lineas.push(`Nombre: ${nombre}`, `Tel: ${tel}`, `Dirección: ${dir}`);
  if (nota) lineas.push(`Nota: ${nota}`);

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

  const contactoSec = document.getElementById('footer-contacto');
  const links = document.getElementById('footer-contacto-links');
  const piezas = [];
  if (CAT.whatsapp) {
    piezas.push(`<a class="footer-link footer-link-wa" href="https://wa.me/${escapeHtml(CAT.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
  }
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
  renderFiltros();
  renderCategorias3D();
  renderGrid();
  renderFooterExtra();
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
  document.getElementById('btn-cerrar-carrito').addEventListener('click', cerrarCarrito);
  document.getElementById('btn-cerrar-carrito-2').addEventListener('click', cerrarCarrito);
  document.getElementById('panel-fondo').addEventListener('click', cerrarCarrito);
  document.getElementById('form-pedido').addEventListener('submit', enviarPorWhatsApp);

  document.getElementById('modal-cerrar').addEventListener('click', cerrarDetalle);
  document.getElementById('modal-fondo').addEventListener('click', cerrarDetalle);

  document.getElementById('categorias-3d').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat3d');
    if (!btn) return;
    setCat(btn.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('btn-ver-todo').addEventListener('click', () => {
    busqueda = ''; filtroCat = ''; filtroOferta = false;
    document.getElementById('buscador').value = '';
    renderFiltros(); renderCategorias3D(); renderGrid();
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

  await cargarCatalogo();
}

iniciar();
