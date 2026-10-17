"""Gives levels board shapes: squares cut out of the board (level["holes"]), drawn as the frame
reaching into the board, so not every board is a plain rectangle (notched corners, a bite out of a
side, a hole in the middle, stepped corners...).

Holes play exactly like stumps (nothing can enter them), so the game, src/solver.js and solver3 treat
them as walls. A shape is only used when:
  - every square of it is empty at the start and none sits against a gate,
  - the level is still winnable (src/solver.js, which searches every option), and
  - when solver3 can find the shortest solution both with and without the shape, it is no longer
    than before (so par and the star goals stay fair).
Levels 1-6 stay plain so the first lessons look simple. Some levels keep a plain board on purpose.

usage: python3 tools/shapes.py [levels.json]   (rewrites the file in place; prints a report)
"""
import json, os, subprocess, sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(__file__))
from solver3 import solve

ROOT = os.path.join(os.path.dirname(__file__), "..")


def templates(R, C):
    """Named shapes for an R x C board, each a list of (r, c) squares."""
    mr, mc = R // 2, C // 2
    t = {
        "corners": [(0, 0), (0, C - 1), (R - 1, 0), (R - 1, C - 1)],
        "top-bite": [(0, mc - 1), (0, mc)] if C % 2 == 0 else [(0, mc)],
        "side-bites": [(mr, 0), (mr, C - 1)] if R % 2 else [(mr - 1, 0), (mr, 0), (mr - 1, C - 1), (mr, C - 1)],
        "steps": [(0, 0), (0, 1), (1, 0), (R - 1, C - 1), (R - 1, C - 2), (R - 2, C - 1)],
        "big-corners": [(0, 0), (0, 1), (1, 0), (1, 1), (R - 1, C - 1), (R - 1, C - 2), (R - 2, C - 1), (R - 2, C - 2)],
        "bottom-bite": [(R - 1, mc - 1), (R - 1, mc)] if C % 2 == 0 else [(R - 1, mc)],
        "center": [(mr, mc)] if R % 2 and C % 2 else [(mr - 1, mc - 1), (mr - 1, mc), (mr, mc - 1), (mr, mc)],
        "top-corners": [(0, 0), (0, 1), (0, C - 2), (0, C - 1)],
    }
    if R < 6 or C < 6:  # small boards: only light shapes
        for k in ("steps", "big-corners", "center"):
            t.pop(k)
    return t


ORDER = ["corners", "top-bite", "steps", "side-bites", "big-corners", "bottom-bite", "center", "top-corners"]


def gate_edge_squares(lv):
    """Squares that sit right against a gate: never cut out."""
    R, C = lv["rows"], lv["cols"]
    out = set()
    for e in lv["exits"]:
        for k in range(e["index"], e["index"] + e.get("length", 1)):
            out.add({"left": (k, 0), "right": (k, C - 1), "top": (0, k), "bottom": (R - 1, k)}[e["side"]])
    return out


def core(lv, holes=()):
    return {"blocks": [b for b in lv["blocks"] if not b.get("crate")], "exits": lv["exits"],
            "walls": lv.get("walls", []) + [list(h) for h in holes], "lava": lv.get("lava", [])}


def js_solvable(lv, holes):
    board = {"rows": lv["rows"], "cols": lv["cols"], "exits": lv["exits"], "walls": lv.get("walls", []) + [list(h) for h in holes],
             "lava": lv.get("lava", []), "pieces": lv["blocks"]}
    out = subprocess.run(["node", "-e", "const {solvable}=require(process.argv[1]);let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(solvable(JSON.parse(s),400000))))",
                          os.path.join(ROOT, "src", "solver.js")], input=json.dumps(board), capture_output=True, text=True, timeout=180)
    return json.loads(out.stdout.strip() or "null")


