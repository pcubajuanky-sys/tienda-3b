# Informe de relevo — Conectados (remesas) · Fase B: la página

**Fecha:** 2026-10-01 · **Plan:** `inventario-stockmas/docs/superpowers/plans/2026-09-30-conectados-fase-b-la-pagina.md`
**Ejecución:** sesión nativa, piloto (Opus) orquestando subagentes sonnet. **Toda la verificación del
navegador la hizo el piloto**, abriendo la página de verdad; no es el resumen de ningún subagente.

## Qué quedó hecho

| Task | Archivo | Commit (`tienda-3b`) |
|---|---|---|
| 1 | `remesa-calc.js` — la cuenta en el navegador (port de `lib/remesaTarifa.js`) | `f745bf1` |
| 1 | `tests/remesaParidad.test.js` (en `inventario-stockmas`) | `32090c7` |
| 2 | `conectados.html` — 183 líneas | `e43b41a` |
| 3 | `conectados.css` — 63 líneas | `001feaf` |
| 4 | `conectados.js` — 354 líneas | `d6fff26` |
| 5 | `vercel.json`, `_redirects`, `sitemap.xml` — rutas `/remesas` y `/conectados` | `7a093dc` |
| — | **fix** del mensaje de WhatsApp (ver abajo) | `cee20fb` |

## El bug que encontró mirar la página

El plan (y por tanto el código) armaba el mensaje de WhatsApp con un array donde las cadenas vacías
hacían **dos papeles a la vez**: separador de párrafo a propósito, y campo opcional ausente. El
`.filter((l) => l !== '')` final no distinguía entre los dos y **se llevaba también los separadores**.
El mensaje salía como un bloque macizo, sin una sola línea en blanco.

Los tests no lo habrían cazado nunca: la función vive en el navegador y no tiene test propio. Lo cazó
abrir la página y leer el `href` del botón.

**Arreglo:** los campos opcionales ausentes devuelven `null` y el filtro es `l !== null`; los `''`
sueltos se quedan. Verificado en el navegador real después del arreglo: 4 líneas en blanco (3
separadores + la del `Ref:`) y el mensaje acaba en `Ref: 9H5MM`. El plan se corrigió también, para
que plan y código digan lo mismo.

## Evidencia OBSERVADA en el navegador

Vista previa real (`/preview`, que sirve la carpeta **con las cabeceras de seguridad de producción**),
a 375 px de ancho y en modo oscuro:

| Prueba | Resultado |
|---|---|
| Errores de consola | **Solo 2 × 404 de los logos** (`/logo-3b.png`, `/logo-taxi-3b.png`). Es el fallo cosmético de `/preview` con rutas absolutas, ya documentado en `CLAUDE.md`, y pasa igual en el taxi. **Cero errores de CSP y cero de JavaScript.** |
| Recibe 100 (CUP) | Paga **$110.00** · Recibe **$100.00** · **75 500 CUP** · «Comisión del 10 %: $10.00 · Tasa 755 CUP/USD» |
| Modo «voy a pagar» 110 | Recibe **$100.00** — la inversa cuadra con la directa |
| Modo «voy a pagar» 221 | Recibe **$204.63** al **8 %** — el salto de tramo funciona en la frontera |
| Monto 10 | «El envío mínimo es de $20.00 USD» y el botón de WhatsApp **sin `href`** (apagado) |
| Entrega en USD | **12 %** (10 del tramo + 2 del recargo), desaparece la línea en CUP y sale la nota «Solo Artemisa y La Habana» |
| Campos incompletos | «Falta tu nombre, el nombre de quien recibe, su teléfono, la dirección, el municipio y la provincia» y el botón apagado |
| Campos completos | Botón encendido, apuntando a **`api.whatsapp.com/send`** (no `wa.me`) |
| Código de envío | `CN-3PDG3`, y **sobrevive a recargar la página** (sessionStorage) |
| `?ref=9H5MM` | «Vienes de parte de **Elaine Ocampo Pino**» y el mensaje acaba en `Ref: 9H5MM` |
| Vigencia | «Esta cotización vale 6 h.» |
| «Gana con Conectados» | Visible, con «Ganas un 3 % de la comisión de cada envío que traigas» |
| Etiquetas de los 8 campos | Las 8 tienen su `<label for=...>` correcto (comprobado una por una) |
| Manejadores en línea | **Ninguno** en el HTML — el `grep` de `onclick/onchange/oninput/onsubmit` sale vacío |
| Variables de color | Los 9 tokens que usa el CSS existen en `estilos.css`, en el tema **claro y en el oscuro** |

