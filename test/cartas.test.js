/* Spec 008 — Cartas de cocina: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { GEO } = require('../js/engine.js');
const h = require('./helpers.js');

/* Partida empezada (tablero vacío, turno 3) en la fase pedida */
const partida = ({ mode = 'clasica', n = 2, phase = 'main', current = 0 } = {}) =>
  h.enJuego(h.newGame({ mode, n }), { phase, current, turn: 3 });
const CARTA = { pescado: 1, trigo: 1, vino: 1 };
const cuenta = (lista) => lista.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});

describe('utilidades de la spec 008', () => {
  test('darCarta pasa una carta del mazo a la mano, comprada en el turno anterior', () => {
    const g = partida();
    h.darCarta(g, 0, 'exclusiva');
    assert.deepEqual(g.s.players[0].dev, [{ type: 'exclusiva', turn: 2 }]);
    assert.equal(g.s.deck.length, 24);
    h.darCarta(g, 1, 'exclusiva', 3);
    assert.deepEqual(g.s.players[1].dev, [{ type: 'exclusiva', turn: 3 }]);
    assert.throws(() => h.darCarta(g, 0, 'exclusiva'), /No quedan/);
    h.checkInvariants(g);
  });
});

describe('RF-1 · solo hay cartas de cocina en Clásica y Completa', () => {
  test('en Clásica y Completa el mazo tiene 25 cartas: 14 Chef, 5 Estrella y 2 de cada una de las demás', () => {
    for (const mode of ['clasica', 'completa']) {
      assert.deepEqual(cuenta(partida({ mode }).s.deck), { chef: 14, estrella: 5, caminos: 2, cosecha: 2, exclusiva: 2 }, mode);
    }
  });

  test('en Sencilla no hay mazo: no se puede comprar ni jugar aunque haya recursos o cartas', () => {
    const g = partida({ mode: 'sencilla' });
    assert.deepEqual(g.s.deck, []);
    h.setRes(g, 0, CARTA);
    g.s.players[0].dev.push({ type: 'chef', turn: 0 }, { type: 'cosecha', turn: 0 });
    const antes = h.foto(g);
    assert.equal(g.buyDev(), false);
    assert.equal(g.playDev('chef'), false);
    assert.equal(g.playDev('cosecha', ['trigo', 'vino']), false);
    assert.equal(h.foto(g), antes);
    /* control: en Clásica, lo mismo sí se acepta */
    const c = partida();
    h.setRes(c, 0, CARTA);
    h.darCarta(c, 0, 'chef');
    assert.ok(c.buyDev());
    assert.ok(c.playDev('chef'));
  });
});

