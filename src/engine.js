// ENGINE: the board, the blocks, dragging and the rules. No menus, no coins.
// The game layer (app.js) plugs in by defining updateHUD(), updateBoosters(),
// checkWin() and calling hooks below.

// ---------- board geometry ----------
let ROWS = 6; // set per level from levels.json
let COLS = 6;
const CELL = 48; // pixel size of one square
const GAP = 6; // gap between squares (matches .board gap)
const PADDING = 0; // space between squares and the frame (matches .board padding)
const BORDER = 14; // thickness of the frame (matches .board border)
const RING = 3; // the frame's outer edge line
const GATE_THICK = BORDER + RING; // gates fill the frame wall plus the padding
const STEP = CELL + GAP; // distance in pixels from one square to the next

let BOARD_W = 0; // pixel width/height of the grid, set in buildBoard
let BOARD_H = 0;

const boardEl = document.getElementById("board");
let blocks = [];
let exits = [];
let boardWalls = []; // stumps: fixed squares
let boardLava = []; // lava: slide across, can't stop
let moves = 0;
let blastMode = false;
let undoStack = [];
let levelOver = false;
const hooks = { start() {}, exit() {}, move() {}, crack() {}, boom() {}, crateHit() {}, crateBreak() {} };

const piecesEl = document.createElement("div");
piecesEl.className = "pieces";
piecesEl.style.left = PADDING + "px";
piecesEl.style.top = PADDING + "px";
boardEl.appendChild(piecesEl);

