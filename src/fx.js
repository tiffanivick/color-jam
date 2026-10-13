// FX: power-up animations you can see.
//  Hammer — a cute toy hammer rises from the bottom of the screen, rears back toward you,
//           slams down, and the block cracks and breaks into real pieces of itself.
//  Vacuum — a nozzle comes down on its hose, the block trembles, lifts and is slurped into
//           the opening; a lump in the block's colour then runs up the hose.
// Uses boardEl, PADDING, CELL, STEP and burst() from engine.js.

const FX_HAMMER_SVG = `<svg viewBox="0 0 140 230" width="140" height="230" aria-hidden="true">
  <defs>
    <linearGradient id="fxh-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8fa0"/><stop offset="0.35" stop-color="#ff4d5e"/><stop offset="1" stop-color="#b51d36"/>
    </linearGradient>
    <linearGradient id="fxh-cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffe680"/><stop offset="0.5" stop-color="#ffd447"/><stop offset="1" stop-color="#d9a514"/>
    </linearGradient>
    <linearGradient id="fxh-handle" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e2a514"/><stop offset="0.45" stop-color="#ffe27a"/><stop offset="1" stop-color="#c98a10"/>
    </linearGradient>
    <linearGradient id="fxh-grip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f7de0"/><stop offset="0.45" stop-color="#6fb2ff"/><stop offset="1" stop-color="#2160b8"/>
    </linearGradient>
  </defs>
  <!-- handle -->
  <rect x="58" y="70" width="24" height="152" rx="12" fill="url(#fxh-handle)" stroke="#a8770a" stroke-width="2"/>
  <rect x="58" y="150" width="24" height="72" rx="12" fill="url(#fxh-grip)" stroke="#1d4f99" stroke-width="2"/>
  <path d="M60 164h20M60 178h20M60 192h20M60 206h20" stroke="#1d4f99" stroke-width="2" opacity="0.5"/>
  <rect x="64" y="76" width="5" height="70" rx="2.5" fill="#fff" opacity="0.55"/>
  <!-- head: a squishy toy cylinder with yellow end caps -->
  <rect x="16" y="14" width="108" height="66" rx="30" fill="url(#fxh-body)" stroke="#8c1428" stroke-width="2.5"/>
  <ellipse cx="18" cy="47" rx="15" ry="33" fill="url(#fxh-cap)" stroke="#a8770a" stroke-width="2.5"/>
  <ellipse cx="122" cy="47" rx="15" ry="33" fill="url(#fxh-cap)" stroke="#a8770a" stroke-width="2.5"/>
  <ellipse cx="14" cy="38" rx="4" ry="10" fill="#fff" opacity="0.7"/>
  <ellipse cx="118" cy="38" rx="4" ry="10" fill="#fff" opacity="0.7"/>
  <rect x="36" y="22" width="68" height="12" rx="6" fill="#fff" opacity="0.55"/>
  <rect x="44" y="26" width="18" height="4" rx="2" fill="#fff" opacity="0.8"/>
  <!-- a little star sticker -->
  <path d="M70 46l3.5 7.2 7.9 1.1-5.7 5.6 1.4 7.8-7.1-3.7-7.1 3.7 1.4-7.8-5.7-5.6 7.9-1.1Z" fill="#fff6c8" stroke="#ffd447" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

const FX_NOZZLE_SVG = `<svg viewBox="0 0 110 420" width="110" height="420" aria-hidden="true">
  <defs>
    <linearGradient id="fxv-hose" x1="0" x2="1"><stop offset="0" stop-color="#4b2fa0"/><stop offset="0.42" stop-color="#a78bff"/><stop offset="1" stop-color="#3e2590"/></linearGradient>
    <linearGradient id="fxv-head" x1="0" x2="1"><stop offset="0" stop-color="#7a8396"/><stop offset="0.4" stop-color="#f4f7fc"/><stop offset="1" stop-color="#8b94a6"/></linearGradient>
    <linearGradient id="fxv-band" x1="0" x2="1"><stop offset="0" stop-color="#d9a514"/><stop offset="0.45" stop-color="#ffe680"/><stop offset="1" stop-color="#c98a10"/></linearGradient>
  </defs>
  <rect x="38" y="0" width="34" height="320" fill="url(#fxv-hose)"/>
  <g stroke="#2e1a78" stroke-width="2.5" opacity="0.55">
    ${Array.from({ length: 22 }, (_, i) => `<path d="M38 ${8 + i * 14}q17 6 34 0"/>`).join("")}
  </g>
  <rect x="32" y="312" width="46" height="16" rx="6" fill="url(#fxv-band)" stroke="#a8770a" stroke-width="2"/>
  <path d="M34 326h42l22 62H12Z" fill="url(#fxv-head)" stroke="#4a5263" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="44" y="334" width="8" height="40" rx="4" fill="#fff" opacity="0.6"/>
  <ellipse cx="55" cy="388" rx="44" ry="11" fill="#2a2d40" stroke="#4a5263" stroke-width="2.5"/>
  <ellipse cx="55" cy="387" rx="34" ry="7" fill="#05060c"/>
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
// the middle of the block's square nearest its centre (a good spot to hit / hover over)
function fxSpot(b) {
  const r = fxRect(b);
  const r0 = Math.min(...b.cells.map((c) => c[0]));
  const c0 = Math.min(...b.cells.map((c) => c[1]));
  return b.cells
    .map(([rr, cc]) => ({ x: r.x + (cc - c0) * STEP + CELL / 2, y: r.y + (rr - r0) * STEP + CELL / 2 - 4 }))
    .sort((p, q) => Math.hypot(p.x - r.cx, p.y - r.cy) - Math.hypot(q.x - r.cx, q.y - r.cy))[0];
}
function fxEl(cls, html) {
  const d = document.createElement("div");
  d.className = "fx-tool " + cls;
  if (html) d.innerHTML = html;
  boardEl.appendChild(d);
  return d;
}

