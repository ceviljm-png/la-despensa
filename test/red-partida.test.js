/* Spec 006 — Partida en red: comprobaciones de lo que llega de otro dispositivo (js/check.js) */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const Check = require('../js/check.js');

describe('Check.int · solo números enteros', () => {
  test('acepta los enteros tal cual', () => {
    for (const n of [0, 1, 53, 71, -1]) assert.equal(Check.int(n), n);
  });

  test('cualquier otra cosa no es un número: null, vacío, texto, decimal, booleano, lista, NaN', () => {
    for (const x of [null, undefined, '', '3', ' 3 ', 1.5, true, false, [], [3], {}, NaN, Infinity]) {
      assert.equal(Check.int(x), null, JSON.stringify(x) ?? String(x));
    }
  });
});

describe('Check.resMap · cantidades de recursos (mismo comportamiento que antes)', () => {
  const vacio = { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 };

  test('redondea hacia abajo y deja cada cantidad entre 0 y 99', () => {
    assert.deepEqual(Check.resMap({ aceite: 2.9, sal: -3, pescado: 150, trigo: '4', vino: 1 }), { aceite: 2, sal: 0, pescado: 99, trigo: 4, vino: 1 });
  });

  test('lo que no es número cuenta como 0, y se ignoran las claves que no son recursos', () => {
    assert.deepEqual(Check.resMap({ aceite: 'x', sal: null, oro: 5 }), vacio);
    assert.deepEqual(Check.resMap(JSON.parse('{"__proto__": {"vino": 3}}')), vacio, 'un «__proto__» llegado por la red es una clave más');
  });

  test('sin objeto, todo 0', () => {
    for (const x of [null, undefined, 'aceite', 5, []]) assert.deepEqual(Check.resMap(x), vacio, String(x));
  });
});

describe('RF-4 · Check.order · solo jugadas del juego, con sus números', () => {
  const vacio = { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 };

  test('cada jugada válida sale con sus argumentos normalizados', () => {
    for (const cmd of ['placeSetupHuerta', 'placeSetupRoad', 'buildHuerta', 'buildBodega', 'buildRoad', 'moveCritic', 'steal']) {
      assert.deepEqual(Check.order(cmd, [7]), { cmd, args: [7] }, cmd);
    }
    for (const cmd of ['roll', 'endTurn', 'buyDev']) {
      assert.deepEqual(Check.order(cmd, []), { cmd, args: [] }, cmd);
      assert.deepEqual(Check.order(cmd), { cmd, args: [] }, cmd + ' sin lista');
    }
    assert.deepEqual(Check.order('discard', [1, { sal: 2, oro: 4 }]), { cmd: 'discard', args: [1, { ...vacio, sal: 2 }] });
    assert.deepEqual(Check.order('playDev', ['cosecha', ['trigo', 'vino', 'sal']]), { cmd: 'playDev', args: ['cosecha', ['trigo', 'vino']] });
    assert.deepEqual(Check.order('playDev', ['exclusiva', 'sal']), { cmd: 'playDev', args: ['exclusiva', 'sal'] });
    assert.deepEqual(Check.order('playDev', ['chef']), { cmd: 'playDev', args: ['chef', undefined] });
    assert.deepEqual(Check.order('bankTrade', ['aceite', 'vino']), { cmd: 'bankTrade', args: ['aceite', 'vino'] });
  });

  test('un nombre que no es una jugada (heredado, inventado o que no es texto) se rechaza', () => {
    for (const cmd of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', 'trade', 'hackear', '', null, undefined, 42, ['roll'], { roll: 1 }]) {
      assert.equal(Check.order(cmd, [1]), null, String(cmd));
    }
  });

  test('a una jugada con número le falta o no es un entero: se rechaza (ya no cuenta como 0)', () => {
    for (const args of [[], undefined, null, [null], [''], ['3'], [1.5], [true], [[]], [{}], 'x']) {
      assert.equal(Check.order('buildRoad', args), null, JSON.stringify(args) ?? 'undefined');
    }
    assert.equal(Check.order('discard', ['1', { sal: 1 }]), null, 'el asiento del descarte también');
    assert.equal(Check.order('discard', [null, { sal: 1 }]), null);
  });
});

