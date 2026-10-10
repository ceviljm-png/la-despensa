# Plan 007 — Tests de caracterización de la partida en un dispositivo

Spec: [spec.md](spec.md) (implementada). Este plan **solo añade tests**: no cambia `js/`, `sw.js` ni el comportamiento.
Es la última spec de la red de seguridad. Reutiliza la infraestructura de las anteriores (`node:test`,
`test/helpers.js`, `npm test`).

Casi toda esta spec es interfaz (`js/ui.js`) y la propia spec pide comprobarla a mano. Aun así hay dos piezas que se
pueden fijar con tests automáticos sin tocar código:

- **El estado se guarda y se recupera tal cual (base de RF-7):** una partida convertida a texto y vuelta a cargar sigue
  jugando exactamente igual que la original.
- **El service worker (RF-10):** `sw.js` no usa el DOM; se puede ejecutar en Node dentro de un contexto aislado (`vm`)
  con un `self`, unas `caches` y un `fetch` de mentira, y comprobar su estrategia (red primero, copia guardada si no
  hay red). Esto es especialmente útil porque el navegador integrado no admite service workers (ver `MEMORY.md`).

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `test/partida-local.test.js` | nuevo | Tests de la spec 007 (estado guardado y service worker) |
| `specs/007-partida-local/tasks.md` | — | Resultado de la comprobación a mano |
| `js/*`, `sw.js`, `package.json` | **sin cambios** | `npm test` ya ejecuta cualquier `test/*.test.js` |

## Cómo se ejecuta `sw.js` en Node

```
cargarSW({ red, guardado })
  Crea un contexto vm con:
    self.addEventListener(tipo, fn)  → apunta los manejadores (install, activate, fetch)
    self.skipWaiting(), self.clients.claim()
    location = { origin: 'http://localhost:8130' }
    caches  = almacén de mentira { open(nombre) → { addAll, put, match }, match(req, opts), keys(), delete(nombre) }
    fetch   = la función `red` del test (devuelve una respuesta o lanza un error, como sin conexión)
    URL, Response (los de Node)
  Ejecuta el texto de sw.js en ese contexto y devuelve los manejadores y el almacén.
evento(tipo, datos) → objeto con waitUntil / respondWith que apunta la promesa que recibe
```

## Tests automáticos (`test/partida-local.test.js`)

| RF | Test |
|---|---|
| RF-7 | Una partida a mitad (colocación hecha y unos turnos de máquinas) pasada a texto y recuperada con `new Game(JSON.parse(…))` es igual a la original, y con el mismo azar sigue jugando exactamente igual 200 pasos (mismo estado al final) |
| RF-7 (caso límite) | Una partida nueva lleva `version: 1` (la que exige el inicio para ofrecer «Continuar partida») |
| RF-10 | Todos los archivos de la lista `FILES` de `sw.js` existen en el proyecto, y están todos los scripts que carga `index.html` (comprobación de la norma de `AGENTS.md`) |
| RF-10 | Al instalarse, guarda todos esos archivos en la caché `CACHE` y pide activarse sin esperar; al activarse, borra las cachés con otro nombre y toma el control |
| RF-10 | Con red, cada petición GET del propio origen se pide a la red, se devuelve esa respuesta y se guarda una copia si es correcta (no si es un error 404) |
| RF-10 | Sin red, devuelve la copia guardada (sin tener en cuenta la parte `?…` de la dirección) |
| RF-10 | Sin red y sin copia: una página devuelve la copia de `index.html`; cualquier otro archivo devuelve un error (no la página) |
| RF-10 | Las peticiones que no son GET o son de otro origen no se tocan (no hay `respondWith`) |

## Comprobación a mano

En el navegador integrado (375 px y escritorio) y, para lo que necesita service worker o `file://`, en Chrome real
(MCP de Chrome DevTools):

1. **Inicio (RF-1, casos límite):** Clásica y Normal marcadas, la descripción del nivel cambia al elegir otro; plazas
   Persona, Máquina, Máquina, No juega; la 3.ª y 4.ª ofrecen «No juega» y la 1.ª y 2.ª no; «No juega» desactiva el nombre.
