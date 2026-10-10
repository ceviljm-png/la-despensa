/* Spec 009 — Tablero y preparación de la partida: tests de caracterización */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { GEO, RES, resText } = require('../js/engine.js');
const h = require('./helpers.js');

describe('utilidades de test', () => {
  test('withRandom sustituye Math.random y lo restaura', () => {
    const original = Math.random;
    assert.equal(h.withRandom(0.25, () => Math.random()), 0.25);
    assert.deepEqual(h.withRandom([0.1, 0.2], () => [Math.random(), Math.random(), Math.random()]), [0.1, 0.2, 0.1]);
    assert.equal(Math.random, original);
  });

  test('withRandom restaura Math.random aunque la función lance un error', () => {
    const original = Math.random;
    assert.throws(() => h.withRandom(0, () => { throw new Error('a propósito'); }), /a propósito/);
    assert.equal(Math.random, original);
  });
});

describe('RNF-1 · la geometría de la isla es fija', () => {
  test('19 parcelas, 54 cruces y 72 lados', () => {
    assert.equal(GEO.hexes.length, 19);
    assert.equal(GEO.verts.length, 54);
    assert.equal(GEO.edges.length, 72);
  });

  test('9 lados de puerto distintos y todos de costa', () => {
    assert.equal(GEO.portEdges.length, 9);
    assert.equal(new Set(GEO.portEdges).size, 9);
    for (const e of GEO.portEdges) assert.equal(GEO.edges[e].hexes.length, 1, 'el lado ' + e + ' no es de costa');
  });
});

describe('RF-1 · reparto de parcelas y números', () => {
  const partidas = Array.from({ length: 300 }, () => h.newGame());
  const cuenta = (lista) => lista.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});

  test('4 aceite, 4 pescado, 4 trigo, 3 sal, 3 vino y 1 Erial, con los 18 números', () => {
    const numeros = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
    for (const g of partidas) {
      assert.deepEqual(cuenta(g.s.hexes.map((x) => x.res)), { aceite: 4, pescado: 4, trigo: 4, sal: 3, vino: 3, null: 1 });
      const productivas = g.s.hexes.filter((x) => x.res);
      assert.deepEqual(productivas.map((x) => x.num).sort((a, b) => a - b), numeros);
    }
  });

  test('el Erial tiene el número 0', () => {
    for (const g of partidas) assert.equal(g.s.hexes.find((x) => !x.res).num, 0);
  });

  test('ningún 6 u 8 queda junto a otro 6 u 8', () => {
    const rojo = (n) => n === 6 || n === 8;
    for (const g of partidas) {
      g.s.hexes.forEach((x, i) => {
        if (!rojo(x.num)) return;
        for (const j of GEO.hexes[i].adj) assert.ok(!rojo(g.s.hexes[j].num), `parcelas ${i} y ${j}: ${x.num} junto a ${g.s.hexes[j].num}`);
      });
    }
  });

  test('el reparto cambia entre partidas', () => {
    const distintos = new Set(partidas.slice(0, 20).map((g) => JSON.stringify(g.s.hexes)));
    assert.ok(distintos.size >= 2, 'solo ' + distintos.size + ' repartos distintos en 20 partidas');
  });
});

describe('RF-2 · puertos', () => {
  const cuenta = (lista) => lista.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});

  for (const mode of ['clasica', 'completa']) {
    test(`${mode}: 9 puertos en los lados fijos, 4 de 3:1 y uno de 2:1 por recurso`, () => {
      for (let k = 0; k < 50; k++) {
        const g = h.newGame({ mode });
        assert.deepEqual(g.s.ports.map((p) => p.edge), GEO.portEdges);
        assert.deepEqual(cuenta(g.s.ports.map((p) => p.type)), { '3:1': 4, aceite: 1, sal: 1, pescado: 1, trigo: 1, vino: 1 });
      }
    });
  }

  test('sencilla: sin puertos, y la banca cambia 4:1 aunque haya huertas en la costa', () => {
    const g = h.newGame({ mode: 'sencilla' });
    assert.deepEqual(g.s.ports, []);
    for (const e of GEO.portEdges) h.put(g, GEO.edges[e].a, 0);
    for (const r of RES) assert.equal(g.tradeRatio(0, r), 4);
  });

  test('en clásica, esas mismas huertas sí mejoran la proporción', () => {
    const g = h.newGame({ mode: 'clasica' });
    for (const e of GEO.portEdges) h.put(g, GEO.edges[e].a, 0);
    for (const r of RES) assert.equal(g.tradeRatio(0, r), 2);
  });
});

