/* T-Spin Dojo UI: Learn page (animated lessons) and Practice page (playable drills). */
(function () {
  'use strict';

  const E = window.TW;
  const SETUPS = window.TW_SETUPS;
  const BUILDS = window.TW_BUILDS;
  const MIRROR_PIECE = { I: 'I', O: 'O', T: 'T', J: 'L', L: 'J', S: 'Z', Z: 'S' };
  const COLS = E.COLS, ROWS = E.ROWS, HIDDEN = E.HIDDEN, VIS = ROWS - HIDDEN;
  const CELL = 28;
  const BW = COLS * CELL, BH = VIS * CELL;

  const COLORS = {
    I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c', G: '#6b7399'
  };
  const $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------ drawing */
  function fit(canvas, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = function (v) { return Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt)))); };
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
  function drawCell(ctx, x, y, s, type, alpha) {
    const c = COLORS[type] || COLORS.G;
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = shade(c, -0.35);
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = c;
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.fillStyle = shade(c, 0.45);
    ctx.fillRect(x + 2, y + 2, s - 4, Math.max(2, s * 0.14));
    ctx.fillRect(x + 2, y + 2, Math.max(2, s * 0.14), s - 4);
    ctx.restore();
  }
  function drawBoard(ctx, board, o) {
    o = o || {};
    ctx.fillStyle = '#0d0e15';
    ctx.fillRect(0, 0, BW, BH);
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) { ctx.moveTo(c * CELL + .5, 0); ctx.lineTo(c * CELL + .5, BH); }
    for (let r = 1; r < VIS; r++) { ctx.moveTo(0, r * CELL + .5); ctx.lineTo(BW, r * CELL + .5); }
    ctx.stroke();
    for (let r = HIDDEN; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) drawCell(ctx, c * CELL, (r - HIDDEN) * CELL, CELL, board[r][c]);
    if (o.target) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e9d5ff';
      ctx.fillStyle = 'rgba(168,85,247,.25)';
      E.cellsOf(o.target).forEach(function (p) {
        if (p[1] < HIDDEN) return;
        ctx.fillRect(p[0] * CELL + 2, (p[1] - HIDDEN) * CELL + 2, CELL - 4, CELL - 4);
        ctx.strokeRect(p[0] * CELL + 3, (p[1] - HIDDEN) * CELL + 3, CELL - 6, CELL - 6);
      });
      ctx.restore();
    }
    if (o.ghost) {
      E.cellsOf(o.ghost).forEach(function (p) {
        if (p[1] < HIDDEN) return;
        ctx.save();
        ctx.strokeStyle = COLORS[o.ghost.type];
        ctx.globalAlpha = .55;
        ctx.lineWidth = 2;
        ctx.strokeRect(p[0] * CELL + 3, (p[1] - HIDDEN) * CELL + 3, CELL - 6, CELL - 6);
        ctx.restore();
      });
    }
    if (o.piece) {
      E.cellsOf(o.piece).forEach(function (p) {
        if (p[1] >= HIDDEN) drawCell(ctx, p[0] * CELL, (p[1] - HIDDEN) * CELL, CELL, o.piece.type);
      });
    }
    if (o.flashRows && o.flashRows.length) {
      ctx.fillStyle = 'rgba(255,255,255,' + (o.flashAlpha === undefined ? .7 : o.flashAlpha) + ')';
      o.flashRows.forEach(function (r) { ctx.fillRect(0, (r - HIDDEN) * CELL, BW, CELL); });
    }
  }
  function drawMini(ctx, type, cx, cy, s) {
    const cells = E.SHAPES[type][0];
    let x0 = 9, x1 = -1, y0 = 9, y1 = -1;
    cells.forEach(function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); });
    const ox = cx - ((x1 - x0 + 1) * s) / 2, oy = cy - ((y1 - y0 + 1) * s) / 2;
    cells.forEach(function (c) { drawCell(ctx, ox + (c[0] - x0) * s, oy + (c[1] - y0) * s, s, type); });
  }
  function placed(board, piece) {
    const b = E.cloneBoard(board);
    E.cellsOf(piece).forEach(function (c) { if (c[1] >= 0) b[c[1]][c[0]] = piece.type; });
    return b;
  }

  /* ------------------------------------------------------------ scenarios */
  function reverseRow(s) { return s.split('').reverse().join(''); }

  // Build a playable board for a setup, optionally with messy filled rows underneath.
  function makeScenario(setup, mirror, noiseRows) {
    const base = setup.rows.map(function (r) { return mirror ? reverseRow(r) : r; });
    function attempt(rows) {
      const board = E.boardFromRows(rows, false);
      const sol = E.solveT(board, E.isTSD);
      return sol ? { setup: setup, mirror: mirror, rows: rows, board: board, sol: sol } : null;
    }
    if (noiseRows > 0) {
      const last = base[base.length - 1];
      const cols = [];
      for (let c = 0; c < COLS; c++) if (last[c] === 'X') cols.push(c);
      for (let tries = 0; tries < 8; tries++) {
        const rows = base.slice();
        for (let i = 0; i < noiseRows; i++) {
          const hole = cols[Math.floor(Math.random() * cols.length)];
          let row = '';
          for (let c = 0; c < COLS; c++) row += c === hole ? '.' : 'X';
          rows.push(row);
        }
        const s = attempt(rows);
        if (s) return s;
      }
    }
    return attempt(base);
  }

  // The solver's 'hard' is "fall to the resting spot without locking", which in play means holding soft drop.
  // Build drill: bare stack plus a fixed piece queue. Mirroring also swaps J/L and S/Z so it stays solvable.
  function makeBuildScenario(build, mirror) {
    const rows = build.rows.map(function (r) { return mirror ? reverseRow(r) : r; });
    const pieces = build.pieces.map(function (p) { return mirror ? MIRROR_PIECE[p] : p; });
    return {
      kind: 'build', build: build, mirror: mirror, rows: rows, pieces: pieces,
      board: E.boardFromRows(rows, false),
      setup: { id: 'build:' + build.id, name: build.name, spot: [build.tip] }
    };
  }

  const KEYS = { left: '←', right: '→', cw: '↑', ccw: 'Z', hard: '↓ (hold)', soft: '↓', lock: 'Space' };
  const VERBS = {
    left: 'Move left', right: 'Move right', cw: 'Rotate clockwise', ccw: 'Rotate counter-clockwise',
    hard: 'Soft drop to the floor', soft: 'Soft drop one row', lock: 'Hard drop to lock'
  };
  function keyHtml(a) { return '<kbd>' + KEYS[a] + '</kbd>'; }
  // Group consecutive identical actions: [{action, count}]
  function groupActions(actions) {
    const out = [];
    actions.forEach(function (a) {
      const g = out[out.length - 1];
      if (g && g.action === a && a !== 'lock' && a !== 'hard') g.count++;
      else out.push({ action: a, count: 1 });
    });
    return out;
  }

  /* ------------------------------------------------------------ persistence */
  const STORE_KEY = 'twistwise.v1';
  let store = { stats: {}, streak: 0, best: 0, clean: 0, opts: {} };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) store = Object.assign(store, JSON.parse(raw));
  } catch (e) { /* storage unavailable: run without saving */ }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

  const opt = Object.assign({
    mode: 'build', gravity: 0, lockDelay: true, mirror: true, noise: true, name: true, ghost: true,
    enabled: SETUPS.map(function (s) { return s.id; }),
    enabledBuilds: BUILDS.map(function (s) { return s.id; })
  }, store.opts);
  function saveOpts() { store.opts = opt; save(); }

  /* ------------------------------------------------------------ pages */
  let page = 'learn';
  function showPage(p) {
    page = p;
    document.querySelectorAll('.page').forEach(function (el) { el.classList.toggle('active', el.id === 'page-' + p); });
    document.querySelectorAll('.tab').forEach(function (el) {
      const on = el.dataset.page === p;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on);
    });
    if (p !== 'learn') learnPause();
    if (p === 'practice' && !P.scn) startScenario();
    if (p === 'learn' && L.scn && L.playing) learnPlay();
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showPage(b.dataset.page); b.blur(); });
  });
  $('helpBtn').addEventListener('click', function () { $('helpDialog').showModal(); });

  /* ============================================================ LEARN */
  const BUILD_SPOT = [
    'Leave a one-cell hole in the lower of the two rows you are building.',
    'Above that hole keep three cells open in the next row, with a block overhanging one side of the opening.',
    'Every other cell in those two rows must be filled, so both rows clear when the T spins in.'
  ];

  // L.id is a spin setup id, or 'build:<id>' for a build lesson.
  const L = { id: SETUPS[0].id, kind: 'spin', item: SETUPS[0], mirror: false, scn: null, frames: [], groups: [], idx: 0, playing: false, timer: null, altPlans: 0 };
  const lctx = fit($('learnCanvas'), BW, BH);

  function thumbCanvas(rows) {
    const cv = document.createElement('canvas');
    const size = 9, h = rows.length * size;
    const ctx = fit(cv, COLS * size, h);
    ctx.fillStyle = '#0d0e15';
    ctx.fillRect(0, 0, COLS * size, h);
    rows.forEach(function (row, r) {
      for (let c = 0; c < COLS; c++) if (row[c] === 'X' || row[c] === 'G') drawCell(ctx, c * size, r * size, size, 'G');
    });
    return cv;
  }
  function addCard(list, id, rows, title, sub, onClick) {
    const b = document.createElement('button');
    b.className = 'setup-card';
    b.dataset.id = id;
    const t = document.createElement('div');
    t.innerHTML = '<div class="t"></div><div class="l"></div>';
    t.firstChild.textContent = title;
    t.lastChild.textContent = sub;
    b.appendChild(thumbCanvas(rows));
    b.appendChild(t);
    b.addEventListener('click', function () { onClick(); b.blur(); });
    list.appendChild(b);
  }
  function buildList() {
    const list = $('setupList');
    list.innerHTML = '';
    function head(text) { const h = document.createElement('div'); h.className = 'list-head'; h.textContent = text; list.appendChild(h); }
    head('Spin setups');
    SETUPS.forEach(function (s) { addCard(list, s.id, s.rows, s.name, s.level, function () { selectSetup(s.id); }); });
    head('Build it first');
    BUILDS.forEach(function (b) {
      addCard(list, 'build:' + b.id, b.rows, b.name, b.pieces.join(' → ') + ' → T', function () { selectSetup('build:' + b.id); });
    });
  }

  function selectSetup(id, mirror) {
    const isBuildLesson = id.indexOf('build:') === 0;
    L.id = id;
    L.kind = isBuildLesson ? 'build' : 'spin';
    L.item = (isBuildLesson ? BUILDS : SETUPS).filter(function (s) { return (isBuildLesson ? 'build:' : '') + s.id === id; })[0] || SETUPS[0];
    if (mirror !== undefined) L.mirror = mirror;
    $('lMirror').checked = L.mirror;
    document.querySelectorAll('.setup-card').forEach(function (el) { el.classList.toggle('active', el.dataset.id === L.id); });
    if (isBuildLesson) {
      L.scn = makeBuildScenario(L.item, L.mirror);
      buildBuildFrames();
    } else {
      L.scn = makeScenario(L.item, L.mirror, 0);
      buildSpinFrames();
    }
    renderLesson();
    L.idx = 0;
    renderLearn();
    learnPlay();
  }

  // Replay an input list for one piece, appending a frame per action. Returns { piece, result }.
  function walkActions(board, type, actions, frames, banner) {
    let p = E.spawn(type), lastRot = false, kick = -1, result = null;
    frames.push({ board: board, piece: p, action: null });
    actions.forEach(function (a) {
      if (a === 'lock') {
        result = E.lockPiece(board, p, lastRot, kick);
        frames.push({ board: result.board, piece: null, action: 'lock', banner: banner });
        return;
      }
      let n;
      if (a === 'left') n = E.tryMove(board, p, -1, 0);
      else if (a === 'right') n = E.tryMove(board, p, 1, 0);
      else if (a === 'soft') n = E.tryMove(board, p, 0, 1);
      else if (a === 'hard') n = E.moved(p, 0, E.dropDistance(board, p));
      else n = E.tryRotate(board, p, a === 'cw' ? 1 : -1);
      lastRot = a === 'cw' || a === 'ccw';
      kick = lastRot ? n.kick : -1;
      p = n;
      frames.push({ board: board, piece: p, action: a, kick: n.kick });
    });
    return { piece: p, result: result };
  }
  function keysFor(actions) {
    return groupActions(actions).map(function (g) { return keyHtml(g.action) + (g.count > 1 ? '×' + g.count : ''); }).join(' ');
  }

  function buildSpinFrames() {
    const frames = [];
    walkActions(L.scn.board, 'T', L.scn.sol.actions, frames, 'T-SPIN DOUBLE');
    L.frames = frames;
    L.altPlans = 0;
    // one lesson step per run of identical inputs
    const groups = [];
    frames.slice(1).forEach(function (f, i) {
      const fi = i + 1;
      const g = groups[groups.length - 1];
      if (g && g.action === f.action && f.action !== 'lock' && f.action !== 'hard') { g.count++; g.end = fi; }
      else groups.push({ action: f.action, count: 1, start: fi, end: fi, kick: f.kick });
    });
    const li = groups.length - 1;
    if (li > 0 && (groups[li - 1].action === 'cw' || groups[li - 1].action === 'ccw')) groups[li - 1].spin = true;
    L.groups = groups.map(function (g) {
      return {
        label: VERBS[g.action] + (g.count > 1 ? ' ×' + g.count : ''), keys: keyHtml(g.action),
        note: g.spin ? (g.kick > 0 ? 'the spin (wall kick)' : 'the spin') : '', start: g.start, end: g.end
      };
    });
  }

  function buildBuildFrames() {
    const scn = L.scn, frames = [], groups = [];
    let board = scn.board;
    const plans = E.allPlans(board, scn.pieces, 60);
    plans.sort(function (a, b) { return E.holeCount(a.board) - E.holeCount(b.board); });
    L.altPlans = plans.length - 1;
    const best = plans[0];
    function cellsKey(p) { return E.cellsOf(p).map(function (c) { return c.join(); }).sort().join('|'); }
    best.placements.forEach(function (p, i) {
      const target = cellsKey(p);
      const sol = E.solvePiece(board, p.type, function (res, piece) { return cellsKey(piece) === target; });
      const actions = sol ? sol.actions : ['hard', 'lock'];
      const start = frames.length;
      const out = walkActions(board, p.type, actions, frames);
      const xs = E.cellsOf(p).map(function (c) { return c[0] + 1; });
      const a = Math.min.apply(null, xs), z = Math.max.apply(null, xs);
      groups.push({
        label: 'Drop the ' + p.type, keys: keysFor(actions),
        note: a === z ? 'column ' + a : 'columns ' + a + '–' + z, start: start, end: frames.length - 1
      });
      board = out.result ? out.result.board : E.lockPiece(board, p, false, -1).board;
    });
    const tsol = E.solveT(board, E.isTSD);
    const start = frames.length;
    walkActions(board, 'T', tsol.actions, frames, 'T-SPIN DOUBLE');
    groups.push({ label: 'Spin the T into the pocket', keys: keysFor(tsol.actions), note: 'the spin', start: start, end: frames.length - 1 });
    L.frames = frames;
    L.groups = groups;
  }

  function renderLesson() {
    const s = L.item, build = L.kind === 'build';
    $('lName').textContent = s.name;
    $('lLevel').textContent = build ? 'Build · ' + s.pieces.length + ' pieces' : s.level;
    $('lBlurb').textContent = build ? s.tip : s.blurb;
    $('hSpot').textContent = build ? 'What to aim for' : 'How to spot it';
    $('lNote').textContent = build
      ? (L.altPlans > 0 ? 'Other builds can work too. This lesson shows one of them.' : 'This drill has only one solution.')
      : '';
    $('lTry').textContent = build ? 'Practice this build' : 'Practice this setup';
    const spot = $('lSpot');
    spot.innerHTML = '';
    (build ? BUILD_SPOT : s.spot).forEach(function (t) { const li = document.createElement('li'); li.textContent = t; spot.appendChild(li); });
    const ol = $('lSteps');
    ol.innerHTML = '';
    L.groups.forEach(function (g, i) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="lab"></span> <span class="keys"></span>';
      li.querySelector('.lab').textContent = g.label;
      li.querySelector('.keys').innerHTML = g.keys;
      if (g.note) {
        const n = document.createElement('span');
        n.className = 'note';
        n.textContent = g.note;
        li.appendChild(n);
      }
      li.addEventListener('click', function () { learnPause(); L.idx = g.end; renderLearn(); });
      ol.appendChild(li);
    });
  }

  function renderLearn() {
    const f = L.frames[L.idx];
    const banner = $('learnBanner');
    if (f.piece) drawBoard(lctx, f.board, { piece: f.piece, ghost: f.action ? ghostOf(f.board, f.piece) : null });
    else drawBoard(lctx, f.board);
    banner.hidden = !f.banner;
    if (f.banner) banner.innerHTML = f.banner + '<small>2 LINES</small>';
    document.querySelectorAll('#lSteps li').forEach(function (li, i) {
      const g = L.groups[i];
      li.classList.toggle('now', L.idx >= g.start && L.idx <= g.end);
      li.classList.toggle('done', L.idx > g.end);
    });
    $('lPlay').innerHTML = L.playing ? '&#10074;&#10074; Pause' : (L.idx >= L.frames.length - 1 ? '&#8635; Replay' : '&#9654; Play');
  }
  function ghostOf(board, piece) { return E.moved(piece, 0, E.dropDistance(board, piece)); }

  function learnStep(d) {
    L.idx = Math.max(0, Math.min(L.frames.length - 1, L.idx + d));
    renderLearn();
  }
  function learnPause() {
    L.playing = false;
    clearInterval(L.timer);
    L.timer = null;
    if (L.scn) renderLearn();
  }
  function learnPlay() {
    clearInterval(L.timer);
    if (L.idx >= L.frames.length - 1) L.idx = 0;
    L.playing = true;
    renderLearn();
    L.timer = setInterval(function () {
      if (L.idx >= L.frames.length - 1) { learnPause(); return; }
      L.idx++;
      renderLearn();
      if (L.idx >= L.frames.length - 1) learnPause();
    }, 650);
  }
  $('lPlay').addEventListener('click', function () { if (L.playing) learnPause(); else learnPlay(); this.blur(); });
  $('lNext').addEventListener('click', function () { learnPause(); learnStep(1); this.blur(); });
  $('lPrev').addEventListener('click', function () { learnPause(); learnStep(-1); this.blur(); });
  $('lRestart').addEventListener('click', function () { learnPause(); L.idx = 0; renderLearn(); this.blur(); });
  $('lMirror').addEventListener('change', function () { selectSetup(L.id, this.checked); this.blur(); });
  $('lTry').addEventListener('click', function () { showPage('practice'); startScenario(L.id); this.blur(); });

  /* ============================================================ PRACTICE */
  // Guideline-recommended handling: DAS 10 frames (~167 ms), ARR 2 frames (~33 ms), 0.5 s lock delay, 15 move resets.
  const DAS = 167, ARR = 33, LOCK_DELAY = 500, MAX_RESETS = 15;
  const P = {
    scn: null, board: null, piece: null, queue: [], hold: null, holdUsed: false,
    lastRot: false, kick: -1, phase: 'idle', fall: 0, lockT: 0, resets: 0, lowest: 0,
    dasDir: 0, dasT: 0, arrT: 0, held: { left: false, right: false }, soft: false, softT: 0,
    hintLevel: 0, hintUsed: false, flashT: 0, view: null, flashRows: [], last: null, lastSetupId: null
  };
  const gctx = fit($('gameCanvas'), BW, BH);
  const hctx = fit($('holdCanvas'), 110, 70);
  const nctx = fit($('nextCanvas'), 110, 330);

  // Weighted pick: unseen and weaker drills come up more often; avoid repeating the last one.
  function pickFrom(all, enabled, prefix) {
    const pool = all.filter(function (s) { return enabled.indexOf(s.id) >= 0; });
    const list = pool.length ? pool : all;
    const weights = list.map(function (s) {
      const st = store.stats[prefix + s.id] || { a: 0, c: 0 };
      const rate = st.a ? st.c / st.a : 0;
      let w = 1 + (st.a === 0 ? 2 : 0) + 3 * (1 - rate);
      if (prefix + s.id === P.lastSetupId && list.length > 1) w *= 0.2;
      return w;
    });
    let x = Math.random() * weights.reduce(function (a, b) { return a + b; }, 0);
    for (let i = 0; i < list.length; i++) { x -= weights[i]; if (x <= 0) return list[i]; }
    return list[list.length - 1];
  }

  // forceId: a spin setup id, or 'build:<id>' for a build drill. Otherwise follow the Drill type option.
  function startScenario(forceId) {
    let kind = opt.mode === 'mixed' ? (Math.random() < 0.5 ? 'build' : 'spin') : opt.mode;
    let item = null;
    if (forceId) {
      const isBuild = forceId.indexOf('build:') === 0;
      kind = isBuild ? 'build' : 'spin';
      item = (isBuild ? BUILDS : SETUPS).filter(function (s) { return (isBuild ? 'build:' : '') + s.id === forceId; })[0];
    }
    const mirror = opt.mirror ? Math.random() < 0.5 : false;
    if (kind === 'build') {
      item = item || pickFrom(BUILDS, opt.enabledBuilds, 'build:');
      P.scn = makeBuildScenario(item, mirror);
    } else {
      item = item || pickFrom(SETUPS, opt.enabled, '');
      const noise = opt.noise ? Math.floor(Math.random() * 3) : 0;
      P.scn = makeScenario(item, mirror, noise);
      P.scn.kind = 'spin';
    }
    P.lastSetupId = P.scn.setup.id;
    P.hintUsed = false;
    resetAttempt();
  }

  function refill() { while (P.queue.length < 7) P.queue = P.queue.concat(E.makeBag()); }
  function resetAttempt() {
    P.board = E.cloneBoard(P.scn.board);
    P.queue = P.scn.kind === 'build' ? P.scn.pieces.concat(['T']) : ['T'];
    P.stage = 0;
    P.remaining = P.scn.kind === 'build' ? P.scn.pieces.slice() : [];
    P.history = [];
    P.hintTarget = null;
    P.broken = false;
    P.buildMsg = null;
    refill();
    P.hold = null;
    P.holdUsed = false;
    P.hintLevel = 0;
    P.dasDir = 0; P.held.left = P.held.right = false; P.soft = false;
    $('pResult').hidden = true;
    $('pBanner').hidden = true;
    $('hintBar').hidden = true;
    P.phase = 'play';
    spawnNext();
    updateLabels();
    renderBuildBar();
  }
  function spawnPiece(type) {
    P.piece = E.spawn(type);
    P.lastRot = false; P.kick = -1; P.fall = 0; P.lockT = 0; P.resets = 0; P.lowest = P.piece.y;
    if (E.collides(P.board, P.piece)) finishAttempt(null, 'Blocked out.');
  }
  function spawnNext() { spawnPiece(P.queue.shift()); refill(); }

  function updateLabels() {
    const show = opt.name || P.phase === 'result' || P.hintLevel > 0;
    const hidden = P.scn && P.scn.kind === 'build' ? 'Build it, then spin' : 'Find the T-spin double';
    $('pName').textContent = P.scn ? (show ? P.scn.setup.name + (P.scn.mirror ? ' (mirrored)' : '') : hidden) : '';
  }

  /* --- build drills: progress chips, status, undo --- */
  function isBuild() { return !!P.scn && P.scn.kind === 'build'; }
  function renderBuildBar() {
    const bar = $('buildBar');
    bar.hidden = !isBuild();
    if (!isBuild()) return;
    const chips = $('buildChips');
    chips.innerHTML = '';
    P.scn.pieces.concat(['T']).forEach(function (t, i) {
      const c = document.createElement('span');
      c.className = 'chip' + (i < P.stage ? ' done' : i === P.stage ? ' now' : '');
      c.style.background = COLORS[t];
      c.textContent = t;
      chips.appendChild(c);
    });
    const msg = $('buildMsg');
    const m = P.buildMsg || { text: P.stage < P.scn.pieces.length
      ? 'Build the setup with ' + (P.scn.pieces.length - P.stage) + ' more piece' + (P.scn.pieces.length - P.stage > 1 ? 's' : '') + ', then spin the T.'
      : 'Setup ready. Spin the T into the pocket.', cls: '' };
    msg.textContent = m.text;
    msg.className = 'build-msg ' + m.cls;
    $('bUndo').hidden = !(P.history.length && P.phase === 'play');
  }
  function undoPiece() {
    if (!isBuild() || P.phase !== 'play' || !P.history.length) return;
    const h = P.history.pop();
    P.board = h.board;
    P.queue = h.queue;
    P.stage = h.stage;
    P.hold = h.hold;
    P.holdUsed = false;
    P.remaining = h.remaining;
    P.hintLevel = 0; P.hintTarget = null;
    $('hintBar').hidden = true;
    P.broken = false;
    P.buildMsg = { text: 'Piece undone. Try a different placement.', cls: '' };
    spawnNext();
    renderBuildBar();
  }
  // With Hold the build pieces can be used in any order, so try each distinct ordering.
  function uniquePerms(list) {
    if (list.length <= 1) return [list.slice()];
    const out = [], seen = {};
    list.forEach(function (t, i) {
      if (seen[t]) return;
      seen[t] = true;
      const rest = list.slice(0, i).concat(list.slice(i + 1));
      uniquePerms(rest).forEach(function (p) { out.push([t].concat(p)); });
    });
    return out;
  }
  // First plan for these pieces in any order; if `first` is given, that piece must go first.
  function planAnyOrder(board, pieces, first) {
    const perms = uniquePerms(pieces).filter(function (p) { return !first || p[0] === first; });
    for (let i = 0; i < perms.length; i++) {
      const plan = E.buildPlan(board, perms[i]);
      if (plan) return plan;
    }
    return null;
  }

  // Called when a non-final piece locks in a build drill.
  function lockBuildPiece(piece, res) {
    P.history.push({
      board: E.cloneBoard(P.board), queue: [piece.type].concat(P.queue), stage: P.stage,
      hold: P.hold, remaining: P.remaining.slice()
    });
    P.board = res.board;
    P.stage++;
    P.holdUsed = false;
    P.hintLevel = 0; P.hintTarget = null;
    $('hintBar').hidden = true;
    const used = P.remaining.indexOf(piece.type);
    if (used >= 0) P.remaining.splice(used, 1);
    const remaining = P.remaining;
    const ok = used >= 0 && planAnyOrder(P.board, remaining) !== null;
    P.broken = !ok;
    if (!ok) P.buildMsg = { text: used < 0 ? 'That piece is not one of the build pieces. Undo it (U) and hold it (C) instead.' : 'That placement leaves no T-spin double. Undo it (U) or retry.', cls: 'bad' };
    else if (remaining.length) P.buildMsg = { text: 'On track. ' + remaining.length + ' more piece' + (remaining.length > 1 ? 's' : '') + ' to build with.', cls: 'good' };
    else P.buildMsg = { text: 'Setup ready. Spin the T into the pocket.', cls: 'good' };
    spawnNext();
    renderBuildBar();
  }

  /* --- moves --- */
  function noteMove(rot, kick) {
    P.lastRot = !!rot;
    P.kick = rot ? kick : -1;
    if (P.piece.y > P.lowest) { P.lowest = P.piece.y; P.resets = 0; }
    if (opt.lockDelay && E.onSurface(P.board, P.piece)) {
      if (P.resets < MAX_RESETS) { P.lockT = 0; P.resets++; }
    } else P.lockT = 0;
  }
  function shift(dx) {
    if (P.phase !== 'play') return false;
    const n = E.tryMove(P.board, P.piece, dx, 0);
    if (!n) return false;
    P.piece = n;
    noteMove(false);
    return true;
  }
  function softStep() {
    if (P.phase !== 'play') return false;
    const n = E.tryMove(P.board, P.piece, 0, 1);
    if (!n) return false;
    P.piece = n;
    noteMove(false);
    return true;
  }
  function rotate(dir) {
    if (P.phase !== 'play') return;
    const n = E.tryRotate(P.board, P.piece, dir);
    if (!n) return;
    const kick = n.kick;
    P.piece = { type: n.type, rot: n.rot, x: n.x, y: n.y };
    noteMove(true, kick);
  }
  function hardDrop() {
    if (P.phase !== 'play') return;
    const d = E.dropDistance(P.board, P.piece);
    if (d > 0) { P.piece = E.moved(P.piece, 0, d); P.lastRot = false; P.kick = -1; }
    lockNow();
  }
  function doHold() {
    if (P.phase !== 'play' || P.holdUsed) return;
    const cur = P.piece.type;
    if (P.hold) { const h = P.hold; P.hold = cur; spawnPiece(h); }
    else { P.hold = cur; spawnNext(); }
    P.holdUsed = true;
  }

  /* --- locking and results --- */
  function lockNow() {
    const piece = P.piece;
    const res = E.lockPiece(P.board, piece, P.lastRot, P.kick);
    if (isBuild() && P.stage < P.scn.pieces.length) lockBuildPiece(piece, res);
    else finishAttempt({ piece: piece, res: res });
  }
  function describe(type, res) {
    if (type !== 'T') return 'You locked the ' + type + ' piece. These drills are about the T: use Hold (C) to set the other piece aside.';
    if (isBuild() && P.broken) return 'The setup was broken earlier, so no spin was available. Use Undo (U) next time a placement is flagged.';
    if (res.lines === 0) return 'Nothing cleared. Aim the T into the pocket under the overhang.';
    if (res.tspin === 'full' && res.lines === 1) return 'That was a T-spin single. Drop the T lower so it fills both rows.';
    if (res.lines === 2 && res.tspin === 'mini') return 'Two lines, but it only counts as a mini T-spin. Rotate into the pocket so the front corners are blocked.';
    if (res.lines === 2) return 'Two lines, but no spin. The last move before locking has to be a rotation into the pocket.';
    if (res.tspin !== 'none') return 'A T-spin, but not a double.';
    return 'Not a T-spin double. Try again.';
  }
  function finishAttempt(info, msg) {
    P.phase = 'flash';
    P.flashT = 0;
    P.dasDir = 0; P.soft = false;
    if (!info) { // blocked out
      P.outcome = { ok: false, title: 'Blocked out', text: msg };
      P.view = P.board;
      P.flashRows = [];
      return;
    }
    const res = info.res, type = info.piece.type;
    const ok = type === 'T' && E.isTSD(res);
    P.view = placed(P.board, info.piece);
    P.flashRows = res.clearedRows;
    P.after = res.board;
    // record stats
    const id = P.scn.setup.id;
    const st = store.stats[id] || (store.stats[id] = { a: 0, c: 0 });
    st.a++;
    let text;
    if (ok) {
      if (!P.hintUsed) { st.c++; store.clean++; store.streak++; store.best = Math.max(store.best, store.streak); text = 'Clean solve, no hints.'; }
      else { store.streak = 0; text = 'Solved with a hint. Try it again without one.'; }
      $('pBanner').innerHTML = 'T-SPIN DOUBLE<small>2 LINES</small>';
      $('pBanner').hidden = false;
    } else store.streak = 0;
    save();
    P.outcome = ok ? { ok: true, title: 'T-Spin Double!', text: text } : { ok: false, title: 'Not quite', text: describe(type, res) };
    renderStats();
  }
  function finishFlash() {
    P.phase = 'result';
    if (P.after) P.board = P.after;
    P.after = null;
    P.flashRows = [];
    $('pBanner').hidden = true;
    const o = P.outcome;
    $('rTitle').textContent = o.title;
    $('rTitle').className = 'result-title ' + (o.ok ? 'good' : 'bad');
    $('rText').textContent = o.text;
    $('pResult').hidden = false;
    $('rSolution').hidden = false;
    updateLabels();
    renderBuildBar();
  }

  /* --- hint --- */
  function hint() {
    if (P.phase !== 'play') return;
    P.hintUsed = true;
    P.hintLevel = Math.min(2, P.hintLevel + 1);
    const bar = $('hintBar');
    bar.hidden = false;
    const s = P.scn.setup;
    if (isBuild()) {
      const building = P.stage < P.scn.pieces.length;
      if (P.hintLevel === 1) {
        bar.innerHTML = '<b></b> <span></span><br><small>Press <kbd>H</kbd> again to outline a placement for this piece.</small>';
        bar.querySelector('b').textContent = s.name + '.';
        bar.querySelector('span').textContent = s.spot[0];
      } else if (building) {
        const cur = P.piece.type;
        const plan = P.remaining.indexOf(cur) >= 0 ? planAnyOrder(P.board, P.remaining, cur) : null;
        P.hintTarget = plan ? plan[0] : null;
        bar.innerHTML = plan ? '<b>One valid spot for this ' + cur + ' is outlined.</b> Others may work too.'
          : P.remaining.indexOf(cur) < 0 ? '<b>Hold this ' + cur + ' (C).</b> It is not needed for the build.'
          : '<b>No finish is possible with this piece.</b> Hold it (C), undo the last piece, or retry.';
      } else {
        const sol = E.solveT(P.board, E.isTSD);
        P.hintTarget = sol ? sol.final : null;
        const parts = sol ? groupActions(sol.actions).map(function (g) { return keyHtml(g.action) + (g.count > 1 ? '×' + g.count : ''); }) : [];
        bar.innerHTML = sol ? '<b>Target shown on the board.</b> One way in: ' + parts.join(' ') : '<b>No spin is available.</b> Retry the drill.';
      }
      updateLabels();
      return;
    }
    if (P.hintLevel === 1) {
      bar.innerHTML = '<b></b> Look for the pocket: <span></span><br><small>Press <kbd>H</kbd> again to see where the T goes.</small>';
      bar.querySelector('b').textContent = s.name + '.';
      bar.querySelector('span').textContent = s.spot[0];
    } else {
      const parts = groupActions(P.scn.sol.actions).map(function (g) { return keyHtml(g.action) + (g.count > 1 ? '×' + g.count : ''); });
      bar.innerHTML = '<b>Target shown on the board.</b> One way in: ' + parts.join(' ');
    }
    updateLabels();
  }

  /* --- rendering --- */
  function renderPractice() {
    if (!P.scn) return;
    if (P.phase === 'play') {
      const gh = opt.ghost ? E.moved(P.piece, 0, E.dropDistance(P.board, P.piece)) : null;
      drawBoard(gctx, P.board, { piece: P.piece, ghost: gh, target: P.hintLevel >= 2 ? (isBuild() ? P.hintTarget : P.scn.sol.final) : null });
    } else if (P.phase === 'flash') {
      const a = Math.max(0, .75 - P.flashT / 420);
      drawBoard(gctx, P.view, { flashRows: P.flashRows, flashAlpha: a });
    } else drawBoard(gctx, P.board);
    // hold
    hctx.clearRect(0, 0, 110, 70);
    if (P.hold) {
      hctx.globalAlpha = P.holdUsed ? .35 : 1;
      drawMini(hctx, P.hold, 55, 35, 18);
      hctx.globalAlpha = 1;
    }
    // next
    nctx.clearRect(0, 0, 110, 330);
    for (let i = 0; i < 5; i++) drawMini(nctx, P.queue[i], 55, 36 + i * 64, 18);
  }

  function renderStats() {
    $('sStreak').textContent = store.streak;
    $('sBest').textContent = store.best;
    $('sClean').textContent = store.clean;
    const m = $('mastery');
    m.innerHTML = '';
    function add(s, key) {
      const st = store.stats[key] || { a: 0, c: 0 };
      const row = document.createElement('div');
      row.className = 'm-row';
      row.innerHTML = '<div class="top"><span></span><span></span></div><div class="bar"><i></i></div>';
      row.querySelector('span').textContent = s.name;
      row.querySelectorAll('span')[1].textContent = st.a ? st.c + '/' + st.a : 'new';
      row.querySelector('i').style.width = (st.a ? Math.round(100 * st.c / st.a) : 0) + '%';
      m.appendChild(row);
    }
    function head(t) { const h = document.createElement('div'); h.className = 'm-head'; h.textContent = t; m.appendChild(h); }
    head('Spin setups');
    SETUPS.forEach(function (s) { add(s, s.id); });
    head('Build drills');
    BUILDS.forEach(function (s) { add(s, 'build:' + s.id); });
  }

  /* --- loop --- */
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(100, t - lastT);
    lastT = t;
    if (page === 'practice' && P.scn) { update(dt); renderPractice(); }
    requestAnimationFrame(frame);
  }
  function update(dt) {
    if (P.phase === 'flash') {
      P.flashT += dt;
      if (P.flashT >= 420) finishFlash();
      return;
    }
    if (P.phase !== 'play') return;
    if (P.dasDir) {
      P.dasT += dt;
      if (P.dasT >= DAS) {
        P.arrT += dt;
        while (P.arrT >= ARR) { P.arrT -= ARR; if (!shift(P.dasDir)) { P.arrT = 0; break; } }
      }
    }
    if (P.soft) {
      const iv = opt.gravity > 0 ? Math.min(16, 1000 / (opt.gravity * 20)) : 16; // ~60 cells/s, inside the usual 20-60/s soft-drop range
      P.softT += dt;
      while (P.softT >= iv) { P.softT -= iv; if (!softStep()) { P.softT = 0; break; } }
    }
    if (P.phase !== 'play') return;
    const grounded = E.onSurface(P.board, P.piece);
    if (grounded) {
      // Lock delay: the piece locks on its own after resting on the surface for LOCK_DELAY ms.
      if (opt.lockDelay) {
        P.lockT += dt;
        if (P.lockT >= LOCK_DELAY) lockNow();
      }
    } else if (opt.gravity > 0) {
      P.fall += dt * opt.gravity / 1000;
      while (P.fall >= 1) { P.fall -= 1; if (!softStep()) break; }
    }
  }

  /* --- input --- */
  const GAME_KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', Space: 'hard', ArrowUp: 'cw', KeyX: 'cw',
    KeyZ: 'ccw', ControlLeft: 'ccw', ControlRight: 'ccw', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold',
    KeyH: 'hint', KeyR: 'retry', KeyN: 'next', KeyU: 'undo'
  };
  function retry() { if (P.scn && P.phase !== 'flash') resetAttempt(); }
  function next() { if (P.phase !== 'flash') startScenario(); }
  window.addEventListener('keydown', function (e) {
    if (page !== 'practice' || $('helpDialog').open || $('planDialog').open) return;
    const act = GAME_KEYS[e.code];
    if (!act || e.altKey || e.metaKey) return;
    if (e.target && /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName) && e.code !== 'KeyH') return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    if (act === 'retry') return retry();
    if (act === 'next') return next();
    if (act === 'undo') return undoPiece();
    if (P.phase === 'result' && e.code === 'Enter') return next();
    if (P.phase !== 'play') return;
    if (act === 'left' || act === 'right') {
      P.held[act] = true;
      P.dasDir = act === 'left' ? -1 : 1; P.dasT = 0; P.arrT = 0;
      shift(P.dasDir);
    } else if (act === 'soft') { P.soft = true; P.softT = 0; softStep(); }
    else if (act === 'hard') hardDrop();
    else if (act === 'cw') rotate(1);
    else if (act === 'ccw') rotate(-1);
    else if (act === 'hold') doHold();
    else if (act === 'hint') hint();
  });
  window.addEventListener('keydown', function (e) {
    if (page === 'practice' && P.phase === 'result' && e.code === 'Enter' && !e.repeat && !/^(BUTTON|SELECT|INPUT)$/.test(e.target.tagName)) next();
  });
  window.addEventListener('keyup', function (e) {
    const act = GAME_KEYS[e.code];
    if (e.code === 'Space' && page === 'practice') e.preventDefault();
    if (act === 'left' || act === 'right') {
      P.held[act] = false;
      const other = act === 'left' ? 'right' : 'left';
      if (P.held[other]) { P.dasDir = other === 'left' ? -1 : 1; P.dasT = DAS; P.arrT = 0; }
      else P.dasDir = 0;
    } else if (act === 'soft') P.soft = false;
  });
  window.addEventListener('blur', function () { P.held.left = P.held.right = false; P.dasDir = 0; P.soft = false; });

  /* --- buttons and options --- */
  $('pHint').addEventListener('click', function () { hint(); this.blur(); });
  $('pRetry').addEventListener('click', function () { retry(); this.blur(); });
  $('pNext').addEventListener('click', function () { next(); this.blur(); });
  $('rRetry').addEventListener('click', function () { retry(); this.blur(); });
  $('rNext').addEventListener('click', function () { next(); this.blur(); });
  $('rSolution').addEventListener('click', function () {
    const s = P.scn;
    this.blur();
    if (isBuild()) { openPlan(); return; }
    showPage('learn');
    selectSetup(s.setup.id, s.mirror);
  });
  $('bUndo').addEventListener('click', function () { undoPiece(); this.blur(); });

  /* --- reference plan for a build drill --- */
  const PLAN = { steps: [], idx: 0 };
  const PLAN_ROWS = 9, PLAN_H = PLAN_ROWS * CELL;
  function openPlan() {
    const s = P.scn;
    const plan = E.buildPlan(s.board, s.pieces);
    PLAN.steps = [];
    if (plan) {
      let board = E.cloneBoard(s.board);
      plan.forEach(function (p, i) {
        PLAN.steps.push({ board: board, target: p, text: 'Piece ' + (i + 1) + ' of ' + plan.length + ': drop the ' + p.type + ' where it is outlined.' });
        board = E.lockPiece(board, p, false, -1).board;
      });
      const sol = E.solveT(board, E.isTSD);
      const keys = sol ? groupActions(sol.actions).map(function (g) { return KEYS[g.action] + (g.count > 1 ? '×' + g.count : ''); }).join('  ') : '';
      PLAN.steps.push({ board: board, target: sol ? sol.final : null, text: 'Setup complete. Spin the T into the outlined pocket. Keys: ' + keys + '. There are usually other valid builds.' });
    }
    PLAN.idx = 0;
    $('planTitle').textContent = 'One way to build it: ' + s.setup.name;
    renderPlan();
    $('planDialog').showModal();
  }
  function renderPlan() {
    const step = PLAN.steps[PLAN.idx];
    const ctx = fit($('planCanvas'), BW, PLAN_H);
    if (!step) { $('planText').textContent = 'No plan found.'; return; }
    ctx.translate(0, -(BH - PLAN_H));
    drawBoard(ctx, step.board, { target: step.target });
    $('planText').textContent = step.text;
    $('planPrev').disabled = PLAN.idx === 0;
    $('planNext').disabled = PLAN.idx === PLAN.steps.length - 1;
  }
  $('planPrev').addEventListener('click', function () { PLAN.idx = Math.max(0, PLAN.idx - 1); renderPlan(); });
  $('planNext').addEventListener('click', function () { PLAN.idx = Math.min(PLAN.steps.length - 1, PLAN.idx + 1); renderPlan(); });
  $('resetStats').addEventListener('click', function () {
    store.stats = {}; store.streak = 0; store.best = 0; store.clean = 0; save(); renderStats(); this.blur();
  });

  function bindOpts() {
    const md = $('oMode');
    md.value = opt.mode;
    md.addEventListener('change', function () { opt.mode = md.value; saveOpts(); md.blur(); });
    const bbox = $('oBuilds');
    BUILDS.forEach(function (b) {
      const lab = document.createElement('label');
      lab.className = 'check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = opt.enabledBuilds.indexOf(b.id) >= 0;
      cb.addEventListener('change', function () {
        opt.enabledBuilds = opt.enabledBuilds.filter(function (x) { return x !== b.id; });
        if (cb.checked) opt.enabledBuilds.push(b.id);
        if (!opt.enabledBuilds.length) { opt.enabledBuilds = [b.id]; cb.checked = true; }
        saveOpts();
        cb.blur();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + b.name + ' (' + b.pieces.length + ')'));
      bbox.appendChild(lab);
    });
    const g = $('oGravity');
    g.value = String(opt.gravity);
    g.addEventListener('change', function () { opt.gravity = Number(g.value); saveOpts(); g.blur(); });
    [['oLock', 'lockDelay'], ['oMirror', 'mirror'], ['oNoise', 'noise'], ['oName', 'name'], ['oGhost', 'ghost']].forEach(function (pair) {
      const el = $(pair[0]);
      el.checked = !!opt[pair[1]];
      el.addEventListener('change', function () { opt[pair[1]] = el.checked; saveOpts(); updateLabels(); el.blur(); });
    });
    const box = $('oSetups');
    SETUPS.forEach(function (s) {
      const lab = document.createElement('label');
      lab.className = 'check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = opt.enabled.indexOf(s.id) >= 0;
      cb.addEventListener('change', function () {
        opt.enabled = opt.enabled.filter(function (x) { return x !== s.id; });
        if (cb.checked) opt.enabled.push(s.id);
        if (!opt.enabled.length) { opt.enabled = [s.id]; cb.checked = true; }
        saveOpts();
        cb.blur();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + s.name));
      box.appendChild(lab);
    });
  }

  /* --- boot --- */
  buildList();
  bindOpts();
  renderStats();
  selectSetup(SETUPS[0].id, false);
  requestAnimationFrame(frame);
  window.__tw = { P: P, L: L, E: E, start: startScenario }; // handy for debugging in the console
})();
