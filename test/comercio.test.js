/* Spec 002 — Comercio con la banca, puertos y entre jugadores: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { GEO, RES } = require('../js/engine.js');
const h = require('./helpers.js');

/* Partida empezada (tablero vacío) en la fase pedida */
const partida = ({ mode = 'clasica', n = 2, phase = 'main', current = 0 } = {}) =>
  h.enJuego(h.newGame({ mode, n }), { phase, current, turn: 3 });
/* Proporción de cambio de p para cada recurso */
const proporciones = (g, p) => Object.fromEntries(RES.map((r) => [r, g.tradeRatio(p, r)]));
const todas = (n) => Object.fromEntries(RES.map((r) => [r, n]));

describe('utilidades de la spec 002', () => {
  test('portOf da un puerto del tipo pedido y sus dos cruces', () => {
    const g = partida();
    for (const type of ['3:1', ...RES]) {
      const { edge, a, b } = h.portOf(g, type);
      assert.equal(g.s.ports.find((x) => x.edge === edge).type, type);
      assert.deepEqual([a, b], [GEO.edges[edge].a, GEO.edges[edge].b]);
    }
    const primero = h.portOf(g, '3:1').edge;
    assert.notEqual(h.portOf(g, '3:1', [primero]).edge, primero);
    assert.throws(() => h.portOf(g, 'oro'), /No hay ningún puerto/);
    assert.throws(() => h.portOf(partida({ mode: 'sencilla' }), '3:1'), /No hay ningún puerto/);
  });
});

describe('RF-2 · proporción de cambio con la banca', () => {
  test('sin puertos, 4 cartas iguales por 1 en todos los recursos', () => {
    assert.deepEqual(proporciones(partida(), 0), todas(4));
  });

  test('una huerta en cualquiera de los dos cruces de un puerto 3:1 deja todos los recursos a 3', () => {
    for (const lado of ['a', 'b']) {
      const g = partida();
      h.put(g, h.portOf(g, '3:1')[lado], 0);
      assert.deepEqual(proporciones(g, 0), todas(3), 'desde el cruce ' + lado);
    }
  });

  test('en un puerto 2:1 de vino, el vino a 2 y el resto a 4; con otro 3:1, el vino a 2 y el resto a 3', () => {
    const g = partida();
    h.put(g, h.portOf(g, 'vino').a, 0);
    assert.deepEqual(proporciones(g, 0), { ...todas(4), vino: 2 });
    h.put(g, h.portOf(g, '3:1').a, 0);
    assert.deepEqual(proporciones(g, 0), { ...todas(3), vino: 2 });
    h.checkInvariants(g);
  });

  test('una bodega también cuenta; una huerta rival en el puerto, no', () => {
    const g = partida();
    h.put(g, h.portOf(g, '3:1').a, 0, 2);
    h.put(g, h.portOf(g, 'sal').b, 1);
    assert.deepEqual(proporciones(g, 0), todas(3));
    assert.deepEqual(proporciones(g, 1), { ...todas(4), sal: 2 });
    h.checkInvariants(g);
  });
});

