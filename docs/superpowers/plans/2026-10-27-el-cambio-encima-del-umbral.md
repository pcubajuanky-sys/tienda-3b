# El cambio sale del centro de la portada y se pone encima del umbral

> **Para quien ejecute:** usa `superpowers:subagent-driven-development`. Los pasos llevan
> casilla (`- [ ]`). **Ancla por TEXTO, nunca por número de línea** (el repo avanza).

**Objetivo:** la línea del cambio (`💵 Cambio que usamos: 1 USD = 845 CUP`) deja de estar en
el centro de la portada, donde se ve demasiado grande, y pasa a una línea fina justo **encima**
de la banda «Pedidos desde 2,000 CUP: mensajería gratis 🚚».

**Por qué ahí:** las dos líneas hablan de lo mismo —lo que le va a costar al cliente— y pegadas
se leen como un solo bloque. Y está **arriba del todo**, encima de la portada, así que el
cliente lo sigue viendo al entrar sin bajar.

**Arquitectura:** el elemento se mueve de dentro de `.hero` (donde heredaba la tinta blanca del
degradado) a entre `.barra-fija` y `#promo-envio`, con el **mismo par de colores que la banda**
(`--brand` sobre `--brand-soft`: 7,5:1 en claro y 8,4:1 en oscuro, ya medido y anotado en el
CSS) y un paso más pequeño que `.promo-linea`, para que la que manda siga siendo la del umbral.
El id cambia de `hero-tasa` a `banda-tasa`, porque ya no vive en la portada.

🔴 **Va FUERA de `.barra-fija`** a propósito: así no entra en `--header-h` y **no hay que tocar
`medirHeader()`**. `#promo-envio`, su vecino, también está fuera.

**Lo que NO cambia:** el texto (lo compone `TasaVista.portada()`, no se toca), `tasa.js`, el
aviso del pie, la nota del carrito y la línea del mensaje de WhatsApp.

---

## Archivos

- Modificar: `index.html`, `electripower.html` (el bloque es **idéntico** en las dos)
- Modificar: `app.js` (un `getElementById` y su comentario)
- Modificar: `estilos.css` (borrar `.hero-tasa`, añadir `.banda-tasa`)
- Modificar: `sw.js` (`CACHE` → `tienda-3b-v27`)
- Modificar: `test/tasa.test.js`

---

### Task 1: El test exige el sitio nuevo (rojo primero)

**Archivo:** `test/tasa.test.js`

- [ ] **Paso 1: cambiar las aserciones del cableado**

En el test `🔴 el cableado existe en los TRES sitios y en las DOS paginas`, **sustituir**
esta línea:

```js
    assert.ok(html.includes('id="hero-tasa"'), pagina + ': falta el id de la linea de la portada');
```

por este bloque:

```js
    assert.ok(html.includes('id="banda-tasa"'), pagina + ': falta el id de la linea del cambio');
    // 🔴 El sitio es parte del requisito: encima de la banda del umbral, porque las dos
    // lineas hablan de lo mismo (lo que le va a costar) y juntas se leen como un bloque.
    assert.ok(html.indexOf('id="banda-tasa"') < html.indexOf('id="promo-envio"'),
      pagina + ': la linea del cambio no esta encima de la banda de mensajeria');
    assert.ok(!html.includes('hero-tasa'), pagina + ': quedo el id viejo de la portada');
```

- [ ] **Paso 2: añadir las dos aserciones del CSS y la de `app.js`**

En el MISMO test, justo **después** de la línea:

```js
  assert.ok(app.includes('TasaVista.pedido('), 'falta la linea del mensaje de WhatsApp');
```

añadir:

```js
  assert.ok(app.includes("getElementById('banda-tasa')"), 'app.js sigue buscando el id viejo');

  const css = fs.readFileSync(path.join(__dirname, '..', 'estilos.css'), 'utf8');
  assert.ok(css.includes('.banda-tasa{'), 'falta el estilo de la linea del cambio');
  assert.ok(!css.includes('.hero-tasa'), 'quedo el estilo viejo de la portada');
```

- [ ] **Paso 3: correr el test y ver que FALLA**

```bash
cd C:\inventario\tienda-3b
node --test test/tasa.test.js
```

Esperado: **falla** con `falta el id de la linea del cambio` (todavía no se movió nada).
Si pasa, algo va mal: para y avisa.

---

### Task 2: Mover el elemento en las dos páginas

**Archivos:** `index.html`, `electripower.html`

- [ ] **Paso 1: quitar el bloque de la portada (en las DOS páginas)**

Borrar estas cinco líneas (el comentario y el `<p>`), que están **idénticas** en las dos:

```html
    <!-- El cambio, lo primero que se ve (2026-10-27). Va aqui, entre el subtitulo y los
         botones, y no en un chip al final: medido en produccion, el chip caia en y=520 a
         375px, por debajo de los botones. Lo pinta renderHero() desde TasaVista.portada();
         sin tasa en el catalogo se queda oculto y la portada se ve igual que antes. -->
    <p class="hero-tasa" id="hero-tasa" hidden></p>
```

Queda: `<p class="hero-sub">…</p>` seguido del comentario `<!-- Con la tienda cerrada…`.

- [ ] **Paso 2: ponerlo encima de la banda (en las DOS páginas)**

