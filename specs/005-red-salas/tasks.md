# Tareas 005 — Tests de caracterización de las salas en red

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado (cada cambio por
separado sobre el archivo original), restaurarlo y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Códigos de sala e identificador del dispositivo.** RF-1, RF-2, RF-8
  - Crear `test/red-salas.test.js` con: `cleanCode` (mayúsculas, solo letras, 4, vacío); `randomCode` (4 letras, sin I
    ni O, salen las demás); `deviceId` con almacenamiento (crea, guarda, reutiliza, sustituye uno inválido) y sin él
    (en memoria, estable).
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 172 tests anteriores siguen en verde.

- [x] **T2. PeerJS de mentira, crear y reabrir sala.** RF-1, RF-10
  - Crear `test/fake-peer.js` con sus propios tests mínimos; tests de `Room.open`: nombre `ladespensa-XXXX` y código
    devuelto; código ocupado → otro código al momento, hasta 6 veces más, y a la 7.ª rechaza; otro error rechaza
    enseguida; con código, reintenta el mismo cada 3 s hasta 40 veces (relojes simulados).
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T3. Unirse y el anfitrión.** RF-2, RF-8, RF-9
  - Tests de `Room.join` (destino normalizado, saludo, aviso de en línea, `timeout` a los 15 s, error del servidor) y del
    anfitrión (saludo válido → `onJoin`; saludos inválidos ignorados; el mismo dispositivo por otra conexión sustituye y
    cierra la anterior; cierre → `onLeave`, salvo si ya se había sustituido).
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T4. Salas en el navegador y cierre.** RF-1 a RF-10, RNF-1 a RNF-4
  - Las comprobaciones a mano del plan con `localhost` y `127.0.0.1`: primero las que no necesitan conexión y, si la red
    lo permite, las de dos dispositivos. Anotar aquí el resultado (y lo que no se haya podido probar) y actualizar
    `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T4) — 10 de octubre de 2026

Navegador integrado (375 px) en `http://localhost:8130`, con `http://127.0.0.1:8130` como segundo origen, y Chrome
real (MCP de Chrome DevTools) para descartar el navegador.

**1. Sin conexión entre dispositivos — todo correcto:**
- «Unirse» sin nombre → «Escribe tu nombre.»; el código se normaliza al escribir («a1b» → «AB»); con 2 letras →
  «El código tiene 4 letras.» (RF-2).
- Un código que no existe: «Conectando…» con los botones desactivados y, al rato, «No hay ninguna sala abierta con ese
  código.» con la ventana abierta para reintentar y sin recordar ninguna sala (RF-3). El servidor público de salas
  responde desde este equipo.
- `?sala=ab-cd` abre «Unirse a una sala» con «ABCD», limpia la dirección y propone el último nombre usado, «Ana»
  (RF-4, RNF-3).
- Con una sala recordada y una partida en red guardada, el inicio muestra «Volver a la sala WXYZ» y «Reabrir la sala
  KLMN» (RF-10).
- Sin PeerJS (`window.Peer` quitado): el inicio avisa «No se ha podido cargar el módulo de red: comprueba la conexión y
  recarga la página.», «Crear sala» solo muestra el aviso y la partida local sigue funcionando (RNF-2).
- «Crear sala» muestra «Partida clásica, con máquinas en nivel normal. Lo puedes cambiar en el inicio antes de
  crearla.» y, al crearla, la sala de espera con el código (DDPQ), «Ana — Tú», «Empezar la partida» desactivado y «Hace
  falta al menos otro jugador (persona o máquina).» (RF-1, RF-5, RF-6 en parte).

