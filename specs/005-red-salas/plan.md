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
