# Sacar Conectados (remesas) del dominio 3bqba.com — Plan A (la web)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que en `3bqba.com` no quede ni una puerta, ni un icono, ni una URL, ni un archivo que hable de remesas — y que `https://3bqba.com/remesas` responda 404.

**Architecture:** El sitio es **estático** (HTML + JS + JSON, sin backend) y se despliega en Vercel con `git push` desde `C:\inventario\tienda-3b`. Conectados vive en siete archivos propios, dos reescrituras de ruta, una entrada del sitemap y tres trozos de marcado/JS repartidos entre la portada y el taxi. Este plan los borra todos. **No se borra el motor**: `conectados.html/.css/.js`, `remesa-calc.js` y los dos logos se copian ANTES a una carpeta fuera del repo, y además siguen en el historial de git para relanzarlos en otro dominio.

**Tech Stack:** HTML/CSS/JS vanilla · Vercel (rewrites + CSP por cabeceras) · git.

---

## Contexto que el ejecutor necesita (léelo, no lo supongas)

**Por qué se hace esto.** Decisión del dueño del negocio (2026-10-07): mover dinero de terceros hacia Cuba es transmisión de dinero regulada y **no quiere que el servicio aparezca relacionado con la marca 3B**. Puede relanzarse más adelante en otro dominio. Esto NO es una limpieza de código: es sacar una puerta pública.

**Estado medido hoy (2026-10-07, verificado en vivo, no supuesto):**
- `config.conectados.activo` está en `false` en Stock+, así que el interruptor ya apaga casi todo.
- `catalogo.json` publicado (16:43) trae `conectadosActivo: false` → en la **portada** el icono y la tarjeta ya están ocultos.
- 🔴 `taxi.json` publicado es de las **12:11** y todavía trae `conectadosActivo: true` → **el icono de Conectados SE VE ahora mismo en `3bqba.com/taxi`** (comprobado por DOM: `#mundo-conectados` con `hidden=false`, 44×44 px, `href="/remesas"`).
- 🔴 `https://3bqba.com/remesas` y `/conectados` responden **200** con la página «Conectados — Remesas a Cuba», con el favicon de 3B, la fila de logos de 3B y `canonical`/`og:url` apuntando a `3bqba.com`.
- 🔴 `sitemap.xml` le dice a Google que `/remesas` existe.

**Gotchas del repo web (del napkin de Stock+, aprendidos a golpes):**
- 🔴 **El clon local va SIEMPRE por detrás del remoto.** Stock+ commitea `catalogo.json` y `taxi.json` por la API de GitHub cada vez que Ruth publica (hoy mismo el local iba 3 commits atrás). El `push` se rechazará: hay que `git pull --rebase` primero. No hay conflicto si los commits remotos solo tocan esos dos JSON.
- 🔴 **En estas páginas están PROHIBIDOS los `onclick=`** y demás manejadores en línea: la CSP los bloquea **solo en producción** y la página se queda muerta. Este plan no añade ninguno, pero no los introduzcas.
- 🔴 **No toques el `Content-Security-Policy` de `vercel.json` ni de `_headers`.** Lleva dos hashes `sha256-` de scripts en línea. Quitar un hash que todavía hace falta rompe el sitio; dejar uno de más es inofensivo. Fuera del alcance de este plan.
- `vercel.json` y `_headers`/`_redirects` son **gemelos**: Vercel lee los primeros, Cloudflare los segundos. Si cambias una regla en uno, cámbiala en el otro.
- No hay `package.json` ni tests en este repo: la verificación es **mirar la página**, antes en local y después en producción.

---

## Archivos que toca este plan

**Se borran del repo** (previa copia de seguridad):
- `conectados.html` · `conectados.css` · `conectados.js` · `remesa-calc.js` · `conectados.json`
- `logo-conectados.png` · `conectados-emblema.png`

**Se modifican:**
- `index.html` — fuera el icono `#mundo-conectados` y la tarjeta `#serv-remesas`
- `taxi.html` — fuera el icono `#mundo-conectados`
- `app.js` — fuera las dos líneas que leen `conectadosActivo`
- `taxi.js` — fuera el bloque que destapa el icono
- `vercel.json` — fuera las dos reescrituras `/remesas` y `/conectados`
- `_redirects` — las mismas dos
- `sitemap.xml` — fuera la entrada `/remesas`

**No se tocan:** `mundos.js` (es genérico: mira qué logos hay visibles, no sabe de negocios), la CSP, `terminos.html` (no menciona remesas), `robots.txt`.

---

### Task 1: Copia de seguridad fuera del repo y repo al día

