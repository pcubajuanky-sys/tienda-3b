// test/tarjeta.test.js — pruebas de las funciones puras de tarjeta.js (sin canvas).
// Se corren desde la raiz del repo con:  node --test
// tarjeta.js es un script de navegador (IIFE con window.Tarjeta): se carga en un
// sandbox de node:vm con un window falso. El dibujo en canvas NO se prueba aqui.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tarjeta.js'), 'utf8'), sandbox);
const { precioTarjeta, lineasNombre, nombreArchivo, enlacePie } = sandbox.window.Tarjeta._puro;

const BASE = {
  codigo: 'u8dn',
  name: 'Ventilador recargable',
  precioUSD: 12,
  precioCUP: 8100,
  moneda: 'usd',
  enOferta: false
};

test('precioTarjeta en USD: abre con $, lleva " · " y acaba en CUP, sin precio de antes', () => {
  const r = precioTarjeta(BASE);
  assert.ok(r.grande.startsWith('$'), r.grande);
  assert.ok(r.grande.includes(' · '), r.grande);
  assert.ok(r.grande.endsWith('CUP'), r.grande);
  assert.strictEqual(r.antes, '');
});

test('precioTarjeta en oferta: antes trae el precio normal en la misma moneda y grande no dice Oferta', () => {
  const usd = precioTarjeta({ ...BASE, enOferta: true, precioNormalUSD: 15, precioNormalCUP: 10125 });
  assert.ok(usd.grande.startsWith('$'));
  assert.strictEqual(usd.antes, '$15 USD');
  assert.ok(!/oferta/i.test(usd.grande));

  const cup = precioTarjeta({ ...BASE, moneda: 'cup', enOferta: true, precioNormalUSD: 15, precioNormalCUP: 10125 });
  assert.ok(cup.grande.endsWith('USD'), cup.grande);
  assert.ok(cup.antes.endsWith('CUP'), cup.antes);
  assert.ok(!/oferta/i.test(cup.grande));
});

// `cabe` de mentira: mide caracteres. El real (tarjeta.js) usa ctx.measureText.
const cabeEn = (max) => (t) => t.length <= max;

test('lineasNombre con un nombre corto: una sola linea, sin puntos suspensivos', () => {
  const l = lineasNombre('Ventilador recargable', cabeEn(22), 2);
  assert.strictEqual(l.length, 1);
  assert.strictEqual(l[0], 'Ventilador recargable');
  assert.ok(!l[0].includes('…'));
});

test('lineasNombre con un nombre largo real: 2 lineas, la segunda acaba en … y ninguna pasa del maximo', () => {
  const nombre = 'Clóset Armario Portátil de Acero Inoxidable';
  const l = lineasNombre(nombre, cabeEn(22), 2);
  assert.strictEqual(l.length, 2);
  assert.ok(l[1].endsWith('…'), l[1]);
  l.forEach((x) => assert.ok(x.length <= 22, x));
  // nunca a mitad de palabra: lo que precede al … es un prefijo de palabras enteras
  assert.ok(nombre.startsWith(l[0] + ' ' + l[1].slice(0, -1)));
});

test('lineasNombre con una sola palabra larguisima: se corta, sin undefined ni lineas vacias', () => {
  const l = lineasNombre('Supercalifragilisticoespialidosoextraordinario', cabeEn(22), 2);
  assert.ok(l.length >= 1 && l.length <= 2);
  l.forEach((x) => {
    assert.strictEqual(typeof x, 'string');
    assert.ok(x.length > 0 && x.length <= 22, x);
  });
});

test('lineasNombre: un nombre que entra justo en 2 lineas NO lleva … (el defecto de los 22 caracteres a ojo)', () => {
  // 'Anillos de acero' (16) + 'quirurgico para dama' (20): con 22 por linea sobra sitio en las dos.
  const nombre = 'Anillos de acero quirurgico para dama';
  const l = lineasNombre(nombre, cabeEn(22), 2);
  // (los arrays vienen de otro contexto de vm: se comparan como JSON)
  assert.strictEqual(JSON.stringify(l), JSON.stringify(['Anillos de acero', 'quirurgico para dama']));
  assert.ok(!l.join('').includes('…'));
  // y con mas ancho disponible, cabe en una sola linea
  assert.strictEqual(JSON.stringify(lineasNombre(nombre, cabeEn(40), 2)), JSON.stringify([nombre]));
});

test('nombreArchivo: 3b-CODIGO.jpg en mayusculas, y 3b-producto.jpg sin codigo', () => {
  assert.strictEqual(nombreArchivo({ codigo: 'u8dn' }), '3b-U8DN.jpg');
  assert.strictEqual(nombreArchivo({}), '3b-producto.jpg');
});

test('enlacePie con codigo: minusculas pasan a mayusculas, con barra y sin www.', () => {
  assert.strictEqual(enlacePie('n89wn'), '3bqba.com/N89WN');
  assert.strictEqual(enlacePie('  MARIA '), '3bqba.com/MARIA');
});

test('enlacePie sin codigo: cae al dominio de siempre, www.3bqba.com', () => {
  assert.strictEqual(enlacePie(''), 'www.3bqba.com');
  assert.strictEqual(enlacePie('   '), 'www.3bqba.com');
  assert.strictEqual(enlacePie(null), 'www.3bqba.com');
});

test('enlacePie con undefined u otra cosa que no sea texto: no lanza y da el dominio', () => {
  assert.doesNotThrow(() => enlacePie(undefined));
  assert.strictEqual(enlacePie(undefined), 'www.3bqba.com');
  assert.strictEqual(enlacePie({}), 'www.3bqba.com');
  assert.strictEqual(enlacePie(42), 'www.3bqba.com');
});
