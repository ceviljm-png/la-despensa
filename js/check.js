/* La Despensa — comprobaciones sin DOM que usa la interfaz (también se ejecutan en Node para las pruebas).
   Lo que llega de otro dispositivo: el anfitrión comprueba las órdenes de los invitados y el invitado, el estado que le
   manda el anfitrión. Y las reglas del inicio: quién juega y si hay una partida guardada que se perdería */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Despensa;
  const { RES, emptyRes } = E;

  /* Un número entero tal cual; cualquier otra cosa (texto, vacío, decimal…) es null */
  const int = (x) => (typeof x === 'number' && Number.isInteger(x) ? x : null);

  /* Cantidades de recursos: redondeadas hacia abajo y entre 0 y 99; lo que no es número cuenta como 0 */
  function resMap(m) {
    const out = emptyRes();
    if (m && typeof m === 'object') {
      RES.forEach((r) => {
        const v = Object.prototype.hasOwnProperty.call(m, r) ? Math.floor(Number(m[r]) || 0) : 0;
        out[r] = v > 0 ? Math.min(v, 99) : 0;
      });
    }
    return out;
  }

  /* Jugadas que un dispositivo puede pedir al anfitrión y cómo se normalizan sus argumentos.
     Sin prototipo: así 'toString', 'constructor' o '__proto__' no son jugadas */
  const ENTERO = (a) => { const v = int(a[0]); return v === null ? null : [v]; };
  const NADA = () => [];
  const JUGADAS = Object.assign(Object.create(null), {
    placeSetupHuerta: ENTERO, placeSetupRoad: ENTERO, buildHuerta: ENTERO, buildBodega: ENTERO, buildRoad: ENTERO,
    moveCritic: ENTERO, steal: ENTERO,
    roll: NADA, endTurn: NADA, buyDev: NADA,
    discard: (a) => { const p = int(a[0]); return p === null ? null : [p, resMap(a[1])]; },
    playDev: (a) => [String(a[0]), Array.isArray(a[1]) ? a[1].slice(0, 2).map(String) : typeof a[1] === 'string' ? a[1] : undefined],
    bankTrade: (a) => [String(a[0]), String(a[1])],
  });

  /* Una orden normalizada { cmd, args }, o null si no es una jugada del juego o le falta un número */
  function order(cmd, args) {
    if (typeof cmd !== 'string' || !JUGADAS[cmd]) return null;
    const normalizados = JUGADAS[cmd](Array.isArray(args) ? args : []);
    return normalizados ? { cmd, args: normalizados } : null;
  }

  /* ---------- forma del estado que manda el anfitrión ---------- */
  const { GEO, MODES, LEVELS, DEV_INFO, PIPS } = E;
  const FASES = ['setup', 'roll', 'main', 'discard', 'critic', 'steal', 'roadBuilding', 'over'];
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const objeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const entre = (x, a, b) => int(x) !== null && x >= a && x <= b;
  const lista = (x, n) => Array.isArray(x) && (n === undefined || x.length === n);

  function comprobar(s) {
    if (!objeto(s) || s.version !== 1 || !own(MODES, s.mode) || !FASES.includes(s.phase)) return false;
    if (s.level !== undefined && !own(LEVELS, s.level)) return false;
    if (s.after !== undefined && !FASES.includes(s.after)) return false;
    const P = s.players;
    if (!Array.isArray(P) || P.length < 2 || P.length > 4) return false;
    const jugador = (x) => entre(x, 0, P.length - 1);
    const jugadorONadie = (x) => x === null || jugador(x);
    const mano = (m) => objeto(m) && RES.every((r) => entre(m[r], 0, 19));
    const carta = (t) => typeof t === 'string' && own(DEV_INFO, t);
    const infinito = Number.MAX_SAFE_INTEGER;

    for (const pl of P) {
      if (!objeto(pl) || typeof pl.name !== 'string' || typeof pl.ai !== 'boolean' || !entre(pl.color, 0, 3)) return false;
      if (pl.device != null && typeof pl.device !== 'string') return false;
      if (pl.away !== undefined && typeof pl.away !== 'boolean') return false;
      if (!mano(pl.res) || !Array.isArray(pl.dev) || !pl.dev.every((c) => objeto(c) && carta(c.type) && entre(c.turn, 0, infinito))) return false;
      if (!entre(pl.chefs, 0, 14) || !entre(pl.roads, 0, 15) || !entre(pl.huertas, 0, 5) || !entre(pl.bodegas, 0, 4) || !entre(pl.road, 0, 15)) return false;
    }
    const parcela = (x) => objeto(x) && (x.res === null ? x.num === 0 : RES.includes(x.res) && int(x.num) !== null && own(PIPS, x.num));
    if (!lista(s.hexes, GEO.hexes.length) || !s.hexes.every(parcela)) return false;
    const puerto = (x) => objeto(x) && entre(x.edge, 0, GEO.edges.length - 1) && (x.type === '3:1' || RES.includes(x.type));
    if (!lista(s.ports) || s.ports.length > GEO.portEdges.length || !s.ports.every(puerto)) return false;
    if (!entre(s.critic, 0, GEO.hexes.length - 1) || !mano(s.bank)) return false;
    if (!lista(s.deck) || s.deck.length > 25 || !s.deck.every(carta)) return false;
    const construccion = (b) => b === null || (objeto(b) && jugador(b.p) && (b.t === 1 || b.t === 2));
    if (!lista(s.builds, GEO.verts.length) || !s.builds.every(construccion)) return false;
    if (!lista(s.roads, GEO.edges.length) || !s.roads.every(jugadorONadie)) return false;
    if (!jugador(s.current) || !entre(s.turn, 0, infinito) || !jugadorONadie(s.winner)) return false;
    if (s.dice !== null && !(lista(s.dice, 2) && s.dice.every((d) => entre(d, 1, 6)))) return false;
    if (!objeto(s.longest) || !jugadorONadie(s.longest.p) || !entre(s.longest.len, 0, 15)) return false;
    if (!objeto(s.army) || !jugadorONadie(s.army.p) || !entre(s.army.size, 0, 14)) return false;
    if (!entre(s.freeRoads, 0, 2) || !lista(s.stealFrom) || !s.stealFrom.every(jugador)) return false;
    if (!objeto(s.pending) || !Object.keys(s.pending).every((k) => /^\d$/.test(k) && jugador(Number(k)) && entre(s.pending[k], 0, infinito))) return false;
    const su = s.setup;
    if (!objeto(su) || !lista(su.order) || !su.order.every(jugador) || !entre(su.idx, 0, infinito)) return false;
    if (su.step !== 'huerta' && su.step !== 'camino') return false;
    if (su.last !== null && !entre(su.last, 0, GEO.verts.length - 1)) return false;
    if (!lista(s.log) || !s.log.every((l) => objeto(l) && typeof l.text === 'string' && jugadorONadie(l.p))) return false;
    const ls = s.lastSteal;
    if (ls !== null && !(objeto(ls) && jugador(ls.from) && jugador(ls.to) && RES.includes(ls.res) && entre(ls.turn, 0, infinito))) return false;
    if (s.net !== undefined && !(objeto(s.net) && typeof s.net.room === 'string')) return false;
    return true;
  }

  /* true si el estado tiene la forma permitida (todo lo que se pinta es de los valores del juego) */
  function state(s) {
    try {
      return comprobar(s);
    } catch (e) {
      return false;
    }
  }

  /* ---------- inicio ---------- */
  /* Tiene que jugar al menos una persona: plazas = las que juegan, cada una con { ai } */
  const hasPerson = (plazas) => Array.isArray(plazas) && plazas.some((p) => p && !p.ai);

  /* La partida guardada que se puede continuar (y que se perdería al empezar otra): null si no hay ninguna;
     si la hay, { room } con el código de la sala si era una partida en red */
  function savedGame(guardado) {
    const s = guardado && typeof guardado === 'object' ? guardado.s : null;
    if (!s || typeof s !== 'object' || s.version !== 1 || s.phase === 'over') return null;
    return { room: s.net && typeof s.net.room === 'string' ? s.net.room : null };
  }

  const api = { int, resMap, order, state, hasPerson, savedGame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DespensaCheck = api;
})(typeof self !== 'undefined' ? self : this);
