# Tasa visible, colores y ganchos de venta — 3bqba.com (2026-10-27)

Revisión de solo lectura (piloto Opus, sin tocar una línea de código), pedida por Ruth con cuatro
preguntas: qué más mejorar en la experiencia, qué ganchos de compra faltan, cómo enseñar la tasa de
cambio que se está usando, y un juicio de los colores como vendedor online.

## Cómo se miró

- **Sitio vivo** `https://www.3bqba.com` a **375×812**, en modo **claro y oscuro**, midiendo con
  JavaScript en la página real (colores computados, tamaños, conteos), no a ojo.
- **Contraste WCAG 2.1 calculado**, no estimado: 37 pares reales de `estilos.css`.
- `catalogo.json` **servido** (no el del árbol local, que estaba 5 días atrasado) y `data.json` de
  Stock+ para comparar precios contra la tasa.
- `server.js` y `lib/tasa*.js` de Stock+ para entender de dónde sale la tasa y cuándo se republica.
- Leída la revisión del **22/10** (`2026-10-22-revision-ux-y-ganchos-de-venta.md`) para **no repetirla**.
  Lo que sigue abierto de aquella lista va resumido al final, sin volver a argumentarlo.
- No se envió ningún pedido, no se pulsó «Pedir por WhatsApp» y no se escribió nada en el sitio.

---

## 0. Veredicto corto, como vendedor

Esta tienda ya convierte. No es una opinión: en los **últimos 30 días hay 196 pedidos completados,
y 122 de ellos (62 %) entraron por la web**. El problema ya no es «montar una tienda»; es exprimir
una que funciona. Por eso todo lo que sigue es concreto y medido, y por eso hay cosas que
**recomiendo no tocar**.

Tres frases que resumen el diagnóstico:

1. **El dato más valioso del negocio no se está usando: la mediana del pedido web es exactamente
   2,000 CUP**, que es el umbral de mensajería gratis. La clienta compra *hasta* el umbral y para.
   Eso dice que el umbral manda sobre el ticket — y que subirlo o escalonarlo es la palanca de
   dinero más grande que tiene esta tienda hoy.
2. **El sistema de color es bueno y está bien pensado, pero tiene dos fugas de tinta blanca** que
   en modo oscuro dejan el botón de comprar y el sello OFERTA prácticamente ilegibles (1.98:1 y
   2.23:1 medidos en el sitio vivo).
3. **Enseñar la tasa es buena idea y es barata** —el número ya viaja en el catálogo—, pero hay una
   trampa de honestidad que hay que resolver antes, o el número se vuelve en contra.

---

## 1. La tasa a la vista (lo que pediste)

### 1.1 Qué hay hoy

| Dato | Estado |
|---|---|
| `tasa` en el catálogo servido | **845** |
| `generado` del catálogo | **2026-10-27, 08:10 UTC** (hoy) |
| Precios que cuadran con 845 | **188 de 189** productos en USD |
| Lo que ve la clienta | «Los precios pueden variar según la tasa del día» — **sin número** |
| Dónde se usa `tasa` en el front | solo para aritmética: envío en USD, encargos, taxi |

O sea: **el número ya está en la página, cargado, correcto y actualizado — y no se enseña.** La
única frase que lo menciona es vaga y, encima, está en el pie, a 42,800 px del principio, en el
color más tenue de la paleta (`--text-3`, que además falla contraste; ver §2.3).

### 1.2 La trampa que hay que resolver antes

**La tasa que se enseñe tiene que ser la tasa con la que están calculados esos precios, no «la tasa
de hoy».** Son dos cosas distintas y confundirlas hace daño:

- `config.exchangeRate` de Stock+ cambia cuando Ruth lo cambia o cuando entra la automática.
- El catálogo de la tienda se republica **cada 5 horas** (`webAutoHoras = 5`) o cuando la tasa
  automática aplica una subida.
- 🔴 **Un cambio de tasa a mano NO republica el catálogo.** Verificado en `server.js`: el
  `PUT /api/config` sella `manualTs` pero no llama a `publicarAhora`; solo republican la tasa
  automática, el botón «Aplicar N» del aviso y el reloj de 5 h.

Hoy eso no se nota porque la publicación de las 08:10 ya traía 845. Pero en cuanto el número esté
**impreso en la portada**, cualquier rato entre un cambio manual y la siguiente publicación
enseñaría un número viejo junto a unos precios viejos. Como los precios *también* son viejos, no
es mentira — **si la etiqueta lo dice bien**.

