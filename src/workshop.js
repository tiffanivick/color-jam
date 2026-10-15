// WORKSHOP: something to work towards between puzzles.
//  - Every win earns a mystery block (3 stars: a gold one). In the Workshop you tap it twice:
//    the first tap cracks it, the second bursts it open and blueprint pieces fly out.
//  - Pieces fill a 3x3 blueprint. Never a duplicate: spare pieces (when the blueprint is nearly
//    full) become coins. A full blueprint can be built.
//  - The first four blueprints each build a new gadget (a power-up): Magnet, Ghost, Saw and
//    Rainbow Brush, with some free uses and coins. After that, bonus blueprints (Pocket Rocket,
//    Helper Robot, Sky Balloon, round and round) pay more coins and gadgets every time.
// Gadgets are help only: the puzzles and their rules don't change, and every level is still
// solvable without them. They sit in a second row above the power-ups once built.
// Loaded before app.js: top-level code here must not use app.js names (S, $, el, ...).

const GADGET_ORDER = ["magnet", "ghost", "saw", "paint"];
const GADGETS = {
  magnet: { short: "Magnet" },
  ghost: { short: "Ghost", hint: "Tap a block: its next drag slides straight through the others" },
  saw: { short: "Saw", hint: "Tap the square of a block you want to cut off" },
  paint: { short: "Paint", hint: "Tap a block to paint it rainbow" },
};
const PIECES = 9; // a 3x3 blueprint
const SCRAP_COINS = 15; // a spare piece

