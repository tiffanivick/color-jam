"""Solvability checker for Color Jam (v3 + themed blocks).

Rules (mirrors src/engine.js):
- a block slides one square at a time through free squares (one drag can turn corners)
- a block touching a gate of its colour goes straight through if its whole cross-section fits
- every drag that settles somewhere new, and every exit, is one move
Existing blocks: ice (thaws after k blocks left), lockBy (chained until key block leaves),
axis (h/v only), gray (obstacle, not needed), bomb (must leave within N moves), crates (ignored here).
Themed blocks:
- level["walls"]  stumps: fixed squares nothing can enter
- level["lava"]   lava squares: blocks may slide across but may not stop on them
- jelly    moves at most one square per drag
- comet    slides in a straight line until it hits something (stops only at the end)
- bubble   after every move, rises one square if it can (and pops out of a matching top gate)
- pillar N obstacle that crumbles once N moves have been made
- rainbow  may leave through a gate of any colour
"""
from collections import deque

DIRS = {"left": (0, -1), "right": (0, 1), "up": (-1, 0), "down": (1, 0)}


def shifted(cells, off):
    return [(r + off[0], c + off[1]) for r, c in cells]


def step_result(p, cells, d, occ, rows, cols, exits):
    dr, dc = DIRS[d]
    nxt = [(r + dr, c + dc) for r, c in cells]
    if any(r < 0 or r >= rows or c < 0 or c >= cols for r, c in nxt):
        # the whole block has to slide out: every square needs a clear run to the edge
        for r0, c0 in cells:
            r, c = r0 + dr, c0 + dc
            while 0 <= r < rows and 0 <= c < cols:
                if (r, c) in occ:
                    return "blocked"
                r, c = r + dr, c + dc
        for ex in exits:
            if ex["color"] != p["color"] and not p.get("rainbow"):
                continue
            lo = ex["index"]
            hi = lo + ex.get("length", 1)
            if d == "right" and ex["side"] == "right" and all(lo <= r < hi for r, _ in nxt):
                return "exit"
            if d == "left" and ex["side"] == "left" and all(lo <= r < hi for r, _ in nxt):
                return "exit"
            if d == "down" and ex["side"] == "bottom" and all(lo <= c < hi for _, c in nxt):
                return "exit"
            if d == "up" and ex["side"] == "top" and all(lo <= c < hi for _, c in nxt):
                return "exit"
        return "blocked"
    if any(cell in occ for cell in nxt):
        return "blocked"
    return "move"


