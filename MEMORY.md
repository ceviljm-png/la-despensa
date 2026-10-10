# MEMORY.md — La Despensa

Memoria del proyecto: qué se ha decidido, por qué, en qué estado está y qué queda pendiente.
Las instrucciones de trabajo están en [AGENTS.md](AGENTS.md). Este archivo se actualiza al cerrar cada cambio relevante.

## Resumen

| | |
|---|---|
| Qué es | Juego de estrategia por turnos sobre una isla de 19 parcelas, con temática gastronómica |
| Plataformas | Android y macOS, como app web instalable (PWA) |
| Jugadores | De 2 a 4; cada uno es una persona (pasando el dispositivo o en red, cada una con su móvil) o la máquina |
| Dónde se juega | https://ceviljm-png.github.io/la-despensa/ |
| Código | https://github.com/ceviljm-png/la-despensa (público, rama `main`) |
| Versión | 1.2.0 |
| Creado | 30 de septiembre de 2026 |

## Estado SDD

Los agentes del kit SDD actualizan esta sección al terminar cada fase.

- Adopción (`/sdd-adopt`, 10 de octubre de 2026): fases A, B y C aprobadas (10 specs de lo que ya existe, todas «implementada»);
  fase D aprobada: la red de seguridad son tests de caracterización por spec, pendientes de `/sdd-plan`. Adopción terminada.
- Constitución: aprobada (`docs/constitution.md`, 6 principios)
- Spec activa: ninguna (siguiente `/sdd-change`: 005)

| Spec | Estado | Tareas | Notas |
|------|--------|--------|-------|
| 000-turno-y-citrico | implementada (aprobada) | 7/7 | Red de seguridad hecha: `test/turno.test.js` (28 tests). Ingeniería inversa; pendiente `/sdd-change`: aviso de banca corta y aviso de robo al recibir el dispositivo |
| 001-construccion-y-puntos | implementada (aprobada) | 8/8 | Red de seguridad hecha: `test/construccion.test.js` (29 tests). Ingeniería inversa; pendiente `/sdd-change`: el historial dice a quién se quita la Gran Ruta |
| 002-comercio | implementada (aprobada) | 5/5 | Red de seguridad hecha: `test/comercio.test.js` (11 tests); RF-9 y RNF-2 a mano. Ingeniería inversa; pendiente `/sdd-change`: el texto de rechazo debe cambiar aunque se repita la oferta |
| 003-maquina-ofertas | implementada (aprobada) | 4/4 | Red de seguridad hecha: `test/maquina-ofertas.test.js` (22 tests, todo automático). Ingeniería inversa; sin dudas |
| 004-maquina-turno | implementada (aprobada) | 6/6 | Red de seguridad hecha: `test/maquina-turno.test.js` (28 tests); pausas medidas a mano. Ingeniería inversa; sin dudas |
| 005-red-salas | implementada (aprobada) | 4/4 | Red de seguridad hecha: `test/red-salas.test.js` (19 tests, con PeerJS de mentira en `test/fake-peer.js`); a mano solo lo que no necesita dos dispositivos — lo demás pendiente de probar con móviles. Ingeniería inversa; pendiente `/sdd-change`: relevo del anfitrión en la sala de espera y nombres únicos |
| 006-red-partida | implementada | 5/5 | Cambio de seguridad hecho (10 oct 2026): `js/check.js` comprueba órdenes (RF-4) y estado (RF-11); `test/red-partida.test.js` (13 tests) |
| 007-partida-local | implementada | 7/7 | Red de seguridad: `test/partida-local.test.js` (guardado, service worker y reglas del inicio). Cambio hecho (10 oct 2026): al menos una persona (RF-11) y confirmar antes de borrar la partida guardada (RF-12) |
| 008-cartas-de-cocina | implementada (aprobada) | 5/5 | Red de seguridad hecha: `test/cartas.test.js` (21 tests). Ingeniería inversa; sin dudas |
| 009-tablero-y-preparacion | implementada (aprobada) | 8/8 | Ingeniería inversa; sin dudas. Red de seguridad hecha: `test/tablero.test.js` (33 tests) |

