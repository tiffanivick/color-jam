// SOLVER (in the game): can the board, exactly as it is now, still be won without power-ups?
// Runs as a Web Worker after every move (app.js), so the game never stutters. It mirrors the
// rules in engine.js and tools/solver3.py, but searches every option: unlike solver3 it never
// assumes that letting a block out is always right (a block may be needed as a comet's stopper).
// Bombs are left out (a fuse running down already ends the level), crates can be smashed at
// any time, and pillars crumble after their remaining moves.
// Answer: true (winnable), false (stuck: no way to win from here), or null (too big to tell).

const DIRS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };

function solvable(B, cap = 150000) {
  const { rows, cols, exits, pieces } = B;
  const walls = new Set((B.walls || []).map(([r, c]) => r + "," + c));
  const lava = new Set((B.lava || []).map(([r, c]) => r + "," + c));
  const n = pieces.length;
  const needed = pieces.map((p) => !p.gray && !p.crate && !p.pillar);
  const pillarMax = Math.max(0, ...pieces.map((p) => p.pillar || 0));
  const bubbles = pieces.map((p, i) => (p.bubble ? i : -1)).filter((i) => i >= 0);
  const shift = (cells, o) => cells.map(([r, c]) => [r + o[0], c + o[1]]);
  const dirsFor = (p) => (p.axis === "h" ? ["left", "right"] : p.axis === "v" ? ["up", "down"] : ["left", "right", "up", "down"]);

  function occupied(st, skip) {
    const occ = new Set(walls);
    for (let j = 0; j < n; j++) if (st[j] && j !== skip) for (const [r, c] of shift(pieces[j].cells, st[j])) occ.add(r + "," + c);
    return occ;
  }
  const onLava = (cells) => lava.size > 0 && cells.some(([r, c]) => lava.has(r + "," + c));
  function step(p, cells, d, occ) {
    const [dr, dc] = DIRS[d];
    const nxt = cells.map(([r, c]) => [r + dr, c + dc]);
    if (nxt.some(([r, c]) => r < 0 || r >= rows || c < 0 || c >= cols)) {
      for (const [r0, c0] of cells) {
        let r = r0 + dr, c = c0 + dc;
        while (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (occ.has(r + "," + c)) return "blocked";
          r += dr;
          c += dc;
        }
      }
      for (const ex of exits) {
        if (ex.color !== p.color && !p.rainbow) continue;
        const lo = ex.index, hi = lo + (ex.length || 1);
        const fitR = nxt.every(([r]) => r >= lo && r < hi), fitC = nxt.every(([, c]) => c >= lo && c < hi);
        if ((d === "right" && ex.side === "right" && fitR) || (d === "left" && ex.side === "left" && fitR)) return "exit";
        if ((d === "down" && ex.side === "bottom" && fitC) || (d === "up" && ex.side === "top" && fitC)) return "exit";
      }
      return "blocked";
    }
    return nxt.some(([r, c]) => occ.has(r + "," + c)) ? "blocked" : "move";
  }
  function straightOut(p, cells, d, occ) {
    for (let k = 0; k < 20; k++) {
      const res = step(p, cells, d, occ);
      if (res !== "move") return res === "exit";
      cells = cells.map(([r, c]) => [r + DIRS[d][0], c + DIRS[d][1]]);
    }
    return false;
  }
  const removedCount = (st) => st.reduce((a, o) => a + (o ? 0 : 1), 0);
  function frozen(st, i) {
    const p = pieces[i];
    return (p.ice || 0) > removedCount(st) || (p.lockBy != null && st[p.lockBy] != null);
  }
  // where block i can go in one move, and whether it can leave
  function explore(st, i) {
    const p = pieces[i];
    const dirs = dirsFor(p);
    const occ = occupied(st, i);
    const cur = st[i];
    const spots = [];
    let canExit = false;
    if (p.comet) {
      for (const d of dirs) {
        let off = cur, res;
        for (;;) {
          res = step(p, shift(p.cells, off), d, occ);
          if (res === "exit") { canExit = true; break; }
          if (res === "blocked") break;
          off = [off[0] + DIRS[d][0], off[1] + DIRS[d][1]];
          const side = d === "left" || d === "right" ? ["up", "down"] : ["left", "right"];
          if (side.some((s) => dirs.includes(s) && straightOut(p, shift(p.cells, off), s, occ))) break;
        }
        if (res !== "exit" && (off[0] !== cur[0] || off[1] !== cur[1]) && !onLava(shift(p.cells, off))) spots.push(off);
      }
      return { canExit, spots };
    }
    if (p.jelly) {
      for (const d of dirs) {
        const res = step(p, shift(p.cells, cur), d, occ);
        if (res === "exit") canExit = true;
        else if (res === "move") {
          const off = [cur[0] + DIRS[d][0], cur[1] + DIRS[d][1]];
          if (!onLava(shift(p.cells, off))) spots.push(off);
        }
      }
      return { canExit, spots };
    }
    const seen = new Set([cur.join()]);
    const queue = [cur];
    while (queue.length) {
      const off = queue.shift();
      const cells = shift(p.cells, off);
      if (off !== cur && !onLava(cells)) spots.push(off);
      for (const d of dirs) {
        const res = step(p, cells, d, occ);
        if (res === "exit") canExit = true;
        else if (res === "move") {
          const nx = [off[0] + DIRS[d][0], off[1] + DIRS[d][1]];
          if (!seen.has(nx.join())) seen.add(nx.join()), queue.push(nx);
        }
      }
    }
    return { canExit, spots };
  }
  // after a move: bubbles float up one square (top-most first); pillars count down
  function afterMove(st, moved) {
    st = st.slice();
    const order = bubbles.filter((i) => st[i]).sort((a, b) => Math.min(...shift(pieces[a].cells, st[a]).map((c) => c[0])) - Math.min(...shift(pieces[b].cells, st[b]).map((c) => c[0])));
    for (const i of order) {
      const res = step(pieces[i], shift(pieces[i].cells, st[i]), "up", occupied(st, i));
      if (res === "exit") st[i] = null;
      else if (res === "move") st[i] = [st[i][0] - 1, st[i][1]];
    }
    pieces.forEach((p, i) => p.pillar && st[i] && moved >= p.pillar && (st[i] = null));
    return st;
  }
  const keyOf = (st, moved) => st.map((o) => (o ? o.join(",") : "x")).join("|") + (pillarMax ? "#" + Math.min(moved, pillarMax) : "");
  const won = (st) => needed.every((need, i) => !need || !st[i]);

  const start = pieces.map((p) => (p.removed ? null : [0, 0]));
  const seen = new Set([keyOf(start, 0)]);
  const stack = [[start, 0]];
  while (stack.length) {
    const [st, moved] = stack.pop();
    if (won(st)) return true;
    if (seen.size > cap) return null;
    const next = [];
    for (let i = 0; i < n; i++) {
      if (!st[i] || pieces[i].pillar) continue;
      if (pieces[i].crate) {
        const ns = st.slice();
        ns[i] = null;
        next.push([ns, moved]); // smashing a crate isn't a move
        continue;
      }
      if (frozen(st, i)) continue;
      const { canExit, spots } = explore(st, i);
      for (const off of spots) {
        const ns = st.slice();
        ns[i] = off;
        next.push([afterMove(ns, moved + 1), moved + 1]);
      }
      if (canExit) {
        const ns = st.slice();
        ns[i] = null;
        next.push([afterMove(ns, moved + 1), moved + 1]); // pushed last: tried first
      }
    }
    for (const [ns, m] of next) {
      const k = keyOf(ns, m);
      if (seen.has(k)) continue;
      seen.add(k);
      stack.push([ns, m]);
    }
  }
  return false;
}

if (typeof module !== "undefined" && module.exports) module.exports = { solvable };
else if (typeof window === "undefined" && typeof self !== "undefined")
  self.onmessage = (e) => self.postMessage({ id: e.data.id, solvable: solvable(e.data.board, e.data.cap) });
