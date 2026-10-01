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
