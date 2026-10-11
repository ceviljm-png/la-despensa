/* La Despensa — comprobaciones sin DOM que usa la interfaz (también se ejecutan en Node para las pruebas).
   Lo que llega de otro dispositivo: el anfitrión comprueba las órdenes de los invitados y el invitado, el estado que le
   manda el anfitrión. Las reglas del inicio (quién juega y si hay una partida guardada que se perdería), de la sala de
   espera (nombres y relevo del anfitrión), el aviso de las ofertas rechazadas y los avisos de robo pendientes */
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

  /* ---------- sala de espera ---------- */
  const mismoNombre = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  /* El jugador de la sala (persona o máquina) que ya lleva ese nombre, sin contar el propio dispositivo; o null */
  function nameTaken(jugadores, nombre, dispositivo) {
    if (!Array.isArray(jugadores)) return null;
    return jugadores.find((p) => p && mismoNombre(p.name, nombre) && (p.ai || p.dev !== dispositivo)) || null;
  }

  /* Relevo del anfitrión que desaparece de la sala de espera. jugadores = la última lista recibida (el 0 es el
     anfitrión). Si a este dispositivo le toca intentarlo, { delay, players }: espera k × 15 s, siendo k su puesto entre
     las personas por orden de llegada, y la lista nueva lo pone primero, sin el anfitrión ni las personas anteriores */
  function takeover(jugadores, miDispositivo) {
    if (!Array.isArray(jugadores) || !jugadores.length) return null;
    const personas = jugadores.slice(1).filter((p) => p && !p.ai);
    const k = personas.findIndex((p) => p.dev === miDispositivo);
    if (k < 0) return null;
    const fuera = personas.slice(0, k);
    const resto = jugadores.slice(1).filter((p) => p && p !== personas[k] && !fuera.includes(p));
    const copia = (p) => ({ name: p.name, dev: p.ai ? null : p.dev, ai: !!p.ai });
    return { delay: k * 15000, players: [personas[k], ...resto].map(copia) };
  }

  /* ---------- comercio ---------- */
  /* Aviso de una oferta que nadie acepta (spec 002, RF-11). motivos = el texto de la oferta y los motivos de cada rival;
     si es idéntico al rechazo anterior, el principio lleva la cuenta de intentos para que el aviso nunca se quede igual */
  function refusal(motivos, anterior) {
    const n = anterior && anterior.motivos === motivos ? anterior.n + 1 : 1;
    return { motivos, n, titulo: n === 1 ? 'Nadie acepta.' : `Nadie acepta otra vez (${n}.º intento).` };
  }

  /* ---------- robos ---------- */
  /* Avisos de robo con varias personas en un dispositivo (spec 000, RF-12). avisos = { víctima: [robos sin ver] };
     robo = el robo nuevo o null; viendo = quien tiene el dispositivo (-1 mientras se pasa); personas = las de este
     dispositivo. Guarda el robo si la víctima es una de ellas y no lo está viendo, y devuelve los de quien lo tiene */
  function stealNotice(avisos, robo, viendo, personas) {
    const out = {};
    for (const k of Object.keys(avisos || {})) out[k] = avisos[k].slice();
    if (robo && robo.from !== viendo && personas.includes(robo.from)) (out[robo.from] = out[robo.from] || []).push(robo);
    const mostrar = viendo >= 0 && out[viendo] ? out[viendo] : [];
    delete out[viendo];
    return { avisos: out, mostrar };
  }

  const api = { int, resMap, order, state, hasPerson, savedGame, nameTaken, takeover, refusal, stealNotice };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DespensaCheck = api;
})(typeof self !== 'undefined' ? self : this);
