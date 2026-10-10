# Plan 001 — Tests de caracterización de la construcción, los puntos y la victoria

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs 009 y 000 (`node:test`, `test/helpers.js`, `npm test`).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/helpers.js` | ampliar | Tres utilidades para trazar caminos y repartir construcciones en el tablero |
| `test/construccion.test.js` | nuevo | Tests de la spec 001 |
| `specs/001-construccion-y-puntos/tasks.md` | — | Resultado de la comprobación a mano de RF-10 |
| `js/*`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` |

## Utilidades nuevas (`test/helpers.js`)

```
edgeBetween(a, b)  -> el lado que une los cruces a y b (falla si no son vecinos)

pathFrom(v, k, evita = [])  -> lista de k + 1 cruces que forman un camino simple de k lados desde v
  Búsqueda en profundidad determinista (siempre el primer vecino libre), sin pasar por los cruces de `evita`.
  Con los cruces se obtienen los lados con edgeBetween y se colocan con road().

spread(g, p, k, t = 1)  -> coloca k construcciones de p (huertas o bodegas) respetando la regla de distancia
  Recorre los cruces en orden y usa los que g.vertexFree(v) da por libres. Devuelve los cruces usados.
```

Con `enJuego` (spec 000) cada test parte de una partida empezada, con el tablero vacío, en la fase `main`, y coloca
solo lo que necesita. Las manos se fijan con `setRes`, que mantiene la banca cuadrada.

## Tests (`test/construccion.test.js`)

Cada `describe` lleva el RF en el nombre. Los rechazos se comprueban con `foto` (estado idéntico antes y después).
Al final de cada test que juega se llama a `checkInvariants` (RNF-1 y RNF-2).

| RF | Test | Cómo |
|---|---|---|
| RF-1 / RF-4 | Un camino junto a una huerta propia se acepta: el lado pasa a ser de J0, le queda un camino menos y 1 aceite y 1 sal vuelven a la banca | huerta con `put`, mano con `setRes` |
| RF-1 | Un camino que continúa otro camino propio (sin construcción en el cruce) se acepta | `road` + `buildRoad` |
| RF-1 | Se rechaza sin cambiar nada: sin recursos, sin caminos por colocar, en un lado ocupado, en un lado que no toca nada propio, y a través de un cruce con huerta rival aunque el camino propio llegue a él | `foto` |
| RF-2 / RF-4 | Una huerta en un cruce libre que toca un camino propio se acepta, cuesta 1 de aceite, sal, pescado y trigo y descuenta una huerta | — |
| RF-2 | Se rechaza sin cambiar nada: sin camino propio que llegue, junto a otra construcción (regla de distancia), en un cruce ocupado, sin recursos, sin huertas por colocar | `foto` |
| RF-3 / RF-4 | Ampliar una huerta propia: pasa a bodega, cuesta 2 trigo y 3 vino, descuenta una bodega y devuelve la huerta a las piezas | — |
| RF-3 | Se rechaza sin cambiar nada: en una huerta rival, en una bodega, en un cruce vacío, sin recursos, sin bodegas por colocar | `foto` |
| RF-1/2/3 | Construir fuera de la fase `main` se rechaza (por ejemplo en `roll`) | `foto` |
| RF-5 | Puntos: 2 huertas y 1 bodega valen 4; con la Gran Ruta y la Gran Brigada, 8; las Estrellas solo cuentan al pedir los puntos ocultos | `points(p, false)` y `points(p, true)` |
| RF-6 | Ruta: una línea de 4 caminos mide 4; con una rama, cuenta la rama más larga; una huerta propia en medio no la corta; una huerta rival en medio la corta en dos | `pathFrom` + `roadLength` |
| RF-7 | Con el 5.º camino seguido, J0 consigue la Gran Ruta (`longest = { p: 0, len: 5 }`) y el historial dice «J0 consigue la Gran Ruta (5 caminos): 2 puntos»; con 4 no | `buildRoad` como desencadenante |
| RF-7 | Si J1 iguala la ruta de J0, J0 la conserva; si la supera, pasa a J1 y el historial solo dice que J1 la consigue | — |
| RF-7 | Si J1 planta una huerta en medio de la ruta de J0 y nadie más llega a 5, la Gran Ruta queda libre y el historial dice «J0 pierde la Gran Ruta»; si al cortarla empatan dos rivales, también queda libre | `buildHuerta` de J1 |
| RF-8 | Al jugar el 3.er Chef se consigue la Gran Brigada (`army = { p, size: 3 }`) y se anota; con 2 no; un rival con los mismos chefs no la quita y con uno más sí | carta Chef preparada en la mano con `turn` anterior |
| RF-9 | Con 9 puntos, plantar una huerta en Clásica da la victoria: fase `over`, `winner`, «¡J0 gana la partida!»; en Sencilla basta con 8 | `spread` + `buildHuerta` |
| RF-9 | Comprar una Estrella con 9 puntos da la victoria (cuenta la Estrella oculta) | mazo preparado con la Estrella arriba |
| RF-9 | Quien llega a los puntos en el turno de otro no gana hasta que empieza su turno: al terminar J0 su turno, gana J1 antes de tirar | `endTurn` |
| RF-9 | Con la partida terminada no se acepta ninguna jugada (construir, tirar, terminar el turno) | `foto` |

## Lo que no se automatiza

- **RF-10** (botones de construir activados o no con su motivo, sitios marcados y cancelar) es de la interfaz. Se
  comprueba a mano igual que en la spec 000: un estado preparado en Node (persona en `main`, con recursos para camino y
  huerta pero no para bodega, y sin sitio para huerta) cargado con «Continuar partida». Se comprueba: «Bodega»
  desactivado con «Te faltan recursos», «Huerta» desactivado con «No tienes dónde» y «Camino» activo; al pulsar
  «Camino» solo se marcan los lados válidos, el botón dice «Cancelar» y la línea de estado «Toca dónde va el camino»;
  al volver a pulsarlo se cancela. A 375 px y en escritorio, sin errores nuevos en la consola.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Rutas trazadas con `pathFrom` (búsqueda determinista) | Elegir a mano los números de cruce | La geometría es fija pero sus índices no son evidentes; así el test dice «una línea de 5» y no depende de números mágicos |
| `buildRoad`/`buildHuerta` reales como desencadenantes de la Gran Ruta | Llamar directamente a `updateLongest()` | Fija el comportamiento observable (cuándo se recalcula), no un método interno |
| Puntos y victoria preparados con `spread` (construcciones reales en el tablero) | Cambiar a mano los contadores `huertas`/`bodegas` | Los puntos se calculan de las piezas colocadas: con el tablero coherente los invariantes siguen valiendo |
| La carta Chef preparada en la mano | Comprarla con `buyDev` | Comprar y jugar cartas es de la spec 008; aquí solo importa el efecto sobre la Gran Brigada |
| RF-10 a mano con un estado preparado | Automatizar la interfaz con un navegador sin cabeza | Sería añadir dependencias (principio 1 de la constitución) |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en las specs anteriores: en cada tarea se cambia a propósito el valor esperado, se ve fallar el test y se
  restaura. Nunca se toca `js/` para provocarlo.
- El test «pasa a J1 y el historial solo dice que J1 la consigue» fija el comportamiento que el propietario ha decidido
  cambiar (spec 001, pendiente de `/sdd-change`): cuando se haga el cambio, este test se actualizará junto con el código.
- Cobertura: RF-1 a RF-9 automáticos; RNF-1 y RNF-2 con `checkInvariants`; RNF-3 porque todo corre en Node; RF-10 a mano.
