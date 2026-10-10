/* Spec 004 — La máquina en su turno: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const AI = require('../js/ai.js');
const { GEO } = require('../js/engine.js');
const h = require('./helpers.js');

/* Partida empezada (tablero vacío) en la que J1 es una máquina con el turno y J0 una persona */
const maquina = (level = 'normal', { mode = 'clasica', phase = 'main', n = 2 } = {}) => {
  const g = h.enJuego(h.newGame({ mode, level, n }), { phase, current: 1 });
  g.s.players[1].ai = true;
  return g;
};
/* Un paso de la máquina sin azar */
const paso = (g) => h.withRandom(0, () => AI.step(g));

describe('RF-1 · cuándo actúa la máquina', () => {
  test('si le toca a una persona, no hace nada', () => {
    for (const phase of ['roll', 'main', 'critic', 'steal']) {
      const g = maquina('normal', { phase });
      g.s.current = 0;
      const antes = h.foto(g);
      assert.equal(paso(g), false, phase);
      assert.equal(h.foto(g), antes, phase);
    }
  });

  test('en su turno hace una sola acción: en la fase de tirar, tira y pasa a construir', () => {
    const g = maquina('normal', { phase: 'roll' });
    assert.equal(h.withRandom(h.dados(3, 5), () => AI.step(g)), true);
    assert.deepEqual([g.s.dice, g.s.phase, g.s.current], [[3, 5], 'main', 1]);
    assert.deepEqual(g.s.log.map((l) => l.text), ['J1 saca un 8']);
  });

  test('al descartar, descarta una máquina aunque no tenga el turno; si solo falta una persona, no hace nada', () => {
    const g = maquina('normal', { phase: 'discard' });
    g.s.current = 0;
    h.setRes(g, 0, { aceite: 2 });
    h.setRes(g, 1, { sal: 2 });
    g.s.pending = { 0: 1, 1: 1 };
    assert.equal(paso(g), true);
    assert.deepEqual([g.s.players[1].res.sal, g.s.pending, g.s.phase], [1, { 0: 1 }, 'discard']);
    const antes = h.foto(g);
    assert.equal(paso(g), false, 'solo queda por descartar J0, que es una persona');
    assert.equal(h.foto(g), antes);
    h.checkInvariants(g);
  });
});

describe('RF-2 · el azar de cada nivel', () => {
  /* J1 tiene que descartar 1 carta y tiene 3 sal y 2 vino: sin azar, descartaría sal */
  const descarta = (level) => {
    const g = maquina(level, { phase: 'discard' });
    h.setRes(g, 1, { sal: 3, vino: 2 });
    g.s.pending = { 1: 1 };
    /* la primera opción (sal) no recibe azar y la segunda (vino) casi el máximo */
    h.withRandom([0, 0.99], () => AI.step(g));
    return g.s.players[1].res.sal === 2 ? 'sal' : 'vino';
  };

  test('en Normal y Difícil (hasta 0,3) el azar no cambia una diferencia de 1: descarta sal', () => {
    assert.equal(descarta('normal'), 'sal');
    assert.equal(descarta('dificil'), 'sal');
  });

  test('en Fácil (hasta 4) el azar sí la cambia: descarta vino', () => {
    assert.equal(descarta('facil'), 'vino');
  });
});

describe('RF-5 · descartes de la máquina', () => {
  test('descarta carta a carta del recurso del que más tiene; en empate, el primero en el orden de recursos', () => {
    const g = maquina('normal', { phase: 'discard' });
    h.setRes(g, 1, { sal: 5, vino: 3 });
    g.s.pending = { 1: 4 };
    assert.equal(paso(g), true);
    assert.deepEqual([g.s.players[1].res.sal, g.s.players[1].res.vino], [2, 2], 'sal, sal, sal (empate 3-3) y vino');
    assert.deepEqual([g.s.bank.sal, g.s.bank.vino], [17, 17]);
    assert.equal(g.s.phase, 'critic');
    h.checkInvariants(g);
  });
});

