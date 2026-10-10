/* Utilidades para los tests de caracterización (sin DOM). Solo preparan estados y controlan el azar:
   no cambian el motor. */
const assert = require('node:assert/strict');
const { Game, GEO, RES, MODES } = require('../js/engine.js');

/* Sustituye Math.random mientras se ejecuta fn y lo restaura siempre.
   fuente: número fijo, lista de números (se recorre en bucle) o función */
function withRandom(fuente, fn) {
  const original = Math.random;
  let i = 0;
  Math.random = typeof fuente === 'function' ? fuente
    : Array.isArray(fuente) ? () => fuente[i++ % fuente.length]
    : () => fuente;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function newGame({ mode = 'clasica', level = 'normal', n = 2, ai = false } = {}) {
  return Game.create({ mode, level, players: Array.from({ length: n }, (_, i) => ({ name: 'J' + i, ai })) });
}

const vertsOfHex = (i) => GEO.hexes[i].verts.slice();
const hexesOfVert = (v) => GEO.verts[v].hexes.slice();
const edgesOfVert = (v) => GEO.verts[v].edges.slice();

/* Primer cruce que cumple pred; si no hay ninguno, falla diciendo qué se buscaba */
function findVert(pred, desc) {
  for (let v = 0; v < GEO.verts.length; v++) if (pred(v)) return v;
  throw new Error('Ningún cruce cumple: ' + (desc || pred.toString()));
}

/* Fija la mano de p y ajusta la banca para que cada recurso siga sumando 19 */
function setRes(g, p, mapa) {
  const s = g.s, mano = s.players[p].res;
  for (const r of RES) {
    const diff = (mapa[r] || 0) - mano[r];
    if (s.bank[r] < diff) throw new Error('La banca no tiene ' + diff + ' de ' + r);
    mano[r] += diff;
    s.bank[r] -= diff;
  }
}

/* Coloca a mano una huerta (t = 1) o una bodega (t = 2) de p y descuenta su pieza */
function put(g, v, p, t = 1) {
  g.s.builds[v] = { p, t };
  if (t === 1) g.s.players[p].huertas--;
  else g.s.players[p].bodegas--;
}

/* Coloca a mano un camino de p y descuenta su pieza */
function road(g, e, p) {
  g.s.roads[e] = p;
  g.s.players[p].roads--;
}

/* Recorre la colocación inicial con las acciones reales del motor: jugadas = [{ v, e }, …] */
function playSetup(g, jugadas) {
  jugadas.forEach(({ v, e }, k) => {
    assert.ok(g.placeSetupHuerta(v), `colocación ${k}: huerta rechazada en el cruce ${v}`);
    assert.ok(g.placeSetupRoad(e), `colocación ${k}: camino rechazado en el lado ${e}`);
  });
}

/* Salta la colocación inicial: deja el tablero vacío y pone la partida en la fase y el turno pedidos.
   Las piezas se colocan después con put/road */
function enJuego(g, { current = 0, phase = 'roll', turn = 1 } = {}) {
  const s = g.s;
  s.setup.idx = s.setup.order.length;
  s.phase = phase;
  s.turn = turn;
  s.current = current;
  return g;
}

/* Valores de Math.random para que los dados salgan a y b (el motor hace 1 + floor(Math.random() * 6)) */
const dados = (a, b) => [(a - 1) / 6 + 0.01, (b - 1) / 6 + 0.01];

/* Una parcela productiva con el número n, salvo las de `excepto` */
function hexWithNum(g, n, excepto = []) {
  const i = g.s.hexes.findIndex((x, k) => x.res && x.num === n && !excepto.includes(k));
  if (i < 0) throw new Error('No hay ninguna parcela con el ' + n);
  return i;
}

/* El estado completo como texto, para comprobar que un rechazo no cambia nada */
const foto = (g) => JSON.stringify(g.s);

/* El lado que une los cruces a y b */
function edgeBetween(a, b) {
  const e = GEO.verts[a].edges.find((i) => GEO.edges[i].a === b || GEO.edges[i].b === b);
  if (e === undefined) throw new Error('Los cruces ' + a + ' y ' + b + ' no son vecinos');
  return e;
}

/* k + 1 cruces que forman un camino simple de k lados desde v, sin pasar por los de `evita`
   (v sí puede estar en `evita`: así se saca una rama de una línea ya trazada).
   Búsqueda en profundidad determinista: siempre prueba primero el primer vecino libre */
function pathFrom(v, k, evita = []) {
  const bloqueados = new Set(evita), camino = [v];
  const buscar = (u) => {
    if (camino.length === k + 1) return true;
    for (const w of GEO.verts[u].adj) {
      if (camino.includes(w) || bloqueados.has(w)) continue;
      camino.push(w);
      if (buscar(w)) return true;
      camino.pop();
    }
    return false;
  };
  if (!buscar(v)) throw new Error('No hay un camino de ' + k + ' lados desde ' + v);
  return camino;
}

/* Coloca k construcciones de p (t = 1 huerta, t = 2 bodega) respetando la regla de distancia.
   Devuelve los cruces usados */
function spread(g, p, k, t = 1) {
  const usados = [];
  for (let v = 0; v < GEO.verts.length && usados.length < k; v++) {
    if (!g.vertexFree(v)) continue;
    put(g, v, p, t);
    usados.push(v);
  }
  if (usados.length < k) throw new Error('No caben ' + k + ' construcciones');
  return usados;
}

/* Saca del mazo una carta de cocina del tipo pedido y la pone en la mano de p con ese turno de compra
   (por defecto el anterior, así que ya se puede jugar). El mazo y las manos siguen sumando lo mismo */
function darCarta(g, p, type, turn = g.s.turn - 1) {
  const i = g.s.deck.indexOf(type);
  if (i < 0) throw new Error('No quedan cartas de tipo ' + type + ' en el mazo');
  g.s.deck.splice(i, 1);
  g.s.players[p].dev.push({ type, turn });
}

/* Un puerto del tipo pedido ('3:1' o un recurso), salvo los lados de `excepto`, con sus dos cruces */
function portOf(g, type, excepto = []) {
  const port = g.s.ports.find((x) => x.type === type && !excepto.includes(x.edge));
  if (!port) throw new Error('No hay ningún puerto de tipo ' + type);
  const e = GEO.edges[port.edge];
  return { edge: port.edge, a: e.a, b: e.b };
}

/* Los mismos invariantes que comprueba test/sim.js */
function checkInvariants(g) {
  const s = g.s;
  for (const r of RES) {
    const sum = s.bank[r] + s.players.reduce((n, p) => n + p.res[r], 0);
    assert.equal(sum, 19, 'recurso ' + r + ' no cuadra');
    assert.ok(s.bank[r] >= 0, 'banca negativa');
  }
  s.players.forEach((pl, i) => {
    RES.forEach((r) => assert.ok(pl.res[r] >= 0, 'mano negativa'));
    const h = s.builds.filter((b) => b && b.p === i && b.t === 1).length;
    const c = s.builds.filter((b) => b && b.p === i && b.t === 2).length;
    const rd = s.roads.filter((x) => x === i).length;
    assert.ok(h === 5 - pl.huertas && c === 4 - pl.bodegas && rd === 15 - pl.roads, 'piezas descuadradas');
  });
  s.builds.forEach((b, v) => {
    if (b) assert.ok(GEO.verts[v].adj.every((w) => !s.builds[w]), 'regla de distancia rota');
  });
  if (MODES[s.mode].dev) {
    const cards = s.deck.length + s.players.reduce((n, p) => n + p.dev.length, 0);
    assert.ok(cards <= 25, 'sobran cartas de cocina');
  }
}

module.exports = {
  withRandom, newGame, vertsOfHex, hexesOfVert, edgesOfVert, findVert, setRes, put, road, playSetup, checkInvariants,
  enJuego, dados, hexWithNum, foto, edgeBetween, pathFrom, spread, darCarta, portOf,
};
