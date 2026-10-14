from playwright.sync_api import sync_playwright
from PIL import Image
import sys
MODE=sys.argv[1]; OUT=sys.argv[2]
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={"width":402,"height":874},device_scale_factor=1.5); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8792/index.html?reset=1&skip=33&skin=real"); pg.wait_for_timeout(600)
    pg.evaluate("S.login.claimed=todayStr(); S.inv.hammer=5; S.inv.vacuum=5; save(); closeSheet(); startLevel()"); pg.wait_for_timeout(1300)
    pg.evaluate("closeSheet && closeSheet(); hideTip(); hooks.start()"); pg.wait_for_timeout(200)
    b=pg.evaluate("(()=>{const r=document.getElementById('board').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    clip={"x":b[0]-30,"y":b[1]-90,"width":b[2]+60,"height":b[3]+200}
    pg.click("#booster"+MODE); pg.wait_for_timeout(500)
    shots=["/tmp/a0.png"]; pg.screenshot(path=shots[0],clip=clip)
    t=pg.evaluate("blocks.findIndex(b=>b.color=='#ff8a3d')")
    x,y=pg.evaluate(f"(()=>{{const c=blocks[{t}].el.querySelector('.block-cell').getBoundingClientRect();return [c.left+24,c.top+24]}})()")
    k=pg.evaluate("document.getElementById('board').getBoundingClientRect().width/document.getElementById('board').offsetWidth")
    pg.mouse.move(x+60,y+92*k+80); pg.mouse.down(); pg.wait_for_timeout(200)
    shots.append("/tmp/a1.png"); pg.screenshot(path=shots[-1],clip=clip)
    pg.mouse.move(x,y+92*k,steps=5); pg.wait_for_timeout(250)
    shots.append("/tmp/a2.png"); pg.screenshot(path=shots[-1],clip=clip)
    print("target", pg.evaluate("aim && aim.target && aim.target.color"))
    pg.evaluate("""(()=>{const K=6; window.__FXK=6; const ot=window.setTimeout; window.setTimeout=(f,t,...a)=>ot(f,(t||0)*K,...a);
       const oa=Element.prototype.animate; Element.prototype.animate=function(k,o){ if(typeof o==='number') o=o*K; else if(o){o=Object.assign({},o); if(o.duration) o.duration*=K; if(o.delay) o.delay*=K;} return oa.call(this,k,o);};})()""")
    pg.mouse.up(); t0=0
    for ms in [500,1300,2520,4300,6600]:
        pg.wait_for_timeout(ms-t0); t0=ms; f=f"/tmp/a_{ms}.png"; pg.screenshot(path=f,clip=clip); shots.append(f)
    print("removed", pg.evaluate(f"blocks[{t}].removed"), errs)
    br.close()
ims=[Image.open(f) for f in shots]; W=ims[0].width; H=ims[0].height
c=Image.new("RGB",(4*W+30,2*H+10),"white")
for i,im in enumerate(ims): c.paste(im,((i%4)*(W+10),(i//4)*(H+10)))
c=c.resize((c.width//2,c.height//2)); c.save(OUT); print(c.size)