- ✅ Honesto: «Estos precios están calculados a **1 USD = 845 CUP** · actualizado hoy 4:10 a.m.»
- ❌ Peligroso: «Tasa del día: 845 CUP» (promete una frescura que no tienes).
- ❌ **Falso hoy**: «Tasa de elTOQUE». La tasa automática **está encendida pero no funciona**:
  `tasaAuto.ultima.accion = 'nada'`, `motivo = 'sin-red'`, y **`ELTOQUE_TOKEN` no está en el `.env`**.
  El 845 lo puso Ruth a mano. Decir «elTOQUE» hoy sería inventar una fuente.

### 1.3 Qué haría, en orden de esfuerzo

**(a) Lo mínimo, y se puede hacer sin tocar Stock+ para nada** — `tasa` y `generado` ya viajan:

1. **En la portada**, el chip del medio pasa de «Precios en CUP y USD» a
   **«Precios en CUP y USD · 1 USD = 845 CUP»**. Es el sitio exacto donde la clienta ya está
   leyendo las credenciales de la tienda, cuesta cero de layout y convierte un dato administrativo
   en una **señal de transparencia**, que es lo que vende en Cuba.
2. **En el pie**, sustituir la frase vaga por el número y la hora que ya se imprime justo encima:
   «Precios calculados a 1 USD = 845 CUP · catálogo actualizado el 27/10 a las 4:10 a.m.»
3. **En el carrito**, al lado del total en USD: «(a 845 CUP por USD)». Es donde el número de verdad
   decide algo, porque es donde la clienta compara con lo que le cobran en la calle.

**(b) Si además se quiere presumir de fuente** (recomendado, pero es trabajo en Stock+):
publicar junto a la tasa su **fecha y su origen** (`tasaTs`, `tasaFuente`) y que la etiqueta se
adapte sola: con `fuente === 'eltoque'` y fecha de hoy puede decir «según elTOQUE»; si no, dice
solo «nuestra tasa». Así la frase nunca puede mentir, pase lo que pase con la API.
**Requisito previo**: conseguir el `ELTOQUE_TOKEN` y comprobar que la lectura real funciona — hoy
no se ha visto ni una lectura buena.

**(c) El gancho de verdad, si los números acompañan:** si la tasa de 3B está **por debajo** de la
informal del día, decirlo es el argumento de venta más fuerte que tiene esta tienda
(«nuestra tasa: 845 · hoy en la calle: 870»). Pero **esto exige la fuente automática funcionando**
y es un compromiso diario: si un día la tasa de 3B queda por encima, el cartel se vuelve en contra.
Yo lo dejaría para después de (b), y con un interruptor en el panel.

---

## 2. Los colores, medidos

### 2.1 Lo que está bien (y conviene no tocar)

La paleta **ciruela** (`#7A2E5D`) es una decisión acertada y la defiendo: en un mercado donde todas
las tiendas de WhatsApp son azules, verdes o del rojo de las ofertas, un ciruela profundo con fondo
cálido (`#FAF7F5`) se lee **caro** y se recuerda. Y el sistema está bien construido: escala de
espaciado, tres niveles de sombra, tokens que se invierten solos en oscuro y comentarios en el CSS
con el contraste ya medido. Eso es trabajo de diseñador, no de plantilla.

Los números lo confirman. De 37 pares medidos, **30 pasan AA y la mayoría pasa AAA**:

| Par | Claro | Oscuro |
|---|---|---|
| Texto normal sobre fondo | 16.13:1 | 16.85:1 |
| Texto secundario | 6.73:1 | 9.18:1 |
| Precio / marca sobre tarjeta | 8.84:1 | 9.06:1 |
| Botón principal (tinta sobre marca) | 8.84:1 | 9.27:1 |
| Portada (blanco sobre ciruela) | 7.14 – 13.44:1 | igual (no se invierte, a propósito) |

### 2.2 🔴 Dos fugas de tinta blanca — las dos en sitios que venden

El sistema invierte los **fondos** en modo oscuro, pero dos reglas tienen el color del **texto**
escrito a mano como `#fff`. Resultado, medido en el sitio vivo con el modo oscuro puesto:

| Elemento | Qué es | Medido | Veredicto |
|---|---|---|---|
| `.btn-wa` → **«Pedir por WhatsApp»** | el botón de pagar; esta tienda **no tiene otra caja** | blanco sobre `#25D366` = **1.98:1** | ilegible |
| `.card-oferta` → sello **OFERTA** | el gancho de descuento, **17 visibles** en la parrilla | blanco sobre `#FF8AA6` = **2.23:1** | ilegible |

