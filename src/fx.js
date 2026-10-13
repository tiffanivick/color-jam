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

const FX_VACUUM_SVG = `<svg viewBox="0 0 160 340" width="160" height="340" aria-hidden="true">
  <defs>
    <linearGradient id="fxv-body" x1="0" x2="1"><stop offset="0" stop-color="#8a6cf0"/><stop offset="0.42" stop-color="#c6b4ff"/><stop offset="1" stop-color="#7457e0"/></linearGradient>
    <linearGradient id="fxv-nose" x1="0" x2="1"><stop offset="0" stop-color="#ff7fb0"/><stop offset="0.45" stop-color="#ffc2da"/><stop offset="1" stop-color="#f0609a"/></linearGradient>
    <linearGradient id="fxv-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f7ff" stop-opacity="0.95"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0.85"/></linearGradient>
    <linearGradient id="fxv-handle" x1="0" x2="1"><stop offset="0" stop-color="#5b44c0"/><stop offset="0.45" stop-color="#9b84ff"/><stop offset="1" stop-color="#4b36a8"/></linearGradient>
    <clipPath id="fxv-win"><rect x="44" y="148" width="72" height="56" rx="14"/></clipPath>
  </defs>
  <!-- handle running off the bottom of the screen -->
  <rect x="62" y="232" width="36" height="108" rx="16" fill="url(#fxv-handle)" stroke="#3a2690" stroke-width="2.5"/>
  <rect x="70" y="240" width="7" height="90" rx="3.5" fill="#fff" opacity="0.4"/>
  <!-- round body -->
  <rect x="22" y="78" width="116" height="160" rx="46" fill="url(#fxv-body)" stroke="#4b36a8" stroke-width="3"/>
  <ellipse cx="58" cy="100" rx="22" ry="9" fill="#fff" opacity="0.45"/>
  <!-- see-through canister: collected blocks show up in here -->
  <rect x="44" y="148" width="72" height="56" rx="14" fill="url(#fxv-glass)" stroke="#4b36a8" stroke-width="2.5"/>
  <g class="vac-bits" clip-path="url(#fxv-win)"></g>
  <rect x="50" y="153" width="20" height="5" rx="2.5" fill="#fff" opacity="0.8"/>
  <!-- happy face -->
  <ellipse cx="62" cy="122" rx="6" ry="7.5" fill="#2a1a5e"/><ellipse cx="98" cy="122" rx="6" ry="7.5" fill="#2a1a5e"/>
  <circle cx="64" cy="119" r="2.2" fill="#fff"/><circle cx="100" cy="119" r="2.2" fill="#fff"/>
  <path d="M71 133q9 8 18 0" fill="none" stroke="#2a1a5e" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="134" rx="7" ry="4" fill="#ff8fc0" opacity="0.7"/><ellipse cx="110" cy="134" rx="7" ry="4" fill="#ff8fc0" opacity="0.7"/>
  <!-- nozzle: a soft pink funnel with the opening facing up at the block -->
  <path d="M56 82 46 40h68l-10 42Z" fill="url(#fxv-nose)" stroke="#c43c78" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="62" y="48" width="7" height="28" rx="3.5" fill="#fff" opacity="0.5"/>
  <ellipse cx="80" cy="34" rx="50" ry="17" fill="url(#fxv-nose)" stroke="#c43c78" stroke-width="2.5"/>
  <ellipse cx="80" cy="34" rx="38" ry="11" fill="#2a1030"/>
  <ellipse cx="80" cy="36" rx="28" ry="7" fill="#000" opacity="0.6"/>
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
function vacuumFX(group, done) {
  fxBusy++;
  const spot = fxSpot(group[0]);
  // the opening (80,34) of the 160x340 vacuum sits just below the tapped square; the body and
  // handle run down toward you and off the bottom of the board
  const mouth = { x: spot.x, y: spot.y + 30 };
  const n = fxEl("fx-vacuum", FX_VACUUM_SVG);
  n.style.left = mouth.x - 80 + "px";
  n.style.top = mouth.y - 34 + "px";
  n.style.transformOrigin = "80px 34px";
  n.animate(
    [
      { transform: "perspective(700px) translateY(380px) rotateX(-25deg) rotate(6deg)", opacity: 0 },
      { transform: "perspective(700px) translateY(-6px) rotateX(-12deg) rotate(-2deg)", opacity: 1, offset: 0.75 },
      { transform: "perspective(700px) translateY(0) rotateX(-10deg) rotate(0)", opacity: 1 },
    ],
    { duration: 380, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
  );
  setTimeout(() => Sfx.suck(), 200);
  // air and dust rushing into the opening
  const swirl = setInterval(() => {
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI * (0.05 + Math.random() * 0.9); // from above the opening
      const d = 50 + Math.random() * 60;
      const sx = mouth.x + Math.cos(a) * d;
      const sy = mouth.y + Math.sin(a) * d;
      const s = document.createElement("div");
      s.className = Math.random() < 0.35 ? "fx-dust" : "fx-air";
      s.style.left = sx + "px";
      s.style.top = sy + "px";
      const ang = Math.atan2(mouth.y - sy, mouth.x - sx);
      boardEl.appendChild(s);
      s.animate(
        [
          { transform: `rotate(${ang}rad) translateX(0) scaleX(0.4)`, opacity: 0 },
          { transform: `rotate(${ang + 0.3}rad) translateX(${d * 0.55}px) scaleX(1)`, opacity: 0.95, offset: 0.5 },
          { transform: `rotate(${ang + 0.5}rad) translateX(${d}px) scaleX(0.2)`, opacity: 0 },
        ],
        { duration: 380, easing: "ease-in", fill: "forwards" },
      );
      setTimeout(() => s.remove(), 400);
    }
  }, 60);
  // the vacuum wiggles while it works
  let hum = null;
  setTimeout(() => {
    hum = n.animate(
      [
        { transform: "perspective(700px) rotateX(-10deg) rotate(0) scale(1)" },
        { transform: "perspective(700px) rotateX(-10deg) rotate(-1.5deg) scale(1.02, 0.98)" },
        { transform: "perspective(700px) rotateX(-10deg) rotate(1.5deg) scale(0.98, 1.02)" },
        { transform: "perspective(700px) rotateX(-10deg) rotate(0) scale(1)" },
      ],
      { duration: 160, iterations: Infinity },
    );
  }, 380);
  const bits = n.querySelector(".vac-bits");
  const START = 420;
  const EACH = 280;
  const SLURP = 780;
  group.forEach((b, i) => {
    const el = b.el;
    const r = fxRect(b);
    setTimeout(() => {
      el.style.transition = "none";
      el.style.animation = "none";
      boardEl.appendChild(el); // out of the board's clipping, above the vacuum
      el.style.zIndex = "33";
      el.style.transformOrigin = mouth.x - r.x + "px " + (mouth.y - r.y) + "px";
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
      setTimeout(() => {
        Sfx.pop();
        el.remove();
        // it lands in the see-through canister
        if (bits) {
          const NS = "http://www.w3.org/2000/svg";
          for (let k = 0; k < 3; k++) {
            const c = document.createElementNS(NS, "rect");
            const w = 14 + Math.random() * 8;
            c.setAttribute("x", 48 + Math.random() * 50);
            c.setAttribute("y", 184 - i * 7 - Math.random() * 10);
            c.setAttribute("width", w);
            c.setAttribute("height", w * 0.8);
            c.setAttribute("rx", 4);
            c.setAttribute("fill", b.color);
            c.setAttribute("stroke", "rgba(0,0,0,0.25)");
            c.setAttribute("transform", `rotate(${(Math.random() - 0.5) * 50} 80 176)`);
            c.style.animation = "fx-bit-in 0.3s ease-out";
            bits.appendChild(c);
          }
        }
        n.animate([{ transform: "perspective(700px) rotateX(-10deg) scale(1.06, 0.95)" }, { transform: "perspective(700px) rotateX(-10deg) scale(1)" }], { duration: 160 });
      }, SLURP);
    }, START + i * EACH);
  });
  const end = START + (group.length - 1) * EACH + SLURP;
  setTimeout(() => clearInterval(swirl), end - 100);
  setTimeout(() => {
    if (hum) hum.cancel();
    n.animate(
      [
        { transform: "perspective(700px) translateY(0) rotateX(-10deg)", opacity: 1 },
        { transform: "perspective(700px) translateY(360px) rotateX(-25deg)", opacity: 0 },
      ],
      { duration: 380, easing: "ease-in", fill: "forwards" },
    );
  }, end + 450);
  setTimeout(() => {
    n.remove();
    fxBusy--;
    done && done();
  }, end + 850);
}
