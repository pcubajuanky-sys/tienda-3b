// test/faltante.test.js — pruebas de faltante.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'faltante.js'), 'utf8'), sandbox);
const { limpiar, mensaje, enlace } = sandbox.window.Faltante;

test('limpiar quita los espacios de sobra', () => {
  assert.strictEqual(limpiar('  televisor   plasma '), 'televisor plasma');
});

test('limpiar recorta lo larguisimo: nadie busca una parrafada', () => {
  assert.strictEqual(limpiar('a'.repeat(200)).length, 60);
});

test('limpiar aguanta lo que no es texto', () => {
  assert.strictEqual(limpiar(undefined), '');
  assert.strictEqual(limpiar(null), '');
  assert.strictEqual(limpiar(12), '12');
});

test('el mensaje dice que viene de la web y repite lo buscado', () => {
  const m = mensaje('televisor plasma');
  assert.ok(m.includes('televisor plasma'), 'tiene que citar lo que busco');
  assert.ok(/web/i.test(m), 'tiene que decir que fue en la web');
});

test('sin termino no hay mensaje: no se manda un WhatsApp vacio', () => {
  assert.strictEqual(mensaje('   '), '');
  assert.strictEqual(mensaje(undefined), '');
});

test('el enlace lleva el telefono en digitos y el texto codificado', () => {
  const u = enlace('+53 5 555 1234', 'faja moldeadora');
  assert.ok(u.startsWith('https://api.whatsapp.com/send?phone=5355551234&text='), u);
  assert.ok(u.includes(encodeURIComponent('faja moldeadora')), u);
});

test('sin telefono o sin termino no hay enlace', () => {
  assert.strictEqual(enlace('', 'algo'), '');
  assert.strictEqual(enlace('5355551234', ''), '');
  assert.strictEqual(enlace(undefined, undefined), '');
});

test('un termino con caracteres raros va codificado, no crudo', () => {
  const u = enlace('5355551234', 'niño & "algo"');
  assert.ok(!u.includes('"'), 'las comillas no pueden ir crudas: ' + u);
  assert.ok(!u.includes(' '), 'los espacios no pueden ir crudos: ' + u);
});
