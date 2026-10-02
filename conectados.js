// conectados.js — Conectados (remesas). Lee conectados.json, calcula y arma el
// mensaje de WhatsApp. Sin dependencias y sin backend.
//
// La cuenta NO esta aqui: esta en remesa-calc.js, que es el port de
// lib/remesaTarifa.js de Stock+ y tiene un test de paridad. Si tocas la formula,
// tocala alli y en el original, nunca aqui.
//
// Nada de lo que el cliente escribe sale de su navegador: viaja dentro del
// mensaje de WhatsApp que el mismo envia, y a ningun otro sitio.

let CN = null;                 // el conectados.json cargado
let REF = null;                // {code, nombre} del referidor que trajo al cliente
let MODO = 'recibe';           // 'recibe' = teclea lo que llega · 'paga' = lo que paga
const PARAMS = new URLSearchParams(location.search);
const REF_GUARDADO = 'conectados_ref';
const COD_GUARDADO = 'conectados_cod';

// ── Utilidades ──

function el(id) { return document.getElementById(id); }
function fmtCUP(n) { return Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }
function fmtUSD(n) { return Number(n || 0).toFixed(2); }

// 🔴 api.whatsapp.com/send y NO wa.me: el redirector de wa.me destroza los emojis
// (los deja en el caracter de reemplazo). Mismo criterio que taxi.js.
function waLink(tel, texto) {
  const n = String(tel || '').replace(/\D/g, '');
  if (!n) return '';
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(texto)}`;
}

// ── Codigo del envio ──
// Sin backend no hay numero de orden de verdad: esto es una etiqueta para que
// Ruth pueda casar "captura <-> datos <-> entrega" entre veinte chats iguales.
// Sin letras que se confundan con numeros (I, O, 0, 1).
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function nuevoCodigo() {
  const buf = new Uint8Array(5);
  (self.crypto || {}).getRandomValues ? self.crypto.getRandomValues(buf) : buf.forEach((_, i) => { buf[i] = Math.floor(Math.random() * 256); });
  let s = '';
  for (const b of buf) s += ALFABETO[b % ALFABETO.length];
  return `CN-${s}`;
}

// Se guarda en sessionStorage para que recargar la pagina no cambie el codigo a
// medio rellenar. En modo privado puede fallar: entonces se vive sin memoria.
function codigoDeSesion() {
  try {
    const g = sessionStorage.getItem(COD_GUARDADO);
    if (g) return g;
    const c = nuevoCodigo();
    sessionStorage.setItem(COD_GUARDADO, c);
    return c;
  } catch (e) { return nuevoCodigo(); }
}

// ── Referidor ──
// El codigo viaja en el mensaje: es lo UNICO que dice a quien apuntarle el envio.
function cargarRef() {
  const buscar = (code) => (CN.referidores || []).find((r) => r.code === String(code || '').toUpperCase());
  try {
    const dePar = PARAMS.get('ref');
    if (dePar) {
      const r = buscar(dePar);
      if (r) { REF = r; try { localStorage.setItem(REF_GUARDADO, r.code); } catch (e) { /* modo privado */ } }
    }
    if (!REF) {
      const guardado = localStorage.getItem(REF_GUARDADO);
      if (guardado) REF = buscar(guardado);
    }
    // El mismo gestor vale en los cuatro negocios: si vino por la tienda, cuenta.
    if (!REF) {
      const deTienda = localStorage.getItem('ref');
      if (deTienda) REF = buscar(deTienda);
    }
  } catch (e) { /* sin localStorage se sigue sin recordar; no es grave */ }
}

function renderRef() {
  const caja = el('cn-ref');
  if (!REF) { caja.hidden = true; return; }
  el('cn-ref-nombre').textContent = REF.nombre;
  caja.hidden = false;
}

// ── Vigencia ──
// Pasada la vigencia el precio sigue a la vista pero deja de ser una promesa:
// es lo que impide que alguien llegue con una captura de la tasa de hace tres dias.
function vigente() {
  const t = Date.parse(CN && CN.generado) || 0;
  const horas = Number(CN && CN.vigenciaHoras) || 6;
  return Date.now() < t + horas * 3600000;
}

// ── Carga ──

async function cargar() {
  el('cn-error').hidden = true;
  try {
    const r = await fetch(`conectados.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    CN = await r.json();
  } catch (e) {
    el('cn-error').hidden = false;
    el('cn-cuerpo').hidden = true;
    return;
  }
  cargarRef();
  pintar();
}

