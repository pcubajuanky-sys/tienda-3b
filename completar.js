// completar.js — «añade uno de estos y la mensajeria te sale gratis».
//
// Modulo PURO (ni DOM ni red): elige QUE productos ofrecer cuando al carrito le falta poco
// para el umbral de mensajeria gratis. Lo pinta app.js en el carrito. Se prueba con node:vm
// desde test/completar.test.js.
//
// Por que existe: la tienda ya decia «Te faltan 1,550 CUP para la mensajeria gratis» y ahi
// se acababa — la clienta tenia que volver a una parrilla de 225 productos y calcular cual
// cabe. Ahora se los ponemos delante.
//
// 🔴 SOLO se ofrece lo que precioCUP >= falta, es decir lo que de VERDAD cruza el umbral.
// Un producto mas barato que el hueco no da mensajeria gratis, y ofrecerlo como si la diera
// seria mentir. Es la misma regla que ya cumple lineaEnvioTexto() al negarse a decir «te
// faltan» cuando el carrito solo lleva transporte aparte.
//
// 🔴 De mas BARATO a mas caro: el primero que cruza el umbral es el que menos le cuesta a
// la clienta. Ordenarlo al reves subiria el pedido medio una vez y espantaria a la clienta
// la siguiente.
(function () {
  'use strict';

  const MAX = 4;

  function precio(p) {
    const n = Number(p && p.precioCUP);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // Un producto se puede ofrecer aqui solo si las cuatro cosas son ciertas:
  //  - no es de transporte aparte  -> si lo fuera NO sumaria para el umbral (ver esAparte /
  //    totalCarritoElegible en app.js): ofrecerlo seria ofrecer algo que no cumple
  //  - no esta pedido y esperando confirmacion -> no se vende, no se ofrece
  //  - no tiene variantes -> la tira añade de un toque con data-add, y con variantes haria
  //    falta elegir talla/color: eso es la ficha, no el carrito
  //  - tiene precio
  function ofertable(p) {
    if (!p || typeof p !== 'object') return false;
    if (p.envioAparte) return false;
    if (p.espera === true) return false;
    if (p.variantes) return false;
    return precio(p) > 0;
  }

  // (items, {falta, excluirIds, max}) -> productos que cruzan el umbral, del mas barato al
  // mas caro. Cualquier entrada rara devuelve [] (fallo cerrado: mejor no enseñar la tira).
  function candidatos(items, opciones) {
    if (!Array.isArray(items) || !opciones || typeof opciones !== 'object') return [];
    const falta = Number(opciones.falta);
    if (!Number.isFinite(falta) || falta <= 0) return [];
    const fuera = Array.isArray(opciones.excluirIds) ? opciones.excluirIds : [];
    const pedido = Number(opciones.max);
    // El tope se puede bajar, nunca subir: la tira se desplaza en horizontal y mas de
    // cuatro tarjetas en 375 px es una segunda parrilla dentro del carrito.
    const tope = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, MAX) : MAX;
    return items
      .filter((p) => ofertable(p) && precio(p) >= falta && fuera.indexOf(p.id) === -1)
      .sort((a, b) => precio(a) - precio(b))
      .slice(0, tope);
  }

  window.Completar = { candidatos, MAX };
})();