describe('RF-3 y RF-4 · dónde construye', () => {
  /* Valor de un cruce según la definición de la spec (sin usar el código de la máquina) */
  const PUNTOS = { 2: 1, 12: 1, 3: 2, 11: 2, 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 };
  const valorCruce = (g, v, conocidos) => {
    const productivas = h.hexesOfVert(v).map((i) => g.s.hexes[i]).filter((x) => x.res);
    const tipos = new Set(productivas.map((x) => x.res));
    let valor = productivas.reduce((n, x) => n + PUNTOS[x.num], 0) + 0.6 * tipos.size;
    if (conocidos) tipos.forEach((r) => { if (!conocidos.includes(r)) valor += 1.2; });
    valor += g.s.ports.filter((p) => GEO.edges[p.edge].a === v || GEO.edges[p.edge].b === v).length;
    return valor;
  };
  const casi = (a, b) => Math.abs(a - b) < 1e-9;
  /* Recursos de las parcelas que tocan las construcciones de p */
  const conocidosDe = (g, p) => [...new Set(g.s.builds.flatMap((b, v) => (b && b.p === p
    ? h.hexesOfVert(v).map((i) => g.s.hexes[i].res).filter(Boolean) : [])))];

  test('en la colocación inicial planta en el cruce libre de mayor valor', () => {
    for (let k = 0; k < 20; k++) {
      const g = h.newGame();
      g.s.players[1].ai = true;
      g.s.current = 1;
      const sitios = g.settlementSpots(1, true);
      const mejor = Math.max(...sitios.map((v) => valorCruce(g, v, [])));
      assert.ok(paso(g));
      const v = g.s.builds.findIndex((b) => b && b.p === 1);
      assert.ok(casi(valorCruce(g, v, []), mejor), `partida ${k}: plantó en ${v}`);
    }
  });

  test('durante la partida planta la huerta en el sitio de mayor valor, contando los recursos que ya produce', () => {
    let distintos = 0;
    for (let k = 0; k < 20; k++) {
      const g = maquina();
      h.put(g, 20, 1);
      for (const camino of [h.pathFrom(20, 2), h.pathFrom(20, 2, [h.pathFrom(20, 2)[1]])]) {
        h.road(g, h.edgeBetween(camino[0], camino[1]), 1);
        h.road(g, h.edgeBetween(camino[1], camino[2]), 1);
      }
      h.setRes(g, 1, { aceite: 1, sal: 1, pescado: 1, trigo: 1 });
      const sitios = g.settlementSpots(1, false), conocidos = conocidosDe(g, 1);
      assert.equal(sitios.length, 2, 'preparación: dos sitios posibles');
      const valores = sitios.map((v) => valorCruce(g, v, conocidos)), mejor = Math.max(...valores);
      distintos += !casi(valores[0], valores[1]);
      assert.ok(paso(g));
      const v = sitios.find((x) => g.s.builds[x]);
      assert.ok(v !== undefined && casi(valorCruce(g, v, conocidos), mejor), `partida ${k}`);
      h.checkInvariants(g);
    }
    assert.ok(distintos >= 5, 'en bastantes partidas los dos sitios deben valer distinto: ' + distintos);
  });

  /* La spec dice «sin la bonificación de recursos nuevos», pero en una huerta propia esa bonificación siempre vale 0
     (sus recursos ya los produce), así que no se puede distinguir: se comprueba solo que elige la de mayor valor */
  test('amplía a bodega la huerta propia de mayor valor', () => {
    let distintos = 0;
    for (let k = 0; k < 20; k++) {
      const g = maquina();
      const huertas = h.spread(g, 1, 2);
      h.setRes(g, 1, { trigo: 2, vino: 3 });
      const valores = huertas.map((v) => valorCruce(g, v)), mejor = Math.max(...valores);
      distintos += !casi(valores[0], valores[1]);
      assert.ok(paso(g));
      const v = huertas.find((x) => g.s.builds[x].t === 2);
      assert.ok(v !== undefined && casi(valorCruce(g, v), mejor), `partida ${k}`);
      h.checkInvariants(g);
    }
    assert.ok(distintos >= 5, 'en bastantes partidas las dos huertas deben valer distinto: ' + distintos);
  });

  test('con dos caminos posibles, pone el que llega a un cruce libre y no el que llega a uno ocupado', () => {
    const w = h.findVert((x) => GEO.verts[x].adj.length === 3 && GEO.verts[x].adj.every((y) => GEO.verts[y].adj.length === 3), 'cruce interior');
    const [v, x1, x2] = GEO.verts[w].adj;
    const g = maquina('normal', { phase: 'roadBuilding' });
    g.s.freeRoads = 1;
    h.put(g, v, 1);
    h.road(g, h.edgeBetween(v, w), 1);
    for (const y of GEO.verts[v].adj) if (y !== w) h.road(g, h.edgeBetween(v, y), 0);
    h.put(g, x2, 0);
    assert.deepEqual(g.roadSpots(1).sort((a, b) => a - b), [h.edgeBetween(w, x1), h.edgeBetween(w, x2)].sort((a, b) => a - b));
    assert.ok(paso(g));
    assert.deepEqual([g.s.roads[h.edgeBetween(w, x1)], g.s.roads[h.edgeBetween(w, x2)]], [1, null]);
    h.checkInvariants(g);
  });
});

