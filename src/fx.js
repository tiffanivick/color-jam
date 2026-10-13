// FX: power-up animations you can see — the Hammer swings down and smashes a block
// into pieces; the Vacuum drops a nozzle in and sucks blocks up into it.
// Uses boardEl, PADDING, CELL, STEP and burst() from engine.js.

const FX_HAMMER_SVG = `<svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
  <defs>
    <linearGradient id="fxwood" x1="0" x2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="0.5" stop-color="#e6b07a"/><stop offset="1" stop-color="#a86d34"/></linearGradient>
    <linearGradient id="fxmetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f8"/><stop offset="0.45" stop-color="#aab3c2"/><stop offset="1" stop-color="#6b7486"/></linearGradient>
  </defs>
  <rect x="31" y="28" width="10" height="68" rx="4" fill="url(#fxwood)" stroke="#7a4a20" stroke-width="1.5"/>
  <rect x="31" y="80" width="10" height="16" rx="3" fill="#e8434f"/>
  <rect x="8" y="8" width="56" height="26" rx="6" fill="url(#fxmetal)" stroke="#4a5263" stroke-width="2"/>
  <rect x="12" y="11" width="48" height="5" rx="2.5" fill="#fff" opacity="0.7"/>
  <rect x="4" y="10" width="8" height="22" rx="3" fill="#8b94a6" stroke="#4a5263" stroke-width="2"/>
</svg>`;

const FX_NOZZLE_SVG = `<svg viewBox="0 0 80 150" width="80" height="150" aria-hidden="true">
  <defs>
    <linearGradient id="fxhose" x1="0" x2="1"><stop offset="0" stop-color="#5a3fb0"/><stop offset="0.45" stop-color="#9b7bff"/><stop offset="1" stop-color="#4a2f9a"/></linearGradient>
    <linearGradient id="fxcone" x1="0" x2="1"><stop offset="0" stop-color="#6b7486"/><stop offset="0.4" stop-color="#eef2f8"/><stop offset="1" stop-color="#7d8698"/></linearGradient>
  </defs>
  <rect x="29" y="0" width="22" height="92" fill="url(#fxhose)"/>
  <path d="M29 12h22M29 26h22M29 40h22M29 54h22M29 68h22M29 82h22" stroke="#3a2580" stroke-width="2" opacity="0.6"/>
  <path d="M26 90h28l14 46H12Z" fill="url(#fxcone)" stroke="#4a5263" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="40" cy="136" rx="28" ry="7" fill="#1d1f2e" stroke="#4a5263" stroke-width="2"/>
  <ellipse cx="40" cy="135" rx="20" ry="4" fill="#000" opacity="0.6"/>
</svg>`;

let fxBusy = 0; // how many power-up animations are playing

