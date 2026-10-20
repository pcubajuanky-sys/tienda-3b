// direcciones.js — la libreta de direcciones del cliente.
//
// Modulo PURO: ni DOM ni localStorage. Recibe texto y listas, devuelve listas nuevas.
// Quien lee y escribe el localStorage es app.js. Se prueba con node:vm desde
// test/direcciones.test.js.
//
// 🔴 Esto vive SOLO en el telefono del cliente. La tienda es estatica: no hay servidor
// donde guardar nada, y los datos no salen de ahi mas que en el mensaje de WhatsApp que
// el propio cliente envia.
(function () {
  'use strict';

  const MAX = 4;              // mas de 4 botones no caben en un movil
  const LARGO = { etiqueta: 20, nombre: 60, tel: 25, dir: 120, horario: 80 };

  function texto(v, max) {
    const s = (v === undefined || v === null) ? '' : String(v);
    return s.replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function normalizar(d) {
    const o = d || {};
    return {
      etiqueta: texto(o.etiqueta, LARGO.etiqueta),
      nombre: texto(o.nombre, LARGO.nombre),
      tel: texto(o.tel, LARGO.tel),
      dir: texto(o.dir, LARGO.dir),
      horario: texto(o.horario, LARGO.horario),
    };
  }

  // La direccion es la identidad de la ficha: dos fichas con la misma direccion son la
  // misma, aunque el cliente le cambie la etiqueta o corrija su telefono.
  function llave(dir) {
    return texto(dir, LARGO.dir).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function mismaDireccion(a, b) {
    const x = llave((a || {}).dir);
    const y = llave((b || {}).dir);
    return x !== '' && x === y;
  }

  // Texto crudo del localStorage -> lista limpia. Nunca lanza: lo que no sirve se tira.
  function cargar(texto0) {
    let bruto = null;
    try { bruto = JSON.parse(texto0 || '[]'); } catch (e) { return []; }
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((d) => d && typeof d === 'object')
      .map(normalizar)
      .filter((d) => d.dir !== '')
      .slice(0, MAX);
  }

  // Devuelve una lista NUEVA con `nueva` delante. Si ya habia una ficha con esa misma
  // direccion, se sustituye (no se duplica). Sin direccion no se guarda nada.
  function guardar(lista, nueva) {
    const d = normalizar(nueva);
    if (d.dir === '') return (lista || []).slice(0, MAX);
    if (d.etiqueta === '') d.etiqueta = texto(d.dir, LARGO.etiqueta);   // el boton tiene que decir algo
    const resto = (lista || []).filter((x) => !mismaDireccion(x, d));
    return [d].concat(resto).slice(0, MAX);
  }

  // No hay un "borrar una sola" a proposito: con el tope de 4 las viejas se caen solas,
  // guardar la misma direccion la corrige, y para empezar de cero esta "Olvidar mis datos".
  window.Direcciones = { MAX, normalizar, mismaDireccion, cargar, guardar };
})();
