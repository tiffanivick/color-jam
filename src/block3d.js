// BLOCK3D: draws a block's body as a real 3D molded-plastic shape — rounded bevels, glossy
// highlights, studs and a soft contact shadow — with a tiny WebGL ray-marcher (the same kind of
// renderer that made the hammer and vacuum). Each shape + colour is drawn once and cached as an
// image. brick.js still draws the overlays (ice, chains, stripes, arrows) on top.
// If WebGL isn't available, Block3D.body() returns null and the block keeps its SVG body.
// Needs CELL and STEP from engine.js. Preview every look: tools/r3d/blocks.html.

const Block3D = (() => {
  const PAD = 14; // px around the footprint for the shadow
  const KOB = 0.5; // how far up the screen one unit of height moves (oblique camera)
  const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 res, org;
uniform float S, kob;
uniform int nr, ns;
uniform vec4 rc[16];   // body boxes in squares: x0, x1, z0, z1
uniform vec2 st[6];    // stud centres (x, z)
uniform vec3 bcol;
const float BH = 0.30;  // block height, in squares
float sdRBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
float sdCyl(vec3 p, float r, float h, float e){ vec2 d=vec2(length(p.xz)-r+e, abs(p.y)-h+e); return min(max(d.x,d.y),0.)+length(max(d,0.))-e; }
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float body(vec3 p){
  float d = 1e9;
  for (int i=0;i<16;i++){ if(i>=nr) break; vec4 r=rc[i];
    vec3 c = vec3((r.x+r.y)*0.5, BH*0.5, (r.z+r.w)*0.5);
    d = min(d, sdRBox(p-c, vec3((r.y-r.x)*0.5, BH*0.5, (r.w-r.z)*0.5), 0.13)); }
  return d; }
vec2 map(vec3 p){
  float d = body(p), s = 1e9;
  for (int i=0;i<6;i++){ if(i>=ns) break; s = min(s, sdCyl(p-vec3(st[i].x, BH+0.025, st[i].y), 0.19, 0.055, 0.04)); }
  return vec2(smin(d, s, 0.05), s < d ? 1. : 0.); }
vec3 nrm(vec3 p){ vec2 e=vec2(0.0015,0.); return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x)); }
float ao(vec3 p, vec3 n){ float a=0., s=1.; for(int i=1;i<=5;i++){ float h=0.04*float(i); a+=(h-map(p+n*h).x)*s; s*=0.6; } return clamp(1.-2.2*a,0.,1.); }
float soft(vec3 ro, vec3 rd){ float r=1., t=0.02; for(int i=0;i<40;i++){ float h=map(ro+rd*t).x; r=min(r, 9.*h/t); t+=clamp(h,0.02,0.2); if(r<0.002||t>3.) break; } return clamp(r,0.,1.); }
vec3 sky(vec3 r){ return mix(vec3(0.95,0.85,0.75), vec3(0.75,0.88,1.0), clamp(r.y*0.5+0.5,0.,1.)) * (0.9+0.3*smoothstep(0.6,1.,r.y)); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, res.y-gl_FragCoord.y);
  vec2 uv = (px - org) / S;
  // oblique camera: screen y = z - kob*y, so the top face sits on the squares
  vec3 rd = normalize(vec3(0., -1., -kob));
  vec3 ro = vec3(uv.x, BH+0.2, uv.y + (BH+0.2)*kob);
  float t = 0.; bool hit = false; vec2 h;
  for (int i=0;i<120;i++){ h = map(ro+rd*t); if(h.x<0.0006){hit=true;break;} t+=h.x; if(t>2.) break; }
  vec3 L = normalize(vec3(-0.55, 1.25, -0.8));
  if (!hit) {
    // the board under it: soft shadow toward the lower right, darkest at the block's foot
    vec3 p = ro + rd*(ro.y / -rd.y);
    float sh = 1. - soft(p + vec3(0.,0.002,0.), L);
    float a = 0.42*sh + 0.3*exp(-body(p)*14.);
    o = vec4(vec3(0.04,0.02,0.12)*a, clamp(a,0.,0.6)); // premultiplied
    return; }
  vec3 p = ro+rd*t, n = nrm(p), v = -rd;
  float a = ao(p,n);
  float wrap = max(dot(n,L)*0.5+0.5,0.);
  float nh = max(dot(n,normalize(L+v)),0.), fre = pow(1.-max(dot(n,v),0.),4.);
  vec3 c = bcol*(0.38*a + 0.72*wrap*wrap) + vec3(1.)*pow(nh,70.)*0.7 + sky(reflect(-v,n))*(0.06+0.5*fre)*a;
  if (h.y==1.) c += bcol*0.06;
  o = vec4(clamp(pow(c,vec3(0.95)),0.,1.), 1.);
}`;
  let gl = null, cv = null, U = null, failed = false;
  const cache = new Map();

  function init() {
    if (gl || failed) return !!gl;
    try {
      cv = document.createElement("canvas");
      gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error("no webgl2");
      const sh = (t, s) => {
        const x = gl.createShader(t);
        gl.shaderSource(x, s);
        gl.compileShader(x);
        if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x));
        return x;
      };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }"));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const names = ["res", "org", "S", "kob", "nr", "ns", "rc", "st", "bcol"];
      U = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(pr, n)]));
      cv.addEventListener("webglcontextlost", () => {
        gl = null;
        failed = true;
      });
      return true;
    } catch (e) {
      gl = null;
      failed = true;
      return false;
    }
  }

  // body boxes, in squares: each square, the gap to a neighbour, and the gap crossing where four
  // squares meet (same rule as brick.js). The front wall is drawn inside the footprint, so the
  // body starts kob*BH lower; it reaches a little past the footprint so its rounded edges cover
  // the squares under it exactly.
  function boxes(cells) {
    const CW = CELL / STEP;
    const w = KOB * 0.3 - 0.05;
    const has = (r, c) => cells.some(([rr, cc]) => rr === r && cc === c);
    const out = [];
    for (const [r, c] of cells) {
      const R = has(r, c + 1), D = has(r + 1, c);
      out.push([c, c + CW, r + w, r + CW + 0.05]);
      if (R) out.push([c, c + 1 + CW, r + w, r + CW + 0.05]);
      if (D) out.push([c, c + CW, r + w, r + 1 + CW + 0.05]);
      if (R && D && has(r + 1, c + 1)) out.push([c, c + 1 + CW, r + w, r + 1 + CW + 0.05]);
    }
    return out;
  }

  // cells relative to the block's top-left square. Returns { src, pad } or null.
  function body(cells, color, studs = true) {
    const key = color + (studs ? "s" : "") + JSON.stringify([...cells].sort((p, q) => p[0] - q[0] || p[1] - q[1]));
    if (cache.has(key)) return cache.get(key);
    if (!init()) return null;
    const rows = Math.max(...cells.map((c) => c[0])) + 1, cols = Math.max(...cells.map((c) => c[1])) + 1;
    const W = cols * STEP - (STEP - CELL) + 2 * PAD, H = rows * STEP - (STEP - CELL) + 2 * PAD;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const k = Math.min(2 * dpr, 4); // rendered this many px per CSS px, then scaled down to dpr
    const rc = boxes(cells).slice(0, 16);
    // studs sit where brick.js draws its stud overlays (20px down the top face)
    const sz = 20 / STEP + KOB * (0.3 + 0.08);
    const st = studs ? cells.slice(0, 6).map(([r, c]) => [c + CELL / STEP / 2, r + sz]) : [];
    try {
      cv.width = Math.round(W * k);
      cv.height = Math.round(H * k);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.res, cv.width, cv.height);
      gl.uniform2f(U.org, PAD * k, PAD * k);
      gl.uniform1f(U.S, STEP * k);
      gl.uniform1f(U.kob, KOB);
      gl.uniform1i(U.nr, rc.length);
      gl.uniform4fv(U.rc, new Float32Array(16 * 4).fill(0).map((z, i) => (rc[i >> 2] ? rc[i >> 2][i & 3] : 0)));
      gl.uniform1i(U.ns, st.length);
      gl.uniform2fv(U.st, new Float32Array(6 * 2).fill(0).map((z, i) => (st[i >> 1] ? st[i >> 1][i & 1] : 0)));
      gl.uniform3f(U.bcol, ...[1, 3, 5].map((i) => (parseInt(color.slice(i, i + 2), 16) / 255) ** 1.6));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const out = document.createElement("canvas");
      out.width = Math.round(W * dpr);
      out.height = Math.round(H * dpr);
      const g = out.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(cv, 0, 0, out.width, out.height);
      const res = { src: out.toDataURL("image/png"), pad: PAD, w: W, h: H };
      cache.set(key, res);
      return res;
    } catch (e) {
      failed = true;
      return null;
    }
  }

  return { body, boxes, PAD };
})();
