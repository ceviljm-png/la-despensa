# Tareas 008 — Tests de caracterización de las cartas de cocina

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`. Cada rechazo lleva su control (la misma jugada se acepta en el caso válido).

- [x] **T1. Utilidad `darCarta`, mazo y compra.** RF-1, RF-2, RNF-1
  - Añadir `darCarta` a `test/helpers.js`; crear `test/cartas.test.js` con: composición del mazo en Clásica y Completa;
    Sencilla sin mazo (comprar y jugar rechazados); comprar cobra, da la última carta del mazo con su turno y anota sin
    el tipo; rechazos sin recursos, con el mazo vacío y fuera de `main`; y un test de `darCarta`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 90 tests anteriores siguen en verde.

- [x] **T2. Cuándo se puede jugar una carta.** RF-3, RF-4
  - Tests: comprada este turno no se juega y en el siguiente turno propio sí; una por turno y se recupera al terminar el
    turno; solo el jugador del turno; la Estrella nunca; antes de tirar solo el Chef; en `main` todas; en `discard` y
    `critic` ninguna.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T3. Chef y Obras.** RF-5, RF-6
  - Tests: el Chef suma un chef, quita la carta, anota y pasa a mover el Cítrico, volviendo después a la fase en que se
    jugó (`roll` o `main`); Obras anota, da 2 caminos gratis y vuelve a `main`; con 1 camino solo da 1; termina antes si
    se queda sin sitio; sin caminos o sin sitio se rechaza y la carta se queda.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T4. Buena cosecha y Exclusiva.** RF-7, RF-8
  - Tests: Buena cosecha con 2 iguales y con 2 distintos, con su texto; rechazos si la banca no los tiene o los recursos
    no son válidos. Exclusiva con 3 jugadores se lleva todo lo de los rivales y anota cuántas, también con 0; recurso
    inexistente rechazado.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T5. Cartas en el navegador y cierre.** RF-9, RF-10
  - Preparar en Node los estados del plan, cargarlos con «Continuar partida» y comprobar la mano agrupada y resaltada, el
    diálogo de cada carta (texto, «Jugar» desactivado con su aviso, Estrella sin botón) y el selector de Buena cosecha
    (sin trigo si la banca no tiene; cancelar no gasta la carta), a 375 px y en escritorio, sin errores nuevos en la
    consola. Anotar aquí el resultado y actualizar `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T5) — 10 de octubre de 2026

Dos partidas preparadas en la propia página con el motor del juego (`window.Despensa`): Clásica, Ana en la fase de
construir (turno 3) con 2 Chef y 1 Estrella comprados antes, 1 Buena cosecha y la banca sin trigo. Cargadas con
«Continuar partida» en el navegador integrado:
- **Mano (375 px):** «Chef ×2», «Estrella» y «Buena cosecha»; con la Buena cosecha comprada en el turno 3, solo el Chef
  aparece resaltado como jugable. **Correcto.**
- **Diálogos (375 px):** Buena cosecha muestra «Toma de la banca 2 recursos a tu elección.», el aviso «Una carta por turno,
  y nunca en el turno en que la compras.» y «Jugar» desactivado; la Estrella explica que vale 1 punto secreto y solo
  tiene «Cerrar». **Correcto.**
- **Selector (escritorio, Buena cosecha comprada en el turno 2, ya jugable):** «Jugar» abre «Buena cosecha: elige 2
  recursos» con «Aceptar» desactivado; «+» en trigo no suma (la banca no tiene) y en vino sí; «Cancelar» cierra sin
  jugar: la carta sigue en la mano, la mano de recursos no cambia y el historial no anota nada. **Correcto.**
- Consola: solo los errores ya conocidos del service worker del navegador integrado.
