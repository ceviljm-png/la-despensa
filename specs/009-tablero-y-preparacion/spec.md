# Spec 009 — Tablero y preparación de la partida

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se monta el tablero al crear una partida (parcelas, números y puertos), con qué
empieza cada jugador y cómo es la colocación inicial de huertas y caminos hasta que empieza el primer turno.

## Usuarios
- Personas que juegan, en un dispositivo o en red.
- La máquina, que coloca con las mismas reglas (cómo elige está en la spec 004).

## Historias de usuario
- HU-1. Como jugador, quiero un tablero distinto en cada partida pero equilibrado.
- HU-2. Como jugador, quiero colocar mis dos primeras huertas y caminos por turnos justos.
- HU-3. Como jugador, quiero ver de un vistazo qué produce cada parcela y con qué probabilidad.

## Definiciones
- **Isla**: 19 parcelas hexagonales en un hexágono de radio 2, con 54 cruces y 72 lados.
- **Parcelas**: 4 Olivares (aceite), 4 Esteros (pescado), 4 Trigales (trigo), 3 Salinas (sal), 3 Viñedos (vino) y 1 Erial, que no produce.
- **Números**: 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11 y 12, uno por parcela productiva.
- **Puntos de probabilidad**: 1 para el 2 y el 12, 2 para el 3 y el 11, 3 para el 4 y el 10, 4 para el 5 y el 9, 5 para el 6 y el 8.
- **Orden en serpiente**: cada jugador una vez en orden de asiento desde el primero, y después al revés, terminando en el primero.

## Requisitos funcionales
- RF-1: CUANDO se crea una partida, EL SISTEMA reparte al azar las 19 parcelas y los 18 números entre las productivas, y repite el reparto hasta que ningún 6 u 8 quede junto a otro 6 u 8.
- RF-2: CUANDO se crea una partida Clásica o Completa, EL SISTEMA pone 9 puertos en 9 lados fijos de la costa, con sus tipos repartidos al azar: 4 de 3:1 y uno de 2:1 de cada recurso; en Sencilla no hay puertos.
- RF-3: CUANDO se crea una partida, EL SISTEMA pone el Cítrico en el Erial, 19 cartas de cada recurso en la banca y da a cada jugador la mano vacía, 15 caminos, 5 huertas y 4 bodegas.
- RF-4: CUANDO se crea una partida, EL SISTEMA elige al azar quién empieza y fija para la colocación inicial el orden en serpiente.
- RF-5: MIENTRAS dura la colocación inicial, EL SISTEMA pide al jugador de cada vuelta primero una huerta, en cualquier cruce que cumpla la regla de distancia (sin necesidad de camino), y después un camino en un lado libre que toque esa huerta, sin pagar nada.
- RF-6: CUANDO un jugador planta su segunda huerta, EL SISTEMA le da 1 carta de cada parcela productiva que la toca y lo anota en el historial («… recibe …» o «… recibe nada»).
- RF-7: CUANDO se coloca el último camino de la colocación inicial, EL SISTEMA da el primer turno a quien empezó, en la fase de tirar, calcula la Gran Ruta y anota «Empieza la partida. Turno de <nombre>».
- RF-8: SI en la colocación inicial se intenta construir algo distinto de lo que toca, o en un sitio no válido, ENTONCES EL SISTEMA lo rechaza sin cambiar nada.
- RF-9: EL SISTEMA dibuja cada parcela con su color, el icono de su recurso, su número y tantos puntitos como su probabilidad, con el 6 y el 8 en rojo; el Erial con su nombre; y cada puerto con «3:1» o el icono de su recurso y «2:1».
- RF-10: MIENTRAS una persona coloca en la colocación inicial, EL SISTEMA marca en el tablero solo los cruces o lados válidos y dice en la línea de estado «planta tu primera huerta en un cruce», «planta tu segunda huerta» o «coloca un camino junto a tu huerta».

## Requisitos no funcionales
- RNF-1: La geometría de la isla es siempre la misma; solo cambia el reparto de parcelas, números y tipos de puerto.
- RNF-2: Las reglas de este flujo se pueden ejecutar en una simulación sin navegador.

## Casos límite
- Con 2 jugadores el orden es A, B, B, A; con 4, A, B, C, D, D, C, B, A.
- Una segunda huerta junto al Erial no recibe nada del Erial.
- Una segunda huerta en la costa puede recibir solo 1 o 2 cartas.
- Si se pide un nivel que no existe, la partida se crea en Normal.
- El estado de una partida nueva lleva la versión 1.

## Fuera de alcance
- Elegir tipo de partida, nivel y jugadores (spec 007).
- Cómo elige la máquina dónde colocar (spec 004).
- Las cartas de cocina del mazo (spec 008).

## Criterios de finalización
- RF-1 a RF-8 tienen tests de caracterización en `npm test`, y `npm test` termina en `OK`.
- RF-9 y RF-10 están comprobados a mano en el navegador, a 375 px y en escritorio.

## Dudas abiertas
Ninguna: no he encontrado en este código nada que parezca un error.
