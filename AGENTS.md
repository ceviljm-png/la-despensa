# AGENTS.md — La Despensa

Guía para agentes de código (y personas) que trabajen en este repositorio. Léela antes de tocar nada.
El contexto de producto, las decisiones ya tomadas y el historial están en [MEMORY.md](MEMORY.md).

## Qué es

Juego de estrategia por turnos al estilo de los juegos de colonizar una isla, con temática gastronómica.
Es una app web instalable (PWA) que funciona igual en Android y en macOS. No tiene servidor ni cuentas:
todo ocurre en el navegador y la partida se guarda en `localStorage`.

- Publicado en: https://ceviljm-png.github.io/la-despensa/
- Repositorio: https://github.com/ceviljm-png/la-despensa (rama `main`, servida con GitHub Pages)

## Comandos

| Para | Comando |
|---|---|
| Comprobar las reglas (partidas máquina contra máquina) | `npm test` — equivale a `node test/sim.js [partidas]` |
| Servir el juego en local, puerto 8130 | `npm start` — equivale a `python3 serve.py [puerto]` |

No hay dependencias, ni paso de compilación, ni empaquetador. Hace falta Node solo para las pruebas
y Python 3 solo para el servidor local.

## Estructura

```
index.html              Página única: iconos SVG (<symbol>), menú de inicio y esqueleto de la partida
css/style.css           Todos los estilos, incluido el tablero SVG y los diálogos
js/engine.js            Reglas y estado de la partida. Sin DOM: también corre en Node
js/ai.js                Decisiones de los rivales que lleva la máquina. Sin DOM
js/ui.js                Interfaz: dibujo, entrada, diálogos, bucle de turnos y guardado
sw.js                   Service worker: red primero, copia guardada si no hay red
manifest.webmanifest    Datos de instalación de la PWA
icons/                  Icono de la app (SVG de origen y PNG de 192 y 512 px)
test/sim.js             Simulación de partidas completas con comprobación de invariantes
serve.py                Servidor estático para desarrollo
```

Los tres scripts son clásicos (no módulos ES) y se cargan en este orden: `engine.js`, `ai.js`, `ui.js`.
Es deliberado: así el juego también funciona abriendo `index.html` con doble clic (`file://`).
`engine.js` expone `window.Despensa` y `ai.js` expone `window.DespensaAI`; en Node se exportan con `module.exports`.

## Arquitectura

### Motor (`js/engine.js`)

- `GEO`: geometría fija del tablero, calculada una vez — 19 parcelas, 54 cruces, 72 lados y los 9 lados de puerto.
- `Game`: envuelve el estado `g.s`, que es JSON plano (se guarda y se recupera tal cual).
  `Game.create({ mode, level, players })` crea una partida; `new Game(estado)` la reanuda.
- Cada acción es un método que valida, modifica `g.s` y devuelve `true`/`false`. Nunca lanza excepciones por una jugada inválida.
- Fases (`g.s.phase`): `setup` → `roll` → `main`, con desvíos a `discard`, `critic`, `steal` y `roadBuilding`, y final en `over`.
- Tablas de configuración: `MODES` (tipo de partida), `LEVELS` (dificultad), `COSTS`, `DEV_INFO`.

### Máquina (`js/ai.js`)

- `AI.step(g)` ejecuta **una** acción del jugador automático al que le toque y devuelve `true`;
  devuelve `false` si hay que esperar a una persona, o `{ offer }` si propone un cambio que debe resolver quien dirige la partida.
- `AI.judge(g, q, offer)` valora una oferta de cambio y devuelve `{ ok, why, res }`. El criterio depende de `g.s.level`:
  - `facil`: acepta si no recibe menos cartas de las que entrega.
  - `normal`: acepta lo que aceptaría en difícil y, además, lo que le compense por valor (cuanto más generosa la oferta, más fácil).
  - `dificil`: reglas fijas — no se queda sin un recurso ni acepta lo que ya tiene de sobra.
- En `facil`, además, se suma más azar a todas sus valoraciones (`noise`), así que juega peor.

### Interfaz (`js/ui.js`)

- `pump()` es el bucle de la partida: dibuja, guarda y va llamando a `AI.step` hasta que le toca a una persona.
  Toda acción de una persona termina en `afterAction()`, que vuelve a llamar a `pump()`.
- El tablero se redibuja entero como una cadena SVG en cada `render()`. Los clics se resuelven por delegación con `data-v`, `data-e` y `data-h`.
- `viewer` es el jugador cuya mano se muestra. Con varias personas se pone a `-1` mientras se pasa el dispositivo.

## Normas

- **Idioma**: textos de la interfaz, comentarios y mensajes de commit en español.
- **Nombres propios del juego**: no usar nombres ni arte de juegos comerciales. El vocabulario está en `MEMORY.md`;
  la ficha que bloquea parcelas se llama «Cítrico Gastronómico» (así, con «Cítrico»: es intencionado).
  Los identificadores internos (`critic`, `i-critico`) no se renombran.
- **Proyecto independiente**: el juego no se relaciona con ningún negocio ni con otros proyectos del propietario.
  No añadir nombres de empresas, personas, marcas, correos ni enlaces ajenos al juego, ni en el código ni en la documentación ni en los commits.
- **Sin dependencias ni compilación**. No añadir frameworks, empaquetadores ni librerías.
- **El motor y la máquina no tocan el DOM.** Toda regla nueva va en `engine.js` y debe poder simularse en Node.
- **Seguridad**: todo texto que venga del usuario (nombres de jugador) pasa por `esc()` antes de entrar en `innerHTML`.
- **Almacenamiento**: `localStorage` siempre dentro de `try/catch`; el juego debe funcionar aunque falle.
- **Estado guardado**: si cambia la forma de `g.s`, mantener la compatibilidad con partidas guardadas
  (valor por defecto para lo nuevo) o subir `version` y descartar las antiguas en `showMenu()`.
- **Cada rechazo de una oferta debe producir un texto distinto** que nombre la oferta y el motivo de cada rival,
  para que nunca parezca que el juego no ha hecho nada.
- **Móvil primero**: comprobar cualquier cambio visual a 375 px de ancho y en escritorio.

## Antes de dar algo por terminado

1. `npm test` termina en `OK` (recorre los tres niveles, los tres tipos de partida y de 2 a 4 jugadores).
2. Probado a mano en el navegador el flujo afectado, sin errores en la consola.
3. Si cambian archivos que la app necesita sin conexión, están en la lista `FILES` de `sw.js`.

## Publicación

GitHub Pages sirve la raíz de `main`: un `git push` actualiza la web en un minuto aproximadamente.
Publicar es una acción visible para cualquiera: **no hacer commit ni push sin que el propietario lo pida**.
`index.html`, `sw.js` y `manifest.webmanifest` deben seguir en la raíz; las rutas son relativas porque la app vive en `/la-despensa/`.
