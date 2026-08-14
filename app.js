// app.js — tienda 3B. Lee catalogo.json y pinta el catálogo.
// Sin dependencias, sin backend: todo pasa en el navegador del cliente.
let CAT = null;          // el catalogo.json cargado
let filtroCat = '';      // categoría activa ('' = todas)
let busqueda = '';

// El código del vendedor sobrevive a la navegación: se guarda al entrar por su enlace.
function resolverVendedor() {
  const url = new URLSearchParams(location.search).get('ref');
  if (url) localStorage.setItem('ref', url.toUpperCase());
  const code = localStorage.getItem('ref') || '';
  const v = (CAT.vendedores || []).find((x) => x.code === code);
  if (!v) { localStorage.removeItem('ref'); return null; }   // código inválido o dado de baja
  return v;
}

function fmt(n) { return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

function visibles() {
  const q = busqueda.trim().toLowerCase();
  return (CAT.items || []).filter((p) => {
    if (filtroCat && p.cat !== filtroCat) return false;
    if (!q) return true;
    return (p.name + ' ' + p.notes + ' ' + p.subcat).toLowerCase().includes(q);
  });
}

function renderFiltros() {
  const cats = (CAT.categorias || []).filter((c) => (CAT.items || []).some((p) => p.cat === c.n));
  document.getElementById('filtros').innerHTML =
    `<button class="chip ${filtroCat === '' ? 'on' : ''}" onclick="setCat('')">Todo</button>` +
    cats.map((c) => `<button class="chip ${filtroCat === c.n ? 'on' : ''}" onclick="setCat('${c.n}')">${c.e || ''} ${c.n}</button>`).join('');
}

function setCat(n) { filtroCat = n; renderFiltros(); renderGrid(); }

function renderGrid() {
  const items = visibles();
  document.getElementById('vacio').hidden = items.length > 0;
  document.getElementById('grid').innerHTML = items.map((p) => `
    <div class="card">
      <img src="${p.photo}" alt="${p.name}" loading="lazy">
      <div class="body">
        <div class="nom">${p.name}</div>
        ${p.notes ? `<div class="desc">${p.notes}</div>` : ''}
        ${p.enOferta ? `<div><span class="badge">OFERTA</span> <span class="tachado">${fmt(p.precioNormalCUP)} CUP</span></div>` : ''}
        <div class="precio">${fmt(p.precioCUP)} CUP <span class="usd">· $${p.precioUSD}</span></div>
        <div class="acc" id="acc-${p.id}"></div>
      </div>
    </div>`).join('');
  items.forEach((p) => renderAccion(p.id));
}

// ── Carrito ──
// { id: cantidad }. Vive en localStorage para que un refresco no borre el pedido.
let carrito = JSON.parse(localStorage.getItem('carrito') || '{}');

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
  const n = Object.values(carrito).reduce((s, q) => s + q, 0);
  document.getElementById('carrito-count').textContent = n;
  document.getElementById('btn-carrito').hidden = n === 0;
}

function addCarrito(id) { carrito[id] = (carrito[id] || 0) + 1; guardarCarrito(); renderAccion(id); renderCarrito(); }

function quitarCarrito(id) {
  carrito[id] = (carrito[id] || 0) - 1;
  if (carrito[id] <= 0) delete carrito[id];
  guardarCarrito(); renderAccion(id); renderCarrito();
}

function renderAccion(id) {
  const el = document.getElementById('acc-' + id);
  if (!el) return;
  const q = carrito[id] || 0;
  el.innerHTML = q === 0
    ? `<button class="add" onclick="addCarrito('${id}')">Añadir</button>`
    : `<div class="qty"><button onclick="quitarCarrito('${id}')">−</button><strong>${q}</strong><button onclick="addCarrito('${id}')">+</button></div>`;
}

function itemsCarrito() {
  return Object.entries(carrito)
    .map(([id, qty]) => ({ p: (CAT.items || []).find((x) => x.id === id), qty }))
    .filter((x) => x.p);   // un producto agotado desaparece del catálogo: se cae del carrito solo
}

function totalCarrito() {
  return itemsCarrito().reduce((s, { p, qty }) => s + p.precioCUP * qty, 0);
}

function renderCarrito() {
  const items = itemsCarrito();
  document.getElementById('carrito-items').innerHTML = items.length
    ? items.map(({ p, qty }) => `<div class="linea"><div>${p.name}<br><span style="color:var(--text3)">x${qty}</span></div><div>${fmt(p.precioCUP * qty)} CUP</div></div>`).join('')
    : '<div class="vacio">Tu pedido está vacío.</div>';
  document.getElementById('carrito-total').textContent = items.length ? `Total: ${fmt(totalCarrito())} CUP` : '';
}

function abrirCarrito() { renderCarrito(); document.getElementById('panel').hidden = false; }
function cerrarCarrito() { document.getElementById('panel').hidden = true; }

function enviarPorWhatsApp() {
  const items = itemsCarrito();
  if (!items.length) { alert('Tu pedido está vacío.'); return; }
  const nombre = document.getElementById('c-nombre').value.trim();
  const tel = document.getElementById('c-tel').value.trim();
  const dir = document.getElementById('c-dir').value.trim();
  const nota = document.getElementById('c-nota').value.trim();
  if (!nombre || !tel || !dir) { alert('Faltan tu nombre, teléfono o dirección.'); return; }

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

async function iniciar() {
  const r = await fetch('catalogo.json?v=' + Date.now());  // sin caché: el precio tiene que ser el de ahora
  CAT = await r.json();
  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
  document.getElementById('actualizado').textContent =
    'Catálogo actualizado el ' + new Date(CAT.generado).toLocaleString('es-MX');
  document.getElementById('buscador').addEventListener('input', (e) => { busqueda = e.target.value; renderGrid(); });
  document.getElementById('btn-carrito').addEventListener('click', abrirCarrito);
  guardarCarrito();
  renderFiltros();
  renderGrid();
}

iniciar();
