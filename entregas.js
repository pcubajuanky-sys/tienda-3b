// entregas.js — turnos de entrega que el cliente puede elegir al hacer el pedido.
// Modulo PURO (IIFE con window.Entregas), sin DOM ni red: se prueba con node:vm.
//
// GEMELO de inventario-stockmas/lib/turnosEntrega.js (`opciones`). Si cambias la regla en
// uno, cambia el otro: test/entregas.test.js los compara.
// El dato viene de `catalogo.json -> tienda.entregas`. La hora entra por parametro (ms UTC,
// ya corregidos con el desfase del reloj que calcula app.js).
//
// 🔴 ZONA HORARIA: «ahora en Cuba» = instante UTC + utcOffsetMin leido con getUTC*.
// NUNCA hora local ni Intl: la base de husos del telefono/Node esta mal para Cuba.
(function () {
  'use strict';

  var DEFAULTS = {
    turnos: [
      { id: 't1', desde: '09:00', hasta: '12:00' },
      { id: 't2', desde: '13:00', hasta: '16:00' },
      { id: 't3', desde: '16:00', hasta: '19:00' },
    ],
    anticipacionMin: 60,
    diasSinEntrega: [0],
    utcOffsetMin: -240,
    avisoSinEntrega: 'Los domingos no hacemos entregas: empezamos el {dia} a las {hora}.',
    otroHorario: true,
  };
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

  function config(e) {
    var x = e && typeof e === 'object' ? e : {};
    function pick(k) { return x[k] !== undefined ? x[k] : DEFAULTS[k]; }
    var turnos = Array.isArray(pick('turnos')) ? pick('turnos') : DEFAULTS.turnos;
    var dias = Array.isArray(pick('diasSinEntrega')) ? pick('diasSinEntrega') : DEFAULTS.diasSinEntrega;
    return {
      turnos: turnos.map(function (t) { return { id: t.id, desde: t.desde, hasta: t.hasta }; }),
      anticipacionMin: pick('anticipacionMin'),
      diasSinEntrega: dias.slice(),
      utcOffsetMin: pick('utcOffsetMin'),
      avisoSinEntrega: pick('avisoSinEntrega'),
      otroHorario: pick('otroHorario') !== false,
    };
  }

  function aMin(hhmm) {
    var m = RE_HORA.exec(String(hhmm || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function horaTxt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return m ? h12 + ':' + (m < 10 ? '0' : '') + m : String(h12);
  }
  function mitad(min) { return min === 720 ? 'm' : (min < 720 ? 'am' : 'pm'); }

  function etiquetaTurno(t) {
    var d = aMin(t.desde), h = aMin(t.hasta);
    var md = mitad(d), mh = mitad(h);
    if (md === mh || (mh === 'm' && md === 'am')) return horaTxt(d) + '–' + horaTxt(h) + ' ' + mh;
    return horaTxt(d) + ' ' + md + '–' + horaTxt(h) + ' ' + mh;
  }
  function horaCorta(hhmm) { var m = aMin(hhmm); return horaTxt(m) + ' ' + mitad(m); }

  function ahoraCuba(ahoraMs, offsetMin) {
    var d = new Date(ahoraMs + offsetMin * 60000);
    return { fecha: d.toISOString().slice(0, 10), dow: d.getUTCDay(), minutos: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function sumarDias(fecha, n) {
    var p = fecha.split('-').map(Number);
    var t = new Date(Date.UTC(p[0], p[1] - 1, p[2]) + n * 86400000);
    return { fecha: t.toISOString().slice(0, 10), dow: t.getUTCDay() };
  }
  function fechaCorta(fecha) { var p = fecha.split('-'); return Number(p[2]) + '/' + Number(p[1]); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function opciones(cfgEntregas, ahoraMs) {
    var c = config(cfgEntregas);
    var ahora = ahoraCuba(ahoraMs, c.utcOffsetMin);
    var turnos = c.turnos.slice().sort(function (a, b) { return aMin(a.desde) - aMin(b.desde); });
    function cerrado(dow) { return c.diasSinEntrega.indexOf(dow) !== -1; }
    var hoyCerrado = cerrado(ahora.dow);
    var hoy = hoyCerrado ? [] : turnos
      .filter(function (t) { return aMin(t.desde) - c.anticipacionMin >= ahora.minutos; })
      .map(function (t) {
        return {
          clave: ahora.fecha + '|' + t.id, fecha: ahora.fecha, turnoId: t.id,
          texto: 'Hoy ' + DIAS[ahora.dow] + ' ' + fechaCorta(ahora.fecha) + ' · ' + etiquetaTurno(t),
        };
      });

    var proximo = null, saltoCerrado = false;
    for (var n = 1; n <= 7; n++) {
      var s = sumarDias(ahora.fecha, n);
      if (cerrado(s.dow)) { saltoCerrado = true; continue; }
      var dia = DIAS[s.dow], corta = fechaCorta(s.fecha);
      proximo = {
        fecha: s.fecha, dia: dia, fechaCorta: corta,
        turnos: turnos.map(function (t) {
          return {
            clave: s.fecha + '|' + t.id, fecha: s.fecha, turnoId: t.id,
            texto: (n === 1 ? 'Mañana ' + dia : cap(dia)) + ' ' + corta + ' · ' + etiquetaTurno(t),
          };
        }),
      };
      break;
    }
    var aviso = '';
    if (!hoy.length && proximo && (hoyCerrado || saltoCerrado) && c.avisoSinEntrega) {
      aviso = c.avisoSinEntrega.split('{dia}').join(proximo.dia).split('{hora}').join(horaCorta(turnos[0].desde));
    }
    return { hoy: hoy, proximo: proximo, aviso: aviso };
  }

  window.Entregas = { DEFAULTS: DEFAULTS, config: config, etiquetaTurno: etiquetaTurno, ahoraCuba: ahoraCuba, opciones: opciones };
})();
