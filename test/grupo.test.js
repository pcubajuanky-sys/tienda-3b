// test/grupo.test.js — pruebas de grupo.js (modulo puro). Se corre con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'grupo.js'), 'utf8'), sandbox);
const { enlaceValido, enlaceDe, logoDe } = sandbox.window.Grupo;

const OK = 'https://chat.whatsapp.com/AbCdEf123';

test('solo vale https://chat.whatsapp.com/ con codigo', () => {
  assert.strictEqual(enlaceValido(OK), OK);
  assert.strictEqual(enlaceValido('  ' + OK + ' '), OK);
  for (const mal of ['', null, undefined, 'https://chat.whatsapp.com/', 'http://chat.whatsapp.com/X',
    'https://chat.whatsapp.com.evil.com/X', 'javascript:alert(1)', 'https://otro.com/X', 'https://chat.whatsapp.com/a b']) {
    assert.strictEqual(enlaceValido(mal), '', String(mal));
  }
});

test('la casa usa tienda.grupoWA', () => {
  assert.strictEqual(enlaceDe({ grupoWA: OK }, '3b'), OK);
  assert.strictEqual(enlaceDe({ grupoWA: OK }, undefined), OK);
  assert.strictEqual(enlaceDe({}, '3b'), '');
  assert.strictEqual(enlaceDe(null, '3b'), '');
});

test('🔴 un socio NO hereda el grupo de la casa, solo el suyo', () => {
  // Negocio.aplicar ya mezclo el bloque del socio en tienda: tienda.grupoWA seria el de la casa.
  const t = { grupoWA: OK, negocios: { delmar: { nombre: 'Del Mar' }, electripower: { grupoWA: 'https://chat.whatsapp.com/PROPIO' } } };
  assert.strictEqual(enlaceDe(t, 'delmar'), '');
  assert.strictEqual(enlaceDe(t, 'electripower'), 'https://chat.whatsapp.com/PROPIO');
  assert.strictEqual(enlaceDe({ grupoWA: OK }, 'delmar'), '');
});

test('logoDe elige el logo del negocio y cae a la casa', () => {
  assert.strictEqual(logoDe('3b'), '/logo-3b.png');
  assert.strictEqual(logoDe('electripower'), '/logo-electripower.png');
  assert.strictEqual(logoDe('Delmar'), '/logo-delmar.png');
  assert.strictEqual(logoDe('desconocido'), '/logo-3b.png');
  assert.strictEqual(logoDe(null), '/logo-3b.png');
  for (const n of ['3b', 'electripower', 'delmar']) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', logoDe(n).slice(1))), n);
  }
});