// (Re)builds the empty grid for the current ROWS x COLS
function buildBoard() {
  boardEl.querySelectorAll(".cell").forEach((el) => el.remove());
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, ${CELL}px)`;
  boardEl.style.gridTemplateRows = `repeat(${ROWS}, ${CELL}px)`;
  BOARD_W = COLS * CELL + (COLS - 1) * GAP;
  BOARD_H = ROWS * CELL + (ROWS - 1) * GAP;
  piecesEl.style.width = BOARD_W + "px";
  piecesEl.style.height = BOARD_H + "px";
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    boardEl.insertBefore(cell, piecesEl);
  }
}

// ---------- block rules ----------
// a block may be locked in a few ways: ice (thaws as other blocks leave),
// chains (locked until its key block leaves), or it may only slide one way.
const dirsFor = (b) => (b.axis === "h" ? ["left", "right"] : b.axis === "v" ? ["up", "down"] : ["left", "right", "up", "down"]);
const isNeeded = (b) => !b.gray && !b.crate && !b.pillar; // blocks that must leave for the level to be won
// stumps (fixed squares) and lava tiles live on the board itself, not in blocks
function renderBoardFeatures() {
  piecesEl.querySelectorAll(".stump").forEach((s) => s.remove());
  const cellEls = boardEl.querySelectorAll(".cell");
  cellEls.forEach((c) => c.classList.remove("lava"));
  boardLava.forEach(([r, c]) => cellEls[r * COLS + c] && cellEls[r * COLS + c].classList.add("lava"));
  boardWalls.forEach(([r, c]) => {
    const s = document.createElement("div");
    s.className = "stump";
    s.style.left = c * STEP + "px";
    s.style.top = r * STEP + "px";
    s.style.width = s.style.height = CELL + "px";
    s.innerHTML = "<i></i>";
    piecesEl.appendChild(s);
  });
}
function chained(b) {
  return b.lockBy != null && blocks[b.lockBy] && !blocks[b.lockBy].removed;
}

// ---------- ice ----------
function removedCount() {
  return blocks.filter((b) => b.removed).length;
}
function iceLeft(b) {
  return b.ice ? Math.max(0, b.ice - removedCount()) : 0;
}
function isFrozen(b) {
  return iceLeft(b) > 0 || chained(b);
}

// Updates every iced block: the number on it, and thaws it when it hits zero.
function refreshIce() {
  blocks.forEach((b) => {
    if (b.el && b.el.classList.contains("chained") && !b.removed && !chained(b)) {
      b.el.classList.remove("chained");
      b.el.classList.add("unchain");
      hooks.crack();
      setTimeout(() => b.el && b.el.classList.remove("unchain"), 700);
      if (b.lockEl) setTimeout(() => b.lockEl.remove(), 350);
    }
  });
  blocks.forEach((b) => {
    if (!b.iced || b.removed || !b.el) return;
    const left = iceLeft(b);
    if (left > 0) {
      b.badge.textContent = left;
    } else if (b.el.classList.contains("frozen")) {
      b.el.classList.remove("frozen");
      b.el.classList.add("thaw");
      hooks.crack();
      const badge = b.badge;
      setTimeout(() => badge && badge.remove(), 350);
      setTimeout(() => b.el && b.el.classList.remove("thaw"), 700);
    }
  });
}

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth; // restart the animation
  el.classList.add("shake");
}

// ---------- rendering ----------
function cellHasNeighbor(b, r, c, dr, dc) {
  return b.cells.some(([rr, cc]) => rr === r + dr && cc === c + dc);
}

function renderBlock(b) {
  const rows = b.cells.map((c) => c[0]);
  const cols = b.cells.map((c) => c[1]);
  const r0 = Math.min(...rows),
    c0 = Math.min(...cols);
  const r1 = Math.max(...rows),
    c1 = Math.max(...cols);

  const wrapper = document.createElement("div");
  wrapper.className = "block-group";
  wrapper.style.left = c0 * STEP + "px";
  wrapper.style.top = r0 * STEP + "px";
  wrapper.style.width = (c1 - c0 + 1) * CELL + (c1 - c0) * GAP + "px";
  wrapper.style.height = (r1 - r0 + 1) * CELL + (r1 - r0) * GAP + "px";
  // for the realistic skin: block colour and size, so lighting can run across the whole block
  wrapper.style.setProperty("--bc", b.color);
  // Realistic style: the whole block as one molded shape (see brick.js)
  wrapper.insertAdjacentHTML(
    "afterbegin",
    brickSVG(b, c0, r0, (c1 - c0 + 1) * CELL + (c1 - c0) * GAP, (r1 - r0 + 1) * CELL + (r1 - r0) * GAP),
  );
  wrapper.style.setProperty("--gw", wrapper.style.width);
  wrapper.style.setProperty("--gh", wrapper.style.height);

  b.cells.forEach(([r, c]) => {
    const hasRight = cellHasNeighbor(b, r, c, 0, 1);
    const hasLeft = cellHasNeighbor(b, r, c, 0, -1);
    const hasDown = cellHasNeighbor(b, r, c, 1, 0);
    const hasUp = cellHasNeighbor(b, r, c, -1, 0);

    const cellEl = document.createElement("div");
    cellEl.className = "block-cell" + (hasDown ? "" : " base") + (hasUp ? "" : " e-t") + (hasLeft ? "" : " e-l") + (hasRight ? "" : " e-r");
    cellEl.style.setProperty("--ox", (c - c0) * STEP + "px");
    cellEl.style.setProperty("--oy", (r - r0) * STEP + "px");
    cellEl.style.left = (c - c0) * STEP + "px";
    cellEl.style.top = (r - r0) * STEP + "px";
    cellEl.style.width = CELL + (hasRight ? GAP : 0) + "px";
    cellEl.style.height = CELL + (hasDown ? GAP : 0) + "px";
    cellEl.style.backgroundColor = b.color;
    // solid lip under the brick (only squares with nothing below them get one)
    cellEl.style.boxShadow = hasDown
      ? "none"
      : `0 5px 0 color-mix(in srgb, ${b.color} 52%, #120a40), 0 11px 12px -3px rgba(8, 4, 36, 0.5)`;
    cellEl.style.borderTopLeftRadius = !hasUp && !hasLeft ? "8px" : "0";
    cellEl.style.borderTopRightRadius = !hasUp && !hasRight ? "8px" : "0";
    cellEl.style.borderBottomLeftRadius = !hasDown && !hasLeft ? "8px" : "0";
    cellEl.style.borderBottomRightRadius = !hasDown && !hasRight ? "8px" : "0";
    if (!hasDown) {
      // the block's front wall (shown by the realistic style)
      const side = document.createElement("i");
      side.className = "side" + (hasLeft ? "" : " sl") + (hasRight ? "" : " sr");
      cellEl.appendChild(side);
    }
    wrapper.appendChild(cellEl);
  });

  // inside bend of an L: carry the dark underside edge across the gap so it meets the other arm cleanly
  const hasCell = (r, c) => b.cells.some(([rr, cc]) => rr === r && cc === c);
  b.cells.forEach(([r, c]) => {
    if (hasCell(r + 1, c) || !hasCell(r, c - 1) || !hasCell(r + 1, c - 1)) return;
    const j = document.createElement("div");
    j.className = "lip-joint";
    j.style.left = (c - c0) * STEP - GAP + "px";
    j.style.top = (r - r0) * STEP + CELL + "px";
    j.style.width = GAP + "px";
    j.style.height = GAP + "px";
    j.style.background = `color-mix(in srgb, ${b.color} 52%, #120a40)`;
    wrapper.appendChild(j);
  });

  b.el = wrapper;
  const keyOf = blocks.findIndex((o) => o.lockBy != null && blocks[o.lockBy] === b);
  if (b.gray) wrapper.classList.add("gray");
  if (b.crate) wrapper.classList.add("crate");
  if (b.axis) wrapper.classList.add("dir-" + b.axis);
  if (b.bomb) {
    b.bombLeft = b.bomb;
    wrapper.classList.add("bomb");
    if (b.bombLeft <= 2) wrapper.classList.add("hot");
    const bd = document.createElement("div");
    bd.className = "bomb-badge";
    bd.textContent = b.bombLeft;
    const f0 = b.cells.reduce((a, c) => (c[0] > a[0] || (c[0] === a[0] && c[1] > a[1]) ? c : a)); // last cell
    bd.style.left = (f0[1] - c0) * STEP + CELL / 2 - 14 + "px";
    bd.style.top = (f0[0] - r0) * STEP + CELL / 2 - 14 + "px";
    wrapper.appendChild(bd);
    b.badge = bd;
  }
  if (b.lockBy != null) {
    wrapper.classList.add("chained");
    const lk = document.createElement("div");
    lk.className = "lock-badge";
    const key = blocks[b.lockBy];
    lk.style.setProperty("--k", key ? key.color : "#fff");
    lk.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.2c.9 0 1.8.9 1.8 1.8v8.4c0 .9-.9 1.8-1.8 1.8H5.8C4.9 22 4 21.1 4 20.2v-8.4C4 10.9 4.9 10 5.8 10H7Zm2.2 0h5.6V8a2.8 2.8 0 0 0-5.6 0v2Z"/></svg>';
    const f1 = b.cells.reduce((a, c) => (c[0] < a[0] || (c[0] === a[0] && c[1] < a[1]) ? c : a));
    lk.style.left = (f1[1] - c0) * STEP + CELL / 2 - 14 + "px";
    lk.style.top = (f1[0] - r0) * STEP + CELL / 2 - 14 + "px";
    wrapper.appendChild(lk);
    b.lockEl = lk;
  }
  if (keyOf >= 0) {
    const kb = document.createElement("div");
    kb.className = "key-badge";
    kb.style.setProperty("--k", blocks[keyOf].color);
    kb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14.5 3a5.5 5.5 0 0 0-5.2 7.2L3 16.5V21h4.5v-2.2H10v-2.3h2.2l1.1-1.1A5.5 5.5 0 1 0 14.5 3Zm1.8 3.4a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"/></svg>';
    const sorted = [...b.cells].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const f2 = sorted[Math.floor(sorted.length / 2)];
    kb.style.left = (f2[1] - c0) * STEP + CELL / 2 - 14 + "px";
    kb.style.top = (f2[0] - r0) * STEP + CELL / 2 - 14 + "px";
    wrapper.appendChild(kb);
  }
  if (b.jelly) wrapper.classList.add("jelly");
  if (b.comet) wrapper.classList.add("comet");
  if (b.bubble) wrapper.classList.add("bubble");
  if (b.rainbow) wrapper.classList.add("rainbow");
  if (b.pillar) {
    b.pillarLeft = b.pillar;
    wrapper.classList.add("pillar");
    const pb = document.createElement("div");
    pb.className = "pillar-badge";
    pb.textContent = b.pillarLeft;
    pb.style.left = ((c1 - c0 + 1) * STEP - GAP) / 2 - 14 + "px";
    pb.style.top = ((r1 - r0 + 1) * STEP - GAP) / 2 - 14 + "px";
    wrapper.appendChild(pb);
    b.pbadge = pb;
  }
  b.iced = !!b.ice;
  if (b.ice) {
    // the number sits on the top-left square of the block
    const first = b.cells.reduce((a, c) =>
      c[0] < a[0] || (c[0] === a[0] && c[1] < a[1]) ? c : a,
    );
    const badge = document.createElement("div");
    badge.className = "ice-badge";
    badge.style.left = (first[1] - c0) * STEP + CELL / 2 - 13 + "px";
    badge.style.top = (first[0] - r0) * STEP + CELL / 2 - 13 + "px";
    badge.textContent = b.ice;
    wrapper.appendChild(badge);
    b.badge = badge;
    wrapper.classList.add("frozen");
  }

  setupDrag(b, wrapper);
  piecesEl.appendChild(wrapper);
}

