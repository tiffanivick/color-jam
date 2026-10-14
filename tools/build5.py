"""Merge themed-block results (aug3_*.json) into levels.json. Keeps a backup of the previous file."""
import json, glob, os, shutil
src = "levels.json"
if not os.path.exists("levels_v22.json"):
    shutil.copy(src, "levels_v22.json")
base = json.load(open("levels_v22.json"))
aug = {}
for f in ("aug3_0_2_3.json", "aug3_w4.json", "aug3_5_6_7.json"):
    for k, v in json.load(open(f)).items():
        aug[int(k)] = v
for f in ("aug3_intro_a.json", "aug3_intro_b.json", "aug3_intro_c.json"):  # gentler first levels win
    if os.path.exists(f):
        for k, v in json.load(open(f)).items():
            aug[int(k)] = v
out = [aug.get(i, L) for i, L in enumerate(base)]
json.dump(out, open(src, "w"))
kinds = lambda l: [k for k in ("walls", "lava") if l.get(k)] + [k for k in ("jelly", "comet", "bubble", "pillar", "rainbow") if any(b.get(k) for b in l["blocks"])]
for i, l in enumerate(out):
    print(i, l["world"], "par", base[i]["par"], "->", l["par"], "time", l["time"], kinds(l))
print("themed levels:", sum(1 for l in out if kinds(l)), "of", len(out))
