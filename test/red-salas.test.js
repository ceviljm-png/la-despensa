/* Spec 005 — Salas en red: tests de caracterización de js/net.js (sin red de verdad) */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/net.js');
const { Net } = globalThis;

/* Sustituye localStorage mientras se ejecuta fn: `almacen` es un objeto { clave: valor } o 'bloqueado' */
function conAlmacen(almacen, fn) {
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const falso = almacen === 'bloqueado'
    ? { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } }
    : { getItem: (k) => (k in almacen ? almacen[k] : null), setItem: (k, v) => { almacen[k] = String(v); } };
  Object.defineProperty(globalThis, 'localStorage', { value: falso, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (antes) Object.defineProperty(globalThis, 'localStorage', antes);
    else delete globalThis.localStorage;
  }
}

describe('RF-2 · el código de sala se normaliza', () => {
  test('mayúsculas, solo letras y como mucho 4', () => {
    const casos = { abcd: 'ABCD', 'ab cd': 'ABCD', 'a1b2c3d4e': 'ABCD', ' x-y ': 'XY', abcdefg: 'ABCD', ABCD: 'ABCD' };
    for (const [entrada, salida] of Object.entries(casos)) assert.equal(Net.cleanCode(entrada), salida, entrada);
  });

  test('sin nada útil queda vacío', () => {
    for (const entrada of ['', null, undefined, '1234', 'ñ ç']) assert.equal(Net.cleanCode(entrada), '', String(entrada));
  });
});

describe('RF-1 · los códigos nuevos', () => {
  test('tienen 4 letras mayúsculas, nunca I ni O, y salen todas las demás', () => {
    const vistas = new Set();
    for (let k = 0; k < 2000; k++) {
      const c = Net.randomCode(4);
      assert.match(c, /^[A-Z]{4}$/);
      assert.doesNotMatch(c, /[IO]/, c);
      [...c].forEach((l) => vistas.add(l));
    }
    assert.equal(vistas.size, 24, 'las 24 letras permitidas');
  });
});

describe('RF-8 · el identificador del dispositivo', () => {
  test('la primera vez crea 12 letras y las guarda; después reutiliza las mismas', () => {
    const almacen = {};
    const id = conAlmacen(almacen, () => Net.deviceId('clave'));
    assert.match(id, /^[A-Z]{12}$/);
    assert.equal(almacen.clave, id);
    assert.equal(conAlmacen(almacen, () => Net.deviceId('clave')), id);
  });

  test('si lo guardado no tiene la forma correcta, lo sustituye', () => {
    for (const malo of ['abc', 'ABCDEFGHIJK', 'ABCDEFGHIJKL1', '']) {
      const almacen = { clave: malo };
      const id = conAlmacen(almacen, () => Net.deviceId('clave'));
      assert.match(id, /^[A-Z]{12}$/, malo);
      assert.notEqual(id, malo);
      assert.equal(almacen.clave, id);
    }
  });

  test('si no se puede guardar, da uno en memoria que se mantiene durante la sesión', () => {
    const a = conAlmacen('bloqueado', () => Net.deviceId('clave'));
    const b = conAlmacen('bloqueado', () => Net.deviceId('otra'));
    assert.match(a, /^[A-Z]{12}$/);
    assert.equal(b, a);
  });
});

const { FakePeer, FakeConn, instalar } = require('./fake-peer.js');
const PREFIJO = 'ladespensa-';

describe('utilidades de red: el PeerJS de mentira', () => {
  test('se instala en globalThis.Peer, apunta cada peer y sus conexiones, y se desinstala', () => {
    const quitar = instalar();
    try {
      assert.equal(Net.available(), true);
      const host = new globalThis.Peer('ladespensa-ABCD', { debug: 0 });
      const guest = new globalThis.Peer({ debug: 0 });
      assert.deepEqual([host.id, guest.id, guest.opts], ['ladespensa-ABCD', null, { debug: 0 }]);
      const c = guest.connect('ladespensa-ABCD', { reliable: true });
      let cierres = 0, recibido = null;
      c.on('close', () => cierres++).on('data', (m) => { recibido = m; });
      assert.throws(() => c.send('hola'), /cerrada/);
      c.abrir();
      c.send('hola');
      c.recibir({ t: 'ping' });
      c.close();
      c.close();
      assert.deepEqual([FakePeer.todos.length, guest.conexiones.length, c.enviados, recibido, cierres, c.open], [2, 1, ['hola'], { t: 'ping' }, 1, false]);
    } finally {
      quitar();
    }
    assert.equal(Net.available(), false);
  });
});

