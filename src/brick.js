// BRICK: draws a block as one continuous molded plastic shape (the Realistic style).
// The block's squares are merged into a single outline with rounded corners, a front
// wall is extruded inside the footprint, and lighting, textures and studs run across
// the whole block, so there are never seams between squares.
// Needs CELL, GAP and STEP from engine.js (loaded after this file).

const BRICK_WALL = 8; // height of the visible front wall, in px
const BRICK_R_OUT = 10; // outer (convex) corner radius
const BRICK_R_IN = 2.5; // inner (concave) corner radius
let brickUid = 0;

// --- outline -------------------------------------------------------------------
// The block is a union of rectangles: each square, plus the gap strip to a neighbour,
// plus the little gap-crossing square where three or four squares meet.
function brickRects(cells, c0, r0) {
  const has = (r, c) => cells.some(([rr, cc]) => rr === r && cc === c);
  const rects = [];
  for (const [r, c] of cells) {
    const x = (c - c0) * STEP;
    const y = (r - r0) * STEP;
    rects.push([x, y, CELL, CELL]);
    const R = has(r, c + 1);
    const D = has(r + 1, c);
    const RD = has(r + 1, c + 1);
    if (R) rects.push([x + CELL, y, GAP, CELL]);
    if (D) rects.push([x, y + CELL, CELL, GAP]);
    if (R + D + RD >= 2 && (R || D)) rects.push([x + CELL, y + CELL, GAP, GAP]);
  }
  // a gap-crossing square can also be needed from the other diagonal (┘ shape)
  for (const [r, c] of cells) {
    const x = (c - c0) * STEP;
    const y = (r - r0) * STEP;
    if (has(r, c - 1) && has(r + 1, c) && !has(r + 1, c - 1)) rects.push([x - GAP, y + CELL, GAP, GAP]);
  }
  return rects;
}

// Trace the outline of a union of axis-aligned rectangles. Returns loops of points,
// clockwise (screen coordinates), with straight runs merged.
function brickLoops(rects) {
  const xs = [...new Set(rects.flatMap(([x, , w]) => [x, x + w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap(([, y, , h]) => [y, y + h]))].sort((a, b) => a - b);
  const filled = (i, j) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    return rects.some(([x, y, w, h]) => cx > x && cx < x + w && cy > y && cy < y + h);
  };
  const next = new Map(); // "x,y" -> [x2,y2]
  const add = (a, b) => next.set(a[0] + "," + a[1], b);
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      if (!filled(i, j)) continue;
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
      if (!filled(i, j - 1)) add([x0, y0], [x1, y0]); // top edge, left -> right
      if (!filled(i + 1, j)) add([x1, y0], [x1, y1]); // right edge, down
      if (!filled(i, j + 1)) add([x1, y1], [x0, y1]); // bottom edge, right -> left
      if (!filled(i - 1, j)) add([x0, y1], [x0, y0]); // left edge, up
    }
  }
  const loops = [];
  const seen = new Set();
  for (const key of next.keys()) {
    if (seen.has(key)) continue;
    const loop = [];
    let k = key;
    while (!seen.has(k)) {
      seen.add(k);
      const [x, y] = k.split(",").map(Number);
      loop.push([x, y]);
      const n = next.get(k);
      if (!n) break;
      k = n[0] + "," + n[1];
    }
    // merge straight runs
    const pts = loop.filter((p, i) => {
      const a = loop[(i - 1 + loop.length) % loop.length];
      const b = loop[(i + 1) % loop.length];
      return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
    });
    if (pts.length >= 4) loops.push(pts);
  }
  return loops;
}

