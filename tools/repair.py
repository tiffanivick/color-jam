"""Rebuild levels whose solutions relied on the old exit bug, using the corrected solver3.
usage: python3 repair.py 35,46,...   -> writes repair_<first>.json"""
import json, sys, random, time, copy
sys.path.insert(0, "/home/claude"); sys.path.insert(0, "/home/claude/v3")
import solver3
import augment2 as A2
A2.solve = solver3.solve            # augment2's mechanic placer, but with the fixed rules
import augment3 as A3                # themed-block mutations (already imports solver3)
from gen import make, SH

PRE = json.load(open("/home/claude/v3/levels_v22.json"))   # before themed blocks
RAW = json.load(open("/home/claude/cj2/levels80.json"))     # bare generated layouts

def core(l): return {"blocks": [b for b in l["blocks"] if not b.get("crate")], "exits": l["exits"],
                     "walls": l.get("walls", []), "lava": l.get("lava", [])}
def par(l, ms=120000):
    m, _ = solver3.solve(core(l), l["rows"], l["cols"], max_states=ms); return m

def fresh_raw(i):
    """new layout with the same board size / piece count / ice as the original"""
    R = RAW[i]; rows, cols = R["rows"], R["cols"]; n = len(R["blocks"])
    ice_n = sum(1 for b in R["blocks"] if b.get("ice"))
    rng = random.Random(i * 4049 + 11); t0 = time.time(); best = None
    want = R["par"]
    while time.time() - t0 < 90:
        shapes = rng.sample(list(SH), n)
        if not any(s.startswith("L") or s == "sq" for s in shapes): continue
        lv = make(rows, cols, shapes, rng, ice_n)
        if not lv: continue
        m, _ = solver3.solve(lv, rows, cols, max_states=6000)
        if not m or m < 0: continue
        sc = -abs(m - want)
        if best is None or sc > best[0]: best = (sc, m, lv)
        if best[0] >= -1: break
    if not best: return None
    sc, m, lv = best
    blocks = []
    for j, b in enumerate(lv["blocks"]):
        nb = {"color": b["color"], "cells": b["cells"], "id": f"fix{i}-{j}"}
        if b.get("ice"): nb["ice"] = b["ice"]
        blocks.append(nb)
    out = dict(R); out["blocks"] = blocks; out["exits"] = lv["exits"]; out["par"] = m
    return out

def mech(i, raw):
    """re-add the level's v3 mechanics (chains, bombs, arrows, gray, crates), relaxing if needed"""
    spec = dict(A2.SPEC.get(i, {}))
    order = ["axis", "crate", "gray", "chain", "bomb"]
    while True:
        r = A2.best(i, raw, spec, budget=45) if spec else None
        if r: 
            score, m, lv = r; nl = dict(raw); nl["blocks"] = lv["blocks"]; nl["par"] = m; return nl
        drop = [k for k in order if spec.get(k)]
        if not drop: return dict(raw, par=par(raw))
        k = drop[0]; spec[k] -= 1
        if spec[k] <= 0: del spec[k]

def theme(i, lv):
    w = lv["world"]; k = i - min(j for j, l in enumerate(RAW) if l["world"] == w)
    if w == 1: return lv
    rng = random.Random(i * 313 + 5); t0 = time.time(); res = None
    p0 = lv["par"]
    while time.time() - t0 < 60:
        cand = A3.mutate(lv, w, k, rng)
        if cand is None: continue
        m = par(cand, 60000)
        if not m or m < 0: continue
        g = m - p0
        sc = (g if g <= 4 else 4 - (g - 4) * 0.5) if g <= 7 else -1
        if res is None or sc > res[0]: res = (sc, m, cand)
        if res[0] >= 2 and time.time() - t0 > 20: break
    if not res: return lv
    sc, m, cand = res; cand["par"] = m; return cand

idxs = [int(x) for x in sys.argv[1].split(",")]
out = {}
for i in idxs:
    t = time.time()
    base = None
    if (p := par(PRE[i])) and p > 0:
        base = dict(PRE[i], par=p); how = "pre-themed"
    else:
        raw = RAW[i] if (par(RAW[i]) or -1) > 0 else fresh_raw(i)
        how = "raw" if raw is RAW[i] else "new layout"
        if raw is None: print(i, "FAILED to make a layout", flush=True); continue
        base = mech(i, raw)
    lv = theme(i, base)
    m = par(lv)
    assert m and m > 0
    lv["par"] = m
    lv["time"] = int(round((PRE[i]["time"] + 5 * max(0, m - PRE[i]["par"]) + 5) / 5.0) * 5)
    out[i] = lv
    kinds = [k for k in ("walls", "lava") if lv.get(k)] + [k for k in ("jelly", "comet", "bubble", "pillar", "rainbow", "lockBy", "bomb", "axis", "gray") if any(b.get(k) not in (None, False, 0) for b in lv["blocks"])]
    print(i, "from", how, "par", m, kinds, f"{time.time()-t:.0f}s", flush=True)
    json.dump(out, open(f"repair_{idxs[0]}.json", "w"))
print("done", flush=True)