describe('RF-6 · el Chef antes de tirar', () => {
  /* J1 (máquina) en la fase de tirar; `bloqueada`: con una huerta en la parcela del Cítrico; `chef`: con un Chef jugable */
  const antesDeTirar = ({ bloqueada, chef }) => {
    const g = maquina('normal', { phase: 'roll' });
    const v = bloqueada ? h.vertsOfHex(g.s.critic)[0] : h.findVert((x) => !h.hexesOfVert(x).includes(g.s.critic), 'lejos del Cítrico');
    h.put(g, v, 1);
    if (chef) h.darCarta(g, 1, 'chef');
    return g;
  };

  test('bloqueada y con un Chef jugable: juega el Chef antes de tirar', () => {
    const g = antesDeTirar({ bloqueada: true, chef: true });
    assert.ok(paso(g));
    assert.deepEqual([g.s.phase, g.s.after, g.s.players[1].chefs, g.s.dice], ['critic', 'roll', 1, null]);
  });

  test('sin Chef, o con Chef pero sin estar bloqueada, tira', () => {
    for (const caso of [{ bloqueada: true, chef: false }, { bloqueada: false, chef: true }]) {
      const g = antesDeTirar(caso);
      assert.ok(paso(g));
      assert.notEqual(g.s.dice, null, JSON.stringify(caso));
      assert.equal(g.s.players[1].chefs, 0, JSON.stringify(caso));
    }
  });
});

describe('RF-7 · dónde pone el Cítrico y a quién roba', () => {
  /* Un cruce de la parcela i que no toque ninguna de las parcelas de `evita` y esté libre */
  const cruceSolo = (g, i, evita) => h.findVert((v) => h.hexesOfVert(v).includes(i) && g.vertexFree(v)
    && !h.hexesOfVert(v).some((j) => evita.includes(j)), 'cruce de la parcela ' + i);
  const enCritic = () => maquina('normal', { phase: 'critic' });

  test('nunca en una parcela con construcciones suyas, aunque sea la que más produce a un rival', () => {
    const g = enCritic();
    const ocho = h.hexWithNum(g, 8), dos = h.hexWithNum(g, 2);
    const [a, , , b] = h.vertsOfHex(ocho);
    h.put(g, a, 0, 2);
    h.put(g, b, 1);
    h.put(g, cruceSolo(g, dos, [ocho]), 0);
    assert.ok(paso(g));
    assert.notEqual(g.s.critic, ocho, 'no va al 8, donde tiene una huerta');
    assert.ok(!h.vertsOfHex(g.s.critic).some((v) => g.s.builds[v] && g.s.builds[v].p === 1), 'la elegida no tiene nada suyo');
    assert.ok(h.vertsOfHex(g.s.critic).some((v) => g.s.builds[v] && g.s.builds[v].p === 0), 'y sí algo del rival');
    h.checkInvariants(g);
  });

  /* Partida en la fase de mover el Cítrico con parcelas de los números pedidos que tengan un cruce de costa que solo
     las toque a ellas (así una construcción allí solo cuenta para esa parcela). Devuelve la partida y esos cruces */
  const conCostas = (numeros) => {
    for (let k = 0; k < 500; k++) {
      const g = enCritic(), usadas = [];
      const cruces = numeros.map((n) => {
        const i = g.s.hexes.findIndex((x, q) => x.num === n && !usadas.includes(q)
          && h.vertsOfHex(q).some((v) => h.hexesOfVert(v).length === 1));
        if (i < 0) return null;
        usadas.push(i);
        return { i, v: h.vertsOfHex(i).find((v) => h.hexesOfVert(v).length === 1) };
      });
      if (cruces.every(Boolean)) return { g, cruces };
    }
    throw new Error('No se ha encontrado un tablero con esas parcelas en la costa');
  };

  test('entre parcelas rivales, la que más produce: por su número y por tener bodega', () => {
    const a = conCostas([8, 2]);
    h.put(a.g, a.cruces[0].v, 0);
    h.put(a.g, a.cruces[1].v, 0);
    assert.ok(paso(a.g));
    assert.equal(a.g.s.critic, a.cruces[0].i, 'el 8 (5 puntos de probabilidad) antes que el 2 (1)');
    const b = conCostas([6, 4]);
    h.put(b.g, b.cruces[0].v, 0);
    h.put(b.g, b.cruces[1].v, 0, 2);
    assert.ok(paso(b.g));
    assert.equal(b.g.s.critic, b.cruces[1].i, 'bodega en el 4 (3 × 2) antes que huerta en el 6 (5 × 1)');
    h.checkInvariants(a.g);
    h.checkInvariants(b.g);
  });

  test('roba a quien más puntos a la vista tiene y, a igualdad, a quien más cartas tiene', () => {
    for (const [puntos, cartas, esperado] of [[[2, 1], [1, 5], 0], [[1, 1], [1, 5], 2]]) {
      const g = maquina('normal', { phase: 'steal', n: 3 });
      h.spread(g, 0, puntos[0]);
      h.spread(g, 2, puntos[1]);
      h.setRes(g, 0, { sal: cartas[0] });
      h.setRes(g, 2, { vino: cartas[1] });
      Object.assign(g.s, { stealFrom: [0, 2], after: 'main' });
      assert.ok(paso(g));
      assert.equal(g.s.lastSteal.from, esperado, `puntos ${puntos}, cartas ${cartas}`);
      assert.equal(g.s.phase, 'main');
    }
  });
});

