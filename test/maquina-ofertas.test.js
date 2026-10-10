/* Spec 003 — La máquina ante los cambios: valorar y proponer. Tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const AI = require('../js/ai.js');
const { RES } = require('../js/engine.js');
const h = require('./helpers.js');

const NIVELES = ['facil', 'normal', 'dificil'];

/* Partida de 2 en la fase de construir: J1 es la máquina que valora y J0 quien propone, con `puntos` a la vista */
const juez = (level, { mano = {}, puntos = 0, mode = 'completa' } = {}) => {
  const g = h.enJuego(h.newGame({ mode, level }), { phase: 'main' });
  h.setRes(g, 1, mano);
  if (puntos >= 2) h.spread(g, 0, Math.floor(puntos / 2), 2);
  if (puntos % 2) h.spread(g, 0, 1);
  assert.equal(g.points(0, false), puntos, 'preparación de los puntos');
  return g;
};
/* Lo que responde J1 a una oferta de J0 */
const valora = (g, give, get) => AI.judge(g, 1, { from: 0, give, get });

describe('RF-1 · sin lo que se le pide', () => {
  test('en los tres niveles rechaza con «sin», aunque la oferta sea muy generosa', () => {
    for (const level of NIVELES) {
      assert.deepEqual(valora(juez(level), { aceite: 3 }, { sal: 1 }), { ok: false, why: 'sin' }, level);
    }
  });
});

describe('RF-2 · nivel Fácil', () => {
  test('acepta si recibe tantas o más cartas de las que entrega; si recibe menos, «poco»', () => {
    const g = juez('facil', { mano: { sal: 2 } });
    assert.deepEqual(valora(g, { aceite: 1 }, { sal: 1 }), { ok: true });
    assert.deepEqual(valora(g, { aceite: 2 }, { sal: 1 }), { ok: true });
    assert.deepEqual(valora(g, { aceite: 1 }, { sal: 2 }), { ok: false, why: 'poco' });
  });

  test('ayuda aunque quien propone esté a punto de ganar y aunque se quede sin la última carta', () => {
    assert.deepEqual(valora(juez('facil', { mano: { sal: 2 }, puntos: 9 }), { aceite: 1 }, { sal: 1 }), { ok: true });
    assert.deepEqual(valora(juez('facil', { mano: { sal: 1 } }), { aceite: 1 }, { sal: 1 }), { ok: true });
  });
});

describe('RF-3 · no ayuda a quien va ganando (Normal y Difícil)', () => {
  const buena = [{ aceite: 1 }, { sal: 1 }];
  const mano = { sal: 2 };

  test('en Clásica (a 10), con 8 puntos a la vista rechaza con «lider»; con 7, acepta', () => {
    for (const level of ['normal', 'dificil']) {
      assert.deepEqual(valora(juez(level, { mano, puntos: 8, mode: 'clasica' }), ...buena), { ok: false, why: 'lider' }, level);
      assert.deepEqual(valora(juez(level, { mano, puntos: 7, mode: 'clasica' }), ...buena), { ok: true }, level);
    }
  });

  test('en Sencilla (a 8), el límite es 6', () => {
    for (const level of ['normal', 'dificil']) {
      assert.deepEqual(valora(juez(level, { mano, puntos: 6, mode: 'sencilla' }), ...buena), { ok: false, why: 'lider' }, level);
      assert.deepEqual(valora(juez(level, { mano, puntos: 5, mode: 'sencilla' }), ...buena), { ok: true }, level);
    }
  });

  test('las Estrellas de quien propone no cuentan', () => {
    for (const level of ['normal', 'dificil']) {
      const g = juez(level, { mano, puntos: 7 });
      h.darCarta(g, 0, 'estrella');
      h.darCarta(g, 0, 'estrella');
      assert.equal(g.points(0, true), 9);
      assert.deepEqual(valora(g, ...buena), { ok: true }, level);
      h.checkInvariants(g);
    }
  });
});

