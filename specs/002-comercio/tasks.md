# Tareas 002 — Tests de caracterización del comercio

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`. Cada rechazo lleva su control (la misma jugada se acepta en el caso válido).

- [x] **T0. Corregir los criterios de finalización de la spec.** RF-9, RNF-2
  - Hecho el 10 de octubre de 2026 al aprobar el plan: RF-9 y RNF-2 pasan a comprobarse a mano.

- [x] **T1. Utilidad `portOf` y proporción de cambio.** RF-2
  - Añadir `portOf` a `test/helpers.js`; crear `test/comercio.test.js` con: proporción 4 sin puertos; 3:1 desde
    cualquiera de los dos cruces; 2:1 de un recurso; 3:1 y 2:1 a la vez; la bodega cuenta y la huerta rival no; y un
    test de `portOf`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 111 tests anteriores siguen en verde.

- [x] **T2. Cambio con la banca.** RF-1, RNF-1
  - Tests: sin puerto y con 2:1 se entrega la proporción y se recibe 1, por la banca, con el texto del historial;
    rechazos sin cambiar nada: pocas cartas, mismo recurso, banca sin el recurso, recurso inexistente, fuera de `main`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T3. Cambio entre jugadores.** RF-3, RNF-1
  - Tests: en Completa se intercambia lo acordado con su texto, sea quien sea el del turno de los dos; rechazos sin
    cambiar nada: Sencilla y Clásica, consigo mismo, ninguno de los dos con el turno, una parte vacía, alguno sin lo que
    entrega, fuera de `main`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T4. Comercio en el navegador y cierre.** RF-4 a RF-10, RNF-2
  - Las tres comprobaciones del plan (ventana de la banca; oferta a rivales con rechazos por motivos distintos y con
    trato; oferta de la máquina a una persona), a 375 px y en escritorio, sin errores nuevos en la consola. Anotar aquí
    el resultado y actualizar `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T4) — 10 de octubre de 2026

Partidas preparadas en la propia página con el motor del juego (`window.Despensa`), cargadas con «Continuar partida»
en el navegador integrado:

1. **Banca (375 px).** Completa; Ana con 4 aceite, 2 vino y una huerta en un puerto 2:1 de vino. La pestaña «Con la
   banca» se abre por defecto; cada recurso muestra su proporción y cuántas tiene («4:1 tienes 4», «2:1 tienes 2»…);
   solo se pueden entregar aceite y vino; al elegir vino, no se puede recibir vino; tras cambiar 2 vino por 1 sal la
   ventana sigue abierta con «Hecho: 2 vino por 1 sal.» y el historial lo anota. **Correcto.**
   *Observación (no es un requisito):* el texto de ayuda dice siempre «Sin puerto, la banca cambia 4 cartas iguales
   por 1.», también cuando la persona tiene puertos.
2. **Oferta a rivales (375 px, Difícil).** Ana 2 aceite y 2 vino; Rosa 1 sal; Paco 3 sal y 3 aceite.
   - Límites: no deja ofrecer más de 2 aceite; al pedir aceite se quita del lado ofrecido; no deja pedir más de 9 de un
     recurso; «Proponer» desactivado mientras falta una de las dos partes. **Correcto.**
   - 1 aceite por 1 sal: «Nadie acepta. Por 1 aceite a cambio de 1 sal: Rosa no quiere quedarse sin sal; Paco ya tiene
     aceite de sobra.», con la ventana abierta. **Correcto** (dos motivos de RNF-2 distintos).
   - 1 vino por 1 sal: «Hay trato» con «Cambiar con Paco» y «Cancelar»; al cambiar, se cierra el comercio y el
     historial dice «Ana da 1 vino a Paco a cambio de 1 sal». Repetida la oferta, «Cancelar» cierra sin cambiar nada.
     **Correcto.**
3. **Oferta de la máquina (escritorio).** Rosa en su turno con una huerta, un sitio libre para otra y todo menos 1
   trigo; Ana con 1 trigo. Al continuar, «Oferta para Ana — Rosa te propone un cambio: Te da 1 vino ⇄ Te pide 1 trigo»
   con «Rechazar» y «Aceptar». Al rechazar, Rosa termina su turno sin anotar nada (caso límite confirmado) y le toca a
   Ana. **Correcto.**

Consola: solo los errores ya conocidos del service worker del navegador integrado.

## Cambio del 11 de octubre de 2026 — RF-11

- [x] **T5. Regla `refusal`.** RF-11
  - Tests en `test/comercio.test.js` (en rojo) y la función en `js/check.js`.
  - Hecho cuando: los tests pasan y `npm test` termina en `OK`.
- [x] **T6. Aviso en la ventana de comercio.** RF-11
  - La ventana guarda el último rechazo y usa `refusal`.
  - Hecho cuando: `npm test` termina en `OK` y `ui.js` no tiene errores de sintaxis.
- [x] **T7. Comprobación en el navegador y cierre.** RF-11
  - Repetir la misma oferta rechazada y cambiarla, a 375 px y en escritorio; anotar aquí el resultado; `MEMORY.md` al día.
  - Hecho cuando: el resultado está anotado aquí y `npm test` termina en `OK`.

### Resultado de la comprobación a mano (11 de octubre de 2026)

Completa, Difícil; Ana con 2 aceite y 2 vino, Rosa con 1 sal, Paco con 3 sal y 3 aceite; «Comerciar → Con rivales»:

| Comprobación | Resultado |
|---|---|
| 1 aceite por 1 sal, tres veces seguidas (375 px): «Nadie acepta.», «Nadie acepta otra vez (2.º intento).», «… (3.º intento).», con los motivos de Rosa y Paco detrás | Correcto |
| Se cambia a 2 aceite por 1 sal: vuelve a «Nadie acepta.»; repetida, 2.º y 3.º intento | Correcto |
| Se cierra y se vuelve a abrir el comercio (escritorio): la misma oferta vuelve a empezar en «Nadie acepta.» y después «2.º intento» | Correcto |

Consola: solo los errores ya conocidos del service worker del navegador integrado.

