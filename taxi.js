// taxi.js — Taxi 3B. Lee taxi.json y pinta la calculadora y la pizarra.
// Sin dependencias, sin backend: todo pasa en el navegador del cliente.
//
// AQUI NO SE CALCULA NINGUN PRECIO. Los precios vienen ya calculados desde
// Stock+ (taxi.json). Lo unico que se suma aqui son las horas de espera, con el
// precio por hora que tambien viene dado. Asi el margen nunca sale de la PC.

let TX = null;                 // el taxi.json cargado
let REF = null;                // {code, nombre} del referidor que trajo al cliente
const PARAMS = new URLSearchParams(location.search);
const REF_GUARDADO = 'taxi3b_ref';

// ── Utilidades ──

function fmt(n) { return Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function el(id) { return document.getElementById(id); }

// Todo mensaje que sale de aqui lleva el codigo del referidor al final: es lo
// UNICO que le dice al chofer a quien apuntarle el viaje. Si no va en el mensaje,
// la comision se pierde.
function waLink(texto) {
  const tel = (TX && TX.whatsapp) ? TX.whatsapp : '';
  const cuerpo = REF ? `${texto}\n\nRef: ${REF.code}` : texto;
  return `https://wa.me/${tel}?text=${encodeURIComponent(cuerpo)}`;
}

// El referidor llega por ?ref=CODIGO y se RECUERDA: el cliente puede mirar
// precios un rato, cerrar y volver antes de escribir por WhatsApp.
// Un codigo invalido se ignora en silencio: no es problema del cliente.
function resolverReferidor() {
  const lista = (TX && TX.referidores) || [];
  const buscar = (c) => lista.find((r) => r.code === String(c || '').trim().toUpperCase()) || null;

  const dePARAMS = PARAMS.get('ref');
  if (dePARAMS) {
    const r = buscar(dePARAMS);
    if (r) {
      REF = r;
      try { localStorage.setItem(REF_GUARDADO, r.code); } catch (e) { /* modo privado */ }
      return;
    }
  }
  try {
    const guardado = localStorage.getItem(REF_GUARDADO);
    if (guardado) REF = buscar(guardado);
  } catch (e) { /* sin localStorage se sigue sin recordar; no es grave */ }
}

function renderReferidor() {
  const caja = el('tx-ref');
  if (!REF) { caja.hidden = true; return; }
  el('tx-ref-nombre').textContent = REF.nombre;
  caja.hidden = false;
}

function olvidarReferidor() {
  REF = null;
  try { localStorage.removeItem(REF_GUARDADO); } catch (e) { /* nada que hacer */ }
  renderReferidor();
  if (TX && TX.activo) { renderResultado(); renderPizarra(); renderOtro(); renderPropon(); }
}

// La cotizacion caduca: pasada la vigencia el precio sigue a la vista, pero deja
// de ser una promesa. Es lo que impide que alguien llegue con una captura vieja.
function caduca() {
  const t = Date.parse(TX && TX.generado) || 0;
  const horas = Number(TX && TX.vigenciaHoras) || 72;
  return t + horas * 3600000;
}
function vigente() { return Date.now() < caduca(); }

function fechaLarga(ms) {
  return new Date(ms).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

function haceCuanto(ms) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

// Valor del selector cuando el cliente pone los km a mano.
const KM_LIBRE = '__km';

// Un destino "de mentira" armado con la recta publicada, con la MISMA forma que
// los del tarifario, para que todo lo de abajo no tenga que saber de dónde salió.
function destinoDeKm(km) {
  const r = TX && TX.recta;
  if (!r || !(km > 0)) return null;
  const techo = (n) => (r.redondeoCUP > 0 ? Math.ceil(n / r.redondeoCUP) * r.redondeoCUP : Math.round(n));
  const base = km * r.porKmCUP + r.baseCUP;
  const factor = Number(r.factorCompartido) > 0 ? Number(r.factorCompartido) : 1;
  const asientoCUP = {};
  for (let n = 2; n <= 4; n++) asientoCUP[n] = techo(base * factor / n);
  return { id: KM_LIBRE, nombre: `tu destino (${km} km)`, km, idaCUP: techo(base), asientoCUP, libre: true };
}

function destinoActual() {
  const id = el('tx-destino').value;
  if (id === KM_LIBRE) return destinoDeKm(Number(el('tx-km-libre').value) || 0);
  return (TX.destinos || []).find((d) => d.id === id) || null;
}

// ── La calculadora ──

// El viaje privado NO tiene opcion de "solo ida": el viaje se cobra siempre
// completo (el carro va y regresa igual). Lo unico que lo mueve es la espera.
// "Solo ida" existe unicamente en los viajes compartidos, donde cada quien paga
// su asiento de un trayecto.
function precioActual() {
  const d = destinoActual();
  if (!d) return null;
  const asientos = Number(el('tx-asientos').value) || 1;
  if (asientos > 1) {
    const cup = (d.asientoCUP || {})[asientos] || 0;
    return { cup, etiqueta: `por persona, solo ida, entre ${asientos}`, compartido: true, asientos };
  }
  const horas = Number(el('tx-horas').value) || 0;
  const espera = horas * (Number(TX.esperaHoraCUP) || 0);
  return {
    cup: (d.idaCUP || 0) + espera,
    etiqueta: horas ? `viaje completo, ${horas} h de espera` : 'viaje completo',
    compartido: false,
    horas,
  };
}

function renderResultado() {
  const d = destinoActual();
  const p = precioActual();
  const caja = el('tx-resultado');
  // Con "yo pongo los km" y el campo vacío todavía no hay nada que decir.
  if (!d || !p) {
    caja.innerHTML = el('tx-destino').value === KM_LIBRE
      ? '<div class="tx-esperando">Escribe los kilómetros y te digo el precio.</div>'
      : '';
    return;
  }

  const usd = (TX.tasa > 1) ? (p.cup / TX.tasa).toFixed(2) : null;
  // Con km puestos por el cliente el cálculo es el mismo, pero la distancia la
  // puso él: se dice, para que nadie se sienta engañado si luego no cuadra.
  const suyo = `<div class="tx-vigencia">Calculado con los ${d.km} km que pusiste. Lo confirmamos por WhatsApp.</div>`;
  const vig = vigente()
    ? `<div class="tx-vigencia">Precio válido hasta el ${fechaLarga(caduca())}.</div>`
    : `<div class="tx-vigencia tx-caducado">Precio orientativo — confírmalo por WhatsApp.</div>`;
  const desglose = (TX.mostrarDesglose && d.combustibleCUP)
    ? `<div class="tx-desglose">Combustible ≈ ${fmt(d.combustibleCUP)} CUP · el resto es el servicio.</div>`
    : '';

  caja.innerHTML = `<div class="tx-precio">${fmt(p.cup)} CUP</div>` +
    (usd ? `<div class="tx-precio-usd">≈ $${usd} USD · ${escapeHtml(p.etiqueta)}</div>` : `<div class="tx-precio-usd">${escapeHtml(p.etiqueta)}</div>`) +
    desglose + (d.libre ? suyo : vig);

  const lineas = [
    '🚕 *Taxi 3B*',
    `Destino: ${d.nombre}`,
    `Viaje: ${p.etiqueta}`,
    `Precio: ${fmt(p.cup)} CUP`,
    '',
    'Quiero coordinar este viaje.',
  ];
  el('tx-pedir').href = waLink(lineas.join('\n'));
}

function renderCalculadora() {
  const sel = el('tx-destino');
  // La opción de poner los km va DENTRO del selector, no escondida más abajo:
  // saber el precio de cualquier sitio es de lo que más engancha de esta página.
  const opcionKm = (TX && TX.recta)
    ? `<option value="${KM_LIBRE}">✏️ Otro lugar — yo pongo los km</option>`
    : '';
  sel.innerHTML = (TX.destinos || []).map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.nombre)}</option>`).join('') + opcionKm;

  // Enlace compartido: /taxi?d=<destino>&a=2&h=1 reabre el viaje ya elegido.
  // Con km puestos a mano viaja además &k=<km>.
  const d = PARAMS.get('d');
  if (d && (TX.destinos || []).some((x) => x.id === d)) sel.value = d;
  const k = Number(PARAMS.get('k'));
  if (d === KM_LIBRE && TX.recta && k > 0) {
    sel.value = KM_LIBRE;
    el('tx-km-libre').value = k;
  }
  const a = PARAMS.get('a');
  if (a && ['1', '2', '3', '4'].includes(a)) el('tx-asientos').value = a;
  const h = PARAMS.get('h');
  if (h && [...el('tx-horas').options].some((o) => o.value === h)) el('tx-horas').value = h;

  sincronizarEspera();
  renderResultado();
}

// La espera solo tiene sentido en el viaje privado: en un compartido el carro
// no se queda esperando a un pasajero suelto.
function sincronizarEspera() {
  el('tx-horas-wrap').hidden = Number(el('tx-asientos').value) > 1;
  el('tx-km-wrap').hidden = el('tx-destino').value !== KM_LIBRE;
}

function enlaceCotizacion() {
  const d = destinoActual();
  if (!d) return location.href;
  const p = new URLSearchParams({ d: d.id, a: el('tx-asientos').value, h: el('tx-horas').value });
  if (d.libre) p.set('k', String(d.km));   // sin los km, un enlace de km libres no abre nada
  return `${location.origin}/taxi?${p.toString()}`;
}

async function compartirCotizacion() {
  const url = enlaceCotizacion();
  const boton = el('tx-compartir');
  try {
    await navigator.clipboard.writeText(url);
    boton.textContent = '✅ Enlace copiado';
  } catch (e) {
    boton.textContent = url;   // sin permiso de portapapeles, que al menos se vea
  }
  setTimeout(() => { boton.textContent = '🔗 Compartir cotización'; }, 2500);
}

// ── Calendario de ocupacion ──
// El taxi.json solo trae {fecha, manana, tarde}: aqui no hay nada que ocultar
// porque nunca llega. Si no hay ni un dia ocupado, la seccion no aparece: un
// calendario todo en blanco no le dice nada a nadie.
const DIA_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function renderCalendario() {
  const dias = (TX.agenda || []);
  const hayAlgo = dias.some((d) => d.manana || d.tarde);
  el('tx-calendario').hidden = !hayAlgo;
  if (!hayAlgo) return;

  const hoy = dias.length ? dias[0].fecha : '';
  el('tx-cal-dias').innerHTML = dias.map((d) => {
    const f = new Date(`${d.fecha}T12:00:00`);
    const clase = (ocupado) => ocupado ? 'tx-ocupado' : 'tx-libre';
    const titulo = `${f.getDate()}: mañana ${d.manana ? 'ocupada' : 'libre'}, tarde ${d.tarde ? 'ocupada' : 'libre'}`;
    return `<div class="tx-cal-dia${d.fecha === hoy ? ' tx-cal-hoy' : ''}" title="${escapeHtml(titulo)}">
      <span>${DIA_LETRA[f.getDay()]}</span>
      <b>${f.getDate()}</b>
      <div class="tx-cal-mitad" role="img" aria-label="${escapeHtml(titulo)}">
        <span class="${clase(d.manana)}"></span>
        <span class="${clase(d.tarde)}"></span>
      </div>
    </div>`;
  }).join('');
}

// ── Pizarra de salidas compartidas ──

function renderPizarra() {
  const salidas = TX.salidas || [];
  el('tx-pizarra').hidden = salidas.length === 0;
  if (!salidas.length) return;

  const gen = Date.parse(TX.generado) || Date.now();
  el('tx-sello').textContent = `Asientos según la última actualización (${haceCuanto(gen)}). Confirmamos por WhatsApp.`;

  el('tx-salidas').innerHTML = salidas.map((s) => {
    const cuando = `${fechaLarga(Date.parse(`${s.fecha}T12:00:00`))}${s.hora ? ` · ${escapeHtml(s.hora)}` : ''}`;
    const lleno = s.libres <= 0;
    const info = lleno
      ? '<span class="tx-salida-lleno">Sin asientos libres</span>'
      : `${s.libres} de ${s.asientos} asientos libres`;
    const texto = [
      '🚕 *Taxi 3B — viaje compartido*',
      `${s.destinoNombre} · ${cuando}`,
      `Precio: ${fmt(s.precioAsientoCUP)} CUP por persona`,
      '',
      'Quiero apuntarme.',
    ].join('\n');
    return `<div class="tx-salida">
      <div class="tx-salida-cab">
        <span class="tx-salida-cuando">${cuando}</span>
        <span class="tx-salida-precio">${fmt(s.precioAsientoCUP)} CUP</span>
      </div>
      <div class="tx-salida-info">${escapeHtml(s.destinoNombre)} · ${info}${s.nota ? ` · ${escapeHtml(s.nota)}` : ''}</div>
      ${lleno ? '' : `<a class="tx-wa" href="${escapeHtml(waLink(texto))}" target="_blank" rel="noopener">💬 Apuntarme</a>`}
    </div>`;
  }).join('');
}

// ── "Otro destino" y "propon tu viaje" ──

function renderOtro() {
  el('tx-otro').hidden = false;
  const actualizar = () => {
    const destino = el('tx-otro-destino').value.trim();
    el('tx-otro-wa').href = waLink(`🚕 *Taxi 3B*\nQuiero ir a: ${destino || '(dime a dónde)'}\n\n¿Cuántos km son y cuánto me costaría?`);
  };
  el('tx-otro-destino').addEventListener('input', actualizar);
  actualizar();
}

function renderPropon() {
  el('tx-propon').hidden = false;
  const actualizar = () => {
    const f = el('tx-p-fecha').value;
    const cuando = f ? fechaLarga(Date.parse(`${f}T12:00:00`)) : '(sin fecha)';
    const texto = [
      '🚕 *Taxi 3B — propongo un viaje compartido*',
      `Día: ${cuando} ${el('tx-p-franja').value}`,
      `Destino: ${el('tx-p-destino').value.trim() || '(dime a dónde)'}`,
      `Comparto ${el('tx-p-asientos').value} asiento(s).`,
    ].join('\n');
    el('tx-propon-wa').href = waLink(texto);
  };
  ['tx-p-fecha', 'tx-p-franja', 'tx-p-destino', 'tx-p-asientos'].forEach((id) => {
    el(id).addEventListener('input', actualizar);
    el(id).addEventListener('change', actualizar);
  });
  actualizar();
}

// ── "Gana con Taxi 3B" ──
// Mismo patron que el recuadro de gestores de la tienda: el boton NO abre
// WhatsApp directo, abre un recuadro con los tres pasos, para que la gente lea
// antes de escribir. Sin cifras de comision: lo que se publica compromete, y eso
// se habla caso por caso (misma decision que en la tienda).
let focoAntesDeGana = null;

// La cifra se arma con un destino REAL del tarifario (el mas largo publicado):
// "20 CUP por km" es abstracto; "un viaje a La Habana te deja 600 CUP" se entiende
// de un vistazo. Si no hay tarifa configurada, el bloque no aparece — mejor sin
// cifra que con un "0 CUP".
function renderCifraGana() {
  const caja = el('tx-gana-cifra');
  const porKm = Number(TX && TX.comisionPorKmCUP) || 0;
  if (!(porKm > 0)) { caja.hidden = true; return; }

  const destinos = (TX.destinos || []).filter((d) => d.km > 0);
  const ejemplo = destinos.slice().sort((a, b) => b.km - a.km)[0];
  const linea = `Ganas <b>${fmt(porKm)} CUP por cada kilómetro</b> del viaje que traigas.`;
  const conEjemplo = ejemplo
    ? `${linea}<br>Un viaje a ${escapeHtml(ejemplo.nombre)} (${ejemplo.km} km) te deja <b>${fmt(ejemplo.km * porKm)} CUP</b>.`
    : linea;
  caja.innerHTML = conEjemplo;
  caja.hidden = false;
}

function abrirGana() {
  const wa = el('tx-gana-wa');
  renderCifraGana();
  // Las altas NO van al chofer: van a quien las gestiona (whatsappAltas). Si no
  // esta configurado, el propio taxi.json ya cae al numero del chofer.
  const tel = (TX && (TX.whatsappAltas || TX.whatsapp)) || '';
  if (tel) {
    const texto = REF ? `QUIERO GANAR CON TAXI 3B\n\nMe lo recomendó: ${REF.code}` : 'QUIERO GANAR CON TAXI 3B';
    wa.href = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
    wa.hidden = false;
  } else {
    wa.hidden = true;   // sin numero, el enlace iria a wa.me vacio
  }
  focoAntesDeGana = document.activeElement;
  el('tx-modal-gana').hidden = false;
  el('tx-gana-cerrar').focus();
  document.addEventListener('keydown', tecladoGana);
}

function cerrarGana() {
  el('tx-modal-gana').hidden = true;
  document.removeEventListener('keydown', tecladoGana);
  if (focoAntesDeGana && focoAntesDeGana.isConnected) focoAntesDeGana.focus();
}

// Escape cierra, y el Tab se queda dentro del recuadro mientras esta abierto.
function tecladoGana(e) {
  const modal = el('tx-modal-gana');
  if (modal.hidden) return;
  if (e.key === 'Escape') { cerrarGana(); return; }
  if (e.key !== 'Tab') return;
  const focos = modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
  if (!focos.length) return;
  const primero = focos[0];
  const ultimo = focos[focos.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

// ── Marca y pie ──

function renderMarca() {
  const m = TX.marca || {};
  if (m.nombre) { el('tx-titulo').textContent = m.nombre; document.title = `${m.nombre} — Viajes con precio cerrado`; }
  if (m.lema) el('tx-lema').textContent = m.lema;
  const pinta = (id, valor) => { const n = el(id); if (valor && valor.trim()) { n.textContent = valor; n.hidden = false; } };
  pinta('tx-incluye', m.incluye);
  pinta('tx-zonas', m.zonas);
  pinta('tx-politica', m.politica);
  if (TX.precioLitroUSD > 0) {
    const n = el('tx-litro');
    n.textContent = `Calculado con la gasolina a $${TX.precioLitroUSD} USD el litro.`;
    n.hidden = false;
  }
}

// ── Arranque ──

function mostrarError() {
  el('tx-error').hidden = false;
  el('tx-calc').hidden = true;
  el('tx-pizarra').hidden = true;
  el('tx-propon').hidden = true;
  el('tx-otro').hidden = true;
}

async function cargar() {
  el('tx-error').hidden = true;
  try {
    const r = await fetch(`taxi.json?v=${Date.now()}`);   // sin cache: el precio tiene que ser el de ahora
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    TX = await r.json();
  } catch (err) {
    mostrarError();
    return;
  }

  renderMarca();
  resolverReferidor();
  renderReferidor();

  // Interruptor: hasta que Ruth lo encienda, el taxi no cotiza.
  if (!TX.activo) {
    el('tx-apagado').hidden = false;
    el('tx-wa-apagado').href = waLink('🚕 Hola, quiero información sobre el taxi.');
    return;
  }

  if ((TX.destinos || []).length) {
    el('tx-calc').hidden = false;
    renderCalculadora();
  }
  renderCalendario();
  renderPizarra();
  renderOtro();
  renderPropon();
  el('tx-cta-gana').hidden = false;
}

function iniciar() {
  el('tx-destino').addEventListener('change', () => { sincronizarEspera(); renderResultado(); });
  el('tx-km-libre').addEventListener('input', renderResultado);
  el('tx-horas').addEventListener('change', renderResultado);
  el('tx-asientos').addEventListener('change', () => { sincronizarEspera(); renderResultado(); });
  el('tx-compartir').addEventListener('click', compartirCotizacion);
  el('tx-reintentar').addEventListener('click', cargar);
  el('tx-ref-quitar').addEventListener('click', olvidarReferidor);
  el('tx-cta-gana').addEventListener('click', abrirGana);
  el('tx-gana-cerrar').addEventListener('click', cerrarGana);
  el('tx-gana-fondo').addEventListener('click', cerrarGana);
  cargar();
}

iniciar();
