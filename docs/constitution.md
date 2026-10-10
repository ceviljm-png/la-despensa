# Constitución — La Despensa

Estado: aprobada · Adoptada el 10 de octubre de 2026 sobre el código de la versión 1.2.0

1. **Sin dependencias ni compilación.** JavaScript clásico que se abre con doble clic y se publica copiando la carpeta.
   La única excepción es PeerJS, copiado sin modificar en `js/vendor/`.
2. **La spec manda.** Todo cambio de comportamiento pasa antes por su spec en `specs/`; el código no añade lo que la spec no dice.
3. **Las reglas viven en el motor.** `engine.js` y `ai.js` no tocan el DOM, se ejecutan en Node y el estado es JSON plano;
   la interfaz solo dibuja y manda órdenes. Una jugada inválida devuelve `false`, nunca lanza una excepción.
4. **`npm test` siempre en verde.** Toda regla nueva se puede simular y se prueba antes de darla por hecha; los cambios
   visuales se comprueban en el navegador a 375 px y en escritorio, sin errores en la consola.
5. **Los datos del jugador se respetan.** Las partidas guardadas siguen cargando (valor por defecto o subir `version`),
   `localStorage` va siempre en `try/catch`, y todo texto ajeno pasa por `esc()` antes de entrar en `innerHTML`.
   En red, el anfitrión valida cada orden.
6. **En español y con identidad propia.** Interfaz, comentarios, documentación y commits en español; sin nombres ni arte
   de juegos comerciales ni referencias a otros proyectos, negocios o personas.