Y en **modo claro** el mismo botón de pagar se queda en **4.14:1** con letra de 17 px — **por debajo
del 4.5:1 que exige AA**. O sea: el botón más importante de la tienda no llega al mínimo en ningún
tema.

**Lo que demuestra que es un descuido y no una decisión:** el sello hermano **⭐ MÁS VENDIDO** sí usa
el token de tinta (`--brand-ink`) y mide **9.27:1** en oscuro. El patrón correcto ya existe en la
casa; estas dos reglas se lo saltaron.

**Arreglo, con los números ya calculados:**

- Botón WhatsApp: crear `--wa-ink`. Claro: blanco sobre un verde un punto más hondo
  (`#0F7C70` → **5.08:1**, o `#0B6B5E` → 6.40:1; sigue leyéndose como WhatsApp).
  Oscuro: tinta oscura sobre el verde brillante (`#1C1A22` sobre `#25D366` → **8.68:1**).
- Sello OFERTA: crear `--oferta-ink`. Claro: blanco (5.61:1, ya pasa).
  Oscuro: `#2A0E20` sobre `#FF8AA6` → **7.98:1**.

Es media hora de trabajo y toca el botón por el que entra el dinero.

### 2.3 El gris más tenue no llega a AA en modo claro

`--text-3` (`#857D89`) mide **3.72:1** sobre el fondo, **3.42:1** sobre las zonas grises — y se usa
en **16 sitios**, varios de ellos a 11–12 px, donde AA pide 4.5:1. Entre ellos, dos que son dinero:
**el equivalente en USD del total del carrito** (`.total-usd`, `.lateral-total-usd`) y **la nota de
la tasa** del pie — justo la línea que ahora va a llevar el número.

Curiosamente en **modo oscuro el mismo token sí pasa** (4.60 – 5.66:1). Es un fallo solo del tema claro.

**Arreglo:** `#6F6773` (5.10 / 5.44 / 4.69:1) mantiene la jerarquía visual —sigue siendo claramente
el tercer nivel— y pasa AA en los tres fondos.

### 2.4 El problema de sistema: un solo rojo hace cuatro trabajos

`--oferta` se usa hoy para: el **sello OFERTA**, el **«Queda 1»** de escasez, los **errores de
formulario** (`.campo-error`, `input.invalido`) y el **hover de «Vaciar»/«Quitar»**.

Como vendedor esto me molesta más que los contrastes: **el color con el que le dices «mira qué
oportunidad» es el mismo con el que le dices «te equivocaste» y «vas a borrar»**. La clienta aprende
a asociar ese rojo con «problema» en el formulario, y esa asociación la arrastra a la parrilla.

**Arreglo:** separar `--error` (p. ej. `#B3261E`, 6.13:1) y dejar `--oferta` solo para vender.
Y mientras se esté ahí, plantear un **verde de confianza** (`#146B4F`, 6.47:1) para lo que es buena
noticia: «mensajería gratis», «ahorras 815 CUP», «Queda 1» quizá en ámbar. Hoy todo lo bueno y todo
lo malo salen del mismo bote de pintura.

### 2.5 Lo que **no** cambiaría

La portada, el ciruela, las sombras, la tipografía Outfit y los botones de la portada. Están medidos
y funcionan. Un rediseño de marca aquí sería gastar dinero en lo único que ya no es el problema.

---

## 3. Ganchos de venta nuevos (los del 22/10 no se repiten)

### 3.1 🔴 El umbral de 2,000 CUP es la palanca más grande que no se está usando

**Lo medido** sobre los 196 pedidos completados de los últimos 30 días:

- Mediana del pedido **web**: **2,000 CUP exactos** — el umbral.
- **85 de 196 (43 %)** quedaron **por debajo** del umbral y pagaron mensajería.
- Promedio 6,514 CUP: hay una cola larga de pedidos grandes que sostiene el negocio.

Que la mediana caiga **clavada** en el umbral no es casualidad: la clienta suma hasta llegar y para.
El umbral **es** el ticket medio. Tres movimientos, de menos a más atrevido:

1. **Escalonar la recompensa** en vez de apagarla: hoy, pasados los 2,000 CUP, la tienda deja de
   pedir. Un segundo peldaño («desde 3,500 CUP, además te regalamos el…» o un descuento pequeño)
   recoge a la clienta justo cuando ya decidió gastar.
