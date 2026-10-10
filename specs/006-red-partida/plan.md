# Plan 006 — Cambio de seguridad en la partida en red

Spec: [spec.md](spec.md) (aprobada, cambio en curso). Cubre los RF que cambian: **RF-4** (órdenes del anfitrión),
**RF-11** (estado en el invitado) y **RNF-3** (nada de otro dispositivo se interpreta como código). El resto de la spec
(RF-1 a RF-3, RF-5 a RF-10) ya está implementado y no se toca; se vuelve a comprobar que sigue funcionando.

## Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `js/check.js` | **nuevo** | Comprobaciones sin DOM de lo que llega de otro dispositivo: `order` (órdenes), `resMap` (cantidades de recursos), `int` (enteros) y `state` (forma del estado). Expone `window.DespensaCheck`; en Node, `module.exports` | RF-4, RF-11, RNF-3 |
| `js/ui.js` | modificar | `apply()` usa `Check.order` en vez de su tabla propia; `adopt()` usa `Check.state`; `int` y `resMap` se quitan de aquí y se usan los de `check.js` | RF-4, RF-11 |
| `index.html` | modificar | Cargar `js/check.js` después de `js/engine.js` y antes de `js/ai.js` | — |
| `sw.js` | modificar | Añadir `js/check.js` a `FILES` y subir `CACHE` a `la-despensa-v3` (norma de `AGENTS.md`; el test de la spec 007 lo vigila) | — |
| `test/red-partida.test.js` | **nuevo** | Tests de `check.js` | RF-4, RF-11, RNF-3 |
| `test/partida-local.test.js` | modificar | El test de activación del service worker usa ahora la caché `la-despensa-v3` | — |
| `AGENTS.md` | modificar | Añadir `js/check.js` a «Estructura» y al orden de carga | — |
| `MEMORY.md` | modificar | Estado de la spec, decisión tomada y deuda resuelta | — |

`js/engine.js`, `js/ai.js` y `js/net.js` no cambian.

## Funciones de `js/check.js` (puras: reciben todo lo que usan)

Las listas del juego (`RES`, `MODES`, `LEVELS`, `DEV_INFO`, `GEO`) se toman del motor (`window.Despensa` o
`require('./engine.js')`), igual que hace `ai.js`.

```
int(x) → x si es un número entero (typeof 'number' y Number.isInteger); si no, null
  Antes: Number(x), así que null, '', [] y true contaban como 0 o 1, y '3' como 3.

resMap(m) → { aceite, sal, pescado, trigo, vino }
  Igual que hoy (sin cambio de comportamiento): cada cantidad se redondea hacia abajo y se deja entre 0 y 99;
  lo que no es número cuenta como 0; si m no es un objeto, todo 0.

order(cmd, args) → { cmd, args } normalizada, o null si no es una jugada válida            (RF-4)
  JUGADAS = tabla propia (sin prototipo: Object.create(null), o comprobada con Object.hasOwn):
    placeSetupHuerta, placeSetupRoad, buildHuerta, buildBodega, buildRoad, moveCritic, steal → [entero]
    roll, endTurn, buyDev                                                                     → []
    discard   → [entero (asiento), recursos]
    playDev   → [tipo de carta (texto), argumento]      el argumento como hoy: lista → sus 2 primeros como texto;
                                                         texto → texto; otra cosa → sin argumento
    bankTrade → [texto, texto]                           como hoy: String(a[0]), String(a[1])
  si cmd no es un texto o no está en JUGADAS → null
  a = args si es una lista; si no, []
  para cada entero que pide la jugada: v = int(a[i]); si v es null → null
  devuelve { cmd, args: [valores normalizados] }

state(s) → true si el estado tiene la forma permitida; false si no                          (RF-11)
  objeto con: version 1; mode en MODES; level en LEVELS (o ausente); phase en la lista de fases
  players: lista de 2 a 4; cada uno con
    name texto · ai booleano · color entero 0..3 · device texto o null · away (si está) booleano
    res: cada recurso entero 0..19 · dev: lista de { type en DEV_INFO, turn entero ≥ 0 }
    chefs 0..14 · roads 0..15 · huertas 0..5 · bodegas 0..4 · road 0..15 (enteros)
  hexes: 19 elementos { res en RES o null, num entero (0 si es el Erial; si no, uno de los números del juego) }
  ports: lista de hasta 9 { edge entero 0..71, type '3:1' o un recurso }
  critic: entero 0..18 · bank: cada recurso entero 0..19 · deck: lista de hasta 25 tipos de carta
  builds: 54 elementos null o { p jugador válido, t 1 o 2 } · roads: 72 elementos null o jugador válido
  current: jugador válido · turn entero ≥ 0 · dice: null o [1..6, 1..6]
  winner: null o jugador válido · longest y army: { p null o jugador válido, len/size entero ≥ 0 }
  freeRoads 0..2 · stealFrom: lista de jugadores válidos · pending: { asiento válido: entero ≥ 0 }
  setup: { order: lista de jugadores válidos, idx entero ≥ 0, step 'huerta' o 'camino', last null o cruce 0..53 }
  log: lista de { text texto, p null o jugador válido }
  lastSteal: null o { from y to jugadores válidos, res en RES, turn entero ≥ 0 }
  net (si está): { room texto }
  Cualquier otra cosa → false. Los textos (nombres, historial) solo se comprueba que sean texto: se muestran
  escapados (RNF-3).
```

