// test/paginas.test.js — las DOS paginas cargan todo lo que app.js necesita.
//
// Por que existe: el 2026-10-27 se comprobo en produccion que electripower.html NO
// cargaba espera.js, preguntar.js, completar.js ni listo.js, aunque comparte app.js con
// index.html. No se notaba porque el catalogo de Electripower tiene 0 productos: el dia
// que se publique el primero, avisoQuedanHtml() llama a Espera.enEspera SIN guarda y la
// pagina se queda en blanco con un ReferenceError.
//
// Un comentario no falla cuando alguien añade un modulo y se olvida de la segunda
// pagina. Esto si.
//
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Todo lo que app.js (o encargos.js) da por cargado. Si añades un modulo nuevo, va aqui
// Y en las dos paginas Y en ARMAZON — los tres sitios, o no sirve de nada.
const MODULOS = [
  'mundos.js', 'negocio.js', 'orden.js', 'preciosGestor.js', 'relacionados.js',
  'galeria.js', 'historial.js', 'faltante.js', 'direcciones.js', 'traspedido.js',
  'espera.js', 'preguntar.js', 'completar.js', 'listo.js', 'tasa.js', 'umbral.js',
  'regreso.js', 'tarjeta.js', 'app.js', 'encargos.js'
];

const PAGINAS = ['index.html', 'electripower.html'];

test('🔴 las dos paginas cargan todos los modulos', () => {
  for (const pagina of PAGINAS) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    for (const m of MODULOS) {
      assert.ok(html.includes('src="' + m + '"'), pagina + ' no carga ' + m);
    }
  }
});

test('🔴 todos los modulos estan en ARMAZON: sin conexion tambien', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  for (const m of MODULOS) {
    assert.ok(sw.includes("'/" + m + "'"), m + ' no esta en ARMAZON del service worker');
  }
});

test('🔴 todos los modulos de la lista existen de verdad', () => {
  for (const m of MODULOS) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', m)), 'no existe el archivo ' + m);
  }
});
