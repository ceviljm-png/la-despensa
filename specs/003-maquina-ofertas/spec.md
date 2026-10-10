# Spec 003 — La máquina ante los cambios: valorar y proponer

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo decide la máquina si acepta una oferta de cambio en cada nivel de dificultad y
cuándo propone ella un cambio. Es lo único en lo que los tres niveles se comportan de forma claramente distinta,
y lo que más se ha ajustado (el nivel Normal nació para corregir lo tacaño del Difícil).

## Usuarios
- Personas que proponen cambios a la máquina en la partida Completa.
- Las propias máquinas, que se proponen cambios entre ellas.

## Historias de usuario
- HU-1. Como jugador, quiero elegir lo exigente que es la máquina al comerciar, para ajustar la dificultad.
- HU-2. Como jugador en Normal, quiero que una oferta más generosa tenga más posibilidades de ser aceptada.
- HU-3. Como jugador, quiero que la máquina no ayude a quien está a punto de ganar (salvo en Fácil).
- HU-4. Como jugador, quiero que la máquina también me proponga cambios cuando le falta poco para construir.

## Definiciones
- **Oferta**: quien propone da unas cartas y pide otras; la máquina que valora **recibe** lo que se da y **entrega** lo que se pide.
- **Puntos a la vista**: sin contar las Estrellas.
- **Objetivo de partida**: 8 puntos en Sencilla, 10 en Clásica y Completa.
- **Orden de recursos**: aceite, sal, pescado, trigo, vino.
- **Motivos de rechazo**: `sin`, `lider`, `poco`, `ultima` y `sobra` (textos en la spec 002, RNF-2).

## Requisitos funcionales
- RF-1: CUANDO la máquina valora una oferta y no tiene todas las cartas que se le piden, EL SISTEMA la rechaza con el motivo `sin`, en cualquier nivel.
- RF-2: MIENTRAS el nivel es Fácil, EL SISTEMA acepta toda oferta en la que la máquina recibe al menos tantas cartas como entrega, y rechaza el resto con el motivo `poco`.
- RF-3: MIENTRAS el nivel es Normal o Difícil, SI quien propone tiene puntos a la vista iguales o mayores que el objetivo menos 2, ENTONCES EL SISTEMA rechaza la oferta con el motivo `lider`.
- RF-4: MIENTRAS el nivel es Difícil, SI la máquina recibe menos cartas de las que entrega, ENTONCES EL SISTEMA rechaza la oferta con el motivo `poco`.
- RF-5: MIENTRAS el nivel es Difícil, SI entregar lo pedido dejaría a la máquina sin ninguna carta de un recurso, ENTONCES EL SISTEMA rechaza la oferta con el motivo `ultima` y ese recurso.
- RF-6: MIENTRAS el nivel es Difícil, SI la máquina recibiría un recurso del que ya tiene 3 o más, ENTONCES EL SISTEMA rechaza la oferta con el motivo `sobra` y ese recurso.
- RF-7: MIENTRAS el nivel es Normal, EL SISTEMA acepta toda oferta que se aceptaría en Difícil y, además, cualquier otra en la que la ganancia sea mayor o igual que la pérdida, contadas carta a carta: cada carta entregada pesa 1,5 si es la última de ese recurso, 1 si le quedan 2 y 0,6 si tiene más; cada carta recibida vale 1,2 si no tenía de ese recurso, 1 si tenía 1, 0,7 si tenía 2 y 0,4 si tenía 3 o más; si no, la rechaza con el motivo `poco`.
- RF-8: MIENTRAS es el turno de una máquina en la fase de construir y comerciar de la partida Completa y aún no ha propuesto en ese turno, CUANDO a su primer objetivo de construcción que no puede pagar le faltan 1 o 2 cartas, EL SISTEMA hace que proponga un cambio de 1 por 1: pide el primer recurso que le falta y da el recurso que más le sobra después de reservar ese coste (en Fácil, por el azar, puede dar cualquiera de los que le sobran).
- RF-9: SI la máquina puede pagar un objetivo anterior en su lista, le faltan más de 2 cartas para todos, o no le sobra ningún recurso para dar, ENTONCES EL SISTEMA no le hace proponer ningún cambio en ese momento.
- RF-10: EL SISTEMA no deja que una máquina proponga más de un cambio por turno, se acepte o no.

## Requisitos no funcionales
- RNF-1: La valoración de una oferta no usa azar: con el mismo estado y la misma oferta, la respuesta es siempre la misma.
- RNF-2: En cualquier estado, si una oferta se acepta en Difícil también se acepta en Normal.
- RNF-3: Se puede ejecutar sin navegador, en la simulación.

## Casos límite
- En Difícil, si varios recursos activan `ultima` o `sobra`, el motivo es el del primero en el orden de recursos; para un mismo recurso, `ultima` va antes que `sobra`.
- En Fácil no se aplica `lider`: la máquina ayuda aunque quien propone esté a punto de ganar.
- En Fácil la máquina acepta quedarse sin la última carta de un recurso.
- En Normal, 1 trigo por 1 vino teniendo 1 vino y 0 trigo: pierde 1,5 y gana 1,2 → rechaza (`poco`); con 2 trigo por 1 vino gana 2,2 → acepta.
- Con 8 puntos a la vista en una partida a 10, quien propone ya se considera líder.
- Con varios objetivos, la máquina pide solo 1 carta aunque le falten 2.
- La forma de proponer es la misma en los tres niveles; en Fácil solo cambia el azar al elegir qué recurso dar (confirmado como intencionado el 10 de octubre de 2026).

## Fuera de alcance
- A quién se ofrece el cambio que propone la máquina y en qué orden (spec 002, RF-9).
- La lista de objetivos de construcción de la máquina y el resto de su turno (spec 004).
- El azar que la máquina suma a sus elecciones de juego (spec 004).

## Criterios de finalización
- RF-1 a RF-10 tienen tests de caracterización en `npm test` con estados preparados a mano (no partidas al azar), y `npm test` termina en `OK`.

## Dudas abiertas
Ninguna. La única que había (si el nivel debe notarse al proponer) se confirmó como intencionada y está en «Casos límite».
