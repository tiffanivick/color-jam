// FX: power-up animations you can see.
//  Hammer — a cute toy hammer rises from the bottom of the screen, rears back toward you,
//           slams down, and the block cracks and breaks into real pieces of itself.
//  Vacuum — a canister vacuum rolls in at the bottom, you hold the wand, the block is slurped
//           into the floor head and rides down the hose into the canister's window.
//  Freeze — you wave an ice wand; snowflakes burst out and frost covers the board.
// Uses boardEl, PADDING, CELL, STEP and burst() from engine.js.


// a white cartoon glove holding a handle (fist centred on cx, top at `top`), with a sleeve
// running down off the bottom of the screen — so it feels like it's your hand
function fxGlove(cx, top, id, lean = 0, sleeve = "#5b7cff") {
  return `<defs>
    <linearGradient id="fxg-${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.18"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></linearGradient>
    <linearGradient id="fxw-${id}" x1="0" x2="1"><stop offset="0" stop-color="#dfe0ee"/><stop offset="0.42" stop-color="#ffffff"/><stop offset="1" stop-color="#c6c8dc"/></linearGradient>
  </defs>
  <g transform="rotate(${lean} ${cx} ${top + 22})">
    <rect x="${cx - 21}" y="${top + 44}" width="42" height="240" rx="14" fill="${sleeve}"/>
    <rect x="${cx - 21}" y="${top + 44}" width="42" height="240" rx="14" fill="url(#fxg-${id})" stroke="rgba(10,10,60,0.35)" stroke-width="2"/>
    <rect x="${cx - 25}" y="${top + 35}" width="50" height="18" rx="8" fill="url(#fxw-${id})" stroke="#a3a5c0" stroke-width="2"/>
    <path d="M${cx - 16} ${top + 39}v10M${cx - 6} ${top + 39}v10M${cx + 4} ${top + 39}v10M${cx + 14} ${top + 39}v10" stroke="#c3c5da" stroke-width="2"/>
  </g>
  <rect x="${cx - 27}" y="${top}" width="54" height="42" rx="18" fill="url(#fxw-${id})" stroke="#a3a5c0" stroke-width="2.5"/>
  <path d="M${cx - 19} ${top + 15}h38M${cx - 21} ${top + 25}h42M${cx - 18} ${top + 34}h36" stroke="#c3c5da" stroke-width="2" stroke-linecap="round"/>
  <path d="M${cx - 26} ${top + 13}c2-13 19-15 31-9 6 3 5 10-1 11-9 1-19 0-25 5Z" fill="url(#fxw-${id})" stroke="#a3a5c0" stroke-width="2.2" stroke-linejoin="round"/>
  <ellipse cx="${cx - 12}" cy="${top + 7}" rx="7" ry="2.4" fill="#fff"/>`;
}

const FX_HAMMER_SVG = `<svg viewBox="0 0 140 430" width="140" height="430" style="overflow:visible" aria-hidden="true">
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
  ${fxGlove(70, 166, 'h', 4)}
</svg>`;

// the canister (130x120, hose collar at 65,6)
const FX_CAN_SVG = `
  <ellipse cx="65" cy="117" rx="58" ry="7" fill="#0a0628" opacity="0.3"/>
  <path d="M14 102C6 60 22 13 65 11c43 2 59 49 51 91q0 10-10 10H24q-10 0-10-10Z" fill="url(#vc-body)" stroke="#123f9e" stroke-width="2.5"/>
  <path d="M26 92C20 60 32 26 60 20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.32"/>
  <ellipse cx="40" cy="36" rx="7" ry="12" transform="rotate(30 40 36)" fill="#fff" opacity="0.45"/>
  <rect x="53" y="1" width="24" height="16" rx="5" fill="url(#vc-metal)" stroke="#5d6676" stroke-width="2"/>
  <circle cx="45" cy="50" r="7.5" fill="#ff4d6a" stroke="#b3203c" stroke-width="1.5"/><circle cx="43" cy="48" r="2.4" fill="#fff" opacity="0.7"/>
  <circle cx="75" cy="50" r="7.5" fill="#ffb21f" stroke="#b97808" stroke-width="1.5"/><circle cx="73" cy="48" r="2.4" fill="#fff" opacity="0.7"/>
  <rect x="31" y="64" width="54" height="34" rx="7" fill="url(#vc-glass)" stroke="#123f9e" stroke-width="2.2"/>
  <g class="vc-bits" clip-path="url(#vc-win)"></g>
  <rect x="35" y="68" width="16" height="4" rx="2" fill="#fff" opacity="0.8"/>
  <circle cx="24" cy="106" r="11" fill="#22252d" stroke="#000" stroke-width="1.5"/><circle cx="24" cy="106" r="4" fill="#8b93a3"/>
  <circle cx="104" cy="106" r="11" fill="#22252d" stroke="#000" stroke-width="1.5"/><circle cx="104" cy="106" r="4" fill="#8b93a3"/>`;
