# Compartir: texto completo, enlace del grupo y botones más grandes — Plan

> **Para ejecutores:** SUB-SKILL OBLIGATORIO: `superpowers:executing-plans`. Los pasos usan casillas
> (`- [ ]`) para ir marcando.

**Objetivo:** que el texto que se comparte lleve también la descripción del producto y el enlace del
grupo de WhatsApp, que el rótulo invite a ganar comisiones, y que los tres botones dejen de ser
diminutos.

**Contexto:** hoy, 2026-10-10, se desplegó la función de compartir (plan
`2026-10-10-compartir-producto-fb-wa.md`, informe `docs/informes/2026-10-10-compartir-producto-fb-wa.md`).
Ruth la probó y pidió estos cuatro ajustes. **Léete ese informe antes de empezar**: explica cómo
encaja todo y por qué el botón de Facebook tiene el orden que tiene.

**Decisiones de Ruth, ya tomadas (no reabrir):**

| Pregunta | Respuesta |
|---|---|
| ¿El rótulo se adapta a si quien mira es gestor? | **No. El mismo texto para todos**, aunque un cliente sin enlace no cobre comisión. Se le planteó y lo decidió así |
| ¿Dónde va el enlace del grupo? | En el **texto que se comparte** (WhatsApp y Facebook). El botón «Copiar enlace» sigue copiando solo la URL, porque es lo que dice su nombre |

---

## Antes de empezar

- Repo: `C:\inventario\tienda-3b`, rama `main`. Comprueba con `git status` que el árbol está limpio.
- **PowerShell 5.1**: no existen `&&`, `||`, `??` ni `?.`. Encadena con `;` y usa `if ($?) { }`.
- **Prohibido añadir manejadores en línea** (`onclick=`, `onerror=`): la CSP de producción solo admite
  dos hashes concretos y cualquier añadido rompe la página entera.
- Las pruebas se corren con **`node --test`** desde la raíz (no `node --test test/`: falla en Node 24).
  Las 26 actuales tienen que seguir en verde: este cambio no toca `api/`.
- **No hagas `git push`.** Lo hace el piloto al final.
- **No toques `catalogo.json`**: lo publica Stock+ y se sobrescribe solo.

---

### Task 1: el texto que se comparte

Hoy el texto es nombre + precio + mensajería + enlace. Le faltan la descripción y el grupo.

**Archivos:**
- Modificar: `app.js`, función `textoCompartir` (búscala por nombre; está junto a `urlProducto`)

- [x] **Paso 1: sustituye la función entera**

```js
function textoCompartir(p, url) {
  const lineas = ['*' + p.name + '*', precioTexto(p)];
  if (p.envio && p.envio.corto) lineas.push(p.envio.corto);
  const desc = String(p.notes || '').trim();
  if (desc) lineas.push('', desc);
  // El enlace del PRODUCTO va antes que el del grupo a proposito: WhatsApp pinta la
  // vista previa del PRIMER enlace del mensaje, y la que queremos es la del producto.
  lineas.push('', '👉 Míralo aquí: ' + url);
  const grupo = String((CAT.tienda || {}).grupoWA || '').trim();
  if (grupo) lineas.push('', '👥 Únete a nuestro grupo de ofertas: ' + grupo);
  return lineas.join('\n');
}
```

- [x] **Paso 2: compruébalo con los ojos**

