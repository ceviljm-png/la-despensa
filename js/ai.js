/* La Despensa — rivales controlados por la máquina */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Despensa;
  const { GEO, RES, COSTS, MODES, PIPS, emptyRes, total } = E;

  /* Azar que se suma a cada valoración: en Fácil es tan grande que la máquina elige peor */
  let noise = 0.3;
  const pick = (list, score) => {
    let best = null, bs = -Infinity;
    for (const x of list) {
      const sc = score(x) + Math.random() * noise;
      if (sc > bs) { bs = sc; best = x; }
    }
    return best;
  };

  function myResources(g, p) {
    const have = new Set();
    g.s.builds.forEach((b, v) => {
      if (!b || b.p !== p) return;
      for (const h of GEO.verts[v].hexes) if (g.s.hexes[h].res) have.add(g.s.hexes[h].res);
    });
    return have;
  }

  function vertexScore(g, v, have) {
    const s = g.s;
    let sc = 0;
    const kinds = new Set();
    for (const h of GEO.verts[v].hexes) {
      const hx = s.hexes[h];
      if (!hx.res) continue;
      sc += PIPS[hx.num];
      kinds.add(hx.res);
    }
    sc += kinds.size * 0.6;
    if (have) kinds.forEach((k) => { if (!have.has(k)) sc += 1.2; });
    for (const port of s.ports) {
      const e = GEO.edges[port.edge];
      if (e.a === v || e.b === v) sc += 1;
    }
    return sc;
  }

  function roadScore(g, e, p) {
    const s = g.s, ed = GEO.edges[e];
    const linked = (v) => (s.builds[v] && s.builds[v].p === p) ||
      GEO.verts[v].edges.some((x) => x !== e && s.roads[x] === p);
    const la = linked(ed.a), lb = linked(ed.b);
    if (la && lb) return 0.2;
    const near = la ? ed.a : ed.b, far = la ? ed.b : ed.a;
    if (s.builds[far]) return 0;
    if (g.vertexFree(far)) return vertexScore(g, far) + 3;
    let best = 0.1;
    for (const x of GEO.verts[far].edges) {
      if (x === e || s.roads[x] !== null) continue;
      const w = GEO.edges[x].a === far ? GEO.edges[x].b : GEO.edges[x].a;
      if (w !== near && g.vertexFree(w)) best = Math.max(best, vertexScore(g, w) * 0.6);
    }
    return best;
  }

  function missing(res, cost) {
    const m = emptyRes();
    RES.forEach((r) => { m[r] = Math.max(0, (cost[r] || 0) - res[r]); });
    return m;
  }

  function goals(g, p) {
    const s = g.s, pl = s.players[p], mode = MODES[s.mode];
    const list = [];
    const city = g.citySpots(p);
    if (city.length && pl.bodegas > 0) {
      list.push({ cost: COSTS.bodega, run: () => g.buildBodega(pick(city, (v) => vertexScore(g, v))) });
    }
    const spots = g.settlementSpots(p, false);
    if (spots.length && pl.huertas > 0) {
      const have = myResources(g, p);
      list.push({ cost: COSTS.huerta, run: () => g.buildHuerta(pick(spots, (v) => vertexScore(g, v, have))) });
    }
    const roads = pl.roads > 0 ? g.roadSpots(p) : [];
    const road = { cost: COSTS.camino, run: () => g.buildRoad(pick(roads, (e) => roadScore(g, e, p))) };
    const useful = roads.some((e) => roadScore(g, e, p) > 1);
    if (roads.length && !spots.length && pl.huertas > 0 && useful) list.push(road);
    if (mode.dev && s.deck.length) list.push({ cost: COSTS.carta, run: () => g.buyDev() });
    if (roads.length && !list.includes(road) && total(pl.res) > 7) list.push(road);
    return list;
  }

  function tryPlayDev(g, p) {
    const s = g.s, pl = s.players[p];
    if (g.playableDev(p, 'chef')) return g.playDev('chef');
    if (g.playableDev(p, 'caminos') && g.playDev('caminos')) return true;
    if (g.playableDev(p, 'cosecha')) {
      const want = [];
      for (const goal of goals(g, p)) {
        const m = missing(pl.res, goal.cost);
        if (total(m) > 0 && total(m) <= 2) {
          RES.forEach((r) => { for (let i = 0; i < m[r]; i++) want.push(r); });
          break;
        }
      }
      const low = RES.slice().sort((a, b) => pl.res[a] - pl.res[b]);
      while (want.length < 2) want.push(low[want.length]);
      if (g.playDev('cosecha', want.slice(0, 2))) return true;
    }
    if (g.playableDev(p, 'exclusiva')) {
      const sum = (r) => s.players.reduce((n, o, i) => n + (i === p ? 0 : o.res[r]), 0);
      const best = pick(RES, sum);
      if (sum(best) >= 3) return g.playDev('exclusiva', best);
    }
    return false;
  }

  function mainAction(g, p) {
    const s = g.s, pl = s.players[p], mode = MODES[s.mode];
    if (mode.dev && !s.devPlayed && tryPlayDev(g, p)) return true;
    const list = goals(g, p);

    // Proponer un cambio 1 por 1 cuando falta poco para construir algo
    if (mode.playerTrade && !s.offered) {
      for (const goal of list) {
        const m = missing(pl.res, goal.cost);
        if (!total(m)) break;
        if (total(m) > 2) continue;
        const want = RES.find((r) => m[r] > 0);
        const give = pick(RES.filter((r) => r !== want && pl.res[r] - (goal.cost[r] || 0) > 0),
          (r) => pl.res[r] - (goal.cost[r] || 0));
        if (give) {
          s.offered = true;
          return { offer: { from: p, give: { [give]: 1 }, get: { [want]: 1 } } };
        }
        break;
      }
    }

    let saving = null;
    for (const goal of list) {
      if (saving && RES.some((r) => goal.cost[r] && saving.cost[r])) continue;
      const m = missing(pl.res, goal.cost);
      const need = total(m);
      if (!need) { if (goal.run()) return true; continue; }
      // ¿Llega cambiando sobrantes con la banca?
      const spare = RES.filter((r) => !m[r])
        .map((r) => ({ r, n: Math.floor((pl.res[r] - (goal.cost[r] || 0)) / g.tradeRatio(p, r)) }))
        .filter((x) => x.n > 0);
      if (spare.reduce((n, x) => n + x.n, 0) >= need) {
        const get = RES.find((r) => m[r] > 0 && s.bank[r] > 0);
        const give = pick(spare, (x) => pl.res[x.r]);
        if (get && g.bankTrade(give.r, get)) return true;
      }
      if (!saving && need <= 1 && total(pl.res) <= 7) saving = goal;
    }
    return g.endTurn();
  }

  function criticHex(g, p) {
    const s = g.s;
    const options = GEO.hexes.map((h, i) => i).filter((i) => i !== s.critic);
    return pick(options, (i) => {
      const hx = s.hexes[i];
      let sc = 0;
      for (const v of GEO.hexes[i].verts) {
        const b = s.builds[v];
        if (!b) continue;
        if (b.p === p) return -100;
        if (hx.res) sc += PIPS[hx.num] * b.t * (1 + g.points(b.p, false) / 10);
      }
      return sc;
    });
  }

  function discardFor(g, p) {
    const res = Object.assign({}, g.s.players[p].res), map = emptyRes();
    for (let n = g.s.pending[p]; n > 0; n--) {
      const r = pick(RES.filter((x) => res[x] > 0), (x) => res[x]);
      res[r]--;
      map[r]++;
    }
    return map;
  }

  const AI = {
    /* Ejecuta una acción de la máquina. Devuelve false si toca esperar a una persona,
       o { offer } cuando propone un cambio que debe resolver quien dirige la partida. */
    step(g) {
      const s = g.s;
      noise = s.level === 'facil' ? 4 : 0.3;
      if (s.phase === 'over') return false;
      if (s.phase === 'discard') {
        const i = Object.keys(s.pending).map(Number).find((k) => s.players[k].ai);
        return i === undefined ? false : g.discard(i, discardFor(g, i));
      }
      const p = s.current, pl = s.players[p];
      if (!pl.ai) return false;
      switch (s.phase) {
        case 'setup':
          if (s.setup.step === 'huerta') {
            const have = myResources(g, p);
            return g.placeSetupHuerta(pick(g.settlementSpots(p, true), (v) => vertexScore(g, v, have)));
          }
          return g.placeSetupRoad(pick(g.roadSpots(p), (e) => roadScore(g, e, p)));
        case 'roll': {
          const blocked = GEO.hexes[s.critic].verts.some((v) => s.builds[v] && s.builds[v].p === p);
          if (blocked && g.playableDev(p, 'chef') && g.playDev('chef')) return true;
          return g.roll();
        }
        case 'critic':
          return g.moveCritic(criticHex(g, p));
        case 'steal':
          return g.steal(pick(s.stealFrom, (q) => g.points(q, false) * 10 + total(s.players[q].res)));
        case 'roadBuilding':
          return g.buildRoad(pick(g.roadSpots(p), (e) => roadScore(g, e, p)));
        case 'main':
          return mainAction(g, p);
      }
      return false;
    },

    /* Valora una oferta para el jugador q (máquina), que entrega offer.get y recibe offer.give.
       Devuelve { ok, why, res }. Motivos de rechazo: 'sin' (no tiene lo que se pide), 'lider' (no ayuda
       a quien va a ganar), 'poco' (pide más a cambio), 'ultima' (no se queda sin el recurso res) y
       'sobra' (ya tiene de sobra el recurso res). El criterio depende del nivel de la partida. */
    judge(g, q, offer) {
      const s = g.s, res = s.players[q].res, level = s.level || 'normal';
      if (!g.canAfford(q, offer.get)) return { ok: false, why: 'sin' };
      if (level === 'facil') {
        return total(offer.give) >= total(offer.get) ? { ok: true } : { ok: false, why: 'poco' };
      }
      if (g.points(offer.from, false) >= MODES[s.mode].target - 2) return { ok: false, why: 'lider' };
      // Reglas fijas del nivel Difícil: mejorar la oferta no las ablanda
      const strict = () => {
        if (total(offer.give) < total(offer.get)) return { ok: false, why: 'poco' };
        for (const r of RES) {
          if (offer.get[r] && res[r] - offer.get[r] < 1) return { ok: false, why: 'ultima', res: r };
          if (offer.give[r] && res[r] >= 3) return { ok: false, why: 'sobra', res: r };
        }
        return { ok: true };
      };
      const fixed = strict();
      if (level === 'dificil' || fixed.ok) return fixed;
      // Normal: además acepta lo que le compense, así que nunca es más duro que Difícil
      let lose = 0, gain = 0;
      for (const r of RES) {
        // desprenderse de la última carta de un recurso cuesta más que de una que sobra
        for (let k = 0, c = res[r]; k < (offer.get[r] || 0); k++, c--) lose += c <= 1 ? 1.5 : c === 2 ? 1 : 0.6;
        // y una carta que no se tiene vale más que otra repetida
        for (let k = 0, c = res[r]; k < (offer.give[r] || 0); k++, c++) gain += c === 0 ? 1.2 : c === 1 ? 1 : c === 2 ? 0.7 : 0.4;
      }
      return gain >= lose ? { ok: true } : { ok: false, why: 'poco' };
    },

    accepts(g, q, offer) {
      return AI.judge(g, q, offer).ok;
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AI;
  else root.DespensaAI = AI;
})(typeof self !== 'undefined' ? self : this);
