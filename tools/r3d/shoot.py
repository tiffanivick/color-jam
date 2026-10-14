import sys, base64, io, math, json
from playwright.sync_api import sync_playwright
from PIL import Image
SS=2
def render(pg, o):
    o=dict(o); o2={k:(v*SS if k in("w","h","ox","oy","S") else v) for k,v in o.items()}
    d=pg.evaluate("o=>renderFrame(o)", o2)
    im=Image.open(io.BytesIO(base64.b64decode(d.split(",")[1]))).convert("RGBA")
    return im.resize((o["w"],o["h"]), Image.LANCZOS)
spec=json.loads(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(); errs=[]; pg.on("console",lambda m: errs.append(m.text)); pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8799/render.html"); pg.wait_for_timeout(300)
    if errs: print(errs)
    ims=[render(pg, dict(spec["base"], **f)) for f in spec["frames"]]
    W=sum(i.width for i in ims); H=ims[0].height
    sheet=Image.new("RGBA",(W,H)); x=0
    for i in ims: sheet.paste(i,(x,0)); x+=i.width
    sheet.save(spec["out"]); print(sheet.size)
