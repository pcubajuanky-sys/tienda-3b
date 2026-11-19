// buscar.js — sugerencias del buscador y lista de «vistos hace poco».
// Modulo PURO (IIFE con window.Buscar): ni DOM ni localStorage. Se prueba con node:vm.
(function () {
  'use strict';

  // Misma regla que normaliza() de app.js: minusculas y sin acentos.
  function normaliza(s) {
    return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Palabras que la gente usa para lo mismo. Se comparan sin acentos y al inicio de palabra.
  const SINONIMOS = [
    'zapato zapatos zapatilla zapatillas tenis calzado sandalia sandalias tacones',
    'pulsera pulseras pulcera pulceras manilla manillas',
    'hebilla hebillas evilla evillas',
    'apoyo apoyos apollo apollos soporte soportes',
    'piercing piercings pirsing pirsings',
    'aretes arete pendientes argollas aretitos',
    'camisa camisas camiseta camisetas pulover pullover polo',
    'licra licras lycra leggins',
    'brasier ajustador ajustadores ajusta sosten top',
    'blumer blumers bloomer',
    'cinto cintos cinturon',
    'gafas espejuelos lentes',
    'tv television televisor',
    'cargador powerbank bateria',
    'linterna faro lampara luces bombillo',
    'mouse raton',
    'enchufe tomacorriente tomacorrientes',
    'bikini trusa',
    'juguete juguetes',
    'liga ligas felpa felpas liguitas mona',
    'batidora merenguera espumero',
    'escuela escolar libreta libretas',
    'proteina suplemento creatina',
    'perfume colonia',
    'audifono audifonos auriculares',
    'bocina bocinas barra',
    'cartera carteras billetera billeteras',
    'celular telefono movil',
    'mueble muebles closet gavetero organizador',
  ].map((l) => l.split(' '));

  // true si la palabra completa `s` (o su plural) aparece en el texto ya normalizado.
  const conPalabra = (texto, s) =>
    texto.split(/[^a-z0-9]+/).some((w) => w === s || w === s + 's' || w === s + 'es');

  // true si TODAS las palabras buscadas están en `texto` (subcadena) o, por sinónimo,
  // como palabra completa en `textoSinonimos` (por defecto, el mismo texto).
  function coincide(texto, q, textoSinonimos) {
    const t = normaliza(texto);
    const ts = textoSinonimos === undefined ? t : normaliza(textoSinonimos);
    const palabras = normaliza(q).trim().split(/\s+/).filter((w) => w.length > 1);
    if (!palabras.length) return t.indexOf(normaliza(q).trim()) !== -1;
    return palabras.every((w) => {
      if (t.indexOf(w) !== -1) return true;
      const grupo = SINONIMOS.find((g) => g.indexOf(w) !== -1);
      return !!grupo && grupo.some((s) => conPalabra(ts, s));
    });
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
      else if (coincide(p.name, q)) contiene.push(p);
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

  window.Buscar = { normaliza: normaliza, coincide: coincide, sugerencias: sugerencias, anotarReciente: anotarReciente, cargarLista: cargarLista };
})();
