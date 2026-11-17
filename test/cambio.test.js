// test/cambio.test.js — «¿Hay que llevar cambio?» (cambio.js) y su cableado.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(leer('cambio.js'), sb);
const { Cambio } = sb.window;

test('con «No» no se escribe nada', () => {
  assert.deepStrictEqual({ ...Cambio.linea(false, '50', 'cup') }, { ok: true, linea: '' });
});

test('con «Sí»: número y moneda, USD por defecto', () => {
  assert.strictEqual(Cambio.linea(true, '20', 'usd').linea, 'Cambio: 20 USD');
  assert.strictEqual(Cambio.linea(true, '1500', 'cup').linea, 'Cambio: 1500 CUP');
  assert.strictEqual(Cambio.linea(true, '2,5', '').linea, 'Cambio: 2.5 USD');
});

test('con «Sí» y sin cantidad válida, no deja enviar', () => {
  for (const m of ['', '0', '-3', 'mucho']) assert.strictEqual(Cambio.linea(true, m, 'usd').ok, false);
});

test('cableado: tres cáscaras, sw y app.js', () => {
  for (const f of ['index.html', 'electripower.html', 'delmar.html']) {
    const h = leer(f);
    assert.ok(h.includes('<script src="cambio.js"></script>'), f);
    assert.ok(h.indexOf('cambio.js') < h.indexOf('<script src="app.js">'), f);
    assert.ok(h.includes('id="c-cambio-monto"') && h.includes('<option value="usd" selected>USD</option>'), f);
    assert.ok(/name="c-cambio" value="no" checked/.test(h), f);
  }
  assert.ok(leer('sw.js').includes("'/cambio.js'"));
  const app = leer('app.js');
  assert.ok(app.includes('engancharCambio();'));
  assert.ok(app.indexOf('if (lineaCambio) lineas.push(lineaCambio)') > app.indexOf('lineas.push(`Turno: ${turno}`)'));
  assert.ok(app.indexOf('if (lineaCambio) lineas.push(lineaCambio)') < app.indexOf('lineas.push(`Cupón: ${cvWA.codigo}`)'));
});

test('el contrato lo entiende Stock+ (lib/cambioPedido.js) si está al lado', (t) => {
  const p = path.join(RAIZ, '..', 'inventario-stockmas', 'lib', 'cambioPedido.js');
  if (!fs.existsSync(p)) return t.skip('Stock+ no está al lado');
  const C = require(p);
  for (const [si, m, mon] of [[true, '20', 'usd'], [true, '1500', 'cup'], [true, '2,5', 'usd']]) {
    const l = Cambio.linea(si, m, mon).linea;
    const r = C.parsear(l.replace(/^Cambio: /, ''));
    assert.ok(r && r.ok, l);
  }
});