// the floor head sits at 0,0 with the metal wand running down to the handle you hold (hose at 0,182)
const FX_WAND_SVG = (lean) => `
  <rect x="-5" y="8" width="10" height="128" rx="4" fill="url(#vc-metal)" stroke="#5d6676" stroke-width="1.5"/>
  <rect x="-10" y="128" width="20" height="56" rx="8" fill="#353b48" stroke="#1d2129" stroke-width="2"/>
  ${fxGlove(0, 134, "v", lean)}
  <rect x="-48" y="-14" width="96" height="27" rx="11" fill="#2a2e37" stroke="#101217" stroke-width="2"/>
  <rect x="-43" y="-11" width="86" height="10" rx="5" fill="#4b525f"/>
  <rect x="-36" y="3" width="72" height="5" rx="2.5" fill="#07080b"/>
  <circle cx="38" cy="-6" r="2" fill="#7fd3ff"/>
  <rect x="-9" y="9" width="18" height="11" rx="3" fill="url(#vc-metal)" stroke="#5d6676" stroke-width="1.5"/>`;
const FX_VAC_DEFS = `<defs>
  <linearGradient id="vc-body" x1="0" x2="1"><stop offset="0" stop-color="#1e5fd8"/><stop offset="0.38" stop-color="#4fa2ff"/><stop offset="1" stop-color="#1747b0"/></linearGradient>
  <linearGradient id="vc-metal" x1="0" x2="1"><stop offset="0" stop-color="#8f98a8"/><stop offset="0.45" stop-color="#f4f6fa"/><stop offset="1" stop-color="#7d8696"/></linearGradient>
  <linearGradient id="vc-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f6ff"/><stop offset="1" stop-color="#93cdf7"/></linearGradient>
  <clipPath id="vc-win"><rect x="31" y="64" width="54" height="34" rx="7"/></clipPath>
</defs>`;

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
  // the hammer's shadow on the board: small and dark when the head touches, wide and faint when raised
  const shadow = fxEl("fx-hshadow");
  shadow.style.left = hit.x - 46 + "px";
  shadow.style.top = hit.y - 14 + "px";
  // head centre (70,47) of the 140x230 hammer sits on the hit point; the handle runs down toward you
  const h = fxEl("fx-hammer", FX_HAMMER_SVG);
  h.style.left = hit.x - 70 + "px";
  h.style.top = hit.y - 47 + "px";
  const D = 1600;
  const HITS = [520, 820, 1110];
  const P = {
    start: "perspective(700px) translateY(360px) rotateX(-40deg) scale(0.9)",
    up: "perspective(700px) translateY(-30px) rotateX(-30deg) scale(1.1)",
    hit: "perspective(700px) translateY(0) rotateX(6deg) scale(0.86)",
    bounce: "perspective(700px) translateY(-10px) rotateX(-10deg) scale(0.92)",
    gone: "perspective(700px) translateY(340px) rotateX(-40deg) scale(0.88)",
  };
  const down = "cubic-bezier(.7,0,1,.55)";
  const upE = "cubic-bezier(.2,.7,.4,1)";
  const k = (t, pose, op, e) => ({ transform: P[pose], opacity: op, offset: t / D, easing: e });
  h.animate(
    [
      k(0, "start", 0, "cubic-bezier(.2,.8,.3,1)"),
      k(340, "up", 1, down),
      k(HITS[0], "hit", 1, upE),
      k(680, "up", 1, down),
      k(HITS[1], "hit", 1, upE),
      k(960, "up", 1, down),
      k(HITS[2], "hit", 1, upE),
      k(1230, "bounce", 1, "ease-in"),
      k(D, "gone", 0, "linear"),
    ],
    { duration: D, easing: "linear", fill: "forwards" },
  );
  const sk = (t, s, o) => ({ transform: `scale(${s})`, opacity: o, offset: t / D });
  shadow.animate(
    [sk(0, 1.5, 0), sk(340, 1.25, 0.16), sk(HITS[0], 0.75, 0.45), sk(680, 1.25, 0.16), sk(HITS[1], 0.75, 0.45), sk(960, 1.25, 0.16), sk(HITS[2], 0.75, 0.45), sk(1230, 0.9, 0.3), sk(D, 1.5, 0)],
    { duration: D, easing: "linear", fill: "forwards" },
  );

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