describe('RF-8 · cartas de cocina de la máquina', () => {
  /* J1 (máquina) en la fase de construir con una huerta en el cruce 20, un camino hasta el cruce 12 (sitio libre para
     otra huerta), la mano de recursos pedida y las cartas pedidas, compradas en un turno anterior */
  const conCartas = (cartas, mano = {}, mode = 'clasica') => {
    const g = maquina('normal', { mode });
    h.put(g, 20, 1);
    h.road(g, h.edgeBetween(20, 13), 1);
    h.road(g, h.edgeBetween(13, 12), 1);
    h.setRes(g, 1, mano);
    for (const c of cartas) h.darCarta(g, 1, c);
    return g;
  };
  const jugada = (g) => g.s.log.find((l) => / juega /.test(l.text))?.text;

  test('con varias jugables, primero el Chef', () => {
    const g = conCartas(['cosecha', 'caminos', 'chef']);
    assert.ok(paso(g));
    assert.equal(jugada(g), 'J1 juega un Chef');
  });

  test('sin Chef, Obras antes que Buena cosecha', () => {
    const g = conCartas(['cosecha', 'caminos']);
    assert.ok(paso(g));
    assert.equal(jugada(g), 'J1 juega Obras: 2 caminos gratis');
  });

  test('Buena cosecha pide lo que le falta para su primer objetivo y completa con lo que menos tiene', () => {
    const g = conCartas(['cosecha'], { aceite: 1, sal: 1, pescado: 1 });
    assert.ok(paso(g));
    assert.equal(jugada(g), 'J1 juega Buena cosecha y toma 1 trigo, 1 vino', 'le falta 1 trigo para la huerta');
  });

  test('caso confirmado: con 1 carta pedida, la segunda es la segunda más escasa aunque se salte la más escasa', () => {
    /* La bodega (2 trigo, 3 vino) es su primer objetivo y le falta 1 trigo; de lo que no tiene, el aceite va primero */
    const g = conCartas(['cosecha'], { trigo: 1, vino: 3 });
    assert.ok(paso(g));
    assert.equal(jugada(g), 'J1 juega Buena cosecha y toma 1 sal, 1 trigo', 'se salta el aceite');
  });

  test('si la banca no tiene lo que pediría con Buena cosecha, pasa a valorar Exclusiva', () => {
    const g = conCartas(['cosecha', 'exclusiva'], { aceite: 1, sal: 1, pescado: 1 });
    h.setRes(g, 0, { trigo: 19 });
    assert.ok(paso(g));
    assert.equal(jugada(g), 'J1 juega Exclusiva y se lleva 19 de trigo');
    h.checkInvariants(g);
  });

  test('Exclusiva solo si los rivales suman 3 o más de un recurso', () => {
    const con3 = conCartas(['exclusiva']);
    h.setRes(con3, 0, { sal: 3 });
    assert.ok(paso(con3));
    assert.equal(jugada(con3), 'J1 juega Exclusiva y se lleva 3 de sal');
    const con2 = conCartas(['exclusiva']);
    h.setRes(con2, 0, { sal: 2 });
    assert.ok(paso(con2));
    assert.equal(jugada(con2), undefined);
    assert.equal(con2.s.players[1].dev.length, 1, 'la carta se queda en la mano');
  });

  test('en Sencilla no compra ni juega cartas de cocina', () => {
    const g = conCartas([], { pescado: 1, trigo: 1, vino: 1 }, 'sencilla');
    g.s.players[1].dev.push({ type: 'chef', turn: 0 });
    assert.ok(paso(g));
    assert.deepEqual([g.s.players[1].dev.length, g.s.players[1].chefs, jugada(g)], [1, 0, undefined]);
    assert.ok(!g.s.log.some((l) => /compra/.test(l.text)));
  });
});