function renderExit(e) {
  const el = document.createElement("div");
  el.className = "exit exit-" + e.side;
  el.style.background = e.color;
  const span = e.length || 1;
  const spanPx = span * CELL + (span - 1) * GAP;

  // gates are cut into the frame: they fill the wall and the padding in front of it
  if (e.side === "right") {
    el.style.left = PADDING + BOARD_W + "px";
    el.style.top = PADDING + e.index * STEP + "px";
    el.style.width = GATE_THICK + "px";
    el.style.height = spanPx + "px";
  } else if (e.side === "left") {
    el.style.left = PADDING - GATE_THICK + "px";
    el.style.top = PADDING + e.index * STEP + "px";
    el.style.width = GATE_THICK + "px";
    el.style.height = spanPx + "px";
  } else if (e.side === "bottom") {
    el.style.top = PADDING + BOARD_H + "px";
    el.style.left = PADDING + e.index * STEP + "px";
    el.style.height = GATE_THICK + "px";
    el.style.width = spanPx + "px";
  } else if (e.side === "top") {
    el.style.top = PADDING - GATE_THICK + "px";
    el.style.left = PADDING + e.index * STEP + "px";
    el.style.height = GATE_THICK + "px";
    el.style.width = spanPx + "px";
  }

  e.el = el;
  boardEl.appendChild(el);
}

