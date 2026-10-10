# Plan 003 — Tests de caracterización de la máquina ante los cambios

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs anteriores (`node:test`, `test/helpers.js`, `npm test`).

Toda esta spec está en la máquina (`js/ai.js`), que corre en Node: **todos los RF se prueban automáticamente** y no hace
falta comprobación a mano (la oferta de la máquina a una persona ya se vio en el navegador en la spec 002).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/maquina-ofertas.test.js` | nuevo | Tests de la spec 003 |
| `js/*`, `package.json`, `test/helpers.js` | **sin cambios** | Las utilidades que hacen falta ya existen |

## Cómo se preparan los casos

```
juez(level, { mano de la máquina, puntos visibles de quien propone, mode })
  Partida de 2 en la fase de construir con el nivel pedido; J1 es la máquina que valora y J0 quien propone.
  La mano de J1 se fija con setRes; los puntos de J0 se consiguen con bodegas y huertas reales (spread).
  Devuelve g; cada test llama a AI.judge(g, 1, { from: 0, give, get }).

proponente(level, mano, mode = 'completa')
  Partida de 2 en la fase de construir en la que J1 (máquina) tiene el turno, una huerta en el cruce 20, un camino
  de 2 lados hasta el cruce 12 (sitio libre para otra huerta) y la mano pedida. Cada test llama a AI.step(g).
  Con esta preparación los objetivos de la máquina son, en orden: bodega (2 trigo, 3 vino), huerta (1 de aceite,
  sal, pescado y trigo) y carta de cocina (1 pescado, 1 trigo, 1 vino).
```

Las manos de `proponente` se eligen para que solo haya **un** recurso sobrante posible, así el azar de la máquina
(que solo decide entre empates) no cambia el resultado y los tests son deterministas en los tres niveles.

## Tests (`test/maquina-ofertas.test.js`)

| RF | Test |
|---|---|
| RF-1 | En los tres niveles, si la máquina no tiene lo que se le pide, rechaza con `sin` (aunque la oferta sea muy generosa) |
| RF-2 | Fácil acepta si recibe tantas o más cartas de las que entrega (1 por 1, 2 por 1) y rechaza con `poco` si recibe menos (1 por 2) |
| RF-2 (casos límite) | Fácil acepta aunque quien propone esté a punto de ganar y aunque se quede sin la última carta de un recurso |
| RF-3 | En Normal y Difícil, con quien propone a 8 puntos a la vista en una partida a 10, rechaza con `lider`; con 7, no; en Sencilla (a 8), el límite es 6; las Estrellas de quien propone no cuentan |
| RF-4 | Difícil rechaza con `poco` una oferta de 1 por 2 aunque no le quite nada escaso |
| RF-5 | Difícil rechaza con `ultima` y el recurso si se quedaría sin él (tiene 1 sal y le piden 1 sal) |
| RF-6 | Difícil rechaza con `sobra` y el recurso si ya tiene 3 o más de lo que le dan |
| RF-5/6 (caso límite) | Con varios motivos, gana el primer recurso en el orden aceite, sal, pescado, trigo, vino: pedir aceite (última) y dar vino (sobra) → `ultima` de aceite; pedir vino (última) y dar aceite (sobra) → `sobra` de aceite |
| RF-7 | Normal acepta todo lo que acepta Difícil; el ejemplo de la spec: con 1 vino y 0 trigo, 1 trigo por 1 vino → `poco`; 2 trigo por 1 vino → acepta; y una oferta que Difícil rechaza por `sobra` pero Normal acepta porque compensa |
| RNF-2 | En 2.000 estados y ofertas al azar (manos de 0 a 4, ofertas de 1 a 2 cartas por lado), siempre que Difícil acepta, Normal también |
| RNF-1 | La misma oferta en el mismo estado da la misma respuesta aunque cambie `Math.random` (`withRandom` con 0 y con 0,99), en los tres niveles |
| RF-8 | En Completa, con aceite, sal y vino (le falta 1 trigo para la huerta), la máquina propone `{ from: 1, give: { vino: 1 }, get: { trigo: 1 } }` y queda marcado que ya ha propuesto; igual en los tres niveles |
| RF-8 (caso límite) | Si le faltan 2 cartas (pescado y trigo), pide solo 1: la primera en el orden de recursos (pescado) |
| RF-9 | No propone si puede pagar un objetivo anterior (construye), si le faltan más de 2 cartas para todos o si no le sobra nada que dar |
| RF-9 | En Clásica no propone nunca (no hay cambios entre jugadores) |
| RF-10 | Tras proponer una vez, en el mismo turno ya no vuelve a proponer aunque siga faltándole lo mismo |

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Puntos de quien propone con construcciones reales (`spread`) | Cambiar a mano `huertas`/`bodegas` | Los puntos se calculan de las piezas colocadas y así los invariantes siguen valiendo |
| Manos con un único sobrante en los tests de proponer | Fijar `Math.random` | El azar se usa en varias decisiones de la máquina; con un único candidato el resultado no depende del orden interno |
| Propiedad sobre 2.000 casos al azar para RNF-2 | Unos pocos ejemplos | Es una propiedad «en cualquier estado»: un barrido amplio la cubre mucho mejor y sigue tardando milisegundos |
| Sin comprobación a mano | Repetir en el navegador la oferta de la máquina | Ya se comprobó en la spec 002 (T4, punto 3) y aquí no hay nada de interfaz |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en las specs anteriores: en cada tarea se cambia a propósito el valor esperado, se ve fallar el test y se
  restaura. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1 a RF-10 y RNF-1 a RNF-3 automáticos.
