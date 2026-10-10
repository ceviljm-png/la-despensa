# Plan 000 — Tests de caracterización del turno, la producción y el Cítrico

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/` ni el comportamiento.
Reutiliza la infraestructura montada en la spec 009 (`node:test`, `test/helpers.js`, `npm test`).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/helpers.js` | ampliar | Cuatro utilidades nuevas para partidas ya empezadas, dados y fotos del estado |
| `test/turno.test.js` | nuevo | Tests de la spec 000 |
| `specs/000-turno-y-citrico/tasks.md` | — | Resultado de la comprobación a mano de RF-9 |
| `js/*`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` |

## Utilidades nuevas (`test/helpers.js`)

```
enJuego(g, { current = 0, phase = 'roll', turn = 1 })
  Salta la colocación inicial: deja el tablero vacío tal cual y pone la partida en la fase y el turno pedidos.
  Las piezas se colocan después con put/road, así cada test decide exactamente qué hay en el tablero.

dados(a, b)  -> [x, y] para withRandom
  El motor saca cada dado como 1 + floor(Math.random() * 6): el valor (a - 1) / 6 + 0.01 da el dado a.

hexWithNum(g, n, excepto = [])  -> índice de una parcela productiva con el número n (falla si no hay)

foto(g)  -> JSON.stringify(g.s), para comprobar que un rechazo no cambia nada
```

Para colocar piezas en una parcela sin romper la regla de distancia se usan cruces opuestos del hexágono
(`vertsOfHex(i)[0]` y `vertsOfHex(i)[3]`), que nunca son vecinos.

## Tests (`test/turno.test.js`)

Cada `describe` lleva el RF en el nombre. Al final de cada test que juega se llama a `checkInvariants` (RNF-1).

| RF | Test | Cómo |
|---|---|---|
| RF-1 | Tirar guarda los dos dados y anota «J0 saca un <suma>» | `withRandom(dados(3, 5))` → `[3, 5]`, «saca un 8» |
| RF-2 | Con un 8: la huerta de J0 recibe 1 y la bodega de J1 recibe 2 del recurso de la parcela; las cartas salen de la banca; el historial dice «J0 recibe 1 <recurso>»; fase `main` | huerta y bodega en cruces opuestos de una parcela con 8 |
| RF-2 | Las parcelas con otro número no producen | la misma partida con un dado que no es el de la parcela |
| RF-2 (caso límite) | La parcela bloqueada no produce aunque tenga huerta y bodega | `g.s.critic` sobre esa parcela |
| RF-3 | Banca corta con un solo receptor: una bodega con 1 carta en la banca recibe 1 y no se anota nada sobre la banca | otro jugador guarda las 18 restantes con `setRes` |
| RF-3 | Banca corta con varios receptores: nadie recibe y el historial dice «No queda <recurso> suficiente en la banca: nadie lo recibe» | 3 jugadores |
| RF-3 (caso límite) | Banca a 0 con un solo receptor: recibe 0 y no se anota nada | — |
| RF-4 | Con un 7 y manos de 7, 8 y 9 cartas: descartan J1 (4) y J2 (4), J0 no; fase `discard`; nadie recibe recursos | `withRandom(dados(3, 4))` |
| RF-4 / RF-6 | Con un 7 y nadie con más de 7 cartas: se pasa directo a `critic` | — |
| RF-5 | Un descarte con más o menos cartas de las exigidas, con cartas que no tiene o de un jugador sin descarte pendiente se rechaza sin cambiar nada | `foto` |
| RF-5 | Los descartes se aceptan en cualquier orden, devuelven las cartas a la banca, anotan «descarta 4 cartas» y, tras el último, pasan a `critic` | J2 antes que J1 |
| RF-6 | El Cítrico no puede quedarse en la misma parcela; puede ir a cualquier otra, también al Erial | `moveCritic` |
| RF-7 | Con un rival con cartas en la parcela: le roba directamente y vuelve a `main` | — |
| RF-7 | Con dos rivales: fase `steal` con los dos; elegir a alguien que no está en la lista se rechaza; elegir a uno roba y vuelve a `main` | 3 jugadores |
| RF-7 (casos límite) | No cuentan como víctimas: el propio jugador, un rival con la mano vacía; un rival con dos construcciones en la parcela cuenta una vez | — |
| RF-7 | Tras un Chef jugado antes de tirar, el robo vuelve a la fase `roll` | `s.after = 'roll'` preparado a mano (el Chef se prueba en la spec 008) |
| RF-8 | El robo elige una carta al azar con la misma probabilidad por carta: con mano {aceite 1, vino 3}, el azar 0 roba aceite y 0,99 roba vino; queda en `lastSteal`; el historial dice «J0 roba una carta a J1» sin el recurso | `withRandom` |
| RF-10 | Terminar el turno pasa al siguiente asiento (y del último al primero), suma 1 al turno, vuelve a `roll`, borra los dados y pone a `false` `devPlayed` y `offered` | — |
| RF-11 | Fuera de su fase se rechazan sin cambiar nada: tirar en `main`, descartar en `main`, mover el Cítrico en `roll`, robar en `main`, terminar el turno en `roll` | `foto` |

## Lo que no se automatiza

- **RF-9** (aviso del robo en la mano a la vista) es de la interfaz. Se comprueba a mano en el navegador preparando la
  partida desde Node: se genera con `test/helpers.js` un estado en la fase `critic` con una persona en el turno y una
  máquina con cartas en una parcela, se guarda en `localStorage` del navegador (`la-despensa.partida`) y se pulsa
  «Continuar partida». Al mover el Cítrico a esa parcela debe salir «Robas <icono> a <máquina>». Igual al revés, con la
  máquina en el turno, para ver «<máquina> te roba <icono>». A 375 px y en escritorio, sin errores en la consola
  (salvo los del service worker del navegador integrado, ya conocidos).
- El caso límite «si todos los que deben descartar son máquinas» depende de la máquina: está en la spec 004.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| `enJuego` salta la colocación y deja el tablero vacío | Jugar la colocación real como en la spec 009 | Con el tablero vacío cada test coloca solo lo que necesita y el resultado no depende de dónde cayeron las piezas iniciales |
| Controlar dados y robo con `withRandom` | Repetir el test hasta que salga el número | Los tests son deterministas: si fallan, fallan siempre igual |
| `withRandom` solo alrededor de `roll()` o `steal()` | Alrededor de todo el test | `Game.create` también usa el azar (reparto del tablero); así no se fuerza un tablero raro |
| Preparar a mano `s.after = 'roll'` para el caso del Chef | Jugar un Chef de verdad | El Chef pertenece a la spec 008; aquí solo se fija que el robo vuelve a la fase guardada |
| RF-9 a mano con un estado preparado | Esperar a que salga un robo jugando | Un robo depende de los dados: prepararlo es rápido y repetible |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Igual que en la 009: los tests describen código que ya funciona, así que en cada tarea se cambia a propósito el valor
  esperado, se ve fallar el test y se restaura. Nunca se toca `js/` para provocarlo.
- Cobertura: RF-1 a RF-8, RF-10 y RF-11 automáticos; RNF-1 con `checkInvariants`; RNF-2 porque todo corre en Node;
  RF-9 a mano.