// ---------- dragging ----------
let drag = null;

const DIRS = {
  left: [0, -1],
  right: [0, 1],
  up: [-1, 0],
  down: [1, 0],
};

const MAX_STEP = 0.1; // squares moved per tiny step toward the pointer
const SNAP = 0.22; // how strongly blocks lock onto squares: 0 = off, just under 0.5 = very strong

// Maps a position (in squares) to where the block is drawn. Within SNAP of a
// square the block locks onto it; between squares it glides across.
function snapAxis(v) {
  const base = Math.floor(v);
  const f = v - base;
  if (f < SNAP) return base;
  if (f > 1 - SNAP) return base + 1;
  return base + (f - SNAP) / (1 - 2 * SNAP);
}

const stateKey = (dr, dc) => dr + "," + dc;

function shiftCells(cells, dr, dc) {
  return cells.map(([r, c]) => [r + dr, c + dc]);
}

// Every square-aligned position (as a row/col offset from where the block started)
// that the block can reach through empty space. A position where the block touches
// a matching gate is flagged with the direction it exits in. The block goes
// straight through, so it can't travel on from there.
const onLava = (cells) => boardLava.length > 0 && cells.some(([r, c]) => boardLava.some(([lr, lc]) => lr === r && lc === c));

function computeReachable(block) {
  const reach = new Map();
  const start = { dr: 0, dc: 0, exitDir: null };
  reach.set(stateKey(0, 0), start);
  const dirs = dirsFor(block);

  // comet: only straight lines; it can only come to rest at the end of a line
  if (block.comet) {
    const gate0 = dirs.find((dir) => tryStep(block, block.cells, dir).status === "exit");
    if (gate0) start.exitDir = gate0;
    for (const dir of dirs) {
      let s = start;
      let cells = block.cells;
      for (;;) {
        const t = tryStep(block, cells, dir);
        if (t.status === "exit") {
          if (s !== start) s.exitDir = dir;
          break;
        }
        if (t.status !== "move") break;
        const n = { dr: s.dr + DIRS[dir][0], dc: s.dc + DIRS[dir][1], exitDir: null, noStop: true, line: dir };
        reach.set(stateKey(n.dr, n.dc), n);
        cells = t.next;
        s = n;
      }
      if (s !== start && !s.exitDir) s.noStop = onLava(shiftCells(block.cells, s.dr, s.dc));
      if (s !== start) s.lineEnd = true;
    }
    return reach;
  }

  // jelly: one square per drag, and it can only leave from where it already is
  if (block.jelly) {
    const gate0 = dirs.find((dir) => tryStep(block, block.cells, dir).status === "exit");
    if (gate0) {
      start.exitDir = gate0;
      return reach;
    }
    for (const dir of dirs) {
      const t = tryStep(block, block.cells, dir);
      if (t.status !== "move") continue;
      const n = { dr: DIRS[dir][0], dc: DIRS[dir][1], exitDir: null };
      n.noStop = onLava(t.next);
      reach.set(stateKey(n.dr, n.dc), n);
    }
    return reach;
  }

  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    const cells = shiftCells(block.cells, s.dr, s.dc);

    const gate = dirs.find(
      (dir) => tryStep(block, cells, dir).status === "exit",
    );
    if (gate) {
      s.exitDir = gate;
      continue;
    }

    for (const dir of dirs) {
      const nr = s.dr + DIRS[dir][0];
      const nc = s.dc + DIRS[dir][1];
      if (reach.has(stateKey(nr, nc))) continue;
      const t = tryStep(block, cells, dir);
      if (t.status === "move") {
        const n = { dr: nr, dc: nc, exitDir: null, noStop: onLava(t.next) };
        reach.set(stateKey(nr, nc), n);
        queue.push(n);
      }
    }
  }
  return reach;
}

