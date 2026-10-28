# Plan — El ahorro a la vista: «Ahorras X%» y el carrito estilo Temu

**Fecha:** 2026-10-28 · **Repo:** `C:\inventario\tienda-3b` (tienda web 3B, www.3bqba.com)
**Pedido por Ruth:** «que al meter un artículo en oferta en el carrito se contabilice tipo Temu
—precio real, menos tanto de oferta, pagas tanto—, que no diga `-x%` sino `Ahorras x%`, y revisa
porque hay artículos que solo dicen OFERTA y no `-x%`».

---

## 0. Estado de partida (medido hoy, no supuesto)

- `main` = `a9bb29e`, árbol limpio, `origin` = `github.com/pcubajuanky-sys/tienda-3b`.
- **Baseline de pruebas corrida y observada: `node --test` desde la raíz → 236/236, exit 0**
  (107 s). Cualquier número menor al terminar es una regresión, no «otra cosa».
- `sw.js` → `CACHE = 'tienda-3b-v27'`.
- Catálogo publicado: **206 productos, 16 en oferta**. De esos 16:

| % | Ahorro CUP | Producto | Hoy enseña |
|---|---|---|---|
| 5 | 850 | Nebulizador portátil | `OFERTA` |
| 6 | 1.700 | Nesquik de chocolate | `OFERTA` |
| 6 | 850 | Timbre inalámbrico | `OFERTA` |
| 8 | 1.700 | Candado/Alarma de motos | `OFERTA` |
| 9 | **4.250** | Ventilador Camping Fan | `OFERTA` |
| 12…52 | 221…2.775 | los otros 10 | `-12%` … `-52%` |
| — | — | Paquete de 4 Tic-Tacs (595 → 612: **sube**) | `OFERTA` |

- **La respuesta a la tercera pregunta de Ruth:** los que dicen solo `OFERTA` **no son un bug**.
  `descuento.js` tiene hoy `MINIMO = 10` y por debajo del 10 % no enseña número a propósito.
  Son los 5 de arriba, más el Tic-Tac, que está excluido por otra razón (su «oferta» subía el
  precio; se apagó por la API el 28/10 y desaparecerá de las ofertas en la próxima publicación
  de Stock+).
- `tienda.mensajeriaCUP = 150` y `tienda.envioGratisCUP = 2000` → **la mensajería está ACTIVA**,
  así que la rama viva de `totalBloqueHtml` es el desglose de tres filas, no la del total único.
- `--oferta` como **texto** (medido hoy con la fórmula WCAG del propio `test/colores.test.js`):

| | bg | surface | surface-2 |
|---|---|---|---|
| claro (`#C81E4C`) | 5.26 | **5.61** | 4.84 |
| oscuro (`#FF8AA6`) | 8.46 | **7.81** | 6.88 |

  Todos por encima de 4.5 → se puede usar para la fila del descuento sin inventar un color.

## 1. Decisiones de Ruth (ya tomadas, no se re-preguntan)

1. **«Ahorras X%» en los DOS sitios:** el sello sobre la foto de la parrilla y el chip de la ficha.
2. **El porcentaje se enseña SIEMPRE.** Se va el mínimo del 10 %.
3. **El desglose va en el total Y en cada línea** del carrito.
4. **El ahorro viaja en el mensaje de WhatsApp**, una línea.

### Anotado, descartado por ahora (no implementar)

El Camping Fan dirá **«Ahorras 9%»** en vez de **«Ahorras 4.250 CUP»**, que es la rebaja más
gorda del catálogo en dinero y la que peor suena en porcentaje. Se le propuso a Ruth la variante
«ahorro en CUP cuando el % es bajo» y eligió el porcentaje siempre. **Queda aquí escrito por si
algún día lo quiere; no se programa hoy.**

---

## 2. Qué NO se toca

- **Stock+ no se toca en absoluto.** `precioNormalCUP`, `precioCUP`, `precioNormalUSD`,
  `precioUSD`, `moneda` y `enOferta` ya viajan en `catalogo.json`.
