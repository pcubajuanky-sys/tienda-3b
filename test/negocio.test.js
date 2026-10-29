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

test('🔴 el contrato de la etiqueta Negocio: sigue escrito en app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('`Negocio: ${'), 'app.js dejo de escribir la linea Negocio:');
  assert.ok(app.includes("NEGOCIO !== (window.Negocio ? window.Negocio.CASA : '3b')"),
    'la casa volvio a escribir la linea, y su mensaje debe seguir igual que siempre');
});

test('🔴 la marca de pedido enviado es por negocio y la de la casa conserva su nombre', () => {
  // app.js no es cargable en pruebas (llama a iniciar() y toca document): se guarda por texto.
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes("? 'pedidoEnviado'"), 'la casa debe seguir usando la clave de siempre');
  assert.ok(app.includes("'pedidoEnviado:' + NEGOCIO"), 'el socio debe tener su propia clave');
  for (const op of ['getItem', 'setItem', 'removeItem']) {
    assert.ok(!app.includes('localStorage.' + op + "('pedidoEnviado'"), 'queda un ' + op + ' con la clave cruda: mezclaria las tiendas');
  }
  assert.ok((app.match(/CLAVE_ENVIADO/g) || []).length >= 4, 'la definicion y los 3 accesos');
});

test('🔴 la pagina del socio no promete mensajeria incluida a secas: es en su zona', () => {
  // Lo que ve Google/WhatsApp al compartir el enlace. La decision del dueño fue "incluida en
  // su zona"; mas lejos se coordina. Prometer gratis a quien vive lejos seria mentira.
  const html = fs.readFileSync(path.join(__dirname, '..', 'electripower.html'), 'utf8');
  assert.ok(!html.includes('Mensajería incluida.'), 'queda una promesa de mensajeria sin "en su zona"');
  assert.ok(html.includes('Mensajería incluida en su zona.'));
  assert.ok(!html.includes('�'), 'la codificacion se estropeo');
});

test('🔴 en la tienda del socio el pedido NO se desvia al gestor con recargo', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // 🔴 El desvio al gestor vive en UN SOLO sitio: destinoWhatsApp(). Antes estaba copiado
  // en dos y esta prueba contaba las copias; al aparecer un tercer sitio (el boton de
  // preguntar de la ficha, 2026-10-22) se extrajo a un helper. Ahora la barrera es
  // estructural: si alguien vuelve a escribir la expresion a mano, esto falla.
  assert.ok(app.includes('function destinoWhatsApp()'), 'falta el helper destinoWhatsApp()');
  const desvios = app.split('gestorRecargo && gestorRecargo.telPublico').length - 1;
  assert.equal(desvios, 1, 'el desvio al gestor tiene que vivir SOLO en destinoWhatsApp()');
  const conGuarda = app.split('esCasaWeb() && gestorRecargo && gestorRecargo.telPublico').length - 1;
  assert.equal(conGuarda, 1, 'el unico sitio tiene que llevar la guarda del negocio');
  assert.ok(app.includes('function esCasaWeb()'), 'falta el helper');
  // Los tres sitios que escriben a WhatsApp piden el destino al helper, no lo calculan.
  const usos = app.split('destinoWhatsApp()').length - 1;
  assert.ok(usos >= 4, `destinoWhatsApp() deberia definirse y usarse en 3 sitios, encontrados ${usos} apariciones`);
});

test('🔴 la banda «Estas en la pagina de…» no se enseña en la tienda del socio', () => {
  // Insinua que los precios que ves son de esa persona, y en la tienda del socio no lo son.
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const i = app.indexOf('function pintarBandaGestor');
  const cuerpo = app.slice(i, app.indexOf(String.fromCharCode(10) + '}', i));
  assert.ok(cuerpo.includes('esCasaWeb() && gestorRecargo'), 'pintarBandaGestor no mira el negocio');
});

test('🔴 con la tienda cerrada el boton «Listo» de la ficha no se enseña', () => {
  // La ficha informa, no vende: accionHtml() devuelve vacio y la barra inferior se
  // esconde. Si el boton de «ver mi pedido» no mirara cerrada(), seria el unico camino
  // al pedido abierto con el negocio cerrado (fallo real, visto en navegador el
  // 2026-10-22 antes de arreglarlo).
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const i = app.indexOf('function pintarListoFicha');
  assert.ok(i !== -1, 'falta pintarListoFicha');
  const cuerpo = app.slice(i, app.indexOf(String.fromCharCode(10) + '}', i));
  assert.ok(cuerpo.includes('cerrada()'), 'pintarListoFicha no mira si la tienda esta cerrada');
});

test('🔴 el desglose del ahorro sale del modulo, no de cuentas a mano en app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('Descuento.totales('), 'el desglose del total tiene que pedirle las cifras a descuento.js');
  assert.ok(app.includes('Dinero.ahorroUSD('), 'el tachado de la linea del carrito, tambien (en USD desde el 2026-10-28)');
  assert.ok(/Ahorraste \$\{fmt\(/.test(app), 'el mensaje de WhatsApp lleva la linea del ahorro');
  // 🔴 Hay un gestor con recargo vivo (QGZUQ) y preciosGestor.js ya sustituye precioNormalCUP:
  // calcular el ahorro desde el USD por la tasa daria una cifra que no coincide con la que el
  // cliente tiene delante.
  assert.ok(!/precioNormal[A-Za-z]*\s*[*/]\s*CAT\.tasa/.test(app), 'el ahorro jamas se calcula desde el USD por la tasa');
});
