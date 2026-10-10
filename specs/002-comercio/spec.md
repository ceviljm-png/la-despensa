# Spec 002 — Comercio con la banca, puertos y entre jugadores

Estado: implementada

## Contexto y objetivo
Documenta, sin cambiarlo, cómo se cambian cartas de recurso: con la banca (4:1 o mejor con puertos) y, en la
partida Completa, con los rivales, tanto cuando propone una persona como cuando propone la máquina. Es la parte
que más quejas ha dado («parece que no hace nada»), por eso cada rechazo tiene que explicarse.

## Usuarios
- Personas que juegan y quieren conseguir el recurso que les falta.
- La máquina, que comercia con la banca y propone cambios a los demás.

## Historias de usuario
- HU-1. Como jugador, quiero cambiar cartas repetidas con la banca para conseguir la que me falta.
- HU-2. Como jugador con una huerta en un puerto, quiero cambiar en mejores condiciones.
- HU-3. Como jugador de la partida Completa, quiero proponer un cambio a mis rivales y elegir con quién cerrarlo.
- HU-4. Como jugador, quiero saber por qué cada rival rechaza mi oferta, para mejorarla.
- HU-5. Como persona, quiero poder aceptar o rechazar los cambios que me propone la máquina.

## Definiciones
- **Proporción**: cuántas cartas iguales hay que entregar a la banca por 1 carta.
- **Puerto**: lado de costa de tipo 3:1 (cualquier recurso) o 2:1 (un recurso concreto). Solo existen en Clásica y Completa.
- **Oferta**: lo que entrega quien propone (`da`) y lo que pide a cambio (`pide`); ambas partes con al menos 1 carta.
- **Quien propone**: siempre el jugador del turno.

## Requisitos funcionales
- RF-1: MIENTRAS el turno está en la fase de construir y comerciar, CUANDO el jugador del turno cambia con la banca un recurso por otro distinto, EL SISTEMA lo acepta solo si tiene al menos tantas cartas de ese recurso como su proporción y la banca tiene al menos 1 del recurso pedido; entonces mueve las cartas entre la mano y la banca y lo anota en el historial.
- RF-2: EL SISTEMA aplica a cada recurso la mejor proporción del jugador: 4 por defecto, 3 si tiene una huerta o bodega en un extremo de un puerto 3:1, y 2 si la tiene en un puerto 2:1 de ese recurso.
- RF-3: MIENTRAS el turno está en la fase de construir y comerciar de la partida Completa, CUANDO dos jugadores distintos, uno de ellos el del turno, cierran un cambio, EL SISTEMA lo acepta solo si cada uno tiene las cartas que entrega, intercambia las cartas y lo anota en el historial; en Sencilla y Clásica lo rechaza siempre.
- RF-4: MIENTRAS una persona está en su turno, EL SISTEMA le permite abrir el comercio, que muestra para cada recurso su proporción y las cartas que tiene, solo deja elegir los recursos que puede entregar y los que la banca tiene (distintos del entregado), y tras cada cambio sigue abierto con el texto «Hecho: <n> <recurso> por 1 <recurso>».
- RF-5: MIENTRAS una persona prepara una oferta a sus rivales, EL SISTEMA no deja ofrecer más cartas de las que tiene ni pedir más de 9 de un recurso, no deja que un mismo recurso esté a la vez en lo que da y en lo que pide, y no deja proponer hasta que ambas partes tengan al menos 1 carta.
- RF-6: CUANDO una persona propone una oferta, EL SISTEMA pregunta a cada rival en orden de asiento a partir de quien propone: si es máquina, decide según el nivel (spec 003); si es una persona sin las cartas pedidas, la rechaza sin preguntarle; si no, le pregunta si acepta.
- RF-7: SI ningún rival acepta, ENTONCES EL SISTEMA deja el comercio abierto con el texto «Nadie acepta. Por <lo que da> a cambio de <lo que pide>: <rival> <motivo>; …», con el nombre y el motivo de cada rival.
- RF-8: CUANDO al menos un rival acepta, EL SISTEMA deja a quien propone elegir con quién cambiar entre los que aceptan, o cancelar; si elige, hace el cambio, y en los dos casos cierra el comercio.
- RF-9: CUANDO la máquina propone un cambio, EL SISTEMA se lo ofrece primero a las personas y después a las máquinas, en orden de asiento dentro de cada grupo, saltándose a quien no tiene las cartas pedidas; el primero que acepta cierra el cambio y, si nadie acepta, no hay cambio.
- RF-10: CUANDO se pregunta a una persona por una oferta, EL SISTEMA le muestra quién la propone, lo que le dan y lo que le piden, con los botones «Rechazar» y «Aceptar».

## Requisitos no funcionales
- RNF-1: Un cambio nunca crea ni destruye cartas: el total de cada recurso entre la banca y las manos sigue siendo 19.
- RNF-2: Los motivos de rechazo usan siempre estos textos: «no tiene lo que pides», «no quiere ayudarte, vas ganando», «pide algo más a cambio», «lo rechaza» (persona), «no quiere quedarse sin <recurso>» y «ya tiene <recurso> de sobra».

## Casos límite
- Con una huerta en un puerto 3:1 y otra en uno 2:1 de vino: vino a 2, el resto a 3.
- Si la banca no tiene el recurso pedido, ese recurso no se puede elegir y el cambio con la banca se rechaza.
- No se puede cambiar un recurso por sí mismo con la banca.
- Una oferta de la máquina que nadie puede pagar no llega a mostrarse a ninguna persona.
- Si solo acepta un rival, la ventana de elección se titula «Hay trato»; con varios, «¿Con quién cambias?».
- Cancelar la elección no hace ningún cambio y no muestra texto de rechazo.
- Con varias personas en un mismo dispositivo, la pregunta a otra persona aparece en la pantalla tal como está, sin pasar el dispositivo (confirmado como intencionado el 10 de octubre de 2026).
- Cuando nadie acepta un cambio propuesto por la máquina, no se anota nada en el historial (confirmado como intencionado).

## Fuera de alcance
- Cuándo y qué propone la máquina, y cómo valora cada nivel las ofertas (spec 003).
- Cómo viajan ofertas y respuestas entre dispositivos y sus tiempos de espera (spec de partidas en red).
- Dónde están los puertos en el tablero (spec de tablero y preparación).

## Criterios de finalización
- RF-1 a RF-3 tienen tests de caracterización en `npm test`, y `npm test` termina en `OK`.
- RF-4 a RF-10 y RNF-2 están comprobados a mano en el navegador, a 375 px y en escritorio.
  (Corregido el 10 de octubre de 2026: RF-9 y los textos de RNF-2 están en la interfaz, no en el motor, y no se pueden
  probar en Node sin cambiar código; ver `plan.md`.)

## Dudas abiertas
Ninguna. Resueltas el 10 de octubre de 2026:
- **Rechazo repetido** — hoy, si se repite exactamente la misma oferta, el texto de rechazo es idéntico al anterior
  (`js/ui.js:847`, `js/ui.js:896`). Decisión del propietario: **tiene que cambiar**. Como el código actual no lo cumple,
  no es un requisito de esta spec (que describe lo que hay): se hará con `/sdd-change 002` y entonces se añadirá el RF.
- Pasar el dispositivo en las ofertas y el rastro de las ofertas de la máquina: intencionados; están en «Casos límite».
