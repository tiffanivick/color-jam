// FX: power-up animations you can see.
//  Hammer — a chunky 3D wooden mallet on your finger: aim it, let go, it swings down onto the
//           block three times and the block breaks into real pieces of itself.
//  Vacuum — the 3D floor head on your finger: aim it, let go, it settles on the board, the
//           block is slurped under it and rides away down the hose.
//  Freeze — you wave an ice wand; snowflakes burst out and frost covers the board.
// Uses boardEl, PADDING, CELL, STEP and burst() from engine.js.


// The hammer and vacuum are pre-rendered 3D sprites (tools/r3d: render.html draws them,
// export.html writes img/*.webp and these numbers). One board square = 54 px, seen from a high
// angle. Each tool is placed by its strike point — the spot on the board it lands on — which
// sits at (hx, hy) inside each image. gx, gy is where your finger goes, measured from the
// strike point at hover size: straight below it, so your finger never hides the head.
// Hammer poses run from raised (0) to its face flat on the block (6); the handle runs off to
// the lower right and off the screen.
const HAM3D = {
  frames: [
    { w: 756, h: 854, hx: 36, hy: 151 },
    { w: 763, h: 709, hx: 43, hy: 147 },
    { w: 767, h: 590, hx: 47, hy: 141 },
    { w: 770, h: 494, hx: 50, hy: 134 },
    { w: 771, h: 404, hx: 51, hy: 125 },
    { w: 770, h: 321, hx: 50, hy: 116 },
    { w: 767, h: 238, hx: 47, hy: 106 },
  ],
  src: (i) => `img/hammer-${i}.webp`,
  gx: 0,
  gy: 76,
};
// Vacuum: the floor head tilted forward so its top and suction mouth both show; the mouth is
// at the strike point and the ribbed hose runs straight down off the screen.
const VAC3D = {
  frames: [{ w: 148, h: 1165, hx: 74, hy: 57 }],
  src: () => "img/vacuum.webp",
  gx: 0,
  gy: 99,
};
const HOVER = 1.2; // size while floating over the board (1 = touching it)
// load every image now so nothing pops in the first time a tool is used
[HAM3D, VAC3D].forEach((t) => t.frames.forEach((f, i) => (new Image().src = t.src(i))));

// a tool sprite: a zero-size box at the strike point (left/top) holding one image per pose;
// el.show(i) swaps the pose. Scaling it scales about the strike point, so it never drifts off
// the aimed square.
function fxSprite(cls, t) {
  const d = fxEl(cls + " fx-sprite");
  d.innerHTML = t.frames
    .map((f, i) => `<img src="${t.src(i)}" alt="" draggable="false" style="left:${-f.hx}px;top:${-f.hy}px;width:${f.w}px;height:${f.h}px${i ? ";visibility:hidden" : ""}">`)
    .join("");
  let cur = 0;
  d.show = (i) => {
    if (i === cur) return;
    d.children[cur].style.visibility = "hidden";
    d.children[i].style.visibility = "";
    cur = i;
  };
  return d;
}
// a requestAnimationFrame timeline: step(ms) every frame for D ms, and each [ms, fn] event
// once its time comes. window.__FXK slows it down for frame-by-frame captures.
function fxRun(D, step, events) {
  const k = window.__FXK || 1;
  const t0 = performance.now();
  events.sort((a, b) => a[0] - b[0]);
  let next = 0;
  let queued = false;
  const tick = () => {
    queued = false;
    if (next > events.length) return;
    const ms = Math.min(D, (performance.now() - t0) / k);
    step(ms);
    while (next < events.length && events[next][0] <= ms) events[next++][1]();
    if (ms >= D) {
      next = events.length + 1;
      clearInterval(guard);
    } else if (!queued) {
      queued = true;
      requestAnimationFrame(tick);
    }
  };
  // the browser stops sending animation frames when the page isn't drawn (app switched away);
  // keep the timeline going anyway so the block is still removed and the win check still runs
  const guard = setInterval(tick, 100);
  queued = true;
  requestAnimationFrame(tick);
}

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
  // its shadow on the board: wide and faint while raised, tight and dark when the face lands
  const shadow = fxEl("fx-rshadow");
  shadow.style.left = hit.x - 46 + "px";
  shadow.style.top = hit.y - 39 + "px";
  const h = fxSprite("fx-hammer", HAM3D);
  h.style.left = hit.x + "px";
  h.style.top = hit.y + "px";
  // each strike swings the head down about the handle (raised pose -> face flat on the block)
  // while it shrinks from hover size to 1, squashes on contact, then swings back up
  const LAST = HAM3D.frames.length - 1;
  const HITS = [300, 600, 900];
  const BREAK = HITS[2] + 90;
  const END = BREAK + 1080;
  const easeIn = (p) => p * p;
  const easeOut = (p) => 1 - (1 - p) * (1 - p);
  const clamp01 = (p) => Math.max(0, Math.min(1, p));
  // u: 0 = raised, 1 = face on the block
  function pose(ms) {
    let u = 0;
    let sq = 0; // squash, 1 right at contact
    let o = aimed ? 1 : clamp01(ms / 140);
    HITS.forEach((t, i) => {
      if (ms >= t - 110 && ms < t) u = easeIn((ms - t + 110) / 110);
      else if (ms >= t && ms < t + 40) (u = 1), (sq = 1 - (ms - t) / 40);
      else if (i < 2 && ms >= t + 40 && ms < t + 150) u = 1 - easeOut((ms - t - 40) / 110);
      else if (i === 2 && ms >= t + 40) {
        // after the last blow: rest on the pieces, lift away and fade
        u = 1 - easeOut(clamp01((ms - 1060) / 190));
        o = 1 - clamp01((ms - 1250) / 150);
      }
    });
    const s = HOVER - (HOVER - 1) * u;
    h.show(Math.round(u * LAST));
    h.style.transform = `scale(${s * (1 + 0.07 * sq)}, ${s * (1 - 0.07 * sq)})`;
    h.style.opacity = o;
    shadow.style.transform = `scale(${1.35 - 0.45 * u})`;
    shadow.style.opacity = (0.25 + 0.3 * u) * o;
  }
  pose(0);

  const crack = document.createElement("div");
  crack.className = "fx-crack";
  crack.style.left = hit.x - r.x - 55 + "px";
  crack.style.top = hit.y - r.y - 55 + "px";
  crack.style.opacity = "0";
  el.appendChild(crack);
  // each blow: squash, a jolt, sparks, and the cracks grow
  const impact = (n) => {
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
  };

  // the last blow breaks it into wedges along the cracks, which tumble away and fall
  const breakUp = () => {
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
  };

  fxRun(END, pose, [
    ...HITS.map((t, n) => [t, () => impact(n)]),
    [BREAK, breakUp],
    [
      END,
      () => {
        h.remove();
        shadow.remove();
        el.remove();
        fxBusy--;
        done && done();
      },
    ],
  ]);
}


