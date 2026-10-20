// test/taxiMundo.test.js — la pastilla del socio en la cabecera del taxi.
// taxi.js no es cargable (llama a iniciar() y toca document): se extrae la funcion
// pintarMundoEp del propio archivo y se ejecuta en un sandbox con un document falso.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'taxi.js'), 'utf8');

function cargar(conPastilla, conMundos) {
  const i = SRC.indexOf('function pintarMundoEp');
  assert.ok(i >= 0, 'taxi.js no tiene pintarMundoEp');
  const LF = String.fromCharCode(10);
  const j = SRC.indexOf(LF + '}', i);
  const codigo = SRC.slice(i, j + 2);
  const pastilla = { hidden: true };
  const orden = [];
  const sandbox = {
    document: { getElementById: (id) => (id === 'mundo-electripower' && conPastilla ? pastilla : null) },
    window: conMundos ? { Mundos: { refrescar: () => orden.push('refrescar:' + pastilla.hidden) } } : {},
  };
  vm.createContext(sandbox);
  vm.runInContext(codigo + LF + 'this.f = pintarMundoEp;', sandbox);
  return { f: sandbox.f, pastilla, orden };
}

test('electripowerActivo === true destapa la pastilla y refresca la franja DESPUES', () => {
  const { f, pastilla, orden } = cargar(true, true);
  f({ electripowerActivo: true });
  assert.strictEqual(pastilla.hidden, false);
  assert.strictEqual(orden.join(), 'refrescar:false', 'mundos.js cuenta logos visibles: tiene que ir despues del hidden');
});

test('sin la clave (Stock+ aun no la publica) la pastilla se queda oculta', () => {
  const { f, pastilla } = cargar(true, true);
  f({ activo: true });
  assert.strictEqual(pastilla.hidden, true);
  f(null);
  assert.strictEqual(pastilla.hidden, true);
});

test('solo el booleano true cuenta: la cadena "true" o un 1 no la destapan', () => {
  const { f, pastilla } = cargar(true, true);
  f({ electripowerActivo: 'true' });
  assert.strictEqual(pastilla.hidden, true);
  f({ electripowerActivo: 1 });
  assert.strictEqual(pastilla.hidden, true);
});

test('apagarlo la vuelve a ocultar', () => {
  const { f, pastilla } = cargar(true, true);
  f({ electripowerActivo: true });
  f({ electripowerActivo: false });
  assert.strictEqual(pastilla.hidden, true);
});

test('sin pastilla en el HTML o sin Mundos no revienta', () => {
  assert.doesNotThrow(() => cargar(false, true).f({ electripowerActivo: true }));
  assert.doesNotThrow(() => cargar(true, false).f({ electripowerActivo: true }));
});

test('taxi.js la llama ANTES del return del taxi apagado: el socio se ve aunque el taxi no', () => {
  const llamada = SRC.indexOf('pintarMundoEp(TX)');
  const apagado = SRC.indexOf('if (!TX.activo)');
  assert.ok(llamada > 0 && apagado > 0 && llamada < apagado);
});