Levanta el servidor estático desde la raíz del repo:

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,s)=>{const r=q.url.split('?')[0];const d=r==='/'?'index.html':r.slice(1);f.readFile(p.join(process.cwd(),d),(e,b)=>{if(e){s.writeHead(404);return s.end('no')}const t=d.endsWith('.css')?'text/css':d.endsWith('.js')?'text/javascript':d.endsWith('.json')?'application/json':d.endsWith('.png')?'image/png':d.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8';s.writeHead(200,{'Content-Type':t});s.end(b)})}).listen(8123,()=>console.log('http://localhost:8123'))"
```

Abre `http://localhost:8123/`, y en la consola del navegador:

```js
localStorage.setItem('ref','5D9K9'); location.reload();
```

Después abre un producto que tenga descripción y mensajería (por ejemplo «Ventilador recargable»)
y ejecuta en la consola:

```js
console.log(textoCompartir(productoDe(productoModal), urlProducto(productoDe(productoModal))));
```

Esperado, en este orden: nombre en negrita, precio, mensajería, línea en blanco, la descripción
completa, línea en blanco, `👉 Míralo aquí: http://localhost:8123/p/<CODIGO>?ref=5D9K9`, línea en
blanco, `👥 Únete a nuestro grupo de ofertas: https://chat.whatsapp.com/...`.

**Pega el texto que salió en tu informe.** Comprueba también un producto **sin** descripción y otro
**sin** mensajería: no pueden quedar líneas en blanco de más ni un `undefined`.

- [x] **Paso 3: commit**

```bash
git add app.js
git commit -m "web: el texto compartido lleva la descripcion y el grupo"
```

---

### Task 2: el rótulo y el tamaño de los botones

**Archivos:**
- Modificar: `index.html`, dentro de `#modal-compartir`
- Modificar: `estilos.css`, el bloque `/* ── Compartir (dentro del modal de detalle) ── */`

- [x] **Paso 1: cambia el rótulo**

En `index.html`, sustituye la línea del rótulo por:

```html
        <span class="compartir-tit">Comparte los productos para que ganes comisiones</span>
```

- [x] **Paso 2: agranda los botones**

En `estilos.css`, sustituye **el bloque entero** de compartir por este:

```css
/* ── Compartir (dentro del modal de detalle) ── */
/* Los botones son del mismo alto que el de «Añadir» (48px, el de .btn): con 40px y
   letra de 13px Ruth los vio diminutos en el telefono. `flex:1 1 140px` los reparte
   a lo ancho y a 375px caen dos arriba y uno abajo, sin desbordar. */
.compartir{margin-top:var(--e4);padding-top:var(--e3);border-top:1px solid var(--border)}
.compartir-tit{display:block;font-size:var(--t-sm);font-weight:700;color:var(--text);margin-bottom:var(--e2)}
.compartir-botones{display:flex;gap:var(--e1);flex-wrap:wrap}
.compartir-btn{
  flex:1 1 140px;
  display:inline-flex;align-items:center;justify-content:center;gap:var(--e1);
  min-height:48px;padding:0 var(--e3);
  border:1px solid var(--border);border-radius:var(--radio-control);
  background:var(--surface);color:var(--text);
  font-family:inherit;font-size:var(--t-md);font-weight:700;line-height:1.1;cursor:pointer;
  transition:background-color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.compartir-btn:hover{border-color:var(--brand);background:var(--brand-soft)}
.compartir-aviso{min-height:20px;margin:var(--e2) 0 0;font-size:var(--t-sm);color:var(--text-2)}
```

- [x] **Paso 3: míralo, no lo supongas**

Con el servidor del Task 1 corriendo, abre un producto y comprueba **y captura**:

1. A **375 px** de ancho: el rótulo se lee entero, los botones son claramente más grandes que antes,
   caen dos arriba y uno abajo, y **no hay desbordamiento horizontal**
   (`document.documentElement.scrollWidth === window.innerWidth`).
2. A ancho de escritorio: los tres caben en una fila y la ocupan.
3. En **modo claro y en modo oscuro** (emula `prefers-color-scheme` en las herramientas del
   navegador) todo se lee.
4. La consola **sin errores de CSP**.

Guarda dos capturas en `docs/informes/`: `2026-10-10-botones-grandes-375px.jpg` y
`2026-10-10-botones-grandes-escritorio.jpg`.

- [x] **Paso 4: que no rompiste nada**

```bash
node --test
```

Esperado: `# pass 26`, `# fail 0`.

- [x] **Paso 5: commit**

```bash
git add index.html estilos.css docs/informes/2026-10-10-botones-grandes-375px.jpg docs/informes/2026-10-10-botones-grandes-escritorio.jpg
git commit -m "web: botones de compartir mas grandes y rotulo de comisiones"
```

- [x] **Paso 6: para el servidor de pruebas**

Ctrl+C, o mata el proceso de Node que escucha en el 8123. No dejes servidores sueltos.

---

## Repaso contra lo que pidió Ruth

| Lo que pidió | Tarea |
|---|---|
| «en el portapapeles no se copia la explicación del producto y me gustaría que saliera» | 1 |
| «me gustaría que esté el link del grupo cada vez que comparten» | 1 |
| «el texto diga comparte los productos para que ganes comisiones» | 2 |
| «los botones de facebook whatsapp y comparte son muy pequeños» | 2 |
