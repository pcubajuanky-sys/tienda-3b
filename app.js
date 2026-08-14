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

// La Task 7 reemplaza esto por el control de cantidad del carrito.
function renderAccion(id) {
  const el = document.getElementById('acc-' + id);
  if (el) el.innerHTML = '';
}

async function iniciar() {
  const r = await fetch('catalogo.json?v=' + Date.now());  // sin caché: el precio tiene que ser el de ahora
  CAT = await r.json();
  const v = resolverVendedor();
  document.getElementById('vendedor').textContent = v ? `Te atiende: ${v.nombre}` : '';
  document.getElementById('actualizado').textContent =
    'Catálogo actualizado el ' + new Date(CAT.generado).toLocaleString('es-MX');
  document.getElementById('buscador').addEventListener('input', (e) => { busqueda = e.target.value; renderGrid(); });
  renderFiltros();
  renderGrid();
}

iniciar();
