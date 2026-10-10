/* Spec 000 — Turno, producción y Cítrico Gastronómico: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { GEO, RES, RES_INFO } = require('../js/engine.js');
const h = require('./helpers.js');

/* Partida de n jugadores ya empezada, con el tablero vacío */
const partida = (opts = {}) => h.enJuego(h.newGame({ n: opts.n || 2 }), opts);
const tirar = (g, a, b) => h.withRandom(h.dados(a, b), () => g.roll());

describe('utilidades de la spec 000', () => {
  test('dados(a, b) hace que el motor saque exactamente a y b', () => {
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        const g = partida();
        assert.ok(tirar(g, a, b));
        assert.deepEqual(g.s.dice, [a, b]);
      }
    }
  });
});

describe('RF-1 · tirar los dados', () => {
  test('guarda los dos dados y anota la suma en el historial', () => {
    const g = partida();
    assert.ok(tirar(g, 3, 5));
    assert.deepEqual(g.s.dice, [3, 5]);
    assert.equal(g.s.log.at(-1).text, 'J0 saca un 8');
    h.checkInvariants(g);
  });

  test('RF-11 · fuera de la fase de tirar se rechaza sin cambiar nada', () => {
    for (const phase of ['main', 'discard', 'critic', 'steal', 'roadBuilding', 'over']) {
      const g = partida({ phase });
      const antes = h.foto(g);
      assert.equal(tirar(g, 3, 5), false, 'aceptado en ' + phase);
      assert.equal(h.foto(g), antes);
    }
  });
});

describe('RF-2 · producción de recursos', () => {
  /* Partida con una huerta de J0 y una bodega de J1 en cruces opuestos de una parcela con el 8 */
  const conOcho = () => {
    const g = partida();
    const H = h.hexWithNum(g, 8);
    const [a, , , b] = h.vertsOfHex(H);
    h.put(g, a, 0, 1);
    h.put(g, b, 1, 2);
    return { g, H, a, b, r: g.s.hexes[H].res };
  };
  const total = (pl) => RES.reduce((n, r) => n + pl.res[r], 0);

  test('con un 8, la huerta recibe 1 y la bodega 2 del recurso de la parcela, salidas de la banca', () => {
    const { g, r } = conOcho();
    assert.ok(tirar(g, 4, 4));
    assert.equal(g.s.players[0].res[r], 1);
    assert.equal(g.s.players[1].res[r], 2);
    assert.deepEqual([total(g.s.players[0]), total(g.s.players[1])], [1, 2]);
    assert.equal(g.s.bank[r], 16);
    const nombre = RES_INFO[r].name.toLowerCase();
    assert.deepEqual(g.s.log.slice(-2).map((l) => l.text), ['J0 recibe 1 ' + nombre, 'J1 recibe 2 ' + nombre]);
    assert.equal(g.s.phase, 'main');
    h.checkInvariants(g);
  });

  test('cada parcela con el número sacado produce: dos parcelas con el 8 dan una carta cada una', () => {
    const g = partida();
    const H1 = h.hexWithNum(g, 8), H2 = h.hexWithNum(g, 8, [H1]);
    h.put(g, h.vertsOfHex(H1)[0], 0);
    h.put(g, h.vertsOfHex(H2)[0], 0);
    tirar(g, 2, 6);
    assert.equal(total(g.s.players[0]), 2);
    for (const H of [H1, H2]) assert.ok(g.s.players[0].res[g.s.hexes[H].res] >= 1);
    h.checkInvariants(g);
  });

  test('con otro número, esas construcciones no reciben nada', () => {
    const { g, a, b } = conOcho();
    const cerca = new Set([a, b].flatMap((v) => h.hexesOfVert(v).map((i) => g.s.hexes[i].num)));
    const suma = [2, 3, 4, 5, 6, 9, 10, 11, 12].find((n) => !cerca.has(n));
    assert.ok(tirar(g, Math.min(6, suma - 1), suma - Math.min(6, suma - 1)));
    assert.equal(g.s.dice[0] + g.s.dice[1], suma);
    assert.deepEqual([total(g.s.players[0]), total(g.s.players[1])], [0, 0]);
    assert.equal(g.s.phase, 'main');
  });

  test('la parcela del Cítrico no produce aunque tenga huerta y bodega', () => {
    const { g, H } = conOcho();
    g.s.critic = H;
    assert.ok(tirar(g, 4, 4));
    assert.deepEqual([total(g.s.players[0]), total(g.s.players[1])], [0, 0]);
    for (const r of RES) assert.equal(g.s.bank[r], 19);
    assert.equal(g.s.phase, 'main');
  });
});

