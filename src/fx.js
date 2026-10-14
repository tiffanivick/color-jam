// FX: power-up animations you can see.
//  Hammer — a chunky 3D mallet on your finger: aim it, let go, it pounds the block three
//           times and the block breaks into real pieces of itself.
//  Vacuum — the floor head on your finger: aim it, let go, it settles flat on the board, the
//           block is slurped under it and rides away down the hose.
//  Freeze — you wave an ice wand; snowflakes burst out and frost covers the board.
// Uses boardEl, PADDING, CELL, STEP and burst() from engine.js.


// The tools are drawn top-down at a high angle (orthographic: you see their top and front
// faces, so they look chunky and solid). They are locked straight up and down the screen:
// the head is at the top, the handle runs straight down to your finger. Your finger IS the
// handle — the tool follows it directly, with the head a fixed distance above it.

// Hammer, 120x120, seen from straight above like a stamp: you look down on the back of the
// round mallet head (its striking face is underneath, flat against the board) and the short
// handle points up out of the screen at you. Head centre 60,58; your finger sits below it.
const HAM = { w: 120, h: 120, hx: 60, hy: 58, gx: 60, gy: 150 };
const FX_HAMMER_SVG = `<svg viewBox="0 0 120 120" width="120" height="120" style="overflow:visible" aria-hidden="true">
  <defs>
    <linearGradient id="fxm-side" x1="0" x2="1"><stop offset="0" stop-color="#6e3d17"/><stop offset="0.3" stop-color="#c98a4c"/><stop offset="0.5" stop-color="#e7b677"/><stop offset="0.75" stop-color="#b9783d"/><stop offset="1" stop-color="#5e3412"/></linearGradient>
    <radialGradient id="fxm-top" cx="0.42" cy="0.36" r="0.72"><stop offset="0" stop-color="#fbe3b6"/><stop offset="0.6" stop-color="#e3b073"/><stop offset="1" stop-color="#b47439"/></radialGradient>
    <linearGradient id="fxm-rim" x1="0" x2="1"><stop offset="0" stop-color="#8f6418"/><stop offset="0.4" stop-color="#ffe9a8"/><stop offset="1" stop-color="#8f6418"/></linearGradient>
    <linearGradient id="fxm-hd" x1="0" x2="1"><stop offset="0" stop-color="#8e1826"/><stop offset="0.4" stop-color="#ff6b78"/><stop offset="1" stop-color="#7a1220"/></linearGradient>
    <radialGradient id="fxm-cap" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffb3ba"/><stop offset="0.6" stop-color="#ef4656"/><stop offset="1" stop-color="#a81f2e"/></radialGradient>
  </defs>
  <!-- the round head: its side shows a little at the bottom, the gold rim, then its wooden back -->
  <path d="M16 58v14a44 38 0 0 0 88 0V58Z" fill="url(#fxm-side)" stroke="#4e2a0e" stroke-width="2.5"/>
  <path d="M16 64a44 38 0 0 0 88 0" fill="none" stroke="url(#fxm-rim)" stroke-width="5"/>
  <ellipse cx="60" cy="58" rx="44" ry="38" fill="url(#fxm-top)" stroke="#4e2a0e" stroke-width="2.5"/>
  <ellipse cx="60" cy="58" rx="38" ry="32.5" fill="none" stroke="url(#fxm-rim)" stroke-width="4"/>
  <g fill="none" stroke="#a8692f" stroke-width="1.5" opacity="0.6"><ellipse cx="60" cy="58" rx="27" ry="23"/><ellipse cx="60" cy="58" rx="17" ry="14.5"/></g>
  <ellipse cx="44" cy="40" rx="15" ry="7" transform="rotate(-25 44 40)" fill="#fff" opacity="0.45"/>
  <!-- the handle, coming up out of the head toward you (foreshortened) -->
  <ellipse cx="62" cy="64" rx="15" ry="12" fill="#000" opacity="0.22"/>
  <path d="M49 58v12a11 9 0 0 0 22 0V58Z" fill="url(#fxm-hd)" stroke="#5e0e18" stroke-width="2"/>
  <ellipse cx="60" cy="70" rx="11" ry="9" fill="url(#fxm-cap)" stroke="#5e0e18" stroke-width="2"/>
  <ellipse cx="57" cy="67" rx="4" ry="2.5" fill="#fff" opacity="0.75"/>
</svg>`;