// ---------------------------------------------------------------- blueprint pictures (120x120)
function sawBladePath(cx, cy, n, ro, ri) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.55) / n) * Math.PI * 2;
    d += (i ? "L" : "M") + (cx + Math.cos(a0) * ri).toFixed(1) + " " + (cy + Math.sin(a0) * ri).toFixed(1);
    d += "L" + (cx + Math.cos(a1) * ro).toFixed(1) + " " + (cy + Math.sin(a1) * ro).toFixed(1);
  }
  return d + "Z";
}
const STEEL = "<linearGradient id='st' x1='0' x2='1'><stop offset='0' stop-color='#8d97a8'/><stop offset='.45' stop-color='#f4f6fa'/><stop offset='1' stop-color='#7d8696'/></linearGradient>";
const SPARK = (x, y, s = 1) => `<path transform='translate(${x} ${y}) scale(${s})' fill='#fff' d='M0-6 1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z'/>`;
const BP_ART = {
  magnet: `<defs><radialGradient id='bg' cx='.5' cy='.42' r='.75'><stop offset='0' stop-color='#fff3cf'/><stop offset='1' stop-color='#ffc56b'/></radialGradient><linearGradient id='rd' x1='0' x2='1'><stop offset='0' stop-color='#b3122a'/><stop offset='.35' stop-color='#ff4d5e'/><stop offset='.6' stop-color='#e8263b'/><stop offset='1' stop-color='#9e0f22'/></linearGradient>${STEEL}</defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <g fill='none' stroke='#4d7bff' stroke-width='3' stroke-linecap='round' opacity='.55'><path d='M22 30a38 38 0 0 1 76 0'/><path d='M10 28a50 50 0 0 1 100 0' stroke-dasharray='4 7'/></g>
    <path d='M38 46v22a22 22 0 0 0 44 0V46' fill='none' stroke='#6e0a18' stroke-width='26' opacity='.25'/>
    <path d='M38 42v24a22 22 0 0 0 44 0V42' fill='none' stroke='url(#rd)' stroke-width='24'/>
    <rect x='26' y='30' width='24' height='18' rx='3' fill='url(#st)' stroke='#5d6676' stroke-width='2'/><rect x='70' y='30' width='24' height='18' rx='3' fill='url(#st)' stroke='#5d6676' stroke-width='2'/>
    <path d='M32 56v10a28 28 0 0 0 14 24' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round' opacity='.5'/>
    ${SPARK(100, 82)}${SPARK(18, 90, 0.7)}${SPARK(60, 14, 0.6)}`,
  ghost: `<defs><radialGradient id='bg' cx='.5' cy='.4' r='.8'><stop offset='0' stop-color='#f3ecff'/><stop offset='1' stop-color='#b49dff'/></radialGradient></defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <rect x='8' y='62' width='48' height='32' rx='7' fill='#4d7bff'/><rect x='8' y='62' width='48' height='9' rx='5' fill='#7ea0ff'/><circle cx='22' cy='74' r='6' fill='#6b92ff'/><circle cx='42' cy='74' r='6' fill='#6b92ff'/>
    <path d='M64 20c-21 0-35 15-35 35v44l9-7 8.5 7 8.5-7 9 7 8.5-7 8.5 7 8-7V55c0-20-14-35-35-35Z' fill='#fff' opacity='.93' stroke='#8a7ad8' stroke-width='3'/>
    <ellipse cx='52' cy='54' rx='5' ry='7' fill='#2b2a46'/><ellipse cx='76' cy='54' rx='5' ry='7' fill='#2b2a46'/><circle cx='50' cy='51' r='1.6' fill='#fff'/><circle cx='74' cy='51' r='1.6' fill='#fff'/>
    <ellipse cx='45' cy='66' rx='5' ry='3' fill='#ff9dc4'/><ellipse cx='83' cy='66' rx='5' ry='3' fill='#ff9dc4'/><ellipse cx='64' cy='68' rx='4' ry='5' fill='#2b2a46'/>
    <g stroke='#fff' stroke-width='3' stroke-linecap='round' opacity='.8'><path d='M104 40h10M108 52h8M102 64h12'/></g>${SPARK(16, 24)}`,
  saw: `<defs><radialGradient id='bg' cx='.5' cy='.4' r='.8'><stop offset='0' stop-color='#e2fff2'/><stop offset='1' stop-color='#78dcb0'/></radialGradient>${STEEL}</defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <rect x='4' y='80' width='112' height='26' rx='4' fill='#c98a4c'/><path d='M4 86h48M68 92h48M10 99h40' stroke='#9c6634' stroke-width='2' opacity='.6'/><rect x='54' y='80' width='8' height='26' fill='#7a4a20'/>
    <path d='${sawBladePath(58, 52, 18, 38, 31)}' fill='url(#st)' stroke='#5d6676' stroke-width='2' stroke-linejoin='round'/>
    <circle cx='58' cy='52' r='22' fill='none' stroke='#fff' stroke-width='3' opacity='.55' stroke-dasharray='20 14'/>
    <circle cx='58' cy='52' r='12' fill='#ffd447' stroke='#b8941a' stroke-width='2'/><circle cx='58' cy='52' r='4' fill='#5d6676'/>
    <g fill='#f0c48a'><circle cx='72' cy='76' r='2.5'/><circle cx='80' cy='70' r='2'/><circle cx='88' cy='76' r='1.6'/><circle cx='46' cy='74' r='2'/><circle cx='38' cy='70' r='1.6'/></g>${SPARK(100, 22)}`,
  paint: `<defs><radialGradient id='bg' cx='.5' cy='.4' r='.8'><stop offset='0' stop-color='#fff4f9'/><stop offset='1' stop-color='#ffb3d1'/></radialGradient>${STEEL}</defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <g fill='none' stroke-width='7' stroke-linecap='round'><path d='M10 104a50 50 0 0 1 100 0' stroke='#ff4d5e'/><path d='M17 104a43 43 0 0 1 86 0' stroke='#ff8a3d'/><path d='M24 104a36 36 0 0 1 72 0' stroke='#f5d90a'/><path d='M31 104a29 29 0 0 1 58 0' stroke='#33cc7a'/><path d='M38 104a22 22 0 0 1 44 0' stroke='#4d7bff'/><path d='M45 104a15 15 0 0 1 30 0' stroke='#a855f7'/></g>
    <g transform='translate(70 44) rotate(38)'><rect x='-6' y='-36' width='12' height='46' rx='6' fill='#b97a3e' stroke='#7a4a20' stroke-width='2'/><rect x='-8' y='8' width='16' height='10' rx='2' fill='url(#st)' stroke='#5d6676' stroke-width='2'/>
    <path d='M-9 18h18l-2 16c-1 6-13 6-14 0Z' fill='#ff5da2' stroke='#b0306a' stroke-width='2'/><path d='M-6 26h12' stroke='#ffd447' stroke-width='4'/></g>${SPARK(22, 30)}${SPARK(98, 20, 0.7)}`,
  rocket: `<defs><radialGradient id='bg' cx='.5' cy='.4' r='.8'><stop offset='0' stop-color='#4a3aa8'/><stop offset='1' stop-color='#17143e'/></radialGradient></defs>
    <rect width='120' height='120' fill='url(#bg)'/>${SPARK(18, 20, 0.6)}${SPARK(100, 30, 0.8)}${SPARK(26, 92, 0.5)}${SPARK(96, 96, 0.6)}<circle cx='88' cy='16' r='1.5' fill='#fff'/><circle cx='12' cy='60' r='1.5' fill='#fff'/>
    <g transform='translate(60 58) rotate(35)'><path d='M-8 18c0 16 8 26 8 30 0-4 8-14 8-30Z' fill='#ffb020'/><path d='M-4 18c0 10 4 16 4 20 0-4 4-10 4-20Z' fill='#fff1a8'/>
    <path d='M-12 4l-13 20 13-5Z' fill='#e8263b'/><path d='M12 4l13 20-13-5Z' fill='#e8263b'/>
    <path d='M0-42c15 12 17 36 12 60h-24c-5-24-3-48 12-60Z' fill='#f4f6fa' stroke='#9aa4b6' stroke-width='2'/><path d='M0-42c8 6 12 14 13 23h-26c1-9 5-17 13-23Z' fill='#ff4d5e'/>
    <circle cy='-4' r='8' fill='#4d7bff' stroke='#c9d2e2' stroke-width='3'/><circle cx='-3' cy='-7' r='2.5' fill='#fff' opacity='.8'/></g>`,
  robot: `<defs><radialGradient id='bg' cx='.5' cy='.4' r='.8'><stop offset='0' stop-color='#e4fdff'/><stop offset='1' stop-color='#5cc8d8'/></radialGradient></defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <path d='M60 34V18' stroke='#5d6676' stroke-width='4'/><circle cx='60' cy='15' r='6' fill='#ff4d5e' stroke='#a31529' stroke-width='2'/>
    <rect x='20' y='50' width='10' height='20' rx='4' fill='#8d97a8'/><rect x='90' y='50' width='10' height='20' rx='4' fill='#8d97a8'/>
    <rect x='40' y='86' width='40' height='30' rx='9' fill='#8b5cf6' stroke='#5b34b8' stroke-width='3'/><circle cx='60' cy='100' r='5' fill='#ffd447'/>
    <rect x='28' y='34' width='64' height='54' rx='15' fill='#eef1f7' stroke='#5d6676' stroke-width='4'/><rect x='36' y='44' width='48' height='32' rx='9' fill='#1d2a44'/>
    <circle cx='50' cy='58' r='6' fill='#5dffd0'/><circle cx='70' cy='58' r='6' fill='#5dffd0'/><path d='M50 68q10 6 20 0' fill='none' stroke='#5dffd0' stroke-width='3' stroke-linecap='round'/>${SPARK(102, 26)}`,
  balloon: `<defs><radialGradient id='bg' cx='.5' cy='.35' r='.8'><stop offset='0' stop-color='#f2fbff'/><stop offset='1' stop-color='#8fd3ff'/></radialGradient><clipPath id='env'><ellipse cx='60' cy='46' rx='34' ry='38'/></clipPath></defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <g fill='#fff'><ellipse cx='18' cy='96' rx='16' ry='8'/><ellipse cx='30' cy='92' rx='12' ry='9'/><ellipse cx='102' cy='30' rx='14' ry='7'/><ellipse cx='92' cy='27' rx='10' ry='7'/></g>
    <g clip-path='url(#env)'><rect x='20' y='4' width='80' height='90' fill='#ff4d5e'/><rect x='34' y='4' width='12' height='90' fill='#ffd447'/><rect x='58' y='4' width='12' height='90' fill='#4d7bff'/><rect x='80' y='4' width='12' height='90' fill='#33cc7a'/><ellipse cx='48' cy='30' rx='10' ry='16' fill='#fff' opacity='.3'/></g>
    <ellipse cx='60' cy='46' rx='34' ry='38' fill='none' stroke='#a31529' stroke-width='2.5'/>
    <path d='M38 76l12 18M82 76l-12 18' stroke='#7a4a20' stroke-width='2'/><rect x='48' y='92' width='24' height='16' rx='3' fill='#b97a3e' stroke='#7a4a20' stroke-width='2'/>`,
};
const artCache = {};
function artURL(name) {
  return (artCache[name] ||= `url("data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" + BP_ART[name] + "</svg>")}")`);
}