describe('RF-3 · estado al crear la partida', () => {
  test('Cítrico en el Erial, banca de 19, manos vacías y piezas 15 / 5 / 4', () => {
    for (const mode of ['sencilla', 'clasica', 'completa']) {
      const g = h.newGame({ mode, n: 4 });
      const s = g.s;
      assert.equal(s.critic, s.hexes.findIndex((x) => !x.res));
      for (const r of RES) assert.equal(s.bank[r], 19);
      for (const pl of s.players) {
        assert.deepEqual(pl.res, { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 });
        assert.deepEqual([pl.roads, pl.huertas, pl.bodegas, pl.chefs, pl.dev.length], [15, 5, 4, 0, 0]);
      }
      assert.equal(s.phase, 'setup');
      assert.deepEqual([s.setup.step, s.setup.idx, s.turn], ['huerta', 0, 0]);
      assert.ok(s.builds.every((b) => b === null) && s.roads.every((x) => x === null));
      h.checkInvariants(g);
    }
  });

  test('un nivel que no existe se guarda como normal, y el estado lleva la versión 1', () => {
    const g = h.newGame({ level: 'imposible' });
    assert.equal(g.s.level, 'normal');
    assert.equal(g.s.version, 1);
    assert.equal(h.newGame({ level: 'dificil' }).s.level, 'dificil');
  });
});

describe('RF-4 · orden de la colocación inicial', () => {
  /* Orden en serpiente esperado si empieza el asiento `first` */
  const serpiente = (first, n) => {
    const ida = Array.from({ length: n }, (_, i) => (first + i) % n);
    return ida.concat(ida.slice().reverse());
  };

  for (const n of [2, 3, 4]) {
    test(`con ${n} jugadores: en serpiente desde quien empieza, y empieza order[0]`, () => {
      for (let k = 0; k < 50; k++) {
        const g = h.newGame({ n });
        const first = g.s.setup.order[0];
        assert.deepEqual(g.s.setup.order, serpiente(first, n));
        assert.equal(g.s.current, first);
      }
    });
  }

  test('ejemplos de la spec: A, B, B, A con 2 y A, B, C, D, D, C, B, A con 4', () => {
    assert.deepEqual(serpiente(0, 2), [0, 1, 1, 0]);
    assert.deepEqual(serpiente(0, 4), [0, 1, 2, 3, 3, 2, 1, 0]);
  });

  test('quién empieza es al azar: en 200 partidas de 4 empieza cada asiento alguna vez', () => {
    const primeros = new Set(Array.from({ length: 200 }, () => h.newGame({ n: 4 }).s.setup.order[0]));
    assert.deepEqual([...primeros].sort(), [0, 1, 2, 3]);
  });
});