// Everywhere the block may physically be, as rectangles [x0, y0, x1, y1] in squares:
// each reachable square, the strip between two neighbouring reachable squares,
// and any 2x2 patch of reachable squares.
function buildRects(reach) {
  const rects = [];
  for (const s of reach.values()) {
    const x = s.dc;
    const y = s.dr;
    const right = reach.has(stateKey(y, x + 1));
    const down = reach.has(stateKey(y + 1, x));
    rects.push([x, y, x, y]);
    if (right) rects.push([x, y, x + 1, y]);
    if (down) rects.push([x, y, x, y + 1]);
    if (right && down && reach.has(stateKey(y + 1, x + 1))) {
      rects.push([x, y, x + 1, y + 1]);
    }
  }
  return rects;
}

// The closest allowed position to (tx, ty).
function project(rects, tx, ty) {
  let bx = 0;
  let by = 0;
  let bd = Infinity;
  for (const [x0, y0, x1, y1] of rects) {
    const x = Math.min(Math.max(tx, x0), x1);
    const y = Math.min(Math.max(ty, y0), y1);
    const d = (x - tx) ** 2 + (y - ty) ** 2;
    if (d < bd) {
      bd = d;
      bx = x;
      by = y;
    }
  }
  return [bx, by];
}

// Moves the block toward (tx, ty) in tiny steps, staying inside the allowed area.
// Because each step is tiny, the block can't skip over a wall, and when it is
// pushed diagonally into one it slides along it.
function dragTo(d, tx, ty) {
  let [x, y] = d.pos;
  for (let i = 0; i < 120; i++) {
    const rem = Math.hypot(tx - x, ty - y);
    if (rem < 1e-4) break;
    const k = Math.min(MAX_STEP, rem) / rem;
    const [nx, ny] = project(d.rects, x + (tx - x) * k, y + (ty - y) * k);
    if (Math.hypot(nx - x, ny - y) < 1e-4) break; // blocked
    x = nx;
    y = ny;

    // locked onto a square that is a gate for this block?
    const sx = snapAxis(x);
    const sy = snapAxis(y);
    for (const s of d.reach.values()) {
      if (s.exitDir && s.dc === sx && s.dr === sy) {
        d.pos = [x, y];
        return s;
      }
    }
  }
  d.pos = [x, y];
  return null;
}

// The block eases toward where the pointer wants it each frame, instead of
// jumping there, so movement feels soft. GLIDE: 1 = instant, lower = softer.
const GLIDE = 0.4;

function showPos(d) {
  d.tx = d.baseLeft + snapAxis(d.pos[0]) * STEP;
  d.ty = d.baseTop + snapAxis(d.pos[1]) * STEP;
  if (!d.raf) d.raf = requestAnimationFrame(() => glide(d));
}

function glide(d) {
  d.raf = 0;
  if (d.stopped) return;
  const cx = parseFloat(d.el.style.left);
  const cy = parseFloat(d.el.style.top);
  let nx = cx + (d.tx - cx) * GLIDE;
  let ny = cy + (d.ty - cy) * GLIDE;
  if (Math.abs(d.tx - nx) < 0.4) nx = d.tx;
  if (Math.abs(d.ty - ny) < 0.4) ny = d.ty;
  d.el.style.left = nx + "px";
  d.el.style.top = ny + "px";
  if (nx !== d.tx || ny !== d.ty) d.raf = requestAnimationFrame(() => glide(d));
}

