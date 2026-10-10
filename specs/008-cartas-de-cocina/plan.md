# Plan 008 — Tests de caracterización de las cartas de cocina

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs anteriores (`node:test`, `test/helpers.js`, `npm test`).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/helpers.js` | ampliar | Una utilidad para pasar una carta del mazo a la mano |
| `test/cartas.test.js` | nuevo | Tests de la spec 008 |
| `specs/008-cartas-de-cocina/tasks.md` | — | Resultado de la comprobación a mano de RF-9 y RF-10 |
| `js/*`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` |

## Utilidad nueva (`test/helpers.js`)

```
darCarta(g, p, type, turn = g.s.turn - 1)
  Saca del mazo una carta del tipo pedido y la pone en la mano de p con ese turno de compra
  (por defecto, comprada en el turno anterior, así que ya se puede jugar). Falla si no quedan de ese tipo.
  Así el mazo y las manos siguen sumando 25 y checkInvariants vale.
```

Las partidas se preparan con `enJuego` (Clásica, tablero vacío, turno 3) y las manos con `setRes`.

## Tests (`test/cartas.test.js`)

Cada `describe` lleva el RF en el nombre. Los rechazos se comprueban con `foto`. Al final de cada test que juega se
llama a `checkInvariants` (RNF-1).

| RF | Test | Cómo |
|---|---|---|
| RF-1 | En Clásica y Completa el mazo tiene 25 cartas: 14 Chef, 5 Estrella, 2 Obras, 2 Buena cosecha y 2 Exclusiva | partidas nuevas |
| RF-1 | En Sencilla no hay mazo: comprar se rechaza aunque se pueda pagar, y una carta puesta a mano en la mano no se puede jugar | `foto` |
| RF-2 | Comprar cuesta 1 pescado, 1 trigo y 1 vino (vuelven a la banca), da la última carta del mazo con el turno de compra y el historial dice «J0 compra una carta de cocina», sin el tipo | mazo con una carta conocida al final |
| RF-2 | Comprar se rechaza sin cambiar nada sin recursos, con el mazo vacío y fuera de la fase `main` | `foto` |
| RF-3 | Una carta comprada en este turno no se puede jugar; en el siguiente turno propio, sí | `playableDev` y `playDev` |
| RF-3 | Como mucho una carta por turno: tras jugar una, la segunda se rechaza; al terminar el turno se puede de nuevo | `devPlayed` |
| RF-3 | Solo juega el jugador del turno; la Estrella no se juega nunca, aunque sea antigua | `foto` |
| RF-4 | En la fase de tirar solo se puede jugar el Chef; Obras, Buena cosecha y Exclusiva se rechazan; en `main` se pueden jugar todas; en `discard` o `critic`, ninguna | una partida por caso |
| RF-5 | El Chef suma un chef jugado, quita la carta, gasta la carta del turno, anota «J0 juega un Chef» y pasa a mover el Cítrico; jugado antes de tirar, tras mover el Cítrico se vuelve a tirar; jugado después, a construir | `moveCritic` |
| RF-6 | Obras: anota «J0 juega Obras: 2 caminos gratis», pasa a `roadBuilding` con 2 caminos gratis que no cuestan recursos; tras el 2.º, vuelve a `main` | `buildRoad` sin recursos |
| RF-6 | Con 1 camino por colocar, Obras solo da 1; si tras el primero no queda sitio, termina antes | caminos rivales que bloquean |
| RF-6 | Sin caminos por colocar o sin sitio, Obras se rechaza y la carta se queda en la mano | `foto` |
| RF-7 | Buena cosecha con 2 iguales o 2 distintos los da y anota «J0 juega Buena cosecha y toma …» | — |
| RF-7 | Se rechaza sin cambiar nada si la banca no los tiene o los recursos no son válidos (1 o 3 recursos, uno inexistente, sin lista) | `foto` |
| RF-8 | Exclusiva quita a todos los rivales todas sus cartas de ese recurso, se las da al jugador y anota cuántas, también si son 0 | 3 jugadores |
| RF-8 | Con un recurso inexistente se rechaza sin cambiar nada | `foto` |

## Lo que no se automatiza

- **RF-9 y RF-10** son de la interfaz. Se comprueban a mano con un estado preparado en Node (Clásica, persona en `main`
  con 2 Chef comprados antes, 1 Buena cosecha comprada en este turno y 1 Estrella, y la banca sin trigo), cargado con
  «Continuar partida»:
  - la mano muestra «Chef ×2», «Buena cosecha» y «Estrella»; solo el Chef aparece resaltado como jugable;
  - al tocar Buena cosecha sale su texto y «Jugar» desactivado con «Una carta por turno, y nunca en el turno en que la
    compras.»; al tocar la Estrella no hay botón «Jugar»;
  - con otro estado (Buena cosecha comprada antes), «Jugar» abre el selector de 2 recursos, que no deja elegir trigo
    (la banca no tiene) y, al cancelar, la carta sigue en la mano;
  - a 375 px y en escritorio, sin errores nuevos en la consola.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `darCarta` saca la carta del mazo | Añadirla a la mano sin tocar el mazo | El mazo y las manos deben sumar 25 (RNF-1); así lo comprueba `checkInvariants`, como en la spec 001 |
| Comprar con una carta conocida colocada al final del mazo | Comprar al azar y mirar qué sale | El test sabe qué carta debe recibir el jugador y que se roba de ese extremo |
| Bloquear Obras con caminos rivales colocados a mano | Buscar un tablero en el que se quede sin sitio solo | Es determinista y deja claro por qué termina antes |
| La interfaz a mano con estados preparados | Automatizarla con un navegador sin cabeza | Sería añadir dependencias (principio 1 de la constitución) |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en las specs anteriores: en cada tarea se cambia a propósito el valor esperado, se ve fallar el test y se
  restaura; y, cuando un test comprueba un rechazo, se añade un control de que la misma jugada sí se acepta en el caso
  válido. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1 a RF-8 automáticos; RNF-1 con `checkInvariants`; RNF-2 porque todo corre en Node; RF-9 y RF-10 a mano.