- **El umbral de mensajería gratis sigue midiéndose sobre lo que SE PAGA**
  (`totalCarritoElegible()`, que suma `precioCUP`), nunca sobre el precio normal. Un descuento
  puede dejar un pedido por debajo de los 2.000 CUP y perder la mensajería gratis: eso es
  correcto y es lo que ya hace la tira de «añade uno de estos» (`completar.js`). **No cambiar
  `envioGratis()` ni `mensajeria()`.**
- **El Total sigue llamándose «Total».** Es el «pagas». No se renombra ni se añade otra fila
  final, o habría dos cifras compitiendo por ser la última.
- `tarjeta.js` (imagen para compartir) **no cambia**: usa `hayRebaja()`, no `sello()`.
- `preciosGestor.js` **no cambia**: ya sustituye `precioUSD/precioCUP/precioNormal*` en un único
  punto, así que el ahorro sale automáticamente con los precios del gestor.
  🔴 **El ahorro JAMÁS se calcula desde el USD por la tasa** — hay un gestor con recargo vivo
  (`QGZUQ`) y eso daría cifras que no coinciden con lo que el cliente ve.
- No se añade una línea extra de «🎉 Ahorras X CUP»: justo encima del total ya va la de
  mensajería gratis, y dos celebraciones juntas se anulan. La fila roja del descuento es el
  énfasis.

---

## 3. Tarea 1 — `descuento.js` deja de esconder el número y aprende a sumar

**Archivos:** `descuento.js`, `app.js` (solo la función `precioHtml`), `test/descuento.test.js`.

### Paso 1.1 — Cabecera de `descuento.js`

Sustituye el párrafo que empieza por `// 🔴 POR DEBAJO DEL 10 % NO SE ENSEÑA NUMERO.` y acaba en
`// «OFERTA» de siempre.` por:

```js
// 🔴 EL MINIMO DEL 10 % YA NO EXISTE (2026-10-28, decision de Ruth). Hasta esa fecha una rebaja
// menor del 10 % se quedaba con el «OFERTA» pelado, por no gritar un «-5%» que desinfla la
// oferta. Ruth pidio que el numero se enseñe SIEMPRE. Si vuelves a ver un `MINIMO` por aqui es
// que alguien revirtio una decision suya: preguntale antes de restaurarlo.
//
// 🔴 EL AHORRO SE COBRA EN CUP, PERO LA REBAJA SE DECIDE EN LA MONEDA DEL PRODUCTO. porciento()
// mira el par de la moneda principal (189 de los 206 productos son 'usd'); el dinero que se
// descuenta en el carrito sale del par de CUP, que es lo que de verdad se paga. El max(0, ...)
// de ahorroCUP cubre el unico caso en que los dos no concuerden: que el redondeo del CUP al
// publicar deje el «antes» igual o por debajo del precio de ahora.
```

### Paso 1.2 — Fuera `MINIMO`, y el sello cambia de texto

Borra la línea `var MINIMO = 10;`.

Sustituye la función `sello` entera por:

```js
  // El texto del sello rojo de la parrilla y del chip de la ficha. '' si no esta en oferta.
  // «Ahorras 52%» y no «-52%»: un porcentaje con menos delante es una resta; el ahorro es una
  // ganancia, y la ganancia es lo que se lleva el cliente. Queda «OFERTA» a secas para el unico
  // caso en que no hay numero honesto que dar: una oferta cuyo «antes» no es mayor (dato mal
  // puesto en Stock+).
  function sello(p) {
    if (!p || !p.enOferta) return '';
    var pct = porciento(p);
    return pct !== null ? 'Ahorras ' + pct + '%' : 'OFERTA';
  }
```

### Paso 1.3 — Dos funciones nuevas, justo después de `sello`