function stopGlide(d) {
  d.stopped = true;
  if (d.raf) cancelAnimationFrame(d.raf);
  d.raf = 0;
}

function setupDrag(b, el) {
  el.style.cursor = "grab";
  el.addEventListener("pointerdown", (e) => {
    if (drag || b.removed || levelOver) return;
    e.preventDefault();
    if (blastMode) {
      blast(b);
      return;
    }
    if (b.crate) {
      hooks.start();
      hitCrate(b);
      return;
    }
    if (isFrozen(b) || b.pillar) {
      shake(el); // frozen (or a sand pillar): can't be moved
      return;
    }
    hooks.start();
    const reach = computeReachable(b);
    const start = reach.get(stateKey(0, 0));
    if (start.exitDir) {
      exitBlock(b, el, start);
      return;
    }
    const r0 = Math.min(...b.cells.map((c) => c[0]));
    const c0 = Math.min(...b.cells.map((c) => c[1]));
    el.style.transition = "none";
    drag = {
      block: b,
      el,
      reach,
      rects: buildRects(reach),
      pos: [0, 0],
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: c0 * STEP,
      baseTop: r0 * STEP,
    };
    el.setPointerCapture(e.pointerId);
  });
}

// ---------- bombs and crates ----------
// every move (a slide that settles, or a block leaving) uses up one tick of each bomb
function afterMove() {
  // bubbles float up one square (top-most first); one at a matching top gate pops out
  blocks
    .filter((b) => b.bubble && !b.removed)
    .sort((a, b) => Math.min(...a.cells.map((c) => c[0])) - Math.min(...b.cells.map((c) => c[0])))
    .forEach((b) => {
      const t = tryStep(b, b.cells, "up");
      if (t.status === "exit") {
        driftExit(b);
      } else if (t.status === "move") {
        b.cells = t.next;
        floatTo(b);
      }
    });
  // sand pillars crumble once enough moves have been made
  blocks.forEach((b) => {
    if (!b.pillar || b.removed) return;
    b.pillarLeft = Math.max(0, b.pillarLeft - 1);
    if (b.pbadge) b.pbadge.textContent = b.pillarLeft;
    if (b.pillarLeft <= 0) crumble(b);
  });
  blocks.forEach((b) => {
    if (!b.bomb || b.removed) return;
    b.bombLeft = Math.max(0, b.bombLeft - 1);
    if (b.badge) b.badge.textContent = b.bombLeft;
    if (b.el) b.el.classList.toggle("hot", b.bombLeft <= 2);
    if (b.bombLeft <= 0) hooks.boom(b);
  });
}
// move a block's picture to where its squares are (after the settle animation)
function floatTo(b) {
  const el = b.el;
  if (!el) return;
  const r0 = Math.min(...b.cells.map((c) => c[0]));
  const c0 = Math.min(...b.cells.map((c) => c[1]));
  setTimeout(() => {
    if (b.removed || (drag && drag.block === b)) return;
    el.style.transition = "left 0.3s ease-out, top 0.3s ease-out";
    el.style.left = c0 * STEP + "px";
    el.style.top = r0 * STEP + "px";
  }, 150);
}
// a bubble that floats into its own top gate leaves without costing a move
function driftExit(b) {
  b.removed = true;
  const el = b.el;
  hooks.exit(b);
  const ex = findExit(b, b.cells.map(([r, c]) => [r - 1, c]), "up");
  setTimeout(() => {
    celebrateExit(b, ex);
    if (!el) return;
    el.classList.add("gone");
    el.style.pointerEvents = "none";
    el.style.transition = "top 0.35s ease-in, opacity 0.35s ease-in";
    el.style.top = parseFloat(el.style.top) - 2 * STEP + "px";
    el.style.opacity = "0.2";
    setTimeout(() => el.remove(), 380);
  }, 150);
  refreshIce();
  setTimeout(() => {
    updateBoosters();
    checkWin();
  }, 0);
}
function crumble(b) {
  b.removed = true;
  const el = b.el;
  if (!el) return;
  el.classList.add("gone", "crumble");
  el.style.pointerEvents = "none";
  hooks.crack();
  setTimeout(() => el.remove(), 600);
  refreshIce();
}
// a crate takes two taps: the first cracks it, the second smashes it
function hitCrate(b) {
  b.hits = (b.hits || 0) + 1;
  if (b.hits < (b.taps || 2)) {
    b.el.classList.add("cracked");
    shake(b.el);
    hooks.crateHit(b);
    return;
  }
  b.removed = true;
  const el = b.el;
  el.style.pointerEvents = "none";
  burst(
    PADDING + parseFloat(el.style.left) + parseFloat(el.style.width) / 2,
    PADDING + parseFloat(el.style.top) + parseFloat(el.style.height) / 2,
    "#d9a566",
    16,
  );
  el.classList.add("blasted");
  setTimeout(() => el.remove(), 320);
  hooks.crateBreak(b);
  refreshIce();
  updateBoosters();
}

