/* La Despensa — interfaz */
(function () {
  'use strict';
  const { Game, GEO, RES, RES_INFO, COSTS, MODES, LEVELS, DEV_INFO, PIPS, emptyRes, total, resText } = window.Despensa;
  const AI = window.DespensaAI;

  const SAVE_KEY = 'la-despensa.partida';
  const PREF_KEY = 'la-despensa.ajustes';
  const COLORS = ['#d8432f', '#2f6db5', '#f0a31c', '#f7f3ea'];
  const AI_NAMES = ['Rosa', 'Paco', 'Lola', 'Curro'];
  const TERRAIN = { aceite: '#b9c97a', vino: '#c9a0bd', trigo: '#f0d584', pescado: '#8fd0d6', sal: '#f3e6e2' };
  const BUILD_NAMES = { camino: 'Camino', huerta: 'Huerta', bodega: 'Bodega', carta: 'Carta' };

  const $ = (sel) => document.querySelector(sel);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const icon = (id, size) => `<svg class="ic" width="${size || 20}" height="${size || 20}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const low = (r) => RES_INFO[r].name.toLowerCase();

  let g = null;        // partida en curso
  let viewer = -1;     // jugador cuya mano se muestra
  let uiMode = null;   // 'camino' | 'huerta' | 'bodega' mientras se elige dónde construir
  let busy = false;    // la máquina está jugando o hay un diálogo de turno abierto
  let seenSteal = null;
  let overShown = false;
  let diceKey = '';
  let prefs = { fast: false };

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
    if (!g) return;
    store(SAVE_KEY, g.s.phase === 'over' ? null : { s: g.s, viewer });
  }

  /* ---------- diálogos y avisos ---------- */
  function openModal(html, cls) {
    const wrap = document.createElement('div');
    wrap.className = 'backdrop ' + (cls || '');
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    return { el: wrap.firstElementChild, close: () => wrap.remove() };
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
      g = Game.create({ mode, level, players });
      viewer = humans().length === 1 ? humans()[0] : -1;
      startGame();
    });
    $('#btn-continue').addEventListener('click', () => {
      const data = load(SAVE_KEY);
      if (!data || !data.s) return showMenu();
      g = new Game(data.s);
      viewer = data.viewer;
      startGame();
    });
    const hint = () => { $('#level-hint').textContent = LEVELS[document.querySelector('input[name="level"]:checked').value].text; };
    $('#levels').addEventListener('change', hint);
    hint();
    $('#btn-rules').addEventListener('click', () => dialog(rulesHtml()));
  }

  function showMenu() {
    const data = load(SAVE_KEY);
    $('#btn-continue').hidden = !(data && data.s && data.s.version === 1 && data.s.phase !== 'over');
    $('#game').hidden = true;
    $('#menu').hidden = false;
  }

  function startGame() {
    uiMode = null;
    busy = false;
    overShown = false;
    diceKey = '';
    seenSteal = g.s.lastSteal;
    $('#menu').hidden = true;
    $('#game').hidden = false;
    $('#goal').textContent = MODES[g.s.mode].name + ' · a ' + MODES[g.s.mode].target + ' puntos · ' + LEVELS[g.s.level || 'normal'].name;
    pump();
  }

  /* ---------- ayudas ---------- */
  const humans = () => g.s.players.map((p, i) => i).filter((i) => !g.s.players[i].ai);
  const colorOf = (p) => COLORS[g.s.players[p].color];
  const humanTurn = () => !g.s.players[g.s.current].ai && viewer === g.s.current;
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
  }

  function renderPlayers() {
    const s = g.s, dev = MODES[s.mode].dev;
    $('#players').innerHTML = s.players.map((pl, i) => `
      <button class="pchip${i === s.current && s.phase !== 'over' ? ' on' : ''}" data-p="${i}" style="--c:${colorOf(i)}">
        <span class="pname"><i class="dot"></i>${esc(pl.name)}</span>
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
      dots[n].map(([x, y]) => `<circle cx="${x * 5.8}" cy="${y * 5.8}" r="2.2"/>`).join('')}</svg>`;
    $('#dice').innerHTML = s.dice ? die(s.dice[0]) + die(s.dice[1]) + `<b>${s.dice[0] + s.dice[1]}</b>` : '';
  }

  function statusText() {
    const s = g.s, pl = s.players[s.current];
    if (s.phase === 'over') return '¡' + esc(s.players[s.winner].name) + ' gana la partida!';
    if (viewer < 0 && humans().length) return 'Pasando el turno…';
    if (s.phase === 'discard') return 'Ha salido un 7: quien tenga más de 7 cartas descarta la mitad';
    if (pl.ai || !humanTurn()) return 'Juega ' + esc(pl.name) + '…';
    const who = humans().length > 1 ? esc(pl.name) + ': ' : '';
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

  const costIcons = (cost) => RES.filter((r) => cost[r]).map((r) => icon(r, 14).repeat(cost[r])).join('');

  function renderActions() {
    const s = g.s, p = s.current, el = $('#actions'), ok = canAct();
    el.classList.toggle('five', !MODES[s.mode].dev);
    if (s.phase === 'over') {
      el.innerHTML = '<button class="btn primary big" data-act="new">Nueva partida</button>';
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
      `<p>${l.p === null ? '' : `<i class="dot" style="--c:${colorOf(l.p)}"></i>`}${esc(l.text)}</p>`).join('');
  }

  /* ---------- bucle de la partida ---------- */
  async function pump() {
    if (busy || !g) return;
    busy = true;
    try {
      for (;;) {
        if (!g) return; // se ha salido al inicio
        const s = g.s;
        render();
        save();
        noteSteal();
        if (s.phase === 'over') {
          if (!overShown) { overShown = true; await gameOver(); }
          return;
        }
        if (s.phase === 'discard') {
          const h = Object.keys(s.pending).map(Number).find((i) => !s.players[i].ai);
          if (h !== undefined) { await humanDiscard(h); continue; }
        } else if (!s.players[s.current].ai) {
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
      render();
    }
  }

  function noteSteal() {
    const ls = g.s.lastSteal;
    if (!ls || ls === seenSteal) return;
    seenSteal = ls;
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
    if (viewer !== h) {
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
        } else if ('ok' in b.dataset && g.discard(h, sel)) {
          m.close();
          resolve();
        }
      });
      draw();
    });
  }

  async function humanSteal() {
    const s = g.s;
    const q = await dialog(`<h2>¿A quién robas una carta?</h2><div class="list">${s.stealFrom.map((i) => `
      <button class="btn wide" data-close="${i}"><i class="dot" style="--c:${colorOf(i)}"></i>${esc(s.players[i].name)} · ${total(s.players[i].res)} cartas</button>`).join('')}</div>`);
    g.steal(Number(q));
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

  async function resolveAiOffer(offer) {
    const s = g.s, n = s.players.length;
    const others = [];
    for (let d = 1; d < n; d++) others.push((offer.from + d) % n);
    others.sort((a, b) => s.players[a].ai - s.players[b].ai); // primero las personas
    for (const q of others) {
      if (!g.canAfford(q, offer.get)) continue;
      const yes = s.players[q].ai ? AI.accepts(g, q, offer) : await askHuman(q, offer);
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
    if (r === 'new') showMenu();
  }

  /* ---------- acciones de la persona ---------- */
  function afterAction() {
    uiMode = null;
    pump();
  }

  $('#board').addEventListener('click', (ev) => {
    if (!g || !canAct()) return;
    const el = ev.target.closest('[data-v],[data-e],[data-h]');
    if (!el) return;
    const s = g.s, d = el.dataset;
    let done = false;
    if (d.v !== undefined) {
      const v = Number(d.v);
      if (s.phase === 'setup') done = g.placeSetupHuerta(v);
      else if (uiMode === 'huerta') done = g.buildHuerta(v);
      else if (uiMode === 'bodega') done = g.buildBodega(v);
    } else if (d.e !== undefined) {
      const e = Number(d.e);
      done = s.phase === 'setup' ? g.placeSetupRoad(e) : g.buildRoad(e);
    } else if (d.h !== undefined) {
      done = g.moveCritic(Number(d.h));
    }
    if (done) afterAction();
  });

  $('#actions').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled || !g) return;
    const act = b.dataset.act;
    if (act === 'new') return showMenu();
    if (!canAct()) return;
    if (act === 'roll') { g.roll(); afterAction(); }
    else if (act === 'end') { g.endTurn(); afterAction(); }
    else if (act === 'trade') { uiMode = null; render(); openTrade(); }
    else if (act === 'carta') {
      const pl = g.s.players[g.s.current];
      if (g.buyDev()) toast(`Nueva carta: ${icon(pl.dev[pl.dev.length - 1].type, 18)} ${DEV_INFO[pl.dev[pl.dev.length - 1].type].name}`);
      afterAction();
    } else {
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
    if (g.playDev(type, arg)) afterAction();
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
    const s = g.s, p = s.current, pl = s.players[p];
    const withPlayers = MODES[s.mode].playerTrade;
    let tab = 'bank', give = null, get = null, note = '';
    const off = { g: emptyRes(), w: emptyRes() };
    const m = openModal('');
    const draw = () => {
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
          <button class="btn primary" data-do="offer"${total(off.g) && total(off.w) ? '' : ' disabled'}>Proponer</button></div>`;
      }
      m.el.innerHTML = o;
    };
    m.el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button');
      if (!b || b.disabled) return;
      const d = b.dataset;
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
        if (g.bankTrade(give, get)) {
          note = `Hecho: ${g.tradeRatio(p, give)} ${low(give)} por 1 ${low(get)}.`;
          if (pl.res[give] < g.tradeRatio(p, give)) give = null;
          render();
          save();
        }
      } else if (d.do === 'offer') {
        m.close();
        const refused = await proposeTrade(p, off.g, off.w);
        render();
        save();
        if (refused) {
          note = '<b class="refused">Nadie acepta.</b> ' + refused;
          document.body.appendChild(m.el.parentNode);
          draw();
          const el = m.el.querySelector('.refused');
          if (el) el.parentNode.scrollIntoView({ block: 'nearest' });
        }
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

  async function proposeTrade(p, give, get) {
    const s = g.s, n = s.players.length, offer = { from: p, give, get };
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
      else r = (await askHuman(q, offer)) ? { ok: true } : { ok: false, why: 'no' };
      if (r.ok) yes.push(q);
      else no.push(esc(s.players[q].name) + ' ' + why(r));
    }
    if (!yes.length) return 'Por ' + resText(give) + ' a cambio de ' + resText(get) + ': ' + no.join('; ') + '.';
    const q = await dialog(`<h2>${yes.length === 1 ? 'Hay trato' : '¿Con quién cambias?'}</h2>${offerHtml(offer, 'Das', 'Recibes')}
      <div class="list">${yes.map((i) => `<button class="btn primary wide" data-close="${i}">
        <i class="dot" style="--c:${colorOf(i)}"></i>Cambiar con ${esc(s.players[i].name)}</button>`).join('')}
      <button class="btn wide" data-close="no">Cancelar</button></div>`);
    if (q !== 'no') g.playerTrade(p, Number(q), give, get);
    return '';
  }

  /* ---------- fichas de jugador, menú y reglas ---------- */
  $('#players').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-p]');
    if (!b || !g) return;
    const s = g.s, i = Number(b.dataset.p), pl = s.players[i], dev = MODES[s.mode].dev;
    dialog(`<h2><i class="dot" style="--c:${colorOf(i)}"></i>${esc(pl.name)}</h2>
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
      <p class="muted">La partida Sencilla no tiene puertos ni cartas de cocina y se juega a 8 puntos.</p>
      </div>
      <button class="btn primary wide" data-close="ok">Entendido</button>`;
  }

  $('#btn-help').addEventListener('click', () => dialog(rulesHtml()));
  $('#btn-menu').addEventListener('click', async () => {
    const r = await dialog(`<h2>Menú</h2><div class="list">
      <button class="btn wide" data-close="rules">Cómo se juega</button>
      <button class="btn wide" data-close="speed">Máquina: ${prefs.fast ? 'rápida' : 'normal'}</button>
      <button class="btn wide" data-close="exit">Salir al inicio (la partida se guarda)</button>
      <button class="btn primary wide" data-close="back">Seguir jugando</button></div>`);
    if (r === 'rules') dialog(rulesHtml());
    else if (r === 'speed') { prefs.fast = !prefs.fast; store(PREF_KEY, prefs); toast('Máquina ' + (prefs.fast ? 'rápida' : 'normal')); }
    else if (r === 'exit') { save(); g = null; showMenu(); }
  });

  /* ---------- arranque ---------- */
  prefs = Object.assign(prefs, load(PREF_KEY) || {});
  initMenu();
  showMenu();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
