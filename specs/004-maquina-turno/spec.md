# Spec 004 — La máquina en su turno

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo juega la máquina todo lo que no son cambios con rivales: colocación inicial, dados,
descartes, Cítrico, cartas de cocina, construcción y comercio con la banca. También juega por una persona que se ha
ido de una partida en red. Su requisito más importante es no quedarse nunca parada.

## Usuarios
- Personas que juegan contra la máquina en cualquier tipo de partida y nivel.
- Quien lleva una sala en red y deja que la máquina juegue por alguien desconectado.

## Historias de usuario
- HU-1. Como jugador, quiero rivales que jueguen con sentido para tener una partida interesante.
- HU-2. Como jugador en Fácil, quiero que la máquina juegue peor.
- HU-3. Como jugador, quiero que la partida avance sola en el turno de la máquina, a un ritmo que pueda seguir.

## Definiciones
- **Valor de un cruce**: suma de los puntos de probabilidad de los números de sus parcelas productivas (2 y 12 valen 1; 6 y 8 valen 5),
  más 0,6 por cada recurso distinto, más 1,2 por cada recurso que la máquina aún no produce (solo al plantar huertas),
  más 1 por cada puerto que toque.
- **Azar**: número aleatorio entre 0 y un máximo que se suma a cada valoración antes de elegir la mejor opción.
- **Objetivos**: lista ordenada de lo que la máquina quiere construir o comprar (RF-9).

## Requisitos funcionales
- RF-1: CUANDO se pide a la máquina que juegue, EL SISTEMA ejecuta exactamente una acción del jugador automático al que le toque (el del turno o uno con descarte pendiente) y, si a quien le toca es una persona, no hace nada.
- RF-2: EL SISTEMA suma a cada valoración de la máquina un azar de hasta 4 en Fácil y de hasta 0,3 en Normal y Difícil.
- RF-3: CUANDO la máquina planta una huerta (en la colocación inicial o en la partida), EL SISTEMA elige el cruce válido de mayor valor; CUANDO amplía a bodega, elige la huerta propia de mayor valor sin la bonificación por recursos nuevos.
- RF-4: CUANDO la máquina coloca un camino (en la colocación inicial, con Obras o comprándolo), EL SISTEMA prefiere el que llega a un cruce libre (valor del cruce más 3), después el que se acerca a uno libre a un lado más de distancia (0,6 de su valor), y da muy poco valor al que une dos piezas suyas o lleva a un cruce ocupado.
- RF-5: CUANDO a una máquina le toca descartar, EL SISTEMA descarta carta a carta, cada vez del recurso del que más tiene.
- RF-6: MIENTRAS es el turno de una máquina en la fase de tirar, SI tiene una construcción en la parcela bloqueada y puede jugar un Chef, ENTONCES EL SISTEMA juega el Chef antes de tirar; si no, tira.
- RF-7: CUANDO la máquina mueve el Cítrico, EL SISTEMA nunca lo pone en una parcela con construcciones suyas (salvo que todas las tengan), elige la que más produce a los rivales (probabilidad × 1 por huerta o 2 por bodega × (1 + puntos a la vista del rival / 10)) y, si debe elegir víctima, roba a quien más puntos a la vista tiene y, a igualdad, más cartas.
- RF-8: MIENTRAS es el turno de una máquina en la fase de construir y comerciar, CUANDO puede jugar una carta de cocina, EL SISTEMA la juega con esta prioridad: Chef; Obras; Buena cosecha (pidiendo lo que le falta, si son 2 cartas o menos, para su primer objetivo así, y completando hasta 2 con los recursos de los que menos tiene: si no le falta ninguno, los dos primeros de esa lista; si le falta 1, el segundo de la lista, para no repetir normalmente el que ya pide); y Exclusiva del recurso que más suman los rivales, solo si suman 3 o más.
- RF-9: EL SISTEMA ordena los objetivos de la máquina así: bodega (si tiene huertas y bodegas por colocar), huerta (si tiene sitio y huertas), camino (solo si no tiene sitio para huertas y algún camino vale más de 1), carta de cocina (si el tipo de partida las tiene y quedan) y, si no estaba ya, camino cuando tiene más de 7 cartas.
- RF-10: MIENTRAS es el turno de una máquina en la fase de construir y comerciar, EL SISTEMA recorre sus objetivos en orden: construye el primero que puede pagar; si no puede, cambia 1 vez con la banca cuando lo que le sobra (reservando el coste) cubre lo que le falta; aparta para ahorrar el primer objetivo al que le falta 1 carta si tiene 7 o menos, saltándose después los que compartan recursos con él; y, si no hace nada, termina el turno.

## Requisitos no funcionales
- RNF-1: La máquina nunca se queda parada: en cualquier estado en que le toque, siempre ejecuta una acción válida.
- RNF-2: Toda partida solo con máquinas termina con un ganador (la simulación lo comprueba con un tope de 40.000 acciones).
  Las partidas solo con máquinas existen únicamente en la simulación: el propietario ha decidido que en el juego siempre
  haya al menos una persona (ver la spec de la partida en un dispositivo).
- RNF-3: La máquina juega con las mismas reglas que las personas: usa solo las acciones del motor, que las validan.
- RNF-4: En la interfaz, entre una acción de la máquina y la siguiente hay una pausa de 0,5 s en la colocación inicial y de 0,7 s en el resto, o de 0,14 s con «Máquina: rápida».

## Casos límite
- En Sencilla no hay cartas de cocina: la máquina nunca compra ni juega ninguna.
- Si la banca no tiene el recurso que le falta, la máquina no intenta cambiarlo.
- Si Buena cosecha pide recursos que la banca no tiene, no se juega y la máquina pasa a valorar Exclusiva.
- Una máquina con 8 o más cartas también se plantea comprar caminos aunque no le hagan falta, para gastar.
- Cuando juega por una persona desconectada, usa exactamente esta lógica y el nivel de la partida.
- Con Buena cosecha y 1 carta pedida, si el recurso pedido no es el que menos tiene, se salta el más escaso (confirmado como aceptable el 10 de octubre de 2026).

## Fuera de alcance
- Valorar y proponer cambios con rivales (spec 003).
- Cuándo se puede jugar cada carta de cocina y qué hace (spec de cartas de cocina).
- Cómo se activa que la máquina juegue por alguien en red (spec de partidas en red).

## Criterios de finalización
- RNF-1 y RNF-2 siguen cubiertos por la simulación de `npm test`.
- RF-1, RF-5 a RF-8 y RF-10 tienen tests de caracterización con estados preparados a mano y azar controlado, y `npm test` termina en `OK`.
- RNF-4 está comprobado a mano en el navegador.

## Dudas abiertas
Ninguna. La de Buena cosecha (`js/ai.js:104-105`) se confirmó como aceptable y está en RF-8 y en «Casos límite».