// ---------- exit effect ----------
// A burst of confetti-like chips at the gate, and the gate itself flashes.
function celebrateExit(block, ex) {
  if (!ex || !ex.el) return;
  const g = ex.el;
  const cx = parseFloat(g.style.left) + parseFloat(g.style.width) / 2;
  const cy = parseFloat(g.style.top) + parseFloat(g.style.height) / 2;
  const out = {
    right: [1, 0],
    left: [-1, 0],
    top: [0, -1],
    bottom: [0, 1],
  }[ex.side];

  g.classList.remove("flash");
  void g.offsetWidth;
  g.classList.add("flash");
  setTimeout(() => g.classList.remove("flash"), 600);

  const count = 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "fx chip";
    const size = 5 + Math.random() * 6;
    p.style.width = p.style.height = size + "px";
    p.style.left = cx - size / 2 + "px";
    p.style.top = cy - size / 2 + "px";
    p.style.background = i % 3 === 0 ? "#ffffff" : block.color;
    // fly mostly outward, fanned across the width of the gate
    const spread = (Math.random() - 0.5) * 1.6;
    const dist = 34 + Math.random() * 46;
    const dx = (out[0] + spread * out[1]) * dist;
    const dy = (out[1] + spread * out[0]) * dist;
    p.style.setProperty("--dx", dx + "px");
    p.style.setProperty("--dy", dy + "px");
    p.style.setProperty("--rot", (Math.random() - 0.5) * 360 + "deg");
    p.style.animationDuration = 450 + Math.random() * 300 + "ms";
    boardEl.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function exitBlock(block, el, state) {
  block.removed = true;
  moves++;
  updateHUD();
  hooks.exit(block);
  afterMove();

  const rows = block.cells.map((c) => c[0]);
  const cols = block.cells.map((c) => c[1]);
  const rowSpan = Math.max(...rows) - Math.min(...rows) + 1;
  const colSpan = Math.max(...cols) - Math.min(...cols) + 1;
  const [vr, vc] = DIRS[state.exitDir];

  // which gate is it going through?
  const shifted = shiftCells(block.cells, state.dr + vr, state.dc + vc);
  celebrateExit(block, findExit(block, shifted, state.exitDir));

  // slide on through the gate; the edge of the grid hides the block as it goes
  el.style.pointerEvents = "none";
  el.classList.add("gone");
  el.style.transition =
    "left 0.25s ease-in, top 0.25s ease-in, opacity 0.25s ease-in";
  el.style.left = (Math.min(...cols) + state.dc + vc * colSpan) * STEP + "px";
  el.style.top = (Math.min(...rows) + state.dr + vr * rowSpan) * STEP + "px";
  el.style.opacity = "0.2";
  setTimeout(() => el.remove(), 300);

  refreshIce();

  updateBoosters();
  checkWin();
}

window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const gate = dragTo(
    drag,
    (e.clientX - drag.startX) / STEP,
    (e.clientY - drag.startY) / STEP,
  );
  showPos(drag);
  if (gate) {
    // locked onto a matching gate: straight through
    const { block, el } = drag;
    stopGlide(drag);
    drag = null;
    exitBlock(block, el, gate);
  }
});

