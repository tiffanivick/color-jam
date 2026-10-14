import random, sys
from solver import solve, lint, shape, show, report, describe
COL = ["#ff8a3d","#4d7bff","#33cc7a","#22c3c3","#ff5da2","#a855f7","#f5d90a","#ff4d5e","#9be22e","#3b4cca"]
SH = {
 "rect2h":[(0,0),(0,1)], "rect2v":[(0,0),(1,0)], "rect3h":[(0,0),(0,1),(0,2)], "rect3v":[(0,0),(1,0),(2,0)],
 "sq":[(0,0),(0,1),(1,0),(1,1)],
 "L4a":[(0,0),(1,0),(2,0),(2,1)], "L4b":[(0,1),(1,1),(2,1),(2,0)], "L4c":[(0,0),(0,1),(1,0),(2,0)], "L3a":[(0,0),(1,0),(1,1)], "L3b":[(0,0),(0,1),(1,0)], "L3c":[(0,0),(0,1),(1,1)], "L3d":[(0,1),(1,0),(1,1)],
}
def gate_for(cells, rows, cols, side, color):
    rs=[r for r,_ in cells]; cs=[c for _,c in cells]
    if side in("left","right"):
        return {"side":side,"index":min(rs),"length":max(rs)-min(rs)+1,"color":color}
    return {"side":side,"index":min(cs),"length":max(cs)-min(cs)+1,"color":color}
def make(rows, cols, shapes, rng, ice_n=0):
    occ=set(); blocks=[]; exits=[]; used={s:set() for s in ("left","right","top","bottom")}
    for i,name in enumerate(shapes):
        for _ in range(60):
            base=SH[name]; r=rng.randrange(rows); c=rng.randrange(cols)
            cells=[[r+a,c+b] for a,b in base]
            if any(not(0<=x<rows and 0<=y<cols) or (x,y) in occ for x,y in cells): continue
            side=rng.choice(list(used)); g=gate_for(cells,rows,cols,side,COL[i])
            # gate may be offset by up to 1 to force shifting
            off=rng.choice([0,0,1,-1]); g["index"]+=off
            hi=g["index"]+g["length"]; lim=rows if side in("left","right") else cols
            if g["index"]<0 or hi>lim: continue
            if any(g["index"]<h and l<hi for l,h in used[side]): continue
            used[side].add((g["index"],hi)); occ.update(map(tuple,cells))
            blocks.append(shape(name+"-"+COL[i][1:3],COL[i],cells)); exits.append(g); break
        else: return None
    # freeze ice_n random pieces; each thaws after k other pieces leave
    for i in rng.sample(range(len(blocks)), min(ice_n, len(blocks))):
        blocks[i]["ice"]=rng.randint(1, max(1,len(blocks)-2))
    return {"blocks":blocks,"exits":exits}
def search(rows,cols,shapes,tries,seed=0,want=3,ice_n=0,max_states=1500):
    rng=random.Random(seed); best=[]
    for _ in range(tries):
        lv=make(rows,cols,shapes,rng,ice_n)
        if not lv or lint(lv,rows,cols): continue
        m,p=solve(lv,rows,cols,max_states=max_states)
        if not m or m<0: continue
        setup=m-len(shapes)
        best.append((setup,lv))
    best.sort(key=lambda x:-x[0]); return best
if __name__=="__main__":
    rows,cols=int(sys.argv[1]),int(sys.argv[2]); sh=sys.argv[3].split(","); n=int(sys.argv[4])
    res=search(rows,cols,sh,n)
    print("solvable found",len(res),"setup dist",sorted({s for s,_ in res}))
    for s,lv in res[:2]:
        print("setup",s); show(lv,rows,cols); report("x",lv,rows,cols)
