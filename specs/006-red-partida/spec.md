# Spec 006 — Partida en red: estado compartido, jugadas remotas y desconexiones

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se juega una partida en red una vez empezada: quién tiene la partida de verdad,
cómo llegan las jugadas de los invitados, cómo se contestan en cada dispositivo los descartes, robos y ofertas, y
qué pasa cuando alguien se desconecta. Es el área con más riesgo: no tiene pruebas automáticas y junta red, reglas e interfaz.

## Usuarios
- **Anfitrión**: su dispositivo tiene la partida, ejecuta las reglas y las máquinas y guarda la partida.
- **Invitados**: juegan desde su dispositivo con una copia de la partida.

## Historias de usuario
- HU-1. Como invitado, quiero ver el tablero al día y solo mi mano, y jugar mi turno desde mi móvil.
- HU-2. Como invitado, quiero contestar en mi móvil lo que me toca aunque no sea mi turno (descartar, ofertas).
- HU-3. Como jugador, quiero saber cuándo me toca y quién se ha desconectado.
- HU-4. Como anfitrión, quiero que la máquina juegue por quien se ha ido para que la partida no se pare.

## Definiciones
- **Estado**: la partida completa (tablero, manos, turno, historial). Viaja entera; la interfaz solo enseña la mano propia.
- **Orden**: una jugada que un invitado pide al anfitrión (tirar, construir, descartar, terminar el turno…).
- **Conectado**: el anfitrión ha recibido algo de ese dispositivo en los últimos 15 s (se envía un latido cada 4 s).

## Requisitos funcionales
- RF-1: CUANDO cambia el estado de la partida en el anfitrión, EL SISTEMA lo envía entero, junto con quién está conectado, a todos los invitados, y no lo reenvía si no ha cambiado.
- RF-2: CUANDO un invitado recibe un estado con jugadores, tablero y un tipo de partida válido, EL SISTEMA lo adopta como su copia y muestra el tablero, el historial y solo la mano de su asiento; si no es válido, lo ignora.
- RF-3: CUANDO un invitado hace una jugada, EL SISTEMA la envía al anfitrión como orden, y SI no hay conexión con la sala, ENTONCES avisa «Sin conexión con la sala. Reintentando…».
- RF-4: CUANDO el anfitrión recibe una orden, EL SISTEMA solo la acepta de un dispositivo con un asiento de persona, solo si es su turno (salvo un descarte, que solo puede ser de su propio asiento), con números enteros y cantidades de recursos entre 0 y 99, y después de que el motor la valide; si no, contesta «Ahora no se puede.».
- RF-5: CUANDO sale un 7, EL SISTEMA pide a la vez, cada una en su dispositivo, el descarte a todas las personas que deben descartar, y las máquinas descartan sin esperarlas; CUANDO quien tiró debe elegir víctima, se lo pide en su dispositivo.
- RF-6: CUANDO hay que preguntar a una persona de otro dispositivo por una oferta, EL SISTEMA se lo pregunta en su dispositivo y, SI no contesta en 90 s o no está conectada, ENTONCES lo toma como rechazo.
- RF-7: CUANDO un invitado propone un cambio, EL SISTEMA lo resuelve en el anfitrión como cualquier oferta (spec 002), deja elegir con quién cambiar en el dispositivo del invitado y le devuelve el texto de rechazo; SI no llega respuesta en 120 s, ENTONCES muestra «no ha llegado respuesta.».
- RF-8: CUANDO empieza el turno de una persona en la fase de tirar o en la colocación inicial, EL SISTEMA le avisa en su dispositivo con «¡Te toca!» y una vibración si el dispositivo lo permite.
- RF-9: CUANDO un invitado se desconecta, EL SISTEMA marca su nombre con 📵, avisa al anfitrión («<nombre> se ha desconectado») y, si se le está esperando, muestra «<nombre> se ha desconectado. Esperando…» y ofrece al anfitrión «Que juegue la máquina por <nombre>»; tras confirmarlo, la máquina juega por esa persona (marcada con 🤖) hasta que vuelve, y ambas cosas se anotan en el historial.
- RF-10: CUANDO un invitado pierde la conexión con el anfitrión, EL SISTEMA le muestra «Se ha perdido la conexión con la sala. Reintentando…», reintenta cada 3 s y, al reconectar, quita el aviso y recibe el estado al día.

## Requisitos no funcionales
- RNF-1: Solo el anfitrión ejecuta las reglas, las máquinas y el guardado; un invitado nunca guarda la partida.
- RNF-2: Cada orden se valida dos veces: en el anfitrión (asiento, turno, números) y en el motor.
- RNF-3: Todo nombre que llega de otro dispositivo pasa por `esc()` antes de mostrarse; de los textos de rechazo solo se respetan las negritas.

## Casos límite
- Las manos de todos viajan en el estado: no son secretas para quien abra las herramientas del navegador (aceptado: es un juego entre amigos).
- Si el anfitrión sale al inicio, la partida se guarda y se para; los invitados reintentan hasta que reabre la sala (spec 005, RF-10).
- «Cerrar la sala y terminar la partida» pide confirmación, devuelve a todos al inicio y borra la partida guardada del anfitrión.
- Al terminar la partida, «Nueva partida» en el anfitrión cierra la sala para todos; un invitado que ya ha visto el final sale sin aviso.
- Quien vuelve tras jugar la máquina por él recupera su asiento y su mano tal como la dejó la máquina.
- Mientras el anfitrión espera la respuesta de una persona a una oferta (hasta 90 s), la partida no avanza.

## Fuera de alcance
- Crear la sala, unirse, sala de espera y reabrir la sala (spec 005).
- Las reglas de cada jugada (specs 000 a 002).
- Ocultar las manos ajenas ante las herramientas del navegador.

## Criterios de finalización
- Todos los RF comprobados a mano con dos navegadores con almacenamiento separado: partida entera, un 7 con descartes en los dos, un cambio propuesto por el invitado y otro por una máquina, recarga del invitado y del anfitrión, y que la máquina juegue por un invitado desconectado.
- La validación de órdenes del anfitrión (RF-4) tiene tests de caracterización en `npm test`, y `npm test` termina en `OK`.

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026: el propietario quiere **corregir las tres**. El código actual no lo
cumple, así que no son RF de esta spec; se harán con `/sdd-change 006` y entonces se añadirán los RF:
- **Datos del anfitrión sin escapar** en el invitado (`js/ui.js:269`, `js/ui.js:278-283`, `js/ui.js:921`): todo lo que llega
  de otro dispositivo debe escaparse o validarse antes de entrar en la página (principio 5 de la constitución).
- **Órdenes con nombres heredados** (`toString`, `__proto__`, `js/ui.js:679`): deben rechazarse como cualquier orden desconocida.
- **Órdenes sin número** (`js/ui.js:655`): deben rechazarse en vez de convertirse en 0.