**Red de seguridad (terminada el 10 de octubre de 2026).** 216 tests en `npm test` (200 de la red de seguridad y 16 de los cambios) (más la simulación), uno o varios
archivos por spec en `test/`, con utilidades en `test/helpers.js` y un PeerJS de mentira en `test/fake-peer.js`. Cada spec
tiene en su `tasks.md` el resultado de la comprobación a mano. La 006 se cubrió dentro de su `/sdd-change`, al sacar la
validación de `ui.js` a `js/check.js`. Pendiente sin poder probar en este equipo: la conexión
real entre dos dispositivos (spec 005) y la instalación en Android y Mac (spec 007).

**Siguiente paso.** Los cambios pendientes con `/sdd-change`, en este orden (006 y 007 ya están hechas): 005 (relevo del anfitrión en la sala de
espera; nombres únicos), 002 (texto de rechazo distinto aunque se repita la oferta), 000 (aviso de banca corta; aviso de
robo al recibir el dispositivo) y 001 (el historial dice a quién se quita la Gran Ruta).
A partir de aquí, todo cambio va por `/sdd-change` (sobre una spec existente) o por una spec nueva.

## Áreas funcionales

| Área | Dónde está | Pruebas |
|---|---|---|
| Tablero y preparación (reparto, puertos, colocación inicial) | `engine.js` | Simulación |
| Turno, producción, 7, descarte, Cítrico y robo | `engine.js` | Simulación |
| Construcción, puntos, Gran Ruta, Gran Brigada y victoria | `engine.js` | Simulación |
| Cartas de cocina | `engine.js` | Simulación |
| Comercio con la banca, puertos y entre jugadores | `engine.js`, diálogo en `ui.js` | Simulación (solo el motor) |
| Máquina: jugar el turno y valorar ofertas por nivel | `ai.js` | Simulación (sin casos concretos por nivel) |
| Partida en un dispositivo: menú, pasar el dispositivo, diálogos, guardado | `ui.js`, `index.html`, `style.css` | A mano |
| Partidas en red | `net.js`, final de `ui.js` | A mano |
| PWA y uso sin conexión | `sw.js`, `manifest.webmanifest` | A mano |

## Decisiones que se deducen del código

| Decisión | Dónde |
|---|---|
| El motor nunca lanza excepciones por una jugada inválida: devuelve `false` | `engine.js`, todas las acciones |
| Todo el estado de la partida es JSON plano en `g.s`; se guarda, se envía por la red y se recupera tal cual | `engine.js`, `ui.js` |
| Cada orden se valida dos veces: `apply()` (asiento y jugada con sus números, `check.js`) y después el motor | `ui.js`, `check.js` |
| El invitado ignora entero un estado con datos fuera de lo permitido y sigue con la copia anterior, sin avisar (decisión del propietario, 10 oct 2026) | `check.js`, `ui.js` |
| Los números 6 y 8 nunca quedan en parcelas vecinas (se reparte de nuevo hasta que se cumple) | `engine.js` `numbersOk` |
| Banca de 19 cartas por recurso; si no alcanza para todos, nadie recibe ese recurso (si es uno solo, recibe lo que quede) | `engine.js` `distribute` |
| La victoria se comprueba solo para quien tiene el turno, también al empezarlo (cubre puntos ganados en turno ajeno) | `engine.js` `checkWin`, `endTurn` |
| Las máquinas solo proponen cambios 1 por 1 y como mucho una vez por turno | `ai.js` |
| En Fácil la máquina suma mucho azar (`noise` = 4 frente a 0,3) a sus valoraciones | `ai.js` |
| El historial de la partida guarda las 150 últimas entradas y muestra 40 | `engine.js`, `ui.js` |
| En red, el anfitrión espera la respuesta de un invitado 90 s; el invitado espera la de una propuesta 120 s | `ui.js` |
| Un invitado se considera caído tras 15 s sin mensajes (latido cada 4 s) | `net.js` |
| En el inicio tiene que jugar al menos una persona; la simulación sigue usando partidas solo de máquinas (no pasa por el inicio) | `check.js` `hasPerson`, `ui.js` |
| Empezar una partida nueva con otra guardada sin terminar pide confirmación, en el inicio y en la sala de espera (no al crear la sala) | `check.js` `savedGame`, `ui.js` |

## Deuda técnica

