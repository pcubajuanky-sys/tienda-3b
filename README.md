# Tienda 3B

Catálogo web estático. Los datos salen de `catalogo.json`, que **publica Stock+** desde la PC
(Configuración → 🌐 Tienda web → «Publicar catálogo ahora»).

No tiene backend. No guarda pedidos. El cliente arma el carrito y el pedido sale por WhatsApp.

## Puesta en marcha (una sola vez, lo hace el dueño)

1. **Crear el repo en GitHub.** Cuenta en github.com → New repository → nombre `tienda-3b` →
   **Public** → Create. No añadas README (ya hay uno).
2. **Subir esta carpeta:**
   ```bash
   cd "C:/inventario/tienda-3b"
   git remote add origin https://github.com/TU-USUARIO/tienda-3b.git
   git push -u origin main
   ```
3. **Conectar Vercel.** Cuenta en vercel.com (entra con GitHub) → Add New → Project →
   elige `tienda-3b` → Framework Preset: **Other** → Deploy. En un minuto da una URL
   `https://tienda-3b.vercel.app`. No hay nada que configurar: es HTML estático.
4. **Crear el token de GitHub** para que Stock+ pueda publicar:
   github.com → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → `tienda-3b`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Genera y **copia el token** (solo se ve una vez).
5. **Pegar el token en Stock+.** En `C:\inventario\inventario-stockmas\.env`:
   ```
   GITHUB_OWNER=TU-USUARIO
   GITHUB_REPO=tienda-3b
   GITHUB_TOKEN=el_token_que_copiaste
   ```
   Reinicia `server.js` para que lo lea.
6. **Probar.** Panel → Configuración → 🌐 Tienda web → pon el recargo y tu WhatsApp →
   Guardar → «Publicar catálogo ahora». En ~30 s la URL de Vercel muestra tus productos.

## Enlaces de vendedor

`https://tienda-3b.vercel.app/?ref=MARIA` — el código viaja en el pedido de WhatsApp.
Los vendedores se dan de alta en el panel de Stock+.

## Avisos

- `catalogo.json` es **público**: cualquiera puede leerlo entero. Solo lleva lo que se ve en la web
  (nombre, foto, descripción, precio con recargo). Nunca costos, stock ni proveedores.
- El **teléfono de WhatsApp queda público**. Usa el número del negocio.
- Si la PC está apagada, la tienda sigue online con el catálogo de la última publicación.
