import sys, json, copy, random, time, os
from gen import make, SH
from solver import solve, lint
POOL=list(SH)
def run(w,k,rows,cols,npieces,ice_n,want,budget):
    out=f"worlds/w{w}_{k:02d}.json"
    if os.path.exists(out): return
    rng=random.Random(w*1000+k); t0=time.time(); best=None
    while time.time()-t0<budget:
        shapes=rng.sample(POOL,npieces)
        if not any(s.startswith("L") or s=="sq" for s in shapes): continue
        lv=make(rows,cols,shapes,rng,ice_n)
        if not lv or lint(lv,rows,cols): continue
        m,_=solve(lv,rows,cols,max_states=5000)
        if not m or m<0: continue
        if ice_n:
            plain=copy.deepcopy(lv)
            for b in plain["blocks"]: b.pop("ice",None)
            m0,_=solve(plain,rows,cols,max_states=5000)
            if m0 is None or m0<0 or m<=m0: continue
        setup=m-npieces
        if best is None or setup>best[0]: best=(setup,m,lv)
        if setup>=want+2: break
    if best:
        json.dump(dict(w=w,k=k,rows=rows,cols=cols,setup=best[0],drags=best[1],level=best[2]),open(out,"w"))
        print(w,k,"setup",best[0],flush=True)
    else: print(w,k,"NONE",flush=True)
specs=[]
for k in range(1,11):
    specs.append((6,k,7,6,7+(k>6),2+(k>5),4+k//3))
for k in range(1,11):
    specs.append((7,k,7,6,8+(k>6),2+(k>3),4+k//3))
for k in range(1,11):
    specs.append((8,k,7,6,8+(k>3)+(k>7),3,5+k//3))
part=int(sys.argv[1])
for i,s in enumerate(specs):
    if i%2==part: run(*s,budget=70)