2. **Llevar el aviso de «te faltan X» a la ficha**, no solo al carrito. Hoy la tira de «completa tu
   mensajería» (ya implementada) vive en el carrito, que es el final. En la ficha, debajo de
   «Añadir»: «Añádelo y te faltarán 1,100 CUP para la mensajería gratis».
3. **Probar subir el umbral** a 2,500 CUP en una temporada y mirar la mediana. Con 196 pedidos al
   mes hay volumen suficiente para notar el efecto en dos semanas. **Es decisión de Ruth** y tiene
   riesgo: si sube demasiado, los 85 pedidos pequeños se encogen en vez de crecer.

### 3.2 Prueba social real, que aquí sí existe y es gratis

La tienda no tiene **ni una** reseña, testimonio ni cifra social (comprobado: cero menciones de
«opinión», «reseña», «valoración» en los 46,245 caracteres de la página). Y resulta que el dato
más convincente ya está en Stock+: **196 pedidos entregados en los últimos 30 días**.

Publicar ese número junto a los otros chips de la portada —**«📦 196 pedidos entregados este mes»**—
es prueba social **verificable, no inventada**, y es exactamente el argumento que necesita quien
llega de Google a una tienda cubana sin pasarela de pago y se pregunta si esto es real.
Se publica como un número más en `tienda`, igual que `envioGratisCUP`.

🔴 **Con una condición:** que lo calcule Stock+ de los pedidos reales y se republique solo. Un
número escrito a mano que se quede congelado es peor que no ponerlo.

### 3.3 Nadie dice cuándo llega el pedido

**Comprobado:** en toda la página no aparece «24 h», «mismo día», «1–2 días» ni nada parecido. Se
explica muy bien **cómo** se entrega (coordinamos por WhatsApp, revisas delante de la mensajera) y
**cuánto** cuesta, pero no **cuándo**.

Es, con diferencia, la pregunta que más frena una compra por impulso. Aunque la respuesta real sea
«depende de la zona», decir **«normalmente entregamos en 24–48 h en San Antonio»** convierte una
incógnita en una promesa. Va en los tres pasos de confianza de la portada, que ya existen, y en el
recap del pedido. **Es un dato del negocio: lo tiene que decidir Ruth, no el código.**

### 3.4 El carrito que sobrevive y nadie saluda

El carrito ya persiste en `localStorage`, y desde el 19/10 la tienda pregunta «¿Ya enviaste tu
pedido?» al volver de WhatsApp. Falta el caso de **la que se fue y vuelve otro día** con cosas
dentro: hoy se encuentra el carrito igual, pero la tienda no le dice nada.

Una línea al cargar, si hay carrito y la última visita fue hace más de un rato:
**«Tienes 3 productos esperando — ¿terminamos tu pedido?»** con el botón de abrir el carrito. Es el
«carrito abandonado» del comercio electrónico, hecho sin servidores ni correos: todo está ya en el
navegador de la clienta.

### 3.5 Los relacionados enseñan solo USD

En la ficha del Abrigo, la tira «Más de esta categoría» muestra `$5`, `$7`, `$12` — **sin CUP**.
La clienta cubana piensa en CUP; obligarla a multiplicar por 845 de cabeza en la tira diseñada para
que compre **otra cosa más** es poner un peaje justo en el upsell. (Se relaciona con el B4 del
22/10, que sigue abierto, pero este caso concreto es peor: ahí no hay CUP **en absoluto**.)

---

## 4. Experiencia de uso — lo nuevo

### 4.1 La tasa visible **es** una mejora de experiencia, no solo un dato

Lo pongo aquí a propósito: en una tienda con precios en dos monedas, el número de conversión a la
vista **elimina una desconfianza silenciosa** — la clienta que ve `$5 · 4,225 CUP` y no sabe si le
están aplicando la tasa de hoy o una inventada. Ver el número declarado hace ese cálculo auditable.
Es el gancho de confianza más barato de toda esta lista.

### 4.2 El pie es un cementerio de cosas útiles

En el pie, a 42,800 px del principio, viven: el grupo de WhatsApp, «Quiero ser gestor», los dos
teléfonos de contacto, la fecha del catálogo y la nota de la tasa. Son **cinco** piezas de valor
—dos de ellas, el grupo y la tasa, pedidas explícitamente en esta sesión— enterradas donde no llega
nadie. (El 22/10 ya señalaba el grupo; lo repito solo para decir que **la solución es la misma para
las cinco** y conviene hacerla de una vez, no cinco veces.)