// Rounded path through the loop's corners: convex corners get the big radius,
// concave (inside-bend) corners the small one.
function brickPath(loops, dy = 0) {
  let d = "";
  for (const pts of loops) {
    const n = pts.length;
    const corner = (i) => {
      const p = pts[i];
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      const d1 = [Math.sign(p[0] - a[0]), Math.sign(p[1] - a[1])];
      const d2 = [Math.sign(b[0] - p[0]), Math.sign(b[1] - p[1])];
      const turn = d1[0] * d2[1] - d1[1] * d2[0]; // > 0: clockwise turn = convex here
      const len1 = Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1]);
      const len2 = Math.abs(b[0] - p[0]) + Math.abs(b[1] - p[1]);
      const r = Math.min(turn > 0 ? BRICK_R_OUT : BRICK_R_IN, len1 / 2, len2 / 2);
      return { p, d1, d2, r };
    };
    const cs = pts.map((_, i) => corner(i));
    const f = (x, y) => x.toFixed(1) + "," + (y + dy).toFixed(1);
    const c0 = cs[0];
    d += "M" + f(c0.p[0] + c0.d2[0] * c0.r, c0.p[1] + c0.d2[1] * c0.r);
    for (let i = 1; i <= n; i++) {
      const c = cs[i % n];
      d += "L" + f(c.p[0] - c.d1[0] * c.r, c.p[1] - c.d1[1] * c.r);
      d += "Q" + f(c.p[0], c.p[1]) + " " + f(c.p[0] + c.d2[0] * c.r, c.p[1] + c.d2[1] * c.r);
    }
    d += "Z";
  }
  return d;
}

