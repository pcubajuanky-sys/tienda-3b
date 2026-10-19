# La batería de tests ya no borra `precios-gestores.json`

**Fecha:** 2026-10-19 · **Rama:** `main` · **Commit:** `8237cb0` · **SIN push** (lo decide Ruth)
**Viene de:** `docs/informes/2026-10-18-atras-cierra-y-busqueda-que-vende.md`, sección
«Hallazgo aparte: la batería BORRA un archivo versionado del repo».

---

## El defecto

`test/producto.test.js` operaba sobre `precios-gestores.json`, que **está versionado**, y lo
destruía:

- Exigía que el archivo **no existiera**: `assert.strictEqual(fs.existsSync('precios-gestores.json'), false, 'borra ese archivo antes de correr los tests')`.
- El test siguiente lo creaba y, en su `finally`, lo eliminaba con `fs.unlinkSync` sin restaurar
  el original.

Efectos, medidos y reproducidos varias veces:

1. Con el archivo presente —lo normal tras un clonado o un `git merge` que lo traiga— la batería
   daba **99/100**.
2. Al terminar, `git status` mostraba ` D precios-gestores.json`: un borrado fácil de commitear
   sin querer, que habría quitado de producción un archivo que piden `app.js` (línea ~1784),
   `api/producto.js` (línea ~40) y `sw.js` (`PRECIOS_GESTOR`).
3. Las ejecuciones siguientes daban 100/100 **porque el archivo ya no estaba**, lo que hacía
   parecer que el fallo era un test inestable. No lo era: es determinista.

### La causa de fondo era una premisa caducada

El comentario que encabezaba esos tests decía:

> «El archivo de precios por gestor NO está en el repo (lo publica Stock+), así que estos tests
> lo escriben, prueban y lo borran.»

Eso **dejó de ser cierto**: Stock+ lo publica **al propio repo** por GitHub (commit `6fa7b52`,
«precios por gestor: 0 gestores»), y hoy vale `{}`. El comentario, y los tests que se apoyaban
en él, nunca se actualizaron. Por eso el arreglo incluye corregir el comentario: si se deja
mintiendo, el siguiente que lea el archivo repite el error.

## El arreglo

Solo `test/producto.test.js` (+51 / −23):

- Al cargar el archivo de pruebas se guardan los **bytes exactos** del original en memoria, o
  `null` si no existía.
- El test del archivo **ausente** lo aparta solo mientras dura la prueba y recarga el handler con
  `require.cache` limpio (hacía falta: `api/producto.js` cachea la tabla en `cacheGest` al primer
  uso).
- El test del archivo **con datos** lo sobrescribe con su tabla y lo restaura igual.
- `restaurarArchivo()` corre en el `finally` de cada test **y** en un `after()` de red: pase lo
  que pase, el repo queda como estaba. Si el archivo no existía, se queda sin existir.
- Helpers `handlerLimpio()` y `pedirCon()` para no repetir el bloque del `res` falso.

Se descartó apartar el archivo con un `rename` a `.bak`: restaurar desde memoria no deja ficheros
sueltos si el proceso muere. **Contrapartida asumida:** si se mata el proceso justo en mitad de
esos dos tests, el archivo queda borrado; se recupera con `git checkout -- precios-gestores.json`.

## Evidencia observada

`node --test` desde la raíz (🔴 nunca `node --test test/`), las dos situaciones corridas y
miradas:

| Caso | Resultado | `git status` después |
|---|---|---|
| **A** · con `precios-gestores.json` presente | **100/100**, 0 fallos | **vacío** — el repo queda intacto, el archivo sigue valiendo `{}` |
| **B** · sin el archivo (borrado a mano) | **100/100**, 0 fallos | la batería **no lo crea** |

Antes del arreglo, el caso A daba 99/100 y dejaba el archivo borrado.

## Estado

- Commiteado en `main` como `8237cb0`. **No se hizo `push`**: el push de este repo despliega en
  producción y es decisión de Ruth. Queda 1 commit por publicar.
- `C:\Users\JyR\CLAUDE.md` actualizado: el defecto pasa de «sin arreglar» a resuelto.
- No se tocaron `catalogo.json`, `sitemap.xml` ni el contenido de `precios-gestores.json`.