**Files:**
- Crear: `C:\inventario\conectados-apartado\` (fuera de los dos repos; **no** es un repo git)

- [ ] **Step 1: Comprobar que estás en el repo correcto y en `main`**

```bash
cd /c/inventario/tienda-3b
git status -sb
```

Esperado: la primera línea empieza por `## main...origin/main`. Si hay archivos modificados sin commitear que NO sean `catalogo.json` o `taxi.json`, **para y pregunta**: es trabajo de otra sesión.

- [ ] **Step 2: Poner el clon al día con el remoto**

```bash
git pull --rebase
```

Esperado: `Successfully rebased and updated refs/heads/main.` (el remoto trae commits automáticos del publicador que solo tocan `catalogo.json` y `taxi.json`).

- [ ] **Step 3: Guardar una copia de Conectados fuera del repo**

```bash
mkdir -p /c/inventario/conectados-apartado
cp conectados.html conectados.css conectados.js remesa-calc.js conectados.json logo-conectados.png conectados-emblema.png /c/inventario/conectados-apartado/
ls -la /c/inventario/conectados-apartado/
```

Esperado: los **siete** archivos listados en el destino. Si falta alguno, para: sin la copia no se borra nada.

- [ ] **Step 4: Dejar una nota de qué es esa carpeta**

Crea `C:\inventario\conectados-apartado\LEEME.md` con este contenido exacto:

```markdown
# Conectados (remesas) — apartado de 3bqba.com el 2026-10-07

Esta carpeta guarda la página de remesas tal y como estaba publicada en el dominio de 3B el
día que se retiró, por decisión del dueño del negocio: el servicio no debe aparecer
relacionado con la marca 3B.

- Son archivos **estáticos**: no funcionan solos. `conectados.js` pide `conectados.json`
  (lo generaba Stock+ desde el panel 💸 Conectados) y `remesa-calc.js` hace la cuenta en el
  navegador, gemela de `lib/remesaTarifa.js` de Stock+.
- La fila de logos de la cabecera, el favicon y el `canonical` son de 3B: si esto se
  relanza en otro dominio, hay que quitarlos y rehacer la marca.
- El historial completo sigue en git: `cd C:\inventario\tienda-3b && git log -- conectados.html`.
- El motor del lado servidor (tarifa, registro de remesas, panel) NO se borró: sigue en
  Stock+. Ver el Plan B en
  `C:\inventario\inventario-stockmas\docs\superpowers\plans\2026-10-07-cortar-remesas-de-los-canales-3b.md`.
```

- [ ] **Step 5: Confirmar que la copia está completa**

```bash
ls /c/inventario/conectados-apartado/ | wc -l
```

Esperado: `8` (siete archivos + `LEEME.md`).

---

### Task 2: Quitar el icono y la tarjeta de la portada

**Files:**
- Modify: `index.html` (dos bloques)
- Modify: `app.js` (dos funciones)

- [ ] **Step 1: Quitar el icono de la cabecera de `index.html`**

Borra estas tres líneas **completas** (están dentro de `<nav class="mundos">`, justo después del bloque del taxi):

```html
        <a class="mundo" id="mundo-conectados" href="/remesas" hidden title="Conectados — Remesas">
          <img class="mundo-img" src="/logo-conectados.png" width="256" height="256" alt="Conectados — remesas a Cuba">
        </a>
```

El `<nav>` queda con dos hijos: el logo de 3B (`#logo-header`) y el del taxi (`#mundo-taxi`). No toques ninguno de los dos.

- [ ] **Step 2: Quitar la tarjeta de servicio de `index.html`**

Borra este `<article>` entero (está dentro de `<div class="servicios-lista">`, después de `#serv-taxi`):

```html
      <article class="serv" id="serv-remesas" hidden>
        <div class="serv-banner serv-banner-emblema"><img src="conectados-emblema.png" width="320" height="320" loading="lazy" alt="Conectados — remesas a Cuba"></div>
        <div class="serv-cuerpo">
          <h3 class="serv-nombre">Remesas a Cuba</h3>
          <p class="serv-texto">Calcula antes de pagar.</p>
          <a class="btn btn-primario serv-btn" href="/remesas">Calcular mi remesa <span aria-hidden="true">→</span></a>
        </div>
      </article>
```

- [ ] **Step 3: Arreglar el comentario de la sección de servicios en `index.html`**

Busca el comentario que hay justo encima de `<section id="servicios"`. Cambia esta línea:

```html
  <!-- Servicios de 3B (taxi y remesas), entre las categorias y la parrilla: al final de la pagina quedaba a 45.400px y nadie la veia. NO es una categoria: una categoria sin productos no se pinta
```

