# Spec 000 — Turno, producción y Cítrico Gastronómico

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo funciona hoy un turno de juego una vez terminada la colocación inicial:
tirar los dados, repartir recursos, lo que pasa cuando sale un 7 (descartes, mover el Cítrico Gastronómico
y robar) y pasar el turno. Es el corazón de la partida y lo que más jugadas toca, por eso va primero.

## Usuarios
- Personas que juegan, en un dispositivo o en red.
- La máquina, que usa exactamente las mismas reglas.

## Historias de usuario
- HU-1. Como jugador, quiero tirar los dados al empezar mi turno para que las parcelas produzcan.
- HU-2. Como jugador, quiero recibir recursos de las parcelas donde tengo huertas y bodegas para poder construir.
- HU-3. Como jugador, quiero que con un 7 se castigue a quien acumula cartas y pueda bloquear una parcela rival y robar.
- HU-4. Como jugador, quiero terminar mi turno para que juegue el siguiente.

## Definiciones
- **Mano**: las cartas de recurso de un jugador (aceite, sal, pescado, trigo y vino). Las cartas de cocina no cuentan.
- **Banca**: reserva común; empieza con 19 cartas de cada recurso.
- **Parcela bloqueada**: la parcela donde está el Cítrico Gastronómico.
- **Construcción en una parcela**: huerta o bodega en alguno de los 6 cruces de su borde.

## Requisitos funcionales
- RF-1: MIENTRAS el turno está en la fase de tirar, CUANDO el jugador del turno tira, EL SISTEMA saca dos dados de 1 a 6, guarda los dos valores y anota la suma en el historial.
- RF-2: CUANDO la suma no es 7, EL SISTEMA entrega, por cada parcela con ese número que no sea la bloqueada, 1 carta de su recurso por cada huerta y 2 por cada bodega que haya en ella, a su dueño, y pasa a la fase de construir y comerciar.
- RF-3: SI la banca no tiene bastantes cartas de un recurso para pagar a todos los que lo reciben, ENTONCES EL SISTEMA da a un único receptor las que queden, o, si hay varios receptores, no da ese recurso a nadie y lo anota en el historial.
- RF-4: CUANDO la suma es 7, EL SISTEMA no reparte recursos y exige a cada jugador con más de 7 cartas en la mano descartar la mitad, redondeando hacia abajo.
- RF-5: MIENTRAS haya descartes pendientes, EL SISTEMA acepta de cada jugador pendiente, en cualquier orden, solo un descarte con exactamente las cartas exigidas y sin superar las que tiene de cada recurso, y devuelve esas cartas a la banca.
- RF-6: CUANDO no quedan descartes pendientes tras un 7 (o no había ninguno), EL SISTEMA exige al jugador del turno mover el Cítrico a cualquier parcela distinta de la actual, incluido el Erial.
- RF-7: CUANDO se mueve el Cítrico, EL SISTEMA considera víctimas a los rivales con alguna construcción en la nueva parcela y al menos una carta en la mano: con una víctima le roba directamente, con varias deja elegir a quién robar, y sin víctimas no roba; después vuelve a la fase anterior al movimiento.
- RF-8: CUANDO se roba, EL SISTEMA pasa al ladrón una carta al azar de la mano de la víctima (cada carta con la misma probabilidad) y anota en el historial quién robó a quién, sin decir el recurso.
- RF-9: CUANDO hay un robo, EL SISTEMA muestra al ladrón y a la víctima, solo en la mano que se está viendo, un aviso con el recurso robado.
- RF-10: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador termina el turno, EL SISTEMA pasa el turno al siguiente jugador en orden de asiento, borra los dados y vuelve a permitir jugar una carta de cocina y que la máquina proponga un cambio.
- RF-11: SI se intenta una acción de este flujo fuera de su fase o con datos no válidos, ENTONCES EL SISTEMA la rechaza sin cambiar nada.

## Requisitos no funcionales
- RNF-1: El total de cada recurso entre la banca y las manos es siempre 19, y ninguna mano ni la banca baja de 0.
- RNF-2: Las reglas de este flujo no dependen de la interfaz y se pueden ejecutar en una simulación sin navegador.

## Casos límite
- Un jugador con exactamente 7 cartas no descarta; con 9 descarta 4.
- Si todos los que deben descartar son máquinas o no hay nadie, se pasa directamente a mover el Cítrico.
- El Cítrico puede ir a una parcela con construcciones propias (no roba a nadie suyo).
- Un rival con construcción en la parcela pero con la mano vacía no cuenta como víctima.
- Un rival con varias construcciones en la misma parcela cuenta como una sola víctima.
- Una parcela con el número sacado pero bloqueada no produce nada, aunque tenga varias construcciones.
- Si la banca tiene 0 cartas de un recurso y solo hay un receptor, recibe 0 y no se anota nada.
- El recurso robado viaja en el estado a todos los dispositivos de la sala, igual que las manos: no es secreto ante las herramientas del navegador (confirmado como intencionado el 10 de octubre de 2026).

## Fuera de alcance
- Mover el Cítrico con una carta de Chef (spec de cartas de cocina).
- Comprobación de victoria al empezar el turno (spec de construcción y puntos).
- Cómo se avisa en red a quien tiene que descartar o elegir víctima (spec de partidas en red).
- El orden de la colocación inicial (spec de tablero y preparación).

## Criterios de finalización
- Cada RF tiene un test de caracterización en `npm test` que fija el comportamiento actual, y `npm test` termina en `OK`.
- RF-9 está comprobado a mano en el navegador.

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026 (decisiones del propietario que el código actual **no** cumple; se harán
con `/sdd-change 000` y entonces se añadirán los RF):
- **Banca corta con un único receptor** — hoy recibe menos de lo que le toca sin aviso (`js/engine.js:401`).
  Decisión: anotarlo en el historial, por ejemplo «Solo quedaban 2 de trigo en la banca».
- **Aviso de robo con varias personas en un dispositivo** — hoy solo lo ve quien tiene el dispositivo en ese momento
  (`js/ui.js:537-538`). Decisión: mostrar a la víctima «<ladrón> te robó <recurso>» cuando reciba el dispositivo.
- El recurso robado visible en el estado: intencionado; está en «Casos límite».