```js
  // Lo que se descuenta de verdad en el carrito, en CUP. 0 cuando no hay rebaja real, asi que
  // una «oferta» que sube el precio no resta (ni suma) nada.
  function ahorroCUP(p) {
    if (!hayRebaja(p)) return 0;
    var ahora = num(p.precioCUP);
    var antes = num(p.precioNormalCUP);
    if (!(ahora > 0) || !(antes > 0)) return 0;
    return Math.max(0, antes - ahora);
  }

  // El desglose del carrito: lo que costaria a precio normal, lo que se descuenta y lo que se
  // paga. `items` es [{p, qty}], tal cual lo devuelve itemsCarrito() de app.js.
  //
  // 🔴 `normal` se DERIVA de los otros dos (pagas + descuento) y NO se suma aparte. Asi las tres
  // cifras que el cliente tiene delante siempre cuadran —normal - descuento = pagas— pase lo que
  // pase con un precioNormalCUP mal puesto en Stock+. Si algun dia alguien lo cambia por una
  // suma independiente de precioNormalCUP, la pantalla podra mentir en la resta.
  function totales(items) {
    var lista = Array.isArray(items) ? items : [];
    var pagas = 0;
    var descuento = 0;
    lista.forEach(function (it) {
      if (!it || !it.p) return;
      var qty = num(it.qty);
      if (!(qty > 0)) return;
      var precio = num(it.p.precioCUP);
      if (precio > 0) pagas += precio * qty;
      descuento += ahorroCUP(it.p) * qty;
    });
    return { normal: pagas + descuento, descuento: descuento, pagas: pagas };
  }
```

### Paso 1.4 — La exportación

```js
  window.Descuento = {
    porciento: porciento, hayRebaja: hayRebaja, sello: sello,
    ahorroCUP: ahorroCUP, totales: totales,
  };
```

### Paso 1.5 — El chip de la ficha (`app.js`, dentro de `precioHtml`)

🔴 **Este paso va en la MISMA tarea que el 1.2 obligatoriamente:** `app.js` compara hoy contra
`window.Descuento.MINIMO`, y al quitarlo esa comparación daría `pct >= undefined` → `false`, y el
chip desaparecería de la ficha sin que nada falle.

Sustituye estas cuatro líneas:

```js
  const pct = conDescuento ? window.Descuento.porciento(p) : null;
  const chip = pct !== null && pct >= window.Descuento.MINIMO
    ? `<span class="precio-desc">-${pct}%</span>`
    : '';
```

por:

```js
  const pct = conDescuento ? window.Descuento.porciento(p) : null;
  const chip = pct !== null ? `<span class="precio-desc">Ahorras ${pct}%</span>` : '';
```

Y en el comentario que está encima de `precioHtml`, donde dice que en la parrilla el porcentaje
«ya lo grita el sello de la foto», **no cambies nada**: sigue siendo verdad (el modal no pinta
`.card-sellos`, comprobado — el chip solo sale en la ficha, nunca dos veces).

### Paso 1.6 — `test/descuento.test.js`

**Cambian a propósito 4 aserciones** porque el comportamiento cambió por decisión de Ruth:

1. Borra el test completo `'el minimo para enseñar un numero es el 10 %'` y saca `MINIMO` del
   destructuring de la línea 12 (queda
   `const { porciento, hayRebaja, sello, ahorroCUP, totales } = sandbox.window.Descuento;`).
2. En `'🔴 una «oferta» que SUBE el precio no es una rebaja'`, la aserción del sello se queda
   igual (`'OFERTA'`): ese caso es justo el que conserva la palabra.
3. Sustituye el test `'🔴 por debajo del minimo el sello se queda como esta hoy'` por:

```js
test('🔴 el numero se enseña SIEMPRE, tambien por debajo del 10 %', () => {
  // Hasta el 2026-10-28 estas tres decian «OFERTA». Ruth pidio el numero siempre: un 5 % es
  // menos gancho que un 52 %, pero es la verdad y es mas que no decir nada.
  assert.strictEqual(sello(NEBU), 'Ahorras 5%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 910, precioNormalCUP: 1000 }), 'Ahorras 9%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 900, precioNormalCUP: 1000 }), 'Ahorras 10%', 'el epsilon sigue vivo: 10 % justo no puede dar 9');
});
```

