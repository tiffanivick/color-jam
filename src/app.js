// APP (core): save data, dates, levels and worlds, themes, brick pictures, toasts and pop-ups,
// the top bar and tabs. The rest of the game around the puzzle is split by screen:
// icons.js, home.js, meta.js, play.js, win.js, rush.js, main.js (see index.html for the order).
// engine.js handles the board itself.

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

// ---------------------------------------------------------------- save data
const SAVE_KEY = "colorjam3.save";
const ECON_CAP = 300; // coins kept when an old save is rebalanced
const ECON_INV = 5; // most of any one power-up kept
const defaults = () => ({
  cleared: 0, // levels finished, in order. Levels never come back.
  stars: {}, // level index -> stars earned
  starsTotal: 0,
  coins: 60,
  chests: 0, // chests waiting to be opened
  inv: { undo: 2, hammer: 1, freeze: 2, vacuum: 1, magnet: 0, ghost: 0, saw: 0, paint: 0, hourglass: 2, rocket: 2 },
  // Vault Run (build 50): levels won in a row without failing; 10 cracks the vault
  vault: { n: 0, round: 0, got: [] },
  // the Workshop (workshop.js): mystery blocks waiting to be opened ("gold" ones hold an extra
  // piece), the blueprint being collected, the pieces of it you have, and how many you've built
  workshop: { boxes: ["gold"], bp: 0, got: [], built: 0 },
  econ: 2, // economy version: saves from before build 43 are brought in line once (see load)
  bonus: 1, // Bonus Rush tickets
  skin: "real", // block look: classic or real
  stats: { levels: 0, perfect: 0, bestCombo: 0, exits: 0, thawed: 0, blasted: 0, worlds: 0, coinsEarned: 0, questsDone: 0, streakBest: 0, crates: 0, defused: 0, rushes: 0, vacuumed: 0 },
  daily: { date: "", progress: {}, claimed: {}, bonus: false },
  login: { last: "", count: 0, claimed: "" },
  trophies: {},
  tips: {},
  muted: false,
});
function load() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw) {
      for (const k of Object.keys(d)) {
        if (raw[k] === undefined) continue;
        d[k] = typeof d[k] === "object" && !Array.isArray(d[k]) ? { ...d[k], ...raw[k] } : raw[k];
      }
    }
    // build 43: the economy was rebalanced. A save from before then is brought in line once:
    // coins are capped at 300 and the rest exchanged for gold mystery blocks (1 per 1200, up to
    // 5), and stockpiled power-ups are trimmed to 5 each. A note explains it on the next start.
    if (raw && !raw.econ) {
      const was = d.coins;
      const boxes = Math.min(5, Math.floor(Math.max(0, was - ECON_CAP) / 1200));
      d.coins = Math.min(was, ECON_CAP);
      for (let i = 0; i < boxes; i++) d.workshop.boxes.push("gold");
      const trimmed = {};
      for (const k of Object.keys(d.inv)) if (d.inv[k] > ECON_INV) (trimmed[k] = d.inv[k] - ECON_INV), (d.inv[k] = ECON_INV);
      d.econ = 2;
      if (was > ECON_CAP || Object.keys(trimmed).length) d.econNote = { was, boxes, trimmed };
    }
  } catch (e) {
    /* storage blocked or corrupted: start fresh */
  }
  return d;
}
let S = load();
if (S.econNote) save(); // keep the rebalance even if the note is never seen
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {
    /* the game still works without saving */
  }
}
// handy while building: ?reset=1 wipes everything, ?level=N is ignored (levels are one-way)
const qs = new URLSearchParams(location.search);
if (qs.get("reset")) {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    /* nothing to reset */
  }
  S = load();
  history.replaceState(null, "", location.pathname);
}
if (qs.get("skin")) S.skin = qs.get("skin") === "real" ? "real" : "classic";
applySkin();
// ?skip=N fast-forwards N levels (for testing only)
const SKIP = parseInt(qs.get("skip"), 10);

// block look: classic or realistic (runs while this file loads, so it lives here)
function applySkin() {
  document.body.classList.toggle("skin-real", S.skin === "real");
}

// ---------------------------------------------------------------- dates
const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayStr = () => dayStr(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayStr(d);
};

// ---------------------------------------------------------------- levels & worlds
let LEVELS = [];
let worldStart = []; // global index of the first level of each world
let worldCount = []; // how many levels in each world

