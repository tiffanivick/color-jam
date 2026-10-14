import sys
from playwright.sync_api import sync_playwright
from PIL import Image
mode=sys.argv[1]; times=[int(t) for t in sys.argv[2].split(",")]; out=sys.argv[3]
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={"width":402,"height":874},device_scale_factor=1.5); pg.add_init_script("window.__SLOW=1;"); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8792/index.html?reset=1&skip=33&skin=real"); pg.wait_for_timeout(600)
    pg.evaluate("S.login.claimed=todayStr(); S.inv.hammer=5; S.inv.vacuum=5; save(); closeSheet(); startLevel()"); pg.wait_for_timeout(1300)
    pg.evaluate("closeSheet && closeSheet(); hideTip()"); pg.wait_for_timeout(300)
    b=pg.evaluate("(()=>{const r=document.getElementById('board').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    target=pg.evaluate("blocks.findIndex(b=>b.color=='#ff8a3d')")
    pg.evaluate("hooks.start()"); pg.wait_for_timeout(100)
    if mode!="freeze":
        pg.click("#boosterHammer" if mode=="hammer" else "#boosterVac"); pg.wait_for_timeout(200)
    x,y=pg.evaluate(f"(()=>{{const c=blocks[{target}].el.querySelector('.block-cell').getBoundingClientRect();return [c.left+24,c.top+24]}})()")
    if mode=="freeze":
        pg.evaluate("window.__FXK=6")
    pg.evaluate("""(()=>{const K=6; window.__FXK=6; const ot=window.setTimeout; window.setTimeout=(f,t,...a)=>ot(f,(t||0)*K,...a);
       const oa=Element.prototype.animate; Element.prototype.animate=function(k,o){ if(typeof o==='number') o=o*K; else if(o){o=Object.assign({},o); if(o.duration) o.duration*=K;} return oa.call(this,k,o);};
       const oi=window.setInterval; window.setInterval=(f,t,...a)=>oi(f,(t||0)*K,...a);})()""")
    if mode=="freeze": pg.click("#boosterFreeze")
    else: pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.up()
    t0=0; shots=[]
    for t in times:
        pg.wait_for_timeout(t-t0); t0=t
        f=f"/tmp/fx_{mode}_{t}.png"; pg.screenshot(path=f,clip={"x":b[0]-30,"y":b[1]-90,"width":b[2]+60,"height":b[3]+200}); shots.append(f)
    print("removed:", pg.evaluate(f"blocks[{target}].removed"), "fxBusy", pg.evaluate("fxBusy"), errs)
ims=[Image.open(f) for f in shots]; W=ims[0].width; H=ims[0].height
c=Image.new("RGB",(len(ims)*W+(len(ims)-1)*10,H),"white")
for k,im in enumerate(ims): c.paste(im,(k*(W+10),0))
c=c.resize((c.width*2//3,c.height*2//3)); c.save(out); print(c.size)