4. Sustituye el test `'a partir del minimo el sello dice el numero'` por:

```js
test('el sello dice el ahorro, no la resta', () => {
  assert.strictEqual(sello(PEINE), 'Ahorras 52%');
  assert.strictEqual(sello({ enOferta: true, moneda: 'cup', precioCUP: 400, precioNormalCUP: 600 }), 'Ahorras 33%');
});
```

**Tests nuevos** (añádelos al final del archivo):

```js
test('el ahorro en CUP es la resta de los dos precios en CUP', () => {
  assert.strictEqual(ahorroCUP(PEINE), 221);          // 425 - 204
  assert.strictEqual(ahorroCUP(NEBU), 850);           // 17000 - 16150, aunque solo sea un 5 %
  assert.strictEqual(ahorroCUP(NORMAL), 0, 'sin oferta no se ahorra nada');
});

test('🔴 una oferta que sube el precio NO descuenta (ni suma) nada', () => {
  // El Tic-Tac real: 595 -> 612. Sin esta guarda el carrito ensenaria un «descuento» negativo
  // y el «precio normal» saldria por DEBAJO de lo que se paga.
  assert.strictEqual(ahorroCUP(TICTAC), 0);
});

test('ahorroCUP calla ante cualquier entrada rara', () => {
  assert.strictEqual(ahorroCUP(null), 0);
  assert.strictEqual(ahorroCUP(undefined), 0);
  assert.strictEqual(ahorroCUP('x'), 0);
  // Rebaja real en USD pero el par de CUP no concuerda (redondeo al publicar): max(0, ...).
  assert.strictEqual(ahorroCUP({ enOferta: true, moneda: 'usd', precioUSD: 5, precioNormalUSD: 10, precioCUP: 4250, precioNormalCUP: 4250 }), 0);
});

test('🔴 el desglose del carrito SIEMPRE cuadra: normal - descuento = pagas', () => {
  const d = totales([{ p: PEINE, qty: 1 }, { p: NORMAL, qty: 2 }]);
  assert.strictEqual(d.pagas, 204 + 2000);
  assert.strictEqual(d.descuento, 221);
  assert.strictEqual(d.normal, d.pagas + d.descuento);
  assert.strictEqual(d.normal, 2425);
});

test('el ahorro se multiplica por la cantidad', () => {
  const d = totales([{ p: PEINE, qty: 3 }]);
  assert.strictEqual(d.pagas, 612);
  assert.strictEqual(d.descuento, 663);               // 221 x 3
  assert.strictEqual(d.normal, 1275);                 // 425 x 3
});

test('sin nada rebajado el descuento es 0 y no hay nada que pintar', () => {
  const d = totales([{ p: NORMAL, qty: 1 }, { p: TICTAC, qty: 1 }]);
  assert.strictEqual(d.descuento, 0);
  assert.strictEqual(d.normal, d.pagas, 'el precio normal es el mismo que se paga');
});

test('totales aguanta un carrito vacio o roto sin devolver NaN', () => {
  for (const entrada of [[], null, undefined, 'x', [null], [{ p: null, qty: 1 }], [{ p: PEINE, qty: 0 }], [{ p: PEINE, qty: 'x' }]]) {
    const d = totales(entrada);
    assert.ok(Number.isFinite(d.normal) && Number.isFinite(d.descuento) && Number.isFinite(d.pagas), 'nada de NaN con ' + JSON.stringify(entrada));
  }
  // 🔴 NUNCA deepStrictEqual contra lo que devuelve totales(): el objeto nace DENTRO del
  // sandbox de node:vm, su prototipo es el Object de ESE realm y la asercion falla con
  // «Values have same structure but are not reference-equal» aunque los valores sean
  // identicos. El CLAUDE.md del proyecto ya lo avisaba para los arrays que nacen dentro del
  // modulo; vale igual para los objetos. Campo por campo, con strictEqual.
  const vacio = totales([]);
  assert.strictEqual(vacio.normal, 0);
  assert.strictEqual(vacio.descuento, 0);
  assert.strictEqual(vacio.pagas, 0);
});
```