describe('RF-3 · la banca se queda corta', () => {
  /* Partida de 3 con una parcela del 8; J2 guarda `guarda` cartas de su recurso para dejar la banca corta */
  const corta = (guarda) => {
    const g = partida({ n: 3 });
    const H = h.hexWithNum(g, 8);
    const r = g.s.hexes[H].res;
    h.setRes(g, 2, { [r]: guarda });
    return { g, r, vs: h.vertsOfHex(H), nombre: RES_INFO[r].name.toLowerCase() };
  };

  test('con un solo receptor, recibe lo que queda y no se anota nada sobre la banca', () => {
    const { g, r, vs, nombre } = corta(18);
    h.put(g, vs[0], 0, 2);
    assert.ok(tirar(g, 4, 4));
    assert.equal(g.s.players[0].res[r], 1);
    assert.equal(g.s.bank[r], 0);
    assert.equal(g.s.log.at(-1).text, 'J0 recibe 1 ' + nombre);
    assert.ok(!g.s.log.some((l) => /banca/.test(l.text)));
    h.checkInvariants(g);
  });

  test('con varios receptores, nadie recibe ese recurso y el historial lo dice', () => {
    const { g, r, vs, nombre } = corta(18);
    h.put(g, vs[0], 0);
    h.put(g, vs[3], 1);
    assert.ok(tirar(g, 4, 4));
    assert.deepEqual([g.s.players[0].res[r], g.s.players[1].res[r], g.s.bank[r]], [0, 0, 1]);
    assert.equal(g.s.log.at(-1).text, 'No queda ' + nombre + ' suficiente en la banca: nadie lo recibe');
    h.checkInvariants(g);
  });

  test('con la banca a 0 y un solo receptor, no recibe nada ni se anota nada', () => {
    const { g, r, vs } = corta(19);
    h.put(g, vs[0], 0);
    assert.ok(tirar(g, 4, 4));
    assert.equal(g.s.players[0].res[r], 0);
    assert.equal(g.s.log.at(-1).text, 'J0 saca un 8');
    h.checkInvariants(g);
  });
});

describe('RF-4, RF-5 y RF-6 · el 7 y los descartes', () => {
  /* Partida de 3 con manos de 7, 8 y 9 cartas, y un 7 recién sacado */
  const conSiete = () => {
    const g = partida({ n: 3 });
    h.setRes(g, 0, { aceite: 7 });
    h.setRes(g, 1, { sal: 8 });
    h.setRes(g, 2, { pescado: 5, trigo: 4 });
    assert.ok(tirar(g, 3, 4));
    return g;
  };

  test('con un 7, descartan la mitad quienes tienen más de 7 cartas, y nadie recibe nada', () => {
    const g = conSiete();
    assert.deepEqual(g.s.pending, { 1: 4, 2: 4 });
    assert.equal(g.s.phase, 'discard');
    assert.deepEqual(g.s.players.map((pl) => RES.reduce((n, r) => n + pl.res[r], 0)), [7, 8, 9]);
    assert.equal(g.s.log.at(-1).text, 'J0 saca un 7');
    h.checkInvariants(g);
  });

  test('con un 7 y nadie por encima de 7 cartas, se pasa directamente a mover el Cítrico', () => {
    const g = partida({ n: 3 });
    h.setRes(g, 1, { sal: 7 });
    assert.ok(tirar(g, 6, 1));
    assert.deepEqual(g.s.pending, {});
    assert.equal(g.s.phase, 'critic');
  });

  test('un descarte que no es exactamente el exigido, o de quien no debe descartar, se rechaza sin cambiar nada', () => {
    const g = conSiete();
    const antes = h.foto(g);
    const malos = [
      [1, { sal: 3 }, 'menos cartas'],
      [1, { sal: 5 }, 'más cartas'],
      [1, { trigo: 4 }, 'cartas que no tiene'],
      [1, { sal: 5, aceite: -1 }, 'una cantidad negativa'],
      [2, { pescado: 4, trigo: 1 }, 'más cartas en total'],
      [0, { aceite: 3 }, 'quien no tiene descarte'],
    ];
    for (const [p, mapa, motivo] of malos) assert.equal(g.discard(p, mapa), false, 'aceptado con ' + motivo);
    assert.equal(h.foto(g), antes);
  });

  test('los descartes se aceptan en cualquier orden, vuelven a la banca y el último pasa a mover el Cítrico', () => {
    const g = conSiete();
    assert.ok(g.discard(2, { pescado: 2, trigo: 2 }));
    assert.deepEqual(g.s.pending, { 1: 4 });
    assert.equal(g.s.phase, 'discard');
    assert.equal(g.s.log.at(-1).text, 'J2 descarta 4 cartas');
    assert.deepEqual([g.s.bank.pescado, g.s.bank.trigo], [16, 17]);
    assert.ok(g.discard(1, { sal: 4 }));
    assert.equal(g.s.bank.sal, 15);
    assert.deepEqual(g.s.pending, {});
    assert.equal(g.s.phase, 'critic');
    assert.equal(g.discard(1, { sal: 4 }), false, 'un segundo descarte');
    h.checkInvariants(g);
  });
});