Localizar esta línea, que es el comienzo de la banda de mensajería:

```html
<div id="promo-envio" class="promo" hidden>
```

e insertar **justo antes** de ella:

```html
<!-- El cambio, encima de la banda de mensajeria (2026-10-27, peticion del dueño: antes
     vivia en el centro de la portada y se veia demasiado grande). Pegado a la linea del
     umbral porque las dos hablan de lo mismo: lo que le va a costar. Lo pinta
     renderHero() desde TasaVista.portada(); sin tasa valida en el catalogo se queda
     oculto y la pagina se ve igual que antes. 🔴 Va FUERA de .barra-fija a proposito:
     asi no entra en --header-h y no hay que tocar medirHeader(). -->
<p class="banda-tasa" id="banda-tasa" hidden></p>
```

- [ ] **Paso 3: comprobar que no quedó nada del id viejo**

```bash
cd C:\inventario\tienda-3b
grep -rn "hero-tasa" index.html electripower.html
```

Esperado: **sin salida**.

---

### Task 3: `app.js`, `estilos.css` y la caché

- [ ] **Paso 1: `app.js` — el id nuevo**

Sustituir este bloque (está en `renderHero()`):

```js
  // El cambio, en su propia linea y arriba del todo. Sin tasa valida queda oculto: la
  // portada se ve entonces exactamente como antes de esta tarea.
  const tasaPortada = document.getElementById('hero-tasa');
  if (tasaPortada) {
    const txt = TasaVista.portada(CAT.tasa);
    tasaPortada.textContent = txt;
    tasaPortada.hidden = !txt;
  }
```

por:

```js
  // El cambio, en una linea fina encima de la banda del umbral (y no en el centro de la
  // portada, donde se veia demasiado grande). Sin tasa valida queda oculto: la pagina se
  // ve entonces exactamente como antes.
  const tasaBanda = document.getElementById('banda-tasa');
  if (tasaBanda) {
    const txt = TasaVista.portada(CAT.tasa);
    tasaBanda.textContent = txt;
    tasaBanda.hidden = !txt;
  }
```

- [ ] **Paso 2: `estilos.css` — borrar el estilo viejo**

Borrar estas cinco líneas:

```css
.hero-tasa{
  display:inline-block;margin:0 auto var(--e3);padding:6px var(--e3);
  border-radius:var(--radio-pill);font-size:var(--t-md);font-weight:700;line-height:1.3;
  background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.34);
}
```

(la línea siguiente, `.hero-acciones{…}`, se queda tal cual).

- [ ] **Paso 3: `estilos.css` — añadir el estilo nuevo**

Localizar el comienzo del bloque de la banda:

```css
.promo{
```

e insertar **justo antes** de él:

```css
/* El cambio, en una linea fina pegada ENCIMA de la banda de mensajeria. Mismo par de
   colores que .promo (--brand sobre --brand-soft: 7,5:1 en claro y 8,4:1 en oscuro, ver
   el comentario de .cat-chip) para que las dos lineas se lean como un solo bloque, y un
   paso mas pequeña que .promo-linea para que la que manda siga siendo la del umbral.
   Antes esto era .hero-tasa, un pill de 15px en el centro de la portada: se veia
   demasiado grande (peticion del dueño, 2026-10-27). */
.banda-tasa{
  margin:0;padding:var(--e0) var(--e3);text-align:center;
  background:var(--brand-soft);color:var(--brand);
  font-size:var(--t-xs);font-weight:600;line-height:1.3;
}
```

- [ ] **Paso 4: `sw.js` — subir la caché**

🔴 Obligatorio: se tocaron `index.html`, `estilos.css` y `app.js`. Sustituir

```js
const CACHE = 'tienda-3b-v26';
```

por

```js
const CACHE = 'tienda-3b-v27';
```

- [ ] **Paso 5: correr TODA la batería**

```bash
cd C:\inventario\tienda-3b
node --test
```

Esperado: **236/236, exit 0** (el mismo número que antes; este plan no añade tests nuevos,
cambia los de dentro de un test que ya existía). Si baja de 236 o falla algo, **para y avisa**;
no toques un test para que pase.

- [ ] **Paso 6: `node --check` de lo tocado**

```bash
cd C:\inventario\tienda-3b
node --check app.js && node --check sw.js
```

Esperado: sin salida.

- [ ] **Paso 7: commit**

```bash
cd C:\inventario\tienda-3b
git add index.html electripower.html app.js estilos.css sw.js test/tasa.test.js
git commit -m "fix(tienda): el cambio sale del centro de la portada y se pone encima del umbral

Era un pill de 15px en el centro de la portada y se veia demasiado grande.
Ahora es una linea fina encima de la banda 'Pedidos desde 2,000 CUP', con el
mismo par de colores (--brand sobre --brand-soft), un paso mas pequeña que la
del umbral y fuera de .barra-fija (no entra en --header-h). CACHE -> v27.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Qué reportar al piloto

1. La salida literal de `node --test` (la cola con `pass`/`fail`).
2. La salida de `grep -rn "hero-tasa" index.html electripower.html app.js estilos.css`
   (debe estar **vacía**).
3. El hash del commit.
4. Cualquier cosa del plan que no cuadrara con el archivo real. **Si un ancla de texto no
   aparece tal cual, PARA y avisa** — no improvises un sitio parecido.