### 4.3 Nada en la página es fijo mientras se navega

Comprobado: con el carrito vacío **no hay ni un elemento `position:fixed`** aparte de la cabecera.
Está bien resuelto para el carrito (la barra fija aparece cuando hay algo dentro), pero significa
que en 42,800 px de recorrido no hay **ningún** atajo permanente para preguntar. En una tienda cuya
caja es una conversación de WhatsApp, un botón flotante de «💬 Escríbenos» es defendible.
**Matiz honesto:** el botón flotante tapa catálogo en móvil y se odia cuando está mal hecho; ahora
que la ficha ya tiene «💬 Preguntar por este producto» (implementado el 22/10), el agujero es
bastante menor. Lo dejo como **propuesta de segunda tanda**, no como fallo.

---

## 5. Del 22/10 sigue abierto (sin volver a argumentarlo)

Implementado desde entonces y **verificado hoy en el sitio vivo**: A1 (tira para completar la
mensajería) y A2/A6 (botón «Preguntar por este producto» en la ficha). Sigue abierto:

| | Qué | Por qué sigue importando |
|---|---|---|
| A3 | El sello OFERTA no dice cuánto se ahorra | 17 ofertas vivas con el mismo sello para un 5 % y para un 60 % |
| A4 | No hay sello NUEVO | `creado` viaja y solo sirve para ordenar |
| A5 | El grupo de WhatsApp solo está en el pie | ver §4.2 |
| B1 | 209 tarjetas de golpe, página de 42,819 px | medir antes en un teléfono real |
| B2 | El primer producto a ~2,000 px | subir «Los más vendidos» sobre las categorías |
| B3 | 23 categorías, varias con 1 producto | ordenar por tamaño |
| B4 | Dos formatos de precio en la misma parrilla | ver §3.5 |
| B5 | «Gana comisiones» a quien solo quiere comprar | **confirmado hoy en vivo**, sin `?ref=` |
| C | `subcat` vacío, 10 productos sin descripción, un nombre cortado | se arregla en Stock+, no aquí |

---

## 6. Orden que propongo

**Tanda 1 — la tinta (medio día, toca el botón de cobrar):**
§2.2 (`--wa-ink` y `--oferta-ink`), §2.3 (`--text-3` a `#6F6773`), §2.4 (`--error` aparte).
Riesgo mínimo, efecto inmediato, y arregla un botón de pagar que hoy no se lee en modo oscuro.

**Tanda 2 — la tasa a la vista (§1.3a):** portada, pie y carrito, con `tasa` y `generado` que ya
viajan. Cero cambios en Stock+. Redacción exacta: «calculados a», nunca «tasa del día».

**Tanda 3 — los dos ganchos con datos detrás:** §3.2 (196 pedidos como prueba social, publicando el
número desde Stock+) y §3.1.2 (el aviso de «te faltan X» también en la ficha).

**Tanda 4 — decisiones de Ruth, no de código:** §3.3 (¿qué plazo de entrega prometemos?),
§3.1.3 (¿subimos el umbral a 2,500?), §1.3b/c (¿conseguimos el token de elTOQUE y presumimos de tasa?).

**Tanda 5 — lo que ya estaba en la lista del 22/10:** A3, A4, B2, B3, B5 (todos baratos), y
B1 solo después de medirlo en un teléfono de verdad.

---

## 7. Lo que esta revisión NO verificó

- ⚠ **Ningún teléfono real.** Todo en Chrome de escritorio con viewport emulado a 375 px y
  `prefers-color-scheme` emulado. La legibilidad del botón verde en oscuro se midió en números,
  no en la pantalla de una clienta.
- ⚠ **No se envió ningún pedido** ni se pulsó «Pedir por WhatsApp».
- ⚠ **No se comprobó la tasa automática funcionando**: hoy no funciona (sin token, sin red en la
  última lectura). Todo lo de §1.3b/c está planteado sobre código leído, no sobre una lectura real
  de elTOQUE.
- ⚠ Las cifras de negocio (196 pedidos, mediana 2,000 CUP) salen de `data.json` **leído hoy**;
  cambian cada día, las conclusiones no.
- ⚠ **No se revisó** `taxi.html`, `electripower.html` ni el flujo de encargos.
- ⚠ **No se midió** el defecto conocido de la franja de ~35 px a la derecha de la foto de la ficha.
- ⚠ El contraste se calculó con la fórmula WCAG 2.1 sobre colores sólidos; donde hay transparencias
  o degradados (la portada) el número es el del tono sólido declarado.
