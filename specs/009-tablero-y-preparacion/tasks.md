# Tareas 009 — Tests de caracterización del tablero y la preparación

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Montar la infraestructura de tests.** RNF-1, RNF-2
  - Crear `test/helpers.js` con `withRandom`, `newGame`, `vertsOfHex`, `hexesOfVert`, `edgesOfVert`, `findVert`,
    `setRes`, `put`, `road`, `playSetup` y `checkInvariants`; crear `test/tablero.test.js` con el test de la
    geometría (19 parcelas, 54 cruces, 72 lados, 9 lados de puerto de costa y distintos); cambiar el script `test`
    de `package.json` a `node --test test/*.test.js && node test/sim.js`.
  - Hecho cuando: `npm test` muestra el test de geometría en verde y después la simulación termina en `OK`;
    `withRandom` restaura `Math.random` aunque la función lance un error (comprobado con un test propio).

- [x] **T2. Composición del tablero y regla del 6 y el 8.** RF-1
  - Tests: recuento de parcelas y números en 300 partidas, Erial con número 0, ningún 6 u 8 vecino de otro 6 u 8,
    y al menos 2 repartos distintos en 20 partidas.
  - Hecho cuando: los 4 tests pasan con `npm test` y cada uno se ha visto fallar al cambiar su valor esperado.

- [x] **T3. Puertos y estado inicial.** RF-2, RF-3
  - Tests: 9 puertos en `GEO.portEdges` con sus tipos en Clásica y Completa; Sencilla sin puertos y proporción 4;
    Cítrico en el Erial, banca 19, manos vacías, piezas 15 / 5 / 4, fase `setup`; nivel inexistente → `normal`
    y `version: 1`.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T4. Orden de colocación y primer jugador.** RF-4
  - Tests: orden en serpiente con 2 y con 4 jugadores y `current = order[0]`; en 200 partidas de 4 empieza cada
    asiento alguna vez.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T5. Reglas de la colocación inicial.** RF-5, RF-8
  - Tests: primera huerta sin camino aceptada; camino rechazado cuando toca huerta y huerta rechazada cuando toca
    camino; camino lejano rechazado y camino de la huerta aceptado; regla de distancia; los rechazos no cambian el
    estado (JSON igual); la primera vuelta no cuesta nada.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple al final
    de cada uno.

- [x] **T6. Recursos de la segunda huerta.** RF-6
  - Tests: un cruce de 3 parcelas productivas da 1 carta de cada una (mano, banca y texto «recibe» del historial);
    un cruce junto al Erial no recibe nada de él; un cruce de costa con 1 parcela productiva recibe 1 carta.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T7. Fin de la colocación.** RF-7, RF-8
  - Tests: tras el último camino, fase `roll`, turno 1, turno de `order[0]`, rutas calculadas y «Empieza la partida.
    Turno de <nombre>» en el historial; después, `placeSetupHuerta` y `placeSetupRoad` devuelven `false`.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T8. Documentación y comprobación a mano.** RF-9, RF-10
  - Actualizar «Comandos» de `AGENTS.md` (qué ejecuta `npm test`, cómo lanzar solo los tests o solo la simulación)
    y `MEMORY.md`. Comprobar en el navegador, a 375 px y en escritorio, una partida nueva: 6 y 8 en rojo, puntitos
    según el número, puertos con «3:1» o «2:1», solo cruces y lados válidos marcados durante la colocación y los
    textos de estado de RF-10, sin errores en la consola.
  - Hecho cuando: `AGENTS.md` describe el nuevo `npm test`, la comprobación a mano está anotada aquí con su resultado
    y `npm test` termina en `OK`.

## Comprobación a mano (T8) — 10 de octubre de 2026

Navegador integrado, partida Clásica nueva con los ajustes por defecto, a 375 px y en escritorio (1024 px):
- RF-9: 6 y 8 en rojo (cuatro fichas), puntitos según el número, Erial con su nombre y el Cítrico, puertos con «3:1»
  o con el icono del recurso y «2:1». Sin desplazamiento horizontal a 375 px. **Correcto.**
- RF-10: «Planta tu primera huerta en un cruce» con solo los cruces válidos marcados (no los vecinos de la huerta de
  una máquina); tras plantar, «Coloca un camino junto a tu huerta» con solo los 2 lados de esa huerta; tras la primera
  vuelta, «Planta tu segunda huerta», y el historial muestra lo recibido por la segunda huerta de una máquina. **Correcto.**
- Consola: el navegador integrado da dos errores al registrar el service worker («An unknown error occurred when
  fetching the script») sin llegar a pedir `sw.js` al servidor. En Chrome real (MCP de Chrome DevTools) el service
  worker se registra y la consola está limpia: es una limitación del navegador integrado, no del juego.