def solve(level, rows=6, cols=6, max_states=300_000):
    """Returns (min_moves, path). -1 if unsolvable, None if the search gave up.
    path items: ("park", i, offset) or ("exit", i, offset)."""
    pieces = level["blocks"]
    exits = level["exits"]
    walls = {tuple(w) for w in level.get("walls", [])}
    lava = {tuple(w) for w in level.get("lava", [])}
    n = len(pieces)
    pillars = [(i, p["pillar"]) for i, p in enumerate(pieces) if p.get("pillar")]
    bubbles = [i for i, p in enumerate(pieces) if p.get("bubble")]
    fixed = {i for i, p in enumerate(pieces) if p.get("pillar")}

    def occupied(state, skip):
        occ = set(walls)
        for j, off in enumerate(state):
            if off is not None and j != skip:
                occ.update(shifted(pieces[j]["cells"], off))
        return occ

    def on_lava(cells):
        return any(c in lava for c in cells)

    def explore(state, i):
        p = pieces[i]
        if i in fixed:
            return False, []
        if p.get("ice", 0) > sum(1 for o in state if o is None):
            return False, []
        if p.get("lockBy") is not None and state[p["lockBy"]] is not None:
            return False, []
        axis = p.get("axis")
        dirs = [d for d in DIRS if not axis or (axis == "h") == (d in ("left", "right"))]
        occ = occupied(state, i)
        cur = state[i]
        cells0 = shifted(p["cells"], cur)
        if (p.get("comet") or p.get("jelly")) and any(
                step_result(p, cells0, d, occ, rows, cols, exits) == "exit" for d in dirs):
            return True, []  # touching it next to its gate sends it straight out
        if p.get("comet"):
            can_exit = False
            spots = []
            for d in dirs:
                off = cur
                while True:
                    res = step_result(p, shifted(p["cells"], off), d, occ, rows, cols, exits)
                    if res == "exit":
                        can_exit = True
                        break
                    if res == "blocked":
                        break
                    off = (off[0] + DIRS[d][0], off[1] + DIRS[d][1])
                if res != "exit" and off != cur and not on_lava(shifted(p["cells"], off)):
                    spots.append(off)
            return can_exit, spots
        if p.get("jelly"):
            can_exit = False
            spots = []
            for d in dirs:
                res = step_result(p, cells0, d, occ, rows, cols, exits)
                if res == "exit":
                    can_exit = True
                elif res == "move":
                    off = (cur[0] + DIRS[d][0], cur[1] + DIRS[d][1])
                    if not on_lava(shifted(p["cells"], off)):
                        spots.append(off)
            return can_exit, spots
        seen = {cur}
        queue = deque([cur])
        can_exit = False
        spots = []
        while queue:
            off = queue.popleft()
            cells = shifted(p["cells"], off)
            results = {d: step_result(p, cells, d, occ, rows, cols, exits) for d in dirs}
            if "exit" in results.values():
                can_exit = True
                continue
            if off != cur and not on_lava(cells):
                spots.append(off)
            for d, res in results.items():
                if res == "move":
                    nxt = (off[0] + DIRS[d][0], off[1] + DIRS[d][1])
                    if nxt not in seen:
                        seen.add(nxt)
                        queue.append(nxt)
        return can_exit, spots

    def after_move(ns, moves_used):
        """bubbles rise one square (top-most first), pillars crumble. returns new state."""
        ns = list(ns)
        if bubbles:
            order = sorted((i for i in bubbles if ns[i] is not None),
                           key=lambda i: min(r for r, _ in shifted(pieces[i]["cells"], ns[i])))
            for i in order:
                p = pieces[i]
                occ = occupied(ns, i)
                cells = shifted(p["cells"], ns[i])
                res = step_result(p, cells, "up", occ, rows, cols, exits)
                if res == "exit":
                    ns[i] = None
                elif res == "move":
                    off = (ns[i][0] - 1, ns[i][1])
                    ns[i] = off
        for i, N in pillars:
            if ns[i] is not None and moves_used >= N:
                ns[i] = None
        return tuple(ns)

    needed = [i for i, p in enumerate(pieces) if not p.get("gray") and not p.get("pillar")]
    bombs = [(i, p["bomb"]) for i, p in enumerate(pieces) if p.get("bomb")]

    def boom(ns, moves_used):
        return any(ns[j] is not None and moves_used >= N for j, N in bombs)

    start = tuple((0, 0) for _ in range(n))
    dist = {start: 0}
    parent = {}
    queue = deque([start])
    while queue:
        state = queue.popleft()
        if all(state[i] is None for i in needed):
            path = []
            s = state
            while s != start:
                prev, action = parent[s]
                path.append(action)
                s = prev
            path.reverse()
            return dist[state], path
        if len(dist) > max_states:
            return None, None
        info = {}
        forced = None
        for i, off in enumerate(state):
            if off is None:
                continue
            info[i] = explore(state, i)
            if info[i][0] and forced is None:
                forced = i
        d0 = dist[state]
        cands = []
        if forced is not None:
            cands.append(("exit", forced, state[:forced] + (None,) + state[forced + 1:]))
        else:
            for i, (can_exit, spots) in info.items():
                if can_exit:
                    cands.append(("exit", i, state[:i] + (None,) + state[i + 1:]))
                for off in spots:
                    cands.append(("park", i, state[:i] + (off,) + state[i + 1:]))
        for kind, i, pre in cands:
            ns = after_move(pre, d0 + 1)
            if ns in dist or boom(ns, d0 + 1):
                continue
            dist[ns] = d0 + 1
            parent[ns] = (state, (kind, i, state[i] if kind == "exit" else pre[i]))
            queue.append(ns)
    return -1, None