por:

```html
  <!-- Servicios de 3B (hoy solo el taxi), entre las categorias y la parrilla: al final de la pagina quedaba a 45.400px y nadie la veia. NO es una categoria: una categoria sin productos no se pinta
```

Y en el mismo comentario, cambia:

```html
       renderServicios() (app.js) la destapa con tienda.taxiActivo / tienda.conectadosActivo.
```

por:

```html
       renderServicios() (app.js) la destapa con tienda.taxiActivo.
```

- [ ] **Step 4: Quitar las lecturas de `conectadosActivo` en `app.js`**

En `renderMundos()`, borra estas dos líneas:

```js
  const remesas = document.getElementById('mundo-conectados');
  if (remesas) remesas.hidden = !(CAT && CAT.tienda && CAT.tienda.conectadosActivo);
```

y en el comentario de encima de la función, borra la línea:

```js
// Lo mismo vale para Conectados (remesas) desde 2026-09-30.
```

- [ ] **Step 5: Dejar `renderServicios()` solo con el taxi en `app.js`**

Sustituye la función entera y su comentario por esto:

```js
// ── Otros servicios de 3B (hoy solo el taxi) ──
// Misma regla que renderMundos: una tarjeta solo se ve si Ruth encendio ESE servicio
// (catalogo.json -> tienda.taxiActivo). La seccion entera se esconde si no hay ninguno.
// El texto, el banner y el enlace viven en index.html: del catalogo publico solo viaja
// el interruptor.
// 2026-10-07: se retiro la tarjeta de remesas (Conectados) junto con su pagina.
function renderServicios() {
  const t = (CAT && CAT.tienda) || {};
  const taxi = document.getElementById('serv-taxi');
  if (taxi) taxi.hidden = !t.taxiActivo;
  const seccion = document.getElementById('servicios');
  if (seccion) seccion.hidden = !t.taxiActivo;
}
```

- [ ] **Step 6: Comprobar que no queda ninguna referencia en la portada**

```bash
grep -n -i "conectados\|remesa" index.html app.js
```

Esperado: **ninguna salida**. Si sale algo, bórralo antes de seguir.

- [ ] **Step 7: Comprobar que el JS sigue siendo válido**

```bash
node --check app.js
```

Esperado: sin salida (eso es que compila).

- [ ] **Step 8: Commit**

```bash
git add index.html app.js
git commit -m "web: la portada deja de anunciar Conectados (remesas)

Fuera el icono de la cabecera y la tarjeta de Servicios, y con ellos las
dos lecturas de tienda.conectadosActivo. Decision del negocio: el servicio
de remesas no debe aparecer relacionado con la marca 3B.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Quitar el icono de la página del taxi

**Files:**
- Modify: `taxi.html`
- Modify: `taxi.js`

- [ ] **Step 1: Quitar el icono de `taxi.html`**

Borra estas tres líneas completas (dentro de `<nav class="mundos">`):

```html
        <a class="mundo" id="mundo-conectados" href="/remesas" hidden title="Conectados — Remesas">
          <img class="mundo-img" src="/logo-conectados.png" width="256" height="256" alt="Conectados — remesas a Cuba">
        </a>
```

- [ ] **Step 2: Quitar el bloque que lo destapaba en `taxi.js`**

Borra estas ocho líneas (están justo después de `renderReferidor();`):

```js
  // La pastilla de Conectados: la ve quien ya esta en el taxi, si el otro negocio
  // esta encendido. Gemelo de renderMundos() de app.js.
  const remesas = document.getElementById('mundo-conectados');
  if (remesas) {
    remesas.hidden = !(TX && TX.conectadosActivo);
    if (window.Mundos) window.Mundos.refrescar();
  }
```

⚠️ Al borrar esto desaparece la única llamada a `window.Mundos.refrescar()` de `taxi.js`. No pasa nada: `mundos.js` ya se refresca solo en `DOMContentLoaded`, y en el taxi los dos logos que quedan (3B y el propio taxi) no dependen de ningún JSON — nacen visibles en el HTML.

- [ ] **Step 3: Comprobar que no queda nada**

```bash
grep -n -i "conectados\|remesa" taxi.html taxi.js
```

Esperado: **ninguna salida**.

- [ ] **Step 4: Comprobar que el JS sigue siendo válido**

```bash
node --check taxi.js
```

Esperado: sin salida.

- [ ] **Step 5: Commit**

```bash
git add taxi.html taxi.js
git commit -m "web: la pagina del taxi deja de anunciar Conectados