describe('RF-6, RF-7 y RF-8 · mover el Cítrico y robar', () => {
  /* Partida en la fase de mover el Cítrico, con una parcela productiva H elegida */
  const enCritic = (n = 2) => {
    const g = partida({ n, phase: 'critic' });
    const H = g.s.hexes.findIndex((x) => x.res);
    return { g, H, vs: h.vertsOfHex(H) };
  };
  const total = (pl) => RES.reduce((k, r) => k + pl.res[r], 0);

  test('el Cítrico no puede quedarse donde está ni ir a una parcela que no existe', () => {
    const { g } = enCritic();
    const antes = h.foto(g);
    for (const x of [g.s.critic, -1, 19, 'a']) assert.equal(g.moveCritic(x), false, 'aceptado ' + x);
    assert.equal(h.foto(g), antes);
  });

  test('puede ir a cualquier otra parcela, también al Erial', () => {
    for (let i = 0; i < GEO.hexes.length; i++) {
      const { g } = enCritic();
      const erial = g.s.critic;
      if (i === erial) continue;
      assert.ok(g.moveCritic(i), 'rechazada la parcela ' + i);
      assert.equal(g.s.critic, i);
      const x = g.s.hexes[i];
      assert.equal(g.s.log.at(-1).text, `J0 envía al Cítrico Gastronómico a ${RES_INFO[x.res].terrain} (${x.num})`);
      assert.ok(g.moveCritic(erial) === false, 'no se puede mover dos veces');
    }
    const { g, H } = enCritic();
    g.s.critic = H;
    assert.ok(g.moveCritic(g.s.hexes.findIndex((x) => !x.res)));
    assert.equal(g.s.log.at(-1).text, 'J0 envía al Cítrico Gastronómico a el Erial');
  });

  test('con un rival con cartas en la parcela, le roba directamente y vuelve a construir', () => {
    const { g, H, vs } = enCritic();
    h.put(g, vs[0], 1);
    h.setRes(g, 1, { vino: 2 });
    assert.ok(g.moveCritic(H));
    assert.deepEqual([g.s.players[0].res.vino, g.s.players[1].res.vino], [1, 1]);
    assert.deepEqual(g.s.lastSteal, { from: 1, to: 0, res: 'vino', turn: 1 });
    assert.equal(g.s.log.at(-1).text, 'J0 roba una carta a J1');
    assert.equal(g.s.phase, 'main');
    h.checkInvariants(g);
  });

  test('con dos rivales, se elige a quién robar; elegir a otro se rechaza', () => {
    const { g, H, vs } = enCritic(3);
    h.put(g, vs[0], 1);
    h.put(g, vs[3], 2);
    h.setRes(g, 1, { sal: 1 });
    h.setRes(g, 2, { trigo: 1 });
    assert.ok(g.moveCritic(H));
    assert.equal(g.s.phase, 'steal');
    assert.deepEqual(g.s.stealFrom.slice().sort(), [1, 2]);
    const antes = h.foto(g);
    for (const q of [0, 3, -1]) assert.equal(g.steal(q), false, 'aceptado ' + q);
    assert.equal(h.foto(g), antes);
    assert.ok(g.steal(2));
    assert.deepEqual([g.s.players[0].res.trigo, g.s.players[2].res.trigo, g.s.players[1].res.sal], [1, 0, 1]);
    assert.deepEqual([g.s.phase, g.s.stealFrom], ['main', []]);
    h.checkInvariants(g);
  });

  test('no son víctimas el propio jugador ni un rival sin cartas', () => {
    const { g, H, vs } = enCritic();
    h.put(g, vs[0], 0);
    h.put(g, vs[3], 1);
    h.setRes(g, 0, { aceite: 3 });
    assert.ok(g.moveCritic(H));
    assert.equal(g.s.phase, 'main');
    assert.equal(g.s.lastSteal, null);
    assert.deepEqual([total(g.s.players[0]), total(g.s.players[1])], [3, 0]);
  });

  test('un rival con dos construcciones en la parcela cuenta como una sola víctima', () => {
    const { g, H, vs } = enCritic(3);
    h.put(g, vs[0], 1);
    h.put(g, vs[3], 1, 2);
    h.setRes(g, 1, { sal: 2 });
    assert.ok(g.moveCritic(H));
    assert.equal(g.s.phase, 'main');
    assert.equal(g.s.players[0].res.sal, 1);
  });

  test('si el Cítrico se movió antes de tirar (con un Chef), después vuelve a la fase de tirar', () => {
    const { g, H, vs } = enCritic();
    g.s.after = 'roll';
    h.put(g, vs[0], 1);
    h.setRes(g, 1, { sal: 1 });
    assert.ok(g.moveCritic(H));
    assert.equal(g.s.phase, 'roll');
  });

  test('la carta robada es al azar, con la misma probabilidad para cada carta', () => {
    for (const [azar, esperado] of [[0, 'aceite'], [0.24, 'aceite'], [0.26, 'vino'], [0.99, 'vino']]) {
      const { g, H, vs } = enCritic();
      h.put(g, vs[0], 1);
      h.setRes(g, 1, { aceite: 1, vino: 3 });
      assert.ok(h.withRandom(azar, () => g.moveCritic(H)));
      assert.equal(g.s.lastSteal.res, esperado, 'con azar ' + azar);
      assert.equal(g.s.players[0].res[esperado], 1);
      assert.equal(g.s.log.at(-1).text, 'J0 roba una carta a J1');
    }
  });
});

