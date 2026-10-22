# Revisión UX + ganchos de venta — 3bqba.com (2026-10-22)

Revisión de solo lectura, como desarrollador de tiendas online. Sin tocar código.

## Cómo se miró

- Código leído: `index.html`, `app.js` (111 KB, por funciones), `espera.js`, `negocio.js`,
  `catalogo.json` (225 productos, publicado el 21/10).
- Sitio **vivo** (`https://www.3bqba.com`) en navegador a **375×812**, que es donde compra
  la clienta. Caché del service worker observada: `tienda-3b-v20`.
- Se midió con JavaScript en la página real, no a ojo: posiciones, alturas, conteos, peso.
- Se añadió un producto al carrito **solo en el `localStorage` del navegador de prueba** para
  ver el carrito lleno. No se pulsó «Pedir por WhatsApp» y se limpió después (`localStorage`
  vacío, comprobado).
- Leída la revisión anterior (`2026-10-12-revision-profesionalidad-tienda.md`) para no repetir
  lo ya hecho. En 10 días se cerraron B1, B2, B3, B4, C1, C2, C3 y D1, y A1/A3 también.
  Lo que sigue abierto de aquella lista se marca abajo como **[viene del 12/10]**.

---

## Lo primero: esta tienda está muy por encima de lo que esperaba

No es cortesía, es el contexto para leer el resto. Ya tiene galería con gesto, ficha
compartible con `og:` propias, productos relacionados, orden y filtro, PWA instalable,
direcciones guardadas, el «atrás» que cierra capas, aviso de «te faltan X para mensajería
gratis», «Queda 1», precios por gestor, encargos Shein/Temu y programa de comisiones.

Eso quiere decir que **lo barato ya está hecho**. Lo que queda son huecos concretos, no una
lista genérica de buenas prácticas. Cada punto de abajo trae el dato que lo justifica.

---

## A. Ganchos de venta que faltan

### A1 🔴 — «Te faltan 1,550 CUP» y no hay nada que tocar

**Lo medido.** Con un producto de 450 CUP en el carrito, la tienda dice exactamente:
`Te faltan 1,550 CUP para la mensajería gratis`. Y ahí se acaba. Debajo viene el desglose y
acto seguido el formulario de nombre/teléfono/dirección.

**Por qué importa.** Es el gancho con mejor relación esfuerzo/dinero que existe en comercio
electrónico, y aquí está a medias: se le dice a la clienta que le falta, pero se le deja a
ella la tarea de volver a la parrilla de 225 productos y calcular cuál cabe en 1,550 CUP.
El umbral es 2,000 CUP y la mensajería cuesta 150: a la clienta le sale a cuenta sumar, y al
negocio le sube el pedido medio. Hoy ese cálculo no lo hace nadie.

**Qué haría.** Debajo de esa línea, una tira horizontal de 3–4 productos **que quepan en lo
que falta** (precio ≤ falta, con mensajería gratis, preferiblemente de otra categoría que lo
que ya lleva), con su botón de añadir. Título honesto: «Añade algo de aquí y la mensajería te
sale gratis». Cuando ya alcanzó el umbral, la tira desaparece y queda el 🎉 de ahora.

**Ojo.** `totalCarritoElegible()` ya existe y ya descuenta los de «transporte aparte», así que
la cifra es fiable. La tira debe usar **la misma función**, no recalcular.

---

### A2 🔴 — Una tienda que vende por WhatsApp y no tiene un botón para preguntar

**Lo medido.** En la ficha del producto, los únicos botones son: `Añadir`, los relacionados,
y `📸 Compartir foto` / `WhatsApp` / `Facebook` / `🔗 Copiar enlace`. Se comprobó en la página
viva: el texto de la ficha **no contiene la palabra «preguntar»** por ningún lado. Los tres
botones de WhatsApp que hay sirven para que la clienta *reparta* el producto, no para que
*pregunte* por él.

**Por qué importa.** La clienta que duda («¿esta talla me sirve?», «¿tienen en negro?», «¿eso
llega a Güira?») hoy tiene tres salidas: añadirlo igual, irse, o bajar 45 mil píxeles hasta el
pie a buscar el teléfono. Se va. Y esta es una tienda **sin pasarela de pago**: la conversación
de WhatsApp *es* el checkout. Poner una barrera antes de esa conversación es cerrar la caja.

