/* Spec 007 — Partida en un dispositivo: tests de caracterización del estado guardado y del service worker */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../js/engine.js');
const AI = require('../js/ai.js');
const h = require('./helpers.js');

/* Generador de números pseudoaleatorios con semilla, para repetir exactamente la misma partida */
const semilla = (n) => () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
/* Juega hasta `pasos` acciones de máquina (o hasta el final) con el azar dado */
const jugar = (g, pasos, azar) => h.withRandom(azar, () => {
  for (let k = 0; k < pasos && g.s.phase !== 'over'; k++) assert.ok(AI.step(g), 'la máquina se ha quedado parada');
});

describe('RF-7 · el estado se guarda y se recupera tal cual', () => {
  test('una partida a mitad, pasada a texto y recuperada, es igual y sigue jugando exactamente igual', () => {
    const g = h.withRandom(semilla(1), () => Game.create({
      mode: 'clasica', level: 'normal', players: [0, 1, 2].map((i) => ({ name: 'M' + i, ai: true })),
    }));
    jugar(g, 150, semilla(2));
    assert.equal(g.s.phase !== 'setup' && g.s.phase !== 'over', true, 'la partida está a mitad');

    const recuperada = new Game(JSON.parse(JSON.stringify(g.s)));
    assert.deepEqual(recuperada.s, g.s);

    const turno = g.s.turn;
    jugar(g, 200, semilla(3));
    jugar(recuperada, 200, semilla(3));
    assert.ok(g.s.turn > turno, 'la partida ha avanzado');
    assert.deepEqual(recuperada.s, g.s);
    h.checkInvariants(recuperada);
  });

  test('una partida nueva lleva la versión 1, la que pide el inicio para ofrecer «Continuar partida»', () => {
    for (const mode of ['sencilla', 'clasica', 'completa']) assert.equal(h.newGame({ mode }).s.version, 1, mode);
  });
});

/* ---------- RF-10: el service worker, ejecutado en Node con caché y red de mentira ---------- */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RAIZ = path.join(__dirname, '..');
const ORIGEN = 'http://localhost:8130';
const url = (ruta) => new URL(ruta, ORIGEN + '/').href;

/* Carga sw.js en un contexto aislado. `red(peticion)` hace de fetch; `guardado` = { cache: { ruta: texto } } */
function cargarSW({ red = async () => new Response('de la red'), guardado = {} } = {}) {
  const manejadores = {}, llamadas = { skipWaiting: 0, claim: 0 };
  const almacen = {};
  const clave = (req, sinBusqueda) => {
    const u = new URL(typeof req === 'string' ? req : req.url, ORIGEN + '/');
    return sinBusqueda ? u.origin + u.pathname : u.href;
  };
  const abrir = (nombre) => {
    const mapa = almacen[nombre] = almacen[nombre] || new Map();
    return {
      addAll: async (lista) => { lista.forEach((r) => mapa.set(clave(r), 'archivo ' + r)); },
      put: async (req, res) => { mapa.set(clave(req), await res.text()); },
      match: async (req, opts = {}) => {
        for (const [k, v] of mapa) if (clave(k, opts.ignoreSearch) === clave(req, opts.ignoreSearch)) return new Response(v);
        return undefined;
      },
    };
  };
  for (const [nombre, archivos] of Object.entries(guardado)) {
    const c = abrir(nombre);
    for (const [ruta, texto] of Object.entries(archivos)) almacen[nombre].set(clave(ruta), texto);
    void c;
  }
  const caches = {
    open: async (nombre) => abrir(nombre),
    match: async (req, opts) => {
      for (const nombre of Object.keys(almacen)) { const r = await abrir(nombre).match(req, opts); if (r) return r; }
      return undefined;
    },
    keys: async () => Object.keys(almacen),
    delete: async (nombre) => delete almacen[nombre],
  };
  const self = {
    addEventListener: (tipo, fn) => { manejadores[tipo] = fn; },
    skipWaiting: () => { llamadas.skipWaiting++; },
    clients: { claim: () => { llamadas.claim++; } },
  };
  const contexto = vm.createContext({ self, caches, fetch: red, location: { origin: ORIGEN }, URL, Response, Promise });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), contexto, { filename: 'sw.js' });
  const { CACHE, FILES: lista } = vm.runInContext('({ CACHE, FILES })', contexto);
  const FILES = Array.from(lista); /* copia en un Array de este contexto, para poder compararla */
  /* Lanza un evento y devuelve lo que el service worker ha pedido esperar o responder */
  const evento = (tipo, datos = {}) => {
    const ev = { ...datos, espera: null, respuesta: null };
    ev.waitUntil = (p) => { ev.espera = p; };
    ev.respondWith = (p) => { ev.respuesta = p; };
    manejadores[tipo](ev);
    return ev;
  };
  return { CACHE, FILES, almacen, llamadas, evento };
}
const pedir = (ruta, extra = {}) => ({ request: { method: 'GET', url: url(ruta), mode: 'no-cors', ...extra } });
const sinRed = async () => { throw new TypeError('Failed to fetch'); };
const asentar = () => new Promise((r) => setImmediate(r));