describe('RF-10 · terminar el turno', () => {
  test('pasa al siguiente asiento, suma 1 al turno, vuelve a tirar y reinicia lo del turno', () => {
    const g = partida({ n: 3, current: 1, phase: 'main', turn: 5 });
    Object.assign(g.s, { dice: [2, 3], devPlayed: true, offered: true });
    assert.ok(g.endTurn());
    assert.deepEqual([g.s.current, g.s.turn, g.s.phase, g.s.dice, g.s.devPlayed, g.s.offered], [2, 6, 'roll', null, false, false]);
    h.checkInvariants(g);
  });

  test('del último asiento se pasa al primero', () => {
    for (const n of [2, 3, 4]) {
      const g = partida({ n, current: n - 1, phase: 'main' });
      assert.ok(g.endTurn());
      assert.equal(g.s.current, 0);
    }
  });
});

describe('RF-11 · acciones fuera de su fase', () => {
  /* [acción, su fase, fases en las que se prueba, cómo hacerla] */
  const fuera = [
    ['terminar el turno', 'main', ['roll', 'discard', 'critic', 'steal', 'roadBuilding', 'over'], (g) => g.endTurn()],
    ['descartar', 'discard', ['roll', 'main', 'critic', 'steal'], (g) => g.discard(0, { aceite: 1 })],
    ['mover el Cítrico', 'critic', ['roll', 'main', 'discard', 'steal'], (g) => g.moveCritic(g.s.hexes.findIndex((x) => x.res))],
    ['robar', 'steal', ['roll', 'main', 'discard', 'critic'], (g) => g.steal(1)],
  ];
  /* Partida en la fase pedida con datos con los que la acción sería válida en su fase */
  const preparada = (phase) => {
    const g = partida({ phase });
    h.setRes(g, 0, { aceite: 2 });
    h.setRes(g, 1, { sal: 2 });
    Object.assign(g.s, { pending: { 0: 1 }, stealFrom: [1] });
    return g;
  };
  for (const [accion, suFase, fases, hacer] of fuera) {
    test(`${accion} fuera de su fase se rechaza sin cambiar nada (y en su fase se acepta)`, () => {
      assert.ok(hacer(preparada(suFase)), `${accion} rechazado en su fase`);
      for (const phase of fases) {
        const g = preparada(phase);
        const antes = h.foto(g);
        assert.equal(hacer(g), false, `${accion} aceptado en ${phase}`);
        assert.equal(h.foto(g), antes);
      }
    });
  }
});