// Vacuum, 140x980. The floor head lies flat on the board, centre 70,40; the wand runs straight
// down to your finger at 70,160 and the hose carries on down off the screen.
const VAC = { w: 140, h: 980, hx: 70, hy: 40, gx: 70, gy: 160 };
const FX_NOZZLE_SVG = `<svg viewBox="0 0 140 980" width="140" height="980" style="overflow:visible" aria-hidden="true">
  <defs>
    <linearGradient id="fvz-metal" x1="0" x2="1"><stop offset="0" stop-color="#8f98a8"/><stop offset="0.45" stop-color="#f4f6fa"/><stop offset="1" stop-color="#7d8696"/></linearGradient>
    <linearGradient id="fvz-hose" x1="0" x2="1"><stop offset="0" stop-color="#8d97a8"/><stop offset="0.4" stop-color="#eef2f7"/><stop offset="1" stop-color="#7d8798"/></linearGradient>
    <linearGradient id="fvz-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6db8ff"/><stop offset="1" stop-color="#2f7de0"/></linearGradient>
    <linearGradient id="fvz-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f5fc8"/><stop offset="1" stop-color="#123f9e"/></linearGradient>
    <pattern id="fvz-ribs" width="36" height="9" patternUnits="userSpaceOnUse"><rect width="36" height="2.5" y="3" fill="#000" opacity="0.14"/></pattern>
  </defs>
  <!-- hose, off the bottom of the screen -->
  <rect x="52" y="168" width="36" height="812" rx="12" fill="url(#fvz-hose)" stroke="#6d7787" stroke-width="2"/>
  <rect x="52" y="168" width="36" height="812" rx="12" fill="url(#fvz-ribs)"/>
  <rect x="50" y="150" width="40" height="24" rx="7" fill="url(#fvz-metal)" stroke="#5d6676" stroke-width="2"/>
  <!-- wand -->
  <rect x="62" y="60" width="16" height="94" rx="6" fill="url(#fvz-metal)" stroke="#5d6676" stroke-width="2"/>
  <rect x="66" y="66" width="3" height="80" rx="1.5" fill="#fff" opacity="0.7"/>
  <!-- floor head, flat on the board: blue top, darker front, bristles along the bottom -->
  <rect x="6" y="30" width="128" height="30" rx="11" fill="url(#fvz-front)" stroke="#0e2f7a" stroke-width="2.5"/>
  <rect x="12" y="56" width="116" height="6" rx="3" fill="#d6dde8" stroke="#8d97a8" stroke-width="1"/>
  <rect x="6" y="8" width="128" height="38" rx="14" fill="url(#fvz-top)" stroke="#0e2f7a" stroke-width="2.5"/>
  <rect x="20" y="13" width="70" height="8" rx="4" fill="#fff" opacity="0.5"/>
  <circle cx="104" cy="25" r="6" fill="#ff4d6a" stroke="#b3203c" stroke-width="1.5"/><circle cx="102.5" cy="23.5" r="2" fill="#fff" opacity="0.7"/>
  <circle cx="120" cy="25" r="6" fill="#ffb21f" stroke="#b97808" stroke-width="1.5"/><circle cx="118.5" cy="23.5" r="2" fill="#fff" opacity="0.7"/>
  <rect x="56" y="40" width="28" height="22" rx="6" fill="url(#fvz-metal)" stroke="#5d6676" stroke-width="2"/>
</svg>`;

