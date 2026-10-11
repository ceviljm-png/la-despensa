# Spec 005 — Salas en red: crear, unirse, sala de espera y volver

Estado: implementada (cambio del 10 de octubre de 2026: RF-11, RF-12 y RF-13 nuevos).

## Contexto y objetivo
Describe cómo se juntan varias personas, cada una con su dispositivo, antes y alrededor de una partida en red: crear
una sala con código, unirse, la sala de espera y cómo se vuelve a una sala tras salir o cerrar la app. Lo que pasa
durante la partida (sincronización, jugadas remotas, desconexiones) va en la spec 006.

**Cambio (10 de octubre de 2026).** Dos decisiones del propietario: si quien creó la sala se va mientras se espera a
empezar, la sala no se pierde (toma el relevo quien más tiempo lleva en ella), y en una sala no puede haber dos
jugadores con el mismo nombre.

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
- RF-11: SI quien creó la sala se desconecta mientras la sala está en espera (cierra la app o pierde la conexión, sin pulsar «Cerrar la sala»), ENTONCES EL SISTEMA convierte en anfitrión al invitado que lleva más tiempo en la sala, con el mismo código, el mismo tipo de partida y nivel y la misma lista de jugadores sin quien se ha ido, y los demás invitados vuelven a entrar solos en cuanto el código queda libre.
- RF-12: SI 15 s después de perder al anfitrión todavía no hay un anfitrión nuevo (porque quien debía tomar el relevo tampoco está), ENTONCES EL SISTEMA hace que lo intente el siguiente invitado por orden de llegada, y así sucesivamente.
- RF-13: SI alguien intenta entrar en una sala (o volver a ella) con un nombre que ya lleva otro jugador de la sala, persona o máquina, sin distinguir mayúsculas de minúsculas ni espacios al principio o al final, ENTONCES EL SISTEMA no lo deja entrar y lo devuelve al inicio con «Ya hay alguien llamado <nombre> en la sala. Elige otro nombre.».

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
- Relevo (RF-11, RF-12): el nuevo anfitrión ve «Tú» y los demás lo ven como «Crea la sala»; puede añadir y quitar máquinas y empezar la partida. Las máquinas que ya había se conservan.
- Relevo: mientras dura, los invitados ven el aviso que ya existe, «Se ha perdido la conexión con la sala. Reintentando…».
- Relevo: si el anfitrión se va y no queda ningún invitado (solo máquinas o nadie), no hay relevo y la sala desaparece.
- Relevo: si quien creó la sala vuelve a entrar con el mismo código, entra como un invitado más, al final de la lista.
- Relevo: «Cerrar la sala» sigue cerrándola para todos (devuelve a los invitados al inicio, RF-9); el relevo es solo cuando el anfitrión desaparece sin cerrarla.
- Nombres (RF-13): «ana» y « Ana » chocan con «Ana»; «Ána» no (los acentos sí distinguen).
- Nombres: un dispositivo que vuelve con su mismo nombre no choca consigo mismo; si vuelve con un nombre que ya lleva otro, no entra.
- Nombres: al añadir una máquina se sigue eligiendo un nombre libre (RF-6); una persona tampoco puede llamarse como una máquina de la sala.

## Fuera de alcance
- Sincronización del estado, jugadas, descartes y ofertas en red, desconexiones durante la partida y que la máquina juegue por alguien (spec 006).
- Conexión en redes muy cerradas: no hay servidor de retransmisión y se acepta que pueda fallar.
- Relevo del anfitrión durante la partida: la partida solo la tiene el anfitrión, que puede reabrirla (RF-10 y spec 006).
- Conservar en la lista a quien creó la sala si vuelve tras el relevo: entra como invitado.
- Nombres repetidos en una partida en un solo dispositivo (spec 007).

## Criterios de finalización
- Todos los RF comprobados a mano con dos navegadores con almacenamiento separado (por ejemplo `127.0.0.1` y `localhost`), según el punto 3 de «Antes de dar algo por terminado» de `AGENTS.md`.
- La normalización del código y el identificador del dispositivo (RF-2, RF-8) tienen tests de caracterización en `npm test`, y `npm test` termina en `OK`.
- La elección de quién toma el relevo (RF-11, RF-12) y la comparación de nombres (RF-13) tienen tests en `npm test`; el
  relevo y el rechazo por nombre se comprueban en el navegador con un PeerJS de mentira (la conexión real entre dos
  dispositivos sigue pendiente de probar con móviles).

## Dudas abiertas
Ninguna. Las dos decisiones del propietario del 10 de octubre de 2026 están en RF-11 a RF-13 y los casos límite.
Confirmado el mismo día: «Cerrar la sala» sigue cerrándola para todos (el relevo es solo si el anfitrión desaparece);
con un nombre repetido se vuelve al inicio con el aviso; y los nombres de las máquinas también cuentan.