function pintar() {
  const marca = CN.marca || {};
  el('cn-titulo').textContent = marca.nombre || 'Conectados';
  if (marca.lema) el('cn-lema').textContent = marca.lema;
  document.title = `${marca.nombre || 'Conectados'} — Remesas a Cuba`;

  renderRef();

  // Apagado: el cliente no se queda sin puerta, se le manda a WhatsApp.
  if (!CN.activo) {
    el('cn-cuerpo').hidden = true;
    el('cn-apagado').hidden = false;
    const enlace = waLink(CN.whatsapp, 'Hola, quiero mandar una remesa a Cuba.');
    const btn = el('cn-wa-apagado');
    if (enlace) btn.href = enlace; else btn.hidden = true;
    return;
  }
  el('cn-apagado').hidden = true;
  el('cn-cuerpo').hidden = false;

  if (CN.entregados > 0) {
    el('cn-entregados').textContent = `✅ ${fmtCUP(CN.entregados)} envíos entregados`;
    el('cn-entregados').hidden = false;
  }
  for (const [id, txt] of [['cn-comofunciona', marca.comoFunciona], ['cn-politica', marca.politica], ['cn-aviso', marca.aviso]]) {
    if (txt) { el(id).textContent = txt; el(id).hidden = false; }
  }

  el('cn-entrega').innerHTML = (CN.entregas || [])
    .map((e) => `<option value="${e.id}">${e.nombre}</option>`).join('');
  el('cn-pago').innerHTML = (CN.pagos || [])
    .map((p) => `<option value="${p.id}">${p.nombre}${p.paises ? ` — ${p.paises}` : ''}</option>`).join('');

  el('cn-codigo').textContent = codigoDeSesion();

  // El reclamo de gestores solo si hay a donde escribir.
  if (CN.whatsappAltas) {
    el('cn-cta-gana').hidden = false;
    if (CN.comisionGestorPct > 0) {
      el('cn-gana-cifra').textContent = `Ganas un ${CN.comisionGestorPct}% de la comisión de cada envío que traigas.`;
      el('cn-gana-cifra').hidden = false;
    }
  }

  calcular();
}

// ── La calculadora ──

function entregaActual() {
  const id = el('cn-entrega').value;
  return (CN.entregas || []).find((e) => e.id === id) || null;
}

function pagoActual() {
  const id = el('cn-pago').value;
  return (CN.pagos || []).find((p) => p.id === id) || null;
}

// Devuelve la cotizacion de lo que hay en pantalla, o null si no se puede.
function cotizacion() {
  if (!CN) return null;
  const entrega = entregaActual();
  const monto = Number(el('cn-monto').value) || 0;
  if (!entrega || !(monto > 0)) return null;
  const rec = entrega.recargoPct || 0;
  return MODO === 'recibe'
    ? RemesaCalc.cotizar(monto, CN.comision, rec)
    : RemesaCalc.cotizarInverso(monto, CN.comision, rec);
}