// --- shared paint (gradients and seamless patterns), added to the page once --------
function brickDefs() {
  if (document.getElementById("brick-defs")) return;
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.id = "brick-defs";
  s.setAttribute("width", "0");
  s.setAttribute("height", "0");
  s.style.position = "absolute";
  s.innerHTML = `<defs>
  <linearGradient id="bk-light" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.34"/>
    <stop offset="0.35" stop-color="#fff" stop-opacity="0.08"/>
    <stop offset="0.6" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
  </linearGradient>
  <linearGradient id="bk-streak" x1="0" y1="0" x2="1" y2="0.55">
    <stop offset="0.16" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.22" stop-color="#fff" stop-opacity="0.18"/>
    <stop offset="0.28" stop-color="#fff" stop-opacity="0.04"/>
    <stop offset="0.32" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="bk-rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.75"/>
    <stop offset="0.45" stop-color="#fff" stop-opacity="0.25"/>
    <stop offset="0.7" stop-color="#000" stop-opacity="0.08"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.22"/>
  </linearGradient>
  <linearGradient id="bk-wallshade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.12"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
  </linearGradient>
  <radialGradient id="bk-stud" cx="0.36" cy="0.3" r="0.75">
    <stop offset="0" stop-color="#fff" stop-opacity="0.85"/>
    <stop offset="0.22" stop-color="#fff" stop-opacity="0.32"/>
    <stop offset="0.55" stop-color="#fff" stop-opacity="0.04"/>
    <stop offset="0.85" stop-color="#000" stop-opacity="0.06"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
  </radialGradient>
  <radialGradient id="st-ember" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#fff6c8" stop-opacity="1"/><stop offset="0.28" stop-color="#ffb347" stop-opacity="0.95"/>
    <stop offset="0.6" stop-color="#ff7a2e" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/>
  </radialGradient>
  <!-- world finishes: seamless across the whole block -->
  <pattern id="fin-candy" width="18" height="18" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="4" r="1.1" fill="#fff" opacity="0.75"/><circle cx="12" cy="9" r="0.9" fill="#fff" opacity="0.6"/>
    <circle cx="6" cy="14" r="0.8" fill="#fff" opacity="0.55"/><circle cx="15" cy="2" r="0.7" fill="#fff" opacity="0.5"/>
  </pattern>
  <pattern id="fin-ember" width="108" height="108" patternUnits="userSpaceOnUse">
    <path d="M0 74l14-6 9 8 15-5 10 9M56 0l-5 14 10 10-4 13 9 8M108 50l-14 2-7 10-12-2M70 108l6-13 13-3 5-12" fill="none" stroke="#ffb347" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </pattern>
  <pattern id="fin-star" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="1" y="0" fill="#fff" opacity="0.07"/><rect width="6" height="1" y="3" fill="#000" opacity="0.05"/>
  </pattern>
  <pattern id="fin-reef" width="72" height="30" patternUnits="userSpaceOnUse">
    <path d="M0 10c12-7 24 7 36 0s24 7 36 0M0 25c12-7 24 7 36 0s24 7 36 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
  </pattern>
  <pattern id="fin-dunes" width="90" height="16" patternUnits="userSpaceOnUse">
    <path d="M0 5c22 5 45-5 90 0M0 13c30 4 52-5 90 0" fill="none" stroke="#fff3d6" stroke-width="1.5" opacity="0.45"/>
  </pattern>
  <linearGradient id="fin-dusk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffc896" stop-opacity="0.28"/><stop offset="0.55" stop-color="#ff7aa0" stop-opacity="0"/><stop offset="1" stop-color="#502890" stop-opacity="0.2"/>
  </linearGradient>
  <!-- special blocks -->
  <pattern id="mat-gray" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="12" fill="#000" opacity="0.09"/><rect x="6" width="6" height="12" fill="#fff" opacity="0.08"/>
  </pattern>
  <pattern id="mat-chain" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="5" height="12" fill="#19192d" opacity="0.55"/><rect x="5" width="7" height="12" fill="#fff" opacity="0.14"/>
  </pattern>
  <linearGradient id="mat-ice" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f4fcff" stop-opacity="0.86"/><stop offset="0.55" stop-color="#a8dafa" stop-opacity="0.62"/><stop offset="1" stop-color="#d6f1ff" stop-opacity="0.8"/>
  </linearGradient>
  <pattern id="mat-icecrack" width="110" height="110" patternUnits="userSpaceOnUse">
    <path d="M70 0 62 22 76 38 63 58 70 80M62 22 40 30 30 50M0 64l22 6 10 22 24 6M30 50 18 70M100 70l-14 12 4 28" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
  </pattern>
  <linearGradient id="mat-iceshine" x1="0" y1="0" x2="1" y2="0.6">
    <stop offset="0.28" stop-color="#fff" stop-opacity="0"/><stop offset="0.31" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.37" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.4" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.47" stop-color="#fff" stop-opacity="0"/><stop offset="0.49" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.52" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <pattern id="mat-crate" width="54" height="12" patternUnits="userSpaceOnUse">
    <rect width="54" height="12" fill="#b9824a"/><rect y="11" width="54" height="1" fill="#6b4226" opacity="0.6"/>
    <path d="M0 4h20M28 8h26" stroke="#8a5a35" stroke-width="0.8" opacity="0.5"/>
  </pattern>
  <pattern id="mat-sand" width="40" height="11" patternUnits="userSpaceOnUse">
    <rect width="40" height="11" fill="#d9b27a"/><rect y="9" width="40" height="2" fill="#78501e" opacity="0.22"/>
    <circle cx="8" cy="4" r="0.8" fill="#fff4dc" opacity="0.6"/><circle cx="27" cy="6" r="0.7" fill="#78501e" opacity="0.35"/>
  </pattern>
  <linearGradient id="mat-rainbow" x1="0" y1="0" x2="1" y2="0.45">
    <stop offset="0" stop-color="#ff5d5d"/><stop offset="0.18" stop-color="#ffa23d"/><stop offset="0.34" stop-color="#ffe14a"/>
    <stop offset="0.5" stop-color="#49d878"/><stop offset="0.66" stop-color="#3fb7ff"/><stop offset="0.82" stop-color="#7b6bff"/><stop offset="1" stop-color="#d16bff"/>
  </linearGradient>
  <linearGradient id="mat-jelly" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/>
  </linearGradient>
  <pattern id="mat-comet" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
    <rect width="22" height="2" y="9" fill="#fff" opacity="0.2"/>
  </pattern>
  </defs>`;
  document.body.appendChild(s);
}