**2. Con dos dispositivos — no se ha podido probar:** el invitado no llega a conectar con el anfitrión y, a los 15 s,
muestra «La sala no responde. Comprueba el código y que quien la creó tenga el juego abierto.». El servidor de salas sí
encuentra la sala (si no, el mensaje sería «No hay ninguna sala abierta…»), pero la conexión directa no se abre. Pasa
igual con el anfitrión en el navegador integrado y el invitado en Chrome real, y con los dos en Chrome real: es la red
de este equipo (en `MEMORY.md` ya constaba que una VPN bloquea WebRTC), no el navegador.
**Queda pendiente**, para probar con móviles en otra red: unirse, etiquetas de la sala de espera con dos personas,
añadir y quitar máquinas, quitar a un invitado («Te han quitado de la sala.»), volver a entrar, sala llena y cerrar la
sala («Se ha cerrado la sala.») — RF-5 a RF-9 y RNF-4. La lógica de `net.js` que hay debajo sí está cubierta por los
tests automáticos (T2 y T3).

Consola: solo los errores ya conocidos del service worker del navegador integrado.

## Cambio del 10 de octubre de 2026 — RF-11, RF-12 y RF-13

- [x] **T5. Reglas `nameTaken` y `takeover`.** RF-11, RF-12, RF-13
  - Tests en `test/red-salas.test.js` (en rojo) y las dos funciones en `js/check.js`.
  - Hecho cuando: los tests pasan con `npm test` y los 216 anteriores siguen en verde.
- [x] **T6. Nombres repetidos en el anfitrión.** RF-13
  - `hostJoin` usa `nameTaken` en la sala de espera: quita de la lista al que ya estaba y lo echa con el aviso.
  - Hecho cuando: `npm test` termina en `OK` y `ui.js` no tiene errores de sintaxis.
- [x] **T7. Relevo del anfitrión.** RF-11, RF-12
  - El invitado guarda la lista; `programarRelevo`, `intentarRelevo` y `cancelarRelevo` según el plan; `leaveNet` cancela.
  - Hecho cuando: `npm test` termina en `OK` y `ui.js` no tiene errores de sintaxis.
- [x] **T8. Comprobación en el navegador y cierre.** RF-11, RF-12, RF-13
  - Las comprobaciones a mano del plan con el PeerJS de mentira; anotar aquí el resultado; spec en «implementada»;
    `MEMORY.md` al día.
  - Hecho cuando: el resultado está anotado aquí, `MEMORY.md` está al día y `npm test` termina en `OK`.

### Resultado de la comprobación a mano (11 de octubre de 2026)

En el navegador integrado, con un PeerJS de mentira instalado en la página (un anfitrión y otros invitados simulados):

| Comprobación | RF | Resultado |
|---|---|---|
| Lista Marta (anfitriona), Pepe (esta página), Bea y la máquina Rosa; Marta desaparece. Pepe abre la sala con el mismo código al momento, ve «Tú», Bea «Desconectado», Rosa «Máquina» y los botones de anfitrión; el aviso de reconexión se oculta | RF-11 | Correcto |
| Bea vuelve a entrar: aparece «Conectado» y recibe la lista nueva (Pepe, Bea, Rosa), con la misma partida Completa y nivel Difícil | RF-11 | Correcto |
| Lista Marta, Juan, Pepe y la máquina Lola; Marta y Juan desaparecen. A los 7 s Pepe sigue esperando con el aviso de reconexión; a los 17 s lleva la sala, con Lola y sin Juan | RF-12 | Correcto |
| Marta desaparece y vuelve a los 4 s: Pepe reconecta como invitado y no hay relevo (a los 20 s sigue «Esperando a que Marta empiece…») | RF-11 | Correcto |
| Con Pepe de anfitrión: « bea » y «ROSA» reciben «Ya hay alguien llamado Bea/Rosa en la sala. Elige otro nombre.» y se cierra su conexión; «Béa» entra; Bea con su mismo dispositivo vuelve sin chocar consigo misma | RF-13 | Correcto |
| Invitado rechazado por nombre: vuelve al inicio con el aviso, sin sala recordada | RF-13 | Correcto |

Consola: solo los errores ya conocidos del service worker del navegador integrado. Sin cambios visuales nuevos (se reutilizan
la sala de espera de anfitrión y el aviso de reconexión). Pendiente: probarlo con dos móviles reales.
