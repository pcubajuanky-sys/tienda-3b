// test/apiBuzon.test.js — pruebas de api/buzon.js con fetch inyectado (sin red).
const test = require('node:test');
const assert = require('node:assert');
const { crearHandler, validar } = require('../api/buzon.js');

const ENV = { BUZON_REPO: 'ruth/buzon-3b', BUZON_TOKEN: 'tok' };
const PEDIDO = { tipo: 'pedido', id: 'AB23CD', texto: '🛒 *Pedido desde la web*\nCódigo: AB23CD\nRef: K7M2 x1' };

function res() {
  return { statusCode: 0, headers: {}, terminado: false,
    setHeader(k, v) { this.headers[k] = v; }, end() { this.terminado = true; } };
}
function peticion(cuerpo, metodo) {
  return { method: metodo || 'POST', body: cuerpo, headers: { 'user-agent': 'UA-prueba' } };
}
function montar(env, fetchImpl) {
  const llamadas = [];
  const f = async (url, o) => {
    llamadas.push({ url, o });
    if (fetchImpl) return fetchImpl(url, o);
    return { ok: true };
  };
  return { llamadas, handler: crearHandler({ fetch: f, env, ahora: () => 1700000000000 }) };
}

test('escribe el archivo en pendientes/<ts>-<id>.json con el contenido en base64 y responde 204', async () => {
  const { llamadas, handler } = montar(ENV);
  const r = res();
  await handler(peticion(PEDIDO), r);
  assert.strictEqual(r.statusCode, 204);
  assert.strictEqual(llamadas.length, 1);
  assert.strictEqual(llamadas[0].url, 'https://api.github.com/repos/ruth/buzon-3b/contents/pendientes/1700000000000-AB23CD.json');
  assert.strictEqual(llamadas[0].o.method, 'PUT');
  assert.strictEqual(llamadas[0].o.headers.Authorization, 'Bearer tok');
  const cuerpo = JSON.parse(llamadas[0].o.body);
  const archivo = JSON.parse(Buffer.from(cuerpo.content, 'base64').toString('utf8'));
  assert.deepStrictEqual(archivo, { v: 1, tipo: 'pedido', id: 'AB23CD', texto: PEDIDO.texto, ts: 1700000000000, ua: 'UA-prueba' });
});

test('acepta el cuerpo como texto JSON', async () => {
  const { llamadas, handler } = montar(ENV);
  const r = res();
  await handler(peticion(JSON.stringify(PEDIDO)), r);
  assert.strictEqual(llamadas.length, 1);
  assert.strictEqual(r.statusCode, 204);
});

test('sin BUZON_REPO o sin BUZON_TOKEN no hace nada y responde 204', async () => {
  for (const env of [{}, { BUZON_REPO: 'a/b' }, { BUZON_TOKEN: 't' }]) {
    const { llamadas, handler } = montar(env);
    const r = res();
    await handler(peticion(PEDIDO), r);
    assert.strictEqual(llamadas.length, 0);
    assert.strictEqual(r.statusCode, 204);
  }
});

test('solo POST: otros metodos no escriben pero responden 204', async () => {
  const { llamadas, handler } = montar(ENV);
  const r = res();
  await handler(peticion(PEDIDO, 'GET'), r);
  assert.strictEqual(llamadas.length, 0);
  assert.strictEqual(r.statusCode, 204);
});

test('validacion: tipo, id y marca; lo invalido no escribe pero responde 204', async () => {
  const malos = [
    { ...PEDIDO, tipo: 'otro' },
    { ...PEDIDO, id: 'AB23C' },          // corto
    { ...PEDIDO, id: 'AB23CI' },         // con I
    { ...PEDIDO, id: 'ab23cd' },         // minusculas
    { ...PEDIDO, texto: 'hola sin marca' },
    { ...PEDIDO, tipo: 'aviso' },        // marca de pedido en un aviso
    { tipo: 'opinion', id: 'AB23CD', texto: 'texto' },
    null, 'x', 5,
  ];
  for (const m of malos) {
    const { llamadas, handler } = montar(ENV);
    const r = res();
    await handler(peticion(m), r);
    assert.strictEqual(llamadas.length, 0, JSON.stringify(m));
    assert.strictEqual(r.statusCode, 204);
  }
});

test('las tres marcas validas pasan', () => {
  assert.ok(validar({ tipo: 'pedido', id: 'AB23CD', texto: 'Pedido desde la web' }));
  assert.ok(validar({ tipo: 'aviso', id: 'AB23CD', texto: 'x 🔔 *AVÍSAME CUANDO VUELVA* y' }));
  assert.ok(validar({ tipo: 'opinion', id: 'AB23CD', texto: '⭐ *MI OPINIÓN*\nRef: X' }));
});

test('cuerpo de mas de 8 KB: se descarta', async () => {
  const { llamadas, handler } = montar(ENV);
  const r = res();
  await handler(peticion({ ...PEDIDO, texto: PEDIDO.texto + 'a'.repeat(9000) }), r);
  assert.strictEqual(llamadas.length, 0);
  assert.strictEqual(r.statusCode, 204);
});

test('si GitHub falla (error de red o lanza), igual responde 204', async () => {
  const { handler } = montar(ENV, async () => { throw new Error('red caida'); });
  const r = res();
  await handler(peticion(PEDIDO), r);
  assert.strictEqual(r.statusCode, 204);
  assert.strictEqual(r.terminado, true);
});