🔴 **Corrección del 2026-10-28, encontrada por el ejecutor al correr la batería:** la primera
versión de este plan pedía aquí un `assert.deepStrictEqual(totales([]), { normal: 0, descuento: 0,
pagas: 0 })` y **fallaba** (242 tests, 241 pass, 1 fail) por el problema de realms de `node:vm`.
El ejecutor paró y lo reportó en vez de parchearlo, que es exactamente lo que debía hacer.

### Verificación de la tarea 1

`node --test` desde la raíz. Esperado: **236 − 1 (borrado) + 7 (nuevos) = 242/242, exit 0**.
Si el número no es ese, para y di qué falló; no ajustes un test para que pase.

### Commit de la tarea 1

```
git add descuento.js app.js test/descuento.test.js
git commit -m "ahorro: el sello dice «Ahorras X%» y el porcentaje se enseña siempre"
```

🔴 **`git add` con los archivos nombrados, nunca `git add -A` ni `git commit -a`.**

---

## 4. Tarea 2 — El carrito cuenta como Temu

**Archivos:** `app.js` (`lineaCarritoHtml`, `totalBloqueHtml`, `enviarPorWhatsApp`),
`estilos.css`, `test/negocio.test.js`.

### Paso 2.1 — El tachado en cada línea (`lineaCarritoHtml`)

Después de la línea `const alTope = tope !== null && qty >= tope;` añade:

```js
  // El «antes» de esta linea, solo si hay rebaja de verdad. Se deriva del ahorro para que la
  // resta de la pantalla cuadre con el desglose del total, que usa la misma fuente.
  const ahorro = window.Descuento.ahorroCUP(p);
```

Sustituye el bloque de `.linea-derecha`:

```js
      <div class="linea-derecha">
        <div class="linea-sub">${fmt(p.precioCUP * qty)} CUP</div>
```

por:

```js
      <div class="linea-derecha">
        <div class="linea-precios">
          ${ahorro > 0 ? `<span class="tachado linea-antes">${fmt((p.precioCUP + ahorro) * qty)} CUP</span>` : ''}
          <div class="linea-sub">${fmt(p.precioCUP * qty)} CUP</div>
        </div>
```

(el `<button class="linea-quitar" …>✕</button>` y el cierre del `</div>` se quedan como están,
el botón ahora es hermano de `.linea-precios`).

🔴 **No muevas la `<img>` ni la saques de ser el primer hijo de `.linea`:** `imgFallback` /
`limpiarFallback` reconocen `.linea` y hacen `img.after(marca)` — si la foto deja de estar donde
está, la inicial de respaldo cae al final de la fila, detrás del subtotal (ya pasó el 15/10).

### Paso 2.2 — Las dos filas nuevas del total (`totalBloqueHtml`)

Sustituye la función entera por:

```js
function totalBloqueHtml(claseTotalCup, claseTotalUsd) {
  const m = mensajeria();
  const d = window.Descuento.totales(itemsCarrito());
  // 🔴 Sin nada rebajado en el carrito no se pinta ni una fila nueva: el bloque queda EXACTAMENTE
  // como antes del 2026-10-28, en las dos ramas. Hay test.
  const rebaja = d.descuento > 0
    ? `<div class="desglose-linea"><span>Precio normal</span><span>${fmt(d.normal)} CUP</span></div>` +
      `<div class="desglose-linea desglose-descuento"><span>Descuento</span><span>−${fmt(d.descuento)} CUP</span></div>`
    : '';
  if (!m.activa) {
    return rebaja + notaAparteHtml() + `<span class="${claseTotalCup}">Total: ${fmt(totalCarrito())} CUP</span>` + usdLineaHtml(claseTotalUsd);
  }
  return (
    rebaja +
    `<div class="desglose-linea"><span>Productos</span><span>${fmt(totalCarrito())} CUP</span></div>` +
    `<div class="desglose-linea"><span>Mensajería</span><span>${m.coordinar ? 'a coordinar' : (m.gratis ? 'GRATIS' : fmt(m.monto) + ' CUP')}</span></div>` +
    // 🔴 La nota solo cuando hay algo que cobrar. Antes salía SIEMPRE, así que un pedido con
    // envío gratis leía «Mensajería GRATIS» e inmediatamente debajo «el costo depende de la
    // zona»: se le sembraba la duda justo donde se le acababa de dar una buena noticia.
    (m.gratis || m.coordinar ? '' : `<p class="desglose-nota">El costo de mensajería depende de la zona; se confirma por WhatsApp.</p>`) +
    notaAparteHtml() +
    `<div class="desglose-linea desglose-total"><span>Total</span><span>${fmt(totalGeneralCUP())} CUP</span></div>` +
    usdLineaHtml(claseTotalUsd)
  );
}
```