2. **Empezar (RF-2, RF-4, RF-5, RF-6, RNF-3):** nombres por defecto (Rosa, Paco, Lola, Curro, «Jugador N») y uno escrito
   con caracteres especiales (`<b>Ana</b>`, que debe verse como texto), cabecera «Clásica · a 10 puntos · Normal»,
   fichas de jugador y su detalle, líneas de estado, dados y parcelas resaltadas, aviso «Nueva carta: …».
3. **Varias personas (RF-3, caso límite):** con dos personas, «Le toca a …» y «Ya lo tengo» antes de cada turno, sin
   mano visible mientras tanto; con una sola persona, su mano siempre a la vista.
4. **Guardado (RF-7, RNF-1, caso límite):** recargar a mitad → «Continuar partida» reanuda igual; una partida guardada
   con otra versión no se ofrece; con el almacenamiento bloqueado (`setItem` que falla) se juega sin errores.
5. **Menú (RF-8):** sus cuatro opciones; «Máquina: rápida» se recuerda tras recargar.
6. **Final (RF-9, caso límite):** con un estado preparado a punto de ganar, «¡… gana!» con la clasificación (con
   Estrellas), «Ver tablero» deja solo «Nueva partida» y la partida guardada ya no está.
7. **App instalable y sin conexión (RF-10, RNF-2):** en Chrome real, el service worker queda activo; con la red cortada
   (emulación sin conexión) la página recarga y se puede jugar; abriendo `index.html` como archivo (`file://`) el juego
   funciona sin registrar service worker.
8. **375 px (RNF-4):** sin desplazamiento horizontal en el inicio, la partida y los diálogos.

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Ejecutar `sw.js` en `vm` con dobles de `caches` y `fetch` | Probarlo solo a mano | El navegador integrado no admite service workers y el uso sin conexión es fácil de romper al tocar la lista de archivos |
| Comprobar que `FILES` cubre los scripts de `index.html` | Confiar en revisarlo a mano | `AGENTS.md` lo exige al añadir archivos; un test lo vigila siempre |
| Partida «idéntica tras guardar» con el mismo azar | Comparar solo el estado recién cargado | Comprueba que no se pierde nada que afecte al juego futuro (por ejemplo, el mazo o el orden) |
| El resto a mano | Simular el DOM en Node | Sería añadir dependencias (principio 1 de la constitución) |

## Estrategia de tests

- Comando: `npm test` (de `AGENTS.md`). Debe terminar en `OK`.
- Cada test se ve fallar cambiando a propósito lo esperado (cada cambio por separado sobre el archivo original) y se
  restaura. Nunca se toca `js/` ni `sw.js` para provocarlo.
- Cobertura: base de RF-7 y RF-10 automáticos; RF-1 a RF-10 y RNF-1 a RNF-4 a mano, como pide la spec.

---

# Cambio del 10 de octubre de 2026 — RF-11 y RF-12

Cubre los dos RF nuevos de la spec: **RF-11** (al menos una persona) y **RF-12** (confirmar antes de borrar la partida
guardada). El resto no cambia.

## Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `js/check.js` | ampliar | Dos funciones puras nuevas: `hasPerson(plazas)` y `savedGame(guardado)`. El archivo pasa a describirse como «comprobaciones sin DOM que usa la interfaz» | RF-11, RF-12 |
| `js/ui.js` | modificar | «Empezar partida» comprueba `hasPerson` y pide confirmación; «Empezar la partida» de la sala de espera pide confirmación; `showMenu` usa `savedGame` (misma condición que hoy, en un solo sitio) | RF-11, RF-12, RF-7 |
| `index.html` | modificar | Un párrafo oculto bajo «Empezar partida» para el aviso de RF-11 | RF-11 |
| `test/partida-local.test.js` | ampliar | Tests de `hasPerson` y `savedGame` | RF-11, RF-12 |
| `AGENTS.md` | modificar | Descripción de `js/check.js` | — |

