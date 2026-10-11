# Spec 001 — Construcción, puntos y victoria

Estado: implementada (cambio del 11 de octubre de 2026: RF-11 nuevo).

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se construyen caminos, huertas y bodegas durante la partida, cómo se cuentan
los puntos (incluidas la Gran Ruta y la Gran Brigada) y cuándo termina la partida. Es lo que decide quién gana.

## Usuarios
- Personas que juegan, en un dispositivo o en red.
- La máquina, que construye con las mismas reglas.

## Historias de usuario
- HU-1. Como jugador, quiero gastar recursos en caminos, huertas y bodegas para ganar puntos y producir más.
- HU-2. Como jugador, quiero ver solo los sitios donde puedo construir para no equivocarme.
- HU-3. Como jugador, quiero ganar puntos extra por la ruta más larga y por jugar más chefs.
- HU-4. Como jugador, quiero que la partida termine en cuanto alguien llega a los puntos del tipo de partida.

## Definiciones
- **Cruce**: esquina de parcela donde va una huerta o bodega. **Lado**: borde entre dos cruces donde va un camino.
- **Regla de distancia**: un cruce está libre si no tiene construcción y ninguno de sus cruces vecinos la tiene.
- **Piezas**: cada jugador tiene 15 caminos, 5 huertas y 4 bodegas para colocar.
- **Puntos a la vista**: los que ven todos; no incluyen las Estrellas.
- **Ruta**: camino continuo de caminos propios sin repetir ninguno.
- **Costes**: camino 1 aceite y 1 sal · huerta 1 aceite, 1 sal, 1 pescado y 1 trigo · bodega 2 trigo y 3 vino.

## Requisitos funcionales
- RF-1: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador del turno construye un camino, EL SISTEMA lo acepta solo si paga su coste, le quedan caminos y el lado está vacío y toca un cruce con una construcción suya o, sin construcción rival, con otro camino suyo.
- RF-2: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador del turno planta una huerta, EL SISTEMA la acepta solo si paga su coste, le quedan huertas y el cruce cumple la regla de distancia y toca un camino suyo.
- RF-3: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador del turno amplía una huerta propia a bodega, EL SISTEMA la acepta solo si paga su coste y le quedan bodegas, y le devuelve esa huerta a sus piezas.
- RF-4: CUANDO se paga una construcción, EL SISTEMA devuelve esas cartas a la banca.
- RF-5: EL SISTEMA da a cada jugador 1 punto por huerta, 2 por bodega, 2 por la Gran Ruta, 2 por la Gran Brigada y 1 por cada Estrella en su mano; las Estrellas solo se muestran a los demás al terminar la partida.
- RF-6: EL SISTEMA calcula la ruta más larga de cada jugador como el mayor número de caminos propios seguidos sin repetir ninguno, y una huerta o bodega rival en un cruce corta la ruta en ese punto.
- RF-7: CUANDO se coloca un camino o una huerta de cualquier jugador, o termina la colocación inicial, EL SISTEMA recalcula la Gran Ruta: quien la tiene la conserva mientras su ruta sea de al menos 5 y no la supere nadie; si no, pasa a quien tenga en solitario la ruta más larga de al menos 5, y si no hay nadie así, queda libre; cada cambio se anota en el historial.
- RF-8: CUANDO un jugador juega un Chef, EL SISTEMA le da la Gran Brigada si ha jugado al menos 3 chefs y más que quien la tiene ahora, y lo anota en el historial; nadie la pierde de otra forma.
- RF-9: CUANDO el jugador del turno construye, compra una carta de cocina o juega un Chef, y CUANDO empieza el turno de un jugador, EL SISTEMA declara ganador a ese jugador si sus puntos, contando las Estrellas, llegan a los de la partida (8 en Sencilla, 10 en Clásica y Completa), termina la partida y lo anota en el historial; después ya no acepta ninguna jugada.
- RF-10: MIENTRAS una persona elige qué construir en su turno, EL SISTEMA solo habilita las construcciones que puede pagar y tienen sitio (explicando el motivo en las demás), marca en el tablero únicamente los lados o cruces válidos y permite cancelar la elección pulsando de nuevo el mismo botón.
- RF-11: CUANDO la Gran Ruta pasa de un jugador a otro, EL SISTEMA anota en el historial «<nuevo> consigue la Gran Ruta (<n> caminos) y se la quita a <anterior>: 2 puntos»; si estaba libre, sigue anotando «<nuevo> consigue la Gran Ruta (<n> caminos): 2 puntos».

## Requisitos no funcionales
- RNF-1: Las piezas colocadas más las que quedan suman siempre 15 caminos, 5 huertas y 4 bodegas por jugador.
- RNF-2: Nunca hay dos construcciones en cruces vecinos.
- RNF-3: Las reglas de este flujo se pueden ejecutar en una simulación sin navegador.

## Casos límite
- Un camino no puede continuar a través de un cruce con una huerta o bodega rival, aunque el camino propio llegue a él.
- Si hay empate en la ruta más larga entre quien tiene la Gran Ruta y otro, la conserva quien la tiene.
- Si a quien tiene la Gran Ruta le cortan la ruta y dos rivales empatan en la más larga, la Gran Ruta queda libre.
- Con 4 bodegas colocadas no se puede ampliar más, aunque se tengan huertas y recursos.
- Una bodega no cuenta como huerta para ampliarla otra vez.
- Un jugador puede alcanzar los puntos en el turno de otro (por ejemplo, al quitarle la Gran Ruta a un rival cortándole la ruta); gana al empezar su propio turno, antes de tirar (confirmado como intencionado el 10 de octubre de 2026: solo se gana en el turno propio).

## Fuera de alcance
- Colocación inicial gratuita de huertas y caminos (spec de tablero y preparación).
- Caminos gratis de la carta Obras y compra y juego de cartas de cocina (spec de cartas de cocina).
- Pantalla de fin de partida y «Nueva partida» (spec de la partida en un dispositivo).

## Criterios de finalización
- Cada RF del motor (RF-1 a RF-9 y RF-11) tiene un test de caracterización en `npm test` que fija el comportamiento actual, y `npm test` termina en `OK`.
- RF-10 está comprobado a mano en el navegador, a 375 px y en escritorio.

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026:
- Ganar al empezar el turno propio: intencionado; está en «Casos límite».
- **Historial al pasar la Gran Ruta de un jugador a otro** — solo decía quién la consigue. Decisión del propietario:
  que diga «<nombre> consigue la Gran Ruta y se la quita a <nombre>». Hecho con `/sdd-change 001` (11 de octubre de
  2026): RF-11.