- `ui.js` (unas 1.400 líneas) y `net.js` no tienen pruebas automáticas.
- La simulación usa `Math.random` sin semilla: si falla, no se puede reproducir.
- Ninguna regla concreta tiene un test propio (Gran Ruta, descarte, puertos, cartas recién compradas, `AI.judge` por nivel).
- Si el anfitrión sale de la sala de espera, los invitados reintentan para siempre; el propietario quiere que pase a ser anfitrión el invitado que más tiempo lleve en la sala (spec 005, pendiente de `/sdd-change`).
- En una sala dos personas pueden llevar el mismo nombre; el propietario no lo quiere (spec 005, pendiente de `/sdd-change`).
- Cuando la banca no alcanza y solo cobra un jugador, recibe menos sin aviso; se anotará en el historial (spec 000, pendiente de `/sdd-change`).
- Con varias personas en un dispositivo, la víctima de un robo no se entera de qué le robaron; se le avisará al recibir el dispositivo (spec 000, pendiente de `/sdd-change`).
- Al pasar la Gran Ruta de un jugador a otro, el historial no dice a quién se le quita (spec 001, pendiente de `/sdd-change`).
- El texto de ayuda de la banca dice siempre «Sin puerto, la banca cambia 4 cartas iguales por 1.», aunque se tengan puertos (visto en la spec 002; no es un requisito).
- Al repetir exactamente la misma oferta, el texto de rechazo no cambia; el propietario quiere que cambie (spec 002, pendiente de `/sdd-change`).
- `.agents/skills/sdd` y `.claude/skills/sdd` son copias idénticas.

## Decisiones tomadas

| Decisión | Motivo |
|---|---|
| App web instalable en lugar de apps nativas | Un solo juego para Android y Mac, sin tiendas ni compilación |
| Contra la máquina y pasando el dispositivo; sin juego en línea | Decisión inicial; cambiada en la 1.2.0 |
| Partidas en red con conexión directa (WebRTC con PeerJS), sin cuentas | El propietario pidió jugar en varios dispositivos a la vez; se eligió lo gratis y sin configurar frente a un servidor (Firebase) |
| En red, una persona por dispositivo y máquinas para rellenar huecos | Elección del propietario; las máquinas las lleva quien crea la sala |
| Tres tipos de partida a elegir al empezar | El propietario quiso ofrecer las tres variantes en vez de escoger una |
| Temática gastronómica, con nombre y arte propios | Identidad propia; no se usan nombres ni ilustraciones de juegos comerciales |
| La ficha que bloquea se llama «Cítrico Gastronómico» | Nombre elegido por el propietario; la grafía «Cítrico» es intencionada |
| El Cítrico es una cara rechoncha con pelo y barba negros y gafas | Diseño pedido por el propietario |
| Tres niveles de dificultad | «Difícil» es el comportamiento original de los cambios, «Normal» el corregido; «Fácil» se añadió para completar la escala |
| El texto de rechazo cambia con cada oferta | Si el aviso no cambia, parece que el juego se ha quedado bloqueado |
| JavaScript sin dependencias ni compilación | Sencillez: se puede abrir `index.html` directamente y publicar subiendo la carpeta |
| Publicación en GitHub Pages | Da la dirección `https://` que Android necesita para instalar la app |

## Vocabulario del juego

| En el juego | Qué es |
|---|---|
| Olivar → aceite | Parcela y su recurso (4 parcelas) |
| Salinas → sal | Parcela y su recurso (3 parcelas) |
| Estero → pescado | Parcela y su recurso (4 parcelas) |
| Trigal → trigo | Parcela y su recurso (4 parcelas) |
| Viñedo → vino | Parcela y su recurso (3 parcelas) |
| Erial | Parcela que no produce; allí empieza el Cítrico Gastronómico |
| Huerta | Construcción básica: 1 punto, produce 1 carta |
| Bodega | Ampliación de una huerta: 2 puntos, produce 2 cartas |
| Camino | Une cruces y permite llegar a sitios nuevos |
| Cítrico Gastronómico | Ficha que se mueve con un 7 o con un Chef: bloquea la parcela y permite robar una carta |
| Cartas de cocina | Chef, Estrella (1 punto secreto), Obras (2 caminos), Buena cosecha (2 recursos), Exclusiva (monopolio de un recurso) |
| Gran Ruta | 2 puntos para la ruta más larga, mínimo 5 caminos |
| Gran Brigada | 2 puntos para quien más chefs haya jugado, mínimo 3 |

### Costes

| Construcción | Coste |
|---|---|
| Camino | 1 aceite, 1 sal |
| Huerta | 1 aceite, 1 sal, 1 pescado, 1 trigo |
| Bodega | 2 trigo, 3 vino |
| Carta de cocina | 1 pescado, 1 trigo, 1 vino |

## Tipos de partida

