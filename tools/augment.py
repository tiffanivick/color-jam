import json, copy, random, sys, time
from solver2 import solve
GRAY="#9aa0b4"; CRATE="#b9824a"
base=json.load(open("/home/claude/cj2/levels.json"))
SPEC={}
def S(i,**k): SPEC[i]=k
S(15,axis=1); S(17,axis=1,crate=1); S(19,axis=1,gray=1)
S(20,gray=1); S(21,crate=1); S(22,gray=1,crate=1); S(23,axis=1); S(24,gray=1,axis=1); S(25,axis=1,crate=1)
S(26,gray=1,axis=1); S(27,gray=1,axis=2); S(28,gray=1,axis=1,crate=2); S(29,gray=2,axis=1)
S(30,chain=1); S(31,chain=1,gray=1); S(32,chain=1,axis=1); S(33,bomb=1); S(34,bomb=1,chain=1)
S(35,bomb=1,gray=1); S(36,chain=1,bomb=1,axis=1); S(37,bomb=1,chain=1,gray=1); S(38,chain=1,bomb=1,axis=1,gray=1); S(39,chain=2,bomb=1,gray=1)
S(40,chain=1,gray=1,crate=1); S(41,bomb=1,axis=1,gray=1); S(42,chain=1,bomb=1,axis=1,crate=1)
S(43,chain=1,bomb=1,gray=1,crate=1); S(44,chain=2,bomb=1,axis=1); S(45,chain=1,bomb=1,axis=1,gray=1,crate=1)
S(46,chain=2,bomb=1,gray=1,axis=1); S(47,chain=2,bomb=2,gray=1); S(48,chain=2,bomb=1,axis=2,gray=1,crate=1); S(49,chain=2,bomb=2,axis=1,gray=2,crate=2)
SH={"r2h":[(0,0),(0,1)],"r2v":[(0,0),(1,0)],"sq":[(0,0),(0,1),(1,0),(1,1)],"r3h":[(0,0),(0,1),(0,2)],"r3v":[(0,0),(1,0),(2,0)]}
def occupied(lv): return {tuple(c) for b in lv["blocks"] for c in b["cells"]}
def place(lv,rows,cols,rng,names):
    occ=occupied(lv)
    for _ in range(40):
        name=rng.choice(names); cells=[(r+rng.randrange(rows),c) for r,c in []]
        r0=rng.randrange(rows); c0=rng.randrange(cols)
        cells=[[r0+a,c0+b] for a,b in SH[name]]
        if all(0<=r<rows and 0<=c<cols and (r,c) not in occ for r,c in cells): return cells
    return None
def can_axis(b,exits):
    cs=b["cells"]; rs={r for r,_ in cs}; ccs={c for _,c in cs}
    if len(cs)<2: return None
    if len(rs)==1: ax="h"
    elif len(ccs)==1: ax="v"
    else: return None
    sides={"h":("left","right"),"v":("top","bottom")}[ax]
    return ax if any(e["color"]==b["color"] and e["side"] in sides for e in exits) else None
def solve_lv(lv,rows,cols,ms=25000):
    core={"blocks":[b for b in lv["blocks"] if not b.get("crate")],"exits":lv["exits"]}
    # indexes must match: crates are appended last so core indexes are unchanged
    return solve(core,rows,cols,max_states=ms)
