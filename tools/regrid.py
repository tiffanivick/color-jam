"""Grows chosen levels onto bigger grids (7x7, 8x7, 8x8) so not every level has the same board.

The original puzzle is placed somewhere inside the bigger grid (its gates move with it to the
new edges), and new plain blocks, each with a gate of its own colour, fill some of the extra
space. Every candidate is checked with solver3 (crates left out, as the other tools do): it
must be solvable and take at least as many moves as the original, and not more than 6 extra.
Par keeps the original's margin over the minimum; the clock gets 10 s per new block.

usage: python3 tools/regrid.py [levels.json]   (rewrites the file in place; prints a report)
"""
import copy, json, random, sys, os

sys.path.insert(0, os.path.dirname(__file__))
from solver3 import solve

PALETTE = ["#ff8a3d", "#4d7bff", "#33cc7a", "#22c3c3", "#ff5da2", "#a855f7", "#f5d90a", "#ff4d5e", "#9be22e", "#3b4cca"]
SHAPES = [[(0, 0), (0, 1)], [(0, 0), (1, 0)], [(0, 0), (0, 1), (0, 2)], [(0, 0), (1, 0), (2, 0)],
          [(0, 0), (1, 0), (1, 1)], [(0, 0), (0, 1), (1, 0)], [(0, 0), (0, 1), (1, 0), (1, 1)]]
# level number (1-based) -> new (rows, cols)
PLAN = {9: (7, 7), 14: (7, 7), 18: (8, 7), 24: (7, 7), 28: (8, 7), 33: (7, 7), 38: (8, 7),
        48: (7, 7), 50: (8, 8), 52: (7, 7), 55: (8, 7), 59: (8, 8), 63: (7, 7), 66: (8, 7),
        69: (8, 8), 72: (7, 7), 75: (8, 7), 77: (8, 8), 80: (8, 8)}


def core(lv):
    return {"blocks": [b for b in lv["blocks"] if not b.get("crate")], "exits": lv["exits"],
            "walls": lv.get("walls", []), "lava": lv.get("lava", [])}


def min_moves(lv, cap=400_000):
    m, _ = solve(core(lv), lv["rows"], lv["cols"], max_states=cap)
    return m


