"""Adds each world's themed block to its levels (keeps every existing mechanic).
Every candidate is checked with solver3; the best solvable one (a few extra moves) is kept.
usage: python3 augment3.py <world> [<world> ...]   -> writes aug3_<worlds>.json"""
import json, copy, random, sys, time
from solver3 import solve

L0 = json.load(open("/home/claude/v3/levels.json"))
PILLAR = "#d9b27a"

def core(lv):
    return {"blocks": [b for b in lv["blocks"] if not b.get("crate")], "exits": lv["exits"],
            "walls": lv.get("walls", []), "lava": lv.get("lava", [])}

def par_of(lv, ms):
    m, _ = solve(core(lv), lv["rows"], lv["cols"], max_states=ms)
    return m

def free_cells(lv):
    occ = {tuple(c) for b in lv["blocks"] for c in b["cells"]}
    occ |= {tuple(w) for w in lv.get("walls", [])} | {tuple(w) for w in lv.get("lava", [])}
    return [(r, c) for r in range(lv["rows"]) for c in range(lv["cols"]) if (r, c) not in occ]

def movable(lv):
    return [i for i, b in enumerate(lv["blocks"]) if not (b.get("gray") or b.get("crate") or b.get("pillar")
            or b.get("jelly") or b.get("comet") or b.get("bubble") or b.get("rainbow"))]

def mutate(lv, world, k, rng):
    lv = copy.deepcopy(lv)
    big = k >= 6
    if world == 0:  # meadow: tree stumps
        cells = free_cells(lv)
        n = 1 + (k >= 4)
        if len(cells) < n: return None
        lv["walls"] = [list(c) for c in rng.sample(cells, n)]
    elif world == 2:  # candy: jelly blocks
        cand = [i for i in movable(lv) if not lv["blocks"][i].get("bomb")]
        n = 1 + big
        if len(cand) < n: return None
        for i in rng.sample(cand, n): lv["blocks"][i]["jelly"] = True
    elif world == 3:  # ember: lava tiles
        cells = free_cells(lv)
        n = 2 if k < 3 else rng.choice([3, 4])
        if len(cells) < n: return None
        # lava in short runs looks (and plays) better than scattered dots
        seed = rng.choice(cells); pick = [seed]
        while len(pick) < n:
            r, c = rng.choice(pick)
            nb = [(r + dr, c + dc) for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0))]
            nb = [x for x in nb if x in cells and x not in pick]
            if not nb:
                left = [x for x in cells if x not in pick]
                if not left: return None
                nb = [rng.choice(left)]
            pick.append(rng.choice(nb))
        lv["lava"] = [list(c) for c in pick]
    elif world == 4:  # star: comet blocks
        cand = [i for i in movable(lv) if not lv["blocks"][i].get("bomb")]
        n = 1 + big
        if len(cand) < n: return None
        for i in rng.sample(cand, n): lv["blocks"][i]["comet"] = True
    elif world == 5:  # reef: bubble blocks
        cand = [i for i in movable(lv) if not lv["blocks"][i].get("bomb")]
        n = 1 + big
        if len(cand) < n: return None
        for i in rng.sample(cand, n): lv["blocks"][i]["bubble"] = True
    elif world == 6:  # dunes: sand pillars (go before crates so solver indexes still match)
        n = 1 + big
        for g in range(n):
            cells = set(free_cells(lv))
            shapes = [[(0, 0)], [(0, 0), (1, 0)], [(0, 0), (0, 1)]]
            ok = False
            for _ in range(30):
                sh = rng.choice(shapes); r0, c0 = rng.choice(sorted(cells))
                cs = [(r0 + a, c0 + b) for a, b in sh]
                if all(x in cells for x in cs): ok = True; break
            if not ok: return None
            pil = {"color": PILLAR, "cells": [list(x) for x in cs], "pillar": rng.randint(3, 7), "id": f"pillar-{g}"}
            ncrate = sum(1 for b in lv["blocks"] if b.get("crate"))
            lv["blocks"].insert(len(lv["blocks"]) - ncrate, pil)
    elif world == 7:  # dusk: rainbow block (its own gate goes away)
        cand = [i for i in movable(lv) if not lv["blocks"][i].get("bomb") and lv["blocks"][i].get("lockBy") is None]
        if not cand: return None
        i = rng.choice(cand); b = lv["blocks"][i]
        same = [j for j, o in enumerate(lv["blocks"]) if j != i and o["color"] == b["color"]]
        b["rainbow"] = True
        if not same:
            lv["exits"] = [e for e in lv["exits"] if e["color"] != b["color"]]
    return lv

def best(idx, L, world, k, budget, ms):
    rng = random.Random(idx * 131 + 7)
    p0 = L["par"]
    t0 = time.time(); res = None; tries = 0
    while time.time() - t0 < budget:
        tries += 1
        lv = mutate(L, world, k, rng)
        if lv is None: continue
        m = par_of(lv, ms)
        if not m or m < 0: continue
        gain = m - p0
        # aim for 1-4 extra moves; more than ~7 gets tedious
        score = (gain if gain <= 4 else 4 - (gain - 4) * 0.5) if gain <= 7 else -1
        if res is None or score > res[0]:
            res = (score, m, lv)
        if res[0] >= 2 and time.time() - t0 > budget * 0.35: break
    return res, tries

if __name__ == "__main__":
    worlds = [int(x) for x in sys.argv[1:]]
    out = {}; tag = "_".join(map(str, worlds))
    for idx, L in enumerate(L0):
        w = L["world"]
        if w not in worlds: continue
        k = idx - min(i for i, l in enumerate(L0) if l["world"] == w)
        ms = 60000 if w == 5 else 30000
        res, tries = best(idx, L, w, k, budget=35 if w >= 4 else 25, ms=ms)
        if res is None:
            print(idx, "w", w, "KEEP (no solvable variant)", tries, flush=True); continue
        score, m, lv = res
        lv["par"] = m
        extra = m - L["par"]
        lv["time"] = int(round((L["time"] + 5 * max(0, extra) + 5) / 5.0) * 5)
        out[idx] = lv
        print(idx, "w", w, "par", L["par"], "->", m, "tries", tries, flush=True)
        json.dump(out, open(f"aug3_{tag}.json", "w"))
    json.dump(out, open(f"aug3_{tag}.json", "w")); print("done", flush=True)
