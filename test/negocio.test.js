const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar() {
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'negocio.js'), 'utf8');
  const sandbox = { window: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox);
  return sandbox.window.Negocio;
}

function catalogo() {
  return {
    whatsapp: '5354978966',
    items: [
      { id: 'a', name: 'Sabanas' },
      { id: 'b', name: 'Inversor', negocio: 'electripower' },
    ],
    tienda: {
      nombre: '3B Store', garantia: 'Garantia de la casa', mensajeriaCUP: 300,
      envioGratisCUP: 2000, taxiActivo: true, encargosActivo: true,
      cierre: { activo: false }, electripowerActivo: true,
      negocios: {
        electripower: {
          nombre: 'Electripower', emoji: '⚡', whatsapp: '5358856820',
          garantia: 'Garantia del socio', mensajeriaCUP: 0, envioGratisCUP: 0,
        },
      },
    },
  };
}

test('la pagina dice de quien es por el atributo del body', () => {
  const N = cargar();
  assert.equal(N.deLaPagina({ body: { dataset: {} } }), '3b');
  assert.equal(N.deLaPagina({ body: { dataset: { negocio: 'electripower' } } }), 'electripower');
  assert.equal(N.deLaPagina(null), '3b', 'sin documento, la casa');
});

test('en la pagina de la casa solo se ven los items de la casa', () => {
  const N = cargar();
  const cat = N.aplicar(catalogo(), '3b');
  assert.deepEqual(cat.items.map((i) => i.id), ['a']);
  assert.equal(cat.tienda.nombre, '3B Store');
  assert.equal(cat.whatsapp, '5354978966');
  assert.equal(cat.tienda.garantia, 'Garantia de la casa');
});

test('en la pagina del socio se ven los suyos y con SU marca', () => {
  const N = cargar();
  const cat = N.aplicar(catalogo(), 'electripower');
  assert.deepEqual(cat.items.map((i) => i.id), ['b']);
  assert.equal(cat.tienda.nombre, 'Electripower');
  assert.equal(cat.tienda.garantia, 'Garantia del socio');
});

test('🔴 el PEDIDO sigue saliendo al numero de la CASA', () => {
  // Es el unico numero donde vive el bot, y por tanto lo unico que permite las tres
  // cosas a la vez: que el pedido se anote solo en Envios, que a Ruth le llegue
  // copia, y que el gestor cobre su comision (la linea `Vendedor: CODIGO` tiene que
  // llegar a un sitio donde alguien la lea). El socio recibe el pedido REENVIADO.
  // Si alguna vez esto se "arregla", se pierden las tres.
  const N = cargar();
  const cat = N.aplicar(catalogo(), 'electripower');
  assert.equal(cat.whatsapp, '5354978966', 'el de la casa, NO el del socio');
  assert.equal(cat.tienda.whatsappSocio, '5358856820', 'el del socio queda para PREGUNTAR');
  assert.equal('whatsapp' in cat.tienda, false, 'no se cuela un whatsapp suelto en tienda');
});

test('🔴 en la pagina del socio la mensajeria no se cobra ni se anuncia', () => {
  const N = cargar();
  const t = N.aplicar(catalogo(), 'electripower').tienda;
  assert.equal(t.mensajeriaCUP, 0);
  assert.equal(t.envioGratisCUP, 0);
});

test('lo que es de la casa no se cuela en la pagina del socio', () => {
  const N = cargar();
  const t = N.aplicar(catalogo(), 'electripower').tienda;
  assert.equal(t.encargosActivo, false, 'los encargos son de 3B');
  assert.equal(t.campana, null, 'la campana de rebajas es de 3B');
  assert.equal(t.cierre, null, 'el cartel de "cerrado" de Ruth no cierra la tienda del socio');
  assert.equal(t.taxiActivo, true, 'el taxi SI se sigue enseñando: es el mismo grupo de negocios');
});

test('si el socio no esta en el catalogo, su pagina no se inventa nada', () => {
  const N = cargar();
  const cat = catalogo();
  delete cat.tienda.negocios;
  cat.tienda.electripowerActivo = false;
  const r = N.aplicar(cat, 'electripower');
  assert.equal(r.items.length, 0);
  assert.equal(r.tienda.nombre, '3B Store', 'cae a la marca de la casa en vez de romperse');
  assert.equal(N.estaActivo(cat, 'electripower'), false);
});

test('la clave del carrito es distinta por negocio', () => {
  const N = cargar();
  // 🔴 Con una sola clave, un cliente mezclaria un inversor con un perfume en un
  // pedido que sale a UN solo WhatsApp.
  assert.equal(N.claveCarrito('3b'), 'carrito');
  assert.equal(N.claveCarrito('electripower'), 'carrito:electripower');
});

test('aplicar no destroza el catalogo de entrada', () => {
  const N = cargar();
  const cat = catalogo();
  N.aplicar(cat, 'electripower');
  assert.equal(cat.items.length, 2, 'el original sigue con sus dos items');
  assert.equal(cat.tienda.nombre, '3B Store');
});
