/* Partidas completas máquina contra máquina para comprobar las reglas.  Uso: node test/sim.js [partidas] */
const { Game, GEO, RES, MODES, total } = require('../js/engine.js');
const AI = require('../js/ai.js');

const N = Number(process.argv[2]) || 200;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

function check(g) {
  const s = g.s;
  for (const r of RES) {
    const sum = s.bank[r] + s.players.reduce((n, p) => n + p.res[r], 0);
    assert(sum === 19, 'recurso ' + r + ' no cuadra: ' + sum);
    assert(s.bank[r] >= 0, 'banca negativa');
  }
  s.players.forEach((pl, i) => {
    RES.forEach((r) => assert(pl.res[r] >= 0, 'mano negativa'));
    const h = s.builds.filter((b) => b && b.p === i && b.t === 1).length;
    const c = s.builds.filter((b) => b && b.p === i && b.t === 2).length;
    const rd = s.roads.filter((x) => x === i).length;
    assert(h === 5 - pl.huertas && c === 4 - pl.bodegas && rd === 15 - pl.roads, 'piezas descuadradas');
  });
  s.builds.forEach((b, v) => {
    if (b) assert(GEO.verts[v].adj.every((w) => !s.builds[w]), 'regla de distancia rota');
  });
  if (MODES[s.mode].dev) {
    const cards = s.deck.length + s.players.reduce((n, p) => n + p.dev.length, 0);
    assert(cards <= 25, 'sobran cartas de cocina');
  }
}

for (const mode of Object.keys(MODES)) {
  for (const n of [2, 3, 4]) {
    let turns = 0, trades = 0, maxTurns = 0, wins = Array(n).fill(0);
    for (let k = 0; k < N; k++) {
      const g = Game.create({ mode, players: Array.from({ length: n }, (_, i) => ({ name: 'IA' + i, ai: true })) });
      let steps = 0;
      while (g.s.phase !== 'over') {
        const r = AI.step(g);
        assert(r, 'la máquina se queda parada en fase ' + g.s.phase);
        if (r.offer) {
          for (let d = 1; d < n; d++) {
            const q = (r.offer.from + d) % n;
            if (AI.accepts(g, q, r.offer)) {
              assert(g.playerTrade(r.offer.from, q, r.offer.give, r.offer.get), 'cambio aceptado pero inválido');
              trades++;
              break;
            }
          }
        }
        check(g);
        assert(++steps < 40000, 'partida interminable (' + g.s.turn + ' turnos)');
      }
      assert(g.points(g.s.winner, true) >= MODES[mode].target, 'ganador sin puntos');
      turns += g.s.turn;
      maxTurns = Math.max(maxTurns, g.s.turn);
      wins[g.s.winner]++;
    }
    console.log(mode.padEnd(9), n + ' jugadores', '· rondas medias', (turns / N / n).toFixed(1),
      '· máx', Math.round(maxTurns / n), '· cambios/partida', (trades / N).toFixed(1), '· victorias', wins.join('/'));
  }
}
console.log('OK');
