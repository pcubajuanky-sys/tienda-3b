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
const { fotosDe: fotosDeVm, pasoDelGesto, indiceSiguiente } = sandbox.window.Galeria;

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

// ── El gesto ──
// pasoDelGesto(dx, dy) -> +1 (siguiente), -1 (anterior) o 0 (no fue un deslizamiento).
// dx positivo = el dedo fue hacia la DERECHA = se quiere la foto ANTERIOR.

test('un deslizamiento claro hacia la izquierda pide la foto siguiente', () => {
  assert.strictEqual(pasoDelGesto(-120, 5), 1);
});

test('un deslizamiento claro hacia la derecha pide la foto anterior', () => {
  assert.strictEqual(pasoDelGesto(120, -8), -1);
});

test('un toque sin arrastre no es un deslizamiento', () => {
  assert.strictEqual(pasoDelGesto(0, 0), 0);
  assert.strictEqual(pasoDelGesto(3, 2), 0);
});

test('un arrastre horizontal corto no cuenta: el umbral son 40 px', () => {
  assert.strictEqual(pasoDelGesto(-39, 0), 0);
  assert.strictEqual(pasoDelGesto(-40, 0), 1);
});

test('si el dedo fue mas en vertical que en horizontal, NO es deslizamiento (es scroll)', () => {
  assert.strictEqual(pasoDelGesto(-50, 90), 0);
  assert.strictEqual(pasoDelGesto(60, -70), 0);
});

test('pasoDelGesto aguanta basura sin reventar', () => {
  assert.strictEqual(pasoDelGesto(undefined, undefined), 0);
  assert.strictEqual(pasoDelGesto(NaN, 0), 0);
  assert.strictEqual(pasoDelGesto('mucho', 0), 0);
});

test('indiceSiguiente da la vuelta en los dos sentidos', () => {
  assert.strictEqual(indiceSiguiente(2, 3, 1), 0);
  assert.strictEqual(indiceSiguiente(0, 3, -1), 2);
  assert.strictEqual(indiceSiguiente(0, 3, 1), 1);
  assert.strictEqual(indiceSiguiente(1, 3, 1), 2);
});

test('indiceSiguiente con una sola foto, o ninguna, se queda en 0', () => {
  assert.strictEqual(indiceSiguiente(0, 1, 1), 0);
  assert.strictEqual(indiceSiguiente(0, 0, 1), 0);
});
