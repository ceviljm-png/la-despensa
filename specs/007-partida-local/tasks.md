# Tareas 007 — Tests de caracterización de la partida en un dispositivo

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/` ni `sw.js`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado (cada cambio por
separado sobre el archivo original), restaurarlo y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Guardar y recuperar el estado.** RF-7
  - Crear `test/partida-local.test.js` con: una partida a mitad, pasada a texto y recuperada, es igual y sigue jugando
    igual 200 pasos con el mismo azar; una partida nueva lleva `version: 1`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 191 tests anteriores siguen en verde.

- [x] **T2. El service worker.** RF-10
  - Añadir `cargarSW` y los tests: `FILES` existe y cubre los scripts de `index.html`; instalar guarda todo y se activa
    sin esperar; activar borra cachés viejas; con red, red y copia (no de un 404); sin red, copia (sin la parte `?…`);
    sin copia, página → `index.html` y otro archivo → error; no toca peticiones no GET ni de otro origen.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T3. Inicio, partida y varias personas en el navegador.** RF-1 a RF-6, RNF-3, RNF-4
  - Bloques 1, 2, 3 y 8 de la comprobación a mano del plan, a 375 px y en escritorio. Anotar el resultado aquí.
  - Hecho cuando: el resultado está anotado aquí y no hay errores nuevos en la consola.

- [x] **T4. Guardado, menú, final, sin conexión y cierre.** RF-7 a RF-10, RNF-1, RNF-2
  - Bloques 4, 5, 6 y 7 de la comprobación a mano del plan (el 7 en Chrome real). Anotar el resultado aquí y actualizar
    `MEMORY.md` con el cierre de la red de seguridad.
  - Hecho cuando: el resultado está anotado aquí, `MEMORY.md` está al día y `npm test` termina en `OK`.

## Comprobación a mano (T3) — 10 de octubre de 2026

Navegador integrado, 375 px salvo lo indicado:
- **Inicio (RF-1, casos límite):** Clásica y Normal marcadas; la descripción del nivel cambia al elegir Difícil («Rivales
  tacaños…»); plazas Persona, Máquina, Máquina, No juega; solo la 3.ª y 4.ª ofrecen «No juega»; la 4.ª, en «No juega»,
  tiene el nombre desactivado; marcadores «Jugador 1», «Paco», «Lola», «Jugador 4». **Correcto.**
- **Empezar (RF-2, RF-4, RF-5, RNF-3):** con el nombre `<b>Ana</b>`, la ficha muestra el texto tal cual, sin negrita
  (se escapa); cabecera «Clásica · a 10 puntos · Difícil»; fichas de Paco y Lola; la de quien juega, marcada; la línea
  de estado dice «Planta tu primera huerta en un cruce»; el detalle de Paco muestra puntos, cartas, cartas de cocina,
  chefs, ruta, huertas/bodegas y caminos por colocar. **Correcto.**
- **Dados y avisos (RF-4, RF-5, RF-6):** con una partida preparada (huerta en un 8, Gran Ruta de Ana y Gran Brigada de
  Rosa), las fichas muestran «Ruta» y «Brigada» y los chefs; al tirar un 8 se dibujan los dos dados con «8», se
  resaltan las 2 parcelas del 8, Ana recibe su carta y la línea de estado pasa a «Construye, comercia o termina tu
  turno»; al comprar una carta sale «Nueva carta: Chef» y la carta aparece en la mano. **Correcto.**
- **Dos personas (RF-3):** al empezar sale «Le toca a Jugador 1. Pasa el dispositivo a Jugador 1.» con la mano oculta y
  «Pasando el turno…»; tras «Ya lo tengo», «Jugador 1: planta tu primera huerta en un cruce» con su mano; al colocar su
  camino, otra vez la pantalla de pasar a Jugador 2 con la mano oculta. En escritorio esa pantalla tapa todo el tablero.
  Con una sola persona (bloque anterior), su mano siempre a la vista. **Correcto.**
- **375 px (RNF-4):** sin desplazamiento horizontal en el inicio, la partida y los diálogos (343 px de ancho). **Correcto.**
- Consola: solo los errores ya conocidos del service worker del navegador integrado.

## Comprobación a mano (T4) — 10 de octubre de 2026

- **Guardado (RF-7):** tras empezar una partida y recargar, «Continuar partida» la reanuda igual (misma huerta de Lola,
  mismo turno y mismo historial). Con la partida guardada cambiada a `version: 2`, el inicio no ofrece continuar
  (caso límite). **Correcto.**
- **Almacenamiento bloqueado (RNF-1):** con `localStorage.setItem` lanzando un error, se empieza una partida, se juega la
  colocación inicial con las máquinas y no hay ningún error en la página; no se guarda nada. **Correcto.**
- **Menú (RF-8):** «Cómo se juega», «Máquina: normal», «Salir al inicio (la partida se guarda)» y «Seguir jugando»; tras
  pasar a «Máquina: rápida» y recargar, el menú de una partida nueva dice «Máquina: rápida». **Correcto.**
- **Final (RF-9, caso límite):** con Ana a 8 puntos a la vista más una Estrella, plantar una huerta muestra «¡Ana gana!»
  con la clasificación «Ana 10 pts / Rosa 3 pts» (cuenta la Estrella; la ficha también pasa a 10), «Ver tablero» y
  «Nueva partida»; la partida guardada se borra; con «Ver tablero» solo queda el botón «Nueva partida» y el estado dice
  «¡Ana gana la partida!». **Correcto.**
- **Sin conexión (RF-10), en Chrome real:** el service worker queda activo, controla la página y guarda los 12 archivos
  de su lista; con la red cortada (emulación «Offline») la página recarga, se puede empezar una partida y un script
  pedido con «?…» llega desde la copia guardada. **Correcto.**
- **Abriendo el archivo (RNF-2), en Chrome real:** `file:///…/index.html` carga el juego y se puede empezar una partida,
  sin service worker y sin ningún mensaje en la consola. **Correcto.**
