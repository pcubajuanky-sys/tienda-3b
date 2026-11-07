// orden.js — ordenar y filtrar el catalogo de la tienda.
// Script de navegador (IIFE con window.Orden), mismo patron que galeria.js y
// relacionados.js: la logica vive aqui para poder probarla con `node --test` sin
// navegador.
//
// 🔴 Aqui NO se decide que es «mensajeria gratis»: eso lo calcula Stock+ y viaja como el
// booleano `envioGratis` (ver lib/catalogoWeb.js). En el catalogo de hoy 140 productos la
// llevan siempre y 106 la llevan «desde 2,000 CUP»; mirar el texto con una expresion
// regular aqui mezclaria los dos y prometeria de mas.
(function () {
  'use strict';

  // El orden de siempre es por nombre: es como llega el catalogo desde Stock+, asi que
  // dejarlo por defecto hace que nada cambie hasta que el cliente elija.
  var OPCIONES = [
    { id: 'az', texto: 'Nombre (A–Z)' },
    { id: 'barato', texto: 'Más baratos primero' },
    { id: 'caro', texto: 'Más caros primero' },
    { id: 'nuevo', texto: 'Lo más nuevo' },
  ];

  function porNombre(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  }

  // Siempre devuelve un array NUEVO: la lista del catalogo no se reordena bajo los pies
  // de quien la tenga guardada.
  function ordenar(items, criterio) {
    var lista = Array.isArray(items) ? items.slice() : [];
    if (criterio === 'barato') return lista.sort(function (a, b) { return (a.precioCUP || 0) - (b.precioCUP || 0) || porNombre(a, b); });
    if (criterio === 'caro') return lista.sort(function (a, b) { return (b.precioCUP || 0) - (a.precioCUP || 0) || porNombre(a, b); });
    if (criterio === 'nuevo') return lista.sort(function (a, b) { return (b.creado || 0) - (a.creado || 0) || porNombre(a, b); });
    return lista.sort(porNombre);   // 'az' y cualquier cosa rara
  }

  function filtrar(items, soloEnvioGratis) {
    var lista = Array.isArray(items) ? items : [];
    if (!soloEnvioGratis) return lista.slice();
    return lista.filter(function (p) { return p && p.envioGratis === true; });
  }

  // Las opciones que TIENEN sentido con este catalogo. Si ningun producto trae `creado`
  // —porque Stock+ todavia no lo publica— no se ofrece «Lo más nuevo»: mas vale una
  // opcion de menos que una que no ordena nada.
  function opcionesUtiles(items) {
    var lista = Array.isArray(items) ? items : [];
    var hayFecha = lista.some(function (p) { return p && Number(p.creado) > 0; });
    return OPCIONES.filter(function (o) { return o.id !== 'nuevo' || hayFecha; });
  }

  // ¿Merece la pena enseñar el filtro de mensajeria? Solo si alguno la lleva y no TODOS.
  function hayEnvioGratis(items) {
    var lista = Array.isArray(items) ? items : [];
    var n = lista.filter(function (p) { return p && p.envioGratis === true; }).length;
    return n > 0 && n < lista.length;
  }

  // Rangos de precio en CUP (la misma escala para todos). Entra si min <= precio < max.
  var RANGOS = [
    { id: 'h1000', texto: 'Hasta 1,000 CUP', min: 0, max: 1000 },
    { id: '1000-3000', texto: '1,000 – 3,000 CUP', min: 1000, max: 3000 },
    { id: '3000-10000', texto: '3,000 – 10,000 CUP', min: 3000, max: 10000 },
    { id: 'm10000', texto: 'Más de 10,000 CUP', min: 10000, max: Infinity },
  ];

  function enRango(p, r) {
    var c = Number(p && p.precioCUP) || 0;
    return c >= r.min && c < r.max;
  }

  // Array NUEVO; un id vacio o desconocido devuelve todos.
  function filtrarPrecio(items, rangoId) {
    var lista = Array.isArray(items) ? items : [];
    var r = RANGOS.filter(function (x) { return x.id === rangoId; })[0];
    if (!r) return lista.slice();
    return lista.filter(function (p) { return p && enRango(p, r); });
  }

  // Solo los rangos que tienen algun producto. Con menos de 2 un filtro no separa nada: [].
  function rangosUtiles(items) {
    var lista = Array.isArray(items) ? items : [];
    var utiles = RANGOS.filter(function (r) { return lista.some(function (p) { return p && enRango(p, r); }); });
    return utiles.length < 2 ? [] : utiles;
  }

  window.Orden = { ordenar: ordenar, filtrar: filtrar, opcionesUtiles: opcionesUtiles, hayEnvioGratis: hayEnvioGratis, RANGOS: RANGOS, filtrarPrecio: filtrarPrecio, rangosUtiles: rangosUtiles };
})();
