import json,subprocess,time,sys
from playwright.sync_api import sync_playwright
paths=json.load(open("/tmp/paths4.json"))
JS=open("/tmp/replay4.js").read()
srv=subprocess.Popen(["python3","-m","http.server","8775","--directory","/home/claude/v3"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1); bad=0
with sync_playwright() as p:
    b=p.chromium.launch()
    for i in range(len(paths)):
        pg=b.new_page(viewport={"width":390,"height":844})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(f"http://localhost:8775/index.html?reset=1&skip={i}" if i else "http://localhost:8775/index.html?reset=1")
        pg.wait_for_timeout(300)
        pg.evaluate("localStorage.setItem('colorjam2.save', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('colorjam2.save')||'{}'),{login:{last:todayStr(),count:1,claimed:todayStr()}}))); location.reload()") if False else None
        pg.evaluate("S.login.claimed=todayStr(); save(); closeSheet(); startLevel()")
        pg.wait_for_timeout(200)
        r=pg.evaluate(JS,paths[str(i)])
        pg.wait_for_timeout(1100)
        modal=pg.evaluate("!document.getElementById('modal').classList.contains('hidden') && !!document.getElementById('winNext')")
        cleared=pg.evaluate("S.cleared")
        ok = r=="ok" and modal and cleared==i+1 and not errs
        if not ok: bad+=1
        print(i,r,modal,cleared,errs,flush=True); pg.close()
    b.close()
srv.terminate(); print("failures",bad)
