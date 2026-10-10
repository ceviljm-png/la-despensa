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