describe('RF-1 · cambio con la banca', () => {
  test('sin puerto: entrega 4 iguales y recibe 1, todo a través de la banca, y se anota', () => {
    const g = partida();
    h.setRes(g, 0, { aceite: 4 });
    assert.ok(g.bankTrade('aceite', 'vino'));
    assert.deepEqual([g.s.players[0].res.aceite, g.s.players[0].res.vino], [0, 1]);
    assert.deepEqual([g.s.bank.aceite, g.s.bank.vino], [19, 18]);
    assert.equal(g.s.log.at(-1).text, 'J0 cambia 4 aceite por 1 vino con la banca');
    h.checkInvariants(g);
  });

  test('con un puerto 2:1 de vino: entrega solo 2 aunque tenga más', () => {
    const g = partida();
    h.put(g, h.portOf(g, 'vino').a, 0);
    h.setRes(g, 0, { vino: 5 });
    assert.ok(g.bankTrade('vino', 'sal'));
    assert.deepEqual([g.s.players[0].res.vino, g.s.players[0].res.sal], [3, 1]);
    assert.equal(g.s.log.at(-1).text, 'J0 cambia 2 vino por 1 sal con la banca');
    h.checkInvariants(g);
  });

  test('con pocas cartas, el mismo recurso, la banca sin el pedido, un recurso que no existe o fuera de fase, se rechaza', () => {
    const casos = [
      ['con 3 cartas a 4:1', 'aceite', 'vino', (g) => h.setRes(g, 0, { aceite: 3 })],
      ['el mismo recurso', 'aceite', 'aceite'],
      ['la banca sin vino', 'aceite', 'vino', (g) => h.setRes(g, 1, { vino: 19 })],
      ['un recurso que no existe', 'aceite', 'oro'],
      ['sin decir qué se entrega', undefined, 'vino'],
      ['en la fase de tirar', 'aceite', 'vino', (g) => { g.s.phase = 'roll'; }],
      ['en la fase de descartar', 'aceite', 'vino', (g) => { g.s.phase = 'discard'; }],
    ];
    for (const [motivo, da, pide, preparar] of casos) {
      const g = partida();
      h.setRes(g, 0, { aceite: 4 });
      if (preparar) preparar(g);
      const antes = h.foto(g);
      assert.equal(g.bankTrade(da, pide), false, 'aceptado con ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
    /* control: con 4 aceite y vino en la banca, el mismo cambio se acepta */
    const g = partida();
    h.setRes(g, 0, { aceite: 4 });
    assert.ok(g.bankTrade('aceite', 'vino'));
  });
});

describe('RF-3 · cambio entre jugadores', () => {
  /* Partida de 3 en la que J0 tiene el turno y J0 tiene 1 aceite, J1 2 sal y J2 1 vino */
  const tres = (mode = 'completa', phase = 'main') => {
    const g = partida({ mode, n: 3, phase });
    h.setRes(g, 0, { aceite: 1 });
    h.setRes(g, 1, { sal: 2 });
    h.setRes(g, 2, { vino: 1 });
    return g;
  };

  test('en Completa, los dos jugadores intercambian lo acordado y se anota', () => {
    const g = tres();
    assert.ok(g.playerTrade(0, 1, { aceite: 1 }, { sal: 2 }));
    assert.deepEqual([g.s.players[0].res.aceite, g.s.players[0].res.sal, g.s.players[1].res.aceite, g.s.players[1].res.sal], [0, 2, 1, 0]);
    assert.deepEqual([g.s.bank.aceite, g.s.bank.sal], [18, 17], 'la banca no interviene');
    assert.equal(g.s.log.at(-1).text, 'J0 da 1 aceite a J1 a cambio de 2 sal');
    h.checkInvariants(g);
  });

  test('también vale si quien entrega es el otro jugador y el del turno es quien recibe', () => {
    const g = tres();
    assert.ok(g.playerTrade(1, 0, { sal: 2 }, { aceite: 1 }));
    assert.deepEqual([g.s.players[0].res.sal, g.s.players[1].res.aceite], [2, 1]);
    assert.equal(g.s.log.at(-1).text, 'J1 da 2 sal a J0 a cambio de 1 aceite');
    h.checkInvariants(g);
  });

  test('se rechaza sin cambiar nada fuera de Completa, consigo mismo, sin el jugador del turno, con una parte vacía, sin lo que se entrega o fuera de fase', () => {
    const casos = [
      ['en Sencilla', () => tres('sencilla'), [0, 1, { aceite: 1 }, { sal: 2 }]],
      ['en Clásica', () => tres('clasica'), [0, 1, { aceite: 1 }, { sal: 2 }]],
      ['consigo mismo', tres, [0, 0, { aceite: 1 }, { aceite: 1 }]],
      ['entre dos que no tienen el turno', tres, [1, 2, { sal: 1 }, { vino: 1 }]],
      ['sin entregar nada', tres, [0, 1, {}, { sal: 2 }]],
      ['sin pedir nada', tres, [0, 1, { aceite: 1 }, {}]],
      ['entregando lo que no tiene', tres, [0, 1, { aceite: 2 }, { sal: 2 }]],
      ['pidiendo lo que el otro no tiene', tres, [0, 1, { aceite: 1 }, { sal: 3 }]],
      ['en la fase de tirar', () => tres('completa', 'roll'), [0, 1, { aceite: 1 }, { sal: 2 }]],
    ];
    for (const [motivo, crear, args] of casos) {
      const g = crear();
      const antes = h.foto(g);
      assert.equal(g.playerTrade(...args), false, 'aceptado ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
    /* control: J0 con el turno y J2 sí pueden cambiar */
    assert.ok(tres().playerTrade(0, 2, { aceite: 1 }, { vino: 1 }));
  });
});

describe('RF-11 · el aviso de rechazo cambia si se repite', () => {
  const { refusal } = require('../js/check.js');
  const motivos = 'Por 1 aceite a cambio de 1 sal: Rosa no quiere quedarse sin sal.';

  test('el primer rechazo dice «Nadie acepta.»', () => {
    assert.deepEqual(refusal(motivos, null), { motivos, n: 1, titulo: 'Nadie acepta.' });
  });
  test('el mismo rechazo seguido lleva la cuenta de intentos', () => {
    const r2 = refusal(motivos, refusal(motivos, null));
    assert.equal(r2.n, 2);
    assert.equal(r2.titulo, 'Nadie acepta otra vez (2.º intento).');
    assert.equal(refusal(motivos, r2).titulo, 'Nadie acepta otra vez (3.º intento).');
  });
  test('si cambia la oferta o un motivo, la cuenta vuelve a empezar', () => {
    const r2 = refusal(motivos, refusal(motivos, null));
    const otro = refusal('Por 2 aceite a cambio de 1 sal: Rosa no quiere quedarse sin sal.', r2);
    assert.equal(otro.n, 1);
    assert.equal(otro.titulo, 'Nadie acepta.');
  });
});
