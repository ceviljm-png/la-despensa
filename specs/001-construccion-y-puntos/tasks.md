# Tareas 001 — Tests de caracterización de la construcción, los puntos y la victoria

Plan: [plan.md](plan.md). Todas las tareas **solo añaden tests**: ninguna toca `js/`.
En cada una: escribir el test, comprobar que sabe fallar cambiando temporalmente el valor esperado, restaurarlo,
y ejecutar `npm test` hasta ver `OK`.

- [x] **T1. Utilidades de caminos y construcciones.** RNF-1, RNF-2, RNF-3
  - Añadir a `test/helpers.js` `edgeBetween`, `pathFrom` y `spread`; crear `test/construccion.test.js` con tests de las
    propias utilidades: `edgeBetween` devuelve un lado que une los dos cruces y falla con cruces no vecinos; `pathFrom`
    da k + 1 cruces distintos, seguidos y que no pasan por `evita`; `spread` coloca k construcciones sin romper la regla
    de distancia (`checkInvariants`).
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y los 61 tests anteriores siguen en verde.

- [x] **T2. Caminos.** RF-1, RF-4
  - Tests: camino junto a una huerta propia aceptado (lado, pieza, 1 aceite y 1 sal a la banca); camino que continúa otro
    propio aceptado; rechazos sin cambiar nada: sin recursos, sin caminos, lado ocupado, lado que no toca nada propio, a
    través de una huerta rival y fuera de la fase `main`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T3. Huertas y bodegas.** RF-2, RF-3, RF-4
  - Tests: huerta aceptada en un cruce libre con camino propio (coste y pieza); rechazos: sin camino, regla de distancia,
    cruce ocupado, sin recursos, sin huertas. Bodega sobre huerta propia (coste, bodega descontada, huerta devuelta);
    rechazos: huerta rival, bodega, cruce vacío, sin recursos, sin bodegas; ambos fuera de la fase `main`.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T4. Puntos y longitud de la ruta.** RF-5, RF-6
  - Tests: 2 huertas y 1 bodega = 4 puntos; con Gran Ruta y Gran Brigada = 8; las Estrellas solo en los puntos ocultos.
    Línea de 4 caminos = 4; con una rama cuenta la más larga; una huerta propia en medio no corta; una rival sí.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T5. Gran Ruta.** RF-7
  - Tests: el 5.º camino seguido da la Gran Ruta con su texto, 4 no; empate con quien la tiene → la conserva; superarla →
    pasa al otro y el historial solo dice quién la consigue; una huerta rival en medio sin nadie más con 5 → queda libre
    con «J0 pierde la Gran Ruta»; al cortarla con dos rivales empatados → queda libre.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T6. Gran Brigada.** RF-8
  - Tests: el 3.er Chef da la Gran Brigada con su texto; el 2.º no; un rival con los mismos chefs no la quita y con uno
    más sí.
  - Hecho cuando: los tests pasan con `npm test` y cada uno se ha visto fallar.

- [x] **T7. Victoria.** RF-9
  - Tests: con 9 puntos una huerta da la victoria en Clásica (fase `over`, `winner`, texto); en Sencilla basta con 8;
    comprar una Estrella con 9 puntos da la victoria; quien llega a los puntos en turno ajeno gana al empezar el suyo;
    con la partida terminada no se acepta ninguna jugada.
  - Hecho cuando: los tests pasan con `npm test`, cada uno se ha visto fallar y `checkInvariants` se cumple.

- [x] **T8. Botones de construir en el navegador y cierre.** RF-10
  - Preparar en Node un estado guardado (persona en `main` con recursos para camino y huerta, no para bodega, y sin sitio
    para huerta), cargarlo con «Continuar partida» y comprobar los botones y sus motivos, las marcas al elegir «Camino»,
    el texto de estado y que se cancela; a 375 px y en escritorio, sin errores nuevos en la consola. Anotar aquí el
    resultado y actualizar `MEMORY.md`.
  - Hecho cuando: la comprobación está anotada aquí con su resultado y `npm test` termina en `OK`.

## Comprobación a mano (T8) — 10 de octubre de 2026

Partida guardada generada en Node con `test/helpers.js` (Clásica; Ana, persona, en la fase de construir con una huerta
sin caminos y 1 aceite, 1 sal, 1 pescado y 1 trigo), cargada en el navegador integrado con «Continuar partida»:
- **Botones (375 px y escritorio):** «Camino» activo; «Huerta» desactivado con «No tienes dónde»; «Bodega» y «Carta»
  desactivados con «Te faltan recursos»; «Comerciar» y «Terminar turno» activos. **Correcto.**
- **Elegir «Camino»:** el botón pasa a «Cancelar», la línea de estado dice «Toca dónde va el camino» y se marcan solo
  los 3 lados de la huerta (los mismos que da el motor para ese cruce: 0, 1 y 10), ningún cruce. **Correcto.**
- **Cancelar:** vuelve «Construye, comercia o termina tu turno», desaparecen las marcas y la mano no cambia. **Correcto.**
- Sin desplazamiento horizontal a 375 px. Consola: solo los errores ya conocidos del service worker del navegador integrado.

## Cambio del 11 de octubre de 2026 — RF-11

- [x] **T9. Historial al quitar la Gran Ruta.** RF-11
  - Tests en `test/construccion.test.js` (en rojo) y el texto en `updateLongest`; el historial en el navegador.
  - Hecho cuando: los tests pasan, `npm test` termina en `OK` y `MEMORY.md` está al día.

### Resultado (11 de octubre de 2026)

- `npm test`: el test de «si le supera, pasa al otro» y el nuevo de «al cortarla, otro la consigue» fallan sin el
  cambio (2 en rojo) y pasan con él; `npm test` termina en `OK`.
- Navegador (375 px): partida preparada en Node con el motor en la que Bea supera a Ana; el historial muestra
  «Bea consigue la Gran Ruta (6 caminos) y se la quita a Ana: 2 puntos», partido en dos líneas y sin desplazamiento
  horizontal; la etiqueta «Ruta» está en la ficha de Bea. Consola: solo los errores ya conocidos del service worker.