## Cambios en `js/ui.js`

```
apply(seat, cmd, args)                                                                       (RF-4)
  o = Check.order(cmd, args); si o es null → false
  si o.cmd es 'discard':
    si seat ≠ null y o.args[0] ≠ seat → false
    devuelve g.discard(...o.args)
  si seat ≠ null y seat ≠ s.current → false
  devuelve g[o.cmd](...o.args)          // o.cmd solo puede ser una jugada de la tabla
```
`hostMessage` ya contesta «Ahora no se puede.» cuando `apply` devuelve `false`: no cambia.
`hostTrade` y el mensaje `ask` del invitado usan `Check.resMap` y `Check.int` (en `ask`, los índices que no son
enteros ya se descartaban con `filter`; ahora `null` también se descarta).

```
adopt(m)                                                                                     (RF-11)
  si no Check.state(m.s) → return      // se ignora entero; si era el primero, el invitado sigue en la sala de espera
  ... (igual que hoy)
```

### Cómo se pinta en la interfaz
No cambia nada visible en una partida normal. Con un estado no válido, el invitado sigue viendo la copia anterior (o la
sala de espera) sin ningún aviso (decisión confirmada en la spec). Con una orden rechazada, el invitado ve el aviso que
ya existe, «Ahora no se puede.».

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Un archivo nuevo `js/check.js`, sin DOM | Dejar la validación dentro de `ui.js` | No se podría probar en Node (principio 4) y mezclaría lógica con interfaz (principio 3) |
| `check.js` separado del motor | Meterlo en `engine.js` | El motor tiene las reglas del juego; esto es comprobar mensajes de la red. Se carga igual que `ai.js` |
| Comprobar la **forma** del estado y rechazarlo entero | Escapar cada dato al pintarlo | Decisión del propietario: escapar dejaría ver datos sin sentido; además un único punto de control es más fácil de probar que decenas de plantillas |
| Tabla de jugadas sin prototipo (`Object.create(null)`) | Seguir con un objeto normal | Con un objeto normal, `toString`, `constructor` o `__proto__` existen y se ejecutan |
| `int` solo acepta números enteros (no textos como «3») | Seguir con `Number(x)` | La spec pide rechazar textos y vacíos; las órdenes del propio juego ya mandan números (`Number(...)` en los clics) |
| `resMap` sin cambios (recorta a 0..99) | Rechazar cantidades fuera de rango | La spec solo exige que estén entre 0 y 99, y el recorte ya lo garantiza; el motor vuelve a validar el descarte |
| Subir `CACHE` a `la-despensa-v3` | Mantener v2 | Hay un archivo nuevo que debe guardarse para jugar sin conexión (`AGENTS.md`) |

## Estrategia de tests

Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.

- **`test/red-partida.test.js`** (tests primero, en rojo, y después el código):
  - `int`: enteros sí; `null`, `undefined`, `''`, `'3'`, `1.5`, `true`, `[]`, `NaN` → `null`.
  - `resMap`: el mismo comportamiento de hoy (caracterización): redondeo, 0..99, no números → 0, sin objeto → todo 0.
  - `order` (RF-4): cada jugada válida devuelve sus argumentos normalizados; `toString`, `__proto__`, `constructor`,
    `hasOwnProperty`, `valueOf`, un nombre inventado y un `cmd` que no es texto → `null`; a cada jugada con número le
    falta / tiene `null`, `''`, `1.5` o texto → `null`; `roll` sin argumentos sí.
  - `state` (RF-11): el estado de partidas reales (nuevas, a mitad y terminadas, de los tres tipos, generadas con el
    motor y la máquina) → `true`; y una lista de estados estropeados, uno por cada campo que se pinta (por ejemplo
    `hexes[0].res = '<img src=x onerror=alert(1)>'`, `ports[0].type = '<b>x</b>'`, `players[0].chefs = '<i>'`,
    `builds[3] = { p: 9, t: 1 }`, `dice = [7, 1]`, `log[0].p = 5`, `critic = 19`, sin `players`…) → `false`; un nombre
    `<b>Ana</b>` → `true` (se mostrará como texto).
  - Propiedad: en 200 partidas simuladas, el estado es válido después de cada paso (el anfitrión nunca genera estados
    que el invitado rechace).
- **`test/partida-local.test.js`**: el test del service worker sigue pasando con la nueva caché y con `js/check.js` en
  la lista (si no se añade a `FILES`, el test de la lista falla: es la red de seguridad de la spec 007).
- **Simulación y resto de tests**: sin cambios; deben seguir en verde.
- **A mano en el navegador** (criterio de la spec), sin dos dispositivos: con un PeerJS de mentira instalado en la
  página (como `test/fake-peer.js`), un invitado recibe primero un estado con HTML en una parcela (sigue en la sala de
  espera, nada se ejecuta), después uno válido (entra en la partida) y después otro con HTML (sigue viendo el anterior);
  y un anfitrión recibe de un invitado de mentira las órdenes `toString`, `__proto__` y `buildRoad` sin número (contesta
  «Ahora no se puede.» y no hay errores en la consola). Una partida normal contra la máquina sigue funcionando.
