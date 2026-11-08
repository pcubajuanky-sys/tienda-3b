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
    return { ok: true, status: 201 };
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

// --- Diagnostico: cabecera X-Buzon (nunca lleva token ni repo) ---
const TOKEN_OK = 'github_pat_ABC123';

test('X-Buzon: ok:<status> cuando GitHub acepta', async () => {
  const { handler } = montar({ BUZON_REPO: 'ruth/buzon-3b', BUZON_TOKEN: TOKEN_OK });
  const r = res();
  await handler(peticion(PEDIDO), r);
  assert.strictEqual(r.headers['X-Buzon'], 'ok:201');
  assert.strictEqual(r.headers['X-Buzon-Repo-Formato'], 'ok');
  assert.strictEqual(r.headers['X-Buzon-Token-Formato'], 'ok');
});

test('X-Buzon: sin-config:repo / token / ambos', async () => {
  const casos = [
    [{ BUZON_TOKEN: 't' }, 'sin-config:repo'],
    [{ BUZON_REPO: 'a/b' }, 'sin-config:token'],
    [{}, 'sin-config:ambos'],
    [{ BUZON_REPO: '   ', BUZON_TOKEN: '\n' }, 'sin-config:ambos'],
  ];
  for (const [env, esperado] of casos) {
    const { handler } = montar(env);
    const r = res();
    await handler(peticion(PEDIDO), r);
    assert.strictEqual(r.headers['X-Buzon'], esperado);
    assert.strictEqual(r.statusCode, 204);
  }
});

test('X-Buzon: metodo e invalido', async () => {
  const a = montar(ENV); const ra = res();
  await a.handler(peticion(PEDIDO, 'GET'), ra);
  assert.strictEqual(ra.headers['X-Buzon'], 'metodo');
  const b = montar(ENV); const rb = res();
  await b.handler(peticion({ ...PEDIDO, tipo: 'otro' }), rb);
  assert.strictEqual(rb.headers['X-Buzon'], 'invalido');
});

test('X-Buzon: github:<status>;<message> recortado a 80 y solo ASCII', async () => {
  const largo = 'Bad credentials ñ é ' + 'x'.repeat(200);
  const { handler } = montar(ENV, async () => ({ ok: false, status: 401, json: async () => ({ message: largo }) }));
  const r = res();
  await handler(peticion(PEDIDO), r);
  const h = r.headers['X-Buzon'];
  assert.ok(h.startsWith('github:401;Bad credentials  '), h);
  assert.strictEqual(h.slice('github:401;'.length).length, 80);
  assert.ok(/^[\x20-\x7E]+$/.test(h));
  // sin cuerpo JSON legible: solo el status
  const sin = montar(ENV, async () => ({ ok: false, status: 404, json: async () => { throw new Error('x'); } }));
  const r2 = res();
  await sin.handler(peticion(PEDIDO), r2);
  assert.strictEqual(r2.headers['X-Buzon'], 'github:404');
});

test('X-Buzon: error:<name> si el fetch lanza o aborta', async () => {
  const { handler } = montar(ENV, async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; });
  const r = res();
  await handler(peticion(PEDIDO), r);
  assert.strictEqual(r.headers['X-Buzon'], 'error:AbortError');
  assert.strictEqual(r.statusCode, 204);
});

test('formatos: raro con repo/token mal formados, y trim de las variables', async () => {
  const mal = montar({ BUZON_REPO: 'sin-barra', BUZON_TOKEN: 'abc def' });
  const r = res();
  await mal.handler(peticion(PEDIDO), r);
  assert.strictEqual(r.headers['X-Buzon-Repo-Formato'], 'raro');
  assert.strictEqual(r.headers['X-Buzon-Token-Formato'], 'raro');
  // con espacios/saltos alrededor se recortan y el formato queda ok
  const m = montar({ BUZON_REPO: ' ruth/buzon-3b\n', BUZON_TOKEN: ' ghp_XYZ\n' });
  const r2 = res();
  await m.handler(peticion(PEDIDO), r2);
  assert.strictEqual(m.llamadas[0].url.split('/repos/')[1].split('/contents')[0], 'ruth/buzon-3b');
  assert.strictEqual(m.llamadas[0].o.headers.Authorization, 'Bearer ghp_XYZ');
  assert.strictEqual(r2.headers['X-Buzon-Repo-Formato'], 'ok');
  assert.strictEqual(r2.headers['X-Buzon-Token-Formato'], 'ok');
});

test('ninguna cabecera filtra el token ni el repo', async () => {
  const env = { BUZON_REPO: 'ruth/secreto-repo', BUZON_TOKEN: 'github_pat_SECRETO999' };
  const fallos = [
    undefined,
    async () => ({ ok: false, status: 401, json: async () => ({ message: 'Bad credentials' }) }),
    async () => { throw new Error('boom'); },
  ];
  for (const f of fallos) {
    const { handler } = montar(env, f);
    const r = res();
    await handler(peticion(PEDIDO), r);
    const todo = JSON.stringify(r.headers);
    assert.ok(!todo.includes('SECRETO999') && !todo.includes('secreto-repo'), todo);
  }
});
