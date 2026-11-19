// colecciones.js — colecciones de la portada («Para regalar», «Para los apagones»). PURO.
// Contrato: catalogo.json trae en la raiz colecciones:[{id,nombre,emoji}] (solo si hay) y cada
// item puede traer colecciones:['regalar',...]. Solo se devuelven las de 2 o mas productos.
(function () {
  function deCatalogo(cat) {
    const cols = cat && Array.isArray(cat.colecciones) ? cat.colecciones : [];
    const items = cat && Array.isArray(cat.items) ? cat.items : [];
    const out = [];
    cols.forEach((c) => {
      if (!c || !c.id) return;
      const lista = items.filter((p) => Array.isArray(p.colecciones) && p.colecciones.includes(c.id));
      if (lista.length >= 2) {
        out.push({ id: c.id, titulo: (c.emoji ? c.emoji + ' ' : '') + (c.nombre || ''), items: lista });
      }
    });
    return out;
  }
  window.Colecciones = { deCatalogo };
})();