describe('RF-9 y RF-10 · qué construye primero, cuándo cambia con la banca y cuándo termina', () => {
  /* J1 (máquina) en la fase de construir con una huerta en el cruce 20 y un camino hasta el cruce 12, libre para otra */
  const conSitio = (mano) => {
    const g = maquina();
    h.put(g, 20, 1);
    h.road(g, h.edgeBetween(20, 13), 1);
    h.road(g, h.edgeBetween(13, 12), 1);
    h.setRes(g, 1, mano);
    return g;
  };
  const ultimo = (g) => g.s.log.at(-1)?.text;

  test('pudiendo pagar bodega y huerta, construye la bodega', () => {
    const g = conSitio({ aceite: 1, sal: 1, pescado: 1, trigo: 3, vino: 3 });
    assert.ok(paso(g));
    assert.deepEqual([g.s.builds[20], g.s.builds[12], ultimo(g)], [{ p: 1, t: 2 }, null, 'J1 amplía una huerta a bodega']);
    h.checkInvariants(g);
  });

  test('pudiendo pagar huerta y carta de cocina, planta la huerta', () => {
    const g = conSitio({ aceite: 1, sal: 1, pescado: 1, trigo: 1, vino: 1 });
    assert.ok(paso(g));
    assert.deepEqual([g.s.builds[12], ultimo(g)], [{ p: 1, t: 1 }, 'J1 planta una huerta']);
    h.checkInvariants(g);
  });

  test('con más de 7 cartas y nada mejor que pagar, construye un camino; con 7, termina el turno', () => {
    const ocho = conSitio({ aceite: 4, sal: 4 });
    assert.ok(paso(ocho));
    assert.deepEqual([ocho.s.players[1].roads, ultimo(ocho)], [12, 'J1 construye un camino']);
    const siete = conSitio({ aceite: 4, sal: 3 });
    assert.ok(paso(siete));
    assert.deepEqual([siete.s.current, siete.s.phase, siete.s.players[1].roads], [0, 'roll', 13]);
  });

  test('si le sobra lo bastante, cambia 4:1 con la banca lo que le falta (un cambio por paso)', () => {
    const g = conSitio({ aceite: 5, sal: 1, pescado: 1 });
    assert.ok(paso(g));
    assert.equal(ultimo(g), 'J1 cambia 4 aceite por 1 trigo con la banca');
    assert.deepEqual([g.s.players[1].res.aceite, g.s.players[1].res.trigo, g.s.current], [1, 1, 1]);
    assert.ok(paso(g));
    assert.equal(ultimo(g), 'J1 planta una huerta', 'y en el paso siguiente construye');
    h.checkInvariants(g);
  });

  test('si la banca no tiene lo que le falta, no intenta cambiarlo', () => {
    const g = conSitio({ aceite: 5, sal: 1, pescado: 1 });
    h.setRes(g, 0, { trigo: 19 });
    assert.ok(paso(g));
    assert.ok(!g.s.log.some((l) => /banca/.test(l.text)));
    assert.deepEqual([g.s.players[1].res.aceite, g.s.current], [5, 0], 'termina el turno sin cambiar');
  });

  test('si no puede hacer nada, termina el turno', () => {
    const g = conSitio({});
    assert.ok(paso(g));
    assert.deepEqual([g.s.current, g.s.phase, g.s.turn], [0, 'roll', 2]);
  });
});