**Qué haría.** En la ficha, junto a «Añadir» pero claramente secundario (línea, no relleno):
**«Preguntar por este producto»**. Abre WhatsApp con el mensaje ya escrito, con el **código**
del producto, que ya existe (`codigo`, p. ej. `24PU`) y es justo lo que Mía y Ruth necesitan
para saber de qué se habla sin adivinar. Y debe respetar la misma regla que el pedido: si la
visita entró por el enlace de un gestor con recargo, va al WhatsApp **del gestor**; si no, al
de la casa. Esa decisión ya está resuelta en el código del pedido — hay que reusarla, no
reescribirla.

---

### A3 — El sello «OFERTA» vale lo mismo para un 5 % que para un 60 %

**Lo medido.** De los 225 productos, 22 están en oferta. Los descuentos reales:

| Descuento | Productos | Ejemplos |
|---|---|---|
| 5–9 % | 6 | Nebulizador (5 %), Timbre (6 %), Lima de pies (7 %) |
| 12–20 % | 8 | Cafetera (14 %), Chancletas (20 %) |
| 23–36 % | 7 | Sandalias (24 %), PopSockets (30 %), Audífonos (33 %) |
| 60 % | 1 | Peine de barbería |

Los 22 llevan **el mismo sello rojo «OFERTA»** y el mismo precio tachado.

**Por qué importa.** Dos daños a la vez. El Peine de barbería a mitad de precio se anuncia
igual que un nebulizador con un 5 % — el gancho bueno se desperdicia. Y al revés: tachar
`$20` para poner `$19` enseña a la clienta a desconfiar del tachado, que es el recurso más
fácil de quemar en una tienda.

**Qué haría.** Que el sello diga el número cuando el número vende: **`-60 %`** o
**«Ahorras 815 CUP»** a partir de un umbral (≈15 %), y para los de 5–9 % quitar el sello y
dejar solo el precio. El dato ya viaja en el catálogo (`precioNormalCUP` / `precioNormalUSD`):
es aritmética en la tarjeta, no un cambio en Stock+. Si Ruth prefiere no tocar cómo marca las
ofertas, el umbral se puede dejar configurable en `tienda`.

---

### A4 — `creado` solo sirve para ordenar: no hay sello «NUEVO»

**Lo medido.** Los 225 productos traen `creado`. **4** se crearon en los últimos 7 días y
**41** en los últimos 30. En el código, `grep` de `NUEVO|novedad|recién` sobre `app.js` →
**cero resultados**: el campo se usa únicamente para la opción «Lo más nuevo» del desplegable.

**Por qué importa.** La clienta que vuelve —y en una tienda de barrio con grupo de WhatsApp
vuelve mucho— necesita ver de un golpe qué no había la última vez. Hoy tiene que acordarse de
abrir el desplegable y elegir «Lo más nuevo». Casi nadie lo hace.

**Qué haría.** Sello **`NUEVO`** en la tarjeta para lo creado en los últimos N días (14 o 30;
con 30 salen 41 productos, que es bastante pero no medio catálogo). Es el mismo sitio donde ya
viven `OFERTA` y `⭐ MÁS VENDIDO`, así que el trabajo es decidir la prioridad cuando coinciden
—yo pondría OFERTA > NUEVO > MÁS VENDIDO— y no apilar tres sellos sobre la misma foto.

---

### A5 — El grupo de WhatsApp, que es el canal de recompra, está a 45,800 px del principio

**Lo medido.** `tienda.grupoWA` está configurado. En `app.js` se usa en **un solo sitio**: el
pie de página (`👥 Únete a nuestro grupo`). La página mide **45,884 px** de alto. El pie está
al final.

**Por qué importa.** En ese grupo Mía publica el goteo de productos con foto y precio todos
los días. Es el único canal propio del negocio para que una clienta vuelva sin pagar publicidad.
Está enterrado donde no llega nadie. Una visita que no deja ni un pedido ni una suscripción al
grupo es una visita perdida del todo.

