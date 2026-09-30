# La Despensa

Juego de estrategia por turnos sobre una isla de 19 parcelas: se plantan huertas, se amplían a bodegas,
se tienden caminos y se comercia con aceite, sal, pescado, trigo y vino. Es una app web instalable (PWA):
el mismo juego funciona en Android y en macOS, sin tiendas ni compilación.

## Jugar

- **En el Mac, sin instalar nada:** abrir `index.html` con doble clic.
- **Con servidor local** (necesario para instalarla y para abrirla desde el móvil en la misma wifi):

  ```bash
  python3 serve.py
  ```

  Mac: `http://localhost:8130` · Android: `http://<IP-del-Mac>:8130`
- **Instalada como app:** hay que publicarla en una dirección `https://` (cualquier alojamiento de archivos
  estáticos sirve: basta subir esta carpeta). Después, en Chrome de Android «Instalar aplicación» y en el Mac
  el icono de instalar de Chrome o «Añadir al Dock» de Safari. Una vez instalada funciona sin conexión.

## Tipos de partida

| | Sencilla | Clásica | Completa |
|---|---|---|---|
| Puntos para ganar | 8 | 10 | 10 |
| Puertos (cambios 3:1 y 2:1) | – | sí | sí |
| Cartas de cocina, Gran Brigada | – | sí | sí |
| Cambios entre jugadores | – | – | sí |

De 2 a 4 jugadores; cada uno puede ser una persona (pasando el dispositivo) o la máquina.
La partida se guarda sola y se puede continuar desde el inicio.

## Código

- `js/engine.js` — reglas y estado de la partida, sin DOM.
- `js/ai.js` — decisiones de los rivales.
- `js/ui.js`, `css/style.css`, `index.html` — interfaz.
- `sw.js`, `manifest.webmanifest`, `icons/` — instalación y uso sin conexión.
- `test/sim.js` — partidas completas máquina contra máquina que comprueban las reglas: `node test/sim.js`.
