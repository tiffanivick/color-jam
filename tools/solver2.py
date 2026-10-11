"""Solvability checker for Color Jam levels.

Mirrors the rules in game.js:
- a piece moves one square at a time through free squares (one drag can turn corners)
- a piece touching a gate of its own colour goes straight through, but only if its
  whole cross-section fits inside the gate
- releasing a piece anywhere else just parks it there
Every drag (a park or an exit) counts as one move.
"""
from collections import deque

DIRS = {"left": (0, -1), "right": (0, 1), "up": (-1, 0), "down": (1, 0)}


def block(tag, color, orientation, row, col, length, ice=0):
    cells = [[row, col + i] if orientation == "h" else [row + i, col] for i in range(length)]
    return shape(tag, color, cells, ice)


def shape(tag, color, cells, ice=0):
    d = {"tag": tag, "color": color, "cells": cells}
    if ice:
        d["ice"] = ice
    return d


def shifted(cells, off):
    return [(r + off[0], c + off[1]) for r, c in cells]


def step_result(color, cells, d, occ, rows, cols, exits):
    dr, dc = DIRS[d]
    nxt = [(r + dr, c + dc) for r, c in cells]
    if any(r < 0 or r >= rows or c < 0 or c >= cols for r, c in nxt):
        for ex in exits:
            if ex["color"] != color:
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
    """Returns (min_drags, path). min_drags is -1 if unsolvable, None if the search gave up."""
    pieces = level["blocks"]
    exits = level["exits"]
    walls = {tuple(w) for w in level.get("walls", [])}
    n = len(pieces)

    def occupied(state, skip):
        occ = set(walls)
        for j, off in enumerate(state):
            if off is not None and j != skip:
                occ.update(shifted(pieces[j]["cells"], off))
        return occ

    def explore(state, i):
        p = pieces[i]
        if p.get("ice", 0) > sum(1 for o in state if o is None):
            return False, []  # frozen by ice
        if p.get("lockBy") is not None and state[p["lockBy"]] is not None:
            return False, []  # chained until its key block has left
        axis = p.get("axis")
        dirs = [d for d in DIRS if not axis or (axis == "h") == (d in ("left", "right"))]
        occ = occupied(state, i)
        cur = state[i]
        seen = {cur}
        queue = deque([cur])
        can_exit = False
        spots = []
        while queue:
            off = queue.popleft()
            cells = shifted(p["cells"], off)
            results = {d: step_result(p["color"], cells, d, occ, rows, cols, exits) for d in dirs}
            if "exit" in results.values():
                can_exit = True
                continue
            if off != cur:
                spots.append(off)
            for d, res in results.items():
                if res == "move":
                    nxt = (off[0] + DIRS[d][0], off[1] + DIRS[d][1])
                    if nxt not in seen:
                        seen.add(nxt)
                        queue.append(nxt)
        return can_exit, spots

    needed = [i for i, p in enumerate(pieces) if not p.get("gray")]
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
        if forced is not None:
            # exiting a piece never hurts, so take it right away
            ns = state[:forced] + (None,) + state[forced + 1:]
            if ns not in dist and not boom(ns, d0 + 1):
                dist[ns] = d0 + 1
                parent[ns] = (state, ("exit", forced, state[forced]))
                queue.append(ns)
            continue
        for i, (_, spots) in info.items():
            for off in spots:
                ns = state[:i] + (off,) + state[i + 1:]
                if ns not in dist and not boom(ns, d0 + 1):
                    dist[ns] = d0 + 1
                    parent[ns] = (state, ("park", i, off))
                    queue.append(ns)
    return -1, None


def lint(level, rows=6, cols=6):
    problems = []
    seen = {}
    for p in level["blocks"]:
        for r, c in p["cells"]:
            if not (0 <= r < rows and 0 <= c < cols):
                problems.append(f'{p["tag"]} is outside the board')
            if (r, c) in seen:
                problems.append(f'{p["tag"]} overlaps {seen[(r, c)]}')
            seen[(r, c)] = p["tag"]
    colors = {p["color"] for p in level["blocks"]}
    for p in level["blocks"]:
        if not any(ex["color"] == p["color"] for ex in level["exits"]):
            problems.append(f'{p["tag"]} has no gate')
    by_side = {}
    for ex in level["exits"]:
        lo, hi = ex["index"], ex["index"] + ex.get("length", 1)
        if hi > (rows if ex["side"] in ("left", "right") else cols):
            problems.append(f'gate {ex} runs off the board')
        for lo2, hi2 in by_side.get(ex["side"], []):
            if lo < hi2 and lo2 < hi:
                problems.append(f'two gates overlap on the {ex["side"]} side')
        by_side.setdefault(ex["side"], []).append((lo, hi))
    for ex in level["exits"]:
        if ex["color"] not in colors:
            problems.append(f'gate {ex["color"]} has no piece')
    return problems


def show(level, rows=6, cols=6):
    grid = [["." for _ in range(cols)] for _ in range(rows)]
    for k, p in enumerate(level["blocks"], start=1):
        for r, c in p["cells"]:
            grid[r][c] = str(k)
    for r in range(rows):
        print("   " + " ".join(grid[r]))
    for k, p in enumerate(level["blocks"], start=1):
        print(f'   {k} = {p["tag"]}')
    for ex in level["exits"]:
        print(f'   gate: {ex["color"]} {ex["side"]} index {ex["index"]} length {ex.get("length", 1)}')


def describe(level, path):
    pieces = level["blocks"]
    out = []
    prev = {}
    for kind, i, off in path:
        tag = pieces[i]["tag"]
        if kind == "exit":
            out.append(f"{tag} exits")
        else:
            o = prev.get(i, (0, 0))
            out.append(f"{tag} parks ({off[0] - o[0]:+d} rows, {off[1] - o[1]:+d} cols)")
        prev[i] = off
    return out


def report(name, level, rows=6, cols=6):
    print(f"== {name} ({rows}x{cols}, {len(level['blocks'])} pieces)")
    problems = lint(level, rows, cols)
    for p in problems:
        print("   PROBLEM:", p)
    moves, path = solve(level, rows, cols)
    if moves is None:
        print("   search gave up (too many states)")
    elif moves == -1:
        print("   UNSOLVABLE")
    else:
        n = len(level["blocks"])
        print(f"   solvable in {moves} drags ({moves - n} setup moves besides the {n} exits)")
        for line in describe(level, path):
            print("     -", line)
    return moves
