/* PeerJS de mentira para los tests de red: deja provocar a mano los eventos (open, error, connection, data, close)
   sin conectarse a ningún servidor. Se instala en globalThis.Peer, que es donde lo busca js/net.js */

class Emisor {
  constructor() { this.oyentes = {}; }
  on(evento, fn) { (this.oyentes[evento] = this.oyentes[evento] || []).push(fn); return this; }
  emit(evento, ...args) { (this.oyentes[evento] || []).slice().forEach((fn) => fn(...args)); }
}

class FakeConn extends Emisor {
  constructor(peer, destino, opts) {
    super();
    this.peer = peer;
    this.destino = destino;
    this.opts = opts;
    this.open = false;
    this.enviados = [];
    this.cerrada = false;
  }
  /* La otra parte acepta la conexión */
  abrir() { this.open = true; this.emit('open'); }
  /* Llega un mensaje de la otra parte */
  recibir(m) { this.emit('data', m); }
  send(m) {
    if (!this.open) throw new Error('conexión cerrada');
    this.enviados.push(m);
  }
  close() {
    if (this.cerrada) return;
    this.cerrada = true;
    this.open = false;
    this.emit('close');
  }
}

class FakePeer extends Emisor {
  constructor(id, opts) {
    super();
    if (id && typeof id === 'object') { opts = id; id = null; }
    this.id = id;
    this.opts = opts;
    this.destroyed = false;
    this.disconnected = false;
    this.conexiones = [];
    this.reconexiones = 0;
    FakePeer.todos.push(this);
  }
  connect(destino, opts) {
    const c = new FakeConn(this, destino, opts);
    this.conexiones.push(c);
    return c;
  }
  destroy() { this.destroyed = true; }
  reconnect() { this.reconexiones++; this.disconnected = false; }
}
FakePeer.todos = [];

/* Pone FakePeer en globalThis.Peer y devuelve una función que deja todo como estaba */
function instalar() {
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'Peer');
  FakePeer.todos = [];
  globalThis.Peer = FakePeer;
  return () => {
    if (antes) Object.defineProperty(globalThis, 'Peer', antes);
    else delete globalThis.Peer;
  };
}

module.exports = { FakePeer, FakeConn, instalar };