El signo del descuento es **`−` (U+2212, menos de verdad)**, el mismo carácter que ya usa el botón
de quitar unidad del carrito. No un guion.

Así se ve con la mensajería activa, que es la rama viva hoy — **ojo a los dos casos, porque el
umbral de 2.000 CUP manda**:

```
Pedido de 10.200 CUP (pasa el umbral)      Pedido de 204 CUP (no lo pasa)
  Precio normal      12,750 CUP              Precio normal        425 CUP
  Descuento          −2,550 CUP              Descuento           −221 CUP
  Productos          10,200 CUP              Productos            204 CUP
  Mensajería             GRATIS               Mensajería           150 CUP
  Total              10,200 CUP              Total                354 CUP
```

### Paso 2.3 — La línea del ahorro en el mensaje de WhatsApp (`enviarPorWhatsApp`)

Busca estas dos líneas:

```js
  const notaTasa = (window.TasaVista && TasaVista.pedido(CAT.tasa)) || '';
  if (notaTasa) lineas.push(notaTasa);
```

y añade **justo debajo**:

```js
  // Lo que se ahorro con las ofertas de ESTE pedido. Va despues de la tasa y no entre el total
  // y la tasa: esa pareja no se separa (decision del 2026-10-27, el cambio va pegado al total).
  // Solo si hay algo que presumir, para no escribirle a Ruth un «Ahorraste 0 CUP».
  const dWA = window.Descuento.totales(items);
  if (dWA.descuento > 0) lineas.push(`Ahorraste ${fmt(dWA.descuento)} CUP`);
```

### Paso 2.4 — `estilos.css`

Después de la regla `.desglose-total span{…}` (hoy en la línea 650) añade:

```css
/* La fila del descuento del carrito. Rojo de oferta porque es la buena noticia del desglose, no
   un error: medido el 2026-10-28, --oferta como TEXTO da 5,61:1 en claro y 7,81:1 en oscuro
   sobre --surface, y test/colores.test.js lo vigila. Van los dos selectores porque
   `.desglose-linea span:last-child` ya fija color y tiene la misma especificidad: esta regla
   gana por venir despues, asi que NO la muevas por encima de aquella. */
.desglose-descuento span,.desglose-descuento span:last-child{color:var(--oferta)}
.desglose-descuento span:last-child{font-weight:800}
```

Y después de la regla `.linea .linea-sub{…}` (hoy en la línea 956) añade:

```css
/* El «antes» de una linea rebajada, encima de su subtotal y alineado con el a la derecha. Reusa
   .tachado (el mismo estilo del tachado de la parrilla y de la ficha): aqui solo se decide la
   colocacion, nunca el color ni el grosor. */
.linea-precios{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
.linea-antes{display:block;white-space:nowrap}
```

### Paso 2.5 — `test/negocio.test.js`

Añade al final:

