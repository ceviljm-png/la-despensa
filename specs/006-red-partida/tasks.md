# Tareas 006 — Cambio de seguridad en la partida en red

Plan: [plan.md](plan.md). En cada tarea: tests primero (en rojo), después el código, `npm test` en verde.

- [x] **T1. `js/check.js` con `int` y `resMap`.** RF-4
  - Crear `test/red-partida.test.js` con los tests de `int` (estricto) y `resMap` (caracterización del comportamiento de
    hoy); verlos fallar; crear `js/check.js` (sin DOM, `window.DespensaCheck` / `module.exports`) con las dos funciones.
  - Hecho cuando: los tests pasan con `npm test` y los 200 tests anteriores siguen en verde.

- [x] **T2. `Check.order` y `apply()`.** RF-4
  - Tests de `order` (jugadas válidas normalizadas; nombres heredados, inventados o no textuales → `null`; números que
    faltan o no son enteros → `null`); verlos fallar; escribir `order`; cambiar `apply()`, `hostTrade` y el mensaje
    `ask` de `ui.js` para usar `check.js` y quitar de `ui.js` `int`, `resMap` y su tabla de jugadas.
  - Hecho cuando: los tests pasan con `npm test` y en `ui.js` ya no hay tabla de jugadas propia.

- [x] **T3. `Check.state` y `adopt()`.** RF-11, RNF-3
  - Tests de `state` (estados reales de partidas de los tres tipos → válidos; uno estropeado por cada dato que se pinta
    → no válido; nombre con etiquetas → válido; en 200 partidas simuladas, válido tras cada paso); verlos fallar;
    escribir `state`; usarlo en `adopt()` antes de adoptar.
  - Hecho cuando: los tests pasan con `npm test`.

- [x] **T4. Cargar `check.js` en la página y uso sin conexión.** —
  - `index.html` carga `js/check.js` tras `js/engine.js`; `sw.js` lo añade a `FILES` y sube `CACHE` a `la-despensa-v3`;
    el test del service worker usa la caché nueva; `AGENTS.md` (estructura y orden de carga).
  - Hecho cuando: `npm test` termina en `OK` (incluido el test de que `FILES` cubre los scripts de la página).

- [x] **T5. Comprobación en el navegador y cierre.** RF-4, RF-11, RNF-3
  - Con un PeerJS de mentira en la página: estados con HTML ignorados (antes y después de uno válido) y órdenes
    `toString`, `__proto__` y sin número rechazadas con «Ahora no se puede.», sin errores en la consola; una partida
    normal contra la máquina sigue funcionando, a 375 px y en escritorio. Anotar aquí el resultado; spec en
    «implementada»; actualizar `MEMORY.md` (estado, decisión y deuda resuelta).
  - Hecho cuando: el resultado está anotado aquí, `MEMORY.md` está al día y `npm test` termina en `OK`.

## Comprobación en el navegador (T5) — 10 de octubre de 2026

Navegador integrado con un PeerJS de mentira instalado en la página (los datos se inyectan como si llegaran por la red).

- **Invitado (375 px), RF-11 y RNF-3:**
  - Primer estado con `<img src=x onerror="window.__xss=1">` como recurso de una parcela: se ignora; sigue en la sala de
    espera, no se crea ninguna imagen ni se ejecuta nada. **Correcto.**
  - Estado válido: entra en la partida («Clásica · a 10 puntos · Normal · sala ABCD», fichas de Ana y Bea). **Correcto.**
  - Estado con HTML en una parcela y en los chefs, más una línea nueva en el historial: se ignora entero (tablero
    idéntico, la línea no aparece, nada se ejecuta). **Correcto.**
  - Siguiente estado válido, con `<b>Ana</b> dice hola` en el historial: se adopta y se ve como texto (sin negrita). **Correcto.**
- **Anfitrión, RF-4:** con un invitado de mentira (Bea) y siendo su turno, las órdenes `toString`, `__proto__`,
  `constructor`, `hasOwnProperty`, `buildRoad` sin número o con `null`, `placeSetupHuerta` con `""` o `1.5`,
  `moveCritic` con `"3"` y una inventada reciben «Ahora no se puede.» y no cambian la partida; control: `placeSetupHuerta`
  con `0` se acepta («Bea planta su primera huerta»). Sin errores en la página. **Correcto.**
- **Partida normal contra la máquina:** a 375 px, colocación inicial completa con clics, 3 turnos (tirar y terminar) y
  las máquinas jugando; en escritorio se ve bien. Sin errores en la consola (salvo los ya conocidos del service worker
  del navegador integrado). **Correcto.**