def candidates(lv, free):
    """Shapes built from squares that are free on this level: corners (an L of 3 or a single
    square), bites out of an edge, a hole in the middle. Tried as symmetric sets first."""
    R, C = lv["rows"], lv["cols"]
    ok = lambda sq: all(q in free for q in sq)
    def corner(r, c, dr, dc):  # the biggest corner piece that fits there
        for sq in ([(r, c), (r + dr, c), (r, c + dc)], [(r, c)]):
            if ok(sq):
                return sq
        return None
    tl, tr, bl, br = corner(0, 0, 1, 1), corner(0, C - 1, 1, -1), corner(R - 1, 0, -1, 1), corner(R - 1, C - 1, -1, -1)
    def bite(side):  # 2 squares (else 1) in the middle part of an edge
        n = C if side in ("top", "bottom") else R
        at = lambda k: {"top": (0, k), "bottom": (R - 1, k), "left": (k, 0), "right": (k, C - 1)}[side]
        mids = sorted(range(1, n - 1), key=lambda k: abs(k - (n - 1) / 2))
        for size in (2, 1):
            for k in mids:
                sq = [at(k + j) for j in range(size)]
                if k + size <= n - 1 and ok(sq):
                    return sq
        return None
    bt, bb, bl_, br_ = bite("top"), bite("bottom"), bite("left"), bite("right")
    mid = [(r, c) for r in range(2, R - 2) for c in range(2, C - 2) if (r, c) in free]
    mid.sort(key=lambda q: abs(q[0] - (R - 1) / 2) + abs(q[1] - (C - 1) / 2))
    opts = [
        ("notched corners", [tl, tr, bl, br]),
        ("cut corners", [tl, br]),
        ("cut corners", [tr, bl]),
        ("bites", [bt, bb]),
        ("bites", [bl_, br_]),
        ("top corners", [tl, tr]),
        ("bottom corners", [bl, br]),
        ("bite + corners", [bt, bl, br]),
        ("bite + corners", [bb, tl, tr]),
        ("side bite", [bl_]),
        ("side bite", [br_]),
        ("top bite", [bt]),
        ("corner", [tl]), ("corner", [br]), ("corner", [tr]), ("corner", [bl]),
        ("hole", [mid[:1]]),
    ]
    out = []
    for name, parts in opts:
        if all(parts) and parts:
            sq = sorted({q for p in parts for q in p})
            if sq and sq not in [o[1] for o in out]:
                out.append((name, sq))
    return out


def shape_one(args):
    i, lv = args
    R, C = lv["rows"], lv["cols"]
    used = {tuple(c) for b in lv["blocks"] for c in b["cells"]} | {tuple(w) for w in lv.get("walls", []) + lv.get("lava", [])}
    free = {(r, c) for r in range(R) for c in range(C)} - used - gate_edge_squares(lv)
    opts = candidates(lv, free)
    if not opts:
        return i, None, "%dx%d plain (no free corner or edge)" % (R, C)
    k = i % len(opts)
    opts = opts[k:] + opts[:k] if i % 2 else opts  # vary which shape comes first
    base = None
    for name, holes in opts[:8]:
        if js_solvable(lv, holes) is not True:
            continue
        if base is None:
            base, _ = solve(core(lv), R, C, max_states=250_000)
        m, _ = solve(core(lv, holes), R, C, max_states=250_000)
        if base is not None and base >= 0:
            if m is None or m < 0 or m > base:
                continue  # longer than before (or unknown when the plain board is known): skip
        return i, holes, "%dx%d %s (%d squares)%s" % (R, C, name, len(holes), "" if base and base > 0 and m and m > 0 else " [solvable, shortest unknown]")
    return i, None, "%dx%d plain (no shape kept it fair)" % (R, C)


def main(path):
    levels = json.load(open(path))
    # levels 1-6 stay plain; after that two in three get a shape, the rest stay plain for contrast
    jobs = [(i, lv) for i, lv in enumerate(levels) if i >= 6 and i % 3 != 2 and not lv.get("holes")]
    with Pool() as pool:
        for i, holes, msg in pool.imap_unordered(shape_one, jobs):
            print("level %d: %s" % (i + 1, msg), flush=True)
            if holes:
                levels[i]["holes"] = [list(h) for h in holes]
                json.dump(levels, open(path, "w"))  # save as we go
    print("done: %d levels have a shape" % sum(1 for lv in levels if lv.get("holes")))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "levels.json"))