```js
test('🔴 el desglose del ahorro sale del modulo, no de cuentas a mano en app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes('Descuento.totales('), 'el desglose del total tiene que pedirle las cifras a descuento.js');
  assert.ok(app.includes('Descuento.ahorroCUP('), 'el tachado de la linea del carrito, tambien');
  assert.ok(/Ahorraste \$\{fmt\(/.test(app), 'el mensaje de WhatsApp lleva la linea del ahorro');
  // 🔴 Hay un gestor con recargo vivo (QGZUQ) y preciosGestor.js ya sustituye precioNormalCUP:
  // calcular el ahorro desde el USD por la tasa daria una cifra que no coincide con la que el
  // cliente tiene delante.
  assert.ok(!/precioNormal[A-Za-z]*\s*[*/]\s*CAT\.tasa/.test(app), 'el ahorro jamas se calcula desde el USD por la tasa');
});
```

Si `fs` o `path` no estuvieran ya requeridos en ese archivo, úsalos como los use el resto del
archivo; **no añadas un require duplicado**.

### Verificación de la tarea 2

`node --test` desde la raíz → **243/243, exit 0**.

### Commit de la tarea 2

```
git add app.js estilos.css test/negocio.test.js
git commit -m "carrito: precio normal, descuento y lo que se paga (estilo Temu)"
```

---

## 5. Tarea 3 — La barrera del color y la caché

**Archivos:** `test/colores.test.js`, `sw.js`.

### Paso 3.1 — `test/colores.test.js`

Añade, después del test `'🔴 el rojo de «te equivocaste» no es el rojo de «que oportunidad»'`:

```js
test('🔴 el rojo de la oferta tambien se lee como TEXTO, no solo como sello', () => {
  // Desde el 2026-10-28 --oferta pinta la fila «Descuento» del carrito (13 px) ademas del
  // «Quedan N». A ese tamano AA pide 4,5:1 y no hay excepcion de texto grande. Medido ese dia:
  // 5,61:1 en claro y 7,81:1 en oscuro sobre --surface.
  for (const fondo of ['bg', 'surface', 'surface-2']) {
    exige('--oferta claro sobre --' + fondo, claro('oferta'), claro(fondo), 4.5);
    exige('--oferta oscuro sobre --' + fondo, oscuro('oferta'), oscuro(fondo), 4.5);
  }
  const fila = CSS.match(/\.desglose-descuento span,[^{]*\{[^}]*\}/);
  assert.ok(fila, 'no se encuentra la regla .desglose-descuento');
  assert.ok(fila[0].includes('var(--oferta)'), 'la fila del descuento tiene que pedir el color al token');
  assert.ok(!/#[0-9A-Fa-f]{3,6}/.test(fila[0]), 'la fila del descuento no puede llevar un color escrito a mano');
});
```

### Paso 3.2 — `sw.js`

```js
const CACHE = 'tienda-3b-v28';
```

🔴 Obligatorio: se tocaron `app.js` y `estilos.css`. Sin subir la caché, quien tenga la tienda
instalada sigue viendo el código viejo y parece que el cambio «no llegó».

### Verificación de la tarea 3

`node --test` desde la raíz → **244/244, exit 0**.

### Commit de la tarea 3

```
git add test/colores.test.js sw.js
git commit -m "colores: el rojo de la oferta medido como texto; cache v28"
```

---

## 6. Verificación en navegador (obligatoria, antes del push)

Servidor: `npx --yes serve -l 4173 .` desde la raíz del repo. Chrome del sistema con
`puppeteer-core` **instalado en el scratchpad, nunca en el repo**. Viewport **375 px**, y **los
dos temas** (`prefers-color-scheme`).

🔴 **El `window.open` se sustituye por una función que solo capture la URL** antes de tocar
«Pedir por WhatsApp», o a Ruth le llega un pedido falso. Al acabar, limpia `carrito`,
`pedidoEnviado`, `direcciones` y `ultimaVisita` del navegador de prueba.
🔴 **Para llenar el carrito usa `addCarrito()`**, nunca `carrito[id]=1` a mano: una clave pelada
de un producto con variantes no la resuelve `itemsCarrito()` y parece un bug que no existe.

Las 9 comprobaciones, cada una con su evidencia (medida **y** mirada en captura):

