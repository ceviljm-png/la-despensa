/* Spec 001 — Construcción, puntos y victoria: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, GEO } = require('../js/engine.js');
const h = require('./helpers.js');

describe('utilidades de la spec 001', () => {
  test('edgeBetween devuelve el lado que une dos cruces vecinos y falla con cruces que no lo son', () => {
    for (const v of [0, 10, 30, 53]) {
      for (const w of GEO.verts[v].adj) {
        const e = GEO.edges[h.edgeBetween(v, w)];
        assert.deepEqual([e.a, e.b].sort((x, y) => x - y), [v, w].sort((x, y) => x - y));
      }
    }
    const lejos = GEO.verts.findIndex((_, w) => w !== 0 && !GEO.verts[0].adj.includes(w));
    assert.throws(() => h.edgeBetween(0, lejos), /no son vecinos/);
  });

  test('pathFrom da k + 1 cruces distintos y seguidos, sin pasar por los evitados', () => {
    for (const k of [1, 4, 8]) {
      const camino = h.pathFrom(0, k);
      assert.equal(camino.length, k + 1);
      assert.equal(new Set(camino).size, k + 1);
      for (let i = 1; i < camino.length; i++) assert.ok(GEO.verts[camino[i - 1]].adj.includes(camino[i]));
    }
    const evita = [GEO.verts[0].adj[0]];
    assert.ok(!h.pathFrom(0, 5, evita).some((v) => evita.includes(v)));
    const linea = h.pathFrom(0, 4);
    const rama = h.pathFrom(linea[2], 2, linea);
    assert.equal(rama[0], linea[2], 'el cruce de salida puede estar en evita');
    assert.ok(!rama.slice(1).some((v) => linea.includes(v)));
    assert.throws(() => h.pathFrom(0, 2, GEO.verts[0].adj), /No hay un camino/);
  });

  test('spread coloca k construcciones sin romper la regla de distancia', () => {
    const g = h.enJuego(h.newGame(), { phase: 'main' });
    const huertas = h.spread(g, 0, 4);
    const bodegas = h.spread(g, 1, 3, 2);
    assert.equal(huertas.length, 4);
    assert.ok(bodegas.every((v) => g.s.builds[v].p === 1 && g.s.builds[v].t === 2));
    assert.deepEqual([g.s.players[0].huertas, g.s.players[1].bodegas], [1, 1]);
    h.checkInvariants(g);
  });
});

describe('RF-1 y RF-4 · caminos', () => {
  /* Partida en la fase de construir con una huerta de J0 en el cruce 20 y lo justo para un camino */
  const conHuerta = () => {
    const g = h.enJuego(h.newGame(), { phase: 'main' });
    h.put(g, 20, 0);
    h.setRes(g, 0, { aceite: 1, sal: 1 });
    return g;
  };

  test('un camino junto a una huerta propia se acepta y lo pagado vuelve a la banca', () => {
    const g = conHuerta();
    const e = h.edgesOfVert(20)[0];
    assert.ok(g.buildRoad(e));
    assert.equal(g.s.roads[e], 0);
    assert.equal(g.s.players[0].roads, 14);
    assert.deepEqual([g.s.players[0].res.aceite, g.s.players[0].res.sal, g.s.bank.aceite, g.s.bank.sal], [0, 0, 19, 19]);
    assert.equal(g.s.log.at(-1).text, 'J0 construye un camino');
    h.checkInvariants(g);
  });

  test('un camino que continúa otro camino propio se acepta aunque no haya construcción en el cruce', () => {
    const g = conHuerta();
    const [v, w, x] = h.pathFrom(20, 2);
    h.road(g, h.edgeBetween(v, w), 0);
    assert.ok(g.buildRoad(h.edgeBetween(w, x)));
    h.checkInvariants(g);
  });

  test('sin recursos, sin caminos por colocar, en un lado ocupado o que no toca nada propio, se rechaza sin cambiar nada', () => {
    const casos = [
      ['sin recursos', (g) => h.setRes(g, 0, { aceite: 1 })],
      ['sin caminos por colocar', (g) => { g.s.players[0].roads = 0; }],
      ['en un lado ocupado', (g) => h.road(g, h.edgesOfVert(20)[0], 1)],
    ];
    for (const [motivo, preparar] of casos) {
      const g = conHuerta();
      preparar(g);
      const antes = h.foto(g);
      assert.equal(g.buildRoad(h.edgesOfVert(20)[0]), false, 'aceptado ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
    const g = conHuerta();
    const lejos = GEO.edges.findIndex((e) => ![e.a, e.b].some((v) => v === 20 || GEO.verts[20].adj.includes(v)));
    const antes = h.foto(g);
    assert.equal(g.buildRoad(lejos), false, 'aceptado en un lado que no toca nada propio');
    assert.equal(h.foto(g), antes);
  });

  test('un camino no puede seguir a través de un cruce con una huerta rival', () => {
    const g = conHuerta();
    const [v, w, x, y] = h.pathFrom(20, 3);
    h.road(g, h.edgeBetween(v, w), 0);
    h.road(g, h.edgeBetween(w, x), 0);
    h.put(g, x, 1);
    const antes = h.foto(g);
    assert.equal(g.buildRoad(h.edgeBetween(x, y)), false);
    assert.equal(h.foto(g), antes);
    const otroDeW = GEO.verts[w].adj.find((z) => z !== v && z !== x);
    assert.ok(g.buildRoad(h.edgeBetween(w, otroDeW)), 'desde el cruce anterior sí se puede');
    h.checkInvariants(g);
  });

  test('fuera de la fase de construir se rechaza sin cambiar nada', () => {
    for (const phase of ['roll', 'discard', 'critic', 'steal', 'setup', 'over']) {
      const g = conHuerta();
      g.s.phase = phase;
      const antes = h.foto(g);
      assert.equal(g.buildRoad(h.edgesOfVert(20)[0]), false, 'aceptado en ' + phase);
      assert.equal(h.foto(g), antes);
    }
  });
});

