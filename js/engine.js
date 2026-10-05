/* T-Spin Dojo engine: board, SRS rotation + kicks, T-spin detection, solver.
   Plain script (no modules) so the app works when opened straight from disk. */
(function (root) {
  'use strict';

  const COLS = 10;
  const ROWS = 22;          // 2 hidden rows above the 20 visible ones
  const HIDDEN = 2;
  const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  // Cell offsets inside each piece's bounding box. Rotation 0, R(1), 2, L(3). y grows downward.
  const SHAPES = {
    T: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
    J: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
    L: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]],
    S: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
    Z: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
    I: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
    O: [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]]
  };

  // SRS wall-kick data, written in the guideline's y-up convention and flipped to y-down below.
  function flip(list) { return list.map(function (k) { return [k[0], -k[1]]; }); }
  const KICK_JLSTZ = {
    '01': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '10': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '12': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '21': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '23': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '32': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '30': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '03': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  };
  const KICK_I = {
    '01': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '10': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '12': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '21': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '23': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '32': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '30': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '03': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  };
  Object.keys(KICK_JLSTZ).forEach(function (k) { KICK_JLSTZ[k] = flip(KICK_JLSTZ[k]); });
  Object.keys(KICK_I).forEach(function (k) { KICK_I[k] = flip(KICK_I[k]); });

  function emptyBoard() {
    const b = [];
    for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(0));
    return b;
  }
  function cloneBoard(b) { return b.map(function (row) { return row.slice(); }); }

  function cellsOf(p) {
    return SHAPES[p.type][p.rot].map(function (c) { return [p.x + c[0], p.y + c[1]]; });
  }
  function collides(board, p) {
    const cells = cellsOf(p);
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i][0], r = cells[i][1];
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
      if (board[r][c]) return true;
    }
    return false;
  }
  function spawn(type) {
    // Spawns straddling the hidden/visible boundary so the piece is seen right away.
    return { type: type, rot: 0, x: 3, y: HIDDEN - 1 };
  }
  function moved(p, dx, dy) { return { type: p.type, rot: p.rot, x: p.x + dx, y: p.y + dy }; }
  function tryMove(board, p, dx, dy) {
    const n = moved(p, dx, dy);
    return collides(board, n) ? null : n;
  }
  function onSurface(board, p) { return collides(board, moved(p, 0, 1)); }
  function dropDistance(board, p) {
    let d = 0;
    while (!collides(board, moved(p, 0, d + 1))) d++;
    return d;
  }
  // dir: +1 clockwise, -1 counter-clockwise. Returns new piece (with .kick index) or null.
  function tryRotate(board, p, dir) {
    const to = (p.rot + (dir > 0 ? 1 : 3)) % 4;
    let kicks;
    if (p.type === 'O') kicks = [[0, 0]];
    else kicks = (p.type === 'I' ? KICK_I : KICK_JLSTZ)['' + p.rot + to];
    for (let i = 0; i < kicks.length; i++) {
      const n = { type: p.type, rot: to, x: p.x + kicks[i][0], y: p.y + kicks[i][1] };
      if (!collides(board, n)) { n.kick = i; return n; }
    }
    return null;
  }

  // 3-corner T-spin rule with the guideline mini / 1x2-kick exception.
  function detectTSpin(board, p, lastWasRotation, kick) {
    if (p.type !== 'T' || !lastWasRotation) return 'none';
    function filled(dx, dy) {
      const c = p.x + dx, r = p.y + dy;
      return c < 0 || c >= COLS || r >= ROWS || r < 0 || !!board[r][c];
    }
    const A = filled(0, 0), B = filled(2, 0), C = filled(0, 2), D = filled(2, 2);
    const n = A + B + C + D;
    if (n < 3) return 'none';
    const front = [[A, B], [B, D], [C, D], [A, C]][p.rot];
    if ((front[0] && front[1]) || kick === 4) return 'full';
    return 'mini';
  }

  // Lock a piece: returns { board (after clears), lines, tspin }.
  function lockPiece(board, p, lastWasRotation, kick) {
    const tspin = detectTSpin(board, p, lastWasRotation, kick);
    const b = cloneBoard(board);
    cellsOf(p).forEach(function (c) { if (c[1] >= 0) b[c[1]][c[0]] = p.type; });
    const cleared = [];
    for (let r = 0; r < ROWS; r++) if (b[r].every(function (v) { return v; })) cleared.push(r);
    const out = b.filter(function (row, r) { return cleared.indexOf(r) < 0; });
    while (out.length < ROWS) out.unshift(new Array(COLS).fill(0));
    return { board: out, lines: cleared.length, clearedRows: cleared, tspin: tspin };
  }

  function makeBag(rng) {
    const a = PIECES.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor((rng || Math.random)() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Parse setup rows (top -> bottom, 'X' filled) into a board aligned to the floor.
  function boardFromRows(rows, mirror) {
    const b = emptyBoard();
    const off = ROWS - rows.length;
    rows.forEach(function (line, i) {
      const s = mirror ? line.split('').reverse().join('') : line;
      for (let c = 0; c < COLS; c++) if (s[c] && s[c] !== '.' && s[c] !== ' ') b[off + i][c] = 'G';
    });
    return b;
  }

  // Breadth-first search over every input sequence for one piece.
  // Returns { actions, final, result, kick } for the shortest sequence whose lock satisfies goal(result, piece).
  function solveT(board, goal, maxKick) { return solvePiece(board, 'T', goal, maxKick); }
  function solvePiece(board, type, goal, maxKick) {
    if (maxKick === undefined) maxKick = 4;
    const start = spawn(type);
    if (collides(board, start)) return null;
    const key = function (p, f) { return p.x + ',' + p.y + ',' + p.rot + ',' + f; };
    const seen = {};
    const queue = [{ p: start, f: 0, path: [] }];
    seen[key(start, 0)] = true;
    for (let qi = 0; qi < queue.length; qi++) {
      const node = queue[qi];
      const p = node.p;
      if (onSurface(board, p)) {
        const res = lockPiece(board, p, node.f > 0, node.f - 1);
        if (goal(res, p)) return { actions: node.path.concat('lock'), final: p, result: res, kick: node.f - 1 };
      }
      const nexts = [];
      let n = tryMove(board, p, -1, 0); if (n) nexts.push(['left', n, 0]);
      n = tryMove(board, p, 1, 0); if (n) nexts.push(['right', n, 0]);
      n = tryRotate(board, p, 1); if (n && n.kick <= maxKick) nexts.push(['cw', n, n.kick + 1]);
      n = tryRotate(board, p, -1); if (n && n.kick <= maxKick) nexts.push(['ccw', n, n.kick + 1]);
      const d = dropDistance(board, p);
      if (d > 0) nexts.push(['hard', moved(p, 0, d), 0]);
      n = tryMove(board, p, 0, 1); if (n) nexts.push(['soft', n, 0]);
      for (let i = 0; i < nexts.length; i++) {
        const q = { type: type, rot: nexts[i][1].rot, x: nexts[i][1].x, y: nexts[i][1].y };
        const k = key(q, nexts[i][2]);
        if (seen[k]) continue;
        seen[k] = true;
        queue.push({ p: q, f: nexts[i][2], path: node.path.concat(nexts[i][0]) });
      }
    }
    return null;
  }

  function isTSD(res) { return res.tspin === 'full' && res.lines === 2; }

  // Every distinct resting spot a piece can reach by dropping straight down at some rotation/column.
  function dropPlacements(board, type) {
    const seen = {}, out = [];
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS; x++) {
        let p = { type: type, rot: rot, x: x, y: 0 };
        if (collides(board, p)) continue;
        p = moved(p, 0, dropDistance(board, p));
        const key = cellsOf(p).map(function (c) { return c[0] + ':' + c[1]; }).sort().join('|');
        if (seen[key]) continue;
        seen[key] = true;
        out.push(p);
      }
    }
    return out;
  }

  // Can a T dropped next reach a full T-spin double on this board?
  function canTSD(board) {
    let candidate = false;
    for (let rot = 0; rot < 4 && !candidate; rot++) {
      for (let x = -1; x < COLS - 1 && !candidate; x++) {
        for (let y = 0; y < ROWS - 1; y++) {
          const p = { type: 'T', rot: rot, x: x, y: y };
          if (collides(board, p) || !onSurface(board, p)) continue;
          if (detectTSpin(board, p, true, -1) !== 'full') continue;
          if (lockPiece(board, p, true, -1).lines === 2) { candidate = true; break; }
        }
      }
    }
    return candidate && !!solveT(board, isTSD);
  }

  // Can these pieces (in order) be placed so that a T-spin double is available afterwards?
  // Returns the first working list of placements, or null.
  function buildPlan(board, pieces) {
    if (!pieces.length) return canTSD(board) ? [] : null;
    const options = dropPlacements(board, pieces[0]);
    for (let i = 0; i < options.length; i++) {
      const res = lockPiece(board, options[i], false, -1);
      const rest = buildPlan(res.board, pieces.slice(1));
      if (rest) return [options[i]].concat(rest);
    }
    return null;
  }
  // Every working plan (capped), for choosing the cleanest reference build.
  function allPlans(board, pieces, cap) {
    const out = [];
    (function walk(b, rest, acc) {
      if (out.length >= cap) return;
      if (!rest.length) { if (canTSD(b)) out.push({ placements: acc, board: b }); return; }
      dropPlacements(b, rest[0]).forEach(function (p) {
        walk(lockPiece(b, p, false, -1).board, rest.slice(1), acc.concat([p]));
      });
    })(board, pieces, []);
    return out;
  }
  // Empty cells with a filled cell somewhere above them (a rough measure of how messy a stack is).
  function holeCount(board) {
    let n = 0;
    for (let c = 0; c < COLS; c++) {
      let seenFilled = false;
      for (let r = 0; r < ROWS; r++) {
        if (board[r][c]) seenFilled = true;
        else if (seenFilled) n++;
      }
    }
    return n;
  }
  function countPlans(board, pieces) {
    if (!pieces.length) return canTSD(board) ? 1 : 0;
    let n = 0;
    dropPlacements(board, pieces[0]).forEach(function (p) {
      n += countPlans(lockPiece(board, p, false, -1).board, pieces.slice(1));
    });
    return n;
  }

  const api = {
    COLS: COLS, ROWS: ROWS, HIDDEN: HIDDEN, PIECES: PIECES, SHAPES: SHAPES,
    emptyBoard: emptyBoard, cloneBoard: cloneBoard, cellsOf: cellsOf, collides: collides,
    spawn: spawn, moved: moved, tryMove: tryMove, tryRotate: tryRotate, onSurface: onSurface,
    dropDistance: dropDistance, detectTSpin: detectTSpin, lockPiece: lockPiece, makeBag: makeBag,
    boardFromRows: boardFromRows, solveT: solveT, isTSD: isTSD,
    solvePiece: solvePiece, allPlans: allPlans, holeCount: holeCount,
    dropPlacements: dropPlacements, canTSD: canTSD, buildPlan: buildPlan, countPlans: countPlans
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TW = api;
})(this);