No hay archivos nuevos: `sw.js` no cambia (su lista ya incluye `check.js` y `index.html`).

## Funciones puras (`js/check.js`)

```
hasPerson(plazas) → true si alguna de las plazas que juegan es una persona                    (RF-11)
  plazas = lista de { ai } (las que juegan; las de «No juega» ya no están)
  devuelve plazas.some(p => !p.ai)

savedGame(guardado) → null si no hay una partida que se pueda continuar; si la hay, { room }   (RF-7, RF-12)
  guardado = lo leído de la partida guardada (puede ser null o cualquier cosa)
  si guardado y guardado.s y guardado.s.version === 1 y guardado.s.phase !== 'over'
    → { room: guardado.s.net ? guardado.s.net.room : null }
  si no → null
  (Es la condición que hoy usa showMenu para ofrecer «Continuar partida»; así las dos cosas siempre coinciden)
```

## Cambios en la interfaz (`js/ui.js`)

```
confirmarNueva()                                                                              (RF-12)
  saved = Check.savedGame(load(SAVE_KEY)); si es null → true
  r = dialog: «¿Empezar otra partida?» / «Ya tienes una partida sin terminar. Si empiezas otra, se perderá.»
      + (saved.room ? « Era la sala » + esc(saved.room) + «.» : '') / botones «Cancelar» (no) y «Empezar otra» (yes)
  devuelve r === 'yes'

«Empezar partida» (click)                                                                     (RF-11, RF-12)
  plazas = las que juegan (como hoy)
  si no Check.hasPerson(plazas) → mostrar #start-msg «Tiene que jugar al menos una persona.» y salir
  si no await confirmarNueva() → salir
  (como hoy) leaveNet(); crear la partida; empezar

cambio en las plazas (sync)  → ocultar #start-msg                                             (caso límite)

sala de espera, «Empezar la partida»                                                          (RF-12)
  si no await confirmarNueva() → salir (la sala sigue abierta con sus jugadores)
  (como hoy) startNetGame()

showMenu                                                                                      (RF-7, sin cambio visible)
  saved = Check.savedGame(load(SAVE_KEY)); «Continuar partida» visible si saved; texto «Reabrir la sala X» si saved.room
```

### Cómo se pinta
- RF-11: un párrafo en rojo bajo «Empezar partida» («Tiene que jugar al menos una persona.»), con el mismo estilo de
  los avisos de las ventanas de red (`.refused`); se oculta al cambiar cualquier plaza.
- RF-12: un diálogo como los demás del juego (título, texto y dos botones en fila).

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Las funciones en `js/check.js` | Un archivo nuevo `js/menu.js` | Son dos funciones pequeñas; un archivo nuevo obligaría a tocar `sw.js` e `index.html` sin ganar nada |
| Aviso en un párrafo del inicio | Un aviso flotante (toast) | El toast desaparece solo a los 3 s; el párrafo se queda hasta que se corrige, como dice la spec |
| `savedGame` también en `showMenu` | Repetir la condición | «Se ofrece continuar» y «se pide confirmación» deben coincidir siempre (casos límite de la spec) |

## Estrategia de tests
- `npm test` (de `AGENTS.md`), tests primero y en rojo:
  - `hasPerson`: una persona → sí; todas máquinas → no; lista vacía → no; persona entre máquinas → sí.
  - `savedGame`: `null`, `undefined`, texto, sin `s`, versión 2, partida terminada → `null`; partida en curso → `{ room: null }`;
    partida en red → `{ room: 'ABCD' }`; con una partida real creada con el motor → `{ room: null }`.
- A mano en el navegador (375 px y escritorio): todas las plazas en Máquina → aviso y no empieza; poner una Persona →
  desaparece el aviso; con partida guardada → diálogo, «Cancelar» la mantiene y «Empezar otra» la sustituye; con una
  partida en red guardada → el diálogo nombra la sala; en la sala de espera (con el PeerJS de mentira) → diálogo al
  empezar; sin partida guardada → sin diálogo. Sin errores en la consola.