describe('RF-1 y RF-10 · crear y reabrir una sala', () => {
  /* Abre una sala con el PeerJS de mentira y relojes simulados; devuelve la sala, la promesa y los peers creados */
  const abrir = (t, codigo) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const quitar = instalar();
    t.after(quitar);
    const room = new Net.Room(PREFIJO, {});
    t.after(() => room.close());
    const promesa = room.open(codigo);
    promesa.catch(() => {});
    return { room, promesa, peers: FakePeer.todos };
  };
  const ocupado = (peer) => peer.emit('error', { type: 'unavailable-id' });

  test('crear: registra «ladespensa-» y un código nuevo; al abrirse, es anfitrión con ese código', async (t) => {
    const { room, promesa, peers } = abrir(t);
    assert.equal(peers.length, 1);
    assert.match(peers[0].id, /^ladespensa-[A-HJ-NP-Z]{4}$/);
    peers[0].emit('open');
    const codigo = await promesa;
    assert.equal(PREFIJO + codigo, peers[0].id);
    assert.deepEqual([room.role, room.code], ['host', codigo]);
  });

  test('crear: si el código está ocupado, prueba otro al momento, hasta 6 veces más; a la 7.ª lo deja', async (t) => {
    const { promesa, peers } = abrir(t);
    for (let k = 0; k < 6; k++) {
      ocupado(peers[k]);
      assert.equal(peers[k].destroyed, true);
      t.mock.timers.tick(0);
      assert.equal(peers.length, k + 2, 'nuevo intento ' + (k + 1));
      assert.match(peers[k + 1].id, /^ladespensa-[A-HJ-NP-Z]{4}$/);
    }
    ocupado(peers[6]);
    t.mock.timers.tick(3000);
    assert.equal(peers.length, 7, 'no hay un 8.º intento');
    await assert.rejects(promesa, (e) => e === 'unavailable-id');
  });

  test('crear: cualquier otro error del servidor de salas se devuelve enseguida, sin reintentar', async (t) => {
    const { promesa, peers } = abrir(t);
    peers[0].emit('error', { type: 'network' });
    t.mock.timers.tick(5000);
    assert.equal(peers.length, 1);
    await assert.rejects(promesa, (e) => e === 'network');
  });

  test('reabrir: si el código sigue ocupado, reintenta el mismo código cada 3 s, hasta 40 veces', async (t) => {
    const { promesa, peers } = abrir(t, 'ABCD');
    assert.equal(peers[0].id, 'ladespensa-ABCD');
    ocupado(peers[0]);
    t.mock.timers.tick(2999);
    assert.equal(peers.length, 1, 'no reintenta antes de 3 s');
    t.mock.timers.tick(1);
    assert.equal(peers.length, 2);
    for (let k = 1; k < 40; k++) {
      ocupado(peers[k]);
      t.mock.timers.tick(3000);
    }
    assert.equal(peers.length, 41, '1 intento + 40 reintentos');
    assert.ok(peers.every((p) => p.id === 'ladespensa-ABCD'), 'siempre el mismo código');
    ocupado(peers[40]);
    t.mock.timers.tick(3000);
    assert.equal(peers.length, 41);
    await assert.rejects(promesa, (e) => e === 'unavailable-id');
  });

  test('reabrir: en cuanto el código queda libre, la sala se abre con él', async (t) => {
    const { room, promesa, peers } = abrir(t, 'ABCD');
    ocupado(peers[0]);
    t.mock.timers.tick(3000);
    peers[1].emit('open');
    assert.equal(await promesa, 'ABCD');
    assert.equal(room.code, 'ABCD');
  });
});

/* Prepara relojes simulados y el PeerJS de mentira; devuelve una sala con manejadores que apuntan lo que pasa */
const preparar = (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const quitar = instalar();
  t.after(quitar);
  const ev = { join: [], leave: [], msg: [], status: [] };
  const room = new Net.Room(PREFIJO, {
    onJoin: (dev, hello) => ev.join.push([dev, hello]),
    onLeave: (dev) => ev.leave.push(dev),
    onMessage: (from, m) => ev.msg.push([from, m]),
    onStatus: (st) => ev.status.push(st),
  });
  t.after(() => room.close());
  return { room, ev, peers: FakePeer.todos };
};
const DEV = 'ABCDEFGHIJKL';

