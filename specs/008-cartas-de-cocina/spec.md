# Spec 008 — Cartas de cocina

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se compran y se juegan las cartas de cocina (Chef, Estrella, Obras, Buena cosecha y
Exclusiva) en las partidas Clásica y Completa.

## Usuarios
- Personas que juegan, en un dispositivo o en red.
- La máquina, que las compra y juega con las mismas reglas (cuándo decide jugarlas está en la spec 004).

## Historias de usuario
- HU-1. Como jugador, quiero comprar cartas de cocina para conseguir ventajas o puntos secretos.
- HU-2. Como jugador, quiero saber qué hace cada carta y si puedo jugarla ahora.
- HU-3. Como jugador, quiero elegir los recursos al jugar Buena cosecha o Exclusiva.

## Definiciones
- **Mazo**: 25 cartas barajadas al empezar: 14 Chef, 5 Estrella, 2 Obras, 2 Buena cosecha y 2 Exclusiva.
- **Coste de una carta**: 1 pescado, 1 trigo y 1 vino.
- **Turno de compra**: el número de turno de la partida en que se compró la carta (cada turno de cada jugador cuenta uno).

## Requisitos funcionales
- RF-1: EL SISTEMA solo tiene cartas de cocina en las partidas Clásica y Completa; en Sencilla no hay mazo y no se pueden comprar ni jugar.
- RF-2: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador del turno compra una carta, EL SISTEMA la acepta solo si quedan cartas en el mazo y puede pagarla, le da la carta de arriba del mazo con su turno de compra y lo anota en el historial sin decir cuál es.
- RF-3: EL SISTEMA solo deja jugar una carta al jugador del turno, como mucho una por turno de cualquier tipo, y nunca en el mismo turno en que la compró; las Estrellas no se juegan nunca.
- RF-4: EL SISTEMA deja jugar el Chef antes o después de tirar los dados, y el resto de cartas solo después de tirar, en la fase de construir y comerciar.
- RF-5: CUANDO se juega un Chef, EL SISTEMA suma un chef jugado, obliga a mover el Cítrico y robar como con un 7 pero sin descartes (spec 000, RF-6 a RF-8) y después vuelve a la fase en que se jugó.
- RF-6: CUANDO se juega Obras, EL SISTEMA la acepta solo si al jugador le quedan caminos y algún sitio donde ponerlos, y le deja colocar gratis tantos caminos como el menor entre 2 y los que le quedan, terminando antes si se queda sin sitio; después vuelve a la fase de construir y comerciar.
- RF-7: CUANDO se juega Buena cosecha con 2 recursos (iguales o distintos), EL SISTEMA la acepta solo si la banca los tiene y se los da al jugador.
- RF-8: CUANDO se juega Exclusiva con un recurso, EL SISTEMA quita a todos los rivales todas sus cartas de ese recurso, se las da al jugador y anota en el historial cuántas se ha llevado, aunque sean 0.
- RF-9: MIENTRAS una persona tiene cartas de cocina, EL SISTEMA las muestra agrupadas por tipo (con «×N» si tiene varias), resalta las que puede jugar ahora y, al pulsar una, muestra lo que hace con el botón «Jugar», que está desactivado con el aviso «Una carta por turno, y nunca en el turno en que la compras.» si ahora no se puede (la Estrella no tiene botón).
- RF-10: CUANDO una persona juega Buena cosecha o Exclusiva, EL SISTEMA le pide los recursos (2 entre los que tiene la banca, o 1 cualquiera) y, si cancela, no juega la carta.

## Requisitos no funcionales
- RNF-1: Las cartas de cocina entre el mazo y las manos nunca suman más de 25.
- RNF-2: Las reglas de este flujo se pueden ejecutar en una simulación sin navegador.

## Casos límite
- Una carta comprada en un turno se puede jugar en el siguiente turno propio, no antes.
- Si se juega un Chef antes de tirar, después de robar se vuelve a la fase de tirar.
- Con 1 camino por colocar, Obras solo da 1 camino.
- Exclusiva de un recurso que nadie tiene gasta la carta y no da nada.
- Comprar la carta que da la victoria (una Estrella) termina la partida en ese momento (spec 001, RF-9).
- Con el mazo vacío, el botón de comprar se desactiva con «No quedan cartas».

## Fuera de alcance
- Puntos de la Estrella y la Gran Brigada (spec 001).
- Cuándo decide la máquina comprar y jugar cada carta (spec 004).

## Criterios de finalización
- RF-1 a RF-8 tienen tests de caracterización en `npm test` con estados preparados a mano, y `npm test` termina en `OK`.
- RF-9 y RF-10 están comprobados a mano en el navegador, a 375 px y en escritorio.

## Dudas abiertas
Ninguna: no he encontrado en este código nada que parezca un error.