describe('RF-4, RF-5 y RF-6 · nivel Difícil', () => {
  test('control: 1 aceite por 1 sal teniendo 2 sal y ningún aceite se acepta', () => {
    assert.deepEqual(valora(juez('dificil', { mano: { sal: 2 } }), { aceite: 1 }, { sal: 1 }), { ok: true });
  });

  test('si recibe menos cartas de las que entrega, «poco», aunque no le quite nada escaso', () => {
    assert.deepEqual(valora(juez('dificil', { mano: { sal: 4 } }), { aceite: 1 }, { sal: 2 }), { ok: false, why: 'poco' });
  });

  test('si se quedaría sin un recurso, «ultima» con ese recurso', () => {
    assert.deepEqual(valora(juez('dificil', { mano: { sal: 1 } }), { aceite: 1 }, { sal: 1 }), { ok: false, why: 'ultima', res: 'sal' });
  });

  test('si ya tiene 3 o más de lo que le dan, «sobra» con ese recurso', () => {
    assert.deepEqual(valora(juez('dificil', { mano: { sal: 2, aceite: 3 } }), { aceite: 1 }, { sal: 1 }), { ok: false, why: 'sobra', res: 'aceite' });
    assert.deepEqual(valora(juez('dificil', { mano: { sal: 2, aceite: 2 } }), { aceite: 1 }, { sal: 1 }), { ok: true }, 'con 2, no le sobra');
  });

  test('con varios motivos, gana el primer recurso en el orden aceite, sal, pescado, trigo, vino', () => {
    const g = juez('dificil', { mano: { aceite: 3, vino: 3 } });
    h.setRes(g, 1, { aceite: 1, vino: 3 });
    assert.deepEqual(valora(g, { vino: 1 }, { aceite: 1 }), { ok: false, why: 'ultima', res: 'aceite' }, 'pide aceite (última) y da vino (sobra)');
    h.setRes(g, 1, { aceite: 3, vino: 1 });
    assert.deepEqual(valora(g, { aceite: 1 }, { vino: 1 }), { ok: false, why: 'sobra', res: 'aceite' }, 'pide vino (última) y da aceite (sobra)');
  });
});

describe('RF-7 · nivel Normal', () => {
  test('acepta lo que acepta Difícil', () => {
    assert.deepEqual(valora(juez('normal', { mano: { sal: 2 } }), { aceite: 1 }, { sal: 1 }), { ok: true });
  });

  test('ejemplo de la spec: con 1 vino y 0 trigo, 1 trigo por 1 vino no le compensa y 2 trigo sí', () => {
    const g = juez('normal', { mano: { vino: 1 } });
    assert.deepEqual(valora(g, { trigo: 1 }, { vino: 1 }), { ok: false, why: 'poco' }, 'gana 1,2 y pierde 1,5');
    assert.deepEqual(valora(g, { trigo: 2 }, { vino: 1 }), { ok: true }, 'gana 2,2 y pierde 1,5');
  });

  test('acepta lo que compensa aunque Difícil lo rechace por «sobra»', () => {
    const mano = { sal: 2, aceite: 3 };
    const oferta = [{ aceite: 1, pescado: 1 }, { sal: 1 }];
    assert.deepEqual(valora(juez('dificil', { mano }), ...oferta), { ok: false, why: 'sobra', res: 'aceite' });
    assert.deepEqual(valora(juez('normal', { mano }), ...oferta), { ok: true }, 'gana 0,4 + 1,2 y pierde 1');
  });
});

describe('RNF-1 y RNF-2 · propiedades de la valoración', () => {
  /* Generador de números pseudoaleatorios con semilla, para que el barrido sea siempre el mismo */
  const semilla = (n) => () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);

  test('en 2.000 situaciones al azar, todo lo que acepta Difícil también lo acepta Normal', () => {
    const azar = semilla(2026);
    const entero = (max) => Math.floor(azar() * (max + 1));
    const cartas = (n) => {
      const m = {};
      for (let k = 0; k < n; k++) { const r = RES[entero(4)]; m[r] = (m[r] || 0) + 1; }
      return m;
    };
    const g = juez('dificil');
    let aceptaDificil = 0, soloNormal = 0;
    for (let i = 0; i < 2000; i++) {
      h.setRes(g, 1, Object.fromEntries(RES.map((r) => [r, entero(4)])));
      const give = cartas(1 + entero(1)), get = cartas(1 + entero(1));
      g.s.level = 'dificil';
      const dificil = valora(g, give, get);
      g.s.level = 'normal';
      const normal = valora(g, give, get);
      if (dificil.ok) assert.ok(normal.ok, `Normal rechaza lo que Difícil acepta: ${JSON.stringify({ mano: g.s.players[1].res, give, get })}`);
      aceptaDificil += dificil.ok;
      soloNormal += normal.ok && !dificil.ok;
    }
    assert.ok(aceptaDificil > 50 && soloNormal > 50, `el barrido debe cubrir los dos casos (${aceptaDificil}, ${soloNormal})`);
  });

  test('la misma oferta en el mismo estado da la misma respuesta, cambie como cambie el azar', () => {
    const ofertas = [[{ aceite: 1 }, { sal: 1 }], [{ trigo: 1 }, { vino: 1 }], [{ aceite: 1, pescado: 1 }, { sal: 1 }], [{ aceite: 1 }, { sal: 2 }]];
    for (const level of NIVELES) {
      const g = juez(level, { mano: { sal: 2, aceite: 3, vino: 1 } });
      for (const [give, get] of ofertas) {
        const base = valora(g, give, get);
        for (const fuente of [0, 0.5, 0.99]) assert.deepEqual(h.withRandom(fuente, () => valora(g, give, get)), base, `${level} con azar ${fuente}`);
      }
    }
  });
});