function calcular() {
  const caja = el('cn-resultado');
  const entrega = entregaActual();

  el('cn-monto-label').textContent = MODO === 'recibe'
    ? '¿Cuánto quieres que reciba? (USD)'
    : '¿Cuánto vas a pagar tú? (USD)';

  const nota = el('cn-nota-entrega');
  if (entrega && entrega.nota) { nota.textContent = entrega.nota; nota.hidden = false; } else { nota.hidden = true; }

  const c = cotizacion();
  if (!c) { caja.innerHTML = ''; actualizarBoton(); return; }

  if (!c.valido) {
    const min = CN.comision.minimoUSD, max = CN.comision.maximoUSD;
    const msg = c.motivo === 'minimo' ? `El envío mínimo es de $${fmtUSD(min)} USD.`
      : c.motivo === 'maximo' ? `El envío máximo es de $${fmtUSD(max)} USD. Para más, escríbenos.`
      : 'Pon un monto para calcular.';
    caja.innerHTML = `<p class="cn-res-error">${msg}</p>`;
    actualizarBoton();
    return;
  }

  const cup = entrega.moneda === 'CUP' ? RemesaCalc.enCUP(c.recibeUSD, CN.tasa) : 0;
  caja.innerHTML = `
    <div class="cn-res-caja">
      <div class="cn-res-linea"><span>Tú pagas</span><span class="cn-res-grande">$${fmtUSD(c.pagaUSD)}</span></div>
      <div class="cn-res-linea"><span>Recibe</span><span class="cn-res-grande">$${fmtUSD(c.recibeUSD)}</span></div>
      ${cup ? `<div class="cn-res-linea cn-res-cup"><span>Que son</span><span>${fmtCUP(cup)} CUP</span></div>` : ''}
      <div class="cn-res-detalle">Comisión del ${c.pct}%: $${fmtUSD(c.comisionUSD)} · Entrega: ${entrega.nombre}${cup ? ` · Tasa ${fmtCUP(CN.tasa)} CUP/USD` : ''}</div>
    </div>`;

  const v = el('cn-vigencia');
  if (!vigente()) {
    v.textContent = '⚠️ Esta tasa lleva un rato publicada. Confírmala con nosotros antes de pagar.';
    v.hidden = false;
  } else {
    v.textContent = `Esta cotización vale ${CN.vigenciaHoras} h.`;
    v.hidden = false;
  }

  actualizarBoton();
}

// ── El mensaje ──

const OBLIGATORIOS = [
  ['cn-de-nombre', 'tu nombre'],
  ['cn-a-nombre', 'el nombre y los apellidos de quien recibe'],
  ['cn-a-tel', 'su teléfono'],
  ['cn-a-dir', 'la dirección'],
  ['cn-a-mun', 'el municipio y la provincia'],
];

function faltantes() {
  return OBLIGATORIOS.filter(([id]) => !el(id).value.trim()).map(([, nombre]) => nombre);
}

function mensaje() {
  const c = cotizacion();
  const entrega = entregaActual();
  const pago = pagoActual();
  if (!c || !c.valido || !entrega) return '';
  const cup = entrega.moneda === 'CUP' ? RemesaCalc.enCUP(c.recibeUSD, CN.tasa) : 0;
  const v = (id) => el(id).value.trim();
  const lineas = [
    `${(CN.marca || {}).nombre || 'CONECTADOS'} — Envío ${el('cn-codigo').textContent}`,
    '',
    `Quien manda: ${v('cn-de-nombre')}`,
    `Paga por: ${pago ? pago.nombre : '(por decidir)'}`,
    `Paga: $${fmtUSD(c.pagaUSD)} USD`,
    `Recibe: $${fmtUSD(c.recibeUSD)} USD${cup ? ` → ${fmtCUP(cup)} CUP` : ''}`,
    `Entrega: ${entrega.nombre}`,
    '',
    'DESTINATARIO',
    `Nombre: ${v('cn-a-nombre')}`,
    v('cn-a-ci') ? `CI: ${v('cn-a-ci')}` : null,
    `Teléfono: ${v('cn-a-tel')}`,
    `Dirección: ${v('cn-a-dir')}`,
    `Municipio/Provincia: ${v('cn-a-mun')}`,
    v('cn-nota') ? `Nota: ${v('cn-nota')}` : null,
    '',
    '(Adjunto aquí la captura de mi pago 📎)',
  // null = campo opcional vacio (se quita). '' = separador de parrafo a proposito (se queda).
  ].filter((l) => l !== null);
  if (REF) lineas.push('', `Ref: ${REF.code}`);
  return lineas.join('\n');
}

