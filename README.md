# La Despensa

Juego de estrategia por turnos sobre una isla de 19 parcelas: se plantan huertas, se amplían a bodegas,
se tienden caminos y se comercia con aceite, sal, pescado, trigo y vino. Es una app web instalable (PWA):
el mismo juego funciona en Android y en macOS, sin tiendas ni compilación.

**Jugar ahora:** https://ceviljm-png.github.io/la-despensa/

## Instalarlo como app

- **Android (Chrome):** abrir el enlace, menú ⋮ y «Instalar aplicación».
- **Mac (Chrome):** abrir el enlace y pulsar el icono de instalar de la barra de direcciones.
- **Mac (Safari):** abrir el enlace y Archivo → «Añadir al Dock».

Una vez instalada funciona sin conexión.

## Cómo es una partida

De 2 a 4 jugadores; cada uno puede ser una persona (pasando el dispositivo) o la máquina.
La partida se guarda sola y se puede continuar desde el inicio.

| Tipo de partida | Sencilla | Clásica | Completa |
|---|---|---|---|
| Puntos para ganar | 8 | 10 | 10 |
| Puertos (cambios 3:1 y 2:1) | – | sí | sí |
| Cartas de cocina y Gran Brigada | – | sí | sí |
| Cambios entre jugadores | – | – | sí |

| Dificultad | Los rivales que lleva la máquina… |
|---|---|
| Fácil | juegan peor y aceptan cualquier cambio en el que no salgan perdiendo cartas |
| Normal | aceptan un cambio si les compensa: cuanto más se ofrece, más fácil |
| Difícil | nunca se quedan sin un recurso ni aceptan lo que ya les sobra |

Las reglas completas están dentro del juego, en «Cómo se juega».

## Desarrollo

```bash
npm start
```

Sirve el juego en `http://localhost:8130` (también vale abrir `index.html` con doble clic).

```bash
npm test
```

Juega partidas completas máquina contra máquina y comprueba las reglas.

No hay dependencias ni paso de compilación. La arquitectura y las normas del proyecto están en
[AGENTS.md](AGENTS.md); las decisiones, el estado y el historial, en [MEMORY.md](MEMORY.md).
