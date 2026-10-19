// historial.js — el boton "atras" del telefono cierra lo que esta abierto.
//
// Modulo PURO (ni DOM ni history): solo decide. Quien empuja y escucha el historial
// es app.js. Se prueba con node:vm desde test/historial.test.js.
//
// Una "capa" es algo que tapa el catalogo:
//   { tipo: 'ficha', id: '<id del producto>', codigo: '<codigo corto>' }
//   { tipo: 'carrito' }
// Las capas van de abajo arriba: la ultima es la que se ve por encima.
(function () {
  'use strict';

  // Identidad de una capa. La ficha lleva el id dentro porque pasar de un producto
  // a otro SI es un cambio (hay que repintar), y sin el id parecerian la misma capa.
  function clave(c) {
    if (!c || !c.tipo) return '';
    return c.id ? c.tipo + ':' + c.id : c.tipo;
  }

  // La URL que le toca a la pila de capas. La manda la de arriba.
  // 🔴 search SIEMPRE se conserva: ahi viaja el ?ref= del gestor.
  function rutaDe(capas, search) {
    const q = search || '';
    const lista = (capas || []).filter(Boolean);
    const arriba = lista[lista.length - 1];
    if (arriba && arriba.tipo === 'ficha' && arriba.codigo) {
      return '/p/' + String(arriba.codigo).toUpperCase() + q;
    }
    return '/' + q;
  }

  // De las capas abiertas AHORA a las que pide el historial: que cerrar y que abrir.
  // Devuelve `cerrar` como CLAVES (de arriba abajo) y `abrir` como las capas enteras
  // (de abajo arriba), porque para abrir hace falta el id y el codigo.
  function transicion(abiertas, destino) {
    const a = (abiertas || []).filter(Boolean);
    const d = (destino || []).filter(Boolean);
    let comun = 0;
    while (comun < a.length && comun < d.length && clave(a[comun]) === clave(d[comun])) comun++;
    return {
      cerrar: a.slice(comun).map(clave).reverse(),
      abrir: d.slice(comun),
    };
  }

  window.Historial = { clave, rutaDe, transicion };
})();