// the block's picture on the board, in board pixels
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
  // it strikes where you aimed it (or the middle of the block, coming up from the bottom)
  const aimed = window.__toolFrom;
  window.__toolFrom = null;
  const hit = aimed || fxSpot(b);
  // its shadow on the board: small and dark when the head touches, wide and faint when raised
  // its shadow on the board: tight and dark when the face touches, bigger and fainter when lifted
  const shadow = fxEl("fx-rshadow");
  shadow.style.left = hit.x - 46 + "px";
  shadow.style.top = hit.y - 38 + "px";
  const h = fxEl("fx-hammer", FX_HAMMER_SVG);
  h.style.left = hit.x - HAM.hx + "px";
  h.style.top = hit.y - HAM.hy + "px";
  // no sliding: lifted toward you = 150% size, a strike = a fast drop to 100% with a squash
  const D = 1400;
  const HITS = [300, 600, 900];
  const LIFT = "scale(1.5)";
  const SQUASH = "scale(1.07, 0.93)";
  const kf = [{ transform: aimed ? LIFT : "scale(0.3)", opacity: aimed ? 1 : 0, offset: 0 }];
  if (!aimed) kf.push({ transform: LIFT, opacity: 1, offset: 140 / D, easing: "cubic-bezier(.2,.8,.3,1.3)" });
  HITS.forEach((t, i) => {
    kf.push({ transform: LIFT, opacity: 1, offset: (t - 110) / D, easing: "cubic-bezier(.6,0,1,.6)" });
    kf.push({ transform: SQUASH, opacity: 1, offset: t / D, easing: "ease-out" });
    kf.push({ transform: "scale(1.02, 0.98)", opacity: 1, offset: (t + 40) / D, easing: "cubic-bezier(.2,.7,.4,1)" });
    if (i < 2) kf.push({ transform: LIFT, opacity: 1, offset: (t + 150) / D, easing: "linear" });
  });
  kf.push({ transform: "scale(1.3)", opacity: 1, offset: 1120 / D, easing: "ease-in" });
  kf.push({ transform: "scale(1.45)", opacity: 0, offset: 1 });
  h.animate(kf, { duration: D, easing: "linear", fill: "forwards" });
  const sh = (t, sx, dx, o) => ({ transform: `translate(${dx}px, ${dx * 0.8}px) scale(${sx})`, opacity: o, offset: t / D });
  const skf = [sh(0, 1.5, 14, aimed ? 0.25 : 0)];
  HITS.forEach((t, i) => {
    skf.push(sh(t - 110, 1.5, 14, 0.25), sh(t, 1, 3, 0.55));
    if (i < 2) skf.push(sh(t + 150, 1.5, 14, 0.25));
  });
  skf.push(sh(1120, 1.35, 11, 0.3), sh(D, 1.45, 13, 0));
  shadow.animate(skf, { duration: D, easing: "linear", fill: "forwards" });

  const crack = document.createElement("div");
  crack.className = "fx-crack";
  crack.style.left = hit.x - r.x - 55 + "px";
  crack.style.top = hit.y - r.y - 55 + "px";
  crack.style.opacity = "0";
  el.appendChild(crack);
  // each blow: squash, a jolt, sparks, and the cracks grow
  HITS.forEach((t, n) => {
    setTimeout(() => {
      Sfx.smash(n);
      el.animate(
        [
          { transform: "translateZ(0) scale(1, 1)" },
          { transform: `translateZ(0) scale(${1.04 + n * 0.02}, ${0.9 - n * 0.03})` },
          { transform: "translateZ(0) scale(0.98, 1.02)" },
          { transform: "translateZ(0) scale(1, 1)" },
        ],
        { duration: 190, easing: "ease-out" },
      );
      crack.style.opacity = "1";
      crack.style.transform = `scale(${[0.5, 0.8, 1.1][n]}) rotate(${n * 25}deg)`;
      const flash = document.createElement("div");
      flash.className = "fx-flash";
      flash.style.left = hit.x - 40 + "px";
      flash.style.top = hit.y - 40 + "px";
      boardEl.appendChild(flash);
      setTimeout(() => flash.remove(), 420);
      boardEl.animate(
        [{ transform: "translate(0,0)" }, { transform: `translate(${-3 - n}px,${2 + n}px)` }, { transform: `translate(${3 + n}px,${-2 - n}px)` }, { transform: "translate(0,0)" }],
        { duration: 200 },
      );
      burst(hit.x, hit.y, n < 2 ? "#ffffff" : "#efe6d2", 6 + n * 5);
    }, t);
  });

  // the last blow breaks it into wedges along the cracks, which tumble away and fall
  const IMPACT = HITS[2];
  setTimeout(() => {
    Sfx.crack();
    const px = hit.x - r.x;
    const py = hit.y - r.y;
    const W = r.w;
    const H = r.h + 10;
    const N = 9;
    const TAU = Math.PI * 2;
    const norm = (a) => ((a % TAU) + TAU) % TAU;
    const rim = [];
    for (let i = 0; i < N; i++) {
      const a = ((i + (Math.random() - 0.5) * 0.5) / N) * TAU;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const t = Math.min(dx > 0 ? (W + 6 - px) / dx : dx < 0 ? (-6 - px) / dx : 1e9, dy > 0 ? (H + 6 - py) / dy : dy < 0 ? (-6 - py) / dy : 1e9);
      rim.push([px + dx * t, py + dy * t, a]);
    }
    for (let i = 0; i < N; i++) {
      const p1 = rim[i];
      const p2 = rim[(i + 1) % N];
      const span = norm(p2[2] - p1[2]);
      const pts = [[px, py], [p1[0], p1[1]]];
      [[-6, -6], [W + 6, -6], [W + 6, H + 6], [-6, H + 6]]
        .map((c) => [c[0], c[1], norm(Math.atan2(c[1] - py, c[0] - px) - p1[2])])
        .filter((c) => c[2] < span)
        .sort((a, b) => a[2] - b[2])
        .forEach((c) => pts.push([c[0], c[1]]));
      pts.push([p2[0], p2[1]]);
      const ang = p1[2] + span / 2;
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
    }
    el.style.transition = "none";
    el.style.opacity = "0"; // (not visibility: the pieces borrow this block's clip shapes)
    burst(hit.x, hit.y, "#efe6d2", 16);
  }, IMPACT + 90);

  setTimeout(() => {
    h.remove();
    shadow.remove();
    el.remove();
    fxBusy--;
    done && done();
  }, IMPACT + 90 + 1080);
}