**Qué haría.** Ofrecerlo donde la clienta ya está contenta o ya está decidiendo:
(a) en el aviso de «¿Ya enviaste tu pedido?» cuando responde **Sí** — acaba de comprar, es el
mejor momento del mundo; y (b) una franja discreta tras la primera pantalla de catálogo
(«Las ofertas nuevas las ponemos aquí primero 👉 únete al grupo»), descartable y que no
vuelva a salir. **No** un emergente al entrar: eso tapa el catálogo y en móvil se odia.

---

### A6 — 42 productos con una sola unidad y ninguna forma de decir «avísame»

**Lo medido.** 42 productos tienen `max: 1` y 65 tienen `max ≤ 2`. La tienda ya enseña
`Queda 1`, y desde el 20/10 también `🕒 Pedido — esperando confirmación` (`espera.js`) con el
botón de añadir desactivado.

**Por qué importa.** `espera.js` resuelve bien la mitad honesta del problema: no se vende lo
que no hay. Pero ahí la conversación se acaba. El propio texto del aviso dice *«Escríbenos y
te avisamos si se libera»* — y no hay nada que pulsar para escribir. Es exactamente el mismo
agujero que A2, en el momento de máxima intención de compra: alguien que quería **eso** justo
cuando se acabó.

**Qué haría.** Que ese aviso lleve el botón de preguntar de A2, con el mensaje ya escrito:
«Hola, me interesa el [NOMBRE] (código XXXX). ¿Me avisan si se libera?». Lo mismo para lo
agotado del todo, si algún día se decide enseñarlo. Es la lista de espera del pobre, y cuesta
lo mismo que el botón de A2 una vez hecho.

---

## B. Experiencia de uso

### B1 🔴 — 219 tarjetas de golpe y una página de 45,884 px

**Lo medido.** En la portada, la parrilla pinta **219 tarjetas** a la vez (6 más en el
carrusel de destacados). 3,498 nodos en el DOM y **278 `<img>`**, de los que 64 estaban
cargados: el `loading="lazy"` funciona y evita que se descarguen 278 fotos. Transferido en la
primera carga: 145 KB. `DOMContentLoaded`: 2.2 s **en un PC de escritorio con buena conexión**.

**Por qué importa.** Lo que la carga perezosa salva en *red* no lo salva en *memoria ni
pintado*: las 219 tarjetas existen igual en el DOM, con sus sellos, sus precios y sus botones.
En un Android barato eso se nota al desplazar, que es justo lo único que la clienta hace aquí.
Y el catálogo sigue creciendo: a 400 productos esto duele de verdad.

**Importante, para no gastar esfuerzo al revés:** el peso de red está bien y no es el problema.
El problema es el número de nodos vivos.

**Qué haría.** Pintar por tandas: ~40 tarjetas y cargar la siguiente con un
`IntersectionObserver` al llegar al final (con un botón «Ver más» de respaldo, que un
observador que falla deja el catálogo truncado sin avisar). **No** es paginación con números:
eso rompería el desplazamiento continuo, que aquí funciona bien. Hay que tocar `renderGrid()`
con cuidado: el buscador, el filtro, el chip y el orden pasan todos por ahí, y la tanda debe
reiniciarse en cada cambio.

**Antes de hacerlo, mídelo en un teléfono de verdad.** Esta cifra se tomó en un PC; si en el
móvil de Ruth el desplazamiento va fino, esto baja de prioridad y se queda para cuando el
catálogo crezca.

---

### B2 — El primer producto está a 1,980 px: dos pantallas y media

**Lo medido** (viewport 812 px):

| Sección | Posición |
|---|---|
| Portada (hero) | 211 px |
| Confianza (3 pasos + garantía) | 575 px |
| Categorías | 772 px |
| Servicios (taxi) | 1,055 px |
| **Los más vendidos** | **1,224 px** |
| Título «Catálogo» | 1,894 px |
| **Primer producto de la parrilla** | **1,980 px** |

**Por qué importa.** Antes del primer producto la clienta pasa por: franja de negocios,
cabecera, buscador, franja de mensajería, portada entera, tres pasos, garantía, 23 categorías
y el taxi. Todo eso está bien puesto y cada pieza tiene su razón — pero juntas son **2.4
pantallas de deslizar para ver mercancía** en una tienda a la que se entra a ver mercancía.

