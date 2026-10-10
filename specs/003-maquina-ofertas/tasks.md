# Tareas 003 — Tests de caracterización de la máquina ante los cambios

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Valoración común y nivel Fácil.** RF-1, RF-2, RF-3
  - Crear `test/maquina-ofertas.test.js` con la preparación `juez` y los tests: `sin` en los tres niveles; Fácil acepta
    1 por 1 y 2 por 1 y rechaza 1 por 2 con `poco`; Fácil ayuda a quien va ganando y se queda sin la última carta;
    `lider` en Normal y Difícil a 8 puntos en Clásica, no a 7, límite 6 en Sencilla, sin contar Estrellas.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 122 tests anteriores siguen en verde.

- [x] **T2. Nivel Difícil.** RF-4, RF-5, RF-6
  - Tests: `poco` con 1 por 2; `ultima` con el recurso; `sobra` con el recurso; el orden de los motivos cuando hay
    varios (los dos ejemplos del plan).
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T3. Nivel Normal y propiedades.** RF-7, RNF-1, RNF-2
  - Tests: Normal acepta lo que acepta Difícil; el ejemplo numérico de la spec (1 trigo → `poco`, 2 trigo → acepta);
    una oferta que Difícil rechaza por `sobra` y Normal acepta; 2.000 casos al azar en los que Difícil ⇒ Normal; la
    misma respuesta con `Math.random` distinto en los tres niveles.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T4. Cuándo propone la máquina.** RF-8, RF-9, RF-10
  - Añadir la preparación `proponente` y los tests: propone vino por trigo en los tres niveles y queda marcado; con 2
    cartas de menos pide solo pescado; no propone si puede construir, si le faltan más de 2, si no le sobra nada ni en
    Clásica; no propone dos veces en el mismo turno.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar, `checkInvariants` se cumple y
    `MEMORY.md` está actualizado.
