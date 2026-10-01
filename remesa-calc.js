// remesa-calc.js — la cuenta de la remesa, en el navegador.
//
// 🔴 ESTE ARCHIVO ES UN PORT de inventario-stockmas/lib/remesaTarifa.js.
// Si cambias uno, cambia el otro. Lo vigila tests/remesaParidad.test.js en el
// repo de Stock+: compara los dos sobre una rejilla de montos y tramos.
//
// Se calcula en el navegador a proposito: el porcentaje ES el precio y es
// publico; el cliente teclea un monto cualquiera y hay que responderle al
// instante. No es el caso del taxi, donde calcular aqui filtraria el margen.
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;  // Node (el test)
  else raiz.RemesaCalc = api;                                              // navegador
}(typeof self !== 'undefined' ? self : this, function () {

  function num(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function redondear2(n) {
    return parseFloat(Number(n).toFixed(2));
  }

  const COMISION_DEFAULT = { tramos: [{ hastaUSD: 0, pct: 10 }], minimoUSD: 20, maximoUSD: 2000, feeFijoUSD: 0 };

  function normalizarTramos(tramos) {
    const lista = (Array.isArray(tramos) ? tramos : [])
      .map((t) => ({ hastaUSD: Math.max(0, num(t && t.hastaUSD, 0)), pct: Math.max(0, num(t && t.pct, 0)) }));
    const finitos = lista.filter((t) => t.hastaUSD > 0).sort((a, b) => a.hastaUSD - b.hastaUSD);
    const abiertos = lista.filter((t) => t.hastaUSD <= 0);
    const pctFinal = abiertos.length
      ? abiertos[abiertos.length - 1].pct
      : (finitos.length ? finitos[finitos.length - 1].pct : 0);
    return [...finitos, { hastaUSD: 0, pct: pctFinal }];
  }

  function normalizarComision(comision) {
    const c = comision || {};
    return {
      tramos: normalizarTramos(c.tramos),
      minimoUSD: Math.max(0, num(c.minimoUSD, COMISION_DEFAULT.minimoUSD)),
      maximoUSD: Math.max(0, num(c.maximoUSD, COMISION_DEFAULT.maximoUSD)),
      feeFijoUSD: Math.max(0, num(c.feeFijoUSD, COMISION_DEFAULT.feeFijoUSD)),
    };
  }

  function pctPara(recibeUSD, tramos) {
    const lista = normalizarTramos(tramos);
    const r = num(recibeUSD, 0);
    for (const t of lista) {
      if (t.hastaUSD > 0 && r <= t.hastaUSD) return t.pct;
    }
    return lista[lista.length - 1].pct;
  }

  function noValido(motivo) {
    return { valido: false, motivo, recibeUSD: 0, pagaUSD: 0, comisionUSD: 0, pct: 0 };
  }

  function cotizar(recibeUSD, comision, recargoPct) {
    const c = normalizarComision(comision);
    const r = num(recibeUSD, 0);
    if (!(r > 0)) return noValido('monto');
    if (c.minimoUSD > 0 && r < c.minimoUSD) return noValido('minimo');
    if (c.maximoUSD > 0 && r > c.maximoUSD) return noValido('maximo');
    const pct = pctPara(r, c.tramos) + Math.max(0, num(recargoPct, 0));
    const pagaUSD = redondear2(r * (1 + pct / 100) + c.feeFijoUSD);
    return {
      valido: true,
      motivo: '',
      recibeUSD: redondear2(r),
      pagaUSD,
      comisionUSD: redondear2(pagaUSD - r),
      pct: redondear2(pct),
    };
  }

  function cotizarInverso(pagaUSD, comision, recargoPct) {
    const c = normalizarComision(comision);
    const p = num(pagaUSD, 0);
    const extra = Math.max(0, num(recargoPct, 0));
    if (!(p > 0)) return noValido('monto');
    const lista = normalizarTramos(c.tramos);
    let elegido = null;
    for (const t of lista) {
      const r = (p - c.feeFijoUSD) / (1 + (t.pct + extra) / 100);
      if (!(r > 0)) continue;
      if (t.hastaUSD <= 0 || r <= t.hastaUSD + 1e-9) { elegido = r; break; }
    }
    if (elegido === null) {
      const ultimo = lista[lista.length - 1];
      elegido = (p - c.feeFijoUSD) / (1 + (ultimo.pct + extra) / 100);
    }
    if (!(elegido > 0)) return noValido('monto');
    return cotizar(redondear2(elegido), comision, recargoPct);
  }

  function enCUP(recibeUSD, tasa) {
    const r = num(recibeUSD, 0);
    const t = num(tasa, 0);
    if (!(r > 0) || !(t > 1)) return 0;
    return Math.round(r * t);
  }

  return { COMISION_DEFAULT, normalizarTramos, normalizarComision, pctPara, cotizar, cotizarInverso, enCUP };
}));