describe('RF-8, RF-9 y RF-10 · cuándo propone la máquina', () => {
  /* Partida de 2 en la fase de construir en la que J1 (máquina) tiene el turno, una huerta en el cruce 20 y un camino
     de 2 lados hasta el cruce 12, libre para otra huerta. Sus objetivos: bodega, huerta y carta de cocina */
  const proponente = (level, mano, mode = 'completa') => {
    const g = h.enJuego(h.newGame({ mode, level }), { phase: 'main', current: 1 });
    g.s.players[1].ai = true;
    h.put(g, 20, 1);
    h.road(g, h.edgeBetween(20, 13), 1);
    h.road(g, h.edgeBetween(13, 12), 1);
    h.setRes(g, 1, mano);
    assert.deepEqual(g.settlementSpots(1, false), [12], 'preparación: un sitio libre para otra huerta');
    return g;
  };
  /* Le falta 1 trigo para la huerta y solo le sobra el vino */
  const FALTA_TRIGO = { aceite: 1, sal: 1, pescado: 1, vino: 1 };

  test('le falta 1 carta para la huerta: propone 1 vino por 1 trigo, en los tres niveles, y queda marcado', () => {
    for (const level of NIVELES) {
      const g = proponente(level, FALTA_TRIGO);
      const antes = JSON.stringify(g.s.players);
      assert.deepEqual(AI.step(g), { offer: { from: 1, give: { vino: 1 }, get: { trigo: 1 } } }, level);
      assert.equal(g.s.offered, true);
      assert.equal(JSON.stringify(g.s.players), antes, 'proponer no cambia ninguna mano');
    }
  });

  test('si le faltan 2 cartas, pide solo 1: la primera en el orden de recursos', () => {
    const g = proponente('normal', { aceite: 1, sal: 1, vino: 1 });
    assert.deepEqual(AI.step(g), { offer: { from: 1, give: { vino: 1 }, get: { pescado: 1 } } });
  });

  test('no propone si puede pagar la huerta: la planta', () => {
    const g = proponente('normal', { aceite: 1, sal: 1, pescado: 1, trigo: 1 });
    assert.equal(AI.step(g), true);
    assert.deepEqual([g.s.offered, g.s.builds[12]], [false, { p: 1, t: 1 }]);
    h.checkInvariants(g);
  });

  test('no propone si le faltan más de 2 cartas para todo, ni si no le sobra nada que dar', () => {
    for (const [motivo, mano] of [['sin cartas', {}], ['sin nada que le sobre', { aceite: 1, sal: 1, pescado: 1 }]]) {
      const g = proponente('normal', mano);
      const r = AI.step(g);
      assert.equal(r, true, motivo);
      assert.equal(g.s.offered, false, motivo);
    }
  });

  test('en Clásica no propone nunca', () => {
    const g = proponente('normal', FALTA_TRIGO, 'clasica');
    assert.equal(AI.step(g), true);
    assert.equal(g.s.offered, false);
  });

  test('no propone dos veces en el mismo turno, aunque le siga faltando lo mismo', () => {
    const g = proponente('normal', FALTA_TRIGO);
    assert.ok(AI.step(g).offer);
    const r = AI.step(g);
    assert.equal(r, true, 'la segunda vez hace otra cosa');
    assert.equal(g.s.players[1].res.trigo, 0);
    h.checkInvariants(g);
  });
});