| | Sencilla | Clásica | Completa |
|---|---|---|---|
| Puntos para ganar | 8 | 10 | 10 |
| Puertos (cambios 3:1 y 2:1) | – | sí | sí |
| Cartas de cocina y Gran Brigada | – | sí | sí |
| Cambios entre jugadores | – | – | sí |

## Niveles de dificultad

| Nivel | Cómo responde la máquina a una oferta de cambio | Cómo juega |
|---|---|---|
| Fácil | Acepta si no recibe menos cartas de las que entrega | Peor: elige con mucho azar |
| Normal | Acepta lo mismo que en Difícil y, además, lo que le compense: cuanto más se ofrece, más fácil | Normal |
| Difícil | Reglas fijas: no se queda sin un recurso ni acepta lo que ya tiene de sobra (3 o más) | Normal |

En Normal y Difícil la máquina tampoco cambia con quien está a 2 puntos o menos de ganar.
La dificultad solo afecta a los cambios en la partida Completa; en Sencilla y Clásica, Normal y Difícil juegan igual.

## Estado actual

- **Funciona y está comprobado**: las reglas de los tres tipos de partida en los tres niveles, con simulaciones
  máquina contra máquina de 2 a 4 jugadores; y a mano en navegador de escritorio y en tamaño móvil
  (colocación inicial, dados, descartes y robo con el 7, construcción, comercio con la banca y con rivales,
  cartas de cocina, paso de dispositivo, fin de partida, guardado y continuación).
- **Sin comprobar**: instalación en un teléfono Android real y como app en el Mac.
- **Partidas en red** (1.2.0): comprobadas con tres navegadores a la vez con un transporte simulado: sala, partida
  entera, descartes simultáneos, robos, cambios propuestos por invitados y por máquinas, recarga de invitado y de anfitrión.
  La conexión WebRTC real no se ha podido probar en el equipo de desarrollo (una VPN la bloquea): falta probarla con móviles.
- **No hay**: sonido, tutorial guiado, estadísticas ni traducciones.

## Limitaciones conocidas

- El navegador integrado de Claude no admite service workers: el uso sin conexión se comprueba en Chrome (MCP de Chrome DevTools).

- En Sencilla y Clásica, los niveles Normal y Difícil son idénticos (no hay cambios entre jugadores).
- La máquina solo propone cambios de 1 carta por 1, como mucho una vez por turno.
- Solo Chef puede jugarse antes de tirar los dados; el resto de cartas de cocina, después.
- El estado guardado no tiene migraciones: una partida guardada con una versión muy antigua podría no continuar.
- En red no hay servidor TURN: en redes muy cerradas (algunas de datos móviles) la conexión directa puede fallar.
- En red, si quien creó la sala cierra la app, la partida se para hasta que vuelva.

## Ideas pendientes

- Que Difícil también juegue mejor (no solo cambie peor), para que el nivel se note en Sencilla y Clásica.
- Recordar en el menú el último tipo de partida y nivel elegidos.
- Sonidos y una animación de dados más vistosa.
- Un tutorial de primera partida.

## Historial

### 1.2.0 — 1 de octubre de 2026
- Partidas en red: crear sala con código de 4 letras, unirse con el código o con un enlace, cada uno ve solo su mano.
- Reconexión automática, reabrir la sala tras cerrar la app y que la máquina juegue por quien se ha ido.
- Corregido: sin conexión, el service worker podía devolver la página en lugar de un script que faltaba.
- Corregido: en el móvil, un título largo podía ensanchar la pantalla.

### 1.1.0 — 30 de septiembre de 2026
- Niveles de dificultad Fácil, Normal y Difícil, a elegir al empezar.
- Las máquinas valoran las ofertas según lo generosas que son (nivel Normal).
- Cada rechazo nombra la oferta hecha y el motivo de cada rival.
- Corregido: en Fácil la máquina podía intentar descartar un recurso que no tenía.
- Documentación del proyecto: `AGENTS.md`, `MEMORY.md` y `package.json`.

### 1.0.1 — 30 de septiembre de 2026
- La ficha que bloquea pasa a llamarse Cítrico Gastronómico y se redibuja como una cara con barba y gafas.
- Publicación en GitHub Pages.

### 1.0.0 — 30 de septiembre de 2026
- Primera versión: tablero, tres tipos de partida, rivales automáticos, modo de pasar el dispositivo,
  guardado automático e instalación como PWA.
