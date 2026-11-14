// test/cupon.test.js — cupon.js (modulo puro) + paridad con `calcular` de Stock+.
// Se corre desde la raiz del repo con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');

const sandbox = { window: { crypto: nodeCrypto.webcrypto }, TextEncoder, Uint8Array };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'cupon.js'), 'utf8'), sandbox);
const C = sandbox.window.Cupon;

const LIB = path.join(__dirname, '..', '..', 'inventario-stockmas', 'lib', 'cupones.js');
const LIB_OK = fs.existsSync(LIB);
const lib = LIB_OK ? require(LIB) : null;

test('normaliza: mayusculas, sin acentos ni simbolos, guion permitido', () => {
  assert.strictEqual(C.normaliza(' verano-10! '), 'VERANO-10');
  assert.strictEqual(C.normaliza('Ñandú 5'), 'NANDU5');
  assert.strictEqual(C.normaliza(null), '');
});

test('huella coincide con la de Stock+', async (t) => {
  if (!LIB_OK) return t.skip('no esta Stock+ al lado');
  for (const cod of ['VERANO-10', 'inv-ab2c', 'Ñandú']) {
    assert.strictEqual(await C.huella(cod), lib.huella(cod));
  }
});

test('buscar: visibles por codigo, el resto por huella; desconocido = null', async (t) => {
  if (!LIB_OK) return t.skip('no esta Stock+ al lado');
  const regla = { etiqueta: 'x', motivo: 'general', tipo: 'pct', valor: 10 };
  const bloque = {
    visibles: [Object.assign({ codigo: 'VERANO10' }, regla)],
    huellas: [Object.assign({ h: lib.huella('PERSONAL-1') }, regla, { personal: true })],
  };
  const a = await C.buscar(bloque, 'verano10');
  assert.strictEqual(a.codigo, 'VERANO10');
  const b = await C.buscar(bloque, ' personal-1 ');
  assert.strictEqual(b.codigo, 'PERSONAL-1');
  assert.strictEqual(b.personal, true);
  assert.strictEqual(b.h, undefined);
  assert.strictEqual(await C.buscar(bloque, 'NOEXISTE'), null);
  assert.strictEqual(await C.buscar(null, 'X'), null);
});

test('motivoLocal: vencido, con-gestor, sin-elegibles y minimo', () => {
  const items = [{ price: 1000, qty: 1, enOferta: false, cat: 'A' }];
  const base = { tipo: 'pct', valor: 10 };
  assert.strictEqual(C.motivoLocal(base, { items }), null);
  assert.strictEqual(C.motivoLocal(Object.assign({ hasta: 1000 }, base), { items, ahora: 2000 }), 'vencido');
  assert.strictEqual(C.motivoLocal(base, { items, vendedor: true }), 'con-gestor');
  assert.strictEqual(C.motivoLocal(Object.assign({ conGestor: true }, base), { items, vendedor: true }), null);
  assert.strictEqual(C.motivoLocal(base, { items: [{ price: 1000, qty: 1, enOferta: true }] }), 'sin-elegibles');
  assert.strictEqual(C.motivoLocal(Object.assign({ cats: ['B'] }, base), { items }), 'sin-elegibles');
  assert.strictEqual(C.motivoLocal(Object.assign({ minimoCUP: 2000 }, base), { items }), 'minimo');
  assert.ok(/2000 CUP/.test(C.texto('minimo', { minimoCUP: 2000 })));
  assert.ok(C.texto('con-gestor').length > 5);
});

test('calcular: casos conocidos', () => {
  const items = [{ price: 1005, qty: 2, enOferta: false, cat: 'A' }, { price: 500, qty: 1, enOferta: true, cat: 'A' }];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.calcular(items, { tipo: 'pct', valor: 10 }, 900))),
    { descuentoCUP: 200, lineas: [{ idx: 0, descUnit: 100 }] });
  // fijo mayor que el subtotal elegible: se topa al subtotal (2010), nunca toca la linea en oferta
  assert.strictEqual(C.calcular(items, { tipo: 'fijo', monedaFijo: 'cup', valor: 3000 }, 900).descuentoCUP, 2010);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.calcular([], { tipo: 'pct', valor: 10 }, 900))), { descuentoCUP: 0, lineas: [] });
});

test('PARIDAD: calcular es identico al de Stock+ en un barrido', (t) => {
  if (!LIB_OK) return t.skip('no esta Stock+ al lado');
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const cats = ['A', 'B', 'C'];
  let casos = 0;
  for (let n = 0; n < 4000; n++) {
    const nl = 1 + Math.floor(rnd() * 5);
    const web = [];
    const productos = [];
    const srv = [];
    for (let i = 0; i < nl; i++) {
      const price = 50 + Math.floor(rnd() * 20000);
      const qty = 1 + Math.floor(rnd() * 4);
      const enOferta = rnd() < 0.25;
      const cat = cats[Math.floor(rnd() * 3)];
      web.push({ price, qty, enOferta, cat });
      productos.push({ id: 'p' + i, cat, ofertaActive: enOferta, oferta: enOferta ? 1 : 0, ofertaUSD: enOferta ? 1 : 0, fixedCurrency: 'usd' });
      srv.push({ pid: 'p' + i, price, qty });
    }
    const tipo = rnd() < 0.5 ? 'pct' : 'fijo';
    const regla = {
      tipo,
      valor: tipo === 'pct' ? 1 + Math.floor(rnd() * 60) : (rnd() < 0.5 ? 1 + Math.floor(rnd() * 5000) : 1 + Math.floor(rnd() * 20)),
      monedaFijo: rnd() < 0.5 ? 'usd' : 'cup',
      topeCUP: rnd() < 0.4 ? Math.floor(rnd() * 3000) : 0,
      cats: rnd() < 0.4 ? [cats[Math.floor(rnd() * 3)]] : [],
    };
    const tasa = [0, 1, 400, 915, 1234.5][Math.floor(rnd() * 5)];
    const a = C.calcular(web, regla, tasa);
    const b = lib.calcular(srv, regla, { products: productos, rate: tasa });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), JSON.stringify({ web, regla, tasa }));
    casos++;
  }
  assert.strictEqual(casos, 4000);
});
