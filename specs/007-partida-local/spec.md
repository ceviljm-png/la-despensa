# Spec 007 — Partida en un dispositivo: inicio, pasar el dispositivo, guardado y app instalable

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se prepara y se juega una partida en un solo dispositivo: la pantalla de inicio,
el paso del dispositivo entre personas, lo que se ve durante la partida, el guardado automático, el final de la
partida y el funcionamiento como app instalable sin conexión.

## Usuarios
- Una persona que juega sola contra la máquina.
- Varias personas que comparten un dispositivo, con o sin máquinas.

## Historias de usuario
- HU-1. Como jugador, quiero elegir tipo de partida, dificultad y jugadores antes de empezar.
- HU-2. Como grupo con un solo móvil, quiero pasarlo sin ver la mano de los demás.
- HU-3. Como jugador, quiero cerrar la app y seguir la partida más tarde.
- HU-4. Como jugador, quiero instalar el juego y jugar sin conexión.

## Definiciones
- **Plaza**: cada una de las 4 filas de jugador del inicio; su posición fija el color (rojo, azul, amarillo y blanco).
- **Mano a la vista**: la del jugador cuyas cartas se están mostrando; ninguna mientras se pasa el dispositivo.
- **Partida guardada**: una sola por dispositivo; se sobrescribe con cada cambio.

## Requisitos funcionales
- RF-1: EL SISTEMA muestra en el inicio el tipo de partida (Clásica marcada), la dificultad (Normal marcada) con su descripción debajo, y 4 plazas: las dos primeras pueden ser Persona o Máquina y las dos últimas también «No juega»; por defecto, Persona, Máquina, Máquina y No juega.
- RF-2: CUANDO se empieza una partida, EL SISTEMA crea una con las plazas que juegan, en su orden y color, usa como nombre lo escrito (hasta 12 caracteres) o, si está vacío, Rosa, Paco, Lola o Curro para las máquinas y «Jugador N» para las personas, y muestra arriba «<Tipo> · a <N> puntos · <Nivel>».
- RF-3: MIENTRAS hay una sola persona en la partida, EL SISTEMA muestra siempre su mano; MIENTRAS hay varias, ANTES del turno o del descarte de cada persona EL SISTEMA oculta la mano y muestra «Le toca a <nombre>. Pasa el dispositivo a <nombre>.» hasta que se pulsa «Ya lo tengo».
- RF-4: EL SISTEMA muestra en todo momento una ficha por jugador (marcando a quien tiene el turno) con sus puntos a la vista, sus cartas de recurso, sus chefs jugados si hay cartas de cocina y las marcas «Ruta» y «Brigada»; CUANDO se pulsa una ficha, muestra su detalle (puntos, cartas, cartas de cocina, chefs, ruta, huertas y bodegas, caminos por colocar).
- RF-5: EL SISTEMA muestra una línea de estado que dice qué toca hacer en cada fase («tira los dados», «mueve al Cítrico Gastronómico a otra parcela», «construye, comercia o termina tu turno»…), precedida del nombre si hay varias personas, o «Juega <nombre>…» en el turno de una máquina.
- RF-6: CUANDO se tiran los dados, EL SISTEMA dibuja los dos dados con su suma y resalta las parcelas que producen; CUANDO llega una carta de cocina a la mano a la vista, avisa «Nueva carta: <nombre>».
- RF-7: CUANDO cambia la partida, EL SISTEMA la guarda en el dispositivo, y la borra al terminar; MIENTRAS hay una partida guardada sin terminar, EL SISTEMA muestra «Continuar partida» en el inicio, que la reanuda con la misma mano a la vista.
- RF-8: CUANDO se abre el menú de la partida, EL SISTEMA ofrece «Cómo se juega», «Máquina: normal / rápida» (que se recuerda), «Salir al inicio (la partida se guarda)» y «Seguir jugando».
- RF-9: CUANDO alguien gana, EL SISTEMA muestra «¡<nombre> gana!» con la clasificación por puntos, contando las Estrellas, y deja elegir «Ver tablero» o «Nueva partida»; con la partida terminada, el panel de acciones solo ofrece «Nueva partida».
- RF-10: CUANDO el juego se abre por `http` o `https`, EL SISTEMA se registra como app instalable que, tras la primera visita, funciona sin conexión: pide primero cada archivo a la red y, si no hay red, usa la copia guardada; si falta una página usa la de inicio, y si falta otro archivo devuelve un error en lugar de la página.

## Requisitos no funcionales
- RNF-1: Si el dispositivo no permite guardar, el juego funciona igual, sin guardar.
- RNF-2: El juego funciona abriendo el archivo de inicio directamente (sin servidor), aunque entonces no se instala ni funciona sin conexión.
- RNF-3: Todos los nombres de jugador se escapan antes de mostrarse.
- RNF-4: Toda la interfaz se usa en una pantalla de 375 px de ancho sin desplazamiento horizontal.

## Casos límite
- Una partida guardada de otra versión del estado (distinta de la 1) se ignora y no se ofrece continuar.
- Con «Ver tablero» la partida ya está borrada: si se cierra la app, no se puede volver a verla.
- Con varias personas, si se reanuda una partida guardada mientras se pasaba el dispositivo, vuelve a pedir que se pase.
- Una plaza en «No juega» deja su nombre desactivado.

## Fuera de alcance
- Reglas de cada jugada (specs 000 a 002) y cómo juega la máquina (specs 003 y 004).
- Partidas en red (specs 005 y 006); el menú en red añade opciones propias.
- Pantalla de reglas «Cómo se juega»: es un texto fijo.

## Criterios de finalización
- Todos los RF comprobados a mano en el navegador, a 375 px y en escritorio, sin errores en la consola, incluido
  instalar la app, cortar la red y recargar (RF-10).
- `npm test` termina en `OK`.

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026 (decisiones del propietario que el código actual **no** cumple; se harán
con `/sdd-change 007` y entonces se añadirán los RF):
- **Partidas solo con máquinas** — hoy el inicio deja poner las 4 plazas como Máquina y la partida se juega sola
  (`js/ui.js:98-133`). Decisión: siempre debe haber al menos una persona. La simulación de `npm test` seguirá usando
  partidas solo con máquinas, porque no pasa por el inicio.
- **Empezar encima de una partida guardada** — hoy se sobrescribe sin avisar, aunque sea una partida en red que se
  podía reabrir (`js/ui.js:120-133`, `js/ui.js:63`). Decisión: debe pedir confirmación.