describe('RF-11 y RNF-3 · Check.state · el invitado solo adopta estados con la forma permitida', () => {
  const { Game } = require('../js/engine.js');
  const AI = require('../js/ai.js');
  const h = require('./helpers.js');
  /* Generador con semilla para que las partidas sean siempre las mismas */
  const semilla = (n) => () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
  /* Una partida de máquinas jugada `pasos` acciones (o hasta el final), como la tendría el anfitrión */
  const partida = (mode, n, pasos, s = 1) => h.withRandom(semilla(s), () => {
    const g = Game.create({ mode, level: 'normal', players: Array.from({ length: n }, (_, i) => ({ name: 'M' + i, ai: true })) });
    for (let k = 0; k < pasos && g.s.phase !== 'over'; k++) {
      const r = AI.step(g);
      if (r && r.offer) for (let d = 1; d < n; d++) {
        const q = (r.offer.from + d) % n;
        if (AI.accepts(g, q, r.offer) && g.playerTrade(r.offer.from, q, r.offer.give, r.offer.get)) break;
      }
    }
    return g;
  });
  /* Copia del estado como la recibe el invitado (pasada por JSON) */
  const copia = (g) => JSON.parse(JSON.stringify(g.s));

  test('los estados de partidas reales son válidos: nuevas, a mitad y terminadas, de los tres tipos', () => {
    for (const mode of ['sencilla', 'clasica', 'completa']) {
      for (const pasos of [0, 30, 400, 40000]) {
        const s = copia(partida(mode, 3, pasos));
        assert.equal(Check.state(s), true, `${mode} tras ${pasos} pasos (fase ${s.phase})`);
      }
    }
  });

  test('en 200 partidas simuladas el estado es válido después de cada paso', () => {
    for (let k = 0; k < 200; k++) {
      const mode = ['sencilla', 'clasica', 'completa'][k % 3], n = 2 + (k % 3);
      h.withRandom(semilla(100 + k), () => {
        const g = Game.create({ mode, level: 'normal', players: Array.from({ length: n }, (_, i) => ({ name: 'M' + i, ai: true })) });
        for (let paso = 0; g.s.phase !== 'over' && paso < 40000; paso++) {
          AI.step(g);
          if (paso % 25 === 0 || g.s.phase === 'over') assert.ok(Check.state(copia(g)), `partida ${k}, paso ${paso}, fase ${g.s.phase}`);
        }
      });
    }
  });

  test('una partida en red de personas (con dispositivo, máquina que juega por alguien y sala) es válida', () => {
    const g = partida('completa', 3, 200);
    g.s.players[0].ai = false; g.s.players[0].device = 'ABCDEFGHIJKL';
    g.s.players[1].away = true;
    g.s.net = { room: 'ABCD' };
    assert.equal(Check.state(copia(g)), true);
  });

  test('un nombre con etiquetas es válido: se mostrará como texto', () => {
    const s = copia(partida('clasica', 2, 50));
    s.players[0].name = '<b>Ana</b>';
    s.log.push({ text: '<img src=x onerror=alert(1)> planta una huerta', p: 0 });
    assert.equal(Check.state(s), true);
  });

  test('un estado con cualquier dato que se pinta fuera de lo permitido no es válido', () => {
    const base = partida('completa', 3, 400);
    const html = '<img src=x onerror=alert(1)>';
    const estropeos = {
      'no es un objeto': () => null,
      'sin jugadores': (s) => { delete s.players; },
      'un solo jugador': (s) => { s.players = s.players.slice(0, 1); },
      'cinco jugadores': (s) => { s.players.push(s.players[0], s.players[1]); },
      'tipo de partida desconocido': (s) => { s.mode = html; },
      'nivel desconocido': (s) => { s.level = html; },
      'fase desconocida': (s) => { s.phase = html; },
      'versión distinta': (s) => { s.version = 2; },
      'recurso de parcela con HTML': (s) => { s.hexes[0].res = html; },
      'número de parcela inexistente': (s) => { s.hexes.find((x) => x.res).num = 7; },
      'número de parcela con HTML': (s) => { s.hexes.find((x) => x.res).num = html; },
      'Erial con número': (s) => { s.hexes.find((x) => !x.res).num = 6; },
      '18 parcelas': (s) => { s.hexes.pop(); },
      'tipo de puerto con HTML': (s) => { s.ports[0] = { edge: s.ports[0]?.edge ?? 0, type: html }; },
      'puerto fuera del tablero': (s) => { s.ports[0] = { edge: 72, type: '3:1' }; },
      'Cítrico fuera del tablero': (s) => { s.critic = 19; },
      'construcción de un jugador que no existe': (s) => { s.builds[0] = { p: 9, t: 1 }; },
      'construcción de tipo 3': (s) => { s.builds[0] = { p: 0, t: 3 }; },
      'construcción con HTML': (s) => { s.builds[0] = { p: 0, t: html }; },
      '53 cruces': (s) => { s.builds.pop(); },
      'camino de un jugador que no existe': (s) => { s.roads[0] = 7; },
      'camino con HTML': (s) => { s.roads[0] = html; },
      'color con HTML': (s) => { s.players[0].color = html; },
      'color 4': (s) => { s.players[0].color = 4; },
      'recurso de la mano con HTML': (s) => { s.players[0].res.sal = html; },
      'recurso de la mano negativo': (s) => { s.players[0].res.sal = -1; },
      'recurso de la mano por encima de 19': (s) => { s.players[0].res.sal = 20; },
      'chefs con HTML': (s) => { s.players[0].chefs = html; },
      'ruta con decimales': (s) => { s.players[0].road = 2.5; },
      'carta de cocina desconocida': (s) => { s.players[0].dev.push({ type: html, turn: 0 }); },
      'nombre que no es texto': (s) => { s.players[0].name = { html }; },
      'máquina que no es sí/no': (s) => { s.players[0].ai = 'sí'; },
      'banca con HTML': (s) => { s.bank.vino = html; },
      'mazo con una carta desconocida': (s) => { s.deck.push(html); },
      'dado 7': (s) => { s.dice = [7, 1]; },
      'dados con HTML': (s) => { s.dice = [html, 1]; },
      'jugador del turno que no existe': (s) => { s.current = 5; },
      'ganador que no existe': (s) => { s.winner = 5; },
      'Gran Ruta de un jugador que no existe': (s) => { s.longest = { p: 6, len: 5 }; },
      'Gran Brigada con HTML': (s) => { s.army = { p: 0, size: html }; },
      'caminos gratis con HTML': (s) => { s.freeRoads = html; },
      'víctima que no existe': (s) => { s.stealFrom = [8]; },
      'descarte con HTML': (s) => { s.pending = { 0: html }; },
      'descarte de un jugador que no existe': (s) => { s.pending = { 9: 1 }; },
      'entrada del historial de un jugador que no existe': (s) => { s.log.push({ text: 'x', p: 5 }); },
      'entrada del historial que no es texto': (s) => { s.log.push({ text: { html }, p: null }); },
      'robo de un recurso con HTML': (s) => { s.lastSteal = { from: 0, to: 1, res: html, turn: 1 }; },
      'sala con un código que no es texto': (s) => { s.net = { room: { html } }; },
    };
    assert.equal(Check.state(copia(base)), true, 'control: el estado sin estropear es válido');
    for (const [motivo, estropear] of Object.entries(estropeos)) {
      const s = copia(base);
      const otro = estropear(s);
      assert.equal(Check.state(otro === undefined ? s : otro), false, 'aceptado con ' + motivo);
    }
  });
});