// ---------------------------------------------------------------- blueprints
const BLUEPRINTS = [
  { art: "magnet", name: "Magnet", gadget: "magnet", charges: 3, coins: 100 },
  { art: "ghost", name: "Ghost", gadget: "ghost", charges: 3, coins: 120 },
  { art: "saw", name: "Saw", gadget: "saw", charges: 3, coins: 150 },
  { art: "paint", name: "Rainbow Brush", gadget: "paint", charges: 3, coins: 180 },
];
const BONUS_BLUEPRINTS = [
  { art: "rocket", name: "Pocket Rocket" },
  { art: "robot", name: "Helper Robot" },
  { art: "balloon", name: "Sky Balloon" },
];
function blueprint(i) {
  if (i < BLUEPRINTS.length) return BLUEPRINTS[i];
  const k = i - BLUEPRINTS.length;
  return { ...BONUS_BLUEPRINTS[k % BONUS_BLUEPRINTS.length], coins: 200 + 50 * k, gifts: 2 + Math.floor(k / 3) };
}
const bpComplete = () => S.workshop.got.length >= PIECES;
const gadgetUnlocked = (id) => S.workshop.built > GADGET_ORDER.indexOf(id);

// ---------------------------------------------------------------- the Workshop screen
function renderWorkshop() {
  const host = $("workshop");
  host.innerHTML = "";
  const W = S.workshop;
  const bp = blueprint(W.bp);

  const stage = el("div", "mystery-stage");
  if (W.boxes.length) {
    stage.appendChild(mysteryBlock(W.boxes[0]));
    stage.appendChild(
      el("div", "mystery-note", (W.boxes.length > 1 ? "<b>" + W.boxes.length + "</b> mystery blocks · " : "") + (bpComplete() ? "Build your blueprint to open more" : "Tap twice to crack it open")),
    );
  } else {
    stage.appendChild(el("div", "mystery-empty", "<b>No mystery blocks right now</b><span>Win a level to earn one. Three stars earns a gold one with an extra piece.</span>"));
  }
  host.appendChild(stage);

  const card = el("div", "bp-card" + (bpComplete() ? " full" : ""));
  card.innerHTML = '<div class="bp-head"><div><div class="eyebrow">Blueprint ' + (W.bp + 1) + "</div><h3>" + bp.name + '</h3></div><div class="bp-count"><b id="bpCount">' + W.got.length + "</b>/" + PIECES + "</div></div>";
  const grid = el("div", "bp-grid");
  grid.id = "bpGrid";
  for (let i = 0; i < PIECES; i++) {
    const got = W.got.includes(i);
    const slot = el("div", "bp-slot" + (got ? " got" : ""), got ? "" : "<i>" + (i + 1) + "</i>");
    slot.dataset.i = i;
    slot.style.backgroundImage = artURL(bp.art);
    slot.style.backgroundPosition = (i % 3) * 50 + "% " + Math.floor(i / 3) * 50 + "%";
    grid.appendChild(slot);
  }
  card.appendChild(grid);
  card.appendChild(
    el("p", "bp-what", bp.gadget ? "Builds the <b>" + POWER_NAME[bp.gadget] + "</b>: " + POWER_TEXT[bp.gadget].toLowerCase() + "." : "Bonus build: <b>" + bp.coins + " coins</b> and " + bp.gifts + " gadgets."),
  );
  if (bpComplete()) {
    const go = el("button", "btn-big green bp-build", "Build it!");
    go.addEventListener("click", () => buildBlueprint(card));
    card.appendChild(go);
  }
  host.appendChild(card);

  host.appendChild(el("h3", "shelf-title", "Your gadgets"));
  const shelf = el("div", "list");
  GADGET_ORDER.forEach((id, k) => {
    const on = gadgetUnlocked(id);
    const row = el("div", "row gadget-row" + (on ? "" : " locked"));
    row.innerHTML =
      '<i class="pw pw-' + id + '">' + (on ? ICON[id] : ICON.lock) + '</i><div class="row-main"><b>' + POWER_NAME[id] + "</b><small>" + (on ? POWER_TEXT[id] + " · you have " + S.inv[id] : "Build blueprint " + (k + 1) + " to unlock") + "</small></div>";
    shelf.appendChild(row);
  });
  host.appendChild(shelf);
}