Era el unico sitio donde el icono seguia VISIBLE en produccion: taxi.json
se publico con conectadosActivo:true a las 12:11 y no se volvio a publicar
cuando se apago el interruptor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Borrar la página y sus rutas

**Files:**
- Delete: `conectados.html`, `conectados.css`, `conectados.js`, `remesa-calc.js`, `conectados.json`, `logo-conectados.png`, `conectados-emblema.png`
- Modify: `vercel.json`, `_redirects`, `sitemap.xml`

- [ ] **Step 1: Confirmar otra vez que la copia de seguridad existe**

```bash
ls /c/inventario/conectados-apartado/
```

Esperado: los siete archivos + `LEEME.md`. **Si no están, vuelve a la Task 1.** No sigas.

- [ ] **Step 2: Borrar los siete archivos del repo**

```bash
cd /c/inventario/tienda-3b
git rm conectados.html conectados.css conectados.js remesa-calc.js conectados.json logo-conectados.png conectados-emblema.png
```

Esperado: siete líneas `rm '...'`.

- [ ] **Step 3: Quitar las reescrituras de `vercel.json`**

Borra estas dos líneas del array `rewrites`:

```json
    { "source": "/remesas", "destination": "/conectados.html" },
    { "source": "/conectados", "destination": "/conectados.html" },
```

El array queda así (no toques nada más del archivo, y **menos la CSP**):

```json
  "rewrites": [
    { "source": "/taxi", "destination": "/taxi.html" },
    { "source": "/((?!.*\\.).*)", "destination": "/index.html" }
  ],
```

⚠️ Ojo con el comodín de la última línea: **captura cualquier ruta sin punto y la sirve como la portada**. Es decir, tras este cambio `3bqba.com/remesas` NO dará un 404 clásico: servirá el HTML de la tienda con estado 200. Eso es aceptable y es lo que ya le pasa a cualquier ruta inventada del sitio (y es lo que pasaba en septiembre, cuando la página aún no estaba publicada). Lo que importa es que **no quede ni rastro de la página de remesas**. No añadas una regla especial para esto.

- [ ] **Step 4: Quitar las mismas dos reglas de `_redirects`**

Borra estas dos líneas:

```
/remesas    /conectados.html  200
/conectados /conectados.html  200
```

El archivo queda con su cabecera de comentarios y una sola regla:

```
/taxi  /taxi.html  200
```

- [ ] **Step 5: Quitar `/remesas` del `sitemap.xml`**

Borra este bloque entero:

```xml
  <url>
    <loc>https://www.3bqba.com/remesas</loc>
    <lastmod>2026-10-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
```

Quedan dos `<url>`: la portada y `/taxi`.

- [ ] **Step 6: Barrido final de todo el repo**

```bash
grep -rn -i "conectados\|remesa" --include="*.html" --include="*.js" --include="*.json" --include="*.xml" --include="*.css" --include="_redirects" . | grep -v "^./docs/"
```

Esperado: **ninguna salida**. (Se excluye `docs/` a propósito: los informes y planes viejos cuentan la historia y se quedan.)

- [ ] **Step 7: Commit**