1. **Parrilla:** el sello dice «Ahorras 52%», en una sola línea, sin desbordar la foto y sin
   chocar con `⭐ MÁS VENDIDO` en un producto que tenga los dos. Mide el ancho del sello y el de
   `.card-foto`. Si desborda o se parte: `white-space:nowrap` y bajar el `font-size` a 9 px —
   **no** toques la estructura de `.card-sellos`.
2. **Los 5 de menos del 10 %** (Nebulizador, Nesquik, Timbre, Candado, Camping Fan) ya no dicen
   `OFERTA`: dicen `Ahorras 5%`, `Ahorras 6%`, `Ahorras 6%`, `Ahorras 8%`, `Ahorras 9%`.
3. **Ficha del Peine de barbería:** chip `Ahorras 52%` al lado del precio y el `425 CUP` tachado.
   Y **una sola vez**: el modal no pinta el sello de la foto.
4. **Carrito con un rebajado** (Peine, qty 1): la línea enseña `425 CUP` tachado encima de
   `204 CUP`, y el total dice `Precio normal 425 / Descuento −221 / Productos 204 /
   Mensajería 150 / Total 354`. **Comprueba la resta a mano.**
5. **`qty 3` del mismo producto:** `Precio normal 1,275 / Descuento −663 / Productos 612`.
6. **Carrito que pasa el umbral** (añade lo que haga falta para superar 2.000 CUP): la
   `Mensajería` dice `GRATIS` y el `Total` es igual que `Productos`.
7. **Carrito SIN nada rebajado:** el bloque del total es **idéntico** al de hoy — ni fila
   `Precio normal` ni fila `Descuento` (compáralo con una captura del mismo carrito antes del
   cambio, o cuenta los `.desglose-linea`: 3, no 5).
8. **Mensaje de WhatsApp** (con `window.open` capturado): aparece `Ahorraste 221 CUP` después de
   la línea `Cambio: 1 USD = 850 CUP`. Y con un carrito sin ofertas, esa línea **no** aparece.
9. **Modo oscuro:** la fila `Descuento` se lee (es `rgb(255,138,166)`), y el sello
   `Ahorras 52%` también.

Deja las capturas en el scratchpad y **mira las de los puntos 1, 4 y 9 como imagen**: la deuda
recurrente de este proyecto es medir y no mirar.

### Opcional pero recomendado (deuda vieja del proyecto)

Generar **de verdad**, una vez, la imagen para compartir de un producto en oferta: `tarjeta.js`
depende de `descuento.js` desde el 27/10 y **nunca se ha dibujado**. No cambia en este plan
(usa `hayRebaja`, no `sello`), pero si se rompe, se rompe aquí.

---

## 7. Despliegue

1. `git pull --rebase` — `origin` avanza solo con las publicaciones de Stock+ (catálogo, sitemap,
   precios de gestores). Si trae un catálogo nuevo, **vuelve a correr `node --test` contra él**
   antes del push: ya hubo sesiones en que el catálogo nuevo cambió las cifras.
2. `node --test` → 244/244, exit 0, observado.
3. `git push`.
4. Verificar **en el sitio real** (www.3bqba.com) a 375 px: caché `tienda-3b-v28`,
   `totalBloqueHtml.toString()` contiene `Descuento.totales` y
   `window.Descuento.ahorroCUP` existe.
   🔴 **La primera carga tras el despliegue corre el código VIEJO** (el service worker viejo
   sirve su caché mientras el nuevo se instala): comprueba con `.toString()`, no con `curl`, y
   recarga una segunda vez.
5. Si hay un gestor con recargo vivo (`QGZUQ` lo estaba el 27/10), entra una vez con
   `?ref=QGZUQ` y comprueba que el desglose cuadra con **sus** precios.

## 8. Cierre

- Actualizar la sección «Tienda web 3B» de `C:\Users\JyR\CLAUDE.md` y
  `docs/SIGUIENTE-SESION.md` (caché nueva, decisión del mínimo, la variante en CUP anotada como
  descartada).
- Informe de relevo en `docs/informes/2026-10-28-ahorro-estilo-temu.md`, autocontenido, con la
  evidencia observada y lo no verificado marcado «⚠ NO VERIFICADO».