// a big gold (or purple) 3D block wrapped in ribbon with a "?" on top
function mysteryBlock(kind) {
  const wrap = el("button", "mystery " + kind);
  wrap.setAttribute("aria-label", "Mystery block: tap twice to open");
  const inner = el("div", "mystery-in");
  const body = typeof Block3D !== "undefined" && Block3D.body([[0, 0], [0, 1], [1, 0], [1, 1]], kind === "gold" ? "#ffb020" : "#8b5cf6", false);
  if (body) {
    const img = new Image();
    img.src = body.src;
    img.alt = "";
    Object.assign(img.style, { left: -body.pad + "px", top: -body.pad + "px", width: body.w + "px", height: body.h + "px" });
    inner.appendChild(img);
  } else inner.classList.add("flat");
  inner.appendChild(el("div", "mystery-deco", '<i class="rb-v"></i><i class="rb-h"></i><b>?</b><em class="mystery-crack"></em>'));
  wrap.appendChild(inner);
  let taps = 0;
  wrap.addEventListener("click", () => {
    if (wrap.classList.contains("opening")) return;
    if (bpComplete()) {
      shake(wrap);
      Sfx.error();
      toast("Build your blueprint first!");
      return;
    }
    taps++;
    if (taps === 1) {
      wrap.classList.add("cracked");
      Sfx.smash(1);
      shake(wrap);
    } else openBox(wrap);
  });
  return wrap;
}