// ---------------------------------------------------------------- Aiming the hammer / vacuum
// While a tool is picked it waits at the bottom centre of the board. Touch anywhere and your
// finger becomes its handle: it follows your finger directly, head a fixed distance above it,
// casting a shadow on the block below. Let go over a block to use it there.
const TOOL = {
  hammer: { cls: "fx-hammer", svg: () => FX_HAMMER_SVG, g: HAM, sh: "fx-rshadow", sw: 46, shh: 39, off: 14, scale: 1.5 },
  vacuum: { cls: "fx-nozzle", svg: () => FX_NOZZLE_SVG, g: VAC, sh: "fx-vshadow", sw: 66, shh: 15, off: 6, scale: 1 },
};
let aim = null;
function boardPoint(e) {
  const r = boardEl.getBoundingClientRect();
  const k = r.width / boardEl.offsetWidth || 1;
  return { x: (e.clientX - r.left) / k - boardEl.clientLeft, y: (e.clientY - r.top) / k - boardEl.clientTop };
}
function toolAimShow(mode) {
  if (aim && (aim.mode !== mode || !aim.el.isConnected)) {
    aim.el.remove();
    aim.sh.remove();
    if (aim.target) aim.target.el.classList.remove("aim-target");
    aim = null;
  }
  if (!mode || !TOOL[mode] || aim) return;
  const t = TOOL[mode];
  aim = { mode, t, el: fxEl(t.cls + " fx-aim", t.svg()), sh: fxEl(t.sh + " fx-aim-sh"), x: 0, y: 0, target: null, down: false };
  aim.el.style.transformOrigin = t.g.hx + "px " + t.g.hy + "px";
  toolAimRest();
}
const hammerAimShow = (on) => toolAimShow(on ? "hammer" : null);
// (x,y) is where the tool's head is
function toolAimPlace(x, y, lifted) {
  const g = aim.t.g;
  aim.x = x;
  aim.y = y;
  aim.el.style.left = x - g.hx + "px";
  aim.el.style.top = y - g.hy + "px";
  aim.el.classList.toggle("resting", !lifted);
  const t = aim.t;
  aim.sh.style.left = x - t.sw + t.off + "px";
  aim.sh.style.top = y - t.shh + t.off * 0.8 + "px";
  aim.sh.style.transform = `scale(${t.scale})`;
  aim.sh.style.opacity = lifted ? (aim.mode === "hammer" ? "0.3" : "0.6") : "0";
  const c = Math.floor((x - PADDING) / STEP);
  const r = Math.floor((y - PADDING) / STEP);
  const b = lifted ? blocks.find((o) => !o.removed && o.cells.some(([rr, cc]) => rr === r && cc === c)) || null : null;
  if (b !== aim.target) {
    if (aim.target) aim.target.el.classList.remove("aim-target");
    if (b) b.el.classList.add("aim-target");
    aim.target = b;
  }
}
function toolAimRest() {
  toolAimPlace(boardEl.clientWidth / 2, boardEl.clientHeight + 30, false);
}
function toolAimFinger(e) {
  const p = boardPoint(e);
  const g = aim.t.g;
  toolAimPlace(p.x + (g.hx - g.gx), p.y + (g.hy - g.gy), true);
}
window.addEventListener(
  "pointerdown",
  (e) => {
    if (!aim || fxBusy || levelOver) return;
    if (e.target.closest && e.target.closest("button, .booster, .modal, .sheet, .topbar")) return;
    e.preventDefault();
    e.stopPropagation();
    aim.down = true;
    toolAimFinger(e);
  },
  true,
);
window.addEventListener(
  "pointermove",
  (e) => {
    if (aim && aim.down) toolAimFinger(e);
  },
  true,
);
const toolAimUp = (e) => {
  if (!aim || !aim.down) return;
  e.stopPropagation();
  aim.down = false;
  const b = aim.target;
  if (!b || e.type === "pointercancel") return toolAimRest();
  window.__toolFrom = { x: aim.x, y: aim.y };
  toolAimShow(null);
  blast(b);
};
window.addEventListener("pointerup", toolAimUp, true);
window.addEventListener("pointercancel", toolAimUp, true);