Lo salva a medias el carrusel de destacados a 1,224 px (1.5 pantallas). Por eso no lo pongo en
rojo.

**Qué haría.** Lo barato primero: subir **«Los más vendidos» por encima de las categorías**.
Son 6 productos curados; que sean lo primero que se ve después de la portada es lo más parecido
a un escaparate. Las categorías y el taxi quedan justo después. Cambio de orden en el HTML,
cero lógica.

Más discutible, y por eso lo dejo como pregunta y no como propuesta: la portada mide 346 px y
es casi toda logo + eslogan. Funciona para quien ya conoce 3B; para quien llega de Google es
una pantalla sin mercancía. Se podría acortar en móvil sin quitarla. **Es decisión del dueño**
—el eslogan es suyo— y la revisión del 12/10 ya tocó ese `h1`: no lo cambiaría sin que Ruth lo
pida.

---

### B3 — 23 categorías, y varias tienen un solo producto

**Lo medido.** La tira pinta **23 tarjetas** (21 categorías con productos + Ofertas). El
reparto real:

```
Reloj y Prendas 25 · Cabello 25 · Ropa 21 · Decoración 19 · Cuidado Personal 18
Hogar 18 · Bocinas y Accesorios 13 · Electrodomésticos 13 · Motos 12
Accesorio de vestir 12 · Ropa Interior 6 · Bolsos 6 · Calzado 6 · Niños 6
Mascotas 5 · Muebles 5 · Playa 4 · Ferretería 4 · Gym 3 · Uñas 2
Confituras 1 · Porcelana 1
```

**Por qué importa.** «Confituras» y «Porcelana» con un producto, «Uñas» con dos. Cada una ocupa
el mismo espacio visual que «Cabello» con 25. Quien pulsa una de esas aterriza en una pantalla
casi vacía, que es la peor primera impresión que puede dar un catálogo de 225 productos.

**Qué haría.** Ordenar la tira **por número de productos** (hoy no lo está: Ofertas, Electro­
domésticos, Ropa, Hogar…) para que lo gordo se vea primero, y plegar las de menos de 3 dentro
de «Ver todas». Sin esconder nada: siguen siendo alcanzables por el buscador y por «Ver todas».
Alternativa sin código: en Stock+, mover esos sueltos a una categoría mayor.

---

### B4 — Dos formatos de precio en la misma parrilla **[viene del 12/10, sigue abierto]**

**Lo medido.** `moneda` en el catálogo: **149 productos `usd`** y **76 `cup`**. En la parrilla
eso se ve como `$19 · 15,580 CUP` al lado de `2,500 CUP · $3.18`, cambiando de tarjeta a
tarjeta.

Por dentro es correcto y deliberado (`saleUSD` es la fuente de verdad para los `usd`); por
fuera se lee como desorden. Sigue igual que hace diez días, así que lo repito una vez y no
insisto más: **elegir una moneda principal para toda la tienda** y mostrar siempre la otra
detrás, en el mismo orden. Es `precioHtml()`, una función.

---

### B5 — «Comparte para ganar comisiones» se le enseña a todo el que abre una ficha **[viene del 12/10, sigue abierto]**

**Lo comprobado** en la página viva, entrando **sin** `?ref=`: la ficha del Nebulizador muestra
«Comparte los productos para que ganes comisiones» con sus cuatro botones, debajo de «Añadir».

Lo mismo que señalaba la revisión anterior: a la clienta que solo quiere comprar se le ofrece
un trabajo en mitad de la decisión. Con 25 gestores en el catálogo el programa está vivo y
merece sitio, pero el sitio es **después** de comprar (en el aviso de «¿ya enviaste tu pedido?»,
junto a lo del grupo de A5) o para quien ya entró con `?ref=`.

Matiz honesto: los botones de compartir **también** sirven para mandarle el producto a una
amiga, que es ventas puras. Yo no quitaría los botones — quitaría **el titular de comisiones**
para quien no es gestor, y dejaría «Comparte este producto» a secas.

---

## C. Datos del catálogo (se arregla en Stock+, no en la tienda)