```bash
git add -A vercel.json _redirects sitemap.xml
git commit -m "web: fuera la pagina de Conectados y sus rutas del dominio 3B

Se borran conectados.{html,css,json}, conectados.js, remesa-calc.js y los
dos logos; se quitan las reescrituras /remesas y /conectados de vercel.json
y _redirects, y la entrada del sitemap. Copia intacta en
C:\\inventario\\conectados-apartado por si se relanza en otro dominio; el
historial de git la conserva igualmente.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Mirar la tienda en local antes de publicar

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Abrir la portada en local**

Abre `C:\inventario\tienda-3b\index.html` en el navegador (doble clic sirve; el catálogo cargará desde el `catalogo.json` local).

- [ ] **Step 2: Mirar — no medir — tres cosas**

1. En la cabecera hay **dos** logos: 3B y el taxi. Ningún globo.
2. La sección **Servicios** enseña solo la tarjeta del taxi, y no hay hueco vacío a su lado.
3. La consola del navegador (F12) no tiene errores rojos nuevos.

Si la sección Servicios no aparece, es correcto si `catalogo.json` local trae `taxiActivo: false`; compruébalo antes de dar nada por roto.

- [ ] **Step 3: Abrir la página del taxi en local**

Abre `C:\inventario\tienda-3b\taxi.html`. Esperado: dos logos en la cabecera (3B y taxi), ningún globo, sin errores en consola.

- [ ] **Step 4: Anotar lo observado**

Escribe en una nota lo que viste **con tus ojos** (no "debería"). Esto va luego al informe.

---

### Task 6: Publicar y comprobar en producción

**Files:** ninguno (despliegue)

- [ ] **Step 1: Volver a poner el clon al día (el publicador no para)**

```bash
cd /c/inventario/tienda-3b
git pull --rebase
```

Esperado: rebase limpio. Si hay conflicto, será en `catalogo.json` o `taxi.json`; quédate con la versión del remoto (`git checkout --theirs catalogo.json`) — esos los escribe Stock+, no este plan.

- [ ] **Step 2: Publicar**

```bash
git push
```

Esperado: `main -> main`. Vercel despliega solo en 1–2 minutos.

- [ ] **Step 3: Comprobar que las URLs de remesas ya no sirven la página**

```bash
curl -sL "https://3bqba.com/remesas" | grep -c -i "Conectados"
curl -sL -o /dev/null -w "%{http_code}\n" "https://3bqba.com/conectados.json"
```

Esperado: el primero imprime `0` (la portada de la tienda no dice «Conectados»); el segundo imprime `404`.

⚠️ Si el primero imprime un número mayor que 0, espera un minuto y repite: el despliegue tarda. Si sigue, mira si el `push` llegó (`git log origin/main -1`).

- [ ] **Step 4: Comprobar el sitemap publicado**

```bash
curl -sL "https://3bqba.com/sitemap.xml" | grep -c "remesas"
```

Esperado: `0`.

- [ ] **Step 5: MIRAR la página del taxi en vivo**

Abre `https://3bqba.com/taxi` en el navegador (con **Ctrl+Shift+R**, que el sitio se cachea) y comprueba a ojo que en la cabecera hay **dos** logos y ningún globo. Este es el paso que de verdad cierra el encargo: era el único sitio donde el icono se veía.

- [ ] **Step 6: MIRAR la portada en vivo**

Abre `https://3bqba.com/` con **Ctrl+Shift+R**. Esperado: dos logos, y en Servicios solo el taxi.

- [ ] **Step 7: Avisar de lo que queda fuera de este plan**

Dos cosas que este plan NO puede hacer y hay que decirlas en el informe:

1. **Google puede tardar semanas** en dejar de enseñar `3bqba.com/remesas` en sus resultados, aunque la URL ya no sirva la página. Si corre prisa, se pide la retirada desde Search Console (lo hace una persona, con la cuenta del sitio).
2. **El panel de Stock+ todavía puede volver a publicar `conectados.json`** con el botón «🚀 Publicar a Internet» de la sección 💸 Conectados. Hasta que se ejecute el **Plan B** (`inventario-stockmas/docs/superpowers/plans/2026-10-07-cortar-remesas-de-los-canales-3b.md`), un clic ahí devuelve el archivo al dominio. **Díselo a Ruth.**

---

### Task 7: Dejar la documentación al día

**Files:**
- Create: `C:\inventario\tienda-3b\docs\informes\2026-10-07-sacar-remesas-del-dominio.md`

- [ ] **Step 1: Escribir el informe de relevo**

Usa el skill `writing-handoff-reports`. Tiene que ser autocontenido e incluir:
- Qué se borró y qué se modificó, archivo por archivo.
- Dónde quedó la copia (`C:\inventario\conectados-apartado\`) y que el historial de git conserva todo.
- **La evidencia observada** de la Task 6 (lo que imprimieron los `curl` y lo que viste en el navegador), con las cifras reales.
- Lo que quedó pendiente: la retirada en Search Console y el Plan B de Stock+.
- Marca como **⚠ NO VERIFICADO** cualquier paso que no llegaras a ejecutar.

- [ ] **Step 2: Commit del informe**

```bash
git add docs/informes/2026-10-07-sacar-remesas-del-dominio.md docs/superpowers/plans/2026-10-07-sacar-remesas-del-dominio-3b.md
git commit -m "docs: informe y plan de la retirada de Conectados del dominio

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

## Lo que este plan NO hace (a propósito)

- **No borra el motor.** `lib/remesaTarifa.js`, `lib/remesas.js`, `lib/conectadosWeb.js`, la sección 💸 del panel y las remesas ya registradas siguen en Stock+. Decisión del dueño: se guarda para relanzarlo aparte.
- **No toca la CSP** de `vercel.json` ni de `_headers`.
- **No corta los canales de 3B** (el mensaje de enlaces, las presentaciones, el tutorial 💸, la capacitación de gestores, lo que Mía sabe). Eso es el **Plan B**, en el repo de Stock+. Este plan y aquel son independientes, pero **este va primero**: es el único que quita algo que ahora mismo ve el público.
