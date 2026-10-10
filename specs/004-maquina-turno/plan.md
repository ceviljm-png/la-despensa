# Plan 004 — Tests de caracterización de la máquina en su turno

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs anteriores (`node:test`, `test/helpers.js`, `npm test`).

Casi toda la spec está en la máquina (`js/ai.js`) y se prueba en Node. Solo **RNF-4** (las pausas entre jugadas) es de
la interfaz y se comprueba a mano. **RNF-1 y RNF-2** ya los cubre la simulación de `npm test` (27 combinaciones × 200
partidas, sin quedarse parada y siempre con ganador).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/maquina-turno.test.js` | nuevo | Tests de la spec 004 |
| `specs/004-maquina-turno/tasks.md` | — | Resultado de la comprobación a mano de RNF-4 |
| `js/*`, `package.json`, `test/helpers.js` | **sin cambios** | Las utilidades que hacen falta ya existen |

## Cómo se controla el azar

La máquina elige siempre la opción de mayor valoración **más un azar** (`Math.random() × máximo`, distinto para cada
opción). En los tests:

- con `withRandom(0)` el azar suma 0 a todas las opciones y la elección depende solo de la valoración;
- para RF-2 se usa una secuencia `[0, 0,99]`: la primera opción no recibe nada y la segunda casi el máximo. Con dos
  opciones que se diferencian en 1 punto, en Normal (máximo 0,3) gana la mejor y en Fácil (máximo 4) gana la otra.

## Cómo se preparan los casos

```
maquina(level, { mode = 'clasica', phase = 'main', n = 2 })
  Partida empezada (tablero vacío) en la que J1 es una máquina y tiene el turno; J0 es una persona.
  Las piezas, las manos y las cartas se colocan con put, road, setRes y darCarta.

valorCruce(g, v, conocidos)  — fórmula de la spec (Definiciones): suma de los puntos de probabilidad de sus parcelas
  productivas + 0,6 por recurso distinto + 1,2 por recurso que no está en `conocidos` (si se pasa) + 1 por puerto.
```

`valorCruce` reescribe en el test la definición de la spec, sin usar el código de `ai.js`: así se comprueba que la
máquina sigue esa definición.

## Tests (`test/maquina-turno.test.js`)

| RF | Test |
|---|---|
| RF-1 | Si a quien le toca es una persona, `AI.step` devuelve `false` y no cambia nada; en el turno de la máquina, en la fase de tirar, hace exactamente una acción (tira y pasa a `main`) |
| RF-1 | En la fase de descartar, descarta una máquina con descarte pendiente aunque no tenga el turno; si solo queda una persona por descartar, no hace nada |
| RF-2 | Con dos recursos para descartar que se diferencian en 1 carta y el azar `[0, 0,99]`: en Normal y Difícil descarta del que más tiene; en Fácil, del otro |
| RF-3 | En la colocación inicial planta en el cruce libre de mayor `valorCruce` (con el azar a 0) |
| RF-3 | Durante la partida, con sitio para dos huertas de distinto valor, planta en la de mayor valor |
| RF-3 | Con dos huertas propias y recursos para una bodega, amplía la de mayor valor sin la bonificación de recursos nuevos |
| RF-4 | Con dos lados posibles, uno que llega a un cruce libre y otro a un cruce ocupado, pone el camino en el primero |
| RF-5 | Con 5 sal y 3 vino y 4 cartas por descartar, descarta 3 sal y 1 vino (cada vez del que más tiene; en empate, el primero en el orden de recursos) |
| RF-6 | En la fase de tirar: con una huerta en la parcela del Cítrico y un Chef jugable, juega el Chef; sin Chef, o con Chef pero sin estar bloqueada, tira |
| RF-7 | Nunca mueve el Cítrico a una parcela con construcciones suyas; entre dos parcelas rivales elige la que más produce (por número y por bodega); roba a quien más puntos a la vista tiene y, a igualdad, a quien más cartas tiene |
| RF-8 | Con varias cartas jugables, juega primero el Chef; sin Chef, Obras antes que Buena cosecha; Buena cosecha pide lo que le falta para la huerta; Exclusiva solo si los rivales suman 3 o más de ese recurso |
| RF-8 (casos límite) | En Sencilla no compra ni juega cartas; si la banca no tiene lo que pediría con Buena cosecha, pasa a valorar Exclusiva; con 1 carta pedida, la segunda es la segunda más escasa (comportamiento confirmado) |
| RF-9 | Pudiendo pagar bodega y huerta, construye la bodega; pudiendo pagar huerta y carta, la huerta; con 8 cartas y sin nada mejor, se plantea comprar un camino |
| RF-10 | Si puede pagar el primer objetivo, lo construye; si no, pero le sobra lo bastante para cambiar 4:1 con la banca, hace un cambio; si la banca no tiene lo que le falta, no lo intenta; si no puede hacer nada, termina el turno |

## Lo que se comprueba a mano

- **RNF-4 (pausas).** En el navegador, una partida con máquinas: se mide el tiempo entre las líneas del historial que
  añaden las máquinas (con un observador del historial en la página) durante la colocación inicial (~0,5 s), durante la
  partida (~0,7 s) y con «Máquina: rápida» en el menú (~0,14 s). Sin errores nuevos en la consola.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `withRandom(0)` para quitar el azar | Repetir el test muchas veces y mirar la elección más frecuente | Determinista y rápido; si falla, falla siempre igual |
| Secuencia `[0, 0,99]` para medir el tamaño del azar (RF-2) | Leer el valor interno del azar | Ese valor es privado de `ai.js`; así se comprueba su efecto, que es lo que dice la spec |
| `valorCruce` escrito en el test a partir de la spec | Importar la función interna de `ai.js` | Las funciones de valoración no se exportan, y usar la misma función no comprobaría nada |
| Casos pequeños para RF-4 (camino) en vez de la fórmula completa | Reescribir toda la valoración de caminos | La regla principal (preferir el cruce libre) queda fijada sin duplicar una fórmula larga |
| RNF-1 y RNF-2 con la simulación existente | Tests nuevos | Ya se comprueban en 5.400 partidas en cada `npm test` |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en las specs anteriores: en cada tarea se cambia a propósito el valor esperado, se ve fallar el test y se
  restaura. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1 a RF-10 y RNF-3 automáticos; RNF-1 y RNF-2 con la simulación; RNF-4 a mano.
