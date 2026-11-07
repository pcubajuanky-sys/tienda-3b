// buscar.js — sugerencias del buscador y lista de «vistos hace poco».
// Modulo PURO (IIFE con window.Buscar): ni DOM ni localStorage. Se prueba con node:vm.
(function () {
  'use strict';

  // Misma regla que normaliza() de app.js: minusculas y sin acentos.
  function normaliza(s) {
    return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Hasta `max` productos cuyo nombre contiene lo escrito. Primero los que EMPIEZAN por
  // ello; dentro de cada grupo se respeta el orden de llegada. Con menos de 2 letras, nada.
  function sugerencias(items, q, max) {
    const tope = max > 0 ? max : 6;
    const t = normaliza(q).trim();
    if (t.length < 2 || !Array.isArray(items)) return [];
    const empieza = [];
    const contiene = [];
    for (const p of items) {
      if (!p) continue;
      const n = normaliza(p.name);
      if (n.indexOf(t) === 0) empieza.push(p);
      else if (n.indexOf(t) !== -1) contiene.push(p);
    }
    return empieza.concat(contiene).slice(0, tope);
  }

  // Un array NUEVO con `id` delante, sin duplicados y recortado a `max`.
  function anotarReciente(lista, id, max) {
    const tope = max > 0 ? max : 10;
    const resto = (Array.isArray(lista) ? lista : []).filter((x) => x !== id);
    return [id].concat(resto).slice(0, tope);
  }

  // JSON.parse seguro: solo un array de strings, sin nulos ni repetidos. Lo demas, [].
  function cargarLista(raw) {
    let v;
    try { v = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(v)) return [];
    const out = [];
    for (const x of v) {
      if (typeof x === 'string' && x && out.indexOf(x) === -1) out.push(x);
    }
    return out;
  }

  window.Buscar = { normaliza: normaliza, sugerencias: sugerencias, anotarReciente: anotarReciente, cargarLista: cargarLista };
})();