- **`subcat` está vacío en los 225 productos.** Es dato muerto: `relacionados.js` dice
  «misma subcategoría primero» y esa rama **nunca se ejecuta**, así que siempre cae a la
  categoría entera — por eso en «Más de esta categoría» del Nebulizador salen un ventilador y
  un humidificador. Con subcategorías reales, los relacionados pasarían de «cosas del mismo
  cajón» a «cosas parecidas», y se podría filtrar fino dentro de Cabello (25) o Reloj (25).
  Es trabajo de catálogo, no de código, y es la mejora de datos con más efecto de esta lista.
- **10 productos sin descripción:** Adaptador (TipoC), Aplicadores, Dos pares de medias,
  Labiales Carmelitas, Medias Negras, Pellizcos Mate Grandes, Pellizcos medianos 🖤, Pellizcos
  medianos 🤍, Soporte de sel con brazo flexible, Teflón. En la ficha quedan con un hueco
  donde debería ir el argumento de compra. (215 de 225 sí la tienen: el catálogo está bien
  cuidado, son estos diez.)
- **Un nombre cortado:** «Abrigo de Chihuahua de rayas rosas **ra**». Y «Soporte de **sel**»
  parece «selfie» a medias.

---

## D. No hay forma de saber si algo de esto funciona

Comprobado en la página viva: **cero analítica**. Ni Google Analytics, ni Plausible, ni píxel
de Facebook, ni scripts externos de ningún tipo (`document.scripts` externos → lista vacía).

No lo digo como defecto: es coherente con una tienda sin backend, rápida y sin cookies, y
evita el consentimiento. Pero significa que ninguna de las propuestas de arriba se puede
evaluar — si el pedido medio sube, nadie se entera.

Lo mínimo que haría, sin traicionar esa decisión: que el mensaje de WhatsApp del pedido lleve
una marca invisible de por dónde vino (ya se hace con `?ref=` para gestores; falta para
«entró por categoría / por búsqueda / por la tira de mensajería gratis»). Lo lee Ruth en el
propio mensaje, sin servidores ni terceros. Si algún día se quiere de verdad, Plausible o
Umami autoalojado son compatibles con la CSP; es decisión del dueño, no una recomendación.

---

## Orden que propongo

**Tanda 1 — los dos ganchos que faltan (impacto alto, riesgo bajo):**
A2 (botón «Preguntar por este producto», que arrastra A6) y A1 (tira «completa tu mensajería
gratis»). Son los dos huecos donde hoy se pierde dinero con la clienta ya convencida.

**Tanda 2 — sellos y colocación (casi todo aritmética y HTML):**
A3 (ahorro real en las ofertas), A4 (sello NUEVO), B2 (subir «Los más vendidos»),
B3 (ordenar categorías por tamaño), B5 (sacar el titular de comisiones de la ficha).

**Tanda 3 — catálogo, en Stock+ y sin programar:**
subcategorías reales, las 10 descripciones que faltan, el nombre cortado, y decidir B4
(una moneda principal).

**Tanda 4 — plan propio:**
A5 (el grupo de WhatsApp donde sí se ve) y B1 (parrilla por tandas, **después de medirlo en un
teléfono real**).

---

## Lo que esta revisión NO verificó

- ⚠ **Ningún teléfono real.** Todo en Chrome de escritorio con viewport emulado a 375 px.
  Los 2.2 s de carga y la soltura del desplazamiento con 219 tarjetas **no** son la experiencia
  de un Android barato en Cuba: ahí pueden ser bastante peores.
- ⚠ **No se envió ningún pedido.** No se pulsó «Pedir por WhatsApp» en ningún momento, así que
  el recorrido final (WhatsApp → volver → aviso) no se ejecutó en esta sesión.
- ⚠ **No se midió contraste ni accesibilidad con herramienta.** Lo visual es a ojo.
- ⚠ **No se revisó** `taxi.html`, `electripower.html` ni el flujo de encargos: la pregunta era
  por la tienda.
- ⚠ **No se comprobó el defecto conocido** de la franja de ~35 px a la derecha de la foto de la
  ficha; en la captura a 375 px parece seguir ahí, pero no se midió.
- Las cifras del catálogo salen de `catalogo.json` del **21/10**. Si Ruth publica de nuevo,
  los conteos cambian (no las conclusiones).