describe('RF-10 · el service worker', () => {
  test('todos los archivos de su lista existen y están todos los que carga la página', () => {
    const { FILES } = cargarSW();
    for (const f of FILES) assert.ok(fs.existsSync(path.join(RAIZ, f === './' ? 'index.html' : f)), 'no existe ' + f);
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    const usados = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]);
    for (const u of usados) assert.ok(FILES.includes(u), 'falta en la lista de sw.js: ' + u);
    assert.ok(usados.length >= 8, 'la página carga sus estilos, scripts e iconos');
  });

  test('al instalarse guarda todos los archivos en su caché y se activa sin esperar', async () => {
    const { CACHE, FILES, almacen, llamadas, evento } = cargarSW();
    await evento('install').espera;
    assert.deepEqual([...almacen[CACHE].keys()].sort(), FILES.map((f) => url(f)).sort());
    assert.equal(llamadas.skipWaiting, 1);
  });

  test('al activarse borra las cachés antiguas y toma el control', async () => {
    const { CACHE, almacen, llamadas, evento } = cargarSW({ guardado: { 'la-despensa-v2': { 'index.html': 'vieja' }, 'la-despensa-v3': { 'index.html': 'actual' } } });
    assert.equal(CACHE, 'la-despensa-v3');
    await evento('activate').espera;
    assert.deepEqual(Object.keys(almacen), [CACHE]);
    assert.equal(llamadas.claim, 1);
  });

  test('con red, pide primero a la red, devuelve su respuesta y guarda una copia (pero no de un error)', async () => {
    const { CACHE, almacen, evento } = cargarSW({ red: async (req) => new Response('nuevo ' + req.url) });
    const r = await evento('fetch', pedir('js/ui.js')).respuesta;
    assert.equal(await r.text(), 'nuevo ' + url('js/ui.js'));
    await asentar();
    assert.equal(almacen[CACHE].get(url('js/ui.js')), 'nuevo ' + url('js/ui.js'));
    const conError = cargarSW({ red: async () => new Response('no está', { status: 404 }) });
    const r404 = await conError.evento('fetch', pedir('js/nada.js')).respuesta;
    assert.equal(r404.status, 404);
    await asentar();
    assert.equal(conError.almacen[CACHE], undefined, 'un 404 no se guarda');
  });

  test('sin red, devuelve la copia guardada, aunque la dirección lleve «?…»', async () => {
    const { evento } = cargarSW({ red: sinRed, guardado: { 'la-despensa-v3': { 'js/ui.js': 'copia de ui' } } });
    const r = await evento('fetch', pedir('js/ui.js?v=3')).respuesta;
    assert.equal(await r.text(), 'copia de ui');
  });

  test('sin red y sin copia: una página recibe la de inicio; cualquier otro archivo, un error (nunca la página)', async () => {
    const { evento } = cargarSW({ red: sinRed, guardado: { 'la-despensa-v3': { 'index.html': 'la página de inicio' } } });
    const pagina = await evento('fetch', pedir('partida', { mode: 'navigate' })).respuesta;
    assert.equal(await pagina.text(), 'la página de inicio');
    const script = await evento('fetch', pedir('js/nuevo.js')).respuesta;
    assert.equal(script.type, 'error');
  });

  test('no toca las peticiones que no son GET ni las de otro origen', () => {
    const { evento } = cargarSW();
    assert.equal(evento('fetch', pedir('js/ui.js', { method: 'POST' })).respuesta, null);
    assert.equal(evento('fetch', { request: { method: 'GET', url: 'https://0.peerjs.com/peerjs/id', mode: 'cors' } }).respuesta, null);
    assert.notEqual(evento('fetch', pedir('js/ui.js')).respuesta, null, 'control: una petición propia sí');
  });
});
