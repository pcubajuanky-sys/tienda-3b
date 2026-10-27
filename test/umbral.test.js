// test/umbral.test.js — pruebas de umbral.js (modulo puro, sin navegador).
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'umbral.js'), 'utf8'), sandbox);
const { mensaje } = sandbox.window.Umbral;

const base = { activo: true, umbral: 2000, elegible: 0, precio: 500, aparte: false, espera: false };

test('con el carrito vacio dice cuanto faltaria DESPUES de añadirlo', () => {
  // 2000 - 0 - 500 = 1500. La cifra habla del pedido CON este producto dentro: si
  // dijera 2000 estaria contando un carrito que la clienta ya no va a tener.
  const t = mensaje(base);
  assert.ok(t.includes('1,500 CUP'), 'la cifra tiene que ser la de DESPUES de añadirlo: ' + t);
  assert.ok(/A[ñn][aá]delo/i.test(t), 'tiene que hablar de ESTE producto');
  assert.ok(/mensajer[ií]a gratis/i.test(t));
});

test('🔴 cuando ESTE producto cruza el umbral, se dice y se celebra', () => {
  // Es el momento de mayor intencion de compra de toda la tienda: no se puede
  // desperdiciar con un «te faltan 0 CUP».
  const t = mensaje({ ...base, elegible: 1600, precio: 500 });
  assert.ok(/lleva mensajer[ií]a gratis/i.test(t), t);
  assert.ok(!/faltar/i.test(t), 'no puede decir que falta nada: ya no falta');
});

test('justo en el umbral cuenta como alcanzado («desde», no «mas de»)', () => {
  const t = mensaje({ ...base, elegible: 1500, precio: 500 });
  assert.ok(/lleva mensajer[ií]a gratis/i.test(t), '1500 + 500 = 2000 YA es gratis: ' + t);
});

test('con el umbral ya alcanzado, tranquiliza en vez de empujar', () => {
  const t = mensaje({ ...base, elegible: 3000 });
  assert.ok(/ya lleva mensajer[ií]a gratis/i.test(t), t);
  assert.ok(!/A[ñn][aá]delo/i.test(t), 'ya no hace falta empujar');
});

test('🔴 nunca promete nada sobre lo que no cuenta para el umbral', () => {
  // Transporte aparte: su envio NUNCA va a ser gratis, asi que ni suma ni se ofrece.
  assert.strictEqual(mensaje({ ...base, aparte: true }), '');
  // Pedido y esperando confirmacion: no se puede comprar, no se empuja.
  assert.strictEqual(mensaje({ ...base, espera: true }), '');
});

test('🔴 sin umbral configurado la ficha se ve exactamente como antes', () => {
  assert.strictEqual(mensaje({ ...base, activo: false }), '');
  assert.strictEqual(mensaje({ ...base, umbral: 0 }), '');
});

test('cualquier entrada rara calla, nunca enseña NaN ni undefined', () => {
  assert.strictEqual(mensaje(null), '');
  assert.strictEqual(mensaje(undefined), '');
  assert.strictEqual(mensaje('2000'), '');
  assert.strictEqual(mensaje({ ...base, precio: undefined }), '');
  assert.strictEqual(mensaje({ ...base, precio: 0 }), '');
  assert.strictEqual(mensaje({ ...base, umbral: 'dos mil' }), '');
  assert.strictEqual(mensaje({ ...base, elegible: NaN }), '');
});

test('la cifra se lee como dinero, con separador de miles', () => {
  const t = mensaje({ ...base, umbral: 12000, elegible: 0, precio: 500 });
  assert.ok(t.includes('11,500 CUP'), t);
});

test('🔴 el cableado existe en app.js y en las DOS paginas', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('window.Umbral.mensaje('), 'app.js no llama al modulo');
  // Se repinta con la accion: el carrito cambia sin cerrar la ficha (el boton
  // «Añadir» esta justo encima), asi que la frase tiene que seguirle el paso.
  assert.ok(app.includes('pintarUmbralFicha('), 'falta la funcion que lo pinta');
  for (const pagina of ['index.html', 'electripower.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('id="ficha-umbral"'), pagina + ': falta el hueco en la ficha');
  }
});
