# Tareas 004 — Tests de caracterización de la máquina en su turno

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Cuándo actúa, el azar y los descartes.** RF-1, RF-2, RF-5
  - Crear `test/maquina-turno.test.js` con la preparación `maquina` y los tests: no hace nada en el turno de una
    persona; una sola acción en su turno; descarta una máquina aunque no tenga el turno y no hace nada si solo falta
    una persona; el azar de Fácil frente a Normal y Difícil con la secuencia `[0, 0,99]`; descarta 3 sal y 1 vino de 5 y 3.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 144 tests anteriores siguen en verde.

- [x] **T2. Dónde construye.** RF-3, RF-4
  - Añadir `valorCruce` y los tests: colocación inicial en el cruce de mayor valor; huerta en la partida en el de mayor
    valor; bodega en la huerta de mayor valor; camino hacia el cruce libre y no hacia el ocupado.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.
  - Nota: la parte de RF-3 «sin la bonificación de recursos nuevos» al ampliar a bodega no se puede observar: en una
    huerta propia esa bonificación siempre vale 0. El test comprueba que elige la de mayor valor.

- [x] **T3. Chef antes de tirar, Cítrico y robo.** RF-6, RF-7
  - Tests: juega el Chef si está bloqueada y puede; tira si no tiene Chef o no está bloqueada; nunca a una parcela suya;
    elige la parcela rival que más produce; roba a quien más puntos a la vista tiene y, a igualdad, a quien más cartas.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T4. Cartas de cocina.** RF-8
  - Tests: Chef primero; Obras antes que Buena cosecha; Buena cosecha pide lo que falta para la huerta; Exclusiva con 3
    o más y no con 2; en Sencilla nada; sin banca para Buena cosecha pasa a Exclusiva; el caso confirmado de la segunda
    carta de Buena cosecha.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T5. Prioridades al construir y comerciar.** RF-9, RF-10
  - Tests: bodega antes que huerta; huerta antes que carta; camino con 8 cartas y nada mejor; construye lo que puede
    pagar; cambia 4:1 con la banca si le sobra; no lo intenta si la banca no tiene lo que falta; termina el turno si no
    puede hacer nada.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T6. Pausas en el navegador y cierre.** RNF-4
  - Medir en el navegador las pausas entre jugadas de las máquinas (colocación inicial, partida y «Máquina: rápida»),
    sin errores nuevos en la consola. Anotar aquí el resultado y actualizar `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T6) — 10 de octubre de 2026

Partida Clásica de dos máquinas en el navegador integrado, con un observador en la página que anota la hora de cada
redibujado del juego (cada paso de la máquina redibuja una vez y después espera):
- **Colocación inicial:** intervalos de 502-503 ms (mediana 503). **Correcto** (0,5 s).
- **Partida:** intervalos de 703-706 ms (mediana 704). **Correcto** (0,7 s).
- **«Máquina: rápida»** desde el menú de la partida: aviso «Máquina rápida», el ajuste queda guardado
  (`{"fast":true}`) y los intervalos pasan a 142-143 ms (mediana 142). **Correcto** (0,14 s).
- Consola: solo los errores ya conocidos del service worker del navegador integrado.

Se usó una partida solo con máquinas porque hoy el inicio lo permite (el propietario ha decidido cambiarlo, spec 007).