**Tests:** `node --test tests/remesaParidad.test.js` → `pass 3 / fail 0`. Son 3 tests que comparan el
port del navegador contra el módulo del servidor sobre **432 combinaciones** de monto, tramos y recargo.

**El destino de pago no se filtra, comprobado en un archivo real:** se generó un `conectados.json`
llamando al módulo de producción con dos formas de pago cuyos `datos` eran cadenas marcadas, y en el
JSON resultante solo aparece `[{"id":"zelle","nombre":"Zelle","paises":"EE.UU."},{"id":"usdt",
"nombre":"USDT (TRC-20)","paises":"cualquier país"}]`. Ni rastro de los secretos.

## Cómo verla (no hace falta reiniciar nada)

El servidor que ya está corriendo sirve `/preview` **desde disco**, así que la página nueva ya está
disponible en:

```
http://localhost:3000/preview/conectados
```

Comprobado: devuelve **HTTP 200**, igual que `conectados.json` y `remesa-calc.js`.

## 🔴 Hay un `conectados.json` de DEMO sin seguimiento

Para poder ver la página hubo que darle datos. Se generó uno **de prueba** en
`C:\inventario\tienda-3b\conectados.json`, llamando al módulo de producción `lib/conectadosWeb.js`
con una config inventada (tramos 10/8/6, tres entregas, Zelle y USDT, 128 envíos, 3 % de gestor).

- **No está commiteado** (`git status` lo marca `??`) y **no debe commitearse así.**
- Lo correcto es que Ruth configure lo suyo en el panel y pulse **«Generar para vista previa»**, que
  lo sobrescribe con los datos de verdad.
- Los teléfonos, la tasa 755 y el 128 de ese archivo **son inventados**.

## ⚠ NO VERIFICADO

- **El botón «📋 Copiar los datos»**: el portapapeles no se puede probar de forma fiable desde aquí.
- **Enviar el mensaje de verdad por WhatsApp.** Se comprobó el `href` que se genera, no el envío:
  mandar un mensaje es una acción hacia fuera y no se hizo.
- **La página en Internet.** Nada de esto está publicado: vive solo en disco y en `/preview`.
- **El panel como Admin** sigue pendiente de Ruth (ver el informe de la Fase A).

## Siguiente paso

**Fase C** — el icono al lado del taxi y la salida a producción:
`inventario-stockmas/docs/superpowers/plans/2026-09-30-conectados-fase-c-icono-y-publicar.md`.
**Necesita `logo-conectados.png` (256×256), que lo da Ruth.** Sin él, la Fase C no empieza.

---

## Ajustes al formulario (2026-10-02, pedidos por Ruth)

Commit `37c1bc1` — tres cambios, verificados por el piloto **abriendo la página de verdad** en
`http://localhost:3000/preview/conectados`:

1. **Fuera el teléfono/país de quien envía.** Se quitó el campo `cn-de-tel` del HTML y sus dos
   referencias en el JS (el listener y el paréntesis del mensaje). Comprobado que **no queda ni una
   mención** a ese id en ninguno de los dos archivos: una sola suelta habría dejado `el('cn-de-tel')`
   en `null` y la página reventaría al cargar. El mensaje ahora dice `Quien manda: Maria Perez`, a secas.
2. **El carné de identidad, marcado como opcional.** Ojo: **ya era opcional en la lógica** desde el
   principio (nunca estuvo en `OBLIGATORIOS`); lo que engañaba era la etiqueta. Ahora pone
   «Carné de identidad (opcional)». Verificado que el botón de WhatsApp **se enciende con el CI
   vacío** y que entonces la línea `CI:` no aparece en el mensaje.
3. **De quien recibe se piden nombre Y apellidos.** La etiqueta pasa a «Nombre y apellidos de quien
   recibe», y el aviso de campos que faltan dice lo mismo.

**Recolocación de la rejilla:** al quitar un campo, «Tu nombre» habría quedado emparejado en la
misma fila con «Nombre y apellidos de quien recibe» —quien manda al lado de quien recibe, que
confunde—. Los dos pasaron a ocupar fila entera (`cn-ancho`); «Carné (opcional)» y «Su teléfono en
Cuba» quedan emparejados. Verificado campo por campo en la página.

Consola: siguen siendo **solo los 2 × 404 de los logos** de `/preview`. Cero errores de CSP y de JS.
El diseño y el plan de la Fase B se actualizaron en el mismo movimiento, para que nadie reintroduzca
el campo del remitente leyendo un documento viejo.
