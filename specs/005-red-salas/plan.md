# Plan 005 — Tests de caracterización de las salas en red

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs anteriores (`node:test`, `test/helpers.js`, `npm test`).

## Qué se puede probar en Node

La red tiene dos partes:

- **`js/net.js`** (sin DOM): códigos de sala, identificador del dispositivo y la clase `Room`, que habla con PeerJS.
  Se puede ejecutar en Node: al cargarse deja `Net` en `globalThis`. Para no usar la red de verdad, los tests ponen en
  `globalThis.Peer` un **PeerJS de mentira** (`FakePeer`) que deja provocar a mano los eventos (`open`, `error`,
  `connection`, `data`, `close`) y usan los **relojes simulados** de `node:test` (`mock.timers`) para los reintentos y
  los tiempos de espera, sin esperar de verdad.
- **El final de `js/ui.js`** (sala de espera, mensajes, botones del inicio): necesita el navegador y se comprueba a mano.

Esto va más allá de lo que pedían los criterios de la spec (solo RF-2 y RF-8 automáticos): como la red es la parte con
más riesgo, se automatiza todo lo que está en `net.js`.

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/fake-peer.js` | nuevo | PeerJS de mentira para los tests de red (también lo usará la spec 006) |
| `test/red-salas.test.js` | nuevo | Tests de la spec 005 |
| `specs/005-red-salas/tasks.md` | — | Resultado de la comprobación a mano |
| `js/*`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` (`fake-peer.js` no termina en `.test.js`) |

## PeerJS de mentira (`test/fake-peer.js`)

```
class FakePeer
  constructor(id?, opts)        guarda id y opciones; se apunta en FakePeer.todos
  on(evento, fn) / emit(evento, ...args)
  connect(idDestino, opts)      devuelve una FakeConn y la apunta en peer.conexiones
  destroy()                     marca destroyed = true
  reconnect()                   cuenta las reconexiones; disconnected = false
class FakeConn
  on / emit, send(m) (lo apunta en conn.enviados), close() (open = false y emite 'close'), open
instalar()   pone FakePeer en globalThis.Peer, vacía FakePeer.todos y devuelve una función para quitarlo
```

## Tests automáticos (`test/red-salas.test.js`)

| RF | Test |
|---|---|
| RF-2 | `Net.cleanCode` pasa a mayúsculas, quita lo que no sean letras y se queda con 4: «ab cd» → «ABCD», «a1b2c3d4e» → «ABCD», vacío o `null` → «» |
| RF-1 | `Net.randomCode(4)` da 4 letras sin I ni O (en 2.000 códigos, nunca aparecen esas letras y salen las demás) |
| RF-8 | `Net.deviceId`: con almacenamiento, crea 12 letras, las guarda y las reutiliza; si lo guardado no vale, lo cambia; sin almacenamiento, da uno en memoria que se mantiene durante la sesión |
| RF-1 | Crear sala: registra el nombre `ladespensa-XXXX` en el servidor de salas y, al abrirse, devuelve el código y pasa a ser anfitrión |
| RF-1 | Si el código está ocupado (`unavailable-id`), prueba otro código al momento, hasta 6 veces más; a la 7.ª, rechaza con `unavailable-id`; otro error rechaza enseguida |
| RF-10 | Reabrir una sala con su código: si sigue ocupado, reintenta **el mismo** código cada 3 s, hasta 40 veces |
| RF-2 | Unirse: se conecta a `ladespensa-` + el código normalizado, manda el saludo con el identificador y el nombre y, al abrirse, avisa de que está en línea; si en 15 s no se abre, rechaza con `timeout`; un error del servidor rechaza con su tipo (por ejemplo `peer-unavailable`) |
| RF-8 | En el anfitrión: un saludo con un identificador válido avisa de que alguien entra (`onJoin`); sin saludo válido (identificador mal formado, otro tipo de mensaje) se ignora; si el mismo dispositivo entra por otra conexión, la anterior se cierra y la nueva la sustituye |
| RF-9 | Cuando se cierra la conexión de un invitado, el anfitrión avisa de que se ha ido (`onLeave`); si ya se había sustituido por otra, no |

## Comprobación a mano

En el navegador, con dos orígenes con almacenamiento separado (`http://localhost:8130` y `http://127.0.0.1:8130`),
según el punto 3 de «Antes de dar algo por terminado» de `AGENTS.md`:

1. **Sin conexión entre los dos (siempre se puede comprobar):** unirse con un código de menos de 4 letras («El código
   tiene 4 letras.»), sin nombre («Escribe tu nombre.»), con un código que no existe («No hay ninguna sala abierta con
   ese código.» o el mensaje de tiempo agotado); abrir `?sala=abcd` abre la ventana de unirse con «ABCD» y limpia la
   dirección; el inicio muestra «Volver a la sala XXXX» si hay una sala recordada y «Reabrir la sala XXXX» si hay una
   partida en red guardada; con PeerJS sin cargar, el inicio avisa y el resto funciona.
2. **Con conexión (si la red del equipo lo permite):** crear sala, unirse desde el otro origen, etiquetas de la sala de
   espera, añadir y quitar máquinas, quitar a un invitado («Te han quitado de la sala.»), volver a entrar, cerrar la
   sala («Se ha cerrado la sala.»).

Si la conexión WebRTC no funciona en el equipo (en `MEMORY.md` consta que una VPN la bloqueaba), se anota y el punto 2
queda pendiente para probar con móviles, como ya está anotado en «Estado actual».

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| PeerJS de mentira para probar `Room` | Probar solo `cleanCode` y `deviceId` | La red es lo de más riesgo; con un doble se prueban reintentos, tiempos y saludos sin depender de internet |
| `mock.timers` de `node:test` | Esperar de verdad 3 s × 40 o 15 s | Los tests seguirían siendo de milisegundos |
| `fake-peer.js` en un archivo propio | Dentro del test | La spec 006 lo necesitará para probar la sincronización |
| La sala de espera y los mensajes a mano | Simular el DOM en Node | Sería añadir dependencias o mucho código de prueba (principio 1 de la constitución) |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Cada test se ve fallar cambiando a propósito lo esperado (cada cambio por separado sobre el archivo original) y se
  restaura. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1, RF-2, RF-8, RF-9 y RF-10 en su parte de `net.js`, automáticos; RF-3 a RF-7, RF-9 y RF-10 en su parte
  de interfaz y RNF-1 a RNF-4, a mano.

---

# Cambio del 10 de octubre de 2026 — RF-11, RF-12 y RF-13

## Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `js/check.js` | ampliar | Dos funciones puras: `nameTaken(jugadores, nombre, dispositivo)` y `takeover(jugadores, miDispositivo)` | RF-11 a RF-13 |
| `js/ui.js` | modificar | El invitado recuerda la última lista de la sala de espera; al perder al anfitrión programa el relevo; quien lo toma abre la sala con el mismo código y pasa a ser anfitrión; el anfitrión rechaza nombres repetidos | RF-11 a RF-13 |
| `test/red-salas.test.js` | ampliar | Tests de `nameTaken` y `takeover` | RF-11 a RF-13 |
| `js/net.js` | **sin cambios** | `Room.open(código)` ya reintenta cada 3 s mientras el código siga ocupado (RF-10), que es lo que necesita el relevo | — |

## Funciones puras (`js/check.js`)

```
nameTaken(jugadores, nombre, dispositivo) → el jugador que ya lleva ese nombre, o null                (RF-13)
  igual(a, b) = a.trim().toLowerCase() === b.trim().toLowerCase()      (los acentos sí distinguen)
  devuelve el primer jugador con igual(nombre) cuyo dispositivo no sea `dispositivo` (máquinas incluidas)

takeover(jugadores, miDispositivo) → null si no me toca; si me toca, { delay, players }               (RF-11, RF-12)
  jugadores = la lista de la sala de espera tal como llega a los invitados; el 0 es el anfitrión
  personas = jugadores sin el 0 y sin máquinas, en orden de llegada
  k = mi posición en personas; si no estoy → null
  delay = k × 15000 ms   (el primero, al momento; cada siguiente, 15 s después del anterior)
  players = [yo, …el resto sin el anfitrión ni las personas anteriores a mí (que no tomaron el relevo)],
            cada uno como { name, dev, ai }; las máquinas se conservan en su orden
```

## Cambios en `js/ui.js`

```
invitado, mensaje 'lobby'      → guardar la lista (guestLobby) además de pintarla
invitado, estado 'reconnecting' y sin partida empezada → programarRelevo()
invitado, estado 'online'      → cancelarRelevo()          (ha vuelto a conectar con un anfitrión)
leaveNet                       → cancelarRelevo(); guestLobby = null

programarRelevo()                                                                                   (RF-11, RF-12)
  r = Check.takeover(guestLobby.players, myDev); si es null o ya hay un relevo en marcha → nada
  relevo = { r, temporizador: setTimeout(intentarRelevo, r.delay) }

intentarRelevo()
  sala = new Net.Room(…); relevo.sala = sala
  intentar sala.open(mismo código)         // reintenta cada 3 s mientras el antiguo anfitrión siga ocupándolo
  si falla o se ha cancelado entretanto → cerrar esa sala y seguir como invitado (sus reintentos siguen)
  si se abre: cerrar la conexión de invitado; net = { anfitrión, sala, código }
              lobby = { players: r.players, mode y level de guestLobby }; olvidar la sala recordada de invitado
              lobbyChanged()                // la pinta («Tú») y la manda a los que vuelvan a entrar

anfitrión, saludo en la sala de espera                                                              (RF-13)
  otro = Check.nameTaken(lobby.players, nombre, dispositivo)
  si otro → quitar de la lista al que entra si ya estaba y echarlo con
            «Ya hay alguien llamado <otro.name> en la sala. Elige otro nombre.»
```

Mientras se intenta abrir la sala nueva, la conexión de invitado sigue reintentando: si el anfitrión de antes vuelve
(solo había perdido la conexión un momento), el invitado reconecta, se cancela el relevo y no pasa nada más.

### Cómo se pinta
- El nuevo anfitrión ve la sala de espera de anfitrión (código, «Tú», añadir máquina, empezar); quien aún no ha vuelto
  aparece como «Desconectado» hasta que entra (y se le puede quitar con ✕).
- Durante el relevo, los invitados ven el aviso que ya existe («Se ha perdido la conexión…»).
- El nombre repetido llega al invitado como cualquier otro rechazo: vuelve al inicio con el aviso.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Esperas escalonadas de 15 s por orden de llegada | Que todos lo intenten a la vez | Ganaría uno al azar, no el que más tiempo lleva (RF-11) |
| Cada invitado decide con la última lista recibida | Que el anfitrión deje elegido un sucesor | Si el anfitrión desaparece de golpe no puede avisar de nada; la lista ya la tienen todos |
| Mantener la conexión de invitado mientras se intenta el relevo | Cerrarla antes | Si el anfitrión solo había tenido un corte, el invitado vuelve a él y no hay relevo indebido |
| `takeover` y `nameTaken` en `check.js` | Dentro de `ui.js` | Para probarlas en Node (principio 4) |

## Estrategia de tests
- `npm test` (de `AGENTS.md`), tests primero y en rojo:
  - `nameTaken`: mismo nombre con otras mayúsculas o espacios → choca; con un acento distinto → no; el mismo dispositivo
    → no choca consigo mismo; una máquina con ese nombre → choca; lista vacía → null.
  - `takeover`: el invitado más antiguo → espera 0 y lista con él primero, sin el anfitrión y con las máquinas; el
    segundo → 15 s y sin el primero; una máquina, un dispositivo que no está o el anfitrión → null.
- A mano en el navegador con el PeerJS de mentira: el invitado más antiguo pierde al anfitrión y pasa a llevar la sala
  con la misma lista y las máquinas; otro invitado de mentira vuelve a entrar y aparece conectado; un invitado que no es
  el primero espera y toma el relevo a los 15 s si nadie lo ha hecho; un saludo con «ana» cuando ya está «Ana» recibe el
  rechazo, y en el invitado ese rechazo le devuelve al inicio con el aviso. Sin errores en la consola.