describe('RF-2 · comprar una carta', () => {
  /* Partida con lo justo para comprar y una Exclusiva al final del mazo */
  const lista = () => {
    const g = partida();
    h.setRes(g, 0, CARTA);
    g.s.deck.splice(g.s.deck.indexOf('exclusiva'), 1);
    g.s.deck.push('exclusiva');
    return g;
  };

  test('cuesta 1 pescado, 1 trigo y 1 vino y da la última carta del mazo, con su turno de compra', () => {
    const g = lista();
    assert.ok(g.buyDev());
    assert.deepEqual(g.s.players[0].dev, [{ type: 'exclusiva', turn: 3 }]);
    assert.equal(g.s.deck.length, 24);
    assert.deepEqual(g.s.players[0].res, { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 });
    assert.deepEqual([g.s.bank.pescado, g.s.bank.trigo, g.s.bank.vino], [19, 19, 19]);
    assert.equal(g.s.log.at(-1).text, 'J0 compra una carta de cocina');
    h.checkInvariants(g);
  });

  test('sin recursos, con el mazo vacío o fuera de la fase de construir, se rechaza sin cambiar nada', () => {
    const casos = [
      ['sin recursos', (g) => h.setRes(g, 0, { pescado: 1, trigo: 1 })],
      ['con el mazo vacío', (g) => { g.s.deck = []; }],
      ['en la fase de tirar', (g) => { g.s.phase = 'roll'; }],
      ['en la fase de descartar', (g) => { g.s.phase = 'discard'; }],
    ];
    for (const [motivo, preparar] of casos) {
      const g = lista();
      preparar(g);
      const antes = h.foto(g);
      assert.equal(g.buyDev(), false, 'aceptado ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
  });
});

describe('RF-3 y RF-4 · cuándo se puede jugar una carta', () => {
  /* Cómo jugar cada carta con argumentos válidos (para Obras hace falta una huerta con sitio para caminos) */
  const JUGAR = {
    chef: (g) => g.playDev('chef'),
    caminos: (g) => g.playDev('caminos'),
    cosecha: (g) => g.playDev('cosecha', ['trigo', 'vino']),
    exclusiva: (g) => g.playDev('exclusiva', 'sal'),
  };
  /* Partida en la fase pedida en la que J0 tiene una carta de tipo `type` comprada en el turno `turn` */
  const conCarta = (type, { phase = 'main', turn = 2 } = {}) => {
    const g = partida({ phase });
    h.put(g, 20, 0);
    h.darCarta(g, 0, type, turn);
    return g;
  };
  const rechaza = (g, jugar, motivo) => {
    const antes = h.foto(g);
    assert.equal(jugar(g), false, 'aceptada ' + motivo);
    assert.equal(h.foto(g), antes, motivo);
  };

  test('una carta comprada en este turno no se juega; en el siguiente turno propio, sí', () => {
    const g = conCarta('chef', { turn: 3 });
    assert.equal(g.playableDev(0, 'chef'), false);
    rechaza(g, JUGAR.chef, 'el mismo turno de la compra');
    assert.ok(g.endTurn());
    g.s.phase = 'main';
    assert.ok(g.endTurn());
    assert.deepEqual([g.s.current, g.s.turn], [0, 5]);
    assert.ok(g.playableDev(0, 'chef'));
    assert.ok(JUGAR.chef(g));
  });

  test('como mucho una carta por turno; al empezar otro turno se puede de nuevo', () => {
    const g = conCarta('cosecha');
    h.darCarta(g, 0, 'exclusiva');
    assert.ok(JUGAR.cosecha(g));
    assert.equal(g.s.devPlayed, true);
    rechaza(g, JUGAR.exclusiva, 'una segunda carta en el mismo turno');
    assert.ok(g.endTurn());
    g.s.phase = 'main';
    assert.ok(g.endTurn());
    g.s.phase = 'main';
    assert.ok(JUGAR.exclusiva(g));
  });

  test('solo juega el jugador del turno', () => {
    const g = partida();
    h.darCarta(g, 1, 'chef');
    assert.equal(g.playableDev(1, 'chef'), false, 'J1 no tiene el turno');
    rechaza(g, JUGAR.chef, 'por J0, que no tiene la carta');
    g.s.current = 1;
    assert.ok(g.playableDev(1, 'chef'), 'control: con el turno, sí');
  });

  test('la Estrella no se juega nunca, aunque se comprara hace tiempo', () => {
    const g = partida();
    h.darCarta(g, 0, 'estrella', 0);
    assert.equal(g.playableDev(0, 'estrella'), false);
    rechaza(g, (j) => j.playDev('estrella'), 'una Estrella');
  });

  test('antes de tirar solo se juega el Chef; después, todas; al descartar o mover el Cítrico, ninguna', () => {
    for (const [type, jugar] of Object.entries(JUGAR)) {
      const roll = conCarta(type, { phase: 'roll' });
      if (type === 'chef') assert.ok(jugar(roll), 'el Chef antes de tirar');
      else rechaza(roll, jugar, type + ' antes de tirar');
      assert.ok(jugar(conCarta(type)), type + ' después de tirar');
      for (const phase of ['discard', 'critic', 'steal', 'roadBuilding']) rechaza(conCarta(type, { phase }), jugar, type + ' en ' + phase);
    }
  });
});

describe('RF-5 · Chef', () => {
  for (const [phase, vuelta] of [['main', 'main'], ['roll', 'roll']]) {
    test(`jugado en la fase ${phase}: suma un chef, pasa a mover el Cítrico y después vuelve a ${vuelta}`, () => {
      const g = partida({ phase });
      h.darCarta(g, 0, 'chef');
      assert.ok(g.playDev('chef'));
      assert.deepEqual([g.s.players[0].chefs, g.s.players[0].dev.length, g.s.devPlayed], [1, 0, true]);
      assert.equal(g.s.log.at(-1).text, 'J0 juega un Chef');
      assert.deepEqual([g.s.phase, g.s.after], ['critic', phase]);
      assert.ok(g.moveCritic(g.s.hexes.findIndex((x) => x.res)));
      assert.equal(g.s.phase, vuelta);
      h.checkInvariants(g);
    });
  }
});

describe('RF-6 · Obras', () => {
  /* J0 con una huerta en el cruce v y una carta de Obras */
  const conObras = (v = 20) => {
    const g = partida();
    h.put(g, v, 0);
    h.darCarta(g, 0, 'caminos');
    return g;
  };

  test('da 2 caminos gratis, que no cuestan recursos, y después vuelve a construir', () => {
    const g = conObras();
    assert.ok(g.playDev('caminos'));
    assert.equal(g.s.log.at(-1).text, 'J0 juega Obras: 2 caminos gratis');
    assert.deepEqual([g.s.phase, g.s.freeRoads, g.s.players[0].dev.length], ['roadBuilding', 2, 0]);
    assert.ok(g.buildRoad(g.roadSpots(0)[0]));
    assert.deepEqual([g.s.phase, g.s.freeRoads], ['roadBuilding', 1]);
    assert.ok(g.buildRoad(g.roadSpots(0)[0]));
    assert.deepEqual([g.s.phase, g.s.freeRoads, g.s.players[0].roads], ['main', 0, 13]);
    for (const r of Object.keys(g.s.bank)) assert.equal(g.s.bank[r], 19, 'no se ha pagado ' + r);
    h.checkInvariants(g);
  });

  test('con 1 camino por colocar, Obras solo da 1', () => {
    const g = conObras();
    g.s.players[0].roads = 1;
    assert.ok(g.playDev('caminos'));
    assert.equal(g.s.freeRoads, 1);
    assert.ok(g.buildRoad(g.roadSpots(0)[0]));
    assert.deepEqual([g.s.phase, g.s.freeRoads, g.s.players[0].roads], ['main', 0, 0]);
  });

  test('si tras el primer camino ya no queda sitio, termina antes', () => {
    /* Huerta en un cruce de costa: un lado lo ocupa J1 y el otro lleva a un cruce cuyos demás lados también son de J1 */
    const v = GEO.verts.findIndex((x) => x.adj.length === 2);
    const g = conObras(v);
    const [libre, ocupado] = h.edgesOfVert(v);
    h.road(g, ocupado, 1);
    const w = GEO.edges[libre].a === v ? GEO.edges[libre].b : GEO.edges[libre].a;
    for (const e of h.edgesOfVert(w)) if (e !== libre) h.road(g, e, 1);
    assert.ok(g.playDev('caminos'));
    assert.deepEqual(g.roadSpots(0), [libre]);
    assert.ok(g.buildRoad(libre));
    assert.deepEqual([g.s.phase, g.s.freeRoads, g.s.players[0].roads], ['main', 0, 14]);
    h.checkInvariants(g);
  });

  test('sin caminos por colocar o sin sitio, se rechaza y la carta se queda en la mano', () => {
    const casos = [
      ['sin caminos por colocar', (g) => { g.s.players[0].roads = 0; }],
      ['sin sitio', (g) => h.edgesOfVert(20).forEach((e) => h.road(g, e, 1))],
    ];
    for (const [motivo, preparar] of casos) {
      const g = conObras();
      preparar(g);
      const antes = h.foto(g);
      assert.equal(g.playDev('caminos'), false, 'aceptada ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
      assert.equal(g.s.players[0].dev[0].type, 'caminos');
    }
  });
});

describe('RF-7 · Buena cosecha', () => {
  const conCosecha = () => {
    const g = partida();
    h.darCarta(g, 0, 'cosecha');
    return g;
  };

  test('con 2 recursos iguales o distintos, los toma de la banca y se anota', () => {
    const g = conCosecha();
    assert.ok(g.playDev('cosecha', ['trigo', 'trigo']));
    assert.deepEqual([g.s.players[0].res.trigo, g.s.bank.trigo, g.s.players[0].dev.length], [2, 17, 0]);
    assert.equal(g.s.log.at(-1).text, 'J0 juega Buena cosecha y toma 2 trigo');
    const d = conCosecha();
    assert.ok(d.playDev('cosecha', ['vino', 'aceite']));
    assert.deepEqual([d.s.players[0].res.aceite, d.s.players[0].res.vino], [1, 1]);
    assert.equal(d.s.log.at(-1).text, 'J0 juega Buena cosecha y toma 1 aceite, 1 vino');
    h.checkInvariants(g);
    h.checkInvariants(d);
  });

  test('si la banca no los tiene o los recursos no son válidos, se rechaza y la carta se queda', () => {
    const casos = [
      ['la banca solo tiene 1 trigo', ['trigo', 'trigo'], (g) => h.setRes(g, 1, { trigo: 18 })],
      ['un solo recurso', ['trigo']],
      ['tres recursos', ['trigo', 'vino', 'sal']],
      ['un recurso que no existe', ['oro', 'trigo']],
      ['un texto en vez de una lista', 'trigo'],
      ['sin recursos', undefined],
    ];
    for (const [motivo, arg, preparar] of casos) {
      const g = conCosecha();
      if (preparar) preparar(g);
      const antes = h.foto(g);
      assert.equal(g.playDev('cosecha', arg), false, 'aceptada con ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
    /* control: con 1 trigo en la banca, pedir 1 trigo y 1 vino sí se acepta */
    const g = conCosecha();
    h.setRes(g, 1, { trigo: 18 });
    assert.ok(g.playDev('cosecha', ['trigo', 'vino']));
  });
});

describe('RF-8 · Exclusiva', () => {
  const conExclusiva = () => {
    const g = partida({ n: 3 });
    h.darCarta(g, 0, 'exclusiva');
    h.setRes(g, 1, { sal: 3, vino: 1 });
    h.setRes(g, 2, { sal: 2 });
    return g;
  };

  test('todos los rivales entregan todas sus cartas de ese recurso, y se anota cuántas', () => {
    const g = conExclusiva();
    assert.ok(g.playDev('exclusiva', 'sal'));
    assert.deepEqual(g.s.players.map((pl) => pl.res.sal), [5, 0, 0]);
    assert.equal(g.s.players[1].res.vino, 1, 'los demás recursos no se tocan');
    assert.equal(g.s.log.at(-1).text, 'J0 juega Exclusiva y se lleva 5 de sal');
    h.checkInvariants(g);
  });

  test('de un recurso que nadie tiene, gasta la carta y se lleva 0', () => {
    const g = conExclusiva();
    assert.ok(g.playDev('exclusiva', 'pescado'));
    assert.deepEqual([g.s.players[0].res.pescado, g.s.players[0].dev.length, g.s.devPlayed], [0, 0, true]);
    assert.equal(g.s.log.at(-1).text, 'J0 juega Exclusiva y se lleva 0 de pescado');
  });

  test('con un recurso que no existe, se rechaza sin cambiar nada', () => {
    for (const arg of ['oro', undefined, ['sal']]) {
      const g = conExclusiva();
      const antes = h.foto(g);
      assert.equal(g.playDev('exclusiva', arg), false, 'aceptada con ' + JSON.stringify(arg));
      assert.equal(h.foto(g), antes);
    }
  });
});