// --- one block ---------------------------------------------------------------
// Returns an <svg> drawing of the block, positioned at the wrapper's top-left.
function brickSVG(b, c0, r0, W, H) {
  brickDefs();
  const id = "bk" + ++brickUid;
  const loops = brickLoops(brickRects(b.cells, c0, r0));
  const body = brickPath(loops);
  const face = brickPath(loops, -BRICK_WALL);
  const color = b.color;
  const wall = `color-mix(in srgb, ${color} 58%, #1a0f3a)`;
  const wallDark = `color-mix(in srgb, ${color} 42%, #120a30)`;
  const studs = b.cells
    .map(([r, c]) => {
      const cx = (c - c0) * STEP + CELL / 2;
      const cy = (r - r0) * STEP + 20;
      return `<g class="stud" transform="translate(${cx} ${cy})">
        <ellipse class="stud-shadow" cx="0" cy="5" rx="12.5" ry="12.5"/>
        <ellipse class="stud-side" cx="0" cy="3" rx="12.5" ry="12.5" style="fill:${wall}"/>
        <circle class="stud-top" r="12.5" style="fill:${color}"/>
        <circle class="stud-hl" r="12.5"/>
        <circle class="stud-rim" r="11.6"/>
        <path class="stud-star" d="M0-12 2.9-3.9 11.4-3.7 4.6 1.4 7.1 9.6 0 4.7-7.1 9.6-4.6 1.4-11.4-3.7-2.9-3.9Z"/>
        <path class="stud-arrow-h" d="M-8 0h16M-3-5-8 0-3 5M3-5 8 0 3 5"/>
        <path class="stud-arrow-v" d="M0-8v16M-5-3 0-8 5-3M-5 3 0 8 5 3"/>
        <path class="stud-up" d="M-5 2 0-3 5 2"/>
      </g>`;
    })
    .join("");
  return `<svg class="block-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible" aria-hidden="true">
    <defs>
      <clipPath id="${id}b"><path d="${body}"/></clipPath>
      <clipPath id="${id}f"><path d="${face}"/></clipPath>
      <mask id="${id}s" maskUnits="userSpaceOnUse" x="-4" y="-12" width="${W + 8}" height="${H + 20}">
        <path d="${face}" fill="#fff"/><path d="${brickPath(loops, 9)}" fill="#000"/>
      </mask>
    </defs>
    <path class="b-wall" d="${body}" style="fill:${wall}"/>
    <g clip-path="url(#${id}b)">
      <path class="b-wallshade" d="${body}" fill="url(#bk-wallshade)"/>
      <path class="b-walldark" d="${brickPath(loops, 3)}" style="fill:${wallDark}" opacity="0.55"/>
      <g clip-path="url(#${id}f)">
        <rect class="b-face" x="0" y="0" width="${W}" height="${H}" style="fill:${color}"/>
        <rect class="b-mat" x="0" y="0" width="${W}" height="${H}"/>
        <rect class="b-fin" x="0" y="0" width="${W}" height="${H}"/>
        <rect class="b-light" x="0" y="0" width="${W}" height="${H}" fill="url(#bk-light)"/>
        <rect class="b-streak" x="0" y="0" width="${W}" height="${H}" fill="url(#bk-streak)"/>
        <rect class="b-ice" x="0" y="0" width="${W}" height="${H}"/>
        <rect class="b-icecrack" x="0" y="0" width="${W}" height="${H}"/>
        <rect class="b-iceshine" x="0" y="0" width="${W}" height="${H}"/>
        <g class="b-snow" mask="url(#${id}s)"><rect x="-4" y="-12" width="${W + 8}" height="${H + 20}" fill="#fff"/></g>
        ${studs}
      </g>
      <path class="b-rim" d="${face}" fill="none" stroke="url(#bk-rim)" stroke-width="3"/>
    </g>
  </svg>`;
}