describe('RF-2 y RF-4 · huertas', () => {
  const COSTE = { aceite: 1, sal: 1, pescado: 1, trigo: 1 };
  /* Huerta de J0 en el cruce 20 y un camino de 2 lados hasta x, un cruce libre a distancia 2 */
  const conCamino = () => {
    const g = h.enJuego(h.newGame(), { phase: 'main' });
    const [v, w, x] = h.pathFrom(20, 2);
    h.put(g, v, 0);
    h.road(g, h.edgeBetween(v, w), 0);
    h.road(g, h.edgeBetween(w, x), 0);
    h.setRes(g, 0, COSTE);
    return { g, w, x };
  };

  test('una huerta en un cruce libre al final de un camino propio se acepta y cuesta lo suyo', () => {
    const { g, x } = conCamino();
    assert.ok(g.buildHuerta(x));
    assert.deepEqual(g.s.builds[x], { p: 0, t: 1 });
    assert.equal(g.s.players[0].huertas, 3);
    assert.deepEqual(g.s.players[0].res, { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 });
    assert.deepEqual(g.s.bank, { aceite: 19, sal: 19, pescado: 19, trigo: 19, vino: 19 });
    assert.equal(g.s.log.at(-1).text, 'J0 planta una huerta');
    h.checkInvariants(g);
  });

  test('sin camino, junto a otra construcción, en un cruce ocupado, sin recursos o sin huertas, se rechaza sin cambiar nada', () => {
    const casos = [
      ['sin camino propio', (g) => h.findVert((v) => g.vertexFree(v) && !GEO.verts[v].edges.some((e) => g.s.roads[e] === 0), 'cruce sin camino')],
      ['junto a otra construcción', (g, w) => w],
      ['en un cruce ocupado', (g, w, x) => { h.put(g, x, 1); return x; }],
      ['sin recursos', (g, w, x) => { h.setRes(g, 0, { aceite: 1, sal: 1, pescado: 1 }); return x; }],
      ['sin huertas por colocar', (g, w, x) => { g.s.players[0].huertas = 0; return x; }],
      ['fuera de la fase de construir', (g, w, x) => { g.s.phase = 'roll'; return x; }],
    ];
    for (const [motivo, preparar] of casos) {
      const { g, w, x } = conCamino();
      const v = preparar(g, w, x);
      const antes = h.foto(g);
      assert.equal(g.buildHuerta(v), false, 'aceptada ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
  });
});

describe('RF-3 y RF-4 · bodegas', () => {
  /* Huerta de J0 en el cruce 20 y lo justo para ampliarla */
  const conHuerta = () => {
    const g = h.enJuego(h.newGame(), { phase: 'main' });
    h.put(g, 20, 0);
    h.setRes(g, 0, { trigo: 2, vino: 3 });
    return g;
  };

  test('ampliar una huerta propia la convierte en bodega, cuesta 2 trigo y 3 vino y devuelve la huerta', () => {
    const g = conHuerta();
    assert.ok(g.buildBodega(20));
    assert.deepEqual(g.s.builds[20], { p: 0, t: 2 });
    assert.deepEqual([g.s.players[0].bodegas, g.s.players[0].huertas], [3, 5]);
    assert.deepEqual([g.s.players[0].res.trigo, g.s.players[0].res.vino, g.s.bank.trigo, g.s.bank.vino], [0, 0, 19, 19]);
    assert.equal(g.s.log.at(-1).text, 'J0 amplía una huerta a bodega');
    h.checkInvariants(g);
  });

  test('en una huerta rival, en una bodega, en un cruce vacío, sin recursos o sin bodegas, se rechaza sin cambiar nada', () => {
    const lejos = (g) => h.findVert((v) => g.vertexFree(v), 'cruce libre');
    const casos = [
      ['en una huerta rival', (g) => { const v = lejos(g); h.put(g, v, 1); return v; }],
      ['en una bodega propia', (g) => { const v = lejos(g); h.put(g, v, 0, 2); return v; }],
      ['en un cruce vacío', (g) => lejos(g)],
      ['sin recursos', (g) => { h.setRes(g, 0, { trigo: 2, vino: 2 }); return 20; }],
      ['sin bodegas por colocar', (g) => { g.s.players[0].bodegas = 0; return 20; }],
      ['fuera de la fase de construir', (g) => { g.s.phase = 'roll'; return 20; }],
    ];
    for (const [motivo, preparar] of casos) {
      const g = conHuerta();
      const v = preparar(g);
      const antes = h.foto(g);
      assert.equal(g.buildBodega(v), false, 'aceptada ' + motivo);
      assert.equal(h.foto(g), antes, motivo);
    }
  });
});

describe('RF-5 · puntos', () => {
  test('huerta 1, bodega 2, Gran Ruta 2, Gran Brigada 2; las Estrellas solo en los puntos ocultos', () => {
    const g = h.enJuego(h.newGame(), { phase: 'main' });
    h.spread(g, 0, 2);
    h.spread(g, 0, 1, 2);
    assert.deepEqual([g.points(0, false), g.points(1, false)], [4, 0]);
    g.s.longest = { p: 0, len: 5 };
    g.s.army = { p: 0, size: 3 };
    assert.equal(g.points(0, false), 8);
    for (const type of ['estrella', 'estrella', 'chef']) {
      g.s.deck.splice(g.s.deck.indexOf(type), 1);
      g.s.players[0].dev.push({ type, turn: 0 });
    }
    assert.deepEqual([g.points(0, false), g.points(0, true)], [8, 10]);
    h.checkInvariants(g);
  });
});

describe('RF-6 · longitud de la ruta', () => {
  /* Coloca caminos de p a lo largo de una lista de cruces */
  const trazar = (g, p, cruces) => {
    for (let i = 1; i < cruces.length; i++) h.road(g, h.edgeBetween(cruces[i - 1], cruces[i]), p);
  };
  const partida = () => h.enJuego(h.newGame(), { phase: 'main' });

  test('una línea de 4 caminos mide 4', () => {
    const g = partida();
    trazar(g, 0, h.pathFrom(20, 4));
    assert.equal(g.roadLength(0), 4);
    assert.equal(g.roadLength(1), 0);
  });

  test('con una rama, cuenta la rama más larga, no la suma', () => {
    const g = partida();
    /* Una línea de 4 cuyo cruce del medio tenga 3 vecinos, para poder sacar de él una rama de 3 */
    const inicio = h.findVert((v) => {
      try {
        const l = h.pathFrom(v, 4);
        return GEO.verts[l[2]].adj.length === 3 && h.pathFrom(l[2], 3, l);
      } catch (e) { return false; }
    }, 'línea con un cruce central de 3 vecinos');
    const linea = h.pathFrom(inicio, 4);
    trazar(g, 0, linea);
    const rama = h.pathFrom(linea[2], 1, linea);
    trazar(g, 0, rama);
    assert.equal(g.roadLength(0), 4, 'una rama corta no alarga la ruta');
    trazar(g, 0, h.pathFrom(rama[1], 2, linea.concat(rama)));
    assert.equal(g.roadLength(0), 5, 'por la rama larga: 2 de la línea + 3 de la rama');
  });

  test('una huerta propia en medio no corta la ruta; una rival sí', () => {
    const linea = h.pathFrom(20, 4);
    const propia = partida();
    trazar(propia, 0, linea);
    h.put(propia, linea[2], 0);
    assert.equal(propia.roadLength(0), 4);
    for (const [k, esperado] of [[2, 2], [1, 3]]) {
      const g = partida();
      trazar(g, 0, linea);
      h.put(g, linea[k], 1);
      assert.equal(g.roadLength(0), esperado, 'huerta rival en el cruce ' + k + ' de la línea');
      h.checkInvariants(g);
    }
  });
});

describe('RF-7 · Gran Ruta', () => {
  /* n líneas de k lados, separadas entre sí (ningún cruce de una es vecino de otra).
     La primera cumple `primera` (por ejemplo, que su 4.º cruce tenga 3 vecinos para poder cortarla) */
  const separadas = (n, k, primera = () => true) => {
    const usadas = new Set(), lineas = [];
    for (let v = 0; v < GEO.verts.length && lineas.length < n; v++) {
      if (usadas.has(v)) continue;
      let l;
      try { l = h.pathFrom(v, k, [...usadas]); } catch (e) { continue; }
      if (!lineas.length && !primera(l)) continue;
      lineas.push(l);
      for (const x of l) [x, ...GEO.verts[x].adj].forEach((y) => usadas.add(y));
    }
    if (lineas.length < n) throw new Error('No caben ' + n + ' líneas de ' + k);
    return lineas;
  };
  const cortable = (l) => GEO.verts[l[3]].adj.length === 3;
  /* Partida de n jugadores; cada uno con una huerta al principio de su línea de 6 lados y los `tendidos` primeros caminos */
  const conLineas = (n, tendidos) => {
    const g = h.enJuego(h.newGame({ n }), { phase: 'main' });
    const lineas = separadas(n, 6, cortable);
    lineas.forEach((l, p) => {
      h.put(g, l[0], p);
      for (let i = 0; i < tendidos[p]; i++) h.road(g, h.edgeBetween(l[i], l[i + 1]), p);
    });
    return { g, lineas };
  };
  /* El jugador p construye de verdad el lado i de su línea */
  const construir = (g, p, l, i) => {
    g.s.current = p;
    h.setRes(g, p, { aceite: 1, sal: 1 });
    assert.ok(g.buildRoad(h.edgeBetween(l[i], l[i + 1])), `J${p} no puede construir el lado ${i}`);
  };
  /* El jugador p planta una huerta en el 4.º cruce de la línea de J0, llegando con un camino propio */
  const cortar = (g, p, l) => {
    const medio = l[3], z = GEO.verts[medio].adj.find((y) => y !== l[2] && y !== l[4]);
    h.road(g, h.edgeBetween(medio, z), p);
    g.s.current = p;
    h.setRes(g, p, { aceite: 1, sal: 1, pescado: 1, trigo: 1 });
    assert.ok(g.buildHuerta(medio), `J${p} no puede plantar en medio de la ruta`);
  };
  const textos = (g) => g.s.log.map((x) => x.text);

  test('el 5.º camino seguido da la Gran Ruta y se anota', () => {
    const { g, lineas } = conLineas(2, [4, 0]);
    construir(g, 0, lineas[0], 4);
    assert.deepEqual(g.s.longest, { p: 0, len: 5 });
    assert.equal(g.s.log.at(-1).text, 'J0 consigue la Gran Ruta (5 caminos): 2 puntos');
    h.checkInvariants(g);
  });

  test('con 4 caminos seguidos no hay Gran Ruta', () => {
    const { g, lineas } = conLineas(2, [3, 0]);
    construir(g, 0, lineas[0], 3);
    assert.deepEqual(g.s.longest, { p: null, len: 0 });
    assert.ok(!textos(g).some((t) => /Gran Ruta/.test(t)));
  });

  test('quien la tiene la conserva si otro le iguala; si le supera, pasa al otro y se anota a quién se la quita (RF-11)', () => {
    const { g, lineas } = conLineas(2, [4, 4]);
    construir(g, 0, lineas[0], 4);
    construir(g, 1, lineas[1], 4);
    assert.deepEqual(g.s.longest, { p: 0, len: 5 }, 'empate: la conserva J0');
    construir(g, 1, lineas[1], 5);
    assert.deepEqual(g.s.longest, { p: 1, len: 6 });
    assert.equal(g.s.log.at(-1).text, 'J1 consigue la Gran Ruta (6 caminos) y se la quita a J0: 2 puntos');
    assert.ok(!textos(g).some((t) => /pierde/.test(t)), 'no se anota aparte que J0 la pierde');
    h.checkInvariants(g);
  });

  test('si un rival corta la ruta y nadie más llega a 5, la Gran Ruta queda libre y se anota', () => {
    const { g, lineas } = conLineas(2, [4, 0]);
    construir(g, 0, lineas[0], 4);
    cortar(g, 1, lineas[0]);
    assert.equal(g.roadLength(0), 3);
    assert.deepEqual(g.s.longest, { p: null, len: 0 });
    assert.equal(g.s.log.at(-1).text, 'J0 pierde la Gran Ruta');
    h.checkInvariants(g);
  });

  test('si al cortarla empatan dos rivales en la más larga, también queda libre', () => {
    const { g, lineas } = conLineas(3, [4, 0, 0]);
    construir(g, 0, lineas[0], 4);
    assert.equal(g.s.longest.p, 0);
    for (const p of [1, 2]) for (let i = 0; i < 5; i++) h.road(g, h.edgeBetween(lineas[p][i], lineas[p][i + 1]), p);
    cortar(g, 2, lineas[0]);
    assert.deepEqual([g.roadLength(1), g.roadLength(2)], [5, 5]);
    assert.deepEqual(g.s.longest, { p: null, len: 0 });
    assert.equal(g.s.log.at(-1).text, 'J0 pierde la Gran Ruta');
    h.checkInvariants(g);
  });

  test('si al cortarla otro tiene en solitario la más larga, la consigue y se anota a quién se la quita (RF-11)', () => {
    const { g, lineas } = conLineas(3, [4, 0, 0]);
    construir(g, 0, lineas[0], 4);
    for (let i = 0; i < 5; i++) h.road(g, h.edgeBetween(lineas[1][i], lineas[1][i + 1]), 1);
    assert.equal(g.s.longest.p, 0, 'J0 la conserva mientras nadie le supera');
    cortar(g, 2, lineas[0]);
    assert.deepEqual(g.s.longest, { p: 1, len: 5 });
    assert.equal(g.s.log.at(-1).text, 'J1 consigue la Gran Ruta (5 caminos) y se la quita a J0: 2 puntos');
    h.checkInvariants(g);
  });
});

describe('RF-8 · Gran Brigada', () => {
  const partida = () => h.enJuego(h.newGame({ mode: 'clasica' }), { phase: 'main', turn: 3 });
  /* El jugador p, con `jugados` chefs ya jugados, juega de verdad un Chef comprado en un turno anterior */
  const jugarChef = (g, p, jugados) => {
    const s = g.s;
    Object.assign(s, { current: p, phase: 'main', devPlayed: false });
    s.players[p].chefs = jugados;
    s.deck.splice(s.deck.indexOf('chef'), 1);
    s.players[p].dev.push({ type: 'chef', turn: s.turn - 1 });
    assert.ok(g.playDev('chef'), `J${p} no puede jugar el Chef`);
  };
  const textos = (g) => g.s.log.map((x) => x.text);

  test('el 3.er Chef jugado da la Gran Brigada y se anota', () => {
    const g = partida();
    jugarChef(g, 0, 2);
    assert.equal(g.s.players[0].chefs, 3);
    assert.deepEqual(g.s.army, { p: 0, size: 3 });
    assert.deepEqual(textos(g).slice(-2), ['J0 juega un Chef', 'J0 consigue la Gran Brigada (3 chefs): 2 puntos']);
    h.checkInvariants(g);
  });

  test('con 2 chefs jugados no hay Gran Brigada', () => {
    const g = partida();
    jugarChef(g, 0, 1);
    assert.deepEqual(g.s.army, { p: null, size: 0 });
    assert.ok(!textos(g).some((t) => /Brigada/.test(t)));
  });

  test('un rival con los mismos chefs no la quita; con uno más, sí', () => {
    const g = partida();
    jugarChef(g, 0, 2);
    jugarChef(g, 1, 2);
    assert.deepEqual(g.s.army, { p: 0, size: 3 }, 'empate a 3: la conserva J0');
    jugarChef(g, 1, 3);
    assert.deepEqual(g.s.army, { p: 1, size: 4 });
    assert.equal(g.s.log.at(-1).text, 'J1 consigue la Gran Brigada (4 chefs): 2 puntos');
    h.checkInvariants(g);
  });
});

describe('RF-9 · victoria', () => {
  const HUERTA = { aceite: 1, sal: 1, pescado: 1, trigo: 1 };
  /* Partida en la fase de construir en la que J0 tiene `bodegas` bodegas y `huertas` huertas */
  const conPuntos = (mode, bodegas, huertas) => {
    const g = h.enJuego(h.newGame({ mode }), { phase: 'main', turn: 3 });
    h.spread(g, 0, bodegas, 2);
    h.spread(g, 0, huertas);
    return g;
  };
  /* J0 planta de verdad una huerta más (con un camino hasta un cruce libre) */
  const plantar = (g) => {
    const x = h.findVert((v) => g.vertexFree(v), 'cruce libre');
    h.road(g, h.edgesOfVert(x)[0], 0);
    h.setRes(g, 0, HUERTA);
    assert.ok(g.buildHuerta(x));
  };

  test('en Clásica, la huerta que lleva a 10 puntos da la victoria', () => {
    const g = conPuntos('clasica', 4, 1);
    assert.equal(g.points(0, true), 9);
    plantar(g);
    assert.deepEqual([g.s.phase, g.s.winner], ['over', 0]);
    assert.equal(g.s.log.at(-1).text, '¡J0 gana la partida!');
    h.checkInvariants(g);
  });

  test('en Sencilla bastan 8 puntos; en Clásica 9 no bastan', () => {
    const sencilla = conPuntos('sencilla', 3, 1);
    plantar(sencilla);
    assert.equal(sencilla.points(0, true), 8);
    assert.deepEqual([sencilla.s.phase, sencilla.s.winner], ['over', 0]);
    const clasica = conPuntos('clasica', 4, 0);
    plantar(clasica);
    assert.equal(clasica.points(0, true), 9);
    assert.deepEqual([clasica.s.phase, clasica.s.winner], ['main', null]);
  });

  test('comprar una Estrella con 9 puntos da la victoria (cuenta aunque los demás no la vean)', () => {
    const g = conPuntos('clasica', 4, 1);
    g.s.deck.splice(g.s.deck.indexOf('estrella'), 1);
    g.s.deck.push('estrella');
    h.setRes(g, 0, { pescado: 1, trigo: 1, vino: 1 });
    assert.ok(g.buyDev());
    assert.deepEqual([g.points(0, false), g.points(0, true)], [9, 10]);
    assert.deepEqual([g.s.phase, g.s.winner], ['over', 0]);
    h.checkInvariants(g);
  });

  test('quien tiene los puntos en el turno de otro gana al empezar su turno, antes de tirar', () => {
    const g = h.enJuego(h.newGame({ mode: 'clasica' }), { phase: 'main', turn: 3, current: 0 });
    h.spread(g, 1, 4, 2);
    h.spread(g, 1, 2);
    assert.equal(g.points(1, true), 10);
    assert.deepEqual([g.s.phase, g.s.winner], ['main', null], 'durante el turno de J0 no gana');
    assert.ok(g.endTurn());
    assert.deepEqual([g.s.current, g.s.phase, g.s.winner, g.s.dice], [1, 'over', 1, null]);
    assert.equal(g.s.log.at(-1).text, '¡J1 gana la partida!');
  });

  test('con la partida terminada no se acepta ninguna jugada', () => {
    const g = conPuntos('clasica', 3, 3);
    plantar(g);
    h.setRes(g, 0, { aceite: 2, sal: 2, pescado: 1, trigo: 3, vino: 4 });
    const x = h.findVert((v) => g.vertexFree(v), 'cruce libre');
    h.road(g, h.edgesOfVert(x)[0], 0);
    const antes = h.foto(g);
    const jugadas = {
      camino: (j) => j.buildRoad(h.edgesOfVert(x)[1]),
      huerta: (j) => j.buildHuerta(x),
      bodega: (j) => j.buildBodega(j.s.builds.findIndex((b) => b && b.p === 0 && b.t === 1)),
      carta: (j) => j.buyDev(),
      tirar: (j) => j.roll(),
      'terminar el turno': (j) => j.endTurn(),
      'cambiar con la banca': (j) => j.bankTrade('vino', 'sal'),
    };
    for (const [nombre, jugar] of Object.entries(jugadas)) {
      assert.equal(jugar(g), false, 'aceptado: ' + nombre);
      /* control: con los mismos datos y la partida sin terminar, sí se aceptaría */
      const viva = new Game(JSON.parse(antes));
      Object.assign(viva.s, { phase: nombre === 'tirar' ? 'roll' : 'main', winner: null });
      assert.equal(jugar(viva), true, 'ni siquiera sin terminar se acepta: ' + nombre);
    }
    assert.equal(h.foto(g), antes);
  });
});