describe('RF-5 y RF-8 · reglas de la colocación inicial', () => {
  const foto = (g) => JSON.stringify(g.s);
  /* Coloca la siguiente huerta y su camino en el primer sitio válido */
  const colocarSiguiente = (g) => {
    const p = g.s.current;
    assert.ok(g.placeSetupHuerta(g.settlementSpots(p, true)[0]));
    assert.ok(g.placeSetupRoad(g.roadSpots(p)[0]));
  };

  test('la primera huerta no necesita camino; después toca poner un camino', () => {
    const g = h.newGame();
    const p = g.s.current, v = 0;
    assert.ok(g.placeSetupHuerta(v));
    assert.deepEqual(g.s.builds[v], { p, t: 1 });
    assert.equal(g.s.players[p].huertas, 4);
    assert.deepEqual([g.s.setup.step, g.s.setup.last, g.s.current], ['camino', v, p]);
    h.checkInvariants(g);
  });

  test('mientras toca huerta, un camino se rechaza sin cambiar nada', () => {
    const g = h.newGame();
    const antes = foto(g);
    assert.equal(g.placeSetupRoad(h.edgesOfVert(0)[0]), false);
    assert.equal(foto(g), antes);
  });

  test('mientras toca camino, otra huerta se rechaza sin cambiar nada', () => {
    const g = h.newGame();
    g.placeSetupHuerta(0);
    const lejos = h.findVert((w) => g.vertexFree(w), 'cruce libre');
    const antes = foto(g);
    assert.equal(g.placeSetupHuerta(lejos), false);
    assert.equal(foto(g), antes);
  });

  test('el camino tiene que salir de la huerta recién puesta', () => {
    const g = h.newGame();
    const p = g.s.current, v = 0;
    g.placeSetupHuerta(v);
    const lejano = GEO.edges.findIndex((e) => e.a !== v && e.b !== v);
    const antes = foto(g);
    assert.equal(g.placeSetupRoad(lejano), false);
    assert.equal(foto(g), antes);
    const suyo = h.edgesOfVert(v)[0];
    assert.ok(g.placeSetupRoad(suyo));
    assert.equal(g.s.roads[suyo], p);
    assert.equal(g.s.players[p].roads, 14);
    assert.deepEqual([g.s.setup.step, g.s.current], ['huerta', g.s.setup.order[1]]);
    h.checkInvariants(g);
  });

  test('regla de distancia: ni en un cruce ocupado ni en uno vecino', () => {
    const g = h.newGame();
    const v = 0;
    g.placeSetupHuerta(v);
    g.placeSetupRoad(h.edgesOfVert(v)[0]);
    const antes = foto(g);
    assert.equal(g.placeSetupHuerta(v), false);
    for (const w of GEO.verts[v].adj) assert.equal(g.placeSetupHuerta(w), false, 'aceptado el vecino ' + w);
    assert.equal(foto(g), antes);
  });

  test('la primera vuelta no cuesta nada: manos vacías y banca intacta', () => {
    for (const n of [2, 4]) {
      const g = h.newGame({ n });
      for (let k = 0; k < n; k++) colocarSiguiente(g);
      for (const pl of g.s.players) assert.equal(Object.values(pl.res).reduce((a, b) => a + b, 0), 0);
      for (const r of RES) assert.equal(g.s.bank[r], 19);
      h.checkInvariants(g);
    }
  });
});