function endDrag() {
  if (!drag) return;
  const { block, el, reach, pos, baseLeft, baseTop } = drag;
  stopGlide(drag);
  drag = null;

  // settle on the closest square it may stop on (never on lava)
  let best = null;
  let bestDist = Infinity;
  if (block.comet) {
    // a comet keeps going: pushed far enough along a line, it flies to that line's end
    const ax = Math.abs(pos[0]) >= Math.abs(pos[1]) ? "h" : "v";
    const amt = ax === "h" ? pos[0] : pos[1];
    const dir = ax === "h" ? (amt > 0 ? "right" : "left") : amt > 0 ? "down" : "up";
    best = reach.get(stateKey(0, 0));
    if (Math.abs(amt) >= 0.3) {
      for (const s of reach.values()) if (s.line === dir && s.lineEnd) best = s;
      if (best.noStop && !best.exitDir) best = reach.get(stateKey(0, 0));
    }
  } else {
    for (const s of reach.values()) {
      if (s.noStop && !s.exitDir) continue;
      const d = (s.dc - pos[0]) ** 2 + (s.dr - pos[1]) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
  }

  if (best.exitDir) {
    exitBlock(block, el, best);
    return;
  }

  el.style.transition = "left 0.12s ease-out, top 0.12s ease-out";
  el.style.left = baseLeft + best.dc * STEP + "px";
  el.style.top = baseTop + best.dr * STEP + "px";
  if (best.dr !== 0 || best.dc !== 0) {
    undoStack.push({ snap: blocks.map((o) => o.cells), pillars: blocks.map((o) => o.pillarLeft) });
    block.cells = shiftCells(block.cells, best.dr, best.dc);
    moves++;
    updateHUD();
    updateBoosters();
    afterMove();
    hooks.move();
  }
}

window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

// ---------- rules ----------
// The gate (if any) that a block of this colour may leave through when its
// squares are at `next` and it is moving in `dir`. The block's full width must
// fit inside the gate.
function findExit(movingBlock, next, dir) {
  return exits.find((ex) => {
    if (ex.color !== movingBlock.color && !movingBlock.rainbow) return false;
    const span = ex.length || 1;
    const fits = (n) => n >= ex.index && n < ex.index + span;
    if (dir === "right")
      return ex.side === "right" && next.every(([r]) => fits(r));
    if (dir === "left")
      return ex.side === "left" && next.every(([r]) => fits(r));
    if (dir === "down")
      return ex.side === "bottom" && next.every(([, c]) => fits(c));
    return ex.side === "top" && next.every(([, c]) => fits(c));
  });
}

function exitPathClear(movingBlock, cells, vec) {
  const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const taken = (r, c) =>
    boardWalls.some(([wr, wc]) => wr === r && wc === c) ||
    blocks.some((o) => o !== movingBlock && !o.removed && o.cells.some(([orr, oc]) => orr === r && oc === c));
  for (const [r0, c0] of cells) {
    let r = r0 + vec[0];
    let c = c0 + vec[1];
    while (inside(r, c)) {
      if (taken(r, c)) return false;
      r += vec[0];
      c += vec[1];
    }
  }
  return true;
}

function tryStep(movingBlock, cells, dir) {
  const vec = DIRS[dir];
  const next = cells.map(([r, c]) => [r + vec[0], c + vec[1]]);

  const leavesBoard = next.some(
    ([r, c]) => r < 0 || r >= ROWS || c < 0 || c >= COLS,
  );

  if (leavesBoard) {
    if (!findExit(movingBlock, next, dir)) return { status: "blocked" };
    // the whole block has to slide out: every square needs a clear run to the edge
    return exitPathClear(movingBlock, cells, vec) ? { status: "exit" } : { status: "blocked" };
  }

  const occupied = blocks.some(
    (other) =>
      other !== movingBlock &&
      !other.removed &&
      other.cells.some(([r, c]) =>
        next.some(([nr, nc]) => nr === r && nc === c),
      ),
  );
  if (occupied) return { status: "blocked" };
  if (boardWalls.some(([r, c]) => next.some(([nr, nc]) => nr === r && nc === c))) return { status: "blocked" };

  return { status: "move", next };
}


// confetti-style chips flying out from a point on the board
function burst(cx, cy, color, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "fx chip";
    const size = 5 + Math.random() * 6;
    p.style.width = p.style.height = size + "px";
    p.style.left = cx - size / 2 + "px";
    p.style.top = cy - size / 2 + "px";
    p.style.background = i % 3 === 0 ? "#ffffff" : color;
    const ang = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 50;
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    p.style.setProperty("--rot", (Math.random() - 0.5) * 360 + "deg");
    p.style.animationDuration = 450 + Math.random() * 300 + "ms";
    boardEl.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

// Blast: removes the block you tap, wherever it is