// the block's picture on the board, in board pixels
function fxRect(b) {
  const el = b.el;
  const x = PADDING + parseFloat(el.style.left);
  const y = PADDING + parseFloat(el.style.top);
  const w = parseFloat(el.style.width);
  const h = parseFloat(el.style.height);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
function fxEl(cls, html) {
  const d = document.createElement("div");
  d.className = "fx-tool " + cls;
  if (html) d.innerHTML = html;
  boardEl.appendChild(d);
  return d;
}

// ---------------------------------------------------------------- Hammer
// swing → impact (squash, crack, board shake) → the block shatters into chunks
function hammerFX(b, done) {
  fxBusy++;
  const el = b.el;
  const r = fxRect(b);
  // hit the middle of the square nearest the block's centre
  const cells = b.cells;
  const r0 = Math.min(...cells.map((c) => c[0]));
  const c0 = Math.min(...cells.map((c) => c[1]));
  const near = cells
    .map(([rr, cc]) => ({ x: r.x + (cc - c0) * STEP + CELL / 2, y: r.y + (rr - r0) * STEP + CELL / 2 }))
    .sort((p, q) => Math.hypot(p.x - r.cx, p.y - r.cy) - Math.hypot(q.x - r.cx, q.y - r.cy))[0];
  // the hammer pivots at the end of its handle (36,96), 72px to the right of the target
  const h = fxEl("fx-hammer", FX_HAMMER_SVG);
  h.style.left = near.x + 82 - 36 + "px";
  h.style.top = near.y - 96 + 6 + "px";
  h.animate(
    [
      { transform: "rotate(-8deg) scale(1.35)", opacity: 0, offset: 0, easing: "ease-out" },
      { transform: "rotate(-24deg) scale(1.35)", opacity: 1, offset: 0.3, easing: "cubic-bezier(.55,0,1,.6)" },
      { transform: "rotate(-90deg) scale(1.15)", opacity: 1, offset: 0.55, easing: "ease-out" },
      { transform: "rotate(-76deg) scale(1.17)", opacity: 1, offset: 0.72, easing: "ease-in" },
      { transform: "rotate(-62deg) scale(1.25)", opacity: 0, offset: 1 },
    ],
    { duration: 760, easing: "linear", fill: "forwards" },
  );
  const IMPACT = 760 * 0.55;
  setTimeout(() => {
    Sfx.smash();
    // squash, crack and a jolt through the board
    el.animate(
      [
        { transform: "translateZ(0) scale(1, 1)" },
        { transform: "translateZ(0) scale(1.07, 0.88)" },
        { transform: "translateZ(0) scale(0.97, 1.03)" },
        { transform: "translateZ(0) scale(1, 1)" },
      ],
      { duration: 180, easing: "ease-out" },
    );
    const crack = document.createElement("div");
    crack.className = "fx-crack";
    crack.style.left = near.x - r.x - 40 + "px";
    crack.style.top = near.y - r.y - 40 + "px";
    el.appendChild(crack);
    const flash = document.createElement("div");
    flash.className = "fx-flash";
    flash.style.left = near.x - 36 + "px";
    flash.style.top = near.y - 36 + "px";
    boardEl.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
    boardEl.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-4px,3px)" },
        { transform: "translate(4px,-2px)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 220 },
    );
  }, IMPACT);
  // shatter: each square breaks into four chunks that fly out and fall
  setTimeout(() => {
    el.style.transition = "none";
    el.style.opacity = "0";
    cells.forEach(([rr, cc]) => {
      const x = r.x + (cc - c0) * STEP;
      const y = r.y + (rr - r0) * STEP;
      for (let k = 0; k < 4; k++) {
        const s = document.createElement("div");
        s.className = "fx-shard";
        const qx = (k % 2) * 24;
        const qy = Math.floor(k / 2) * 24;
        s.style.left = x + qx + "px";
        s.style.top = y + qy + "px";
        s.style.setProperty("--c", b.color);
        boardEl.appendChild(s);
        const fromHit = Math.atan2(y + qy + 12 - near.y, x + qx + 12 - near.x);
        const dist = 40 + Math.random() * 50;
        const dx = Math.cos(fromHit) * dist + (Math.random() - 0.5) * 20;
        const up = -30 - Math.random() * 40;
        const rot = (Math.random() - 0.5) * 540;
        s.animate(
          [
            { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.6}px, ${up}px) rotate(${rot * 0.5}deg) scale(0.9)`, opacity: 1, offset: 0.4 },
            { transform: `translate(${dx}px, ${up + 140}px) rotate(${rot}deg) scale(0.6)`, opacity: 0 },
          ],
          { duration: 700 + Math.random() * 200, easing: "cubic-bezier(.3,.6,.6,1)", fill: "forwards" },
        );
        setTimeout(() => s.remove(), 950);
      }
    });
    burst(near.x, near.y, "#e8e3d6", 14); // dust
    Sfx.crack();
  }, IMPACT + 130);
  setTimeout(() => {
    h.remove();
    el.remove();
    fxBusy--;
    done && done();
  }, 1000);
}

// ---------------------------------------------------------------- Vacuum
// nozzle drops in → air rushes toward it → each block wobbles, stretches and is sucked up
function vacuumFX(group, done) {
  fxBusy++;
  // hover straight over the square of the tapped block nearest its centre
  const t = group[0];
  const first = fxRect(t);
  const tr0 = Math.min(...t.cells.map((c) => c[0]));
  const tc0 = Math.min(...t.cells.map((c) => c[1]));
  const spot = t.cells
    .map(([rr, cc]) => ({ x: first.x + (cc - tc0) * STEP + CELL / 2, y: first.y + (rr - tr0) * STEP + CELL / 2 }))
    .sort((p, q) => Math.hypot(p.x - first.cx, p.y - first.cy) - Math.hypot(q.x - first.cx, q.y - first.cy))[0];
  const mouth = { x: spot.x, y: spot.y - 6 };
  const n = fxEl("fx-nozzle", FX_NOZZLE_SVG);
  n.style.left = mouth.x - 40 + "px";
  n.style.top = mouth.y - 136 + "px";
  n.animate(
    [
      { transform: "translateY(-90px)", opacity: 0 },
      { transform: "translateY(4px)", opacity: 1, offset: 0.8 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    { duration: 260, easing: "ease-out", fill: "forwards" },
  );
  Sfx.suck();
  // air streaks rushing into the mouth
  const streaks = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (0.15 + Math.random() * 0.7);
      const d = 60 + Math.random() * 70;
      const sx = mouth.x + Math.cos(a) * d * (Math.random() < 0.5 ? -1 : 1);
      const sy = mouth.y + Math.sin(a) * d;
      const s = document.createElement("div");
      s.className = "fx-air";
      s.style.left = sx + "px";
      s.style.top = sy + "px";
      const ang = Math.atan2(mouth.y - sy, mouth.x - sx);
      s.style.transform = `rotate(${ang}rad)`;
      boardEl.appendChild(s);
      s.animate(
        [
          { transform: `rotate(${ang}rad) translateX(0) scaleX(0.4)`, opacity: 0 },
          { transform: `rotate(${ang}rad) translateX(${d * 0.5}px) scaleX(1)`, opacity: 0.9, offset: 0.5 },
          { transform: `rotate(${ang}rad) translateX(${d}px) scaleX(0.3)`, opacity: 0 },
        ],
        { duration: 340, easing: "ease-in", fill: "forwards" },
      );
      setTimeout(() => s.remove(), 360);
    }
  }, 70);
  // the blocks go in one after another
  const START = 260;
  const EACH = 150;
  const SUCK = 560;
  group.forEach((b, i) => {
    const el = b.el;
    const r = fxRect(b);
    const dx = mouth.x - r.cx;
    const dy = mouth.y - r.cy;
    setTimeout(() => {
      el.style.transition = "none";
      el.style.zIndex = "5";
      el.animate(
        [
          { transform: "translateZ(0) translate(0,0) rotate(0) scale(1,1)", opacity: 1 },
          { transform: `translateZ(0) translate(${dx * 0.03}px, ${dy * 0.03}px) rotate(-5deg) scale(1.05, 0.95)`, opacity: 1, offset: 0.18 },
          { transform: `translateZ(0) translate(${dx * 0.06}px, ${dy * 0.06}px) rotate(5deg) scale(0.95, 1.06)`, opacity: 1, offset: 0.36 },
          { transform: `translateZ(0) translate(${dx * 0.55}px, ${dy * 0.55}px) rotate(-8deg) scale(0.55, 1.15)`, opacity: 1, offset: 0.72 },
          { transform: `translateZ(0) translate(${dx}px, ${dy}px) rotate(0) scale(0.08, 0.2)`, opacity: 0 },
        ],
        { duration: SUCK, easing: "cubic-bezier(.55,0,.85,.4)", fill: "forwards" },
      );
      setTimeout(() => {
        Sfx.pop();
        el.remove();
      }, SUCK);
    }, START + i * EACH);
  });
  const end = START + (group.length - 1) * EACH + SUCK;
  setTimeout(() => clearInterval(streaks), end - 80);
  setTimeout(() => {
    n.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-90px)", opacity: 0 },
      ],
      { duration: 240, easing: "ease-in", fill: "forwards" },
    );
  }, end + 40);
  setTimeout(() => {
    n.remove();
    fxBusy--;
    done && done();
  }, end + 300);
}
