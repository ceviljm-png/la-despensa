# Plan 002 — Tests de caracterización del comercio

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura de las specs anteriores (`node:test`, `test/helpers.js`, `npm test`).

## Una corrección a la spec antes de empezar

Los «Criterios de finalización» de la spec dicen que **RF-9** (a quién se ofrece el cambio que propone la máquina y en
qué orden) tendrá test automático. Al preparar este plan he visto que ese reparto no está en el motor sino en la
interfaz (`resolveAiOffer`, en `js/ui.js`), que necesita el navegador. Sin sacarlo de `ui.js` (lo que cambiaría código,
y esta red de seguridad solo añade tests) no se puede probar en Node.

Propuesta: **RF-9 pasa a comprobarse a mano**, como RF-4 a RF-8 y RF-10, y se corrige esa línea de la spec. Si en el
futuro se cambia esa parte (por ejemplo con `/sdd-change 002`), se puede sacar a una función sin DOM y automatizar,
igual que se hará con la validación de órdenes en la spec 006. Lo mismo pasa con los textos de rechazo (RNF-2), que
también están en la interfaz.

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `specs/002-comercio/spec.md` | corregir «Criterios de finalización» | RF-9 se comprueba a mano (ver arriba) |
| `test/helpers.js` | ampliar | Una utilidad para encontrar un puerto de un tipo |
| `test/comercio.test.js` | nuevo | Tests de la spec 002 (RF-1 a RF-3) |
| `specs/002-comercio/tasks.md` | — | Resultado de la comprobación a mano |
| `js/*`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` |

## Utilidad nueva (`test/helpers.js`)

```
portOf(g, type, excepto = [])  -> { edge, a, b }: un puerto del tipo pedido ('3:1' o un recurso) y sus dos cruces
```

## Tests (`test/comercio.test.js`)

Cada `describe` lleva el RF en el nombre. Los rechazos se comprueban con `foto` y llevan su control (la misma jugada,
en el caso válido, se acepta). Al final de cada test que juega se llama a `checkInvariants` (RNF-1).

| RF | Test | Cómo |
|---|---|---|
| RF-2 | Sin puertos, la proporción es 4 para todos los recursos | partida Clásica sin construcciones |
| RF-2 | Una huerta en cualquiera de los dos cruces de un puerto 3:1 deja todos los recursos a 3 | `portOf` + `put` |
| RF-2 | Una huerta en un puerto 2:1 deja ese recurso a 2 y los demás a 4; con otra en un 3:1, ese recurso a 2 y el resto a 3 | caso límite de la spec |
| RF-2 | Una bodega también cuenta; una huerta rival en el puerto, no | — |
| RF-1 | Cambio con la banca: entrega tantas cartas como la proporción y recibe 1; las cartas pasan por la banca; el historial dice «J0 cambia 4 aceite por 1 vino con la banca» | sin puerto y con un 2:1 |
| RF-1 | Se rechaza sin cambiar nada: con menos cartas que la proporción, el mismo recurso, la banca sin el recurso pedido, un recurso que no existe y fuera de la fase `main` | `foto` |
| RF-3 | En Completa, dos jugadores intercambian lo acordado y se anota «J0 da 1 aceite a J1 a cambio de 2 sal»; también si quien da es el otro jugador y el del turno es quien recibe | — |
| RF-3 | Se rechaza sin cambiar nada: en Sencilla y Clásica, consigo mismo, entre dos jugadores que no tienen el turno, con una parte vacía, si alguno no tiene lo que entrega y fuera de la fase `main` | `foto`, 3 jugadores |

## Lo que se comprueba a mano

Con estados preparados en la propia página con el motor del juego (`window.Despensa`), como en la spec 008:

1. **Banca (RF-4).** Completa, Ana en `main` con 4 aceite, 2 vino y una huerta en un puerto 2:1 de vino. En «Comerciar →
   Con la banca» cada recurso muestra su proporción y cuántas tiene; solo se pueden entregar aceite (4:1) y vino (2:1);
   no se puede recibir el mismo recurso que se entrega; tras cambiar, la ventana sigue abierta con «Hecho: …».
2. **Oferta a rivales (RF-5 a RF-8, RNF-2).** Nivel Difícil; Rosa y Paco (máquinas) con manos elegidas para que cada uno
   rechace por un motivo distinto. Comprobar los límites de la oferta (no ofrecer más de lo que se tiene, máximo 9, un
   recurso no puede estar a los dos lados, «Proponer» desactivado hasta tener las dos partes); que el rechazo dice
   «Nadie acepta. Por … a cambio de …: Rosa …; Paco ….» con los textos de RNF-2; y, con una oferta que acepten, la
   ventana «Hay trato» o «¿Con quién cambias?», que cierra el comercio tanto al cambiar como al cancelar.
3. **Oferta de la máquina (RF-9, RF-10).** Rosa en su turno, en `main`, con una huerta, un sitio libre para otra y
   todo menos 1 trigo, y Ana con trigo. Al continuar la partida, Rosa propone 1 por 1 y a Ana le sale «Oferta para Ana»
   con quién propone, lo que le dan, lo que le piden, «Rechazar» y «Aceptar».

Todo a 375 px y en escritorio, sin errores nuevos en la consola.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| RF-9 y RNF-2 a mano | Sacar `resolveAiOffer` y los textos de `ui.js` para probarlos en Node | Sería cambiar código; esta red de seguridad solo añade tests. Queda anotado para un cambio futuro |
| Estados preparados en la página con `window.Despensa` | Copiar estados enteros generados en Node | Más corto y menos propenso a errores de copia, como en la spec 008 |
| `portOf` para encontrar puertos por tipo | Índices de lado fijos | El tipo de cada puerto cambia en cada partida (se reparte al azar) |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en las specs anteriores: en cada tarea se cambia a propósito el valor esperado, se ve fallar el test y se
  restaura; cada rechazo lleva su control. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1 a RF-3 automáticos; RNF-1 con `checkInvariants`; RF-4 a RF-10 y RNF-2 a mano.

---

# Cambio del 11 de octubre de 2026 — RF-11

## Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `js/check.js` | ampliar | Función pura `refusal(motivos, anterior)`: el principio del aviso y la cuenta de rechazos idénticos | RF-11 |
| `js/ui.js` | modificar | La ventana de comercio guarda el último rechazo y usa `refusal` para el aviso | RF-11 |
| `test/comercio.test.js` | ampliar | Tests de `refusal` | RF-11 |

## Función pura (`js/check.js`)

```
refusal(motivos, anterior) → { motivos, n, titulo }                                                  (RF-11)
  n = anterior y anterior.motivos === motivos ? anterior.n + 1 : 1
  titulo = n === 1 ? 'Nadie acepta.' : 'Nadie acepta otra vez (' + n + '.º intento).'
```
`motivos` es el texto que ya devuelve `resolveProposal` («Por … a cambio de …: Rosa …; Paco ….»), así que la oferta y
los motivos entran en la comparación.

## Cambios en `js/ui.js`
- En la ventana de comercio, `ultimo = null` al abrirla. Al recibir un rechazo: `ultimo = Check.refusal(motivos, ultimo)`
  y `note = '<b class="refused">' + ultimo.titulo + '</b> ' + clean(motivos)`. Con trato, `ultimo = null`.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Contar los intentos idénticos en el encabezado | Variar el texto con frases al azar | Una cuenta es verificable y deja claro que el juego ha vuelto a preguntar |
| La cuenta vive en la ventana | Guardarla en el estado de la partida | Es solo un aviso; no tiene que guardarse ni viajar por la red |

## Estrategia de tests
- `npm test`: `refusal` sin anterior → n 1 y «Nadie acepta.»; el mismo texto → 2 y 3 con «otra vez (2.º intento)»;
  otro texto → vuelve a 1.
- A mano: Difícil, repetir la misma oferta rechazada tres veces y ver el encabezado 1, 2.º y 3.º; cambiar la oferta y
  ver que vuelve a «Nadie acepta.». A 375 px y en escritorio.