describe('RF-6 · recursos de la segunda huerta', () => {
  /* Hace la primera vuelta lejos del cruce T y planta en T la segunda huerta del siguiente jugador.
     Devuelve quién la ha plantado y la mano y la banca de justo antes */
  const segundaHuertaEn = (g, T) => {
    const evita = new Set([T, ...GEO.verts[T].adj]);
    for (let k = 0; k < g.s.players.length; k++) {
      const p = g.s.current;
      assert.ok(g.placeSetupHuerta(g.settlementSpots(p, true).find((w) => !evita.has(w))));
      assert.ok(g.placeSetupRoad(g.roadSpots(p)[0]));
    }
    const p = g.s.current;
    const mano = { ...g.s.players[p].res }, banca = { ...g.s.bank };
    assert.ok(g.placeSetupHuerta(T), 'segunda huerta rechazada en ' + T);
    return { p, mano, banca };
  };
  /* Lo que debería recibir: 1 carta por cada parcela productiva que toca el cruce */
  const esperado = (g, v) => {
    const m = { aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 };
    for (const i of h.hexesOfVert(v)) if (g.s.hexes[i].res) m[g.s.hexes[i].res]++;
    return m;
  };
  /* Crea partidas hasta encontrar un cruce que cumpla pred */
  const partidaCon = (pred, desc) => {
    for (let k = 0; k < 500; k++) {
      const g = h.newGame();
      const v = GEO.verts.findIndex((_, w) => pred(g, w));
      if (v >= 0) return { g, v };
    }
    throw new Error('No se ha encontrado en 500 partidas: ' + desc);
  };
  const productivas = (g, v) => h.hexesOfVert(v).filter((i) => g.s.hexes[i].res).length;
  const tocaErial = (g, v) => h.hexesOfVert(v).some((i) => !g.s.hexes[i].res);

  test('un cruce de 3 parcelas productivas da 1 carta de cada una, que salen de la banca', () => {
    const { g, v } = partidaCon((g, w) => productivas(g, w) === 3, 'cruce de 3 parcelas productivas');
    const { p, mano, banca } = segundaHuertaEn(g, v);
    const m = esperado(g, v);
    for (const r of RES) {
      assert.equal(g.s.players[p].res[r], mano[r] + m[r], 'mano de ' + r);
      assert.equal(g.s.bank[r], banca[r] - m[r], 'banca de ' + r);
    }
    assert.equal(Object.values(m).reduce((a, b) => a + b, 0), 3);
    assert.equal(g.s.log.at(-1).text, 'J' + p + ' planta su segunda huerta y recibe ' + resText(m));
    h.checkInvariants(g);
  });

  test('un cruce junto al Erial no recibe nada del Erial', () => {
    const { g, v } = partidaCon((g, w) => h.hexesOfVert(w).length === 3 && tocaErial(g, w), 'cruce interior junto al Erial');
    const { p, mano } = segundaHuertaEn(g, v);
    const recibidas = RES.reduce((n, r) => n + g.s.players[p].res[r] - mano[r], 0);
    assert.equal(recibidas, 2);
  });

  test('un cruce de costa con una sola parcela productiva recibe 1 carta', () => {
    const { g, v } = partidaCon((g, w) => h.hexesOfVert(w).length === 1 && productivas(g, w) === 1, 'cruce de costa');
    const { p, mano } = segundaHuertaEn(g, v);
    const recibidas = RES.reduce((n, r) => n + g.s.players[p].res[r] - mano[r], 0);
    assert.equal(recibidas, 1);
  });

  test('un cruce que solo toca el Erial no recibe nada, y el historial lo dice', () => {
    const { g, v } = partidaCon((g, w) => h.hexesOfVert(w).length === 1 && tocaErial(g, w), 'cruce de costa del Erial');
    const { p, mano } = segundaHuertaEn(g, v);
    assert.deepEqual(g.s.players[p].res, mano);
    assert.equal(g.s.log.at(-1).text, 'J' + p + ' planta su segunda huerta y recibe nada');
  });
});

describe('RF-7 y RF-8 · fin de la colocación inicial', () => {
  /* Recorre toda la colocación inicial en los primeros sitios válidos, salvo el último camino */
  const casiTerminada = (n) => {
    const g = h.newGame({ n });
    for (let k = 0; k < 2 * n; k++) {
      const p = g.s.current;
      assert.ok(g.placeSetupHuerta(g.settlementSpots(p, true)[0]));
      if (k < 2 * n - 1) assert.ok(g.placeSetupRoad(g.roadSpots(p)[0]));
    }
    return g;
  };

  for (const n of [2, 3, 4]) {
    test(`con ${n} jugadores: tras el último camino empieza el primer turno`, () => {
      const g = casiTerminada(n);
      const first = g.s.setup.order[0];
      assert.equal(g.s.phase, 'setup', 'antes del último camino sigue la colocación');
      assert.ok(g.placeSetupRoad(g.roadSpots(g.s.current)[0]));
      assert.deepEqual([g.s.phase, g.s.turn, g.s.current], ['roll', 1, first]);
      assert.equal(g.s.log.at(-1).text, 'Empieza la partida. Turno de J' + first);
      g.s.players.forEach((pl, i) => {
        assert.equal(pl.road, g.roadLength(i), 'ruta de J' + i + ' sin calcular');
        assert.ok(pl.road >= 1);
      });
      assert.equal(g.s.longest.p, null);
      h.checkInvariants(g);
    });
  }

  test('terminada la colocación, ya no se aceptan huertas ni caminos gratis', () => {
    const g = casiTerminada(2);
    g.placeSetupRoad(g.roadSpots(g.s.current)[0]);
    const antes = JSON.stringify(g.s);
    const p = g.s.current;
    assert.equal(g.placeSetupHuerta(g.settlementSpots(p, true)[0]), false);
    assert.equal(g.placeSetupRoad(h.edgesOfVert(g.s.builds.findIndex((b) => b && b.p === p))[0]), false);
    assert.equal(JSON.stringify(g.s), antes);
  });
});