describe('RF-2 · unirse a una sala', () => {
  test('se conecta a «ladespensa-» + el código normalizado, saluda con su identificador y nombre y queda en línea', async (t) => {
    const { room, ev, peers } = preparar(t);
    const promesa = room.join('ab cd', { dev: DEV, name: 'Ana' });
    assert.deepEqual([room.role, room.code], ['guest', 'ABCD']);
    peers[0].emit('open');
    const conn = peers[0].conexiones[0];
    assert.deepEqual([conn.destino, conn.opts], ['ladespensa-ABCD', { reliable: true, serialization: 'json' }]);
    conn.abrir();
    assert.equal(await promesa, 'ABCD');
    assert.deepEqual(conn.enviados[0], { t: 'hello', dev: DEV, name: 'Ana' });
    assert.deepEqual(ev.status, ['online']);
  });

  test('si en 15 s la sala no responde, se rinde con «timeout»', async (t) => {
    const { room, peers } = preparar(t);
    let resultado = null;
    const promesa = room.join('ABCD', { dev: DEV, name: 'Ana' }).catch((e) => { resultado = e; throw e; });
    t.mock.timers.tick(14999);
    await Promise.resolve();
    assert.equal(resultado, null, 'a los 14,999 s todavía espera');
    t.mock.timers.tick(1);
    await assert.rejects(promesa, (e) => e === 'timeout');
    assert.equal(peers[0].destroyed, true);
  });

  test('si el servidor de salas da un error, se rinde con ese error', async (t) => {
    const { room, peers } = preparar(t);
    const promesa = room.join('ABCD', { dev: DEV, name: 'Ana' });
    peers[0].emit('error', { type: 'peer-unavailable' });
    await assert.rejects(promesa, (e) => e === 'peer-unavailable');
  });
});

describe('RF-8 y RF-9 · el anfitrión ante los que entran y salen', () => {
  /* Sala abierta como anfitrión; `entra()` simula una conexión nueva de un invitado */
  const anfitrion = async (t) => {
    const s = preparar(t);
    const promesa = s.room.open('ABCD');
    s.peers[0].emit('open');
    await promesa;
    s.entra = () => {
      const c = new FakeConn(s.peers[0], null);
      c.abrir();
      s.peers[0].emit('connection', c);
      return c;
    };
    return s;
  };

  test('un saludo válido avisa de que entra alguien; después, sus mensajes llegan con su identificador', async (t) => {
    const { room, ev, entra } = await anfitrion(t);
    const c = entra();
    c.recibir({ t: 'hello', dev: DEV, name: 'Ana' });
    assert.deepEqual(ev.join, [[DEV, { t: 'hello', dev: DEV, name: 'Ana' }]]);
    assert.equal(room.online(DEV), true);
    c.recibir({ t: 'pong' });
    c.recibir({ t: 'act', cmd: 'roll' });
    assert.deepEqual(ev.msg, [[DEV, { t: 'act', cmd: 'roll' }]], 'el latido no se reenvía');
  });

  test('sin un saludo válido primero, no se hace caso a nada', async (t) => {
    const { ev, entra } = await anfitrion(t);
    const c = entra();
    for (const m of ['hola', null, { t: 'act', cmd: 'roll' }, { t: 'hello', dev: 'abcdefghijkl' }, { t: 'hello', dev: 'ABC' }, { t: 'hello' }]) c.recibir(m);
    assert.deepEqual([ev.join, ev.msg], [[], []]);
    c.recibir({ t: 'hello', dev: DEV, name: 'Ana' });
    assert.equal(ev.join.length, 1, 'control: un saludo válido después sí se acepta');
  });

  test('si el mismo dispositivo entra por otra conexión, la anterior se cierra y la nueva la sustituye, sin avisar de salida', async (t) => {
    const { room, ev, entra } = await anfitrion(t);
    const vieja = entra();
    vieja.recibir({ t: 'hello', dev: DEV, name: 'Ana' });
    const nueva = entra();
    nueva.recibir({ t: 'hello', dev: DEV, name: 'Ana' });
    assert.equal(vieja.cerrada, true);
    assert.deepEqual([ev.join.length, ev.leave], [2, []]);
    assert.equal(room.online(DEV), true);
    room.send(DEV, { t: 'ping' });
    assert.deepEqual([vieja.enviados, nueva.enviados], [[], [{ t: 'ping' }]]);
  });

  test('cuando se cierra la conexión de un invitado, avisa de que se ha ido', async (t) => {
    const { room, ev, entra } = await anfitrion(t);
    const c = entra();
    c.recibir({ t: 'hello', dev: DEV, name: 'Ana' });
    c.close();
    assert.deepEqual(ev.leave, [DEV]);
    assert.equal(room.online(DEV), false);
  });
});