function actualizarBoton() {
  const btn = el('cn-enviar');
  const c = cotizacion();
  const faltan = faltantes();
  const aviso = el('cn-faltan');

  if (!c || !c.valido) {
    btn.setAttribute('aria-disabled', 'true');
    btn.removeAttribute('href');
    aviso.hidden = true;
    return;
  }
  if (faltan.length) {
    btn.setAttribute('aria-disabled', 'true');
    btn.removeAttribute('href');
    aviso.textContent = `Falta ${faltan.join(', ')}.`;
    aviso.hidden = false;
    return;
  }
  aviso.hidden = true;
  btn.removeAttribute('aria-disabled');
  btn.href = waLink(CN.whatsapp, mensaje());
}

// ── Enganches (todos aqui: el CSP prohibe los onclick del HTML) ──

function enganchar() {
  el('cn-modo-recibe').addEventListener('click', () => {
    MODO = 'recibe';
    el('cn-modo-recibe').classList.add('cn-sentido-on');
    el('cn-modo-paga').classList.remove('cn-sentido-on');
    el('cn-modo-recibe').setAttribute('aria-pressed', 'true');
    el('cn-modo-paga').setAttribute('aria-pressed', 'false');
    calcular();
  });
  el('cn-modo-paga').addEventListener('click', () => {
    MODO = 'paga';
    el('cn-modo-paga').classList.add('cn-sentido-on');
    el('cn-modo-recibe').classList.remove('cn-sentido-on');
    el('cn-modo-paga').setAttribute('aria-pressed', 'true');
    el('cn-modo-recibe').setAttribute('aria-pressed', 'false');
    calcular();
  });

  el('cn-monto').addEventListener('input', calcular);
  el('cn-entrega').addEventListener('change', calcular);
  el('cn-pago').addEventListener('change', actualizarBoton);
  for (const [id] of OBLIGATORIOS) el(id).addEventListener('input', actualizarBoton);
  for (const id of ['cn-a-ci', 'cn-nota']) el(id).addEventListener('input', actualizarBoton);

  el('cn-reintentar').addEventListener('click', cargar);

  el('cn-ref-quitar').addEventListener('click', () => {
    REF = null;
    try { localStorage.removeItem(REF_GUARDADO); } catch (e) { /* nada que hacer */ }
    renderRef();
    actualizarBoton();
  });

  el('cn-copiar').addEventListener('click', async () => {
    const txt = mensaje();
    if (!txt) return;
    try { await navigator.clipboard.writeText(txt); el('cn-copiar').textContent = '✅ Copiado'; }
    catch (e) { el('cn-copiar').textContent = '😕 No pude copiar'; }
    setTimeout(() => { el('cn-copiar').textContent = '📋 Copiar los datos'; }, 2000);
  });

  const modal = el('cn-modal-gana');
  const abrir = () => {
    const tel = CN.whatsappAltas || CN.whatsapp;
    const texto = REF ? `QUIERO GANAR CON CONECTADOS\n\nMe lo recomendó: ${REF.code}` : 'QUIERO GANAR CON CONECTADOS';
    const enlace = waLink(tel, texto);
    const wa = el('cn-gana-wa');
    if (enlace) { wa.href = enlace; wa.hidden = false; } else { wa.hidden = true; }
    modal.hidden = false;
  };
  el('cn-cta-gana').addEventListener('click', abrir);
  el('cn-gana-cerrar').addEventListener('click', () => { modal.hidden = true; });
  el('cn-gana-fondo').addEventListener('click', () => { modal.hidden = true; });
}

document.addEventListener('DOMContentLoaded', () => { enganchar(); cargar(); });
