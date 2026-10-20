// test/direcciones.test.js — pruebas de direcciones.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'direcciones.js'), 'utf8'), sandbox);
const { normalizar, mismaDireccion, cargar, guardar, MAX } = sandbox.window.Direcciones;

const CASA = { etiqueta: 'Casa', nombre: 'Ana', tel: '55551234', dir: 'Calle 1 #2', horario: 'en la tarde' };
const TRABAJO = { etiqueta: 'Trabajo', nombre: 'Ana', tel: '55551234', dir: 'Avenida 3', horario: 'en la mañana' };

test('normalizar recorta espacios y deja los cinco campos', () => {
  const d = normalizar({ etiqueta: '  Casa  ', nombre: ' Ana ', tel: ' 5555 ', dir: '  Calle 1  #2 ', horario: ' en la tarde ' });
  assert.strictEqual(d.etiqueta, 'Casa');
  assert.strictEqual(d.nombre, 'Ana');
  assert.strictEqual(d.tel, '5555');
  assert.strictEqual(d.dir, 'Calle 1 #2');
  assert.strictEqual(d.horario, 'en la tarde');
});

test('normalizar aguanta basura sin lanzar', () => {
  const d = normalizar(null);
  assert.strictEqual(d.etiqueta, '');
  assert.strictEqual(d.dir, '');
  const e = normalizar({ dir: 12345 });
  assert.strictEqual(e.dir, '12345');
});

test('normalizar recorta lo larguisimo: nadie tiene una direccion de mil letras', () => {
  const d = normalizar({ etiqueta: 'a'.repeat(50), dir: 'b'.repeat(500) });
  assert.strictEqual(d.etiqueta.length, 20);
  assert.strictEqual(d.dir.length, 120);
});

test('mismaDireccion ignora mayusculas, acentos y espacios de sobra', () => {
  assert.ok(mismaDireccion({ dir: 'Calle Martí  #5' }, { dir: 'calle marti #5' }));
  assert.ok(!mismaDireccion({ dir: 'Calle 1' }, { dir: 'Calle 2' }));
});

test('mismaDireccion con una direccion vacia da false: no se confunden dos vacias', () => {
  assert.ok(!mismaDireccion({ dir: '' }, { dir: '' }));
});

test('cargar lee la lista y descarta lo que no sirve', () => {
  const lista = cargar(JSON.stringify([CASA, { dir: '' }, 'basura', null, TRABAJO]));
  assert.strictEqual(lista.length, 2);
  assert.strictEqual(lista[0].etiqueta, 'Casa');
  assert.strictEqual(lista[1].etiqueta, 'Trabajo');
});

test('cargar con texto roto, vacio o ausente devuelve una lista vacia', () => {
  assert.strictEqual(cargar('{no es json').length, 0);
  assert.strictEqual(cargar('').length, 0);
  assert.strictEqual(cargar(null).length, 0);
  assert.strictEqual(cargar('{"no":"es un array"}').length, 0);
});

test('guardar pone la nueva primero', () => {
  const lista = guardar([CASA], TRABAJO);
  assert.strictEqual(lista.length, 2);
  assert.strictEqual(lista[0].etiqueta, 'Trabajo');
  assert.strictEqual(lista[1].etiqueta, 'Casa');
});

test('guardar la MISMA direccion la actualiza en vez de duplicarla', () => {
  const lista = guardar([CASA], { etiqueta: 'Mi casa', nombre: 'Ana Luisa', tel: '999', dir: 'calle 1 #2', horario: 'a cualquier hora' });
  assert.strictEqual(lista.length, 1);
  assert.strictEqual(lista[0].etiqueta, 'Mi casa');
  assert.strictEqual(lista[0].nombre, 'Ana Luisa');
});

test('guardar sin direccion no cambia nada: no se guarda una ficha vacia', () => {
  const lista = guardar([CASA], { etiqueta: 'Vacia', dir: '   ' });
  assert.strictEqual(lista.length, 1);
  assert.strictEqual(lista[0].etiqueta, 'Casa');
});

test('guardar sin etiqueta la inventa con la direccion, para que el boton diga algo', () => {
  const lista = guardar([], { dir: 'Calle Nueva 7', nombre: 'Ana' });
  assert.strictEqual(lista.length, 1);
  assert.ok(lista[0].etiqueta.length > 0, 'la etiqueta no puede quedar vacia');
});

test('guardar nunca pasa del tope: la mas vieja se cae', () => {
  let lista = [];
  for (let i = 1; i <= MAX + 2; i++) lista = guardar(lista, { etiqueta: 'D' + i, dir: 'Calle ' + i });
  assert.strictEqual(lista.length, MAX);
  assert.strictEqual(lista[0].etiqueta, 'D' + (MAX + 2));   // la ultima guardada va primero
  assert.ok(!lista.some((d) => d.etiqueta === 'D1'), 'la mas vieja tenia que caerse');
});

test('guardar NO toca la lista que recibe', () => {
  const original = [CASA];
  guardar(original, TRABAJO);
  assert.strictEqual(original.length, 1);
  assert.strictEqual(original[0].etiqueta, 'Casa');
});
