# Tareas 000 — Tests de caracterización del turno, la producción y el Cítrico

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Utilidades para partidas empezadas y tirada de dados.** RF-1, RF-11, RNF-1
  - Añadir a `test/helpers.js` `enJuego`, `dados`, `hexWithNum` y `foto`; crear `test/turno.test.js` con: tirar guarda
    los dos dados y anota «J0 saca un 8»; tirar fuera de la fase `roll` se rechaza sin cambiar nada; y un test de
    `dados` que comprueba que produce cada valor de 1 a 6 en el motor.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 33 tests de la spec 009 siguen en verde.

- [x] **T2. Producción de recursos.** RF-2
  - Tests: con un 8, huerta +1 y bodega +2 del recurso de la parcela, salidas de la banca, texto «J0 recibe …» y fase
    `main`; otro número no produce en esa parcela; la parcela bloqueada no produce.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T3. Banca corta.** RF-3
  - Tests: un solo receptor recibe lo que queda sin aviso; varios receptores no reciben nada y el historial lo dice;
    banca a 0 con un solo receptor no da nada ni anota nada.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T4. El 7 y los descartes.** RF-4, RF-5, RF-6
  - Tests: con manos de 7, 8 y 9 descartan los de 8 y 9 (4 cada uno) y nadie recibe; sin nadie por encima de 7 se pasa
    a `critic`; descartes con cantidad equivocada, cartas que no tiene o jugador sin descarte se rechazan sin cambiar
    nada; descartes válidos en cualquier orden devuelven las cartas a la banca, anotan «descarta 4 cartas» y el último
    pasa a `critic`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T5. Mover el Cítrico y robar.** RF-6, RF-7, RF-8
  - Tests: el Cítrico no se queda en su parcela y puede ir a cualquier otra, también al Erial; una víctima → robo directo
    y vuelta a `main`; dos víctimas → fase `steal`, elección inválida rechazada, elección válida roba; no cuentan el
    propio jugador ni un rival sin cartas, y un rival con dos construcciones cuenta una vez; con `after = 'roll'` se
    vuelve a `roll`; el robo es al azar por carta (azar 0 → aceite, 0,99 → vino), queda en `lastSteal` y el historial
    no dice el recurso.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T6. Terminar el turno y acciones fuera de fase.** RF-10, RF-11
  - Tests: terminar el turno pasa al siguiente asiento (y del último al primero), suma 1 al turno, vuelve a `roll`,
    borra los dados y pone a `false` `devPlayed` y `offered`; descartar en `main`, mover el Cítrico en `roll`, robar en
    `main` y terminar el turno en `roll` se rechazan sin cambiar nada.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T7. Aviso del robo en el navegador y cierre.** RF-9
  - Preparar en Node dos estados guardados (persona que roba a una máquina y máquina que roba a la persona), cargarlos
    en el navegador con «Continuar partida» y comprobar «Robas … a …» y «… te roba …», a 375 px y en escritorio, sin
    errores nuevos en la consola. Anotar aquí el resultado y actualizar `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T7) — 10 de octubre de 2026

Dos partidas guardadas generadas en Node con `test/helpers.js` (Ana, persona; Rosa, máquina; fase de mover el Cítrico;
la víctima con 3 vinos en una parcela del 8), cargadas en el navegador integrado con «Continuar partida»:
- **Ana roba a Rosa (375 px):** al tocar la parcela, aviso «Robas <icono de vino> a Rosa», Ana pasa a 1 vino y el
  historial dice «Ana roba una carta a Rosa», sin el recurso. **Correcto.**
- **Rosa roba a Ana (escritorio):** la máquina elige la parcela de Ana; aviso «Rosa te roba <icono de vino>», Ana
  pasa a 2 vinos y el historial dice «Rosa roba una carta a Ana». **Correcto.**
- Consola: solo los errores ya conocidos del service worker del navegador integrado (uno por carga de página).

## Cambio del 11 de octubre de 2026 — RF-3 y RF-12

- [x] **T8. Aviso de banca corta con un solo receptor.** RF-3
  - Tests de RF-3 en `test/turno.test.js` (en rojo) y el aviso en `distribute`.
  - Hecho cuando: los tests pasan y `npm test` termina en `OK`.
- [x] **T9. Regla `stealNotice` y aviso al recibir el dispositivo.** RF-12
  - Tests (en rojo), la función en `js/check.js` y `noteSteal` en `js/ui.js`.
  - Hecho cuando: los tests pasan, `ui.js` no tiene errores de sintaxis y `npm test` termina en `OK`.
- [x] **T10. Comprobación en el navegador y cierre.** RF-3, RF-12
  - El robo a Bea mientras tiene el dispositivo Ana, a 375 px y en escritorio; el aviso de banca en el historial;
    anotar aquí el resultado; `MEMORY.md` al día.
  - Hecho cuando: el resultado está anotado aquí y `npm test` termina en `OK`.

### Resultado de la comprobación a mano (11 de octubre de 2026)

Clásica con Ana y Bea (personas en este dispositivo) y Rosa (máquina); Rosa en su turno roba a Bea mientras el
dispositivo lo tiene Ana:

| Comprobación | RF | Resultado |
|---|---|---|
| Mientras lo tiene Ana, no sale ningún aviso (no es ni ladrona ni víctima); el historial dice «Rosa roba una carta a Bea» | RF-8, RF-12 | Correcto |
| Al pasar a Bea («Ya lo tengo»), aparece «Rosa te robó <icono> vino» (375 px) y «Rosa te robó <icono> sal» en otra partida (escritorio) | RF-12 | Correcto |
| Aviso de banca corta | RF-3 | En `npm test` (el texto va al historial del motor, que la interfaz pinta igual que el resto) |

Consola: solo los errores ya conocidos del service worker del navegador integrado.

