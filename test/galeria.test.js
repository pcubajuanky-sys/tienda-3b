// test/galeria.test.js — pruebas de galeria.js. Se corren desde la raiz del repo con:
// node --test   (NO `node --test test/`: con Node 24 eso falla)
// galeria.js es un script de navegador (IIFE con window.Galeria): se carga en un
// sandbox de node:vm con un window falso, igual que tarjeta.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'galeria.js'), 'utf8'), sandbox);
const { fotosDe: fotosDeVm } = sandbox.window.Galeria;

// Los arrays que devuelve el sandbox de node:vm nacen en OTRO realm: deepStrictEqual
// los da por distintos de un [] normal aunque tengan lo mismo. Se copian a un Array
// del realm de la prueba antes de comparar.
const fotosDe = (p) => Array.from(fotosDeVm(p));

const P = 'https://res.cloudinary.com/x/principal.jpg';

test('sin fotos extra, la galeria es solo la principal', () => {
  assert.deepStrictEqual(fotosDe({ photo: P }), [P]);
});

test('la principal va SIEMPRE primera', () => {
  const r = fotosDe({ photo: P, fotos: ['https://res.cloudinary.com/x/a.jpg'] });
  assert.strictEqual(r[0], P);
  assert.strictEqual(r.length, 2);
});

test('no repite una extra igual a la principal', () => {
  assert.deepStrictEqual(fotosDe({ photo: P, fotos: [P] }), [P]);
});

test('tira huecos y cosas que no son texto', () => {
  const r = fotosDe({ photo: P, fotos: ['', '  ', null, 7, 'https://res.cloudinary.com/x/a.jpg'] });
  assert.deepStrictEqual(r, [P, 'https://res.cloudinary.com/x/a.jpg']);
});

test('un producto sin foto ninguna da lista vacia, no revienta', () => {
  assert.deepStrictEqual(fotosDe({}), []);
  assert.deepStrictEqual(fotosDe(null), []);
});
