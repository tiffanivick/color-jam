# Static server for the repo root (port 8792, what the test harnesses expect) that also
# accepts PUT /img/<name> so export.html can save the rendered sprite sheets.
#   python3 tools/r3d/serve.py
import http.server, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_PUT(self):
        m = re.fullmatch(r"/img/([\w.-]+\.(?:webp|png|json))", self.path)
        if not m:
            return self.send_error(403)
        os.makedirs(os.path.join(ROOT, "img"), exist_ok=True)
        data = self.rfile.read(int(self.headers["Content-Length"]))
        with open(os.path.join(ROOT, "img", m.group(1)), "wb") as f:
            f.write(data)
        self.send_response(204)
        self.end_headers()


http.server.ThreadingHTTPServer(("127.0.0.1", 8792), H).serve_forever()
