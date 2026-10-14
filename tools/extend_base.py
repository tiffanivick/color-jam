import json, glob
base=json.load(open("/home/claude/cj2/levels.json"))
assert len(base)==50
tier=lambda s:"Easy" if s<=1 else "Normal" if s<=3 else "Hard" if s<=5 else "Very hard"
out=list(base)
for w in (6,7,8):
    items=[json.load(open(f)) for f in glob.glob(f"/home/claude/worlds/w{w}_*.json")]
    items.sort(key=lambda d:(d["setup"],len(d["level"]["blocks"]),d["k"]))
    print(w,len(items))
    for d in items:
        L=d["level"]
        blocks=[]
        for j,b in enumerate(L["blocks"]):
            nb={"color":b["color"],"cells":b["cells"],"id":f"w{w}-{d['k']}-{j}"}
            if b.get("ice"): nb["ice"]=b["ice"]
            blocks.append(nb)
        out.append({"rows":d["rows"],"cols":d["cols"],"difficulty":tier(d["setup"]),"par":d["drags"],"world":w-1,"blocks":blocks,"exits":L["exits"]})
json.dump(out,open("/home/claude/cj2/levels80.json","w"))
from collections import Counter
print(len(out),Counter(l["world"] for l in out))