// ---------------------------------------------------------------- Hammer
function hammerFX(b, done) {
  fxBusy++;
  const el = b.el;
  const r = fxRect(b);
  const hit = fxSpot(b);
  // head centre (70,47) of the 140x230 hammer sits on the hit point; it pivots at the grip end
  const h = fxEl("fx-hammer", FX_HAMMER_SVG);
  h.style.left = hit.x - 70 + "px";
  h.style.top = hit.y - 47 + "px";
  const D = 1000;
  h.animate(
    [
      { transform: "perspective(700px) translateY(320px) rotateX(-50deg) scale(0.9)", opacity: 0, offset: 0, easing: "cubic-bezier(.2,.8,.3,1)" },
      { transform: "perspective(700px) translateY(40px) rotateX(-45deg) scale(1.02)", opacity: 1, offset: 0.3, easing: "ease-in-out" },
      { transform: "perspective(700px) translateY(18px) rotateX(-62deg) scale(1.1)", opacity: 1, offset: 0.46, easing: "cubic-bezier(.7,0,1,.5)" },
      { transform: "perspective(700px) translateY(0) rotateX(4deg) scale(0.85)", opacity: 1, offset: 0.58, easing: "ease-out" },
      { transform: "perspective(700px) translateY(-2px) rotateX(-14deg) scale(0.9)", opacity: 1, offset: 0.7, easing: "ease-in" },
      { transform: "perspective(700px) translateY(300px) rotateX(-40deg) scale(0.85)", opacity: 0, offset: 1 },
    ],
    { duration: D, easing: "linear", fill: "forwards" },
  );
  const IMPACT = D * 0.58;

  // impact: squash, cracks from the hit point, a flash and a jolt through the board
  setTimeout(() => {
    Sfx.smash();
    el.animate(
      [
        { transform: "translateZ(0) scale(1, 1)" },
        { transform: "translateZ(0) scale(1.06, 0.9)" },
        { transform: "translateZ(0) scale(0.98, 1.02)" },
        { transform: "translateZ(0) scale(1, 1)" },
      ],
      { duration: 200, easing: "ease-out" },
    );
    const crack = document.createElement("div");
    crack.className = "fx-crack";
    crack.style.left = hit.x - r.x - 55 + "px";
    crack.style.top = hit.y - r.y - 55 + "px";
    el.appendChild(crack);
    const flash = document.createElement("div");
    flash.className = "fx-flash";
    flash.style.left = hit.x - 40 + "px";
    flash.style.top = hit.y - 40 + "px";
    boardEl.appendChild(flash);
    setTimeout(() => flash.remove(), 420);
    boardEl.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-5px,4px)" },
        { transform: "translate(5px,-3px)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 240 },
    );
    burst(hit.x, hit.y, "#ffffff", 10);
  }, IMPACT);

  // break: the block splits into wedges along the cracks, which tumble away and fall
  setTimeout(() => {
    Sfx.crack();
    const px = hit.x - r.x;
    const py = hit.y - r.y;
    const W = r.w;
    const H = r.h + 10;
    // points around the block's outline, a little jittered, fanning out from the hit
    const N = 9;
    const rim = [];
    for (let i = 0; i < N; i++) {
      const a = ((i + (Math.random() - 0.5) * 0.5) / N) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const t = Math.min(dx > 0 ? (W + 6 - px) / dx : dx < 0 ? (-6 - px) / dx : 1e9, dy > 0 ? (H + 6 - py) / dy : dy < 0 ? (-6 - py) / dy : 1e9);
      rim.push([px + dx * t, py + dy * t, a]);
    }
    const pieces = [];
    for (let i = 0; i < N; i++) {
      const p1 = rim[i];
      const p2 = rim[(i + 1) % N];
      // corners of the box between two rim points belong to this wedge too
      const pts = [[px, py], [p1[0], p1[1]]];
      const corners = [[-6, -6], [W + 6, -6], [W + 6, H + 6], [-6, H + 6]]
        .map((c) => [c[0], c[1], Math.atan2(c[1] - py, c[0] - px)])
        .map((c) => [c[0], c[1], ((c[2] - p1[2]) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)])
        .filter((c) => c[2] < ((((p2[2] - p1[2]) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)))
        .sort((a, b) => a[2] - b[2]);
      corners.forEach((c) => pts.push([c[0], c[1]]));
      pts.push([p2[0], p2[1]]);
      const mid = (p1[2] + ((((p2[2] - p1[2]) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / 2);
      pieces.push({ pts, ang: mid });
    }
    pieces.forEach(({ pts, ang }) => {
      const frag = document.createElement("div");
      frag.className = "fx-frag";
      frag.style.left = r.x + "px";
      frag.style.top = r.y + "px";
      frag.style.width = W + "px";
      frag.style.height = H + "px";
      frag.style.clipPath = "polygon(" + pts.map(([x, y]) => x.toFixed(1) + "px " + y.toFixed(1) + "px").join(",") + ")";
      const copy = el.cloneNode(true);
      copy.style.left = "0px";
      copy.style.top = "0px";
      copy.style.animation = "none";
      copy.style.transition = "none";
      copy.style.opacity = "1";
      frag.appendChild(copy);
      boardEl.appendChild(frag);
      const dist = 50 + Math.random() * 45;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 0.7;
      const spin = (Math.random() - 0.5) * 300;
      const tilt = (Math.random() - 0.5) * 120;
      frag.style.transformOrigin = px + Math.cos(ang) * 20 + "px " + (py + Math.sin(ang) * 20) + "px";
      frag.animate(
        [
          { transform: "perspective(600px) translate(0,0) rotate(0) rotateX(0)", opacity: 1, offset: 0 },
          { transform: `perspective(600px) translate(${Math.cos(ang) * 5}px, ${Math.sin(ang) * 5}px) rotate(${spin * 0.03}deg)`, opacity: 1, offset: 0.12 },
          { transform: `perspective(600px) translate(${dx * 0.7}px, ${dy * 0.7 - 34}px) rotate(${spin * 0.5}deg) rotateX(${tilt * 0.5}deg) scale(0.92)`, opacity: 1, offset: 0.45 },
          { transform: `perspective(600px) translate(${dx}px, ${dy + 150}px) rotate(${spin}deg) rotateX(${tilt}deg) scale(0.7)`, opacity: 0, offset: 1 },
        ],
        { duration: 900 + Math.random() * 200, easing: "cubic-bezier(.25,.55,.55,1)", fill: "forwards" },
      );
      setTimeout(() => frag.remove(), 1150);
    });
    el.style.transition = "none";
    el.style.opacity = "0"; // (not visibility: the pieces borrow this block's clip shapes)
    burst(hit.x, hit.y, "#efe6d2", 16); // dust
  }, IMPACT + 170);

  setTimeout(() => {
    h.remove();
    el.remove();
    fxBusy--;
    done && done();
  }, IMPACT + 170 + 1050);
}

// ---------------------------------------------------------------- Vacuum
function vacuumFX(group, done) {
  fxBusy++;
  const spot = fxSpot(group[0]);
  // the nozzle is held at an angle, its opening just above the block and facing it, with the
  // hose running up and away (to the right, or to the left near the right edge)
  const bw = boardEl.clientWidth;
  const side = spot.x > bw * 0.62 ? -1 : 1;
  const TILT = 34 * side;
  const mouth = { x: spot.x + 26 * side, y: spot.y - 34 }; // centre of the opening
  // the 110x420 nozzle: its opening (55,387) is placed on the mouth point and the whole
  // thing is tilted around it
  const n = fxEl("fx-nozzle", FX_NOZZLE_SVG);
  n.style.left = mouth.x - 55 + "px";
  n.style.top = mouth.y - 387 + "px";
  n.style.transformOrigin = "55px 387px";
  const hoseDir = { x: Math.sin((TILT * Math.PI) / 180), y: -Math.cos((TILT * Math.PI) / 180) };
  n.animate(
    [
      { transform: `translate(${hoseDir.x * 260}px, ${hoseDir.y * 260}px) rotate(${TILT}deg)`, opacity: 0 },
      { transform: `translate(${-hoseDir.x * 8}px, ${-hoseDir.y * 8}px) rotate(${TILT}deg)`, opacity: 1, offset: 0.75 },
      { transform: `translate(0,0) rotate(${TILT}deg)`, opacity: 1 },
    ],
    { duration: 340, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
  );
  Sfx.suck();
  // air and dust rushing into the opening
  const swirl = setInterval(() => {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 55 + Math.random() * 60;
      const sx = mouth.x + Math.cos(a) * d;
      const sy = mouth.y + Math.sin(a) * d * 0.8;
      const s = document.createElement("div");
      s.className = Math.random() < 0.35 ? "fx-dust" : "fx-air";
      s.style.left = sx + "px";
      s.style.top = sy + "px";
      const ang = Math.atan2(mouth.y - sy, mouth.x - sx);
      boardEl.appendChild(s);
      s.animate(
        [
          { transform: `rotate(${ang}rad) translateX(0) scaleX(0.4)`, opacity: 0 },
          { transform: `rotate(${ang + 0.35}rad) translateX(${d * 0.55}px) scaleX(1)`, opacity: 0.95, offset: 0.5 },
          { transform: `rotate(${ang + 0.6}rad) translateX(${d}px) scaleX(0.2)`, opacity: 0 },
        ],
        { duration: 380, easing: "ease-in", fill: "forwards" },
      );
      setTimeout(() => s.remove(), 400);
    }
  }, 60);
  // the nozzle hums while it pulls
  const hum = n.animate(
    [
      { transform: `translate(0,0) rotate(${TILT}deg)` },
      { transform: `translate(-1px,1px) rotate(${TILT - 0.6}deg)` },
      { transform: `translate(1px,0) rotate(${TILT + 0.6}deg)` },
      { transform: `translate(0,0) rotate(${TILT}deg)` },
    ],
    { duration: 90, iterations: Infinity, delay: 340, fill: "forwards" },
  );
  const START = 340;
  const EACH = 260;
  const SLURP = 760;
  group.forEach((b, i) => {
    const el = b.el;
    const r = fxRect(b);
    setTimeout(() => {
      el.style.transition = "none";
      el.style.animation = "none";
      boardEl.appendChild(el); // out of the board's clipping, above the nozzle
      el.style.zIndex = "33";
      // everything scales toward the opening, so the block is drawn into it
      el.style.transformOrigin = mouth.x - r.x + "px " + (mouth.y - r.y) + "px";
      const far = Math.hypot(r.cx - mouth.x, r.cy - mouth.y) > 30;
      el.animate(
        [
          { transform: "translateZ(0) rotate(0) scale(1,1)", opacity: 1, offset: 0 },
          { transform: "translateZ(0) rotate(-2deg) scale(1.02,0.98)", opacity: 1, offset: 0.08 },
          { transform: "translateZ(0) rotate(2deg) scale(0.98,1.02)", opacity: 1, offset: 0.16 },
          { transform: "translateZ(0) rotate(-2deg) scale(1.04,1.04)", opacity: 1, offset: 0.26 },
          { transform: `translateZ(0) rotate(${far ? 6 : 3}deg) scale(0.86,1.18)`, opacity: 1, offset: 0.48 },
          { transform: `translateZ(0) rotate(${far ? -10 : -6}deg) scale(0.42,0.85)`, opacity: 1, offset: 0.74 },
          { transform: "translateZ(0) rotate(12deg) scale(0.04,0.12)", opacity: 0, offset: 1 },
        ],
        { duration: SLURP, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
      );
      setTimeout(() => {
        Sfx.pop();
        el.remove();
        // a lump in the block's colour runs up the hose
        const lump = document.createElement("div");
        lump.className = "fx-lump";
        lump.style.setProperty("--c", b.color);
        const ls = mouth.x + hoseDir.x * 80;
        const lt = mouth.y + hoseDir.y * 80;
        lump.style.left = ls - 19 + "px";
        lump.style.top = lt - 15 + "px";
        boardEl.appendChild(lump);
        const go = (d) => `translate(${hoseDir.x * d}px, ${hoseDir.y * d}px) rotate(${TILT}deg)`;
        lump.animate(
          [
            { transform: go(0) + " scale(0.6)", opacity: 0 },
            { transform: go(20) + " scale(1)", opacity: 1, offset: 0.2 },
            { transform: go(300) + " scale(0.9)", opacity: 1, offset: 0.95 },
            { transform: go(320) + " scale(0.9)", opacity: 0 },
          ],
          { duration: 520, easing: "ease-in", fill: "forwards" },
        );
        setTimeout(() => lump.remove(), 540);
      }, SLURP);
    }, START + i * EACH);
  });
  const end = START + (group.length - 1) * EACH + SLURP;
  setTimeout(() => clearInterval(swirl), end - 100);
  setTimeout(() => {
    hum.cancel();
    n.animate(
      [
        { transform: `translate(0,0) rotate(${TILT}deg)`, opacity: 1 },
        { transform: `translate(${hoseDir.x * 280}px, ${hoseDir.y * 280}px) rotate(${TILT}deg)`, opacity: 0 },
      ],
      { duration: 300, easing: "ease-in", fill: "forwards" },
    );
  }, end + 380);
  setTimeout(() => {
    n.remove();
    fxBusy--;
    done && done();
  }, end + 700);
}
