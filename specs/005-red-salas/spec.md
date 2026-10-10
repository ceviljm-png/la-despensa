# Spec 005 — Salas en red: crear, unirse, sala de espera y volver

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se juntan varias personas, cada una con su dispositivo, antes y alrededor de una
partida en red: crear una sala con código, unirse, la sala de espera y cómo se vuelve a una sala tras salir o
cerrar la app. Lo que pasa durante la partida (sincronización, jugadas remotas, desconexiones) va en la spec 006.

## Usuarios
- **Anfitrión**: la persona que crea la sala. Su dispositivo lleva la partida y las máquinas.
- **Invitados**: las personas que se unen con el código o el enlace.

## Historias de usuario
- HU-1. Como anfitrión, quiero crear una sala y compartir un código corto para que mis amigos se unan desde su móvil.
- HU-2. Como invitado, quiero unirme escribiendo el código o abriendo un enlace.
- HU-3. Como anfitrión, quiero rellenar huecos con máquinas y decidir cuándo empieza la partida.
- HU-4. Como jugador, quiero volver a mi sala y a mi asiento si se me cierra la app o pierdo la conexión.

## Definiciones
- **Código de sala**: 4 letras mayúsculas sin la I ni la O (para no confundirlas con 1 y 0).
- **Identificador del dispositivo**: 12 letras al azar que el dispositivo guarda y reutiliza; si no puede guardarlo, dura lo que la sesión.
- **Sala de espera**: pantalla previa a la partida con el código y la lista de jugadores.
- **Nombre**: de 1 a 12 caracteres, sin espacios al principio ni al final.

## Requisitos funcionales
- RF-1: CUANDO una persona crea una sala con su nombre, EL SISTEMA le asigna un código al azar (probando otro si está ocupado, hasta 6 veces), la convierte en anfitrión y le muestra la sala de espera con el código, el tipo de partida y el nivel elegidos antes en el inicio.
- RF-2: CUANDO una persona se une con su nombre y un código, EL SISTEMA pasa el código a mayúsculas, quita lo que no sean letras, exige que queden 4 («El código tiene 4 letras.») y un nombre («Escribe tu nombre.»), y espera la respuesta de la sala un máximo de 15 s.
- RF-3: SI no se puede crear la sala o unirse, ENTONCES EL SISTEMA deja la ventana abierta para reintentar con un mensaje según la causa: «No hay ninguna sala abierta con ese código.», «La sala no responde. Comprueba el código y que quien la creó tenga el juego abierto.», «Ese código de sala sigue ocupado. Prueba otra vez en un momento.», «Este navegador no permite jugar en red.», «No se ha podido cargar el módulo de red. Comprueba la conexión y recarga.» o, en otro caso, «No se puede conectar con el servidor de salas. ¿Hay internet?».
- RF-4: CUANDO se abre el juego con un enlace de sala (`?sala=XXXX`), EL SISTEMA abre directamente la ventana de unirse con ese código y quita el código de la dirección; CUANDO el anfitrión comparte la sala, EL SISTEMA usa el menú de compartir del dispositivo y, si no lo hay, copia el enlace o, en último caso, muestra el código.
- RF-5: MIENTRAS la sala está en espera, EL SISTEMA muestra a todos la lista de jugadores (hasta 4) con su color y una etiqueta («Tú», «Crea la sala», «Máquina», «Conectado» o «Desconectado»), y la actualiza cada vez que alguien entra, sale o cambia.
- RF-6: MIENTRAS la sala está en espera, EL SISTEMA solo deja al anfitrión añadir máquinas (con el primer nombre libre de Rosa, Paco, Lola y Curro, o «Máquina»), quitar a cualquier jugador salvo a sí mismo (al quitado le avisa «Te han quitado de la sala.») y empezar la partida, solo con 2 jugadores o más.
- RF-7: SI la sala ya tiene 4 jugadores, o la partida ha empezado y el dispositivo que entra no tiene asiento, ENTONCES EL SISTEMA lo rechaza y lo devuelve al inicio con «La sala está llena.» o «La partida de esta sala ya ha empezado.».
- RF-8: CUANDO un dispositivo vuelve a entrar en una sala, EL SISTEMA lo reconoce por su identificador: en la sala de espera recupera su sitio con el nombre nuevo y, en la partida, su asiento.
- RF-9: CUANDO un invitado sale o se desconecta en la sala de espera, EL SISTEMA lo quita de la lista; CUANDO el anfitrión cierra la sala, EL SISTEMA devuelve a todos los invitados al inicio con «Se ha cerrado la sala.».
- RF-10: EL SISTEMA recuerda en cada invitado la última sala y su nombre, y muestra «Volver a la sala XXXX» en el inicio hasta que sale de ella, lo quitan o se cierra; y en el anfitrión con una partida en red guardada muestra «Reabrir la sala XXXX», que la reabre con el mismo código reintentando cada 3 s, hasta 40 veces, mientras el código siga ocupado.

## Requisitos no funcionales
- RNF-1: No hay cuentas ni servidor propio: el servidor público de salas solo sirve para encontrarse; los datos van directamente entre dispositivos.
- RNF-2: Si el módulo de red no se ha podido cargar, el inicio lo dice y el resto del juego funciona igual.
- RNF-3: El juego recuerda el último nombre usado en red y lo propone la próxima vez.
- RNF-4: Durante una partida en red, la pantalla se mantiene encendida si el dispositivo lo permite.

## Casos límite
- En red siempre hay al menos una persona: el anfitrión.
- Quien entra con el mismo dispositivo ocupa su sitio de antes, aunque sea desde otra pestaña (la conexión anterior se cierra).
- El tipo de partida y el nivel no se pueden cambiar después de crear la sala: hay que cerrarla y crear otra.
- Al quitar a alguien de la sala de espera, los colores de los siguientes se recolocan por orden.
- Un código escrito en minúsculas o con espacios se acepta: se normaliza.
- A quien se quita de la sala de espera puede volver a entrar con el mismo código (confirmado como intencionado el 10 de octubre de 2026).

## Fuera de alcance
- Sincronización del estado, jugadas, descartes y ofertas en red, desconexiones durante la partida y que la máquina juegue por alguien (spec 006).
- Conexión en redes muy cerradas: no hay servidor de retransmisión y se acepta que pueda fallar.

## Criterios de finalización
- Todos los RF comprobados a mano con dos navegadores con almacenamiento separado (por ejemplo `127.0.0.1` y `localhost`), según el punto 3 de «Antes de dar algo por terminado» de `AGENTS.md`.
- La normalización del código y el identificador del dispositivo (RF-2, RF-8) tienen tests de caracterización en `npm test`, y `npm test` termina en `OK`.

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026 (decisiones del propietario que el código actual **no** cumple; se harán con `/sdd-change 005` y entonces se añadirán los RF):
- **El anfitrión sale de la sala de espera** — hoy los invitados se quedan «Reintentando…» para siempre (`js/net.js:172-183`, `js/ui.js:1203`).
  Decisión: pasa a ser anfitrión el invitado que más tiempo lleve en la sala de espera.
- **Nombres repetidos** — hoy dos personas pueden llamarse igual (`js/ui.js:1086`, `js/ui.js:1105`).
  Decisión: dos personas no pueden llevar el mismo nombre en una sala.