def attempt(L,spec,rng):
    rows,cols=L["rows"],L["cols"]
    lv={"blocks":copy.deepcopy(L["blocks"]),"exits":copy.deepcopy(L["exits"])}
    n0=len(lv["blocks"]); colored=list(range(n0))
    for _ in range(spec.get("axis",0)):
        c=[i for i in colored if "axis" not in lv["blocks"][i] and not lv["blocks"][i].get("ice") and can_axis(lv["blocks"][i],lv["exits"])]
        if not c: return None
        i=rng.choice(c); lv["blocks"][i]["axis"]=can_axis(lv["blocks"][i],lv["exits"])
    for _ in range(spec.get("chain",0)):
        c=[i for i in colored if "lockBy" not in lv["blocks"][i] and not lv["blocks"][i].get("ice")]
        if len(c)<2: return None
        j=rng.choice(c); k=rng.choice([x for x in colored if x!=j and lv["blocks"][x].get("lockBy") is None and x!=j])
        lv["blocks"][j]["lockBy"]=k
    for g in range(spec.get("gray",0)):
        cells=place(lv,rows,cols,rng,["r2h","r2v","sq","r3h","r3v"][: (3 if rows*cols<36 else 5)])
        if not cells: return None
        lv["blocks"].append({"color":GRAY,"cells":cells,"gray":True,"id":f"gray-{g}"})
    for g in range(spec.get("crate",0)):
        cells=place(lv,rows,cols,rng,["r2h","r2v"] if rng.random()<0.4 else ["r2h"])
        if not cells:
            continue
        lv["blocks"].append({"color":CRATE,"cells":cells,"crate":True,"taps":2,"id":f"crate-{g}"})
    return lv
def best(i,L,spec,budget=28):
    rng=random.Random(i*77); t0=time.time(); res=None
    base_m,_=solve({"blocks":L["blocks"],"exits":L["exits"]},L["rows"],L["cols"],max_states=60000)
    while time.time()-t0<budget:
        lv=attempt(L,spec,rng)
        if not lv: continue
        m,_=solve_lv(lv,L["rows"],L["cols"])
        if not m or m<0: continue
        # bombs: find the tightest countdown that is still solvable, then add slack
        bombs=spec.get("bomb",0); ok=True
        if bombs:
            cand=[j for j in range(len(L["blocks"])) if not lv["blocks"][j].get("gray") and not lv["blocks"][j].get("ice") and lv["blocks"][j].get("lockBy") is None]
            rng.shuffle(cand); done=0
            for j in cand:
                if done>=bombs: break
                t=copy.deepcopy(lv); feas=None
                for N in range(2,m+4):
                    t["blocks"][j]["bomb"]=N
                    mm,_=solve_lv(t,L["rows"],L["cols"])
                    if mm and mm>0: feas=N; break
                if feas is None: continue
                lv["blocks"][j]["bomb"]=feas+1+(1 if feas<6 else 0); done+=1
            if done<bombs: continue
            m2,_=solve_lv(lv,L["rows"],L["cols"])
            if not m2 or m2<0: continue
            m=m2
        score=m-base_m
        if res is None or score>res[0]: res=(score,m,lv)
        if res[0]>=2 and time.time()-t0>budget*0.5: break
    return res
if __name__=="__main__":
    part=int(sys.argv[1]); out={}
    for i,L in enumerate(base):
        if i%2!=part: continue
        spec=SPEC.get(i)
        if not spec:
            m,_=solve({"blocks":L["blocks"],"exits":L["exits"]},L["rows"],L["cols"],max_states=60000)
            out[i]=dict(L,par=m); continue
        r=None
        trial=dict(spec)
        order=["axis","crate","gray","chain","bomb"]
        while r is None:
            r=best(i,L,trial)
            if r is None:
                drop=[k for k in order if trial.get(k)]
                if len(drop)<=1: break
                k=drop[0]; trial[k]-=1
                if trial[k]<=0: del trial[k]
                print(i,"retry with",trial,flush=True)
        spec=trial
        if r is None: print(i,"FAILED",flush=True); out[i]=None; continue
        score,m,lv=r
        nl=dict(L); nl["blocks"]=lv["blocks"]; nl["par"]=m; out[i]=nl
        print(i,"ok par",m,"was",L.get("par"),"spec",spec,flush=True)
        json.dump(out,open(f"aug_{part}.json","w"))
    json.dump(out,open(f"aug_{part}.json","w")); print("done",flush=True)
