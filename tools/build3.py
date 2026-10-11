import json, os
base=json.load(open("/home/claude/cj2/levels.json"))
aug={}
for p in (0,1):
    f=f"aug_{p}.json"
    if os.path.exists(f):
        for k,v in json.load(open(f)).items(): aug[int(k)]=v
for f in ("aug_fix.json",):
    if os.path.exists(f):
        for k,v in json.load(open(f)).items():
            if v: aug[int(k)]=v
out=[]
FACT=[9,7,6,5.5,5]
for i,L in enumerate(base):
    A=aug.get(i) or L
    lv=dict(A)
    par=lv.get("par") or L.get("par")
    lv["par"]=par
    secs=20+par*FACT[lv["world"]]
    # tougher levels with extra mechanics get a little more time
    extra=sum(1 for b in lv["blocks"] if b.get("lockBy") is not None or b.get("bomb") or b.get("axis"))
    secs+=extra*4
    lv["time"]=int(round(secs/5.0)*5)
    for b in lv["blocks"]:
        b.pop("tag",None)
    out.append(lv)
json.dump(out,open("levels.json","w"))
mech=lambda l:[k for k in("gray","axis","lockBy","bomb","crate","ice") if any(b.get(k) for b in l["blocks"])]
for i,l in enumerate(out): print(i,l["world"],l["difficulty"],"par",l["par"],"time",l["time"],mech(l))