async function loadLevels() {
  const res = await fetch("levels.json?v=50");
  LEVELS = await res.json();
  WORLDS.forEach((_, w) => {
    const idxs = LEVELS.map((l, i) => (l.world === w ? i : -1)).filter((i) => i >= 0);
    worldStart[w] = idxs.length ? idxs[0] : LEVELS.length;
    worldCount[w] = idxs.length;
  });
}
const worldOfLevel = (i) => LEVELS[Math.min(i, LEVELS.length - 1)].world;
const nextLevelIndex = () => S.cleared; // the only level you can play
const allDone = () => S.cleared >= LEVELS.length;
const clearedInWorld = (w) => Math.max(0, Math.min(worldCount[w], S.cleared - worldStart[w]));
const worldUnlocked = (w) => worldCount[w] > 0 && worldStart[w] <= S.cleared;
const worldDone = (w) => worldCount[w] > 0 && clearedInWorld(w) >= worldCount[w];
const currentWorld = () => (allDone() ? WORLDS.length - 1 : worldOfLevel(S.cleared));
// ECONOMY (rebalanced in build 42): a level pays about 15-30 coins, so a power-up costs a few
// levels of play and the free ones from chests and the Workshop feel like real prizes.
const TIER_BONUS = { Easy: 0, Normal: 2, Hard: 5, "Very hard": 10 };
const COST = { undo: 40, hammer: 120, freeze: 80, vacuum: 200, magnet: 220, ghost: 150, saw: 130, paint: 180, hourglass: 60, rocket: 100 };
const POWER_NAME = { undo: "Undo", hammer: "Hammer", freeze: "Time Freeze", vacuum: "Vacuum", magnet: "Magnet", ghost: "Ghost", saw: "Saw", paint: "Rainbow Brush", hourglass: "Hourglass", rocket: "Rocket" };
const POWER_TEXT = {
  undo: "Take back your last move",
  hammer: "Smash any one block off the board",
  freeze: "Stops the clock for 10 seconds",
  vacuum: "Sucks up every block of the colour you tap",
  magnet: "Every block with a clear path to its gate zips out",
  ghost: "One block slides straight through the others",
  saw: "Cuts one square off a block",
  paint: "Paints a block rainbow: any gate will take it",
  hourglass: "Pick it before a level: +30 seconds on the clock",
  rocket: "Pick it before a level: knocks one block out at the start",
};

// ---------------------------------------------------------------- theme + background
function setTheme(w) {
  document.body.dataset.world = WORLDS[w].id;
  // if the phone ever leaves a gap below the page, show the theme colour instead of white
  const deco = $("deco");
  if (deco.dataset.w === WORLDS[w].id) return;
  deco.dataset.w = WORLDS[w].id;
  deco.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const d = el("i");
    d.style.left = Math.random() * 100 + "%";
    d.style.setProperty("--s", 0.5 + Math.random() * 1.1);
    d.style.animationDelay = -Math.random() * 14 + "s";
    d.style.animationDuration = 9 + Math.random() * 12 + "s";
    deco.appendChild(d);
  }
}

// ---------------------------------------------------------------- brick pictures (mosaics)
function mosaicCells(w) {
  const a = WORLDS[w];
  const cells = [];
  a.art.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch !== ".") cells.push({ r, c, color: a.pal[ch] });
    });
  });
  // build from the bottom up, left to right
  cells.sort((p, q) => q.r - p.r || p.c - q.c);
  return cells;
}
const mosaicTotal = (w) => mosaicCells(w).length;
const revealedFor = (w, cleared) =>
  worldCount[w] ? Math.round((mosaicTotal(w) * Math.min(cleared, worldCount[w])) / worldCount[w]) : 0;

// draws the picture: first `upTo` bricks in colour, the rest as a faint outline.
// bricks from `newFrom` up to `upTo` pop in one after another.
function renderMosaic(host, w, upTo, newFrom = upTo) {
  const a = WORLDS[w];
  const cols = Math.max(...a.art.map((r) => r.length));
  host.innerHTML = "";
  host.style.setProperty("--cols", cols);
  host.style.setProperty("--rows", a.art.length);
  const index = new Map(mosaicCells(w).map((c, i) => [c.r + "," + c.c, { ...c, i }]));
  for (let r = 0; r < a.art.length; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = index.get(r + "," + c);
      const d = el("i", "dot");
      if (cell) {
        if (cell.i < upTo) {
          d.style.setProperty("--c", cell.color);
          d.classList.add("on");
          if (cell.i >= newFrom) {
            d.classList.add("pop");
            d.style.animationDelay = 0.45 + (cell.i - newFrom) * Math.min(0.05, 2.2 / Math.max(1, upTo - newFrom)) + "s";
          }
        } else {
          d.classList.add("ghost");
          d.style.setProperty("--c", cell.color);
        }
      } else {
        d.classList.add("none");
      }
      host.appendChild(d);
    }
  }
}

