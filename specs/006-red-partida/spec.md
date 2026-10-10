# Spec 006 — Partida en red: estado compartido, jugadas remotas y desconexiones

Estado: implementada (cambio de seguridad del 10 de octubre de 2026: RF-4 modificado, RF-11 nuevo y RNF-3 modificado).

## Contexto y objetivo
Describe cómo se juega una partida en red una vez empezada: quién tiene la partida de verdad, cómo llegan las
jugadas de los invitados, cómo se contestan en cada dispositivo los descartes, robos y ofertas, y qué pasa cuando
alguien se desconecta. Es el área con más riesgo: no tiene pruebas automáticas y junta red, reglas e interfaz.

**Cambio de seguridad (10 de octubre de 2026).** Ningún dispositivo debe poder meter en otro algo que no sea una
jugada o un estado de partida bien formados: el anfitrión rechaza las órdenes que no son del juego o a las que les
falta un número, y el invitado no muestra un estado con datos fuera de lo permitido (principio 5 de la constitución).

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
- RF-4: CUANDO el anfitrión recibe una orden, EL SISTEMA solo la acepta si es una de las jugadas del juego, viene de un dispositivo con un asiento de persona, es su turno (salvo un descarte, que solo puede ser de su propio asiento), cada número que necesita está presente y es un entero, las cantidades de recursos están entre 0 y 99 y el motor la valida; si no, contesta «Ahora no se puede.» sin cambiar nada.
- RF-5: CUANDO sale un 7, EL SISTEMA pide a la vez, cada una en su dispositivo, el descarte a todas las personas que deben descartar, y las máquinas descartan sin esperarlas; CUANDO quien tiró debe elegir víctima, se lo pide en su dispositivo.
- RF-6: CUANDO hay que preguntar a una persona de otro dispositivo por una oferta, EL SISTEMA se lo pregunta en su dispositivo y, SI no contesta en 90 s o no está conectada, ENTONCES lo toma como rechazo.
- RF-7: CUANDO un invitado propone un cambio, EL SISTEMA lo resuelve en el anfitrión como cualquier oferta (spec 002), deja elegir con quién cambiar en el dispositivo del invitado y le devuelve el texto de rechazo; SI no llega respuesta en 120 s, ENTONCES muestra «no ha llegado respuesta.».
- RF-8: CUANDO empieza el turno de una persona en la fase de tirar o en la colocación inicial, EL SISTEMA le avisa en su dispositivo con «¡Te toca!» y una vibración si el dispositivo lo permite.
- RF-9: CUANDO un invitado se desconecta, EL SISTEMA marca su nombre con 📵, avisa al anfitrión («<nombre> se ha desconectado») y, si se le está esperando, muestra «<nombre> se ha desconectado. Esperando…» y ofrece al anfitrión «Que juegue la máquina por <nombre>»; tras confirmarlo, la máquina juega por esa persona (marcada con 🤖) hasta que vuelve, y ambas cosas se anotan en el historial.
- RF-10: CUANDO un invitado pierde la conexión con el anfitrión, EL SISTEMA le muestra «Se ha perdido la conexión con la sala. Reintentando…», reintenta cada 3 s y, al reconectar, quita el aviso y recibe el estado al día.
- RF-11: SI un invitado recibe un estado en el que algún dato que se muestra en pantalla no tiene la forma permitida (un recurso o tipo de puerto que no es del juego, un número de parcela que no existe, una posición fuera del tablero, un jugador que no existe o un contador que no es un entero entre 0 y el máximo del juego), ENTONCES EL SISTEMA no lo adopta y sigue mostrando la última copia válida.

## Requisitos no funcionales
- RNF-1: Solo el anfitrión ejecuta las reglas, las máquinas y el guardado; un invitado nunca guarda la partida.
- RNF-2: Cada orden se valida dos veces: en el anfitrión (asiento, turno, números) y en el motor.
- RNF-3: Nada de lo que llega de otro dispositivo se interpreta como código de la página: los textos libres (nombres, historial) se muestran tal cual, como texto; de los textos de rechazo solo se respetan las negritas; y el resto de datos solo se muestra si ha pasado la comprobación de RF-11.

## Casos límite
- Las manos de todos viajan en el estado: no son secretas para quien abra las herramientas del navegador (aceptado: es un juego entre amigos).
- Si el anfitrión sale al inicio, la partida se guarda y se para; los invitados reintentan hasta que reabre la sala (spec 005, RF-10).
- «Cerrar la sala y terminar la partida» pide confirmación, devuelve a todos al inicio y borra la partida guardada del anfitrión.
- Al terminar la partida, «Nueva partida» en el anfitrión cierra la sala para todos; un invitado que ya ha visto el final sale sin aviso.
- Quien vuelve tras jugar la máquina por él recupera su asiento y su mano tal como la dejó la máquina.
- Mientras el anfitrión espera la respuesta de una persona a una oferta (hasta 90 s), la partida no avanza.
- Una orden con un nombre que no es una jugada del juego (por ejemplo `toString`, `__proto__` o `constructor`) se rechaza con «Ahora no se puede.», igual que cualquier orden desconocida, y no provoca ningún error en el anfitrión.
- Una orden a la que le falta el número (sin argumentos, vacío, `null`, `""`, `1.5` o un texto) se rechaza; ya no se toma como el cruce, lado o parcela 0.
- Un estado con el recurso de una parcela escrito como código HTML (por ejemplo `<img src=x onerror=…>`) no se adopta: el invitado sigue viendo la copia anterior y no se ejecuta nada.
- El primer estado que recibe un invitado, si no es válido, no le hace entrar en la partida: sigue en la sala de espera.
- Un nombre de jugador con etiquetas (por ejemplo `<b>Ana</b>`) es válido y se muestra como texto.

## Fuera de alcance
- Crear la sala, unirse, sala de espera y reabrir la sala (spec 005).
- Las reglas de cada jugada (specs 000 a 002).
- Ocultar las manos ajenas ante las herramientas del navegador.
- Comprobar que el estado recibido es coherente con las reglas (por ejemplo, que los recursos sumen 19): solo se comprueba su forma, porque el estado lo genera el motor del anfitrión.
- Avisar al invitado de que se ha ignorado un estado no válido.
- Autenticar dispositivos o cifrar más allá de lo que ya hace WebRTC.

## Criterios de finalización
- Todos los RF comprobados a mano con dos navegadores con almacenamiento separado: partida entera, un 7 con descartes en los dos, un cambio propuesto por el invitado y otro por una máquina, recarga del invitado y del anfitrión, y que la máquina juegue por un invitado desconectado.
- La validación de órdenes del anfitrión (RF-4) y la comprobación del estado en el invitado (RF-11) tienen tests en `npm test`, incluidos los casos límite de órdenes desconocidas, números que faltan y estados con datos no permitidos, y `npm test` termina en `OK`.
- Comprobado a mano en el navegador que un estado con HTML en un dato no se muestra ni ejecuta nada, y que una partida en red normal sigue funcionando.

## Dudas abiertas
Ninguna. Las tres decisiones del propietario del 10 de octubre de 2026 están ahora en RF-4, RF-11, RNF-3 y los casos
límite. Confirmado el mismo día: un estado no válido se **ignora entero y se sigue con la copia anterior**, sin avisar.
