"""Gentler first level of each themed world (+1..+3 moves) and a retry for levels that kept no themed block."""
import json, random, time, sys
import augment3 as A
targets = [int(x) for x in sys.argv[1:]]
out = {}
for idx in targets:
    L = A.L0[idx]; w = L["world"]
    k = idx - min(i for i, l in enumerate(A.L0) if l["world"] == w)
    intro = k == 0
    rng = random.Random(idx * 977 + 3); t0 = time.time(); res = None; tries = 0
    while time.time() - t0 < 70:
        tries += 1
        lv = A.mutate(L, w, k, rng)
        if lv is None: continue
        m = A.par_of(lv, 60000)
        if not m or m < 0: continue
        gain = m - L["par"]
        score = (-abs(gain - 2) if intro else (gain if gain <= 4 else 4 - (gain - 4) * 0.5)) if gain <= 7 else -9
        if res is None or score > res[0]: res = (score, m, lv)
        if intro and res[0] == 0 and time.time() - t0 > 20: break
    if res is None:
        print(idx, "still none", tries, flush=True); continue
    s, m, lv = res
    lv["par"] = m
    lv["time"] = int(round((L["time"] + 5 * max(0, m - L["par"]) + 5) / 5.0) * 5)
    out[idx] = lv
    print(idx, "par", L["par"], "->", m, "tries", tries, flush=True)
    json.dump(out, open("aug3_intro.json", "w"))
print("done", flush=True)