// ---------------------------------------------------------------- toasts + sheets
function toast(html, kind = "") {
  const t = el("div", "toast " + kind, html);
  $("toasts").appendChild(t);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3100);
}

let sheetClose = null;
function openSheet(html, opts = {}) {
  const sheet = $("sheet");
  sheet.className = "sheet " + (opts.cls || "");
  sheet.innerHTML = html;
  $("modal").className = "overlay " + (opts.over || "");
  sheetClose = opts.onClose || null;
  return sheet;
}
function closeSheet() {
  $("modal").classList.add("hidden");
  const cb = sheetClose;
  sheetClose = null;
  if (cb) cb();
}
$("modal").addEventListener("pointerdown", (e) => {
  if (e.target === $("modal") && $("sheet").classList.contains("dismissable")) closeSheet();
});

function countUp(node, to, prefix = "", ms = 700) {
  if (!node) return; // the pop-up was closed before the count started
  const t0 = performance.now();
  (function frame(now) {
    if (!node.isConnected) return;
    const t = Math.min(1, (now - t0) / ms);
    node.textContent = prefix + Math.round(to * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(frame);
  })(t0);
}

// ---------------------------------------------------------------- coins, stars, top bar
function addCoins(n) {
  S.coins += n;
  if (n > 0) S.stats.coinsEarned += n;
  save();
  renderTop();
}
function renderTop() {
  $("coinCount").textContent = S.coins;
  $("starCount").textContent = S.starsTotal;
  $("gameCoins").textContent = S.coins;
  updateBoosters();
}
// the gear: settings (sound, block style)
$("soundBtn").innerHTML = ICON.gear;
$("avatarBtn").innerHTML = ICON.face;
document.querySelectorAll(".tab-ic").forEach((i) => (i.innerHTML = ICON[i.dataset.ic]));
$("avatarBtn").addEventListener("click", () => showPane("Trophies"));
$("coinPlus").addEventListener("click", () => showPane("Shop"));
function openSettings() {
  const row = (id, label, on) => '<button class="set-row" id="' + id + '"><span>' + label + '</span><i class="toggle' + (on ? " on" : "") + '"></i></button>';
  openSheet(
    '<div class="ribbon">Settings</div><div class="sheet-body small"><div class="set-list">' +
      row("setSound", "Sound", !S.muted) + row("setSkin", "Realistic blocks", S.skin === "real") +
      '</div><button class="btn-big green" id="setDone">Done</button></div>',
    { cls: "dismissable" },
  );
  $("setSound").addEventListener("click", () => {
    S.muted = !S.muted;
    Sfx.setMuted(S.muted);
    save();
    if (!S.muted) Sfx.tap();
    $("setSound").querySelector(".toggle").classList.toggle("on", !S.muted);
  });
  $("setSkin").addEventListener("click", () => {
    S.skin = S.skin === "real" ? "classic" : "real";
    save();
    applySkin();
    $("setSkin").querySelector(".toggle").classList.toggle("on", S.skin === "real");
  });
  $("setDone").addEventListener("click", closeSheet);
}
$("soundBtn").addEventListener("click", openSettings);
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) {
    Sfx.unlock();
    if (!e.target.closest(".booster")) Sfx.tap();
  }
});

// ---------------------------------------------------------------- tabs
let activePane = "Home";
function showPane(name) {
  activePane = name;
  document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== "pane" + name));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.pane === name));
  if (name === "Home") renderHome();
  if (name === "Map") renderMap();
  if (name === "Quests") renderQuests();
  if (name === "Shop") renderShop();
  if (name === "Trophies") renderTrophies();
  if (name === "Workshop") renderWorkshop();
  if (name === "Collection") renderCollection();
  document.body.classList.toggle("on-home", name === "Home");
}
$("tabbar").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (t) showPane(t.dataset.pane);
});
function showHub(pane = activePane) {
  $("game").hidden = true;
  $("hub").hidden = false;
  showPane(pane);
}