// ---------------------------------------------------------------- Vacuum
// The canister rolls up at the bottom of the board, you hold the wand, and the floor head
// hovers by the block. Driven by one clock so the hose always stays attached.
function vacuumFX(group, done) {
  fxBusy++;
  const K = window.__FXK || 1;
  const W = boardEl.clientWidth;
  const H = boardEl.clientHeight;
  const spot = fxSpot(group[0]);
  const head = { x: spot.x, y: spot.y + 32 };
  const canLeft = head.x > W / 2;
  const can = { x: canLeft ? -6 : W - 138, y: H - 78 };
  const toCan = canLeft ? -1 : 1;
  const ang = canLeft ? -12 : 12; // the wand leans away from the canister, toward your hand
  const wrap = fxEl("fx-vac");
  wrap.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible;position:absolute;left:0;top:0">${FX_VAC_DEFS}
    <g class="root">
      <path class="h1" fill="none" stroke="#7d8798" stroke-width="17" stroke-linecap="round"/>
      <path class="h2" fill="none" stroke="#e6ebf2" stroke-width="12" stroke-linecap="round"/>
      <path class="h3" fill="none" stroke="#c4ccd8" stroke-width="12" stroke-dasharray="2.5 6"/>
      <path class="h4" fill="none" stroke="#fff" stroke-width="3" opacity="0.7" transform="translate(-3 -2)"/>
      <g class="lumps"></g>
      <g class="can">${FX_CAN_SVG}</g>
      <g class="wand">${FX_WAND_SVG(canLeft ? -18 : 18)}</g>
    </g></svg>`;
  const q = (c) => wrap.querySelector(c);
  const root = q(".root");
  const hoses = [".h1", ".h2", ".h3", ".h4"].map(q);
  const canG = q(".can");
  const wand = q(".wand");
  const lumpsG = q(".lumps");
  const bits = q(".vc-bits");
  const NS = "http://www.w3.org/2000/svg";

  const START = 480;
  const EACH = 300;
  const SLURP = 780;
  const RUN = 520; // a sucked-up block's trip down the hose
  const n = group.length;
  const OUT = START + (n - 1) * EACH + SLURP + RUN + 280;
  const END = OUT + 420;
  const slurped = [];
  const lumps = [];
  let bump = -1e9;
  let lastPuff = -1;
  let t0 = performance.now();

  function layout(t) {
    const dy = t < 420 ? 330 * Math.pow(1 - t / 420, 3) : t > OUT ? 340 * Math.pow(Math.min(1, (t - OUT) / 420), 2) : 0;
    const working = t > START - 80 && t < OUT;
    const wob = working ? Math.sin(t / 37) * 1.6 : 0;
    root.setAttribute("transform", `translate(0 ${dy})`);
    wand.setAttribute("transform", `translate(${head.x + (working ? Math.sin(t / 53) * 1.2 : 0)} ${head.y}) rotate(${ang + wob})`);
    const b = Math.max(0, 1 - (t - bump) / 260);
    const sq = Math.sin(b * Math.PI) * 0.09;
    canG.setAttribute("transform", `translate(${can.x} ${can.y}) translate(65 112) scale(1.15) scale(${1 + sq} ${1 - sq + (working ? Math.sin(t / 45) * 0.012 : 0)}) translate(-65 -112)`);
    const a = ((ang + wob) * Math.PI) / 180;
    // the hose leaves the back of the handle, arches up and over, and drops into the canister
    const p = { x: head.x - Math.sin(a) * 136, y: head.y + Math.cos(a) * 136 };
    const c = { x: can.x + 65, y: can.y + 112 - 1.15 * 106 };
    const top = Math.min(p.y, c.y) - 110;
    const d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}C${(p.x + toCan * 30).toFixed(1)} ${top.toFixed(1)} ${c.x.toFixed(1)} ${(top - 20).toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    hoses.forEach((h) => h.setAttribute("d", d));
  }

  function puff() {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * (0.05 + Math.random() * 0.9);
      const dd = 50 + Math.random() * 60;
      const sx = head.x + Math.cos(a) * dd;
      const sy = head.y + Math.sin(a) * dd;
      const s = document.createElement("div");
      s.className = Math.random() < 0.35 ? "fx-dust" : "fx-air";
      s.style.left = sx + "px";
      s.style.top = sy + "px";
      const ga = Math.atan2(head.y - sy, head.x - sx);
      boardEl.appendChild(s);
      s.animate(
        [
          { transform: `rotate(${ga}rad) translateX(0) scaleX(0.4)`, opacity: 0 },
          { transform: `rotate(${ga + 0.3}rad) translateX(${dd * 0.55}px) scaleX(1)`, opacity: 0.95, offset: 0.5 },
          { transform: `rotate(${ga + 0.5}rad) translateX(${dd}px) scaleX(0.2)`, opacity: 0 },
        ],
        { duration: 380, easing: "ease-in", fill: "forwards" },
      ).onfinish = () => s.remove();
    }
  }

  function sparkle() {
    for (let i = 0; i < 4; i++) {
      const s = document.createElement("div");
      s.className = "fx-spark";
      s.style.left = head.x + (Math.random() - 0.5) * 110 + "px";
      s.style.top = head.y - 10 - Math.random() * 50 + "px";
      boardEl.appendChild(s);
      s.animate(
        [{ transform: "scale(0) rotate(0)", opacity: 1 }, { transform: "scale(1.1) rotate(45deg)", opacity: 1, offset: 0.4 }, { transform: "scale(0) rotate(90deg)", opacity: 0 }],
        { duration: 560, delay: i * 70, easing: "ease-out", fill: "both" },
      ).onfinish = () => s.remove();
    }
  }

  function startSlurp(i) {
    const b = group[i];
    const el = b.el;
    const r = fxRect(b);
    el.style.transition = "none";
    el.style.animation = "none";
    boardEl.appendChild(el); // out of the board's clipping, just under the floor head
    el.style.zIndex = "33";
    el.style.transformOrigin = head.x - r.x + "px " + (head.y - r.y) + "px";
    el.animate(
      [
        { transform: "translateZ(0) rotate(0) scale(1,1)", opacity: 1, offset: 0 },
        { transform: "translateZ(0) rotate(-2deg) scale(1.02,0.98)", opacity: 1, offset: 0.08 },
        { transform: "translateZ(0) rotate(2deg) scale(0.98,1.02)", opacity: 1, offset: 0.16 },
        { transform: "translateZ(0) rotate(-2deg) scale(1.04,1.04)", opacity: 1, offset: 0.26 },
        { transform: "translateZ(0) rotate(5deg) scale(0.86,1.16)", opacity: 1, offset: 0.48 },
        { transform: "translateZ(0) rotate(-8deg) scale(0.45,0.8)", opacity: 1, offset: 0.74 },
        { transform: "translateZ(0) rotate(14deg) scale(0.04,0.1)", opacity: 0, offset: 1 },
      ],
      { duration: SLURP, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
    );
  }

  function arrive(b, i) {
    for (let k = 0; k < 3; k++) {
      const c = document.createElementNS(NS, "rect");
      const w = 12 + Math.random() * 7;
      c.setAttribute("x", 34 + Math.random() * 36);
      c.setAttribute("y", 86 - i * 6 - Math.random() * 8);
      c.setAttribute("width", w);
      c.setAttribute("height", w * 0.8);
      c.setAttribute("rx", 3);
      c.setAttribute("fill", b.color);
      c.setAttribute("stroke", "rgba(0,0,0,0.25)");
      c.setAttribute("transform", `rotate(${(Math.random() - 0.5) * 50} 58 82)`);
      c.style.animation = "fx-bit-in 0.3s ease-out";
      bits.appendChild(c);
    }
  }

  layout(0);
  setTimeout(() => Sfx.suck(), 260);
  function frame(now) {
    const t = (now - t0) / K;
    layout(t);
    if (t > START - 100 && t < OUT - RUN) {
      const pf = Math.floor(t / 70);
      if (pf !== lastPuff) {
        lastPuff = pf;
        puff();
      }
    }
    for (let i = 0; i < n; i++) {
      const at = START + i * EACH;
      if (!slurped[i] && t >= at) {
        slurped[i] = 1;
        startSlurp(i);
      }
      if (slurped[i] === 1 && t >= at + SLURP) {
        slurped[i] = 2;
        Sfx.pop();
        group[i].el.remove();
        sparkle();
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("r", "10");
        c.setAttribute("fill", group[i].color);
        c.setAttribute("stroke", "rgba(0,0,0,0.3)");
        c.setAttribute("stroke-width", "2");
        lumpsG.appendChild(c);
        lumps.push({ c, at: at + SLURP, i, done: false });
      }
    }
    const path = hoses[0];
    const len = path.getTotalLength();
    lumps.forEach((L) => {
      if (L.done) return;
      const u = Math.min(1, (t - L.at) / RUN);
      const pt = path.getPointAtLength(len * (u * u * (3 - 2 * u)));
      L.c.setAttribute("cx", pt.x);
      L.c.setAttribute("cy", pt.y);
      L.c.setAttribute("r", String(10 + Math.sin(u * Math.PI) * 2));
      if (u >= 1) {
        L.done = true;
        L.c.remove();
        bump = t;
        Sfx.tap();
        arrive(group[L.i], L.i);
      }
    });
    if (t < END) return requestAnimationFrame(frame);
    wrap.remove();
    fxBusy--;
    done && done();
  }
  requestAnimationFrame(frame);
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
  ${fxGlove(60, 200, "f", 0, "#3fb6e8")}
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
      { transform: "translateY(-12px) rotate(-6deg)", opacity: 1, offset: 0.25 },
      { transform: "translateY(0) rotate(16deg)", opacity: 1, offset: 0.38 },
      { transform: "translateY(0) rotate(-14deg)", opacity: 1, offset: 0.5 },
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
