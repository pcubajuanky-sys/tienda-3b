// buzon.js — el buzón web: una COPIA de lo que el cliente manda por WhatsApp.
//
// Modulo PURO (ni DOM ni red salvo navigator.sendBeacon, que se puede inyectar): genera el id del
// mensaje, lo añade al texto como linea `Código: XXXXXX` y deja una copia en /api/buzon. Asi, si
// Mia esta caida, el pedido / aviso / opinion ya quedo guardado. Se prueba con node:vm desde
// test/buzon.test.js.
//
// 🔴 CONTRATO con lib/pedidoWeb.js, lib/avisoVuelta.js y lib/opiniones.js de Stock+: la linea
// `Código: XXXXXX` va justo ANTES de la ultima linea `Ref:` (que tiene que seguir siendo la
// ultima, porque los parsers leen la ultima). Es la llave de deduplicacion entre las dos vias
// (buzon y WhatsApp). Un mensaje sin `Código:` se procesa como siempre.
//
// 🔴 enviar() NUNCA lanza y NUNCA es async: se llama justo antes de window.open y un await
// ahi haria que el bloqueador de emergentes se coma el enlace de WhatsApp.
(function () {
  'use strict';

  // Mismo alfabeto que lib/miaCodigo.js de Stock+: sin I, O, 0 ni 1 (se dictan por telefono).
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const LARGO = 6;
  const RUTA = '/api/buzon';

  // (azar opcional, para los tests) -> 6 caracteres del alfabeto.
  function nuevoId(azar) {
    const rnd = typeof azar === 'function' ? azar : Math.random;
    let id = '';
    for (let i = 0; i < LARGO; i++) {
      let x = Number(rnd());
      if (!isFinite(x) || x < 0) x = 0;
      if (x >= 1) x = 0.999999;
      id += ALFABETO[Math.floor(x * ALFABETO.length)];
    }
    return id;
  }

  // Inserta `Código: id` antes de la ULTIMA linea que empiece por `Ref:`; sin ella, al final.
  // Sin id o sin texto, devuelve el texto tal cual.
  function conCodigo(texto, id) {
    const t = (texto === undefined || texto === null) ? '' : String(texto);
    const i = (id === undefined || id === null) ? '' : String(id).trim();
    if (!t || !i) return t;
    const lineas = t.split('\n');
    let pos = -1;
    for (let k = lineas.length - 1; k >= 0; k--) {
      if (/^Ref:/.test(lineas[k])) { pos = k; break; }
    }
    const linea = 'Código: ' + i;
    if (pos === -1) {
      lineas.push(linea);
    } else {
      lineas.splice(pos, 0, linea);
    }
    return lineas.join('\n');
  }

  // (tipo, id, texto[, deps]) -> true si se entrego al navegador, false si no. Nunca lanza.
  function enviar(tipo, id, texto, deps) {
    try {
      const nav = (deps && deps.navigator) || (typeof navigator !== 'undefined' ? navigator : null);
      const Blob_ = (deps && deps.Blob) || (typeof Blob !== 'undefined' ? Blob : null);
      if (!nav || typeof nav.sendBeacon !== 'function' || !Blob_) return false;
      const cuerpo = JSON.stringify({ tipo: tipo, id: id, texto: texto });
      return !!nav.sendBeacon(RUTA, new Blob_([cuerpo], { type: 'application/json' }));
    } catch (e) {
      return false;
    }
  }

  window.Buzon = { nuevoId, conCodigo, enviar, ALFABETO, RUTA };
})();
