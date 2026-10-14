import json,sys
sys.path.insert(0,"/home/claude/v3")
from solver3 import solve
L=json.load(open("/home/claude/v3/levels.json")); out={}
for i,l in enumerate(L):
    core={"blocks":[b for b in l["blocks"] if not b.get("crate")],"exits":l["exits"],"walls":l.get("walls",[]),"lava":l.get("lava",[])}
    m,p=solve(core,l["rows"],l["cols"],max_states=80000)
    ok=m and m>0
    out[str(i)]=[[k,idx,list(off) if off is not None else None] for k,idx,off in p] if ok else None
    print(i,m,l.get("par"),"OK" if ok else "FAIL",flush=True)
json.dump(out,open("/tmp/paths4.json","w"))
