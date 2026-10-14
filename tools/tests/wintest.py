from playwright.sync_api import sync_playwright
for mode in ["hammer","vacuum"]:
  with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={"width":402,"height":874}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8792/index.html?reset=1&skip=33&skin=real"); pg.wait_for_timeout(600)
    pg.evaluate("S.login.claimed=todayStr(); S.inv.hammer=5; S.inv.vacuum=5; save(); closeSheet(); startLevel()"); pg.wait_for_timeout(1300)
    pg.evaluate("closeSheet && closeSheet(); hideTip()")
    t=pg.evaluate("(()=>{const k=blocks.findIndex(b=>b.color=='#ff8a3d'); blocks.forEach((b,i)=>{if(i!==k){b.removed=true;b.el.remove()}}); return k})()")
    pg.evaluate("hooks.start()"); pg.wait_for_timeout(100)
    pg.click("#boosterHammer" if mode=="hammer" else "#boosterVac"); pg.wait_for_timeout(200)
    x,y=pg.evaluate(f"(()=>{{const c=blocks[{t}].el.querySelector('.block-cell').getBoundingClientRect();return [c.left+24,c.top+24]}})()")
    k=pg.evaluate("document.getElementById('board').getBoundingClientRect().width/document.getElementById('board').offsetWidth"); pg.mouse.click(x,y+(92 if mode=="hammer" else 120)*k)
    seen=[]
    for ms in [600,1500,3500]:
        pg.wait_for_timeout(ms-(seen[-1][0] if seen else 0))
        seen.append((ms,pg.evaluate("fxBusy"),pg.evaluate("levelOver")))
    print(mode,seen,errs)
    br.close()