// ---------------------------------------------------------------- Aiming the hammer / vacuum
// While a tool is picked it waits at the bottom centre of the board. Touch anywhere and it
// jumps to your finger and follows it directly, hovering a fixed distance above it and casting
// a shadow on the block it will land on. Let go over a block to use it there.
const TOOL = {
  hammer: { cls: "fx-hammer", g: HAM3D, sh: "fx-rshadow", sw: 46, shh: 39, scale: 1.35, o: 0.3 },
  vacuum: { cls: "fx-nozzle", g: VAC3D, sh: "fx-vshadow", sw: 66, shh: 15, scale: 1.15, o: 0.6 },
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
  aim = { mode, t, el: fxSprite(t.cls + " fx-aim", t.g), sh: fxEl(t.sh + " fx-aim-sh"), x: 0, y: 0, target: null, down: false };
  toolAimRest();
}
const hammerAimShow = (on) => toolAimShow(on ? "hammer" : null);
// (x,y) is the tool's strike point: the spot on the board it will land on
function toolAimPlace(x, y, lifted) {
  aim.x = x;
  aim.y = y;
  aim.el.style.left = x + "px";
  aim.el.style.top = y + "px";
  aim.el.classList.toggle("resting", !lifted);
  const t = aim.t;
  aim.sh.style.left = x - t.sw + "px";
  aim.sh.style.top = y - t.shh + "px";
  aim.sh.style.transform = `scale(${t.scale})`;
  aim.sh.style.opacity = lifted ? t.o : "0";
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
  toolAimPlace(p.x - g.gx * HOVER, p.y - g.gy * HOVER, true);
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
// The floor head lowers from hover size onto the board where you aimed (still tilted forward,
// mouth toward the block), the block trembles and is slurped under it, and a lump in its colour
// rides away down the hose.
function vacuumFX(group, done) {
  fxBusy++;
  const aimed = window.__toolFrom;
  window.__toolFrom = null;
  const hit = aimed || fxSpot(group[0]);
  const shadow = fxEl("fx-vshadow");
  shadow.style.left = hit.x - 66 + "px";
  shadow.style.top = hit.y - 15 + "px";
  const n = fxSprite("fx-nozzle", VAC3D);
  n.style.left = hit.x + "px";
  n.style.top = hit.y + "px";
  const below = boardEl.clientHeight + 260 - hit.y;
  n.animate(
    [
      { transform: aimed ? `scale(${HOVER})` : `translate(0, ${below}px)` },
      { transform: "translate(0, 2px) scale(0.98)", offset: 0.7 },
      { transform: "translate(0, 0) scale(1)" },
    ],
    { duration: 300, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
  );
  shadow.animate([{ opacity: aimed ? 0.6 : 0, transform: "scale(1.15)" }, { opacity: 0.7, transform: "scale(0.95)" }], { duration: 300, fill: "forwards" });
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
        lump.style.top = hit.y + 24 + "px";
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
    shadow.animate([{ opacity: 0.7 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
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