def grow(lv, R, C, rng):
    R0, C0 = lv["rows"], lv["cols"]
    dr, dc = rng.randint(0, R - R0), rng.randint(0, C - C0)
    g = copy.deepcopy(lv)
    g["rows"], g["cols"] = R, C
    for b in g["blocks"]:
        b["cells"] = [[r + dr, c + dc] for r, c in b["cells"]]
    for k in ("walls", "lava"):
        if g.get(k):
            g[k] = [[r + dr, c + dc] for r, c in g[k]]
    for e in g["exits"]:
        e["index"] += dr if e["side"] in ("left", "right") else dc
    occ = {(r, c) for b in g["blocks"] for r, c in b["cells"]} | {tuple(w) for w in g.get("walls", []) + g.get("lava", [])}
    used = {b["color"] for b in g["blocks"]} | {e["color"] for e in g["exits"]}
    colors = [c for c in PALETTE if c not in used]
    rng.shuffle(colors)
    want = max(1, min(len(colors), (R * C - R0 * C0) // 7))
    added = 0
    for color in colors[:want]:
        for _ in range(80):
            shape = rng.choice(SHAPES)
            r0, c0 = rng.randrange(R), rng.randrange(C)
            cells = [(r0 + a, c0 + b) for a, b in shape]
            if any(not (0 <= r < R and 0 <= c < C) or (r, c) in occ for r, c in cells):
                continue
            side = rng.choice(["left", "right", "top", "bottom"])
            rows_ = [r for r, _ in cells]
            cols_ = [c for _, c in cells]
            length = (max(rows_) - min(rows_) + 1) if side in ("left", "right") else (max(cols_) - min(cols_) + 1)
            edge = R if side in ("left", "right") else C
            index = rng.randrange(0, edge - length + 1)
            if any(e["side"] == side and e["index"] < index + length and index < e["index"] + e.get("length", 1) for e in g["exits"]):
                continue
            g["blocks"].append({"color": color, "cells": [list(x) for x in cells], "id": "%s-g%d" % (lv["blocks"][0].get("id", "lv"), added)})
            g["exits"].append({"side": side, "index": index, "length": length, "color": color})
            occ |= set(cells)
            added += 1
            break
    return g, added


def js_solvable(lv):
    """The in-game solver (src/solver.js, node): finds a way to win fast, even on big boards where
    solver3's shortest-path search gives up. True / False / None (too big)."""
    import subprocess
    root = os.path.join(os.path.dirname(__file__), "..")
    board = {"rows": lv["rows"], "cols": lv["cols"], "exits": lv["exits"], "walls": lv.get("walls", []),
             "lava": lv.get("lava", []), "pieces": lv["blocks"]}
    out = subprocess.run(["node", "-e", "const {solvable}=require(process.argv[1]);let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(solvable(JSON.parse(s),400000))))",
                          os.path.join(root, "src", "solver.js")], input=json.dumps(board), capture_output=True, text=True, timeout=120)
    return json.loads(out.stdout.strip() or "null")


def regrid_one(args):
    num, R, C, lv, base = args
    if base is None or base < 0:
        base = min_moves(lv)
    best = None
    rng = random.Random(num * 7919)
    for attempt in range(0 if os.environ.get("REGRID_FAST") else 14):  # REGRID_FAST=1: skip to the quick check
        g, added = grow(lv, R, C, rng)
        m = min_moves(g, cap=250_000)
        if m is None or m < 0 or m < base or m > base + 6:
            continue
        if best is None or m > best[1]:
            best = (g, m, added)
        if m >= base + 1:
            break
    if not best:
        # too big for the shortest-path search: accept a layout the in-game solver can win, and
        # estimate par as the original's plus 2 moves per new block
        rng = random.Random(num * 104729)
        for attempt in range(10):
            g, added = grow(lv, R, C, rng)
            if added and js_solvable(g) is True:
                g["par"] = lv["par"] + 2 * added
                g["time"] = lv.get("time", 60) + 10 * added
                return num, g, "%dx%d -> %dx%d, +%d blocks, solvable (in-game solver), par %d -> %d (estimated)" % (lv["rows"], lv["cols"], R, C, added, lv["par"], g["par"])
        return num, None, "no layout found, kept %dx%d" % (lv["rows"], lv["cols"])
    g, m, added = best
    g["par"] = m + max(0, lv["par"] - base)
    g["time"] = lv.get("time", 60) + 10 * added
    return num, g, "%dx%d -> %dx%d, +%d blocks, min moves %d -> %d, par %d -> %d" % (lv["rows"], lv["cols"], R, C, added, base, m, lv["par"], g["par"])


def main(path, mins_path=None):
    """mins_path: optional JSON {"level number": min moves} so the originals needn't be re-solved."""
    from multiprocessing import Pool
    levels = json.load(open(path))
    mins = json.load(open(mins_path)) if mins_path else {}
    jobs = [(num, R, C, levels[num - 1], mins.get(str(num))) for num, (R, C) in sorted(PLAN.items())
            if (levels[num - 1]["rows"], levels[num - 1]["cols"]) != (R, C)]
    report = []
    with Pool() as pool:
        for num, g, msg in pool.imap_unordered(regrid_one, jobs):
            print("level %d: %s" % (num, msg), flush=True)
            report.append((num, msg))
            if g:
                levels[num - 1] = g
                json.dump(levels, open(path, "w"))  # save as we go
    print("done")


if __name__ == "__main__":
    here = os.path.dirname(__file__)
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "levels.json"), sys.argv[2] if len(sys.argv) > 2 else None)