function openBox(wrap) {
  wrap.classList.add("opening");
  const W = S.workshop;
  const kind = W.boxes.shift();
  const n = kind === "gold" ? 3 : 2;
  const missing = [...Array(PIECES).keys()].filter((i) => !W.got.includes(i)).sort(() => Math.random() - 0.5);
  const take = missing.slice(0, n);
  const spare = n - take.length;
  W.got.push(...take);
  if (spare) S.coins += spare * SCRAP_COINS;
  save();
  Sfx.crack();
  setTimeout(() => Sfx.chestOpen(), 120);
  const r = wrap.getBoundingClientRect();
  shatter(wrap, r);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  take.forEach((i, k) => setTimeout(() => flyPiece(i, cx, cy), 300 + k * 380));
  if (spare) setTimeout(() => toast("+" + spare * SCRAP_COINS + " coins from spare parts"), 600);
  setTimeout(() => {
    renderTop();
    renderWorkshop();
    if (bpComplete()) {
      const b = document.querySelector(".bp-build");
      if (b) b.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 300 + take.length * 380 + 750);
}

// the block bursts into 8 wedges that fly apart
function shatter(wrap, r) {
  const rim = [[50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50], [0, 0]];
  for (let i = 0; i < 8; i++) {
    const [a, b] = [rim[i], rim[(i + 1) % 8]];
    const f = wrap.cloneNode(true);
    f.className = wrap.className + " mystery-frag";
    Object.assign(f.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", clipPath: `polygon(50% 50%, ${a[0]}% ${a[1]}%, ${b[0]}% ${b[1]}%)` });
    document.body.appendChild(f);
    const ang = Math.atan2((a[1] + b[1]) / 2 - 50, (a[0] + b[0]) / 2 - 50);
    const d = 90 + Math.random() * 60;
    f.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d - 40}px) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${Math.cos(ang) * d * 1.3}px, ${Math.sin(ang) * d + 220}px) rotate(${(Math.random() - 0.5) * 300}deg)`, opacity: 0 },
      ],
      { duration: 1000, easing: "cubic-bezier(.25,.6,.5,1)", fill: "forwards" },
    ).onfinish = () => f.remove();
  }
  wrap.style.visibility = "hidden";
  const flash = el("div", "mystery-flash");
  Object.assign(flash.style, { left: r.left + r.width / 2 - 90 + "px", top: r.top + r.height / 2 - 90 + "px" });
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

// a piece pops out of the block and flies into its place on the blueprint
function flyPiece(i, cx, cy) {
  const slot = document.querySelector('.bp-slot[data-i="' + i + '"]');
  if (!slot) return;
  const s = slot.getBoundingClientRect();
  const p = el("div", "bp-fly");
  Object.assign(p.style, { width: s.width + "px", height: s.height + "px", backgroundImage: slot.style.backgroundImage, backgroundPosition: slot.style.backgroundPosition });
  document.body.appendChild(p);
  Sfx.pop();
  p.animate(
    [
      { transform: `translate(${cx - s.width / 2}px, ${cy - s.height / 2}px) scale(0.2) rotate(-25deg)`, opacity: 0 },
      { transform: `translate(${cx - s.width / 2}px, ${cy - s.height / 2 - 100}px) scale(1.35) rotate(10deg)`, opacity: 1, offset: 0.38 },
      { transform: `translate(${s.left}px, ${s.top}px) scale(1) rotate(0)`, opacity: 1 },
    ],
    { duration: 760, easing: "cubic-bezier(.3,.7,.35,1)", fill: "forwards" },
  ).onfinish = () => {
    p.remove();
    slot.classList.add("got", "pop");
    slot.innerHTML = "";
    const c = $("bpCount");
    if (c) c.textContent = S.workshop.got.filter((g) => document.querySelector('.bp-slot.got[data-i="' + g + '"]')).length;
    Sfx.coin();
  };
}

// the pieces lock together, then the reward
function buildBlueprint(card) {
  const W = S.workshop;
  if (!bpComplete()) return;
  const bp = blueprint(W.bp);
  card.classList.add("assemble");
  const btn = card.querySelector(".bp-build");
  if (btn) btn.disabled = true;
  Sfx.whoosh();
  setTimeout(() => {
    const loot = [];
    S.coins += bp.coins;
    S.stats.coinsEarned += bp.coins;
    loot.push(['<i class="coin"></i>', "+" + bp.coins + " coins"]);
    if (bp.gadget) {
      S.inv[bp.gadget] += bp.charges;
      loot.push([powerGlyph(bp.gadget), "+" + bp.charges + " " + POWER_NAME[bp.gadget]]);
    } else {
      const have = GADGET_ORDER.filter(gadgetUnlocked);
      for (let g = 0; g < bp.gifts; g++) {
        const id = have[Math.floor(Math.random() * have.length)];
        S.inv[id]++;
        loot.push([powerGlyph(id), "+1 " + POWER_NAME[id]]);
      }
    }
    W.built++;
    W.bp++;
    W.got = [];
    save();
    renderTop();
    Sfx.win();
    const sheet = openSheet(
      '<div class="ribbon gold">' + (bp.gadget ? "New gadget!" : "Built!") + '</div><div class="sheet-body built"><div class="built-art" style="background-image:' + artURL(bp.art).replace(/"/g, "&quot;") + '"></div><h3>You built the ' + bp.name + "!</h3>" +
        (bp.gadget ? "<p>" + POWER_TEXT[bp.gadget] + ". Find it above your power-ups in every level.</p>" : "<p>A bonus build. Keep going: every blueprint pays more.</p>") +
        '<div class="loot">' + loot.map(([ic, tx], i) => '<div class="loot-row" style="animation-delay:' + (0.3 + i * 0.2) + 's"><span>' + ic + "</span><b>" + tx + "</b></div>").join("") + "</div>" +
        '<p class="unlock">Next blueprint: <b>' + blueprint(W.bp).name + '</b></p><button class="btn-big green" id="builtOk">Awesome!</button></div>',
    );
    launchConfetti(sheet);
    checkTrophies();
    $("builtOk").addEventListener("click", () => {
      closeSheet();
      renderWorkshop();
    });
  }, 1100);
}

// shop rows for the gadgets you've built
function workshopShopRows(list) {
  GADGET_ORDER.filter(gadgetUnlocked).forEach((id) => {
    const row = el("div", "row shop");
    row.innerHTML = powerGlyph(id) + '<div class="row-main"><b>' + POWER_NAME[id] + "</b><small>" + POWER_TEXT[id] + " · you have " + S.inv[id] + "</small></div>";
    const btn = el("button", "chip-btn go", '<i class="coin"></i>' + COST[id]);
    btn.addEventListener("click", () => buy(id, 1, COST[id]));
    row.appendChild(btn);
    list.appendChild(row);
  });
}

// ---------------------------------------------------------------- gadgets in a level
function updateGadgets(can) {
  const row = $("gadgets");
  const ids = GADGET_ORDER.filter(gadgetUnlocked);
  row.hidden = !ids.length;
  if (row.dataset.ids !== ids.join()) {
    row.dataset.ids = ids.join();
    row.innerHTML = ids
      .map((id) => '<button class="booster gadget" id="gad-' + id + '" data-g="' + id + '"><span class="b-ic">' + ICON[id] + '</span><span class="b-name">' + GADGETS[id].short + '</span><span class="b-count"></span></button>')
      .join("");
  }
  ids.forEach((id) => {
    const b = $("gad-" + id);
    const n = S.inv[id];
    b.querySelector(".b-count").textContent = n > 0 ? n : "+";
    b.classList.toggle("empty", n <= 0);
    b.classList.toggle("off", n > 0 && !can);
    b.classList.toggle("active", toolMode === id);
  });
}
document.getElementById("gadgets").addEventListener("click", (e) => {
  const b = e.target.closest(".gadget");
  if (b) useGadget(b.dataset.g);
});

function useGadget(id) {
  if (levelOver) return;
  if (lockedUntilStart("gad-" + id)) return;
  if (S.inv[id] <= 0) return buyPrompt(id);
  if (id === "magnet") return magnet();
  if (toolMode === id) return setTool(null);
  setTool(id);
  toast(GADGETS[id].hint);
}

// a block tapped while a gadget is picked
function gadgetTap(mode, b, e) {
  const no = (msg) => {
    shake(b.el);
    Sfx.error();
    toast(msg);
  };
  if (mode === "ghost") {
    if (isFrozen(b) || b.crate || b.pillar) return no("That block can't move yet");
    setTool(null);
    usePower("ghost");
    endGhost();
    ghostBlock = b;
    b.el.classList.add("ghost");
    Sfx.whoosh();
    toast("Now drag it through anything in its way");
    return;
  }
  if (mode === "saw") {
    if (b.crate || b.pillar) return no("The saw can't cut that one");
    if (b.cells.length < 2) return no("Too small to cut: pick a block with 2 or more squares");
    // the square you tapped; if cutting it would split the block, the nearest end square
    const p = e ? boardPoint(e) : { x: -1, y: -1 };
    const at = ([r, c]) => Math.hypot(c * STEP + CELL / 2 - p.x, r * STEP + CELL / 2 - p.y);
    const cut = b.cells.filter((x) => cellsConnected(b.cells.filter((y) => y !== x))).sort((x, y) => at(x) - at(y))[0];
    setTool(null);
    usePower("saw");
    sawFX(b, cut, () => {
      const keep = { bombLeft: b.bombLeft, bombFull: b.bombFull };
      b.cells = b.cells.filter((x) => x !== cut);
      rebuildBlock(b, keep);
    });
    return;
  }
  if (mode === "paint") {
    if (b.crate || b.pillar || b.gray) return no("The brush only paints coloured blocks");
    if (b.rainbow) return no("That one is already rainbow");
    setTool(null);
    usePower("paint");
    paintFX(b, () => {
      b.rainbow = true;
      rebuildBlock(b, { bombLeft: b.bombLeft, bombFull: b.bombFull });
      b.el.classList.add("painted");
    });
  }
}
function cellsConnected(cells) {
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const q = [cells[0]];
  while (q.length) {
    const [r, c] = q.pop();
    for (const o of cells) if (!seen.has(o) && Math.abs(o[0] - r) + Math.abs(o[1] - c) === 1) seen.add(o), q.push(o);
  }
  return seen.size === cells.length;
}
// draw a block again after its shape or paint changed, keeping its fuse
function rebuildBlock(b, keep) {
  const wasGhost = ghostBlock === b;
  b.el.remove();
  renderBlock(b);
  if (b.bomb && keep && keep.bombFull) {
    b.bombLeft = keep.bombLeft;
    b.bombFull = keep.bombFull;
    b.el.classList.toggle("hot", b.bombLeft <= BOMB_HOT);
    showFuse(b);
  }
  if (wasGhost) b.el.classList.add("ghost");
  undoStack.length = 0; // its old shape can't come back
  refreshIce();
  updateBoosters();
}

// ---------------------------------------------------------------- Magnet
// every block that has a clear straight run to a gate of its colour is pulled out, one after
// another; each one that leaves can open the way for the next
function magnetPath(b) {
  if (b.removed || !isNeeded(b) || isFrozen(b) || b.pillar) return null;
  for (const dir of dirsFor(b)) {
    const [vr, vc] = DIRS[dir];
    let cells = b.cells;
    for (let steps = 0; steps < 20; steps++) {
      const t = tryStep(b, cells, dir);
      if (t.status === "exit") return { dr: steps * vr, dc: steps * vc, exitDir: dir };
      if (t.status !== "move" || b.jelly) break;
      cells = t.next;
    }
  }
  return null;
}
function magnet() {
  if (!blocks.some((b) => magnetPath(b))) {
    shake($("gad-magnet"));
    Sfx.error();
    toast("No block has a clear path to its gate yet");
    return;
  }
  usePower("magnet");
  const m = el("div", "fx-tool fx-magnet", '<div class="fx-magnet-in"></div>');
  m.firstChild.style.backgroundImage = artURL("magnet");
  m.style.left = boardEl.clientWidth / 2 - 50 + "px";
  boardEl.appendChild(m);
  m.animate([{ transform: "translateY(-80px) scale(0.6)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }], { duration: 280, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "forwards" });
  const end = () => {
    m.animate([{ opacity: 1 }, { transform: "translateY(-60px) scale(0.7)", opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => m.remove();
  };
  const pull = () => {
    const b = levelOver ? null : blocks.find((o) => magnetPath(o));
    if (!b) return end();
    const st = magnetPath(b);
    b.el.classList.add("magnet-pull");
    Sfx.whoosh();
    setTimeout(() => {
      if (!b.removed && !levelOver && magnetPath(b)) exitBlock(b, b.el, magnetPath(b) || st);
      setTimeout(pull, 240);
    }, 220);
  };
  setTimeout(pull, 380);
}

// ---------------------------------------------------------------- Saw and Rainbow Brush effects
const FX_SAW_SVG = `<svg viewBox="0 0 60 60" width="60" height="60" aria-hidden="true"><defs>${STEEL.replace("id='st'", "id='fsst'")}</defs><path d="${sawBladePath(30, 30, 16, 29, 23)}" fill="url(#fsst)" stroke="#5d6676" stroke-width="1.5" stroke-linejoin="round"/><circle cx="30" cy="30" r="9" fill="#ffd447" stroke="#b8941a" stroke-width="1.5"/><circle cx="30" cy="30" r="3" fill="#5d6676"/></svg>`;
function sawFX(b, cut, done) {
  const r0 = Math.min(...b.cells.map((c) => c[0])), c0 = Math.min(...b.cells.map((c) => c[1]));
  const x = PADDING + cut[1] * STEP, y = PADDING + cut[0] * STEP;
  // which side is it cut from? along the joint with the rest of the block
  const nb = b.cells.find((o) => o !== cut && Math.abs(o[0] - cut[0]) + Math.abs(o[1] - cut[1]) === 1);
  const vertical = nb && nb[1] !== cut[1]; // the neighbour is beside it: cut runs down the joint
  const jx = nb ? (nb[1] > cut[1] ? x + CELL + GAP / 2 : nb[1] < cut[1] ? x - GAP / 2 : x + CELL / 2) : x + CELL / 2;
  const jy = nb ? (nb[0] > cut[0] ? y + CELL + GAP / 2 : nb[0] < cut[0] ? y - GAP / 2 : y + CELL / 2) : y + CELL / 2;
  const saw = el("div", "fx-tool fx-saw", FX_SAW_SVG);
  boardEl.appendChild(saw);
  const from = vertical ? [jx, y - 26] : [x - 26, jy];
  const to = vertical ? [jx, y + CELL + 26] : [x + CELL + 26, jy];
  saw.animate(
    [
      { transform: `translate(${from[0] - 30}px, ${from[1] - 30}px) scale(0.4)`, opacity: 0 },
      { transform: `translate(${from[0] - 30}px, ${from[1] - 30}px) scale(1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${to[0] - 30}px, ${to[1] - 30}px) scale(1)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${to[0] - 30}px, ${to[1] - 30}px) scale(0.4)`, opacity: 0 },
    ],
    { duration: 700, easing: "ease-in-out", fill: "forwards" },
  ).onfinish = () => saw.remove();
  Sfx.whoosh();
  const dust = setInterval(() => burst(jx, jy, "#f0c48a", 3), 80);
  setTimeout(() => {
    clearInterval(dust);
    Sfx.crack();
    // the cut square drops away
    const el0 = b.el;
    const frag = el0.cloneNode(true);
    frag.className = el0.className + " fx-cutpiece";
    const lx = (cut[1] - c0) * STEP - 2, ly = (cut[0] - r0) * STEP - 2;
    frag.style.clipPath = `inset(${ly}px calc(100% - ${lx + CELL + 4}px) calc(100% - ${ly + CELL + 12}px) ${lx}px)`;
    frag.style.zIndex = 20;
    boardEl.appendChild(frag);
    frag.style.left = PADDING + parseFloat(el0.style.left) + "px";
    frag.style.top = PADDING + parseFloat(el0.style.top) + "px";
    frag.style.transformOrigin = lx + CELL / 2 + "px " + (ly + CELL / 2) + "px";
    frag.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 30}px, -14px) rotate(${(Math.random() - 0.5) * 30}deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${(Math.random() - 0.5) * 60}px, 160px) rotate(${(Math.random() - 0.5) * 160}deg) scale(0.8)`, opacity: 0 },
      ],
      { duration: 800, easing: "cubic-bezier(.3,.5,.6,1)", fill: "forwards" },
    ).onfinish = () => frag.remove();
    burst(x + CELL / 2, y + CELL / 2, "#f0c48a", 12);
    done();
  }, 560);
}
function paintFX(b, done) {
  const r = fxRect(b);
  const colors = ["#ff4d5e", "#ff8a3d", "#f5d90a", "#33cc7a", "#4d7bff", "#a855f7"];
  const brush = el("div", "fx-tool fx-brush", ICON.paint);
  brush.style.left = r.x - 10 + "px";
  brush.style.top = r.y - 30 + "px";
  boardEl.appendChild(brush);
  brush.animate(
    [
      { transform: "translate(0,0) rotate(-30deg)", opacity: 0 },
      { transform: "translate(0,0) rotate(-30deg)", opacity: 1, offset: 0.15 },
      { transform: `translate(${r.w}px, ${r.h * 0.5}px) rotate(20deg)`, opacity: 1, offset: 0.8 },
      { transform: `translate(${r.w + 10}px, ${r.h * 0.5}px) rotate(20deg)`, opacity: 0 },
    ],
    { duration: 650, easing: "ease-in-out", fill: "forwards" },
  ).onfinish = () => brush.remove();
  Sfx.whoosh();
  colors.forEach((c, i) => setTimeout(() => burst(r.x + (r.w * (i + 0.5)) / colors.length, r.y + r.h / 2, c, 5), 80 + i * 70));
  setTimeout(() => {
    Sfx.pop();
    done();
  }, 520);
}
