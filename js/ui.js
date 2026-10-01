/* La Despensa — interfaz y partidas en red */
(function () {
  'use strict';
  const { Game, GEO, RES, RES_INFO, COSTS, MODES, LEVELS, DEV_INFO, PIPS, emptyRes, total, resText } = window.Despensa;
  const AI = window.DespensaAI;
  const Net = window.Net;

  const SAVE_KEY = 'la-despensa.partida';
  const PREF_KEY = 'la-despensa.ajustes';
  const NET_KEY = 'la-despensa.sala';          // invitado: a qué sala volver
  const DEV_KEY = 'la-despensa.dispositivo';
  const ROOM_PREFIX = 'ladespensa-';
  const COLORS = ['#d8432f', '#2f6db5', '#f0a31c', '#f7f3ea'];
  const AI_NAMES = ['Rosa', 'Paco', 'Lola', 'Curro'];
  const TERRAIN = { aceite: '#b9c97a', vino: '#c9a0bd', trigo: '#f0d584', pescado: '#8fd0d6', sal: '#f3e6e2' };
  const BUILD_NAMES = { camino: 'Camino', huerta: 'Huerta', bodega: 'Bodega', carta: 'Carta' };

  const $ = (sel) => document.querySelector(sel);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const icon = (id, size) => `<svg class="ic" width="${size || 20}" height="${size || 20}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const low = (r) => RES_INFO[r].name.toLowerCase();
  /* Lo que llega de otro dispositivo solo puede traer negritas */
  const clean = (html) => String(html).replace(/<(?!\/?b>)/g, '&lt;');

  let g = null;        // partida en curso (en un invitado, copia de la del anfitrión)
  let viewer = -1;     // jugador cuya mano se muestra
  let uiMode = null;   // 'camino' | 'huerta' | 'bodega' mientras se elige dónde construir
  let busy = false;    // la máquina está jugando o hay un diálogo de turno abierto
  let seenSteal = null;
  let overShown = false;
  let diceKey = '';
  let devSeen = { viewer: -1, n: 0 };
  let prefs = { fast: false, netName: '' };
  const refreshers = new Set();   // ventanas abiertas que se redibujan con cada cambio

  /* Red: net = { role: 'host' | 'guest', room, code } */
  let net = null;
  let lobby = null;      // anfitrión antes de empezar: { players: [{ name, dev, ai }], mode, level }
  let online = {};
  let lastSent = '';
  let prompting = { discard: false, steal: false };
  let lastTurnSeen = -1;
  let wake = null;
  const asks = new Map(); let askN = 0;        // anfitrión: preguntas a invitados
  const waits = new Map(); let waitN = 0;      // invitado: respuestas del anfitrión
  const myDev = Net.deviceId(DEV_KEY);
  const isHost = () => !!net && net.role === 'host';
  const isGuest = () => !!net && net.role === 'guest';

  /* ---------- almacenamiento local ---------- */
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* sin almacenamiento: se juega igual, sin guardar */ }
  }
  function save() {
    if (!g || isGuest()) return;
    store(SAVE_KEY, g.s.phase === 'over' ? null : { s: g.s, viewer });
  }

  /* ---------- diálogos y avisos ---------- */
  function openModal(html, cls) {
    const wrap = document.createElement('div');
    wrap.className = 'backdrop ' + (cls || '');
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const m = { el: wrap.firstElementChild, close: () => { wrap.remove(); refreshers.delete(m.draw); } };
    return m;
  }
  /* Se cierra al pulsar un botón con data-close y devuelve su valor */
  function dialog(html, cls) {
    return new Promise((resolve) => {
      const m = openModal(html, cls);
      m.el.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-close]');
        if (b && !b.disabled) { m.close(); resolve(b.dataset.close); }
      });
    });
  }
  function toast(html) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  const closeModals = () => document.querySelectorAll('.backdrop').forEach((b) => b.remove());
  const resChips = (map) => RES.filter((r) => map[r] > 0)
    .map((r) => `<span class="chip">${icon(r, 18)}${map[r]}</span>`).join('');

  /* ---------- menú de inicio ---------- */
  function initMenu() {
    const types = ['human', 'ai', 'ai', 'off'];
    $('#slots').innerHTML = types.map((t, i) => `
      <div class="slot">
        <i class="dot" style="--c:${COLORS[i]}"></i>
        <input type="text" maxlength="12" data-name="${i}" aria-label="Nombre del jugador ${i + 1}">
        <select data-type="${i}" aria-label="Tipo de jugador ${i + 1}">
          <option value="human"${t === 'human' ? ' selected' : ''}>Persona</option>
          <option value="ai"${t === 'ai' ? ' selected' : ''}>Máquina</option>
          ${i > 1 ? `<option value="off"${t === 'off' ? ' selected' : ''}>No juega</option>` : ''}
        </select>
      </div>`).join('');
    const sync = () => {
      document.querySelectorAll('[data-type]').forEach((sel) => {
        const i = Number(sel.dataset.type), inp = $(`[data-name="${i}"]`);
        inp.placeholder = sel.value === 'ai' ? AI_NAMES[i] : 'Jugador ' + (i + 1);
        inp.disabled = sel.value === 'off';
        sel.closest('.slot').classList.toggle('off', sel.value === 'off');
      });
    };
    $('#slots').addEventListener('change', sync);
    sync();

    $('#btn-start').addEventListener('click', () => {
      const players = [];
      document.querySelectorAll('[data-type]').forEach((sel) => {
        if (sel.value === 'off') return;
        const i = Number(sel.dataset.type), inp = $(`[data-name="${i}"]`);
        players.push({ name: inp.value.trim() || inp.placeholder, ai: sel.value === 'ai', color: i });
      });
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const level = document.querySelector('input[name="level"]:checked').value;
      leaveNet();
      g = Game.create({ mode, level, players });
      viewer = humans().length === 1 ? humans()[0] : -1;
      startGame();
    });
    $('#btn-continue').addEventListener('click', resumeSaved);
    const hint = () => { $('#level-hint').textContent = LEVELS[document.querySelector('input[name="level"]:checked').value].text; };
    $('#levels').addEventListener('change', hint);
    hint();
    $('#btn-rules').addEventListener('click', () => dialog(rulesHtml()));
    $('#net-host').addEventListener('click', () => askName('host'));
    $('#net-join').addEventListener('click', () => askName('join'));
    $('#net-back').addEventListener('click', () => {
      const r = load(NET_KEY);
      if (r) joinRoom(r.code, r.name);
    });
  }

  function showMenu() {
    g = null;
    leaveNet();
    const data = load(SAVE_KEY);
    const ok = data && data.s && data.s.version === 1 && data.s.phase !== 'over';
    $('#btn-continue').hidden = !ok;
    if (ok) $('#btn-continue').textContent = data.s.net ? `Reabrir la sala ${data.s.net.room}` : 'Continuar partida';
    const r = load(NET_KEY);
    $('#net-back').hidden = !r;
    if (r) $('#net-back').textContent = `Volver a la sala ${r.code}`;
    $('#net-help').hidden = Net.available();
    $('#game').hidden = true;
    $('#lobby').hidden = true;
    $('#menu').hidden = false;
    closeModals();
    releaseWake();
  }

  async function resumeSaved() {
    const data = load(SAVE_KEY);
    if (!data || !data.s) return showMenu();
    if (data.s.net) {
      if (!Net.available()) { toast(netError('nomodule')); return; }
      toast(`Reabriendo la sala ${esc(data.s.net.room)}…`);
      try {
        await hostRoom(data.s.net.room);
      } catch (e) {
        leaveNet();
        toast(netError(e));
        return;
      }
    }
    g = new Game(data.s);
    viewer = data.s.net ? mySeat() : data.viewer;
    startGame();
  }

  function startGame() {
    uiMode = null;
    busy = false;
    overShown = false;
    diceKey = '';
    seenSteal = g.s.lastSteal;
    devSeen = { viewer: -1, n: 0 };
    prompting = { discard: false, steal: false };
    lastTurnSeen = -1;
    $('#menu').hidden = true;
    $('#lobby').hidden = true;
    $('#game').hidden = false;
    $('#goal').textContent = MODES[g.s.mode].name + ' · a ' + MODES[g.s.mode].target + ' puntos · ' + LEVELS[g.s.level || 'normal'].name +
      (net ? ' · sala ' + net.code : '');
    if (net) keepAwake();
    pump();
  }

  /* ---------- ayudas ---------- */
  const humans = () => g.s.players.map((p, i) => i).filter((i) => !g.s.players[i].ai);
  const colorOf = (p) => COLORS[g.s.players[p].color];
  /* Persona que juega en este dispositivo */
  const local = (p) => p >= 0 && !!g.s.players[p] && !g.s.players[p].ai && (!net || g.s.players[p].device === myDev);
  const mySeat = () => (g ? g.s.players.findIndex((pl) => pl.device === myDev) : -1);
  const connected = (p) => !net || !g.s.players[p].device || online[g.s.players[p].device] !== false;
  const humanTurn = () => local(g.s.current) && viewer === g.s.current;
  const canAct = () => !busy && g.s.phase !== 'over' && humanTurn();

  function targets() {
    const s = g.s, p = s.current, t = { v: [], e: [], h: false, ring: false };
    if (!canAct()) return t;
    if (s.phase === 'setup') {
      if (s.setup.step === 'huerta') t.v = g.settlementSpots(p, true);
      else t.e = g.roadSpots(p);
    } else if (s.phase === 'critic') t.h = true;
    else if (s.phase === 'roadBuilding') t.e = g.roadSpots(p);
    else if (s.phase === 'main') {
      if (uiMode === 'camino') t.e = g.roadSpots(p);
      else if (uiMode === 'huerta') t.v = g.settlementSpots(p, false);
      else if (uiMode === 'bodega') { t.v = g.citySpots(p); t.ring = true; }
    }
    return t;
  }

  /* ---------- dibujo ---------- */
  function render() {
    if (!g) return;
    if (g.s.phase !== 'main') uiMode = null;
    renderPlayers();
    renderBoard();
    renderDice();
    renderStatus();
    renderHand();
    renderActions();
    renderLog();
    noteNewCard();
    refreshers.forEach((f) => f());
    sync();
  }

  function renderPlayers() {
    const s = g.s, dev = MODES[s.mode].dev;
    $('#players').innerHTML = s.players.map((pl, i) => `
      <button class="pchip${i === s.current && s.phase !== 'over' ? ' on' : ''}" data-p="${i}" style="--c:${colorOf(i)}">
        <span class="pname"><i class="dot"></i>${esc(pl.name)}${net && pl.device && !connected(i) ? ' 📵' : ''}${pl.away ? ' 🤖' : ''}</span>
        <span class="ppts"><b>${g.points(i, s.phase === 'over')}</b> pts</span>
        <span class="pmeta">${icon('cartas', 14)}${total(pl.res)}${dev ? icon('chef', 14) + pl.chefs : ''}</span>
        <span class="pbadges">${s.longest.p === i ? '<em>Ruta</em>' : ''}${s.army.p === i ? '<em>Brigada</em>' : ''}</span>
      </button>`).join('');
  }

  function renderBoard() {
    const s = g.s, t = targets();
    const f = (n) => n.toFixed(1);
    const pts = (h) => h.verts.map((v) => f(GEO.verts[v].x) + ',' + f(GEO.verts[v].y)).join(' ');
    let o = '<g class="beach">' + GEO.hexes.map((h) => `<polygon points="${pts(h)}"/>`).join('') + '</g>';

    for (const port of s.ports) {
      const e = GEO.edges[port.edge], h = GEO.hexes[e.hexes[0]];
      const dx = e.mx - h.x, dy = e.my - h.y, d = Math.hypot(dx, dy);
      const px = e.mx + (dx / d) * 36, py = e.my + (dy / d) * 36;
      const a = GEO.verts[e.a], b = GEO.verts[e.b];
      o += `<g class="port"><path d="M${f(a.x)} ${f(a.y)}L${f(px)} ${f(py)}L${f(b.x)} ${f(b.y)}"/>
        <circle cx="${f(px)}" cy="${f(py)}" r="17"/>`;
      if (port.type === '3:1') o += `<text x="${f(px)}" y="${f(py + 1)}" class="big">3:1</text>`;
      else o += `<use href="#i-${port.type}" x="${f(px - 8)}" y="${f(py - 14)}" width="16" height="16"/>
        <text x="${f(px)}" y="${f(py + 9)}">2:1</text>`;
      o += '</g>';
    }

    const sum = s.dice && s.phase !== 'roll' ? s.dice[0] + s.dice[1] : 0;
    GEO.hexes.forEach((h, i) => {
      const hx = s.hexes[i];
      const hot = hx.num === sum && i !== s.critic;
      o += `<g class="hex${hot ? ' hot' : ''}"><polygon points="${pts(h)}" fill="${TERRAIN[hx.res] || '#e2cfa6'}"/>`;
      if (hx.res) {
        const red = hx.num === 6 || hx.num === 8;
        o += `<use href="#i-${hx.res}" x="${f(h.x - 13)}" y="${f(h.y - 43)}" width="26" height="26"/>
          <circle class="token" cx="${f(h.x)}" cy="${f(h.y + 10)}" r="17"/>
          <text class="num${red ? ' red' : ''}" x="${f(h.x)}" y="${f(h.y + 7)}">${hx.num}</text>`;
        const n = PIPS[hx.num];
        for (let k = 0; k < n; k++) {
          o += `<circle class="pip${red ? ' red' : ''}" cx="${f(h.x + (k - (n - 1) / 2) * 4.6)}" cy="${f(h.y + 20)}" r="1.5"/>`;
        }
      } else {
        o += `<text class="terrain" x="${f(h.x)}" y="${f(h.y - 22)}">Erial</text>`;
      }
      if (i === s.critic) o += `<polygon class="blocked" points="${pts(h)}"/>`;
      o += '</g>';
    });

    s.roads.forEach((p, i) => {
      if (p === null) return;
      const a = GEO.verts[GEO.edges[i].a], b = GEO.verts[GEO.edges[i].b];
      const x1 = a.x + (b.x - a.x) * 0.2, y1 = a.y + (b.y - a.y) * 0.2;
      const x2 = a.x + (b.x - a.x) * 0.8, y2 = a.y + (b.y - a.y) * 0.8;
      const d = `x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"`;
      o += `<line class="road-bg" ${d}/><line class="road" ${d} stroke="${colorOf(p)}"/>`;
    });

    s.builds.forEach((b, v) => {
      if (!b) return;
      const { x, y } = GEO.verts[v];
      o += b.t === 1
        ? `<use href="#i-huerta" x="${f(x - 14)}" y="${f(y - 14)}" width="28" height="28" style="color:${colorOf(b.p)}"/>`
        : `<use href="#i-bodega" x="${f(x - 19)}" y="${f(y - 17)}" width="38" height="33" style="color:${colorOf(b.p)}"/>`;
    });

    const ch = GEO.hexes[s.critic];
    o += `<use class="critic" href="#i-critico" x="${f(ch.x + 15)}" y="${f(ch.y - 8)}" width="37" height="35"/>`;

    const col = colorOf(s.current);
    if (t.h) {
      GEO.hexes.forEach((h, i) => {
        if (i !== s.critic) o += `<circle class="tring" cx="${f(h.x)}" cy="${f(h.y + 10)}" r="22"/><polygon class="th" data-h="${i}" points="${pts(h)}"/>`;
      });
    }
    for (const e of t.e) {
      const a = GEO.verts[GEO.edges[e].a], b = GEO.verts[GEO.edges[e].b];
      const x1 = a.x + (b.x - a.x) * 0.2, y1 = a.y + (b.y - a.y) * 0.2;
      const x2 = a.x + (b.x - a.x) * 0.8, y2 = a.y + (b.y - a.y) * 0.8;
      const d = `x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"`;
      o += `<line class="te" ${d} stroke="${col}"/><line class="hit" data-e="${e}" ${d}/>`;
    }
    for (const v of t.v) {
      const { x, y } = GEO.verts[v];
      o += `<circle class="tv${t.ring ? ' ring' : ''}" cx="${f(x)}" cy="${f(y)}" r="${t.ring ? 20 : 12}" stroke="${col}"/>
        <circle class="hit" data-v="${v}" cx="${f(x)}" cy="${f(y)}" r="22"/>`;
    }
    $('#board').innerHTML = o;
  }

  function renderDice() {
    const s = g.s, key = s.dice ? s.dice.join('-') + '@' + s.turn : '';
    if (key === diceKey) return;
    diceKey = key;
    const dots = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    const die = (n) => `<svg class="die" viewBox="-12 -12 24 24"><rect x="-11" y="-11" width="22" height="22" rx="5"/>${
      (dots[n] || []).map(([x, y]) => `<circle cx="${x * 5.8}" cy="${y * 5.8}" r="2.2"/>`).join('')}</svg>`;
    $('#dice').innerHTML = s.dice ? die(s.dice[0]) + die(s.dice[1]) + `<b>${Number(s.dice[0]) + Number(s.dice[1])}</b>` : '';
  }

  function statusText() {
    const s = g.s, pl = s.players[s.current];
    if (s.phase === 'over') return '¡' + esc(s.players[s.winner].name) + ' gana la partida!';
    if (viewer < 0 && humans().length) return 'Pasando el turno…';
    if (s.phase === 'discard') return 'Ha salido un 7: quien tenga más de 7 cartas descarta la mitad';
    if (pl.ai || !humanTurn()) {
      if (net && !pl.ai && !connected(s.current)) return esc(pl.name) + ' se ha desconectado. Esperando…';
      return 'Juega ' + esc(pl.name) + '…';
    }
    const who = humans().length > 1 && !net ? esc(pl.name) + ': ' : '';
    switch (s.phase) {
      case 'setup':
        return who + (s.setup.step === 'huerta'
          ? (s.setup.idx >= s.players.length ? 'planta tu segunda huerta' : 'planta tu primera huerta en un cruce')
          : 'coloca un camino junto a tu huerta');
      case 'roll': return who + 'tira los dados';
      case 'critic': return who + 'mueve al Cítrico Gastronómico a otra parcela';
      case 'steal': return who + 'elige a quién robar';
      case 'roadBuilding': return who + 'coloca ' + (s.freeRoads === 1 ? '1 camino gratis' : s.freeRoads + ' caminos gratis');
      case 'main':
        if (uiMode === 'camino') return 'Toca dónde va el camino';
        if (uiMode === 'huerta') return 'Toca dónde plantar la huerta';
        if (uiMode === 'bodega') return 'Toca la huerta que quieres ampliar';
        return who + 'construye, comercia o termina tu turno';
    }
    return '';
  }

  function renderStatus() {
    const el = $('#status');
    el.innerHTML = `<i class="dot" style="--c:${colorOf(g.s.phase === 'over' ? g.s.winner : g.s.current)}"></i><span>${statusText().replace(/^./, (c) => c.toUpperCase())}</span>`;
  }

  function renderHand() {
    const s = g.s, el = $('#hand');
    if (viewer < 0) { el.innerHTML = ''; return; }
    const pl = s.players[viewer];
    let o = '<div class="rcards">' + RES.map((r) => `
      <div class="rcard${pl.res[r] ? '' : ' zero'}">${icon(r, 26)}<b>${pl.res[r]}</b><small>${RES_INFO[r].name}</small></div>`).join('') + '</div>';
    if (pl.dev.length) {
      const groups = {};
      pl.dev.forEach((c) => { groups[c.type] = (groups[c.type] || 0) + 1; });
      o += '<div class="dcards">' + Object.keys(DEV_INFO).filter((k) => groups[k]).map((k) => `
        <button class="dcard${g.playableDev(viewer, k) && canAct() ? ' ready' : ''}" data-dev="${k}">${icon(k, 18)}${DEV_INFO[k].name}${groups[k] > 1 ? ' ×' + groups[k] : ''}</button>`).join('') + '</div>';
    }
    el.innerHTML = o;
  }

  /* Avisa de la carta de cocina que acaba de llegar a la mano que se ve */
  function noteNewCard() {
    if (viewer < 0) { devSeen = { viewer: -1, n: 0 }; return; }
    const dev = g.s.players[viewer].dev;
    if (devSeen.viewer === viewer && dev.length > devSeen.n) {
      const c = dev[dev.length - 1];
      if (c && DEV_INFO[c.type]) toast(`Nueva carta: ${icon(c.type, 18)} ${DEV_INFO[c.type].name}`);
    }
    devSeen = { viewer, n: dev.length };
  }

  const costIcons = (cost) => RES.filter((r) => cost[r]).map((r) => icon(r, 14).repeat(cost[r])).join('');

  /* Persona que tiene que decidir algo ahora (para saber a quién se espera) */
  function waitingOn() {
    const s = g.s;
    if (s.phase === 'over') return -1;
    if (s.phase === 'discard') {
      const k = Object.keys(s.pending).map(Number).find((i) => !s.players[i].ai);
      return k === undefined ? -1 : k;
    }
    return s.players[s.current].ai ? -1 : s.current;
  }

  function renderActions() {
    const s = g.s, p = s.current, el = $('#actions'), ok = canAct();
    el.classList.toggle('five', !MODES[s.mode].dev);
    if (s.phase === 'over') {
      el.innerHTML = '<button class="btn primary big" data-act="new">Nueva partida</button>';
      return;
    }
    const w = waitingOn();
    if (isHost() && w >= 0 && !local(w) && !connected(w)) {
      el.innerHTML = `<button class="btn big" data-act="takeover">Que juegue la máquina por ${esc(s.players[w].name)}</button>`;
      return;
    }
    if (!humanTurn() || (s.phase !== 'roll' && s.phase !== 'main')) { el.innerHTML = ''; return; }
    if (s.phase === 'roll') {
      el.innerHTML = `<button class="btn primary big" data-act="roll"${ok ? '' : ' disabled'}>Tirar dados</button>`;
      return;
    }
    const pl = s.players[p];
    const can = {
      camino: pl.roads > 0 && g.roadSpots(p).length > 0,
      huerta: pl.huertas > 0 && g.settlementSpots(p, false).length > 0,
      bodega: pl.bodegas > 0 && g.citySpots(p).length > 0,
      carta: s.deck.length > 0,
    };
    const btn = (k) => {
      const afford = g.canAfford(p, COSTS[k]);
      const why = !afford ? 'Te faltan recursos' : !can[k] ? (k === 'carta' ? 'No quedan cartas' : 'No tienes dónde') : '';
      return `<button class="abtn${uiMode === k ? ' sel' : ''}" data-act="${k}"${ok && afford && can[k] ? '' : ' disabled'} title="${why}">
        <span>${uiMode === k ? 'Cancelar' : BUILD_NAMES[k]}</span><span class="cost">${costIcons(COSTS[k])}</span></button>`;
    };
    el.innerHTML = btn('camino') + btn('huerta') + btn('bodega') + (MODES[s.mode].dev ? btn('carta') : '') +
      `<button class="abtn" data-act="trade"${ok ? '' : ' disabled'}><span>Comerciar</span><span class="cost">banca${MODES[s.mode].playerTrade ? ' · rivales' : ''}</span></button>
       <button class="abtn end" data-act="end"${ok ? '' : ' disabled'}><span>Terminar turno</span></button>`;
  }

  function renderLog() {
    const s = g.s;
    $('#log').innerHTML = s.log.slice(-40).reverse().map((l) =>
      `<p>${l.p === null || !s.players[l.p] ? '' : `<i class="dot" style="--c:${colorOf(l.p)}"></i>`}${esc(l.text)}</p>`).join('');
  }

  /* ---------- bucle de la partida (sin red o en el anfitrión) ---------- */
  async function pump() {
    if (busy || !g || isGuest()) return;
    busy = true;
    try {
      for (;;) {
        if (!g) return; // se ha salido al inicio
        const s = g.s;
        render();
        save();
        noteSteal();
        if (s.phase === 'over') {
          if (!overShown) { overShown = true; busy = false; render(); await gameOver(); }
          return;
        }
        if (s.phase === 'discard') {
          const h = Object.keys(s.pending).map(Number).find((i) => !s.players[i].ai);
          if (h !== undefined && !net) { await humanDiscard(h); continue; }
          if (net) {
            busy = false;
            prompts();
            busy = true;
            if (!Object.keys(s.pending).some((i) => s.players[i].ai)) return; // se espera a las personas
          }
        } else if (!s.players[s.current].ai) {
          if (net) { busy = false; render(); announce(); prompts(); return; }
          if (viewer !== s.current) {
            if (humans().length > 1) await passDevice(s.current);
            viewer = s.current;
            continue;
          }
          if (s.phase === 'steal') { await humanSteal(); continue; }
          return; // esperando a la persona
        }
        const r = AI.step(g);
        if (!r) return;
        if (r.offer) await resolveAiOffer(r.offer);
        render();
        await sleep(prefs.fast ? 140 : s.phase === 'setup' ? 500 : 700);
      }
    } finally {
      busy = false;
      if (g) render();
    }
  }

  /* En red, ventanas que este dispositivo tiene que contestar: descartar con un 7 o elegir a quién robar */
  function prompts() {
    if (!g || !net) return;
    const s = g.s, me = mySeat();
    if (me < 0) return;
    if (s.phase === 'discard' && s.pending[me] && !s.players[me].ai && !prompting.discard) {
      prompting.discard = true;
      humanDiscard(me).finally(() => { prompting.discard = false; });
    }
    if (s.phase === 'steal' && s.current === me && !prompting.steal) {
      prompting.steal = true;
      humanSteal().finally(() => { prompting.steal = false; });
    }
  }
  /* En red, avisa cuando empieza tu turno */
  function announce() {
    const s = g.s;
    const key = s.turn + ':' + s.current;
    if (!net || !local(s.current) || key === lastTurnSeen) return;
    lastTurnSeen = key;
    if (s.phase !== 'roll' && s.phase !== 'setup') return;
    toast('¡Te toca!');
    if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { /* sin vibración */ }
  }

  function noteSteal() {
    const ls = g.s.lastSteal;
    if (!ls || JSON.stringify(ls) === JSON.stringify(seenSteal)) return;
    seenSteal = ls;
    if (!RES_INFO[ls.res] || !g.s.players[ls.from] || !g.s.players[ls.to]) return;
    const name = (i) => esc(g.s.players[i].name);
    if (ls.to === viewer) toast(`Robas ${icon(ls.res, 18)} a ${name(ls.from)}`);
    else if (ls.from === viewer) toast(`${name(ls.to)} te roba ${icon(ls.res, 18)}`);
  }

  async function passDevice(i) {
    viewer = -1;
    render();
    const name = esc(g.s.players[i].name);
    await dialog(`<div class="center"><i class="dot huge" style="--c:${colorOf(i)}"></i>
      <h2>Le toca a ${name}</h2><p>Pasa el dispositivo a ${name}.</p>
      <button class="btn primary wide" data-close="ok">Ya lo tengo</button></div>`, 'cover');
  }

  function stepper(key, r, n) {
    return `<div class="step">${icon(r, 22)}<small>${RES_INFO[r].name}</small>
      <div><button data-step="${key}:${r}:-1" aria-label="Menos">−</button><b>${n}</b><button data-step="${key}:${r}:1" aria-label="Más">+</button></div></div>`;
  }

  async function humanDiscard(h) {
    const s = g.s, pl = s.players[h], need = s.pending[h];
    if (viewer !== h && !net) {
      if (humans().length > 1) await passDevice(h);
      viewer = h;
      render();
    }
    const sel = emptyRes();
    await new Promise((resolve) => {
      const m = openModal('');
      const draw = () => {
        const left = need - total(sel);
        m.el.innerHTML = `<h2>Ha salido un 7</h2>
          <p>${esc(pl.name)}, tienes ${total(pl.res)} cartas: descarta ${need}.</p>
          <div class="steps">${RES.filter((r) => pl.res[r]).map((r) => stepper('d', r, sel[r] + ' / ' + pl.res[r])).join('')}</div>
          <button class="btn primary wide" data-ok${left ? ' disabled' : ''}>${left ? 'Faltan ' + left : 'Descartar'}</button>`;
      };
      m.el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.step) {
          const [, r, d] = b.dataset.step.split(':');
          const n = sel[r] + Number(d);
          if (n >= 0 && n <= pl.res[r] && (Number(d) < 0 || total(sel) < need)) sel[r] = n;
          draw();
        } else if ('ok' in b.dataset && total(sel) === need) {
          m.close();
          resolve();
          exec('discard', [h, sel]);
        }
      });
      draw();
    });
  }

  async function humanSteal() {
    const s = g.s;
    const q = await dialog(`<h2>¿A quién robas una carta?</h2><div class="list">${s.stealFrom.map((i) => `
      <button class="btn wide" data-close="${i}"><i class="dot" style="--c:${colorOf(i)}"></i>${esc(s.players[i].name)} · ${total(s.players[i].res)} cartas</button>`).join('')}</div>`);
    exec('steal', [Number(q)]);
  }

  function offerHtml(offer, a, b) {
    return `<div class="deal"><div><small>${a}</small>${resChips(offer.give)}</div><span>⇄</span><div><small>${b}</small>${resChips(offer.get)}</div></div>`;
  }

  async function askHuman(q, offer) {
    const s = g.s;
    const r = await dialog(`<h2>Oferta para ${esc(s.players[q].name)}</h2>
      <p><i class="dot" style="--c:${colorOf(offer.from)}"></i>${esc(s.players[offer.from].name)} te propone un cambio:</p>
      ${offerHtml(offer, 'Te da', 'Te pide')}
      <div class="row"><button class="btn" data-close="no">Rechazar</button>
      <button class="btn primary" data-close="yes"${g.canAfford(q, offer.get) ? '' : ' disabled'}>Aceptar</button></div>`);
    return r === 'yes';
  }
  /* Pregunta a una persona: aquí mismo o, en red, en su dispositivo */
  function askPerson(q, offer) {
    if (local(q)) return askHuman(q, offer);
    return askRemote(q, { kind: 'offer', offer }).then((v) => v === true);
  }
  function askRemote(q, payload) {
    const dev = g.s.players[q].device;
    if (!isHost() || !net.room.online(dev)) return Promise.resolve(null);
    return new Promise((resolve) => {
      const id = ++askN;
      asks.set(id, { dev, resolve });
      net.room.send(dev, Object.assign({ t: 'ask', id }, payload));
      setTimeout(() => { if (asks.has(id)) { asks.delete(id); resolve(null); } }, 90000);
    });
  }

  async function resolveAiOffer(offer) {
    const s = g.s, n = s.players.length;
    const others = [];
    for (let d = 1; d < n; d++) others.push((offer.from + d) % n);
    others.sort((a, b) => s.players[a].ai - s.players[b].ai); // primero las personas
    for (const q of others) {
      if (!g.canAfford(q, offer.get)) continue;
      const yes = s.players[q].ai ? AI.accepts(g, q, offer) : await askPerson(q, offer);
      if (yes && g.playerTrade(offer.from, q, offer.give, offer.get)) return;
    }
  }

  async function gameOver() {
    const s = g.s;
    const rank = s.players.map((pl, i) => i).sort((a, b) => g.points(b, true) - g.points(a, true));
    const r = await dialog(`<div class="center">${icon('estrella', 44)}<h2>¡${esc(s.players[s.winner].name)} gana!</h2></div>
      <div class="list">${rank.map((i) => `<div class="rank"><i class="dot" style="--c:${colorOf(i)}"></i>
        <span>${esc(s.players[i].name)}</span><b>${g.points(i, true)} pts</b></div>`).join('')}</div>
      <div class="row"><button class="btn" data-close="see">Ver tablero</button>
      <button class="btn primary" data-close="new">Nueva partida</button></div>`);
    if (r === 'new') newGame();
  }
  function newGame() {
    if (isHost()) net.room.broadcast({ t: 'end' });
    if (isGuest()) store(NET_KEY, null);
    showMenu();
  }

  /* ---------- órdenes ---------- */
  const int = (x) => (Number.isInteger(Number(x)) ? Number(x) : -1);
  function resMap(m) {
    const out = emptyRes();
    if (m && typeof m === 'object') RES.forEach((r) => { const v = Math.floor(Number(m[r]) || 0); out[r] = v > 0 ? Math.min(v, 99) : 0; });
    return out;
  }
  /* Aplica una orden en el motor. seat = asiento de quien la manda (null si es de este dispositivo) */
  function apply(seat, cmd, args) {
    const s = g.s, a = Array.isArray(args) ? args : [];
    if (cmd === 'discard') {
      const p = int(a[0]);
      if (seat != null && p !== seat) return false;
      return g.discard(p, resMap(a[1]));
    }
    if (seat != null && seat !== s.current) return false;
    const arg1 = a[1];
    const devArg = Array.isArray(arg1) ? arg1.slice(0, 2).map(String) : typeof arg1 === 'string' ? arg1 : undefined;
    const CMDS = {
      placeSetupHuerta: () => g.placeSetupHuerta(int(a[0])), placeSetupRoad: () => g.placeSetupRoad(int(a[0])),
      buildHuerta: () => g.buildHuerta(int(a[0])), buildBodega: () => g.buildBodega(int(a[0])), buildRoad: () => g.buildRoad(int(a[0])),
      moveCritic: () => g.moveCritic(int(a[0])), steal: () => g.steal(int(a[0])),
      roll: () => g.roll(), endTurn: () => g.endTurn(), buyDev: () => g.buyDev(),
      playDev: () => g.playDev(String(a[0]), devArg), bankTrade: () => g.bankTrade(String(a[0]), String(a[1]))
    };
    return CMDS[cmd] ? CMDS[cmd]() : false;
  }
  /* Orden desde este dispositivo: se aplica aquí o se manda al anfitrión */
  function exec(cmd, args) {
    if (!g) return false;
    if (isGuest()) {
      if (!net.room.toHost({ t: 'act', cmd, args: args || [] })) toast('Sin conexión con la sala. Reintentando…');
      return true;
    }
    const ok = apply(null, cmd, args);
    if (ok) afterAction();
    return ok;
  }

  /* ---------- acciones de la persona ---------- */
  function afterAction() {
    uiMode = null;
    if (isGuest()) { render(); return; }
    pump();
  }

  $('#board').addEventListener('click', (ev) => {
    if (!g || !canAct()) return;
    const el = ev.target.closest('[data-v],[data-e],[data-h]');
    if (!el) return;
    const s = g.s, d = el.dataset;
    if (d.v !== undefined) {
      const v = Number(d.v);
      if (s.phase === 'setup') exec('placeSetupHuerta', [v]);
      else if (uiMode === 'huerta') exec('buildHuerta', [v]);
      else if (uiMode === 'bodega') exec('buildBodega', [v]);
    } else if (d.e !== undefined) {
      exec(s.phase === 'setup' ? 'placeSetupRoad' : 'buildRoad', [Number(d.e)]);
    } else if (d.h !== undefined) {
      exec('moveCritic', [Number(d.h)]);
    }
  });

  $('#actions').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled || !g) return;
    const act = b.dataset.act;
    if (act === 'new') return newGame();
    if (act === 'takeover') return takeover();
    if (!canAct()) return;
    if (act === 'roll') exec('roll');
    else if (act === 'end') exec('endTurn');
    else if (act === 'trade') { uiMode = null; render(); openTrade(); }
    else if (act === 'carta') exec('buyDev');
    else {
      uiMode = uiMode === act ? null : act;
      render();
    }
  });

  $('#hand').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-dev]');
    if (!b || !g) return;
    const type = b.dataset.dev, info = DEV_INFO[type];
    const playable = canAct() && g.playableDev(viewer, type);
    const note = type === 'estrella' ? '' :
      '<p class="muted">Una carta por turno, y nunca en el turno en que la compras.</p>';
    const r = await dialog(`<div class="center">${icon(type, 40)}<h2>${info.name}</h2></div><p>${info.text}</p>${playable ? '' : note}
      <div class="row"><button class="btn" data-close="no">Cerrar</button>
      ${type === 'estrella' ? '' : `<button class="btn primary" data-close="play"${playable ? '' : ' disabled'}>Jugar</button>`}</div>`);
    if (r !== 'play' || !canAct()) return;
    let arg;
    if (type === 'cosecha') arg = await pickResources('Buena cosecha: elige 2 recursos', 2, (r2) => g.s.bank[r2]);
    if (type === 'exclusiva') arg = (await pickResources('Exclusiva: ¿qué recurso te entregan?', 1, () => 9) || [])[0];
    if ((type === 'cosecha' || type === 'exclusiva') && !arg) return;
    exec('playDev', [type, arg]);
  });

  /* Devuelve una lista de n recursos, o null si se cancela */
  function pickResources(title, n, avail) {
    if (n === 1) {
      return dialog(`<h2>${title}</h2><div class="pickrow">${RES.map((r) => `
        <button data-close="${r}"${avail(r) > 0 ? '' : ' disabled'}>${icon(r, 26)}<small>${RES_INFO[r].name}</small></button>`).join('')}</div>
        <div class="row"><button class="btn" data-close="">Cancelar</button></div>`).then((r) => (r ? [r] : null));
    }
    return new Promise((resolve) => {
      const sel = emptyRes();
      const m = openModal('');
      const draw = () => {
        m.el.innerHTML = `<h2>${title}</h2>
          <div class="steps">${RES.map((r) => stepper('k', r, sel[r])).join('')}</div>
          <div class="row"><button class="btn" data-cancel>Cancelar</button>
          <button class="btn primary" data-ok${total(sel) === n ? '' : ' disabled'}>Aceptar</button></div>`;
      };
      m.el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.step) {
          const [, r, d] = b.dataset.step.split(':');
          const v = sel[r] + Number(d);
          if (v >= 0 && v <= avail(r) && (Number(d) < 0 || total(sel) < n)) sel[r] = v;
          draw();
        } else if ('cancel' in b.dataset) { m.close(); resolve(null); }
        else if ('ok' in b.dataset && total(sel) === n) {
          m.close();
          const out = [];
          RES.forEach((r) => { for (let i = 0; i < sel[r]; i++) out.push(r); });
          resolve(out);
        }
      });
      draw();
    });
  }

  function openTrade() {
    const p = g.s.current;
    const withPlayers = MODES[g.s.mode].playerTrade;
    let tab = 'bank', give = null, get = null, note = '', sending = false;
    const off = { g: emptyRes(), w: emptyRes() };
    const m = openModal('');
    const draw = () => {
      if (!g) return m.close();
      const s = g.s, pl = s.players[p];
      if (give && pl.res[give] < g.tradeRatio(p, give)) give = null;
      let o = '<h2>Comerciar</h2>';
      if (withPlayers) {
        o += `<div class="tabs"><button data-tab="bank" class="${tab === 'bank' ? 'on' : ''}">Con la banca</button>
          <button data-tab="players" class="${tab === 'players' ? 'on' : ''}">Con rivales</button></div>`;
      }
      if (tab === 'bank') {
        o += '<h3>Entregas</h3><div class="pickrow">' + RES.map((r) => {
          const ratio = g.tradeRatio(p, r);
          return `<button data-give="${r}" class="${give === r ? 'on' : ''}"${pl.res[r] >= ratio ? '' : ' disabled'}>
            ${icon(r, 24)}<b>${ratio}:1</b><small>tienes ${pl.res[r]}</small></button>`;
        }).join('') + '</div><h3>Recibes</h3><div class="pickrow">' + RES.map((r) =>
          `<button data-get="${r}" class="${get === r ? 'on' : ''}"${s.bank[r] > 0 && r !== give ? '' : ' disabled'}>
            ${icon(r, 24)}<small>${RES_INFO[r].name}</small></button>`).join('') + '</div>' +
          `<p class="muted">${note || 'Sin puerto, la banca cambia 4 cartas iguales por 1.'}</p>
          <div class="row"><button class="btn" data-do="close">Cerrar</button>
          <button class="btn primary" data-do="bank"${give && get && give !== get ? '' : ' disabled'}>Cambiar</button></div>`;
      } else {
        o += '<h3>Ofreces</h3><div class="steps">' + RES.map((r) => stepper('g', r, off.g[r])).join('') +
          '</div><h3>Pides</h3><div class="steps">' + RES.map((r) => stepper('w', r, off.w[r])).join('') + '</div>' +
          `<p class="muted">${note || LEVELS[s.level || 'normal'].text}</p>
          <div class="row"><button class="btn" data-do="close">Cerrar</button>
          <button class="btn primary" data-do="offer"${!sending && total(off.g) && total(off.w) ? '' : ' disabled'}>${sending ? 'Esperando…' : 'Proponer'}</button></div>`;
      }
      m.el.innerHTML = o;
    };
    m.draw = draw;
    refreshers.add(draw);
    m.el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button');
      if (!b || b.disabled) return;
      const d = b.dataset, pl = g.s.players[p];
      if (d.tab) { tab = d.tab; note = ''; }
      else if (d.give) { give = d.give; if (get === give) get = null; }
      else if (d.get) get = d.get;
      else if (d.step) {
        const [k, r, dd] = d.step.split(':');
        const v = off[k][r] + Number(dd);
        if (v >= 0 && v <= (k === 'g' ? pl.res[r] : 9)) off[k][r] = v;
        if (k === 'g' && off.g[r]) off.w[r] = 0;
        if (k === 'w' && off.w[r]) off.g[r] = 0;
      } else if (d.do === 'bank') {
        const ratio = g.tradeRatio(p, give), what = `${ratio} ${low(give)} por 1 ${low(get)}`;
        if (exec('bankTrade', [give, get])) note = isGuest() ? `Pedido a la banca: ${what}.` : `Hecho: ${what}.`;
      } else if (d.do === 'offer') {
        sending = true; note = ''; draw();
        const refused = await proposeTrade(p, off.g, off.w);
        sending = false;
        if (!document.body.contains(m.el)) return;
        if (!refused) { m.close(); render(); return; }
        note = '<b class="refused">Nadie acepta.</b> ' + clean(refused);
        draw();
        const el = m.el.querySelector('.refused');
        if (el) el.parentNode.scrollIntoView({ block: 'nearest' });
        return;
      } else if (d.do === 'close') {
        m.close();
        render();
        return;
      }
      draw();
    });
    draw();
  }

  /* Propone un cambio a los rivales. Devuelve '' si hay trato o el texto de los rechazos */
  function proposeTrade(p, give, get) {
    if (!isGuest()) return resolveProposal(p, give, get);
    return new Promise((resolve) => {
      const rid = ++waitN;
      waits.set(rid, resolve);
      if (!net.room.toHost({ t: 'act', cmd: 'trade', args: [give, get], rid })) {
        waits.delete(rid);
        resolve('sin conexión con la sala.');
        return;
      }
      setTimeout(() => { if (waits.has(rid)) { waits.delete(rid); resolve('no ha llegado respuesta.'); } }, 120000);
    });
  }
  /* En el anfitrión (o sin red): pregunta a cada rival y deja elegir con quién cambiar */
  async function resolveProposal(p, give, get) {
    const s = g.s, n = s.players.length, offer = { from: p, give, get };
    if (s.phase !== 'main' || s.current !== p || !MODES[s.mode].playerTrade || !total(give) || !total(get) || !g.canAfford(p, give)) {
      return 'ahora no se puede hacer ese cambio.';
    }
    const yes = [], no = [];
    const why = (r) => ({
      sin: 'no tiene lo que pides', lider: 'no quiere ayudarte, vas ganando', poco: 'pide algo más a cambio', no: 'lo rechaza',
      ultima: 'no quiere quedarse sin ' + (r.res ? low(r.res) : 'cartas'), sobra: 'ya tiene ' + (r.res ? low(r.res) : 'eso') + ' de sobra',
    }[r.why]);
    for (let d = 1; d < n; d++) {
      const q = (p + d) % n;
      let r;
      if (s.players[q].ai) r = AI.judge(g, q, offer);
      else if (!g.canAfford(q, get)) r = { ok: false, why: 'sin' };
      else r = (await askPerson(q, offer)) ? { ok: true } : { ok: false, why: 'no' };
      if (r.ok) yes.push(q);
      else no.push(esc(s.players[q].name) + ' ' + why(r));
    }
    if (!yes.length) return 'Por ' + resText(give) + ' a cambio de ' + resText(get) + ': ' + no.join('; ') + '.';
    let q;
    if (local(p)) {
      q = await dialog(`<h2>${yes.length === 1 ? 'Hay trato' : '¿Con quién cambias?'}</h2>${offerHtml(offer, 'Das', 'Recibes')}
        <div class="list">${yes.map((i) => `<button class="btn primary wide" data-close="${i}">
          <i class="dot" style="--c:${colorOf(i)}"></i>Cambiar con ${esc(s.players[i].name)}</button>`).join('')}
        <button class="btn wide" data-close="no">Cancelar</button></div>`);
    } else {
      q = await askRemote(p, { kind: 'pick', offer, yes });
    }
    if (q !== 'no' && q != null && yes.includes(Number(q)) && g.playerTrade(p, Number(q), give, get)) afterAction();
    return '';
  }

  /* ---------- fichas de jugador, menú y reglas ---------- */
  $('#players').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-p]');
    if (!b || !g) return;
    const s = g.s, i = Number(b.dataset.p), pl = s.players[i], dev = MODES[s.mode].dev;
    const kind = pl.ai ? (pl.away ? 'Juega la máquina mientras está fuera' : 'Máquina') : net && pl.device !== myDev ? (connected(i) ? 'Persona en otro dispositivo' : 'Persona desconectada') : 'Persona';
    dialog(`<h2><i class="dot" style="--c:${colorOf(i)}"></i>${esc(pl.name)}</h2>
      <p class="muted">${kind}</p>
      <table class="facts">
        <tr><td>Puntos a la vista</td><td>${g.points(i, false)}</td></tr>
        <tr><td>Cartas de recurso</td><td>${total(pl.res)}</td></tr>
        ${dev ? `<tr><td>Cartas de cocina en mano</td><td>${pl.dev.length}</td></tr><tr><td>Chefs jugados</td><td>${pl.chefs}${s.army.p === i ? ' · Gran Brigada' : ''}</td></tr>` : ''}
        <tr><td>Ruta más larga</td><td>${pl.road}${s.longest.p === i ? ' · Gran Ruta' : ''}</td></tr>
        <tr><td>Huertas / bodegas</td><td>${5 - pl.huertas} / ${4 - pl.bodegas}</td></tr>
        <tr><td>Caminos por colocar</td><td>${pl.roads}</td></tr>
      </table>
      <button class="btn wide" data-close="ok">Cerrar</button>`);
  });

  function rulesHtml() {
    const cost = (k, name, what) => `<tr><td><b>${name}</b><small>${what}</small></td><td class="cost">${costIcons(COSTS[k])}</td></tr>`;
    return `<h2>Cómo se juega</h2>
      <div class="rules">
      <p>Gana quien llegue primero a los puntos de la partida. Cada <b>huerta</b> vale 1 punto y cada <b>bodega</b> 2.</p>
      <h3>Tu turno</h3>
      <p>1. Tira los dados: cada parcela con ese número da su recurso a quien tenga una huerta (1 carta) o una bodega (2 cartas) en sus esquinas.<br>
      2. Construye y comercia cuanto quieras.<br>3. Termina el turno.</p>
      <h3>Parcelas</h3>
      <p class="legend">${RES.map((r) => `<span>${icon(r, 18)}${RES_INFO[r].terrain} → ${low(r)}</span>`).join('')}</p>
      <h3>Costes</h3>
      <table class="facts">
        ${cost('camino', 'Camino', 'Une tus huertas y te deja llegar a nuevos cruces')}
        ${cost('huerta', 'Huerta', '1 punto. Al final de un camino tuyo y a dos cruces de cualquier otra')}
        ${cost('bodega', 'Bodega', '2 puntos. Sustituye a una huerta y produce el doble')}
        ${cost('carta', 'Carta de cocina', 'Chef, Estrella, Obras, Buena cosecha o Exclusiva')}
      </table>
      <h3>El Cítrico Gastronómico</h3>
      <p>Con un 7 nadie recibe nada: quien tenga más de 7 cartas descarta la mitad, y quien tiró mueve al Cítrico Gastronómico. La parcela donde está no produce, y se roba una carta a un rival que tenga allí una huerta o bodega.</p>
      <h3>Comercio</h3>
      <p>Con la banca, 4 cartas iguales por 1. Con una huerta en un puerto, 3:1 o 2:1 del recurso del puerto. En la partida Completa también puedes proponer cambios a tus rivales.</p>
      <h3>Puntos extra</h3>
      <p><b>Gran Ruta</b>: 2 puntos para la ruta continua más larga (mínimo 5 caminos). <b>Gran Brigada</b>: 2 puntos para quien más chefs haya jugado (mínimo 3). Cada <b>Estrella</b> vale 1 punto secreto.</p>
      <h3>Jugar en red</h3>
      <p>Una persona crea la sala y los demás se unen con el código de 4 letras, cada uno desde su móvil y viendo solo su mano.
      Quien crea la sala lleva la partida (y las máquinas): si cierra la app, la partida se para hasta que vuelva. Si alguien se
      desconecta, puede volver a entrar con el mismo código, o quien lleva la sala puede dejar que la máquina juegue por él.</p>
      <p class="muted">La partida Sencilla no tiene puertos ni cartas de cocina y se juega a 8 puntos.</p>
      </div>
      <button class="btn primary wide" data-close="ok">Entendido</button>`;
  }

  $('#btn-help').addEventListener('click', () => dialog(rulesHtml()));
  $('#btn-menu').addEventListener('click', async () => {
    const where = net ? `<p class="muted">Sala <b>${esc(net.code)}</b> · ${isHost() ? 'la llevas tú: si cierras la app, la partida se para hasta que vuelvas' : 'puedes salir y volver a entrar cuando quieras'}.</p>` : '';
    const r = await dialog(`<h2>Menú</h2>${where}<div class="list">
      ${net ? '<button class="btn wide" data-close="share">Invitar a la sala</button>' : ''}
      <button class="btn wide" data-close="rules">Cómo se juega</button>
      ${isGuest() ? '' : `<button class="btn wide" data-close="speed">Máquina: ${prefs.fast ? 'rápida' : 'normal'}</button>`}
      <button class="btn wide" data-close="exit">${isGuest() ? 'Salir de la sala' : 'Salir al inicio (la partida se guarda)'}</button>
      ${isHost() ? '<button class="btn wide" data-close="quit">Cerrar la sala y terminar la partida</button>' : ''}
      <button class="btn primary wide" data-close="back">Seguir jugando</button></div>`);
    if (r === 'rules') dialog(rulesHtml());
    else if (r === 'share') shareRoom();
    else if (r === 'speed') { prefs.fast = !prefs.fast; store(PREF_KEY, prefs); toast('Máquina ' + (prefs.fast ? 'rápida' : 'normal')); }
    else if (r === 'exit') { save(); showMenu(); }
    else if (r === 'quit') {
      const c = await dialog(`<h2>¿Cerrar la sala?</h2><p>Se terminará la partida para todos y se borrará la partida guardada.</p>
        <div class="row"><button class="btn" data-close="no">No</button><button class="btn primary" data-close="yes">Cerrar la sala</button></div>`);
      if (c === 'yes') { net.room.broadcast({ t: 'end' }); store(SAVE_KEY, null); showMenu(); }
    }
  });

  /* ====================================================================
     Partidas en red
     ==================================================================== */
  function netError(e) {
    switch (e) {
      case 'peer-unavailable': return 'No hay ninguna sala abierta con ese código.';
      case 'timeout': return 'La sala no responde. Comprueba el código y que quien la creó tenga el juego abierto.';
      case 'unavailable-id': return 'Ese código de sala sigue ocupado. Prueba otra vez en un momento.';
      case 'browser-incompatible': return 'Este navegador no permite jugar en red.';
      case 'nomodule': return 'No se ha podido cargar el módulo de red. Comprueba la conexión y recarga.';
      default: return 'No se puede conectar con el servidor de salas. ¿Hay internet?';
    }
  }

  function askName(kind, code) {
    if (!Net.available()) { toast(netError('nomodule')); return; }
    const first = $('[data-name="0"]');
    const name = prefs.netName || (first && first.value.trim()) || '';
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const level = document.querySelector('input[name="level"]:checked').value;
    const m = openModal(`<h2>${kind === 'host' ? 'Crear una sala' : 'Unirse a una sala'}</h2>
      ${kind === 'host' ? `<p class="muted">Partida ${esc(MODES[mode].name.toLowerCase())}, con máquinas en nivel ${esc(LEVELS[level].name.toLowerCase())}. Lo puedes cambiar en el inicio antes de crearla.</p>` : ''}
      <label class="field">Tu nombre<input id="f-name" type="text" maxlength="12" value="${esc(name)}" autocomplete="nickname"></label>
      ${kind === 'join' ? `<label class="field">Código de la sala<input id="f-code" class="codein" type="text" maxlength="4" value="${esc(code || '')}" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD"></label>` : ''}
      <p class="muted" id="f-msg"></p>
      <div class="row"><button class="btn" data-x="close">Cancelar</button><button class="btn primary" data-x="go">${kind === 'host' ? 'Crear' : 'Entrar'}</button></div>`);
    const nameIn = m.el.querySelector('#f-name'), codeIn = m.el.querySelector('#f-code');
    (kind === 'join' && !code ? codeIn : nameIn).focus();
    if (codeIn) codeIn.addEventListener('input', () => { codeIn.value = Net.cleanCode(codeIn.value); });
    const go = async () => {
      const nm = nameIn.value.trim().slice(0, 12);
      const msg = m.el.querySelector('#f-msg');
      if (!nm) { msg.innerHTML = '<b class="refused">Escribe tu nombre.</b>'; return; }
      const c = codeIn ? Net.cleanCode(codeIn.value) : '';
      if (codeIn && c.length !== 4) { msg.innerHTML = '<b class="refused">El código tiene 4 letras.</b>'; return; }
      prefs.netName = nm;
      store(PREF_KEY, prefs);
      m.el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      msg.textContent = 'Conectando…';
      const ok = kind === 'host' ? await createRoom(nm, mode, level) : await joinRoom(c, nm, true);
      if (ok === true) { m.close(); return; }
      msg.innerHTML = `<b class="refused">${esc(ok)}</b>`;
      m.el.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    };
    m.el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.x === 'close') m.close();
      if (b.dataset.x === 'go') go();
    });
    m.el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); });
  }

  function netHandlers() {
    return {
      onJoin: (dev, hello) => hostJoin(dev, hello),
      onLeave: (dev) => hostLeave(dev),
      onMessage: (from, msg) => (isHost() ? hostMessage(from, msg) : guestMessage(msg)),
      onStatus: (st) => guestStatus(st)
    };
  }

  function leaveNet() {
    if (net) net.room.close();
    net = null;
    lobby = null;
    online = {};
    lastSent = '';
    asks.forEach((a) => a.resolve(null)); asks.clear();
    waits.forEach((w) => w('has salido de la sala.')); waits.clear();
    $('#netbar').hidden = true;
  }

  /* ---------- anfitrión ---------- */
  async function hostRoom(code) {
    leaveNet();
    const room = new Net.Room(ROOM_PREFIX, netHandlers());
    net = { role: 'host', room, code: '' };
    net.code = await room.open(code);
    return net.code;
  }

  async function createRoom(name, mode, level) {
    try {
      await hostRoom();
    } catch (e) {
      leaveNet();
      return netError(e);
    }
    lobby = { players: [{ name, dev: myDev, ai: false }], mode, level };
    showLobby();
    return true;
  }

  function lobbyMsg() {
    return { t: 'lobby', code: net.code, mode: lobby.mode, level: lobby.level,
      players: lobby.players.map((p) => ({ name: p.name, ai: p.ai, dev: p.dev, on: p.ai || p.dev === myDev || net.room.online(p.dev) })) };
  }
  function lobbyChanged() {
    net.room.broadcast(lobbyMsg());
    showLobby();
  }

  function hostJoin(dev, hello) {
    const name = String(hello.name || '').trim().slice(0, 12) || 'Invitado';
    if (g) {
      const seat = g.s.players.findIndex((pl) => pl.device === dev);
      if (seat < 0) { net.room.kick(dev, { t: 'kick', why: 'La partida de esta sala ya ha empezado.' }); return; }
      const pl = g.s.players[seat];
      if (pl.away) {
        pl.ai = false; pl.away = false;
        g.log(pl.name + ' vuelve a la partida', seat);
      }
      online[dev] = true;
      toast(`${esc(pl.name)} se ha conectado`);
      lastSent = '';
      if (busy) render(); else pump();
      return;
    }
    if (!lobby) return;
    const known = lobby.players.find((p) => p.dev === dev);
    if (known) known.name = name;
    else if (lobby.players.length >= 4) { net.room.kick(dev, { t: 'kick', why: 'La sala está llena.' }); return; }
    else lobby.players.push({ name, dev, ai: false });
    lobbyChanged();
  }

  function hostLeave(dev) {
    online[dev] = false;
    asks.forEach((a, id) => { if (a.dev === dev) { asks.delete(id); a.resolve(null); } });
    if (!g && lobby) {
      lobby.players = lobby.players.filter((p) => p.dev !== dev);
      lobbyChanged();
      return;
    }
    if (g) {
      const seat = g.s.players.findIndex((pl) => pl.device === dev);
      if (seat >= 0) toast(`${esc(g.s.players[seat].name)} se ha desconectado`);
      lastSent = '';
      render();
    }
  }

  function hostMessage(dev, m) {
    if (m.t === 'answer') {
      const a = asks.get(m.id);
      if (a && a.dev === dev) { asks.delete(m.id); a.resolve(m.value); }
      return;
    }
    if (m.t !== 'act' || !g) return;
    const seat = g.s.players.findIndex((pl) => pl.device === dev && !pl.ai);
    if (seat < 0) return;
    if (m.cmd === 'trade') { hostTrade(dev, seat, m); return; }
    if (apply(seat, String(m.cmd), m.args)) afterAction();
    else { net.room.send(dev, { t: 'msg', html: 'Ahora no se puede.' }); lastSent = ''; render(); }
  }

  async function hostTrade(dev, seat, m) {
    const a = Array.isArray(m.args) ? m.args : [];
    const refused = await resolveProposal(seat, resMap(a[0]), resMap(a[1]));
    if (net) net.room.send(dev, { t: 'tradeRes', rid: m.rid, html: refused });
  }

  /* Manda el estado a los invitados cuando cambia */
  function sync() {
    if (!isHost() || !g) return;
    const on = {};
    g.s.players.forEach((pl) => { if (pl.device) on[pl.device] = pl.device === myDev || net.room.online(pl.device); });
    online = on;
    const key = JSON.stringify(g.s) + JSON.stringify(on);
    if (key === lastSent) return;
    lastSent = key;
    net.room.broadcast({ t: 'state', s: g.s, online: on });
  }

  async function takeover() {
    const w = waitingOn();
    if (!isHost() || w < 0 || local(w) || connected(w)) return;
    const pl = g.s.players[w];
    const r = await dialog(`<h2>¿Juega la máquina?</h2><p>${esc(pl.name)} se ha desconectado. La máquina jugará por esta persona hasta que vuelva a entrar en la sala.</p>
      <div class="row"><button class="btn" data-close="no">Esperar</button><button class="btn primary" data-close="yes">Que juegue la máquina</button></div>`);
    if (r !== 'yes' || connected(w) || pl.ai) return;
    pl.ai = true; pl.away = true;
    g.log('La máquina juega por ' + pl.name + ' mientras está fuera', w);
    if (busy) render(); else pump();
  }

  function startNetGame() {
    if (!lobby || lobby.players.length < 2) return;
    const players = lobby.players.map((p, i) => ({ name: p.name, ai: p.ai, device: p.ai ? null : p.dev, color: i }));
    g = Game.create({ mode: lobby.mode, level: lobby.level, players });
    g.s.net = { room: net.code };
    lobby = null;
    lastSent = '';
    viewer = mySeat();
    startGame();
  }

  /* ---------- invitado ---------- */
  async function joinRoom(code, name, fromDialog) {
    leaveNet();
    const room = new Net.Room(ROOM_PREFIX, netHandlers());
    net = { role: 'guest', room, code };
    try {
      await room.join(code, { dev: myDev, name });
    } catch (e) {
      leaveNet();
      if (!fromDialog) toast(netError(e));
      return netError(e);
    }
    store(NET_KEY, { code, name });
    g = null;
    overShown = false;
    if (!fromDialog) toast(`Conectado a la sala ${esc(code)}`);
    showLobby({ t: 'lobby', code, players: [] });
    return true;
  }

  function guestStatus(st) {
    if (!isGuest()) return;
    const bar = $('#netbar');
    if (st === 'reconnecting') { bar.hidden = false; bar.textContent = 'Se ha perdido la conexión con la sala. Reintentando…'; }
    else if (st === 'online') bar.hidden = true;
  }

  async function guestMessage(m) {
    switch (m.t) {
      case 'lobby': if (!g) showLobby(m); return;
      case 'state': adopt(m); return;
      case 'ask': {
        if (!g) return;
        const me = mySeat();
        let value = null;
        const offer = m.offer && typeof m.offer === 'object' ? { from: int(m.offer.from), give: resMap(m.offer.give), get: resMap(m.offer.get) } : null;
        if (offer && g.s.players[offer.from]) {
          if (m.kind === 'offer') value = await askHuman(me, offer);
          else if (m.kind === 'pick') {
            const yes = (Array.isArray(m.yes) ? m.yes : []).map(int).filter((i) => g.s.players[i]);
            value = await dialog(`<h2>${yes.length === 1 ? 'Hay trato' : '¿Con quién cambias?'}</h2>${offerHtml(offer, 'Das', 'Recibes')}
              <div class="list">${yes.map((i) => `<button class="btn primary wide" data-close="${i}">
                <i class="dot" style="--c:${colorOf(i)}"></i>Cambiar con ${esc(g.s.players[i].name)}</button>`).join('')}
              <button class="btn wide" data-close="no">Cancelar</button></div>`);
          }
        }
        if (net) net.room.toHost({ t: 'answer', id: m.id, value });
        return;
      }
      case 'tradeRes': {
        const w = waits.get(m.rid);
        if (w) { waits.delete(m.rid); w(String(m.html || '')); }
        return;
      }
      case 'msg': toast(esc(m.html || '')); return;
      case 'kick': store(NET_KEY, null); showMenu(); toast(esc(m.why || 'No se puede entrar en la sala.')); return;
      case 'end':
        store(NET_KEY, null);
        if (g && g.s.phase === 'over') { leaveNet(); return; }
        showMenu();
        toast('Se ha cerrado la sala.');
    }
  }

  /* Copia el estado que manda el anfitrión */
  function adopt(m) {
    const s = m.s;
    if (!s || !Array.isArray(s.players) || !MODES[s.mode] || !Array.isArray(s.hexes)) return;
    const first = !g;
    g = new Game(s);
    online = m.online && typeof m.online === 'object' ? m.online : {};
    viewer = mySeat();
    if (first) {
      closeModals();
      seenSteal = s.lastSteal;
      diceKey = '';
      devSeen = { viewer: -1, n: 0 };
      prompting = { discard: false, steal: false };
      lastTurnSeen = -1;
      $('#menu').hidden = true;
      $('#lobby').hidden = true;
      $('#game').hidden = false;
      $('#goal').textContent = MODES[s.mode].name + ' · a ' + MODES[s.mode].target + ' puntos · ' + LEVELS[s.level || 'normal'].name + ' · sala ' + net.code;
      keepAwake();
    }
    render();
    noteSteal();
    announce();
    prompts();
    if (s.phase === 'over' && !overShown) { overShown = true; gameOver(); }
  }

  /* ---------- sala de espera ---------- */
  function showLobby(m) {
    const host = isHost();
    const info = host ? lobbyMsg() : m;
    if (!info) return;
    const players = info.players || [];
    const mode = MODES[info.mode], level = LEVELS[info.level];
    const hostName = players[0] ? esc(players[0].name) : 'quien ha creado la sala';
    $('#lobbycard').innerHTML = `
      <header class="brand"><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 4l24.2 14v28L32 60 7.8 46V18z" fill="#f6ecd8" stroke="#7a2e3f" stroke-width="3" stroke-linejoin="round"/>
        <use href="#i-aceite" x="18" y="16" width="28" height="28"/></svg>
        <div><h1>Sala</h1><p>${mode ? 'Partida ' + mode.name.toLowerCase() + ' · máquinas en nivel ' + level.name.toLowerCase() : 'Conectando…'}</p></div></header>
      <div class="roomcode" aria-label="Código de la sala">${esc(info.code || net.code)}</div>
      <p class="muted tc">${host ? 'Los demás abren el juego, pulsan «Unirse» y escriben este código. O mándales el enlace:' : `Esperando a que ${hostName} empiece la partida…`}</p>
      ${host ? '<button class="btn wide" data-l="share">Compartir el enlace de la sala</button>' : ''}
      <h2>Jugadores (${players.length}/4)</h2>
      <div class="lslots">${players.map((p, i) => `
        <div class="lslot">
          <i class="dot" style="--c:${COLORS[i]}"></i>
          <span class="lname">${esc(p.name)}</span>
          <span class="ltag">${p.ai ? 'Máquina' : p.dev === myDev ? 'Tú' : i === 0 ? 'Crea la sala' : p.on === false ? 'Desconectado' : 'Conectado'}</span>
          ${host && i > 0 ? `<button class="iconbtn" data-l="rm" data-i="${i}" aria-label="Quitar">✕</button>` : ''}
        </div>`).join('')}</div>
      ${host ? `<button class="btn wide" data-l="ai" ${players.length >= 4 ? 'disabled' : ''}>＋ Añadir una máquina</button>
        <button class="btn primary big" data-l="start" ${players.length < 2 ? 'disabled' : ''}>Empezar la partida</button>
        <p class="muted tc">${players.length < 2 ? 'Hace falta al menos otro jugador (persona o máquina).' : 'Cuando empiece, ya no podrá entrar nadie más.'}</p>` : ''}
      <button class="btn ghost wide" data-l="leave">${host ? 'Cerrar la sala' : 'Salir de la sala'}</button>`;
    $('#menu').hidden = true;
    $('#game').hidden = true;
    $('#lobby').hidden = false;
  }

  $('#lobby').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-l]');
    if (!b || b.disabled) return;
    switch (b.dataset.l) {
      case 'share': shareRoom(); break;
      case 'ai': {
        if (!lobby || lobby.players.length >= 4) return;
        const used = lobby.players.map((p) => p.name);
        const name = AI_NAMES.find((n) => !used.includes(n)) || 'Máquina';
        lobby.players.push({ name, dev: null, ai: true });
        lobbyChanged();
        break;
      }
      case 'rm': {
        const i = Number(b.dataset.i);
        const p = lobby && lobby.players[i];
        if (!p || i === 0) return;
        lobby.players.splice(i, 1);
        if (p.dev) net.room.kick(p.dev, { t: 'kick', why: 'Te han quitado de la sala.' });
        lobbyChanged();
        break;
      }
      case 'start': startNetGame(); break;
      case 'leave':
        if (isHost()) net.room.broadcast({ t: 'end' });
        store(NET_KEY, null);
        setTimeout(showMenu, 150);
        break;
    }
  });

  async function shareRoom() {
    if (!net) return;
    const url = location.origin + location.pathname + '?sala=' + net.code;
    const text = `¡Juega conmigo a La Despensa! Sala ${net.code}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'La Despensa', text, url }); return; }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text + ': ' + url);
      toast('Enlace copiado. Pégalo en un mensaje.');
    } catch (e) {
      toast(`Código de la sala: <b>${esc(net.code)}</b>`);
    }
  }

  /* Mantener la pantalla encendida durante una partida en red */
  async function keepAwake() {
    try { if (navigator.wakeLock && !wake && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; }
    if (wake) wake.addEventListener('release', () => { wake = null; });
  }
  function releaseWake() {
    if (wake) try { wake.release(); } catch (e) { /* nada */ }
    wake = null;
  }
  document.addEventListener('visibilitychange', () => { if (net && g && document.visibilityState === 'visible') keepAwake(); });

  /* ---------- arranque ---------- */
  prefs = Object.assign(prefs, load(PREF_KEY) || {});
  initMenu();
  showMenu();
  const code = Net.cleanCode(new URLSearchParams(location.search).get('sala'));
  if (code.length === 4) {
    history.replaceState(null, '', location.pathname);
    askName('join', code);
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
