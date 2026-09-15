// encargos.js — la sección "Encargos Shein/Temu" de la tienda 3B (Fase C).
// Diseño: docs/superpowers/specs/2026-09-14-compras-por-encargo-design.md (Stock+).
//
// Script externo a propósito: la CSP (vercel.json / _headers) bloquea todo JS inline.
// Por eso NO hay ni un onclick="": todo va con addEventListener.
//
// Lo engancha app.js al final de cargarCatalogo(): window.Encargos.iniciar(CAT).
// Solo aparece si catalogo.json trae tienda.encargosActivo y el bloque `encargos`.
// Se abre con la tarjeta del catálogo o con #encargos (3bqba.com/CODIGO#encargos
// conserva al gestor: el código va en la ruta y la sección en el hash).
//
// Usa globales de app.js: fmt, escapeHtml, resolverVendedor, atraparFoco, marcarError.
(function () {
  'use strict';

  const BORRADOR = 'encargoBorrador';
  // 🔴 CONTRATO con la Fase D (Mía leerá este mensaje con una regex). La primera línea
  // lleva esta MARCA y NO dice "Pedido desde la web" a propósito: con esa frase el bot lo
  // trataría como un pedido del carrito. Si cambias el formato del mensaje, cambia también
  // el parser de la Fase D.
  const MARCA = 'ENCARGO 3B desde la web';

  const estado = {
    cat: null, bloque: null, fiable: false,
    articulos: [], modo: 'barco', nombre: '', tel: '', dir: '', nota: '',
    texto: '', listo: false,
  };
  let enganchado = false;
  let focoAnterior = null;

  const usd = (n) => '$' + (Number(n) || 0).toFixed(2);
  const r2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
  const r3 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 1000) / 1000;
  const nuevoArticulo = () => ({ link: '', tienda: 'shein', tipo: '', talla: '', color: '', cantidad: '1', precio: '', pesoLb: '' });
  const tipoDe = (id) => (estado.bloque.tipos || []).find((t) => t.id === id) || null;
  const modoTexto = (m) => (m === 'avion' ? '✈️ Avión' : '🚢 Barco');

  // ── El cálculo ──
  // 🔴 COPIA de lib/encargoTarifa.js → cotizar() de Stock+, SIN el recargo de almacén
  // local (ese lo aplica 3B al ver la captura). Si cambias una, cambia la otra: la
  // autocomprobación de abajo lo detecta y oculta el estimado en vez de mentir.
  function tarifaLb(tramos, lb) {
    let precio = tramos[0].usdLb;
    for (const t of tramos) if (lb > t.masDeLb) precio = t.usdLb;
    return precio;
  }

  // articulos: [{tipo, cantidad, precioUSD}]. Devuelve null si falta algo para estimar.
  function calcular(b, articulos, modo) {
    if (!b || !b.tarifas || !(b.tarifas[modo] || []).length || !articulos.length) return null;
    let art = 0;
    let lb = 0;
    for (const a of articulos) {
      const t = (b.tipos || []).find((x) => x.id === a.tipo);
      const c = Number(a.cantidad);
      const p = Number(a.precioUSD);
      // Peso de cada uno que pone el cliente (opcional). Si está, manda sobre la tabla
      // y permite estimar incluso con «Otro / no sé». Los casos de control no lo traen.
      const propio = Number(a.pesoLb);
      const lbUnidad = a.pesoLb !== undefined && a.pesoLb !== '' && propio > 0 ? propio : (t ? t.lb : null);
      if (!t || lbUnidad === null || !Number.isInteger(c) || c < 1 || !(p > 0)) return null;
      art += p * c;
      lb += lbUnidad * c;
    }
    const cobrado = Math.max(r3(lb), b.pesoMinimoLb);
    const tarifa = tarifaLb(b.tarifas[modo], cobrado);
    const envio = cobrado * tarifa;
    const global = art;
    const servicio = global * b.comisionServicioPct / 100;
    const total = global + servicio + envio;
    const baseAnticipo = b.anticipoBase === 'global' ? global : total;
    return {
      articulosUSD: r2(art), servicioUSD: r2(servicio), envioUSD: r2(envio),
      totalUSD: r2(total), anticipoUSD: r2(baseAnticipo * b.anticipoPct / 100),
      pesoLb: r3(lb), pesoCobradoLb: cobrado,
    };
  }

  // Recalcula los casos que Stock+ ya calculó. Uno solo que no cuadre al céntimo = no se
  // enseña ningún estimado.
  function autocomprobar(b) {
    const control = (b && b.control) || [];
    if (!control.length) return false;
    return control.every((c) => {
      const q = calcular(b, c.articulos, c.modo);
      return !!q && q.envioUSD === c.envioUSD && q.servicioUSD === c.servicioUSD
        && q.totalUSD === c.totalUSD && q.anticipoUSD === c.anticipoUSD;
    });
  }

  const paraCalculo = () => estado.articulos.map((a) => ({ tipo: a.tipo, cantidad: Number(a.cantidad), precioUSD: Number(a.precio), pesoLb: a.pesoLb }));

  // ── Borrador: el cliente sale a Shein a copiar el link y el móvil recarga la página ──
  function guardarBorrador() {
    try {
      localStorage.setItem(BORRADOR, JSON.stringify({
        articulos: estado.articulos, modo: estado.modo, nombre: estado.nombre, tel: estado.tel, dir: estado.dir, nota: estado.nota,
      }));
    } catch (e) { /* sin almacenamiento: se sigue sin borrador */ }
  }
  function cargarBorrador() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch (e) { d = null; }
    const texto = (v) => (typeof v === 'string' ? v.slice(0, 500) : '');
    if (d && Array.isArray(d.articulos) && d.articulos.length) {
      estado.articulos = d.articulos.slice(0, 20).map((a) => ({
        link: texto(a.link), tienda: a.tienda === 'temu' ? 'temu' : 'shein', tipo: texto(a.tipo),
        talla: texto(a.talla), color: texto(a.color), cantidad: texto(a.cantidad) || '1', precio: texto(a.precio), pesoLb: texto(a.pesoLb),
      }));
      estado.modo = d.modo === 'avion' ? 'avion' : 'barco';
      estado.nombre = texto(d.nombre); estado.tel = texto(d.tel); estado.dir = texto(d.dir); estado.nota = texto(d.nota);
    }
    if (!estado.articulos.length) estado.articulos = [nuevoArticulo()];
  }
  function borrarBorrador() { try { localStorage.removeItem(BORRADOR); } catch (e) { /* nada */ } }

  // ── La tarjeta del catálogo ──
  const activos = () => !!(estado.cat && estado.cat.tienda && estado.cat.tienda.encargosActivo && estado.bloque);

  function pintarTarjeta() {
    const hueco = document.getElementById('cta-encargos-hueco');
    if (!hueco) return;
    hueco.hidden = !activos();
    hueco.innerHTML = activos()
      ? '<button type="button" class="enc-cta" id="cta-encargos">'
        + '<span class="enc-cta-icono" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></span>'
        + '<span class="enc-cta-txt">'
        + '<span class="enc-cta-tit">¿No lo encuentras? Te lo traemos</span>'
        + '<span class="enc-cta-sub">Pídelo de Shein o Temu y te decimos el precio antes de comprar.</span>'
        + '<span class="enc-cta-chips"><span>Shein</span><span>Temu</span><span>Avión o barco</span></span>'
        + '</span>'
        + '<span class="enc-cta-accion">Hacer un encargo <span aria-hidden="true">→</span></span></button>'
      : '';
  }

  // ── Las piezas de la ventana ──
  function htmlEjemplos() {
    const ej = estado.bloque.ejemplos || [];
    if (!ej.length) return '';
    const filas = ej.map((e) => `<tr><td>${escapeHtml(e.nombre)}</td><td class="num">${usd(e.precioUSD)}</td><td class="num">${usd(e.barcoUSD)}</td><td class="num">${usd(e.avionUSD)}</td></tr>`).join('');
    return '<div class="enc-bloque"><div class="enc-bloque-tit">¿Cuánto cuesta más o menos?</div>'
      + '<table class="enc-tabla"><thead><tr><th>Producto</th><th class="num">En la tienda</th><th class="num">🚢 Barco</th><th class="num">✈️ Avión</th></tr></thead>'
      + `<tbody>${filas}</tbody></table>`
      + '<p class="enc-nota">Precio total aproximado, con envío y servicio incluidos. El final depende del peso real.</p>'
      + `<p class="enc-nota">⚖️ Se cobra un <b>mínimo de ${estado.bloque.pesoMinimoLb} lb por encargo</b>: si lo tuyo pesa menos, se cobra ${estado.bloque.pesoMinimoLb} lb. Varias cosas en el mismo encargo pagan un solo mínimo.</p></div>`;
  }

  function htmlTiempos() {
    const b = estado.bloque;
    const dias = Math.max(0, ...['shein', 'temu'].map((k) => ((b.tiendas || {})[k] || {}).diasHastaNosotros || 0));
    const tienda = dias > 0 ? `<p>🚚 Shein y Temu tardan unos <b>${dias} días</b> en llegarnos.</p>` : '';
    return '<div class="enc-bloque"><div class="enc-bloque-tit">⏱️ ¿Cuánto tarda?</div>' + tienda
      + `<p>Desde que lo recibimos: <b>✈️ Avión hasta ${b.tiempos.avion.hastaDias} días</b> · <b>🚢 Barco hasta ${b.tiempos.barco.hastaDias} días</b>.</p>`
      + '<p class="enc-nota">Normalmente llega antes. Es un tiempo estimado, no garantizado: la aduana puede retrasarlo.</p></div>';
  }

  function htmlArticulo(a, i) {
    const tipos = (estado.bloque.tipos || []).map((t) => `<option value="${escapeHtml(t.id)}"${a.tipo === t.id ? ' selected' : ''}>${escapeHtml(t.nombre)}</option>`).join('');
    const quitar = estado.articulos.length > 1 ? `<button type="button" class="enc-quitar" data-quitar="${i}">Quitar</button>` : '';
    return `<div class="enc-articulo" data-i="${i}">`
      + `<div class="enc-articulo-head"><span>Producto ${i + 1}</span>${quitar}</div>`
      + `<label class="campo"><span>Link del producto (cópialo de Shein o Temu)</span><input type="url" inputmode="url" data-f="link" value="${escapeHtml(a.link)}" placeholder="https://…"><span class="enc-dominio" data-dominio>${escapeHtml(dominio(a.link))}</span><span class="campo-error" data-err="link" hidden>Pega el link del producto.</span></label>`
      + '<div class="enc-fila">'
      + `<label class="campo"><span>Tienda</span><select data-f="tienda"><option value="shein"${a.tienda === 'temu' ? '' : ' selected'}>Shein</option><option value="temu"${a.tienda === 'temu' ? ' selected' : ''}>Temu</option></select></label>`
      + `<label class="campo"><span>¿Qué es?</span><select data-f="tipo"><option value="">Elige…</option>${tipos}</select><span class="campo-error" data-err="tipo" hidden>Elige qué es.</span></label>`
      + '</div><div class="enc-fila">'
      + `<label class="campo"><span>Talla</span><input type="text" data-f="talla" value="${escapeHtml(a.talla)}" placeholder="Ej: M"></label>`
      + `<label class="campo"><span>Color</span><input type="text" data-f="color" value="${escapeHtml(a.color)}" placeholder="Ej: negro"></label>`
      + '</div><div class="enc-fila">'
      + `<label class="campo"><span>Cantidad</span><input type="number" inputmode="numeric" min="1" step="1" data-f="cantidad" value="${escapeHtml(a.cantidad)}"><span class="campo-error" data-err="cantidad" hidden>De 1 en adelante.</span></label>`
      + `<label class="campo"><span>Precio en la tienda (USD)</span><input type="number" inputmode="decimal" min="0" step="0.01" data-f="precio" value="${escapeHtml(a.precio)}" placeholder="Ej: 12.99"><span class="campo-error" data-err="precio" hidden>Pon el precio que ves.</span></label>`
      + '</div><div class="enc-fila">'
      + `<label class="campo"><span>Peso de cada uno en libras (opcional)</span><input type="number" inputmode="decimal" min="0" step="0.01" data-f="pesoLb" value="${escapeHtml(a.pesoLb)}" placeholder="Si lo sabes. Ej: 0.8"><span class="campo-error" data-err="pesoLb" hidden>Pon un peso entre 0 y 200 lb, o déjalo vacío.</span><span class="enc-nota">Si ya lo trajiste antes o lo ves en la tienda. Si no lo sabes, déjalo vacío: lo calculamos nosotros.</span></label>`
      + '</div></div>';
  }

  function dominio(link) {
    try { return /^https?:\/\//i.test(link) ? '🔗 ' + new URL(link).hostname.replace(/^www\./, '') : ''; } catch (e) { return ''; }
  }

  function htmlEstimado() {
    if (!estado.fiable) return 'Te damos el precio al ver la captura de tu producto.';
    if (estado.articulos.some((a) => { const t = tipoDe(a.tipo); return t && t.lb === null && !(Number(a.pesoLb) > 0); })) {
      return 'Con «Otro / no sé» pon el peso de cada uno si lo sabes; si no, te damos el precio al ver la captura.';
    }
    const q = calcular(estado.bloque, paraCalculo(), estado.modo);
    if (!q) return 'Rellena qué es, la cantidad y el precio de cada producto para ver un precio estimado.';
    const tasa = Number(estado.cat.tasa) || 0;
    const cup = tasa > 1 ? ` (≈ ${fmt(Math.round(q.totalUSD * tasa))} CUP)` : '';
    return `Precio estimado: <b>${usd(q.totalUSD)}</b>${cup}`
      + `<br>Productos ${usd(q.articulosUSD)} · Servicio 3B ${usd(q.servicioUSD)} · Envío ${modoTexto(estado.modo)} ${usd(q.envioUSD)}`
      + `<br>Anticipo para comprarlo: <b>${usd(q.anticipoUSD)}</b>`
      + `<br>Peso estimado: ${q.pesoLb} lb`
      + (q.pesoLb < estado.bloque.pesoMinimoLb
        ? `<div class="enc-nota">⚖️ Pesa menos de ${estado.bloque.pesoMinimoLb} lb: se cobra el mínimo de ${estado.bloque.pesoMinimoLb} lb (envío ${usd(q.envioUSD)}). ¿Quieres algo más? Añádelo a este mismo encargo y el mínimo se paga una sola vez.</div>`
        : '')
      + (estado.articulos.some((a) => Number(a.pesoLb) > 0) ? '<div class="enc-nota">El peso que pusiste es orientativo: el precio final va por el peso real.</div>' : '')
      + '<div class="enc-nota">Es aproximado: el envío final depende del peso real. Si la tienda cobra un recargo por una compra pequeña de almacén local, te lo decimos al ver la captura.</div>';
  }

  function htmlFormulario() {
    const b = estado.bloque;
    const campo = (id, etiqueta, valor, extra, error) => `<label class="campo"><span>${etiqueta}</span><input type="text" id="${id}" value="${escapeHtml(valor)}" ${extra}><span class="campo-error" id="${id}-err" hidden>${error}</span></label>`;
    const modo = (m, titulo, dias) => `<label class="enc-modo"><input type="radio" name="enc-modo" value="${m}"${estado.modo === m ? ' checked' : ''}><span>${titulo}<small>hasta ${dias} días</small></span></label>`;
    return '<h2 id="enc-titulo">Encargos de Shein y Temu</h2>'
      + '<p class="enc-intro">¿No está en nuestro catálogo? Te lo traemos. Así funciona:</p>'
      + '<ol class="enc-pasos">'
      + '<li><b>Pega el link</b> del producto y dinos la talla y el color.</li>'
      + '<li><b>Mándanos una captura</b> por WhatsApp y te decimos el precio final.</li>'
      + `<li><b>Pagas un anticipo</b> del ${b.anticipoPct} % y lo compramos.</li>`
      + '<li><b>Lo pesamos</b> cuando nos llega y te avisamos el precio exacto del envío.</li>'
      + '<li><b>Te lo llevamos</b> y pagas lo que falta.</li></ol>'
      + htmlEjemplos() + htmlTiempos()
      + '<form id="enc-form" class="campos" novalidate>'
      + `<div id="enc-articulos" class="campos">${estado.articulos.map(htmlArticulo).join('')}</div>`
      + '<button type="button" class="btn-secundario" id="enc-add">+ Añadir otro producto</button>'
      + '<div class="enc-bloque"><div class="enc-bloque-tit">¿Cómo lo traemos?</div><div class="enc-modos">'
      + modo('barco', '🚢 Barco', b.tiempos.barco.hastaDias) + modo('avion', '✈️ Avión', b.tiempos.avion.hastaDias) + '</div></div>'
      + `<div id="enc-estimado" class="enc-estimado" aria-live="polite">${htmlEstimado()}</div>`
      + campo('enc-nombre', 'Tu nombre', estado.nombre, 'autocomplete="name"', 'Falta tu nombre.')
      + campo('enc-tel', 'Tu teléfono', estado.tel, 'inputmode="tel" autocomplete="tel"', 'Pon un teléfono de al menos 8 dígitos.')
      + campo('enc-dir', 'Dirección de entrega', estado.dir, 'autocomplete="street-address"', 'Falta la dirección.')
      + `<label class="campo"><span>Algo más que debamos saber (opcional)</span><textarea id="enc-nota" rows="2">${escapeHtml(estado.nota)}</textarea></label>`
      + '<div class="enc-condiciones"><b>Antes de pedir, lee esto:</b><ul>'
      + `<li>Para comprarlo pagas un <b>anticipo del ${b.anticipoPct} %</b>. Si después no quieres el producto, <b>el anticipo no se devuelve</b>.</li>`
      + '<li>Revisa bien la talla: <b>no hay devoluciones</b> una vez entregado.</li>'
      + `<li>Se cobra un <b>peso mínimo de ${b.pesoMinimoLb} lb</b> por encargo, aunque pese menos.</li>`
      + '<li>Los tiempos son estimados: la aduana puede retrasarlos.</li>'
      + '<li>Si el fallo es nuestro (se agotó o se perdió), te devolvemos el anticipo.</li></ul></div>'
      + '<label class="enc-check"><input type="checkbox" id="enc-acepta"> Lo entiendo y lo acepto</label>'
      + '<span class="campo-error" id="enc-acepta-err" hidden>Tienes que aceptar las condiciones.</span>'
      + '<p class="campo-error" id="enc-general-err" hidden></p>'
      + '<button type="submit" class="btn-enviar">Pedir encargo por WhatsApp</button>'
      + '<p class="aviso">El precio final y la disponibilidad se confirman por WhatsApp.</p>'
      + '</form>';
  }

  function htmlPuente() {
    return '<div class="enc-puente">'
      + '<h2 id="enc-titulo" class="enc-puente-grande">📸 ¡Falta un paso muy importante!</h2>'
      + '<p>Ahora te abrimos WhatsApp con tu encargo ya escrito. Haz esto:</p><ol>'
      + '<li>En WhatsApp, toca <b>Enviar</b>.</li>'
      + '<li>Vuelve a Shein o Temu, abre tu producto y elige la <b>talla</b> y el <b>color</b>.</li>'
      + '<li>Haz una <b>captura de pantalla</b> (una foto de la pantalla) donde se vea el producto, la talla, el color y el precio. En casi todos los teléfonos: aprieta a la vez <b>bajar volumen</b> y <b>apagar</b>.</li>'
      + '<li>Mándanos esa captura <b>en el mismo chat</b>. Si pediste varias cosas, una captura de cada una.</li></ol>'
      + '<p class="enc-nota">Sin la captura no podemos darte el precio final.</p>'
      + '<button type="button" class="btn-enviar" id="enc-abrir-wa">Abrir WhatsApp</button>'
      + `<button type="button" class="btn-secundario" id="enc-listo"${estado.listo ? '' : ' hidden'}>Ya lo mandé ✅</button>`
      + '<button type="button" class="btn-secundario" id="enc-volver">← Corregir mi encargo</button>'
      + '</div>';
  }

  // ── El mensaje de WhatsApp (ver CONTRATO arriba) ──
  function construirMensaje() {
    const b = estado.bloque;
    const v = typeof resolverVendedor === 'function' ? resolverVendedor() : null;
    const L = [`🛍️ *${MARCA}*`];
    if (v) L.push(`👤 Vendedor: ${v.code}`);
    estado.articulos.forEach((a, i) => {
      const t = tipoDe(a.tipo);
      L.push('', `*Producto ${i + 1}* — ${a.tienda === 'temu' ? 'Temu' : 'Shein'}`);
      L.push(`Qué es: ${t ? t.nombre : '—'}`);
      L.push(`Talla: ${a.talla.trim() || '—'}`);
      L.push(`Color: ${a.color.trim() || '—'}`);
      L.push(`Cantidad: ${Number(a.cantidad)}`);
      L.push(`Peso de cada uno: ${Number(a.pesoLb) > 0 ? Number(a.pesoLb) + ' lb' : 'no lo sé'}`);
      L.push(`Precio que veo: ${usd(Number(a.precio))}`);
      L.push(`Link: ${a.link.trim()}`);
    });
    L.push('', `Envío: ${modoTexto(estado.modo)}`);
    const q = estado.fiable ? calcular(b, paraCalculo(), estado.modo) : null;
    if (q) L.push(`Precio estimado: ${usd(q.totalUSD)} (anticipo ${usd(q.anticipoUSD)}) — el precio final me lo confirman al ver la captura`);
    L.push('', `Nombre: ${estado.nombre.trim()}`, `Tel: ${estado.tel.trim()}`, `Dirección: ${estado.dir.trim()}`);
    if (estado.nota.trim()) L.push(`Nota: ${estado.nota.trim()}`);
    L.push('', '📸 Ahora les mando la captura de cada producto.');
    L.push(`✅ Acepto las condiciones: anticipo del ${b.anticipoPct} % que no se devuelve si luego no quiero el producto; sin devoluciones una vez entregado; tiempos estimados.`);
    return L.join('\n');
  }

  // ── Validación (errores bajo cada campo, nada de alert) ──
  function validar() {
    let primero = null;
    const marcar = (el, err, mal) => {
      if (!el) return;
      el.classList.toggle('invalido', mal);
      if (err) err.hidden = !mal;
      if (mal && !primero) primero = el;
    };
    document.querySelectorAll('#enc-articulos [data-i]').forEach((fila) => {
      const a = estado.articulos[Number(fila.dataset.i)];
      const c = Number(a.cantidad);
      marcar(fila.querySelector('[data-f="link"]'), fila.querySelector('[data-err="link"]'), !/^https?:\/\/\S+$/i.test(a.link.trim()));
      marcar(fila.querySelector('[data-f="tipo"]'), fila.querySelector('[data-err="tipo"]'), !a.tipo);
      marcar(fila.querySelector('[data-f="cantidad"]'), fila.querySelector('[data-err="cantidad"]'), !(Number.isInteger(c) && c >= 1));
      marcar(fila.querySelector('[data-f="precio"]'), fila.querySelector('[data-err="precio"]'), !(Number(a.precio) > 0));
      const pesoTxt = String(a.pesoLb || '').trim();
      marcar(fila.querySelector('[data-f="pesoLb"]'), fila.querySelector('[data-err="pesoLb"]'), pesoTxt !== '' && !(Number(pesoTxt) > 0 && Number(pesoTxt) <= 200));
    });
    const campo = (id, mal) => marcar(document.getElementById(id), document.getElementById(id + '-err'), mal);
    campo('enc-nombre', !estado.nombre.trim());
    campo('enc-tel', estado.tel.replace(/\D/g, '').length < 8);
    campo('enc-dir', !estado.dir.trim());
    const acepta = document.getElementById('enc-acepta');
    marcar(acepta, document.getElementById('enc-acepta-err'), !acepta.checked);
    const general = document.getElementById('enc-general-err');
    const sinWA = !(estado.cat && estado.cat.whatsapp);
    general.hidden = !sinWA;
    general.textContent = sinWA ? 'Ahora mismo no podemos recibir encargos por WhatsApp. Inténtalo más tarde.' : '';
    if (primero) primero.focus();
    return !primero && !sinWA;
  }

  // ── La ventana ──
  function pintar() {
    document.getElementById('enc-cuerpo').innerHTML = estado.texto ? htmlPuente() : htmlFormulario();
  }

  function abrir() {
    if (!activos()) return;
    const modal = document.getElementById('modal-encargos');
    if (!modal) return;
    if (!modal.hidden) return;
    focoAnterior = document.activeElement;
    estado.texto = '';
    estado.listo = false;
    pintar();
    modal.hidden = false;
    document.getElementById('enc-cerrar').focus();
    document.addEventListener('keydown', teclado);
    if (location.hash !== '#encargos') history.replaceState(null, '', location.pathname + location.search + '#encargos');
  }

  function cerrar() {
    const modal = document.getElementById('modal-encargos');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.removeEventListener('keydown', teclado);
    if (location.hash === '#encargos') history.replaceState(null, '', location.pathname + location.search);
    if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
  }

  function teclado(e) {
    const modal = document.getElementById('modal-encargos');
    if (modal.hidden) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key === 'Tab') atraparFoco(e, modal);
  }

  function alEscribir(e) {
    const el = e.target;
    const fila = el.closest('[data-i]');
    if (fila && el.dataset.f) {
      const a = estado.articulos[Number(fila.dataset.i)];
      a[el.dataset.f] = el.value;
      if (el.dataset.f === 'link') {
        const l = el.value.toLowerCase();
        const tienda = l.includes('temu') ? 'temu' : (l.includes('shein') ? 'shein' : '');
        if (tienda) { a.tienda = tienda; fila.querySelector('[data-f="tienda"]').value = tienda; }
        fila.querySelector('[data-dominio]').textContent = dominio(el.value);
      }
    } else if (el.name === 'enc-modo') {
      estado.modo = el.value === 'avion' ? 'avion' : 'barco';
    } else if (el.id === 'enc-nombre') { estado.nombre = el.value; }
    else if (el.id === 'enc-tel') { estado.tel = el.value; }
    else if (el.id === 'enc-dir') { estado.dir = el.value; }
    else if (el.id === 'enc-nota') { estado.nota = el.value; }
    else return;
    guardarBorrador();
    const caja = document.getElementById('enc-estimado');
    if (caja) caja.innerHTML = htmlEstimado();
  }

  function alPulsar(e) {
    const t = e.target;
    if (t.closest('#enc-add')) {
      estado.articulos.push(nuevoArticulo());
      document.getElementById('enc-articulos').innerHTML = estado.articulos.map(htmlArticulo).join('');
      guardarBorrador();
      const filas = document.querySelectorAll('#enc-articulos [data-f="link"]');
      filas[filas.length - 1].focus();
      return;
    }
    const q = t.closest('[data-quitar]');
    if (q) {
      estado.articulos.splice(Number(q.dataset.quitar), 1);
      if (!estado.articulos.length) estado.articulos = [nuevoArticulo()];
      document.getElementById('enc-articulos').innerHTML = estado.articulos.map(htmlArticulo).join('');
      document.getElementById('enc-estimado').innerHTML = htmlEstimado();
      guardarBorrador();
      return;
    }
    if (t.closest('#enc-abrir-wa')) {
      window.open(`https://api.whatsapp.com/send?phone=${estado.cat.whatsapp}&text=${encodeURIComponent(estado.texto)}`, '_blank');
      estado.listo = true;
      document.getElementById('enc-listo').hidden = false;
      return;
    }
    if (t.closest('#enc-volver')) { estado.texto = ''; pintar(); return; }
    if (t.closest('#enc-listo')) {
      borrarBorrador();
      estado.articulos = [nuevoArticulo()];
      estado.texto = '';
      cerrar();
    }
  }

  function alEnviar(e) {
    if (e.target.id !== 'enc-form') return;
    e.preventDefault();
    if (!validar()) return;
    estado.texto = construirMensaje();
    estado.listo = false;
    pintar();
    document.getElementById('enc-abrir-wa').focus();
  }

  function enganchar() {
    if (enganchado) return;
    enganchado = true;
    document.getElementById('cta-encargos-hueco').addEventListener('click', (e) => { if (e.target.closest('#cta-encargos')) abrir(); });
    document.getElementById('enc-cerrar').addEventListener('click', cerrar);
    document.getElementById('enc-fondo').addEventListener('click', cerrar);
    const cuerpo = document.getElementById('enc-cuerpo');
    cuerpo.addEventListener('input', alEscribir);
    cuerpo.addEventListener('change', alEscribir);
    cuerpo.addEventListener('click', alPulsar);
    cuerpo.addEventListener('submit', alEnviar);
    window.addEventListener('hashchange', () => { if (location.hash === '#encargos') abrir(); });
  }

  // app.js lo llama cada vez que carga el catálogo (también al reintentar).
  function iniciar(cat) {
    estado.cat = cat || null;
    estado.bloque = (cat && cat.encargos) || null;
    estado.fiable = autocomprobar(estado.bloque);
    if (!document.getElementById('modal-encargos') || !document.getElementById('cta-encargos-hueco')) return;
    if (!estado.articulos.length) cargarBorrador();
    enganchar();
    pintarTarjeta();
    if (location.hash === '#encargos') abrir();
  }

  // `_prueba` solo existe para verificar desde la consola; no lo usa la tienda.
  window.Encargos = {
    iniciar,
    _prueba: { calcular, autocomprobar, construirMensaje, estado: () => estado },
  };
})();