- Consola del navegador integrado: solo los errores ya conocidos del service worker.

No se ha probado la instalación como app en un teléfono Android ni en el Mac (ya constaba como pendiente en `MEMORY.md`).

## Cambio del 10 de octubre de 2026 — RF-11 y RF-12

- [x] **T5. Reglas `hasPerson` y `savedGame`.** RF-11, RF-12
  - Tests en `test/partida-local.test.js` (en rojo); las dos funciones en `js/check.js`; descripción de `check.js` en
    `AGENTS.md`.
  - Hecho cuando: los tests pasan con `npm test` y los 213 anteriores siguen en verde.

- [x] **T6. Aviso y confirmación en la interfaz.** RF-11, RF-12
  - `index.html` (párrafo del aviso); `ui.js`: «Empezar partida» con `hasPerson` y `confirmarNueva`, el aviso se oculta
    al cambiar las plazas, «Empezar la partida» de la sala de espera con `confirmarNueva`, `showMenu` con `savedGame`.
  - Hecho cuando: `npm test` termina en `OK` y `ui.js` no tiene errores de sintaxis.

- [x] **T7. Comprobación en el navegador y cierre.** RF-11, RF-12
  - Las comprobaciones a mano del plan, a 375 px y en escritorio, sin errores en la consola. Anotar aquí el resultado;
    spec en «implementada»; `MEMORY.md` al día.
  - Hecho cuando: el resultado está anotado aquí, `MEMORY.md` está al día y `npm test` termina en `OK`.

## Comprobación a mano (T7) — 10 de octubre de 2026

Navegador integrado (375 px y escritorio):
- **RF-11:** con las plazas «Máquina, Máquina, Máquina, No juega», «Empezar partida» no empieza y muestra en rojo «Tiene
  que jugar al menos una persona.» bajo el botón, sin desplazamiento horizontal; al poner la 2.ª plaza como Persona el
  aviso desaparece y se conserva todo lo elegido. **Correcto.**
- **RF-12, sin partida guardada:** empieza directamente, sin diálogo. **Correcto.**
- **RF-12, con una partida local guardada:** «¿Empezar otra partida? Ya tienes una partida sin terminar. Si empiezas
  otra, se perderá.» con «Cancelar» y «Empezar otra» (343 px de ancho en el móvil); «Cancelar» deja la partida guardada
  idéntica y «Continuar partida» sigue en el inicio; «Empezar otra» empieza la nueva y sustituye la guardada. **Correcto.**
- **RF-12, con una partida en red guardada (sala KLMN):** el inicio ofrece «Reabrir la sala KLMN» y el diálogo añade «Era
  la sala KLMN.». Crear una sala nueva no pide confirmación; en su sala de espera, «Empezar la partida» sí: «Cancelar»
  deja la sala abierta con sus jugadores y la partida guardada intacta; «Empezar otra» empieza la partida en red
  («… · sala AXTG») y la guardada pasa a ser la nueva. **Correcto.** (Con un PeerJS de mentira en la página.)
- Consola: sin errores (salvo los ya conocidos del service worker del navegador integrado).