// ---------------------------------------------------------------- Vacuum
// The floor head sits flat on the board where you aimed, the block trembles and is slurped
// under it, and a lump in its colour rides away down the hose.
function vacuumFX(group, done) {
  fxBusy++;
  const aimed = window.__toolFrom;
  window.__toolFrom = null;
  const hit = aimed || fxSpot(group[0]);
  const shadow = fxEl("fx-vshadow");
  shadow.style.left = hit.x - 60 + "px";
  shadow.style.top = hit.y - 2 + "px";
  const n = fxEl("fx-nozzle", FX_NOZZLE_SVG);
  n.style.left = hit.x - VAC.hx + "px";
  n.style.top = hit.y - VAC.hy + "px";
  n.style.transformOrigin = VAC.hx + "px " + VAC.hy + "px";
  const below = boardEl.clientHeight + 260 - hit.y;
  n.animate(
    [
      { transform: aimed ? "translate(0, -16px) scale(1.06)" : `translate(0, ${below}px)` },
      { transform: "translate(0, 2px) scale(0.98)", offset: 0.7 },
      { transform: "translate(0, 0) scale(1)" },
    ],
    { duration: 300, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
  );
  shadow.animate([{ opacity: 0, transform: "scale(1.3)" }, { opacity: 0.55, transform: "scale(1)" }], { duration: 300, fill: "forwards" });
  setTimeout(() => Sfx.suck(), 180);
  let hum = null;
  setTimeout(() => {
    hum = n.animate(
      [{ transform: "translate(0,0) scale(1)" }, { transform: "translate(-1px,0) scale(1.02, 0.98)" }, { transform: "translate(1px,0) scale(0.98, 1.02)" }, { transform: "translate(0,0) scale(1)" }],
      { duration: 150, iterations: Infinity },
    );
  }, 300);
  // air and dust rushing in under the head
  const swirl = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 55 + Math.random() * 55;
      const sx = hit.x + Math.cos(a) * d;
      const sy = hit.y + Math.sin(a) * d * 0.8;
      const s = document.createElement("div");
      s.className = Math.random() < 0.35 ? "fx-dust" : "fx-air";
      s.style.left = sx + "px";
      s.style.top = sy + "px";
      const ga = Math.atan2(hit.y - sy, hit.x - sx);
      boardEl.appendChild(s);
      s.animate(
        [
          { transform: `rotate(${ga}rad) translateX(0) scaleX(0.4)`, opacity: 0 },
          { transform: `rotate(${ga + 0.3}rad) translateX(${d * 0.55}px) scaleX(1)`, opacity: 0.95, offset: 0.5 },
          { transform: `rotate(${ga + 0.5}rad) translateX(${d}px) scaleX(0.2)`, opacity: 0 },
        ],
        { duration: 380, easing: "ease-in", fill: "forwards" },
      ).onfinish = () => s.remove();
    }
  }, 70);
  const START = 340;
  const EACH = 300;
  const SLURP = 760;
  group.forEach((b, i) => {
    const el = b.el;
    const r = fxRect(b);
    setTimeout(() => {
      el.style.transition = "none";
      el.style.animation = "none";
      boardEl.appendChild(el); // out of the board's clipping, just under the floor head
      el.style.zIndex = "33";
      el.style.transformOrigin = hit.x - r.x + "px " + (hit.y - r.y) + "px";
      el.animate(
        [
          { transform: "translateZ(0) rotate(0) scale(1,1)", opacity: 1, offset: 0 },
          { transform: "translateZ(0) rotate(-2deg) scale(1.02,0.98)", opacity: 1, offset: 0.08 },
          { transform: "translateZ(0) rotate(2deg) scale(0.98,1.02)", opacity: 1, offset: 0.16 },
          { transform: "translateZ(0) rotate(-2deg) scale(1.04,1.04)", opacity: 1, offset: 0.26 },
          { transform: "translateZ(0) rotate(5deg) scale(0.86,1.12)", opacity: 1, offset: 0.48 },
          { transform: "translateZ(0) rotate(-8deg) scale(0.45,0.6)", opacity: 1, offset: 0.74 },
          { transform: "translateZ(0) rotate(14deg) scale(0.04,0.06)", opacity: 0, offset: 1 },
        ],
        { duration: SLURP, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
      );
      setTimeout(() => {
        Sfx.pop();
        el.remove();
        sparkle(hit);
        // a lump in its colour rides off down the hose
        const lump = document.createElement("div");
        lump.className = "fx-hoselump";
        lump.style.background = b.color;
        lump.style.left = hit.x - 13 + "px";
        lump.style.top = hit.y + 110 + "px";
        boardEl.appendChild(lump);
        lump.animate(
          [
            { transform: "translateY(0) scale(0.6, 0.9)", opacity: 0.95 },
            { transform: "translateY(60px) scale(1.15, 1)", opacity: 0.95, offset: 0.3 },
            { transform: `translateY(${below}px) scale(1, 1.2)`, opacity: 0.9 },
          ],
          { duration: 560, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" },
        ).onfinish = () => lump.remove();
      }, SLURP);
    }, START + i * EACH);
  });
  const end = START + (group.length - 1) * EACH + SLURP;
  setTimeout(() => clearInterval(swirl), end - 120);
  setTimeout(() => {
    if (hum) hum.cancel();
    n.animate([{ transform: "translate(0,0)" }, { transform: "translate(0,-14px) scale(1.05)", offset: 0.25 }, { transform: `translate(0, ${below}px)` }], {
      duration: 460,
      easing: "ease-in",
      fill: "forwards",
    });
    shadow.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
  }, end + 420);
  setTimeout(() => {
    n.remove();
    shadow.remove();
    fxBusy--;
    done && done();
  }, end + 900);
}
function sparkle(at) {
  for (let i = 0; i < 4; i++) {
    const s = document.createElement("div");
    s.className = "fx-spark";
    s.style.left = at.x + (Math.random() - 0.5) * 120 + "px";
    s.style.top = at.y - 10 - Math.random() * 50 + "px";
    boardEl.appendChild(s);
    s.animate(
      [{ transform: "scale(0) rotate(0)", opacity: 1 }, { transform: "scale(1.1) rotate(45deg)", opacity: 1, offset: 0.4 }, { transform: "scale(0) rotate(90deg)", opacity: 0 }],
      { duration: 560, delay: i * 70, easing: "ease-out", fill: "both" },
    ).onfinish = () => s.remove();
  }
}

// ---------------------------------------------------------------- Freeze
const FX_ICEWAND_SVG = `<svg viewBox="0 0 120 440" width="120" height="440" style="overflow:visible" aria-hidden="true">
  <defs>
    <linearGradient id="fi-stick" x1="0" x2="1"><stop offset="0" stop-color="#8fd8ff"/><stop offset="0.45" stop-color="#ffffff"/><stop offset="1" stop-color="#5cbfee"/></linearGradient>
    <radialGradient id="fi-gem" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#9fe6ff"/><stop offset="1" stop-color="#2fa8e6"/></radialGradient>
  </defs>
  <rect x="53" y="60" width="14" height="190" rx="7" fill="url(#fi-stick)" stroke="#3592c4" stroke-width="2"/>
  <path d="M55 90l10-8M55 120l10-8M55 150l10-8M55 180l10-8" stroke="#3592c4" stroke-width="2" opacity="0.5"/>
  <circle cx="60" cy="44" r="34" fill="url(#fi-gem)" stroke="#2a8ac0" stroke-width="2.5"/>
  <g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M60 22v44M41 33l38 22M41 55l38-22"/></g>
  <g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M53 25l7 6 7-6M53 63l7-6 7 6M39 40l9 1-3 8M81 48l-9-1 3-8M39 48l9-1-3-8M81 40l-9 1 3 8"/></g>
  <ellipse cx="47" cy="30" rx="7" ry="4" transform="rotate(-30 47 30)" fill="#fff" opacity="0.8"/>
</svg>`;
const FX_FLAKE = `<svg viewBox="-10 -10 20 20" width="100%" height="100%"><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M0-9V9M-7.8-4.5 7.8 4.5M-7.8 4.5 7.8-4.5M-2.5-7 0-4.5 2.5-7M-2.5 7 0 4.5 2.5 7"/></g></svg>`;
function freezeFX(ms) {
  const W = boardEl.clientWidth;
  const H = boardEl.clientHeight;
  const tip = { x: W / 2, y: H * 0.55 };
  const w = fxEl("fx-icewand", FX_ICEWAND_SVG);
  w.style.left = tip.x - 60 + "px";
  w.style.top = tip.y - 44 + "px";
  w.animate(
    [
      { transform: "translateY(380px) rotate(0)", opacity: 0 },
      { transform: "translateY(-12px) rotate(0)", opacity: 1, offset: 0.25 },
      { transform: "translateY(0) rotate(0)", opacity: 1, offset: 0.38 },
      { transform: "translateY(0) rotate(0)", opacity: 1, offset: 0.5 },
      { transform: "translateY(-6px) rotate(0) scale(1.06)", opacity: 1, offset: 0.6 },
      { transform: "translateY(0) rotate(0) scale(1)", opacity: 1, offset: 0.75 },
      { transform: "translateY(380px) rotate(0)", opacity: 0 },
    ],
    { duration: 1700, easing: "ease-in-out", fill: "forwards" },
  );
  setTimeout(() => w.remove(), 1750);
  // the gem flashes and a blast of snowflakes covers the board
  setTimeout(() => {
    Sfx.freeze && Sfx.freeze();
    const flash = document.createElement("div");
    flash.className = "fx-flash fx-iceflash";
    flash.style.left = tip.x - 36 + "px";
    flash.style.top = tip.y - 36 + "px";
    boardEl.appendChild(flash);
    setTimeout(() => flash.remove(), 420);
    for (let i = 0; i < 34; i++) {
      const f = document.createElement("div");
      f.className = "fx-flake";
      f.innerHTML = FX_FLAKE;
      const size = 10 + Math.random() * 16;
      f.style.width = f.style.height = size + "px";
      f.style.left = tip.x - size / 2 + "px";
      f.style.top = tip.y - size / 2 + "px";
      boardEl.appendChild(f);
      const tx = Math.random() * W - tip.x;
      const ty = Math.random() * H - tip.y;
      f.animate(
        [
          { transform: "translate(0,0) rotate(0) scale(0.3)", opacity: 1 },
          { transform: `translate(${tx * 0.8}px,${ty * 0.8}px) rotate(${180 + Math.random() * 180}deg) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${tx}px,${ty + 30}px) rotate(${360 + Math.random() * 180}deg) scale(0.8)`, opacity: 0 },
        ],
        { duration: 1100 + Math.random() * 500, delay: Math.random() * 120, easing: "cubic-bezier(.2,.7,.4,1)", fill: "both" },
      ).onfinish = () => f.remove();
    }
    // frost creeps in from the edges and stays while the clock is frozen
    boardEl.querySelectorAll(".fx-frost").forEach((e) => e.remove());
    const frost = document.createElement("div");
    frost.className = "fx-frost";
    frost.innerHTML = ["tl", "tr", "bl", "br"].map((c) => `<i class="ff-${c}">${FX_FLAKE}</i>`).join("");
    boardEl.appendChild(frost);
    frost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
    const life = Math.max(1000, ms - 700);
    setTimeout(() => {
      frost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = () => frost.remove();
    }, life);
  }, 1000);
}
