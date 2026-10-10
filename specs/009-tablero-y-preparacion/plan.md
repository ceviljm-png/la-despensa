# Plan 009 — Tests de caracterización del tablero y la preparación

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Fija lo que hace hoy el motor para poder cambiar código después sin romperlo. Es el primer plan de la red de
seguridad, así que también monta las utilidades de test que usarán los siguientes (000, 001, 008, 002…).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/helpers.js` | nuevo | Utilidades compartidas por todos los tests de caracterización (sin DOM) |
| `test/tablero.test.js` | nuevo | Tests de la spec 009 |
| `package.json` | modificar el script `test` | Ejecutar primero los tests de caracterización y después la simulación |
| `AGENTS.md` | modificar «Comandos» | Contar que `npm test` ejecuta las dos cosas y cómo lanzar solo una |
| `js/*` | **sin cambios** | — |

## Herramienta: el ejecutor de tests de Node

Se usan `node:test` y `node:assert/strict`, que vienen con Node (v26 en el equipo de desarrollo). No es una
dependencia nueva ni hay que instalar nada, así que cumple el principio 1 de la constitución.

```
"test": "node --test test/*.test.js && node test/sim.js"
```

- Se nombran los archivos explícitamente (`*.test.js`): sin patrón, `node --test` también ejecutaría `test/sim.js`
  y `test/helpers.js` como si fueran tests.
- La simulación va al final, así que `npm test` sigue terminando en `OK` como pide `AGENTS.md`.
- Solo los tests nuevos: `node --test test/*.test.js`. Solo la simulación: `node test/sim.js [partidas]`.

## Utilidades (`test/helpers.js`)

Funciones puras o con el azar como parámetro. Las dependencias (el estado y el azar) entran por argumento; no se
lee nada global salvo `Math.random`, que se restaura siempre.

```
withRandom(fuente, fn)
  fuente: número fijo, lista de números (se recorre en bucle) o función
  guarda Math.random, lo sustituye, ejecuta fn() y lo restaura en un finally; devuelve lo que devuelva fn

newGame({ mode = 'clasica', level = 'normal', n = 2, ai = false })
  Game.create con n jugadores llamados J0..J(n-1)

vertsOfHex(i)          -> los 6 cruces de la parcela i (de GEO)
hexesOfVert(v)         -> parcelas que tocan el cruce v
edgesOfVert(v)         -> lados que salen del cruce v
findVert(pred)         -> primer cruce que cumple pred(v), o lanza un error con descripción
setRes(g, p, mapa)     -> fija la mano de p y ajusta la banca para que cada recurso siga sumando 19
put(g, v, p, t = 1)    -> coloca a mano una huerta (t=1) o bodega (t=2) de p y descuenta su pieza
road(g, e, p)          -> coloca a mano un camino de p y descuenta su pieza
playSetup(g, jugadas)  -> recorre la colocación inicial con [{ v, e }, …] usando las acciones reales
                          del motor; falla en cuanto una devuelve false
checkInvariants(g)     -> los mismos invariantes de sim.js (recursos = 19, piezas, distancia, mazo ≤ 25)
```

`setRes`, `put` y `road` sirven para preparar estados en las specs siguientes. Los de esta spec usan sobre todo las
acciones reales del motor, porque lo que se caracteriza es precisamente la colocación.

## Tests (`test/tablero.test.js`)

Cada `describe` lleva el RF en el nombre para encontrar el test desde la spec y al revés.

| RF | Test | Cómo |
|---|---|---|
| RNF-1 | La isla tiene 19 parcelas, 54 cruces y 72 lados; los 9 lados de puerto son de costa (1 parcela) y distintos | `GEO` |
| RF-1 | Composición: 4 aceite, 4 pescado, 4 trigo, 3 sal, 3 vino y 1 Erial; números = la lista de 18; el Erial tiene número 0 | 300 partidas nuevas |
| RF-1 | Nunca un 6 u 8 vecino de otro 6 u 8 | las mismas 300 partidas, recorriendo `GEO.hexes[i].adj` |
| RF-1 | El reparto cambia entre partidas | al menos 2 repartos distintos en 20 partidas |
| RF-2 | Clásica y Completa: 9 puertos en `GEO.portEdges`, en ese orden, con tipos {3:1 ×4, aceite, sal, pescado, trigo, vino} | una partida de cada |
| RF-2 | Sencilla: sin puertos, y la proporción de cambio es 4 para todos los recursos | `tradeRatio` |
| RF-3 | Cítrico en el Erial; banca 19 de cada; manos vacías; 15 / 5 / 4 piezas; sin cartas de cocina en mano; fase `setup` | partida nueva |
| RF-3 (caso límite) | Un nivel inexistente se guarda como `normal`; el estado lleva `version: 1` | `Game.create({ level: 'imposible' })` |
| RF-4 | Orden en serpiente: con 2 jugadores [a, b, b, a]; con 4 [a, b, c, d, d, c, b, a], y empieza `order[0]` | estructura de `setup.order` |
| RF-4 | Quién empieza es al azar: en 200 partidas de 4 empieza cada asiento alguna vez | propiedad |
| RF-5 | Primera huerta sin camino: aceptada en un cruce libre; el turno pasa a pedir camino | `placeSetupHuerta` |
| RF-5 / RF-8 | Mientras toca huerta, un camino se rechaza; mientras toca camino, otra huerta se rechaza | estado sin cambios (comparar JSON antes y después) |
| RF-5 / RF-8 | El camino debe salir de la huerta recién puesta: un lado lejano se rechaza y uno de sus lados se acepta | `placeSetupRoad` |
| RF-5 / RF-8 | Regla de distancia: un cruce vecino de una huerta ya puesta se rechaza | `placeSetupHuerta` |
| RF-5 | La colocación no cuesta nada: tras la primera vuelta las manos siguen vacías y la banca intacta | `playSetup` |
| RF-6 | La segunda huerta da 1 carta por parcela productiva que toca: se elige un cruce de 3 parcelas productivas y se comprueba mano, banca y el texto «recibe» del historial | `findVert` + `playSetup` |
| RF-6 (caso límite) | Un cruce que toca el Erial no recibe nada de él; uno de costa con 1 parcela recibe 1 carta | `findVert` |
| RF-7 | Tras el último camino: fase `roll`, turno 1, tiene el turno `order[0]`, cada jugador tiene calculada su ruta y el historial dice «Empieza la partida. Turno de <nombre>» | `playSetup` completo |
| RF-8 | Terminada la colocación, `placeSetupHuerta` y `placeSetupRoad` devuelven `false` | — |
| — | Tras cada test que juega, `checkInvariants` se cumple | — |

Para elegir cruces válidos en `playSetup` se usa `g.settlementSpots(p, true)` y se filtran con `findVert`/`hexesOfVert`,
así los tests no dependen del reparto al azar del tablero.

## Lo que no se automatiza

- **RF-9** (cómo se dibuja el tablero) y **RF-10** (marcas y textos durante la colocación) son de la interfaz, que
  necesita el navegador. Se comprueban a mano: partida nueva a 375 px y en escritorio, sin errores en la consola,
  con 6 y 8 en rojo, puntitos según el número, puertos con «3:1» o «2:1» y solo cruces y lados válidos marcados.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `node:test` y `node:assert`, que vienen con Node | Mini-ejecutor propio como `sim.js`, o Jest/Vitest | No añade dependencias (principio 1); da nombres de test, informe de fallos y filtros sin escribir infraestructura |
| Propiedades sobre muchas partidas (RF-1, RF-4) | Forzar el reparto sustituyendo `Math.random` por una secuencia | La secuencia depende de cuántas veces llama el motor al azar y del orden interno: el test se rompería con cualquier cambio inocente |
| `withRandom` solo cuando un resultado concreto lo exige (en las specs siguientes: dados, robos) | Semilla global para todo `npm test` | Los tests siguen siendo independientes y no hay que tocar el motor para inyectar un generador |
| Comparar el estado en JSON antes y después para «rechaza sin cambiar nada» | Comprobar campos sueltos | El estado es JSON plano (principio 3): la comparación completa es simple y no se deja nada |
| La simulación se queda como está y se ejecuta después | Reescribirla con `node:test` | No hace falta para esta spec; el plan solo añade |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Como los tests caracterizan código que ya existe, **pasan a la primera**. Para cumplir «tests primero, en rojo»,
  en cada tarea se comprueba que el test sabe fallar: se cambia temporalmente el valor esperado (por ejemplo 18 en vez
  de 19 parcelas), se ve el fallo y se restaura. Nunca se toca `js/` para provocarlo.
- Cobertura de la spec: RF-1 a RF-8 y RNF-1 automáticos; RF-9 y RF-10 a mano; RNF-2 queda cubierto porque todo
  corre en Node sin navegador.
