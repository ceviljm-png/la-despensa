/* La Despensa — motor de reglas (sin DOM, también se ejecuta en Node para las pruebas) */
(function (root) {
  'use strict';

  const RES = ['aceite', 'sal', 'pescado', 'trigo', 'vino'];
  const RES_INFO = {
    aceite: { name: 'Aceite', terrain: 'Olivar' },
    sal: { name: 'Sal', terrain: 'Salinas' },
    pescado: { name: 'Pescado', terrain: 'Estero' },
    trigo: { name: 'Trigo', terrain: 'Trigal' },
    vino: { name: 'Vino', terrain: 'Viñedo' },
  };
  const COSTS = {
    camino: { aceite: 1, sal: 1 },
    huerta: { aceite: 1, sal: 1, pescado: 1, trigo: 1 },
    bodega: { trigo: 2, vino: 3 },
    carta: { pescado: 1, trigo: 1, vino: 1 },
  };
  const MODES = {
    sencilla: { name: 'Sencilla', target: 8, ports: false, dev: false, playerTrade: false },
    clasica: { name: 'Clásica', target: 10, ports: true, dev: true, playerTrade: false },
    completa: { name: 'Completa', target: 10, ports: true, dev: true, playerTrade: true },
  };
  const DEV_INFO = {
    chef: { name: 'Chef', text: 'Mueve al Cítrico Gastronómico a otra parcela y roba una carta a un rival que tenga allí una huerta o bodega. Quien más chefs haya jugado (mínimo 3) tiene la Gran Brigada: 2 puntos.' },
    estrella: { name: 'Estrella', text: 'Vale 1 punto. Se mantiene en secreto hasta el final de la partida.' },
    caminos: { name: 'Obras', text: 'Coloca 2 caminos gratis.' },
    cosecha: { name: 'Buena cosecha', text: 'Toma de la banca 2 recursos a tu elección.' },
    exclusiva: { name: 'Exclusiva', text: 'Elige un recurso: todos los rivales te entregan todas sus cartas de ese recurso.' },
  };
  const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  const TILES = ['aceite', 'aceite', 'aceite', 'aceite', 'pescado', 'pescado', 'pescado', 'pescado',
    'trigo', 'trigo', 'trigo', 'trigo', 'sal', 'sal', 'sal', 'vino', 'vino', 'vino', null];
  const NUMS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const PORT_TYPES = ['3:1', '3:1', '3:1', '3:1', 'aceite', 'sal', 'pescado', 'trigo', 'vino'];
  const DECK = [].concat(Array(14).fill('chef'), Array(5).fill('estrella'),
    Array(2).fill('caminos'), Array(2).fill('cosecha'), Array(2).fill('exclusiva'));

  const emptyRes = () => ({ aceite: 0, sal: 0, pescado: 0, trigo: 0, vino: 0 });
  const total = (r) => RES.reduce((n, k) => n + (r[k] || 0), 0);
  const rnd = (n) => Math.floor(Math.random() * n);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function resText(map) {
    return RES.filter((r) => map[r] > 0).map((r) => map[r] + ' ' + RES_INFO[r].name.toLowerCase()).join(', ');
  }

  /* ---------- Geometría fija del tablero: 19 parcelas, 54 cruces, 72 lados ---------- */
  function buildGeometry() {
    const S = 60;
    const hexes = [], verts = [], edges = [];
    const vkey = new Map(), ekey = new Map();
    for (let r = -2; r <= 2; r++) {
      for (let q = -2; q <= 2; q++) {
        if (Math.abs(q + r) > 2) continue;
        const x = S * Math.sqrt(3) * (q + r / 2), y = S * 1.5 * r;
        const hi = hexes.length;
        const hv = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i - 90);
          const vx = x + S * Math.cos(a), vy = y + S * Math.sin(a);
          const k = Math.round(vx) + ',' + Math.round(vy);
          if (!vkey.has(k)) {
            vkey.set(k, verts.length);
            verts.push({ x: vx, y: vy, hexes: [], edges: [], adj: [] });
          }
          const vi = vkey.get(k);
          verts[vi].hexes.push(hi);
          hv.push(vi);
        }
        const he = [];
        for (let i = 0; i < 6; i++) {
          const a = hv[i], b = hv[(i + 1) % 6];
          const k = Math.min(a, b) + '-' + Math.max(a, b);
          if (!ekey.has(k)) {
            ekey.set(k, edges.length);
            edges.push({ a, b, hexes: [], mx: (verts[a].x + verts[b].x) / 2, my: (verts[a].y + verts[b].y) / 2 });
            verts[a].edges.push(edges.length - 1);
            verts[b].edges.push(edges.length - 1);
            verts[a].adj.push(b);
            verts[b].adj.push(a);
          }
          const ei = ekey.get(k);
          edges[ei].hexes.push(hi);
          he.push(ei);
        }
        hexes.push({ q, r, x, y, verts: hv, edges: he, adj: [] });
      }
    }
    edges.forEach((e) => {
      if (e.hexes.length === 2) {
        hexes[e.hexes[0]].adj.push(e.hexes[1]);
        hexes[e.hexes[1]].adj.push(e.hexes[0]);
      }
    });
    // Puertos: 9 lados de costa repartidos alrededor de la isla
    const coast = edges.map((e, i) => i).filter((i) => edges[i].hexes.length === 1)
      .sort((a, b) => Math.atan2(edges[a].my, edges[a].mx) - Math.atan2(edges[b].my, edges[b].mx));
    const portEdges = [0, 3, 7, 10, 13, 17, 20, 23, 27].map((i) => coast[i]);
    return { S, hexes, verts, edges, portEdges };
  }
  const GEO = buildGeometry();

  function numbersOk(hexes) {
    return hexes.every((h, i) => !(h.num === 6 || h.num === 8) ||
      GEO.hexes[i].adj.every((j) => hexes[j].num !== 6 && hexes[j].num !== 8));
  }

  /* ---------- Partida ---------- */
  class Game {
    constructor(state) {
      this.s = state;
      this.G = GEO;
    }

    static create(cfg) {
      const mode = MODES[cfg.mode];
      let hexes;
      do {
        const tiles = shuffle(TILES.slice()), nums = shuffle(NUMS.slice());
        let k = 0;
        hexes = tiles.map((res) => ({ res, num: res ? nums[k++] : 0 }));
      } while (!numbersOk(hexes));
      const types = shuffle(PORT_TYPES.slice());
      const n = cfg.players.length;
      const first = rnd(n);
      const order = [];
      for (let i = 0; i < n; i++) order.push((first + i) % n);
      for (let i = n - 1; i >= 0; i--) order.push((first + i) % n);
      const bank = emptyRes();
      RES.forEach((r) => { bank[r] = 19; });
      return new Game({
        version: 1,
        mode: cfg.mode,
        hexes,
        ports: mode.ports ? GEO.portEdges.map((edge, i) => ({ edge, type: types[i] })) : [],
        critic: hexes.findIndex((h) => !h.res),
        players: cfg.players.map((p, i) => ({
          name: p.name, ai: !!p.ai, color: p.color === undefined ? i : p.color,
          res: emptyRes(), dev: [], chefs: 0, roads: 15, huertas: 5, bodegas: 4, road: 0,
        })),
        builds: Array(GEO.verts.length).fill(null),
        roads: Array(GEO.edges.length).fill(null),
        bank,
        deck: mode.dev ? shuffle(DECK.slice()) : [],
        turn: 0,
        current: first,
        phase: 'setup',
        setup: { order, idx: 0, step: 'huerta', last: null },
        dice: null,
        devPlayed: false,
        offered: false,
        pending: {},
        freeRoads: 0,
        stealFrom: [],
        after: 'main',
        lastSteal: null,
        longest: { p: null, len: 0 },
        army: { p: null, size: 0 },
        winner: null,
        log: [],
      });
    }

    get mode() { return MODES[this.s.mode]; }

    log(text, p) {
      this.s.log.push({ text, p: p === undefined ? null : p });
      if (this.s.log.length > 150) this.s.log.shift();
    }

    /* ----- consultas ----- */
    vertexFree(v) {
      return !this.s.builds[v] && GEO.verts[v].adj.every((w) => !this.s.builds[w]);
    }

    settlementSpots(p, setup) {
      const out = [];
      for (let v = 0; v < GEO.verts.length; v++) {
        if (!this.vertexFree(v)) continue;
        if (setup || GEO.verts[v].edges.some((e) => this.s.roads[e] === p)) out.push(v);
      }
      return out;
    }

    citySpots(p) {
      const out = [];
      this.s.builds.forEach((b, v) => { if (b && b.p === p && b.t === 1) out.push(v); });
      return out;
    }

    roadSpots(p) {
      const s = this.s;
      if (s.phase === 'setup') {
        if (s.setup.step !== 'camino') return [];
        return GEO.verts[s.setup.last].edges.filter((e) => s.roads[e] === null);
      }
      const reach = (v) => {
        const b = s.builds[v];
        if (b) return b.p === p;
        return GEO.verts[v].edges.some((e) => s.roads[e] === p);
      };
      const out = [];
      GEO.edges.forEach((e, i) => {
        if (s.roads[i] === null && (reach(e.a) || reach(e.b))) out.push(i);
      });
      return out;
    }

    canAfford(p, cost) {
      const res = this.s.players[p].res;
      return RES.every((r) => res[r] >= (cost[r] || 0));
    }

    tradeRatio(p, res) {
      let ratio = 4;
      for (const port of this.s.ports) {
        const e = GEO.edges[port.edge];
        const mine = [e.a, e.b].some((v) => this.s.builds[v] && this.s.builds[v].p === p);
        if (!mine) continue;
        if (port.type === '3:1') ratio = Math.min(ratio, 3);
        else if (port.type === res) ratio = 2;
      }
      return ratio;
    }

    points(p, hidden) {
      const s = this.s, pl = s.players[p];
      let n = (5 - pl.huertas) + 2 * (4 - pl.bodegas);
      if (s.longest.p === p) n += 2;
      if (s.army.p === p) n += 2;
      if (hidden) n += pl.dev.filter((c) => c.type === 'estrella').length;
      return n;
    }

    playableDev(p, type) {
      const s = this.s;
      if (!this.mode.dev || s.devPlayed || s.current !== p || type === 'estrella') return false;
      if (type === 'chef' ? (s.phase !== 'roll' && s.phase !== 'main') : s.phase !== 'main') return false;
      return s.players[p].dev.some((c) => c.type === type && c.turn < s.turn);
    }

    roadLength(p) {
      const s = this.s;
      let best = 0;
      const used = new Set();
      const walk = (v, len) => {
        if (len > best) best = len;
        const b = s.builds[v];
        if (len > 0 && b && b.p !== p) return; // una huerta rival corta la ruta
        for (const e of GEO.verts[v].edges) {
          if (s.roads[e] !== p || used.has(e)) continue;
          used.add(e);
          walk(GEO.edges[e].a === v ? GEO.edges[e].b : GEO.edges[e].a, len + 1);
          used.delete(e);
        }
      };
      for (let v = 0; v < GEO.verts.length; v++) {
        if (GEO.verts[v].edges.some((e) => s.roads[e] === p)) walk(v, 0);
      }
      return best;
    }

    /* ----- utilidades internas ----- */
    pay(p, cost) {
      const s = this.s;
      RES.forEach((r) => {
        const n = cost[r] || 0;
        s.players[p].res[r] -= n;
        s.bank[r] += n;
      });
    }

    updateLongest() {
      const s = this.s;
      const lens = s.players.map((pl, i) => (pl.road = this.roadLength(i)));
      const max = Math.max.apply(null, lens);
      const cur = s.longest.p;
      if (cur !== null && lens[cur] >= 5 && lens[cur] === max) {
        s.longest.len = max;
        return;
      }
      const tops = lens.map((l, i) => i).filter((i) => lens[i] === max);
      if (max >= 5 && tops.length === 1) {
        s.longest = { p: tops[0], len: max };
        this.log(s.players[tops[0]].name + ' consigue la Gran Ruta (' + max + ' caminos): 2 puntos', tops[0]);
      } else if (cur !== null) {
        s.longest = { p: null, len: 0 };
        this.log(s.players[cur].name + ' pierde la Gran Ruta', cur);
      }
    }

    updateArmy() {
      const s = this.s, p = s.current, pl = s.players[p];
      if (pl.chefs >= 3 && pl.chefs > s.army.size) {
        if (s.army.p !== p) this.log(pl.name + ' consigue la Gran Brigada (' + pl.chefs + ' chefs): 2 puntos', p);
        s.army = { p, size: pl.chefs };
      }
    }

    checkWin() {
      const s = this.s;
      if (s.phase === 'setup' || s.phase === 'over') return;
      if (this.points(s.current, true) >= this.mode.target) {
        s.winner = s.current;
        s.phase = 'over';
        this.log('¡' + s.players[s.current].name + ' gana la partida!', s.current);
      }
    }

    /* ----- colocación inicial ----- */
    placeSetupHuerta(v) {
      const s = this.s;
      if (s.phase !== 'setup' || s.setup.step !== 'huerta' || !this.vertexFree(v)) return false;
      const p = s.current, pl = s.players[p];
      s.builds[v] = { p, t: 1 };
      pl.huertas--;
      s.setup.last = v;
      s.setup.step = 'camino';
      if (s.setup.idx >= s.players.length) {
        const got = emptyRes();
        for (const h of GEO.verts[v].hexes) {
          const res = s.hexes[h].res;
          if (res && s.bank[res] > 0) { pl.res[res]++; s.bank[res]--; got[res]++; }
        }
        this.log(pl.name + ' planta su segunda huerta y recibe ' + (resText(got) || 'nada'), p);
      } else {
        this.log(pl.name + ' planta su primera huerta', p);
      }
      return true;
    }

    placeSetupRoad(e) {
      const s = this.s;
      if (s.phase !== 'setup' || s.setup.step !== 'camino' || !this.roadSpots(s.current).includes(e)) return false;
      s.roads[e] = s.current;
      s.players[s.current].roads--;
      s.setup.idx++;
      if (s.setup.idx >= s.setup.order.length) {
        s.current = s.setup.order[0];
        s.phase = 'roll';
        s.turn = 1;
        this.updateLongest();
        this.log('Empieza la partida. Turno de ' + s.players[s.current].name, s.current);
      } else {
        s.current = s.setup.order[s.setup.idx];
        s.setup.step = 'huerta';
      }
      return true;
    }

    /* ----- turno ----- */
    roll() {
      const s = this.s;
      if (s.phase !== 'roll') return false;
      s.dice = [1 + rnd(6), 1 + rnd(6)];
      const sum = s.dice[0] + s.dice[1];
      const p = s.current;
      this.log(s.players[p].name + ' saca un ' + sum, p);
      if (sum === 7) {
        s.pending = {};
        s.players.forEach((pl, i) => {
          const t = total(pl.res);
          if (t > 7) s.pending[i] = Math.floor(t / 2);
        });
        s.after = 'main';
        s.phase = Object.keys(s.pending).length ? 'discard' : 'critic';
      } else {
        this.distribute(sum);
        s.phase = 'main';
      }
      return true;
    }

    distribute(sum) {
      const s = this.s;
      const gains = s.players.map(() => emptyRes());
      s.hexes.forEach((h, i) => {
        if (h.num !== sum || i === s.critic || !h.res) return;
        for (const v of GEO.hexes[i].verts) {
          const b = s.builds[v];
          if (b) gains[b.p][h.res] += b.t;
        }
      });
      for (const r of RES) {
        const who = gains.map((g, i) => i).filter((i) => gains[i][r] > 0);
        const need = who.reduce((n, i) => n + gains[i][r], 0);
        if (need <= s.bank[r]) continue;
        if (who.length === 1) gains[who[0]][r] = s.bank[r];
        else {
          who.forEach((i) => { gains[i][r] = 0; });
          this.log('No queda ' + RES_INFO[r].name.toLowerCase() + ' suficiente en la banca: nadie lo recibe');
        }
      }
      gains.forEach((g, i) => {
        if (!total(g)) return;
        RES.forEach((r) => { s.players[i].res[r] += g[r]; s.bank[r] -= g[r]; });
        this.log(s.players[i].name + ' recibe ' + resText(g), i);
      });
    }

    discard(p, map) {
      const s = this.s, pl = s.players[p];
      if (s.phase !== 'discard' || !s.pending[p] || total(map) !== s.pending[p]) return false;
      if (!RES.every((r) => (map[r] || 0) >= 0 && (map[r] || 0) <= pl.res[r])) return false;
      this.pay(p, map);
      this.log(pl.name + ' descarta ' + s.pending[p] + ' cartas', p);
      delete s.pending[p];
      if (!Object.keys(s.pending).length) s.phase = 'critic';
      return true;
    }

    moveCritic(h) {
      const s = this.s;
      if (s.phase !== 'critic' || h === s.critic || !GEO.hexes[h]) return false;
      const p = s.current;
      s.critic = h;
      const hx = s.hexes[h];
      this.log(s.players[p].name + ' envía al Cítrico Gastronómico a ' +
        (hx.res ? RES_INFO[hx.res].terrain + ' (' + hx.num + ')' : 'el Erial'), p);
      const victims = [];
      for (const v of GEO.hexes[h].verts) {
        const b = s.builds[v];
        if (b && b.p !== p && total(s.players[b.p].res) > 0 && !victims.includes(b.p)) victims.push(b.p);
      }
      if (victims.length > 1) {
        s.stealFrom = victims;
        s.phase = 'steal';
        return true;
      }
      if (victims.length === 1) this.doSteal(victims[0]);
      s.phase = s.after;
      return true;
    }

    steal(q) {
      const s = this.s;
      if (s.phase !== 'steal' || !s.stealFrom.includes(q)) return false;
      this.doSteal(q);
      s.stealFrom = [];
      s.phase = s.after;
      return true;
    }

    doSteal(q) {
      const s = this.s, p = s.current, from = s.players[q].res;
      let k = rnd(total(from));
      for (const r of RES) {
        if (k < from[r]) {
          from[r]--;
          s.players[p].res[r]++;
          s.lastSteal = { from: q, to: p, res: r, turn: s.turn };
          break;
        }
        k -= from[r];
      }
      this.log(s.players[p].name + ' roba una carta a ' + s.players[q].name, p);
    }

    buildRoad(e) {
      const s = this.s, p = s.current, pl = s.players[p];
      const free = s.phase === 'roadBuilding';
      if (!free && s.phase !== 'main') return false;
      if (pl.roads <= 0 || !this.roadSpots(p).includes(e)) return false;
      if (!free) {
        if (!this.canAfford(p, COSTS.camino)) return false;
        this.pay(p, COSTS.camino);
      }
      s.roads[e] = p;
      pl.roads--;
      this.log(pl.name + ' construye un camino', p);
      if (free) {
        s.freeRoads--;
        if (s.freeRoads <= 0 || pl.roads <= 0 || !this.roadSpots(p).length) { s.freeRoads = 0; s.phase = 'main'; }
      }
      this.updateLongest();
      this.checkWin();
      return true;
    }

    buildHuerta(v) {
      const s = this.s, p = s.current, pl = s.players[p];
      if (s.phase !== 'main' || pl.huertas <= 0 || !this.canAfford(p, COSTS.huerta)) return false;
      if (!this.settlementSpots(p, false).includes(v)) return false;
      this.pay(p, COSTS.huerta);
      s.builds[v] = { p, t: 1 };
      pl.huertas--;
      this.log(pl.name + ' planta una huerta', p);
      this.updateLongest();
      this.checkWin();
      return true;
    }

    buildBodega(v) {
      const s = this.s, p = s.current, pl = s.players[p];
      const b = s.builds[v];
      if (s.phase !== 'main' || pl.bodegas <= 0 || !this.canAfford(p, COSTS.bodega)) return false;
      if (!b || b.p !== p || b.t !== 1) return false;
      this.pay(p, COSTS.bodega);
      b.t = 2;
      pl.bodegas--;
      pl.huertas++;
      this.log(pl.name + ' amplía una huerta a bodega', p);
      this.checkWin();
      return true;
    }

    buyDev() {
      const s = this.s, p = s.current, pl = s.players[p];
      if (s.phase !== 'main' || !this.mode.dev || !s.deck.length || !this.canAfford(p, COSTS.carta)) return false;
      this.pay(p, COSTS.carta);
      pl.dev.push({ type: s.deck.pop(), turn: s.turn });
      this.log(pl.name + ' compra una carta de cocina', p);
      this.checkWin();
      return true;
    }

    playDev(type, arg) {
      const s = this.s, p = s.current, pl = s.players[p];
      if (!this.playableDev(p, type)) return false;
      const take = () => {
        pl.dev.splice(pl.dev.findIndex((c) => c.type === type && c.turn < s.turn), 1);
        s.devPlayed = true;
      };
      if (type === 'chef') {
        take();
        pl.chefs++;
        this.log(pl.name + ' juega un Chef', p);
        s.after = s.phase;
        s.phase = 'critic';
        this.updateArmy();
        this.checkWin();
        return true;
      }
      if (type === 'caminos') {
        if (pl.roads <= 0 || !this.roadSpots(p).length) return false;
        take();
        s.freeRoads = Math.min(2, pl.roads);
        s.after = 'main';
        s.phase = 'roadBuilding';
        this.log(pl.name + ' juega Obras: 2 caminos gratis', p);
        return true;
      }
      if (type === 'cosecha') {
        if (!Array.isArray(arg) || arg.length !== 2 || !arg.every((r) => RES.includes(r))) return false;
        const need = emptyRes();
        arg.forEach((r) => { need[r]++; });
        if (!RES.every((r) => s.bank[r] >= need[r])) return false;
        take();
        RES.forEach((r) => { pl.res[r] += need[r]; s.bank[r] -= need[r]; });
        this.log(pl.name + ' juega Buena cosecha y toma ' + resText(need), p);
        return true;
      }
      if (type === 'exclusiva') {
        if (!RES.includes(arg)) return false;
        take();
        let n = 0;
        s.players.forEach((o, i) => {
          if (i === p) return;
          n += o.res[arg];
          pl.res[arg] += o.res[arg];
          o.res[arg] = 0;
        });
        this.log(pl.name + ' juega Exclusiva y se lleva ' + n + ' de ' + RES_INFO[arg].name.toLowerCase(), p);
        return true;
      }
      return false;
    }

    bankTrade(give, get) {
      const s = this.s, p = s.current, pl = s.players[p];
      if (s.phase !== 'main' || give === get || !RES.includes(give) || !RES.includes(get)) return false;
      const ratio = this.tradeRatio(p, give);
      if (pl.res[give] < ratio || s.bank[get] < 1) return false;
      pl.res[give] -= ratio;
      s.bank[give] += ratio;
      pl.res[get]++;
      s.bank[get]--;
      this.log(pl.name + ' cambia ' + ratio + ' ' + RES_INFO[give].name.toLowerCase() + ' por 1 ' +
        RES_INFO[get].name.toLowerCase() + ' con la banca', p);
      return true;
    }

    /* a entrega `give` a b y recibe `get` */
    playerTrade(a, b, give, get) {
      const s = this.s;
      if (s.phase !== 'main' || !this.mode.playerTrade || a === b) return false;
      if (s.current !== a && s.current !== b) return false;
      if (!total(give) || !total(get)) return false;
      if (!this.canAfford(a, give) || !this.canAfford(b, get)) return false;
      const A = s.players[a].res, B = s.players[b].res;
      RES.forEach((r) => {
        const x = give[r] || 0, y = get[r] || 0;
        A[r] += y - x;
        B[r] += x - y;
      });
      this.log(s.players[a].name + ' da ' + resText(give) + ' a ' + s.players[b].name +
        ' a cambio de ' + resText(get), a);
      return true;
    }

    endTurn() {
      const s = this.s;
      if (s.phase !== 'main') return false;
      s.current = (s.current + 1) % s.players.length;
      s.turn++;
      s.phase = 'roll';
      s.dice = null;
      s.devPlayed = false;
      s.offered = false;
      this.checkWin();
      return true;
    }
  }

  const api = { Game, GEO, RES, RES_INFO, COSTS, MODES, DEV_INFO, PIPS, emptyRes, total, resText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Despensa = api;
})(typeof self !== 'undefined' ? self : this);
