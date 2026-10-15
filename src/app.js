// APP: everything around the puzzle: save data, worlds, map, quests, shop,
// trophies, rewards, sound and screens. engine.js handles the board itself.

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
  inv: { undo: 2, hammer: 1, freeze: 2, vacuum: 1, magnet: 0, ghost: 0, saw: 0, paint: 0 },
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

// ---------------------------------------------------------------- dates
const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayStr = () => dayStr(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayStr(d);
};

// ---------------------------------------------------------------- icons
const ICON = {
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8L12 2.2Z"/></svg>',
  lock: '<svg class="lock" viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.2c.9 0 1.8.9 1.8 1.8v8.4c0 .9-.9 1.8-1.8 1.8H5.8C4.9 22 4 21.1 4 20.2v-8.4C4 10.9 4.9 10 5.8 10H7Zm2.2 0h5.6V8a2.8 2.8 0 0 0-5.6 0v2Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m9.5 17.2-5-5 1.8-1.8 3.2 3.2 8.2-8.2 1.8 1.8-10 10Z"/></svg>',
  chest: '<svg viewBox="0 0 48 48"><rect x="5" y="19" width="38" height="22" rx="4" fill="#c97a2e"/><rect x="5" y="19" width="38" height="7" fill="#e3984a"/><path d="M5 19a19 12 0 0 1 38 0Z" fill="#e3984a"/><path d="M5 19a19 12 0 0 1 38 0" fill="none" stroke="#8a4f17" stroke-width="2"/><rect x="21" y="22" width="6" height="9" rx="2" fill="#ffd447" stroke="#b8941a" stroke-width="1.5"/><rect x="5" y="19" width="38" height="22" rx="4" fill="none" stroke="#8a4f17" stroke-width="2"/></svg>',
  chestOpen: '<svg viewBox="0 0 48 48"><circle cx="24" cy="20" r="17" fill="#ffe27a" opacity=".55"/><rect x="5" y="24" width="38" height="18" rx="4" fill="#c97a2e" stroke="#8a4f17" stroke-width="2"/><rect x="8" y="21" width="32" height="6" rx="3" fill="#ffd447"/><g transform="rotate(-32 6 26)"><path d="M5 26a19 12 0 0 1 38 0Z" fill="#e3984a" stroke="#8a4f17" stroke-width="2"/></g></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M12 5V2L6.5 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8Z"/></svg>',
  hammer: '<svg viewBox="0 0 24 24"><path d="M13.5 3 9 7.5l1.6 1.6-6.9 6.9 2.3 2.3 6.9-6.9 1.6 1.6L19 8.5 13.5 3Zm-.2 2.6 3.1 3.1-1.7 1.7-3.1-3.1 1.7-1.7Z"/></svg>',
  freeze: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v6l4.2 2.5 1-1.7L13 12V7h-2Z"/></svg>',
  vacuum: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9h2a7 7 0 0 1 7-7V3Zm0 4a5 5 0 0 0-5 5h2a3 3 0 0 1 3-3V7Zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm9 1a9 9 0 0 1-9 9v-2a7 7 0 0 0 7-7h2Zm-4 0a5 5 0 0 1-5 5v-2a3 3 0 0 0 3-3h2Z"/></svg>',
  // Workshop gadgets
  magnet: '<svg viewBox="0 0 24 24"><path d="M5 3h4v8a3 3 0 0 0 6 0V3h4v8a7 7 0 0 1-14 0V3Zm0 2v2h4V5H5Zm10 0v2h4V5h-4Z"/></svg>',
  ghost: '<svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8v11l2.7-2 2.6 2 2.7-2 2.7 2 2.6-2L20 21V10a8 8 0 0 0-8-8Zm-3 7a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 9 9Zm6 0a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 15 9Z"/></svg>',
  saw: '<svg viewBox="0 0 24 24"><path d="M12 1.5l2 3 3.4-1 .5 3.5 3.4 1-1.6 3.1 2.3 2.6-3.1 1.6.2 3.5-3.5-.4-1.6 3.1-2-2.9-2 2.9-1.6-3.1-3.5.4.2-3.5L1.2 14l2.3-2.6L1.9 8.3l3.4-1 .5-3.5 3.4 1 2.8-3.3ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>',
  paint: '<svg viewBox="0 0 24 24"><path d="M20.7 2.3a1.5 1.5 0 0 0-2.1 0L9.8 11.1l3.1 3.1 8.8-8.8a1.5 1.5 0 0 0 0-2.1l-1-1ZM8.4 12.6C6 12.6 4.6 14 4.4 16.2 4.2 18 3.4 19.3 2 20c3.6 1.5 7.6.6 8.9-2.2.6-1.3.4-2.6-.4-3.4l-2.1-1.8Z"/></svg>',
  rush: '<svg viewBox="0 0 48 48"><rect x="6" y="14" width="36" height="28" rx="4" fill="#c97a2e" stroke="#8a4f17" stroke-width="2"/><path d="M6 24h36M6 33h36" stroke="#8a4f17" stroke-width="2"/><path d="M24 3l3 6 6 1-4.5 4 1 6.500-5.500-3-5.500 3 1-6.500L15 10l6-1 3-6Z" fill="#ffd447" stroke="#b8941a" stroke-width="1.5"/></svg>',
  workshop: '<svg viewBox="0 0 48 48"><rect x="8" y="14" width="32" height="28" rx="5" fill="#ffb020" stroke="#9a5a00" stroke-width="2"/><rect x="8" y="14" width="32" height="9" rx="4" fill="#ffd36a"/><path d="M24 14v28M8 27h32" stroke="#8b5cf6" stroke-width="5"/><path d="M24 14c-6-9-14-5-9 0m9 0c6-9 14-5 9 0" fill="none" stroke="#8b5cf6" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="31" r="6.5" fill="#fff" stroke="#8b5cf6" stroke-width="2"/><path d="M21.8 29.3a2.3 2.3 0 1 1 3.2 2.1c-.7.3-1 .7-1 1.4M24 35.2v.1" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/></svg>',
  quest: '<svg viewBox="0 0 48 48"><rect x="9" y="6" width="30" height="36" rx="5" fill="#fff1d6"/><rect x="9" y="6" width="30" height="36" rx="5" fill="none" stroke="#b78a4a" stroke-width="2"/><path d="M15 18h18M15 26h18M15 34h11" stroke="#b78a4a" stroke-width="3" stroke-linecap="round"/><path d="m31 33 3 3 6-7" fill="none" stroke="#25b86b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flame: '<svg viewBox="0 0 48 48"><path d="M24 4c2 8 11 12 11 24a11 11 0 0 1-22 0c0-5 3-8 5-11 1 3 2 4 4 5-1-8 0-12 2-18Z" fill="#ff8a3d"/><path d="M24 22c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 2 3 3-1-4-1-6 0-8Z" fill="#ffd447"/></svg>',
  sndOn: '<path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2ZM14.5 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z"/>',
  sndOff: '<path d="M4 9v6h4l5 4V5L8 9H4Zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4Z"/>',
};

// ---------------------------------------------------------------- levels & worlds
let LEVELS = [];
let worldStart = []; // global index of the first level of each world
let worldCount = []; // how many levels in each world

async function loadLevels() {
  const res = await fetch("levels.json?v=1");
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
const COST = { undo: 40, hammer: 120, freeze: 80, vacuum: 200, magnet: 220, ghost: 150, saw: 130, paint: 180 };
const POWER_NAME = { undo: "Undo", hammer: "Hammer", freeze: "Time Freeze", vacuum: "Vacuum", magnet: "Magnet", ghost: "Ghost", saw: "Saw", paint: "Rainbow Brush" };
const POWER_TEXT = {
  undo: "Take back your last move",
  hammer: "Smash any one block off the board",
  freeze: "Stops the clock for 10 seconds",
  vacuum: "Sucks up every block of the colour you tap",
  magnet: "Every block with a clear path to its gate zips out",
  ghost: "One block slides straight through the others",
  saw: "Cuts one square off a block",
  paint: "Paints a block rainbow: any gate will take it",
};

// ---------------------------------------------------------------- theme + background
function setTheme(w) {
  document.body.dataset.world = WORLDS[w].id;
  // if the phone ever leaves a gap below the page, show the theme colour instead of white
  const nav = document.querySelector(".tabbar");
  if (nav) document.documentElement.style.background = getComputedStyle(nav).backgroundColor;
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
  $("modal").classList.remove("hidden");
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
  const t0 = performance.now();
  (function frame(now) {
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
  $("soundIcon").innerHTML = Sfx.isMuted() ? ICON.sndOff : ICON.sndOn;
  updateBoosters();
}
$("soundBtn").addEventListener("click", () => {
  S.muted = !S.muted;
  Sfx.setMuted(S.muted);
  save();
  renderTop();
  if (!S.muted) Sfx.tap();
});
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

// ---------------------------------------------------------------- home
function renderHome() {
  const w = currentWorld();
  setTheme(w);
  const W = WORLDS[w];
  $("worldIndex").textContent = "World " + (w + 1) + " of " + WORLDS.length;
  $("worldName").textContent = W.name;
  const k = clearedInWorld(w);
  $("worldProg").textContent = k + "/" + worldCount[w];
  $("pictureNote").textContent = worldDone(w) ? "Picture complete: " + W.picture : "Rebuilding: " + W.picture;
  $("worldBar").style.width = (100 * k) / Math.max(1, worldCount[w]) + "%";
  renderMosaic($("homeMosaic"), w, revealedFor(w, k));

  const play = $("playBtn");
  if (allDone()) {
    $("playLevel").textContent = "All worlds rebuilt!";
    $("playSub").textContent = "More worlds are on the way";
    play.disabled = true;
  } else {
    const lv = LEVELS[S.cleared];
    $("playLevel").textContent = "Play level " + (S.cleared + 1);
    $("playSub").textContent = (lv.difficulty || "Easy") + " · " + W.name;
    play.disabled = false;
  }

  $("chestIc").innerHTML = ICON.chest;
  $("questIc").innerHTML = ICON.quest;
  $("rushIc").innerHTML = ICON.rush;
  const rb = $("rushBadge");
  rb.hidden = S.bonus <= 0;
  rb.textContent = S.bonus;
  $("tileRush").classList.toggle("glow", S.bonus > 0);
  const cb = $("chestBadge");
  cb.hidden = S.chests <= 0;
  cb.textContent = S.chests;
  $("tileChest").classList.toggle("glow", S.chests > 0);
  renderWsStrip($("wsStrip")); // the Workshop, right under the world's picture (workshop.js)
  const ready = questsReady();
  [$("questBadge"), $("tabQuestBadge")].forEach((b) => {
    b.hidden = ready <= 0;
    b.textContent = ready;
  });
  renderTop();
}
$("playBtn").addEventListener("click", () => {
  if (!allDone()) startLevel();
});
$("tileChest").addEventListener("click", openChest);
$("tileQuests").addEventListener("click", () => showPane("Quests"));
$("tileRush").addEventListener("click", () => openRush());
$("wsStrip").addEventListener("click", () => showPane("Workshop"));

// ---------------------------------------------------------------- map
let mapWorld = 0;
function renderMap(selectWorld) {
  mapWorld = selectWorld != null ? selectWorld : currentWorld();
  const tabs = $("worldTabs");
  tabs.innerHTML = "";
  WORLDS.forEach((W, w) => {
    const b = el("button", "wtab" + (w === mapWorld ? " on" : "") + (worldUnlocked(w) ? "" : " locked"));
    b.dataset.w = W.id;
    b.innerHTML = (worldUnlocked(w) ? "<b>" + (w + 1) + "</b>" : ICON.lock) + "<span>" + W.name.split(" ")[0] + "</span>";
    b.addEventListener("click", () => renderMap(w));
    tabs.appendChild(b);
  });
  setTheme(mapWorld);

  const path = $("mapPath");
  path.innerHTML = "";
  const n = worldCount[mapWorld];
  const SP = 92;
  const H = n * SP + 120;
  path.style.height = H + "px";
  const pos = (i) => ({ x: 50 + Math.sin(i * 1.0 + 0.6) * 24, y: H - 70 - i * SP });
  // the winding road
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "road");
  svg.setAttribute("viewBox", "0 0 100 " + H);
  svg.setAttribute("preserveAspectRatio", "none");
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pos(i);
    d += (i ? " S " : "M ") + (i ? (p.x + (pos(i - 1).x - p.x) * 0.2) + " " + (p.y + SP * 0.5) + ", " : "") + p.x + " " + p.y;
  }
  const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathEl.setAttribute("d", d);
  svg.appendChild(pathEl);
  path.appendChild(svg);

  for (let i = 0; i < n; i++) {
    const g = worldStart[mapWorld] + i;
    const p = pos(i);
    const done = g < S.cleared;
    const cur = g === S.cleared;
    const node = el("button", "mnode" + (done ? " done" : "") + (cur ? " current" : "") + (!done && !cur ? " locked" : ""));
    node.style.left = p.x + "%";
    node.style.top = p.y + "px";
    node.dataset.tier = (LEVELS[g].difficulty || "Easy").toLowerCase().replace(" ", "-");
    if (done) {
      const st = S.stars[g] || 1;
      node.innerHTML = '<span class="mn-check">' + ICON.check + '</span><span class="mn-stars">' + "★".repeat(st) + '<u>' + "★".repeat(3 - st) + "</u></span>";
      node.disabled = true;
      node.setAttribute("aria-label", "Level " + (g + 1) + " cleared with " + st + " stars");
    } else if (cur) {
      node.innerHTML = '<span class="mn-num">' + (g + 1) + '</span><span class="mn-go">PLAY</span>';
      node.addEventListener("click", startLevel);
    } else {
      node.innerHTML = ICON.lock;
      node.disabled = true;
    }
    path.appendChild(node);
    // a chest marker after every third level
    if ((i + 1) % 3 === 0 && i < n - 1) {
      const q = pos(i + 0.5);
      const ch = el("div", "mchest" + (g < S.cleared ? " got" : ""), ICON.chest);
      ch.style.left = q.x + (q.x > 50 ? -17 : 17) + "%";
      ch.style.top = q.y + "px";
      path.appendChild(ch);
    }
  }
  // the world's final prize
  const top = pos(n - 1);
  const flag = el("div", "mflag" + (worldDone(mapWorld) ? " got" : ""), "<span>" + WORLDS[mapWorld].picture + "</span>");
  flag.style.left = "50%";
  flag.style.top = top.y - 66 + "px";
  path.appendChild(flag);

  const lock = !worldUnlocked(mapWorld);
  path.classList.toggle("dim", lock);
  const scroll = $("mapScroll");
  const focus = Math.max(0, Math.min(n - 1, S.cleared - worldStart[mapWorld]));
  requestAnimationFrame(() => {
    scroll.scrollTop = Math.max(0, pos(focus).y - scroll.clientHeight * 0.6);
  });
}

// ---------------------------------------------------------------- daily quests
const QUEST_POOL = [
  { id: "clear3", text: "Clear 3 levels", ev: "clear", goal: 3, reward: 20 },
  { id: "clear2", text: "Clear 2 levels", ev: "clear", goal: 2, reward: 12 },
  { id: "stars6", text: "Earn 6 stars", ev: "stars", goal: 6, reward: 22 },
  { id: "stars4", text: "Earn 4 stars", ev: "stars", goal: 4, reward: 15 },
  { id: "nopower", text: "Clear a level without power-ups", ev: "nopower", goal: 1, reward: 20 },
  { id: "combo3", text: "Reach a x3 combo", ev: "combo", goal: 3, reward: 20, max: true },
  { id: "combo4", text: "Reach a x4 combo", ev: "combo", goal: 4, reward: 25, max: true },
  { id: "three", text: "Finish a level with 3 stars", ev: "three", goal: 1, reward: 20 },
  { id: "exits25", text: "Slide 25 blocks out", ev: "exits", goal: 25, reward: 15 },
  { id: "crates4", text: "Smash 4 crates", ev: "crates", goal: 4, reward: 18, needsCrate: true },
  { id: "thaw2", text: "Melt 2 frozen blocks", ev: "thawed", goal: 2, reward: 20, needsIce: true },
];
function hashStr(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function todaysQuests() {
  const pool = QUEST_POOL.filter((q) => !q.needsIce || S.cleared >= 9 && (!q.needsCrate || S.cleared >= 17));
  let seed = hashStr(todayStr());
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296);
  const picked = [];
  const used = new Set();
  while (picked.length < 3 && picked.length < pool.length) {
    const q = pool[Math.floor(rnd() * pool.length)];
    const family = q.ev; // never two of the same kind
    if (used.has(family)) continue;
    used.add(family);
    picked.push(q);
  }
  return picked;
}
function rollDaily() {
  if (S.daily.date !== todayStr()) {
    S.daily = { date: todayStr(), progress: {}, claimed: {}, bonus: false };
    save();
  }
}
function questEvent(ev, amount = 1) {
  rollDaily();
  todaysQuests().forEach((q) => {
    if (q.ev !== ev) return;
    const cur = S.daily.progress[q.id] || 0;
    S.daily.progress[q.id] = q.max ? Math.max(cur, amount) : cur + amount;
  });
  save();
}
function questsReady() {
  rollDaily();
  return todaysQuests().filter((q) => (S.daily.progress[q.id] || 0) >= q.goal && !S.daily.claimed[q.id]).length;
}
function renderQuests() {
  rollDaily();
  const qs = todaysQuests();
  const list = $("questList");
  list.innerHTML = "";
  qs.forEach((q) => {
    const p = Math.min(q.goal, S.daily.progress[q.id] || 0);
    const done = p >= q.goal;
    const claimed = !!S.daily.claimed[q.id];
    const row = el("div", "row quest" + (claimed ? " claimed" : done ? " ready" : ""));
    row.innerHTML =
      '<div class="row-main"><b>' + q.text + '</b><div class="bar small"><i style="width:' + (100 * p) / q.goal + '%"></i></div><small>' + p + " / " + q.goal + "</small></div>";
    const btn = el("button", "chip-btn", claimed ? "Done" : done ? '<i class="coin"></i>' + q.reward : '<i class="coin"></i>' + q.reward);
    btn.disabled = !done || claimed;
    if (done && !claimed) {
      btn.classList.add("go");
      btn.addEventListener("click", () => {
        S.daily.claimed[q.id] = true;
        S.stats.questsDone++;
        addCoins(q.reward);
        Sfx.coin();
        toast('<i class="coin"></i> +' + q.reward + " coins");
        checkTrophies();
        renderQuests();
        renderHome();
      });
    }
    row.appendChild(btn);
    list.appendChild(row);
  });
  const allClaimed = qs.every((q) => S.daily.claimed[q.id]);
  const bonus = el("div", "row bonus" + (S.daily.bonus ? " claimed" : allClaimed ? " ready" : ""));
  bonus.innerHTML = '<div class="row-main"><b>Finish all three</b><small>Bonus chest</small></div>';
  const bb = el("button", "chip-btn", S.daily.bonus ? "Done" : ICON.chest);
  bb.disabled = !allClaimed || S.daily.bonus;
  if (allClaimed && !S.daily.bonus) {
    bb.classList.add("go");
    bb.addEventListener("click", () => {
      S.daily.bonus = true;
      S.chests++;
      save();
      Sfx.unlock_();
      toast("Bonus chest added!");
      renderQuests();
      renderHome();
    });
  }
  bonus.appendChild(bb);
  list.appendChild(bonus);

  const days = $("streakDays");
  days.innerHTML = "";
  const count = S.login.count;
  for (let i = 0; i < 7; i++) {
    const done = count > 0 && i < ((count - 1) % 7) + 1 && S.login.claimed === todayStr() ? true : count > 0 && i < (count - 1) % 7;
    const d = el("div", "sday" + (done ? " done" : ""));
    d.innerHTML = "<span>Day " + (i + 1) + "</span>" + (i === 6 ? ICON.chest : '<i class="coin"></i><b>' + LOGIN_REWARDS[i] + "</b>");
    days.appendChild(d);
  }
  $("questReset").textContent = "New quests tomorrow. Clear levels to make progress.";
}

// ---------------------------------------------------------------- login streak
const LOGIN_REWARDS = [10, 15, 20, 25, 30, 40, 50];
function checkLogin() {
  const t = todayStr();
  if (S.login.claimed === t) return;
  if (S.login.last !== t) {
    S.login.count = S.login.last === yesterdayStr() ? S.login.count + 1 : 1;
    S.login.last = t;
    S.stats.streakBest = Math.max(S.stats.streakBest, S.login.count);
    save();
  }
  const day = (S.login.count - 1) % 7;
  let cells = "";
  for (let i = 0; i < 7; i++) {
    cells +=
      '<div class="sday' + (i < day ? " done" : "") + (i === day ? " today" : "") + '"><span>Day ' + (i + 1) + "</span>" +
      (i === 6 ? ICON.chest : '<i class="coin"></i><b>' + LOGIN_REWARDS[i] + "</b>") + "</div>";
  }
  const sheet = openSheet(
    '<div class="ribbon">Welcome back!</div><div class="sheet-body"><div class="flame">' + ICON.flame + '</div><h3>Day ' + S.login.count + ' streak</h3><p>Come back every day for bigger rewards.</p><div class="streak-days">' + cells + '</div><button class="btn-big green" id="claimLogin">Claim ' + (day === 6 ? "chest + 100" : LOGIN_REWARDS[day]) + ' <i class="coin"></i></button></div>',
  );
  $("claimLogin").addEventListener("click", () => {
    S.login.claimed = t;
    addCoins(LOGIN_REWARDS[day]);
    if (day === 6) S.chests++;
    Sfx.coin();
    save();
    checkTrophies();
    closeSheet();
    renderHome();
  });
}

// ---------------------------------------------------------------- economy update note (once)
function showEconNote() {
  const n = S.econNote;
  const trimmed = Object.keys(n.trimmed || {});
  openSheet(
    '<div class="ribbon gold">Game update</div><div class="sheet-body"><h3>Rewards mean more now</h3>' +
      "<p>Coins and power-ups were far too easy to come by, so every prize is worth more from here on: levels, quests and Bonus Rush pay less, and power-ups cost more.</p>" +
      '<div class="loot">' +
      (n.was > ECON_CAP ? '<div class="loot-row"><span><i class="coin"></i></span><b>' + n.was + " coins → " + ECON_CAP + "</b></div>" : "") +
      (n.boxes ? '<div class="loot-row"><span>' + ICON.workshop + "</span><b>+" + n.boxes + " gold mystery block" + (n.boxes > 1 ? "s" : "") + " for the rest</b></div>" : "") +
      (trimmed.length ? '<div class="loot-row"><span>' + powerGlyph(trimmed[0]) + "</span><b>Power-ups kept: up to " + ECON_INV + " of each</b></div>" : "") +
      '</div><button class="btn-big green" id="econOk">Got it</button></div>',
  );
  $("econOk").addEventListener("click", () => {
    delete S.econNote;
    save();
    closeSheet();
    renderHome();
    setTimeout(checkLogin, 300);
  });
}

// ---------------------------------------------------------------- chests
function openChest() {
  if (S.chests <= 0) {
    toast("Earn a chest every 3 levels, or from daily quests.");
    Sfx.error();
    return;
  }
  openSheet(
    '<div class="sheet-body chest-sheet"><div class="chest-big" id="chestBig">' + ICON.chest + '</div><h3>' + (S.chests > 1 ? "You have " + S.chests + " chests!" : "You have a chest!") + '</h3><p>Tap it to open.</p><div class="loot" id="loot"></div><button class="btn-big green" id="chestBtn" hidden>Awesome!</button></div>',
  );
  let opened = false;
  $("chestBig").addEventListener("click", () => {
    if (opened) return;
    opened = true;
    S.chests--;
    $("chestBig").classList.add("opened");
    $("chestBig").innerHTML = ICON.chestOpen;
    Sfx.chestOpen();
    const coins = 15 + Math.floor(Math.random() * 6) * 5;
    const types = ["undo", "hammer", "freeze", "vacuum"];
    const a = types[Math.floor(Math.random() * 4)];
    const b = types[Math.floor(Math.random() * 4)];
    S.inv[a]++;
    S.inv[b]++;
    addCoins(coins);
    const loot = [['<i class="coin"></i>', "+" + coins], [powerGlyph(a), "+1 " + POWER_NAME[a]], [powerGlyph(b), "+1 " + POWER_NAME[b]]];
    const box = $("loot");
    loot.forEach(([ic, tx], i) => {
      const r = el("div", "loot-row", "<span>" + ic + "</span><b>" + tx + "</b>");
      r.style.animationDelay = 0.35 + i * 0.25 + "s";
      box.appendChild(r);
    });
    // more chests waiting? the button goes straight on to the next one
    const next = $("chestBtn");
    if (S.chests > 0) next.textContent = "Next chest (" + S.chests + " left)";
    next.hidden = false;
    next.addEventListener("click", () => {
      closeSheet();
      renderHome();
      if (S.chests > 0) openChest();
    });
    save();
    renderTop();
  });
}
const powerGlyph = (t) => '<i class="pw pw-' + t + '">' + ICON[t] + "</i>";

// ---------------------------------------------------------------- shop
const SHOP = ["undo", "hammer", "freeze", "vacuum"].map((id) => ({ id, name: POWER_NAME[id], desc: POWER_TEXT[id], icon: id }));
function applySkin() {
  document.body.classList.toggle("skin-real", S.skin === "real");
}
function renderShop() {
  const list = $("shopList");
  list.innerHTML = "";
  // free cosmetic: block style
  const skinRow = el("div", "row shop skin-row");
  skinRow.innerHTML = '<div class="skin-swatch"><i></i></div><div class="row-main"><b>Block style</b><small>' + (S.skin === "real" ? "Realistic: glossy molded plastic" : "Classic: bright and flat") + "</small></div>";
  const sb = el("button", "chip-btn go", S.skin === "real" ? "Classic" : "Realistic");
  sb.addEventListener("click", () => {
    S.skin = S.skin === "real" ? "classic" : "real";
    save();
    applySkin();
    Sfx.coin();
    renderShop();
  });
  skinRow.appendChild(sb);
  list.appendChild(skinRow);
  workshopShopRows(list); // gadgets you've built
  SHOP.forEach((it) => {
    [1, 3].forEach((qty) => {
      const price = qty === 1 ? COST[it.id] : Math.round(COST[it.id] * 3 * 0.8);
      const row = el("div", "row shop");
      row.innerHTML =
        powerGlyph(it.icon) + '<div class="row-main"><b>' + it.name + (qty === 3 ? " x3" : "") + "</b><small>" + (qty === 3 ? "Save 20%" : it.desc) + (qty === 1 ? " · you have " + S.inv[it.id] : "") + "</small></div>";
      const btn = el("button", "chip-btn go", '<i class="coin"></i>' + price);
      btn.addEventListener("click", () => buy(it.id, qty, price));
      row.appendChild(btn);
      list.appendChild(row);
    });
  });
}
function buy(id, qty, price) {
  if (S.coins < price) {
    Sfx.error();
    toast("Not enough coins yet. Clear levels to earn more.");
    return false;
  }
  S.coins -= price;
  S.inv[id] += qty;
  save();
  Sfx.coin();
  renderTop();
  if (activePane === "Shop") renderShop();
  toast("+" + qty + " " + POWER_NAME[id]);
  return true;
}

// ---------------------------------------------------------------- trophies
const TROPHIES = [
  { id: "first", name: "First Slide", desc: "Clear a level", get: () => S.stats.levels, goal: 1 },
  { id: "ten", name: "Warming Up", desc: "Clear 10 levels", get: () => S.stats.levels, goal: 10 },
  { id: "thirty", name: "Block Star", desc: "Clear 30 levels", get: () => S.stats.levels, goal: 30 },
  { id: "perf5", name: "Perfectionist", desc: "Get 3 stars on 5 levels", get: () => S.stats.perfect, goal: 5 },
  { id: "perf20", name: "Flawless", desc: "Get 3 stars on 20 levels", get: () => S.stats.perfect, goal: 20 },
  { id: "combo3", name: "Chain Reaction", desc: "Reach a x3 combo", get: () => S.stats.bestCombo, goal: 3 },
  { id: "combo5", name: "Combo King", desc: "Reach a x5 combo", get: () => S.stats.bestCombo, goal: 5 },
  { id: "thaw", name: "Ice Breaker", desc: "Thaw 10 frozen blocks", get: () => S.stats.thawed, goal: 10 },
  { id: "blast", name: "Demolition", desc: "Use the Hammer 3 times", get: () => S.stats.blasted, goal: 3 },
  { id: "crates", name: "Crate Crusher", desc: "Smash 20 crates", get: () => S.stats.crates, goal: 20 },
  { id: "bombs", name: "Bomb Squad", desc: "Defuse 5 bombs", get: () => S.stats.defused, goal: 5 },
  { id: "rush", name: "Rush Hour", desc: "Play 3 Bonus Rushes", get: () => S.stats.rushes, goal: 3 },
  { id: "vac", name: "Hoover", desc: "Use the Vacuum 3 times", get: () => S.stats.vacuumed, goal: 3 },
  { id: "world1", name: "Picture Perfect", desc: "Finish a world's picture", get: () => S.stats.worlds, goal: 1 },
  { id: "world5", name: "Master Builder", desc: "Finish every picture", get: () => S.stats.worlds, goal: WORLDS.length },
  { id: "inventor", name: "Inventor", desc: "Build all 4 gadgets in the Workshop", get: () => S.workshop.built, goal: 4 },
  { id: "exits", name: "Traffic Controller", desc: "Slide 200 blocks out", get: () => S.stats.exits, goal: 200 },
  { id: "rich", name: "Piggy Bank", desc: "Earn 1000 coins in total", get: () => S.stats.coinsEarned, goal: 1000 },
  { id: "streak3", name: "Regular", desc: "Reach a 3-day streak", get: () => S.stats.streakBest, goal: 3 },
  { id: "streak7", name: "Weekly Hero", desc: "Reach a 7-day streak", get: () => S.stats.streakBest, goal: 7 },
  { id: "quests", name: "Taskmaster", desc: "Finish 10 daily quests", get: () => S.stats.questsDone, goal: 10 },
];
function checkTrophies() {
  TROPHIES.forEach((t) => {
    if (S.trophies[t.id] || t.get() < t.goal) return;
    S.trophies[t.id] = true;
    S.coins += 20;
    S.stats.coinsEarned += 20;
    save();
    toast('<b>Trophy: ' + t.name + '</b> · +20 <i class="coin"></i>', "gold");
    Sfx.unlock_();
  });
  renderTop();
}
function renderTrophies() {
  const got = TROPHIES.filter((t) => S.trophies[t.id]).length;
  $("trophySub").textContent = got + " of " + TROPHIES.length + " collected · +20 coins each";
  const grid = $("trophyGrid");
  grid.innerHTML = "";
  TROPHIES.forEach((t) => {
    const has = !!S.trophies[t.id];
    const p = Math.min(t.goal, t.get());
    const card = el("div", "trophy" + (has ? " got" : ""));
    card.innerHTML =
      '<div class="cup">' + (has ? "🏆" : ICON.lock) + "</div><b>" + t.name + "</b><small>" + t.desc + '</small><div class="bar small"><i style="width:' + (100 * p) / t.goal + '%"></i></div>';
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------- playing a level
let curIdx = 0;
let usedPower = false;
let combo = 0;
let bestCombo = 0;
let lastExit = 0;
let comboTimer = 0;
let toolMode = null; // "hammer" or "vacuum" while waiting for you to tap a block

// the clock
let timeLeft = 0;
let timeMax = 0;
let timerStarted = false;
let freezeUntil = 0;
let lastTick = 0;
let tickHandle = 0;

function startLevel() {
  $("hub").hidden = true;
  $("game").hidden = false;
  loadLevel(S.cleared);
}

function loadLevel(idx) {
  curIdx = idx;
  const L = JSON.parse(JSON.stringify(LEVELS[idx]));
  ROWS = L.rows || 6;
  COLS = L.cols || 6;
  buildBoard();
  blocks = L.blocks;
  exits = L.exits;
  boardWalls = L.walls || [];
  boardLava = L.lava || [];
  moves = 0;
  drag = null;
  undoStack = [];
  blastMode = false;
  toolMode = null;
  endGhost();
  hammerAimShow(false);
  levelOver = false;
  usedPower = false;
  combo = 0;
  bestCombo = 0;
  clearTimeout(comboTimer);
  $("combo").classList.remove("show");
  boardEl.classList.remove("blast-mode", "vac-mode", "boom");
  setTheme(L.world);
  boardEl.querySelectorAll(".block-group, .exit, .fx").forEach((e) => e.remove());
  blocks.forEach(renderBlock);
  exits.forEach(renderExit);
  renderBoardFeatures();
  resetHistory();
  $("levelTitle").textContent = "Level " + (idx + 1);
  $("levelWorld").textContent = WORLDS[L.world].name + " · " + (L.difficulty || "Easy");
  cancelAnimationFrame(tickHandle);
  timeMax = timeLeft = L.time || 60;
  timerStarted = false;
  freezeUntil = 0;
  renderTimer();
  buildGoal();
  updateHUD();
  renderTop();
  showTip(idx);
}
$("resetBtn").addEventListener("click", () => {
  if (!levelOver) loadLevel(curIdx);
});
$("homeBtn").addEventListener("click", () => {
  levelOver = true;
  cancelAnimationFrame(tickHandle);
  showHub("Home");
});

// ---- the clock: starts on your first touch, pauses while a pop-up is open
const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.ceil(s) % 60 === 0 && s % 60 !== 0 ? 0 : Math.floor(s % 60)).padStart(2, "0");
function renderTimer(frozen = false) {
  const t = $("timer");
  const s = Math.ceil(timeLeft);
  $("timerText").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  $("timerBar").style.transform = "scaleX(" + Math.max(0, timeLeft / timeMax) + ")";
  t.classList.toggle("low", timerStarted && timeLeft <= 10);
  t.classList.toggle("frozen", frozen);
  t.classList.toggle("idle", !timerStarted);
}
function startTimer() {
  if (timerStarted || levelOver) return;
  timerStarted = true;
  lastTick = performance.now();
  tickHandle = requestAnimationFrame(tick);
  updateBoosters();
}
// tapping a power-up before the first move just explains why it's locked
function lockedUntilStart(btn) {
  if (timerStarted) return false;
  shake($(btn));
  Sfx.error();
  toast("Make your first move to unlock power-ups");
  return true;
}
function tick(now) {
  tickHandle = 0;
  if (levelOver || !timerStarted) return;
  const dt = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  const frozen = now < freezeUntil;
  const paused = frozen || document.hidden || !$("modal").classList.contains("hidden");
  if (!paused) {
    const before = Math.ceil(timeLeft);
    timeLeft = Math.max(0, timeLeft - dt);
    burnFuses(dt);
    if (levelOver) return; // a bomb went off
    if (timeLeft <= 5 && Math.ceil(timeLeft) !== before && timeLeft > 0) Sfx.tap();
  }
  renderTimer(frozen);
  if (timeLeft <= 0) return timeUp();
  tickHandle = requestAnimationFrame(tick);
}
hooks.start = startTimer;

function timeUp() {
  if (levelOver) return;
  levelOver = true;
  blastMode = false;
  hammerAimShow(false);
  boardEl.classList.remove("blast-mode", "vac-mode");
  Sfx.error();
  const canBuy = S.coins >= CONTINUE_COST;
  openSheet(
    '<div class="ribbon red">Time\'s up!</div><div class="sheet-body small"><div class="big-emoji">⏰</div><h3>Out of time</h3><p>You can try this level again as often as you like.</p><div class="btn-row">' +
      '<button class="btn-big green" id="failRetry">Try again</button>' +
      '<button class="btn-big blue ' + (canBuy ? "" : "dim") + '" id="failMore">+20 seconds · ' + CONTINUE_COST + ' <i class="coin"></i></button>' +
      '<button class="btn-link" id="failHome">Back to home</button></div></div>',
  );
  $("failRetry").addEventListener("click", () => {
    closeSheet();
    loadLevel(curIdx);
  });
  $("failMore").addEventListener("click", () => {
    if (S.coins < CONTINUE_COST) {
      Sfx.error();
      return toast("Not enough coins");
    }
    S.coins -= CONTINUE_COST;
    save();
    closeSheet();
    levelOver = false;
    timeLeft = 20;
    timeMax = Math.max(timeMax, 20);
    lastTick = performance.now();
    renderTop();
    tickHandle = requestAnimationFrame(tick);
  });
  $("failHome").addEventListener("click", () => {
    closeSheet();
    showHub("Home");
  });
}
const CONTINUE_COST = 60;

// ---- a bomb ran out of moves
hooks.boom = (b) => {
  if (levelOver) return;
  levelOver = true;
  cancelAnimationFrame(tickHandle);
  Sfx.boom();
  boardEl.classList.add("boom");
  burst(
    PADDING + parseFloat(b.el.style.left) + parseFloat(b.el.style.width) / 2,
    PADDING + parseFloat(b.el.style.top) + parseFloat(b.el.style.height) / 2,
    "#ff9d2e",
    30,
  );
  setTimeout(() => {
    openSheet(
      '<div class="ribbon red">Boom!</div><div class="sheet-body small"><div class="big-emoji">💥</div><h3>The bomb went off</h3><p>Clear bomb blocks before their counter hits zero. Each move counts down once.</p><div class="btn-row"><button class="btn-big green" id="failRetry">Try again</button><button class="btn-link" id="failHome">Back to home</button></div></div>',
    );
    $("failRetry").addEventListener("click", () => {
      closeSheet();
      loadLevel(curIdx);
    });
    $("failHome").addEventListener("click", () => {
      closeSheet();
      showHub("Home");
    });
  }, 900);
};

// ---- crates
hooks.crateHit = () => Sfx.thud();
hooks.crateBreak = (b) => {
  Sfx.coin();
  S.stats.crates++;
  questEvent("crates", 1);
  const lucky = Math.random() < 0.12;
  if (lucky) {
    const types = ["undo", "hammer", "freeze", "vacuum"];
    const t = types[Math.floor(Math.random() * 4)];
    S.inv[t]++;
    toast(powerGlyph(t) + " Found a " + POWER_NAME[t] + "!");
  } else {
    S.coins += 3;
    S.stats.coinsEarned += 3;
    toast('<i class="coin"></i> +3');
  }
  save();
  renderTop();
  checkTrophies();
};

// the three star targets under the title
function buildGoal() {
  const par = LEVELS[curIdx].par || blocks.length;
  const mk = (t, label) => '<span class="gs" data-t="' + t + '">★<small>' + label + "</small></span>";
  $("goalStars").innerHTML = mk(999, "any") + mk(par + 2, "≤" + (par + 2)) + mk(par, "≤" + par);
}
function updateHUD() {
  $("moveCount").textContent = moves;
  [...$("goalStars").children].forEach((s) => s.classList.toggle("lost", moves > +s.dataset.t));
}
const starsFor = (m, par) => (m <= par ? 3 : m <= par + 2 ? 2 : 1);

// one-time hints the first time something new shows up
const TIPS = {
  0: "Drag a block to the gate with the same colour. The clock starts on your first move.",
  2: "Park blocks out of the way to free the ones you need.",
  8: "Bigger pieces need a gate as wide as they are.",
};
// the first time each kind of block shows up, explain it (newest kinds first)
const KIND_TIPS = [
  ["stump", (L) => (L.walls || []).length, "Tree stumps never move. Slide your blocks around them."],
  ["jelly", (L) => L.blocks.some((b) => b.jelly), "Jelly blocks are wobbly: they move just one square per drag."],
  ["lava", (L) => (L.lava || []).length, "Lava! Blocks can slide across it, but they can't stop on it."],
  ["comet", (L) => L.blocks.some((b) => b.comet), "Comets can't stop. Flick one and it flies until it hits something."],
  ["bubble", (L) => L.blocks.some((b) => b.bubble), "Bubbles float up one square after every move you make."],
  ["pillar", (L) => L.blocks.some((b) => b.pillar), "Sand pillars block the way, then crumble after that many moves."],
  ["rainbow", (L) => L.blocks.some((b) => b.rainbow), "Rainbow blocks can leave through a gate of any colour."],
  ["ice", (L) => L.blocks.some((b) => b.ice), "Frozen! It thaws after that many other blocks leave.", 9],
  ["axis", (L) => L.blocks.some((b) => b.axis), "Arrow blocks only slide along their arrow.", 15],
  ["crate", (L) => L.blocks.some((b) => b.crate), "Wooden crate: tap it twice to smash it for a prize.", 17],
  ["gray", (L) => L.blocks.some((b) => b.gray), "Gray blocks have no gate. Just shove them out of the way.", 20],
  ["chain", (L) => L.blocks.some((b) => b.lockBy != null), "Chained! The coloured ring on the padlock shows which block holds the key.", 30],
  ["bomb", (L) => L.blocks.some((b) => b.bomb), "Bomb! Clear it before its fuse burns down. It counts down while the clock runs.", 33],
];
let tipTimer = 0;
function showTip(idx) {
  const tip = $("tip");
  tip.classList.remove("show");
  clearTimeout(tipTimer);
  let text = null;
  if (TIPS[idx] && !S.tips[idx]) {
    S.tips[idx] = true;
    text = TIPS[idx];
  } else {
    const L = LEVELS[idx];
    for (const [key, has, msg, oldIdx] of KIND_TIPS) {
      if (S.tips[key] || (oldIdx != null && S.tips[oldIdx])) continue;
      if (!has(L)) continue;
      S.tips[key] = true;
      text = msg;
      break;
    }
  }
  if (!text) return;
  save();
  tip.textContent = text;
  setTimeout(() => tip.classList.add("show"), 400);
  tipTimer = setTimeout(() => tip.classList.remove("show"), 7000);
}
const hideTip = () => $("tip").classList.remove("show");

// ---- combos: slide blocks out in quick succession
hooks.exit = (block) => {
  hideTip();
  const now = performance.now();
  combo = combo > 0 && now - lastExit < 2500 ? combo + 1 : 1;
  lastExit = now;
  bestCombo = Math.max(bestCombo, combo);
  S.stats.exits++;
  S.stats.bestCombo = Math.max(S.stats.bestCombo, combo);
  if (block.bomb) S.stats.defused++;
  Sfx.exit(combo);
  if (combo >= 2) {
    Sfx.combo(combo);
    showCombo();
  }
  questEvent("exits", 1);
  if (combo >= 3) questEvent("combo", combo);
  checkTrophies();
};
hooks.move = () => {
  Sfx.pop();
  hideTip();
};
hooks.crack = () => {
  Sfx.crack();
  S.stats.thawed++;
  questEvent("thawed", 1);
};
function showCombo() {
  const c = $("combo");
  $("comboText").textContent = "Combo x" + combo;
  c.classList.remove("show", "pulse");
  void c.offsetWidth;
  c.classList.add("show", "pulse");
  c.dataset.level = Math.min(combo, 5);
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    c.classList.remove("show");
    combo = 0;
  }, 2500);
}

// ---------------------------------------------------------------- power-ups
const BOOSTERS = [
  { id: "undo", btn: "boosterUndo", cnt: "cntUndo" },
  { id: "hammer", btn: "boosterHammer", cnt: "cntHammer" },
  { id: "freeze", btn: "boosterFreeze", cnt: "cntFreeze" },
  { id: "vacuum", btn: "boosterVac", cnt: "cntVac" },
];
function updateBoosters() {
  const live = blocks.some((b) => isNeeded(b) && !b.removed);
  // power-ups unlock once the clock is running (your first move starts it)
  const can = live && !levelOver && timerStarted;
  const usable = {
    undo: can && undoStack.length > 0,
    hammer: can,
    freeze: can && timerStarted && performance.now() >= freezeUntil,
    vacuum: can,
  };
  BOOSTERS.forEach(({ id, btn, cnt }) => {
    const n = S.inv[id];
    $(cnt).textContent = n > 0 ? n : "+";
    $(btn).classList.toggle("empty", n <= 0);
    $(btn).classList.toggle("off", n > 0 && !usable[id]);
  });
  $("boosterHammer").classList.toggle("active", toolMode === "hammer");
  $("boosterVac").classList.toggle("active", toolMode === "vacuum");
  updateGadgets(can);
  queueStuckCheck();
}
function buyPrompt(id) {
  openSheet(
    '<div class="sheet-body small">' + powerGlyph(id) + "<h3>Out of " + POWER_NAME[id] + "</h3><p>Buy one for " + COST[id] + ' coins?</p><div class="btn-row"><button class="btn-big green" id="buyYes"><i class="coin"></i> ' + COST[id] + '</button><button class="btn-link" id="buyNo">Not now</button></div></div>',
    { cls: "dismissable" },
  );
  $("buyNo").addEventListener("click", closeSheet);
  $("buyYes").addEventListener("click", () => {
    buy(id, 1, COST[id]);
    closeSheet();
  });
}
function usePower(id) {
  S.inv[id]--;
  usedPower = true;
  save();
  renderTop();
}
function setTool(mode) {
  toolMode = mode;
  blastMode = !!mode;
  boardEl.classList.toggle("blast-mode", mode === "hammer");
  boardEl.classList.toggle("vac-mode", mode === "vacuum");
  boardEl.classList.toggle("gadget-mode", !!GADGETS[mode]);
  toolAimShow(mode);
  updateBoosters();
}
$("boosterUndo").addEventListener("click", () => {
  if (levelOver) return;
  if (lockedUntilStart("boosterUndo")) return;
  if (S.inv.undo <= 0) return buyPrompt("undo");
  if (!undoStack.length) return shake($("boosterUndo"));
  const u = undoStack.pop();
  usePower("undo");
  Sfx.whoosh();
  // put every block that is still on the board back where it was
  blocks.forEach((b, i) => {
    if (b.removed || !b.el || !u.snap[i]) return;
    b.cells = u.snap[i];
    b.el.style.transition = "left 0.18s ease-out, top 0.18s ease-out";
    b.el.style.left = Math.min(...b.cells.map((c) => c[1])) * STEP + "px";
    b.el.style.top = Math.min(...b.cells.map((c) => c[0])) * STEP + "px";
    if (b.pillar && u.pillars[i] != null) {
      b.pillarLeft = u.pillars[i];
      if (b.pbadge) b.pbadge.textContent = b.pillarLeft;
    }
  });
  moves = Math.max(0, moves - 1);
  updateHUD();
  updateBoosters();
});
$("boosterHammer").addEventListener("click", () => {
  if (levelOver) return;
  if (lockedUntilStart("boosterHammer")) return;
  if (S.inv.hammer <= 0) return buyPrompt("hammer");
  setTool(toolMode === "hammer" ? null : "hammer");
});
$("boosterVac").addEventListener("click", () => {
  if (levelOver) return;
  if (lockedUntilStart("boosterVac")) return;
  if (S.inv.vacuum <= 0) return buyPrompt("vacuum");
  setTool(toolMode === "vacuum" ? null : "vacuum");
});
$("boosterFreeze").addEventListener("click", () => {
  if (levelOver) return;
  if (lockedUntilStart("boosterFreeze")) return;
  if (S.inv.freeze <= 0) return buyPrompt("freeze");
  if (!timerStarted || performance.now() < freezeUntil) return shake($("boosterFreeze"));
  usePower("freeze");
  Sfx.crack();
  freezeUntil = performance.now() + 10000;
  try {
    freezeFX(10000);
  } catch (e) {}
  toast("Clock frozen for 10 seconds");
  updateBoosters();
  setTimeout(updateBoosters, 10100);
});

// remove one block with a pop
function popBlock(b) {
  b.removed = true;
  const e = b.el;
  e.style.pointerEvents = "none";
  e.classList.add("gone");
  burst(
    PADDING + parseFloat(e.style.left) + parseFloat(e.style.width) / 2,
    PADDING + parseFloat(e.style.top) + parseFloat(e.style.height) / 2,
    b.color,
    14,
  );
  e.classList.add("blasted");
  setTimeout(() => e.remove(), 320);
}
const touching = (a, b) => a.cells.some(([r, c]) => b.cells.some(([r2, c2]) => Math.abs(r - r2) + Math.abs(c - c2) === 1));

// called by the engine when you tap a block while a tool is armed
function blast(b, e) {
  if (GADGETS[toolMode]) return gadgetTap(toolMode, b, e); // Workshop gadgets (workshop.js)
  const mode = toolMode;
  setTool(null);
  const finish = () => {
    refreshIce();
    updateBoosters();
    checkWin();
  };
  if (mode === "vacuum") {
    usePower("vacuum");
    S.stats.vacuumed++;
    // every block the same colour as the one you tapped, nearest first
    const mid = (o) => o.cells.reduce((a, [r, c]) => [a[0] + r / o.cells.length, a[1] + c / o.cells.length], [0, 0]);
    const m0 = mid(b);
    const dist = (o) => Math.hypot(mid(o)[0] - m0[0], mid(o)[1] - m0[1]);
    const group = [b, ...blocks.filter((o) => o !== b && !o.removed && o.color === b.color).sort((x, y) => dist(x) - dist(y))];
    // gone from the puzzle straight away; the animation just shows them being sucked up
    group.forEach((o) => {
      o.removed = true;
      o.el.style.pointerEvents = "none";
      o.el.classList.add("gone");
    });
    vacuumFX(group, finish);
    checkTrophies();
    return;
  }
  usePower("hammer");
  S.stats.blasted++;
  b.removed = true;
  b.el.style.pointerEvents = "none";
  b.el.classList.add("gone");
  hammerFX(b, finish);
  checkTrophies();
}

// ---------------------------------------------------------------- never stuck
// After every change the board settles, a snapshot is kept and a background solver (solver.js)
// checks whether the level can still be won without power-ups. If it can't, a card offers a
// free rewind to the most recent position that can still win, putting back blocks that left.
let boardHistory = []; // snapshots since the level started, oldest first
let stuckTimer = 0;
let stuckAsk = 0; // id of the newest question to the solver
let stuckWorker = null;
const stuckWaiting = new Map();
try {
  stuckWorker = new Worker("src/solver.js?v=45");
  stuckWorker.onmessage = (e) => {
    const cb = stuckWaiting.get(e.data.id);
    stuckWaiting.delete(e.data.id);
    if (cb) cb(e.data.solvable);
  };
} catch (e) {
  stuckWorker = null; // no workers: the game just doesn't check
}
function askSolver(board) {
  return new Promise((res) => {
    if (!stuckWorker) return res(null);
    const id = ++stuckAsk;
    stuckWaiting.set(id, res);
    try {
      stuckWorker.postMessage({ id, board, cap: 150000 });
    } catch (e) {
      stuckWaiting.delete(id);
      return res(null);
    }
    setTimeout(() => stuckWaiting.has(id) && (stuckWaiting.delete(id), res(null)), 4000);
  });
}
function snapshot() {
  return {
    cells: blocks.map((b) => b.cells.map((c) => c.slice())),
    removed: blocks.map((b) => !!b.removed),
    rainbow: blocks.map((b) => !!b.rainbow),
    pillars: blocks.map((b) => b.pillarLeft),
    bombs: blocks.map((b) => b.bombLeft),
    moves,
  };
}
const snapKey = (s) => JSON.stringify([s.cells, s.removed, s.rainbow]);
function boardFor(s) {
  const L = LEVELS[curIdx];
  return {
    rows: ROWS, cols: COLS, walls: boardWalls, lava: boardLava,
    exits: exits.map((e) => ({ side: e.side, index: e.index, length: e.length || 1, color: e.color })), // plain data only (no DOM)
    pieces: blocks.map((b, i) => ({
      cells: s.cells[i], color: b.color, rainbow: s.rainbow[i], axis: b.axis, comet: b.comet, jelly: b.jelly, bubble: b.bubble,
      gray: b.gray, crate: b.crate, pillar: b.pillar ? Math.max(1, s.pillars[i] || 1) : 0, ice: b.ice, lockBy: b.lockBy, removed: s.removed[i],
    })),
  };
}
function resetHistory() {
  boardHistory = [];
  hideStuck();
}
function queueStuckCheck() {
  clearTimeout(stuckTimer);
  stuckTimer = setTimeout(stuckCheck, 450); // once things have settled (slides, bubbles, effects)
}
async function stuckCheck() {
  if (!blocks.length || levelOver || fxBusy || drag) return;
  const s = snapshot();
  const k = snapKey(s);
  if (boardHistory.length && snapKey(boardHistory[boardHistory.length - 1]) === k) return;
  s.ok = null;
  boardHistory.push(s);
  const level = curIdx;
  s.ok = await askSolver(boardFor(s));
  if (level !== curIdx || levelOver || boardHistory[boardHistory.length - 1] !== s) return; // moved on
  if (s.ok === false) showStuck();
}
function showStuck() {
  let card = $("stuck");
  if (!card) {
    card = el("div", "stuck-card");
    card.id = "stuck";
    document.querySelector(".board-wrap").appendChild(card);
  }
  card.innerHTML = '<b>No way to win from here</b><span>A move a little while back closed off every way out. Rewind to the last position that can still win.</span><button class="btn-big green" id="stuckRewind">Rewind · free</button><button class="btn-link" id="stuckKeep">Keep playing</button>';
  card.hidden = false;
  boardEl.classList.add("is-stuck");
  Sfx.error();
  $("stuckRewind").addEventListener("click", rewindToWinnable);
  $("stuckKeep").addEventListener("click", hideStuck);
}
function hideStuck() {
  const card = $("stuck");
  if (card) card.hidden = true;
  boardEl.classList.remove("is-stuck");
}
async function rewindToWinnable() {
  $("stuckRewind").disabled = true;
  $("stuckRewind").textContent = "Rewinding…";
  // newest first: the last position the solver hasn't ruled out
  for (let i = boardHistory.length - 2; i >= 0; i--) {
    const s = boardHistory[i];
    if (s.ok == null) s.ok = await askSolver(boardFor(s));
    if (s.ok === false) continue;
    boardHistory.length = i + 1;
    restoreSnapshot(s);
    return;
  }
  boardHistory.length = 1;
  restoreSnapshot(boardHistory[0]);
}
function restoreSnapshot(s) {
  hideStuck();
  setTool(null);
  endGhost();
  blocks.forEach((b, i) => {
    if (b.el) b.el.remove();
    b.el = null;
    b.cells = s.cells[i].map((c) => c.slice());
    b.removed = s.removed[i];
    b.rainbow = s.rainbow[i];
    if (b.removed) return;
    renderBlock(b);
    if (b.pillar && s.pillars[i] != null) {
      b.pillarLeft = s.pillars[i];
      if (b.pbadge) b.pbadge.textContent = b.pillarLeft;
    }
    if (b.bomb && s.bombs[i] != null) {
      b.bombLeft = s.bombs[i];
      b.el.classList.toggle("hot", b.bombLeft <= BOMB_HOT);
      showFuse(b);
    }
  });
  moves = s.moves;
  undoStack = [];
  refreshIce();
  updateHUD();
  updateBoosters();
  Sfx.whoosh();
  toast("Rewound. This position can still be won.");
}

// ---------------------------------------------------------------- winning
function checkWin() {
  if (levelOver || !blocks.every((b) => !isNeeded(b) || b.removed)) return;
  levelOver = true;
  setTool(null);
  clearTimeout(comboTimer);
  cancelAnimationFrame(tickHandle);
  // leftover gray blocks and crates just vanish
  blocks.forEach((b) => !b.removed && b.el && popBlock(b));

  const idx = curIdx;
  const L = LEVELS[idx];
  const w = L.world;
  const par = L.par || blocks.length;
  const stars = starsFor(moves, par);
  const base = 8;
  const starBonus = stars * 2;
  const tier = TIER_BONUS[L.difficulty || "Easy"] || 0;
  const comboBonus = bestCombo >= 3 ? (bestCombo - 2) * 2 : 0;
  const timeBonus = timerStarted ? Math.min(6, Math.floor(timeLeft / 10)) : 0;
  let total = base + starBonus + tier + comboBonus + timeBonus;

  const before = clearedInWorld(w);
  S.cleared = idx + 1;
  S.stars[idx] = stars;
  S.starsTotal += stars;
  S.stats.levels++;
  if (stars === 3) S.stats.perfect++;
  const after = clearedInWorld(w);
  const inWorld = idx - worldStart[w];
  const chest = (inWorld + 1) % 3 === 0 && inWorld + 1 < worldCount[w];
  if (chest) S.chests++;
  const ticket = S.cleared % 5 === 0;
  if (ticket) S.bonus++;
  const worldComplete = after >= worldCount[w];
  let worldBonus = 0;
  if (worldComplete) {
    S.stats.worlds++;
    worldBonus = 100;
    total += worldBonus;
    S.chests++;
  }
  S.coins += total;
  S.stats.coinsEarned += total;
  // a mystery block for the Workshop every level (a gold one, with an extra piece, for 3 stars)
  const box = stars === 3 ? "gold" : "plain";
  S.workshop.boxes.push(box);
  if (worldComplete) S.workshop.boxes.push("gold", "gold");

  questEvent("clear", 1);
  questEvent("stars", stars);
  if (!usedPower) questEvent("nopower", 1);
  if (stars === 3) questEvent("three", 1);
  save();

  setTimeout(
    () =>
      showWin({
        idx, w, stars, base, starBonus, tier, comboBonus, timeBonus, worldBonus, total, chest, ticket, worldComplete, before, after, box,
        difficulty: L.difficulty || "Easy",
      }),
    700,
  );
}

function showWin(r) {
  Sfx.win();
  const rows = [
    ["Level cleared", r.base],
    ["Stars (" + r.stars + ")", r.starBonus],
  ];
  if (r.tier) rows.push([r.difficulty + " bonus", r.tier]);
  if (r.timeBonus) rows.push(["Time left", r.timeBonus]);
  if (r.comboBonus) rows.push(["Best combo x" + bestCombo, r.comboBonus]);
  if (r.worldBonus) rows.push(["Picture complete!", r.worldBonus]);
  const starsHtml = [0, 1, 2].map((i) => '<span class="star' + (i < r.stars ? " on" : "") + '" style="animation-delay:' + (0.25 + i * 0.2) + 's">' + ICON.star + "</span>").join("");
  const rowsHtml = rows.map(([t, v], i) => '<div class="rw" style="animation-delay:' + (0.9 + i * 0.12) + 's"><span>' + t + "</span><b>+" + v + ' <i class="coin"></i></b></div>').join("");
  const nextLabel = r.worldComplete ? "See your picture" : allDone() ? "Finish" : "Next level";
  const pct = Math.round((100 * r.after) / worldCount[r.w]);
  openSheet(
    '<div class="ribbon">Level ' + (r.idx + 1) + '</div><div class="sheet-body win"><div class="stars">' + starsHtml + '</div><div class="rewards">' + rowsHtml +
      '<div class="rw total" style="animation-delay:' + (1.0 + rows.length * 0.12) + 's"><span>Total</span><b><em id="winTotal">+0</em><i class="coin"></i></b></div></div>' +
      '<div class="win-pic"><div class="mosaic mini" id="winMosaic"></div><div class="win-pic-t"><b>' + WORLDS[r.w].picture + "</b><span>" + pct + '% rebuilt</span></div></div>' +
      (r.chest ? '<div class="note chest">' + ICON.chest + "<span>You earned a chest!</span></div>" : "") +
      (r.ticket ? '<div class="note chest">' + ICON.rush + "<span>Bonus Rush ticket!</span></div>" : "") +
      '<button class="note chest ws-open" id="winOpen">' + ICON.workshop + "<span>" + (r.box === "gold" ? "Gold mystery block!" : "Mystery block!") + "</span><em>Open it now</em></button>" +
      '<div class="win-actions"><button class="btn-big green" id="winNext">' + nextLabel + '</button><button class="btn-link" id="winHome">Back to home</button></div></div>',
  );
  [0, 1, 2].forEach((i) => i < r.stars && setTimeout(() => Sfx.star(i), 250 + i * 200 + 150));
  setTimeout(() => countUp($("winTotal"), r.total, "+"), 900);
  setTimeout(() => Sfx.coin(), 950);
  renderMosaic($("winMosaic"), r.w, revealedFor(r.w, r.after), revealedFor(r.w, r.before));
  renderTop();
  checkTrophies();
  $("winNext").addEventListener("click", () => {
    if (r.worldComplete) return showWorldComplete(r.w);
    closeSheet();
    if (allDone()) showHub("Home");
    else loadLevel(S.cleared);
  });
  $("winHome").addEventListener("click", () => {
    closeSheet();
    showHub("Home");
  });
  $("winOpen").addEventListener("click", () => {
    closeSheet();
    showHub("Workshop");
  });
}

function showWorldComplete(w) {
  const W = WORLDS[w];
  Sfx.chestOpen();
  const sheet = openSheet(
    '<div class="ribbon gold">Picture complete!</div><div class="sheet-body world-done"><div class="mosaic big" id="doneMosaic"></div><h3>You rebuilt ' + W.picture + '!</h3><p>+100 coins, a bonus chest and 2 gold mystery blocks.</p>' +
      (w + 1 < WORLDS.length ? '<p class="unlock">New world unlocked: <b>' + WORLDS[w + 1].name + "</b></p>" : '<p class="unlock">Every picture is rebuilt. New worlds are coming soon.</p>') +
      '<button class="btn-big green" id="wcGo">Continue</button></div>',
  );
  renderMosaic($("doneMosaic"), w, mosaicTotal(w), 0);
  $("wcGo").addEventListener("click", () => {
    closeSheet();
    showHub("Home");
  });
  launchConfetti(sheet);
}
function launchConfetti(host) {
  const colors = ["#ff8a3d", "#4d7bff", "#33cc7a", "#ff5da2", "#a855f7", "#ffd447"];
  for (let i = 0; i < 40; i++) {
    const c = el("i", "confetti");
    c.style.left = Math.random() * 100 + "%";
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.8 + "s";
    c.style.setProperty("--dx", (Math.random() - 0.5) * 120 + "px");
    host.appendChild(c);
  }
}

// ---------------------------------------------------------------- bonus rush
// a 15-second mini-game: smash as many crates as you can
function openRush() {
  if (S.bonus <= 0) {
    toast("Clear 5 levels to earn a Bonus Rush ticket.");
    Sfx.error();
    return;
  }
  openSheet(
    '<div class="ribbon gold">Bonus Rush</div><div class="sheet-body rush"><div class="rush-top"><div class="pill"><i class="coin"></i><b id="rushCoins">0</b></div><div class="rush-timer" id="rushTimer">15</div></div><p id="rushHint">Smash as many crates as you can in 15 seconds! The clock starts on your first tap.</p><div class="rush-legend" id="rushLegend"><span><i class="crate-cell wood"></i>1 tap · 1 coin</span><span><i class="crate-cell plank"></i>2 taps · 2 coins</span><span><i class="crate-cell gold"></i>3 taps · 5 coins</span><span><i class="crate-cell clock">⏱</i>+2 seconds</span><span><i class="crate-cell gem">★</i>free power-up (2 max)</span></div><div class="rush-grid" id="rushGrid"></div><button class="btn-big blue" id="rushLater" style="margin-top:14px">Not now</button></div>',
  );
  $("rushLater").addEventListener("click", () => closeSheet());
  const KINDS = [
    { w: 54, taps: 1, coins: 1, cls: "wood" },
    { w: 26, taps: 2, coins: 2, cls: "plank" },
    { w: 10, taps: 3, coins: 5, cls: "gold" },
    { w: 7, taps: 1, time: 2, cls: "clock" },
    { w: 3, taps: 1, power: true, cls: "gem" },
  ];
  const pick = () => {
    let r = Math.random() * 100;
    for (const k of KINDS) if ((r -= k.w) < 0) return k;
    return KINDS[0];
  };
  const grid = $("rushGrid");
  let coins = 0;
  let left = 15;
  let started = false;
  let over = false;
  let timer = 0;
  const prizes = [];
  const fill = (cellEl) => {
    const k = pick();
    cellEl.className = "crate-cell " + k.cls;
    cellEl.dataset.hp = k.taps;
    cellEl._k = k;
    cellEl.innerHTML = k.cls === "clock" ? "⏱" : k.cls === "gem" ? "★" : "";
  };
  for (let i = 0; i < 20; i++) {
    const c = el("button", "crate-cell");
    fill(c);
    c.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (over) return;
      if (!started) {
        started = true;
        $("rushLater").remove();
        $("rushLegend").remove();
        S.bonus--;
        save();
        $("rushHint").textContent = "Go go go!";
        timer = setInterval(() => {
          left = Math.max(0, left - 0.1);
          $("rushTimer").textContent = Math.ceil(left);
          $("rushTimer").classList.toggle("low", left <= 5);
          if (left <= 0) finish();
        }, 100);
      }
      const k = c._k;
      let hp = +c.dataset.hp - 1;
      c.dataset.hp = hp;
      if (hp > 0) {
        c.classList.add("hit");
        setTimeout(() => c.classList.remove("hit"), 120);
        Sfx.thud();
        return;
      }
      // smashed
      Sfx.coin();
      const pop = el("i", "rush-pop", k.time ? "+" + k.time + "s" : k.power && prizes.length < 2 ? "+1" : "+" + (k.coins || 5));
      c.appendChild(pop);
      if (k.time) left = Math.min(25, left + k.time);
      else if (k.power && prizes.length < 2) {
        const t = ["undo", "hammer", "freeze", "vacuum"][Math.floor(Math.random() * 4)];
        S.inv[t]++;
        prizes.push(t);
      } else {
        coins += k.coins || 5; // (a star crate after the 2nd power-up pays like a gold one)
        $("rushCoins").textContent = coins;
      }
      c.classList.add("smashed");
      setTimeout(() => fill(c), 260);
    });
    grid.appendChild(c);
  }
  function finish() {
    over = true;
    clearInterval(timer);
    S.coins += coins;
    S.stats.coinsEarned += coins;
    S.stats.rushes++;
    save();
    renderTop();
    checkTrophies();
    grid.classList.add("done");
    const extra = prizes.length ? '<div class="loot-row">' + prizes.map(powerGlyph).join("") + "<b>Power-ups found</b></div>" : "";
    $("rushHint").outerHTML = '<div class="rush-result"><h3>+' + coins + ' coins</h3>' + extra + '<button class="btn-big green" id="rushDone">Collect</button></div>';
    Sfx.win();
    $("rushDone").addEventListener("click", () => {
      closeSheet();
      renderHome();
    });
  }
}

// ---------------------------------------------------------------- wordmark + start
(function colorWordmarks() {
  const palette = ["#ff8a3d", "#4d7bff", "#33cc7a", "#ff5da2", "#a855f7", "#22c3c3", "#ffd447"];
  document.querySelectorAll(".wordmark").forEach((node) => {
    const text = node.textContent;
    node.textContent = "";
    node.setAttribute("aria-label", text);
    let n = 0;
    for (const ch of text) {
      const s = el("span");
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch;
      if (ch === " ") s.className = "gap";
      else s.style.color = palette[n++ % palette.length];
      node.appendChild(s);
    }
  });
})();

(async function init() {
  await loadLevels();
  Sfx.setMuted(S.muted);
  if (Number.isFinite(SKIP) && SKIP > 0 && SKIP <= LEVELS.length) {
    S.cleared = SKIP;
    S.starsTotal = SKIP * 2;
    for (let i = 0; i < SKIP; i++) S.stars[i] = 2;
    save();
  }
  rollDaily();
  showHub("Home");
  setTimeout(S.econNote ? showEconNote : checkLogin, 500);
})();

// ---------------------------------------------------------------- iPhone home-screen app: short page area
// some iOS versions give the page less height than the screen in standalone mode. the strip below is painted with the
// theme colour (see setTheme) and the tab bar drops its extra bottom padding so it sits near the bottom edge.
function fixViewport() {
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const portrait = window.matchMedia && matchMedia("(orientation: portrait)").matches;
  const full = Math.max(screen.height || 0, screen.width || 0);
  const short = !!(standalone && portrait && full && window.innerHeight < full - 2);
  document.documentElement.classList.toggle("vp-short", short);
}
["resize", "orientationchange", "pageshow", "focus"].forEach((ev) => window.addEventListener(ev, () => setTimeout(fixViewport, 50)));
if (window.visualViewport) visualViewport.addEventListener("resize", () => setTimeout(fixViewport, 50));
fixViewport();
setTimeout(fixViewport, 400);

// ---------------------------------------------------------------- hidden diagnostics: tap the Color Jam title 5 times
(function diagnostics() {
  let taps = 0, timer = 0, hold = 0;
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".wordmark-big")) return;
    clearTimeout(hold);
    hold = setTimeout(show, 1500);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => document.addEventListener(ev, () => clearTimeout(hold)));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".wordmark-big")) return;
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => (taps = 0), 1500);
    if (taps < 3) return;
    taps = 0;
    show();
  });
  const tag = document.getElementById("buildTag");
  if (tag) {
    tag.textContent = "build " + (location.pathname.includes("/t1/") ? "A-" : location.pathname.includes("/t2/") ? "B-" : "") + ((document.querySelector('script[src*="src/app.js"]').src.match(/v=(\d+)/) || [])[1] || "?");
    tag.addEventListener("click", () => show());
  }
  function show() {
    clearTimeout(hold);
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const mq = (q) => (window.matchMedia && matchMedia(q).matches ? "yes" : "no");
    const vv = window.visualViewport;
    const rows = [
      ["build", (document.querySelector('script[src*="src/app.js"]').src.match(/v=(\d+)/) || [])[1]],
      ["standalone", String(navigator.standalone) + " / display-mode " + mq("(display-mode: standalone)")],
      ["innerHeight", innerHeight],
      ["outerHeight", outerHeight],
      ["screen w x h", screen.width + " x " + screen.height],
      ["visualViewport", vv ? Math.round(vv.width) + " x " + Math.round(vv.height) : "n/a"],
      ["html clientHeight", document.documentElement.clientHeight],
      ["body height", Math.round(document.body.getBoundingClientRect().height)],
      ["tabbar bottom", Math.round(document.querySelector(".tabbar").getBoundingClientRect().bottom)],
      ["safe top/bottom", cs.paddingTop + " / " + cs.paddingBottom],
      ["vp-short", document.documentElement.classList.contains("vp-short")],
      ["service worker", navigator.serviceWorker && navigator.serviceWorker.controller ? "active" : "none"],
    ];
    probe.remove();
    openSheet(
      '<div class="ribbon gold">Diagnostics</div><div class="sheet-body"><div style="font:600 14px/1.7 DM Sans,system-ui;text-align:left">' +
        rows.map((r) => "<div><b>" + r[0] + ":</b> " + r[1] + "</div>").join("") +
        '</div><button class="btn-big blue" id="diagClose" style="margin-top:14px">Close</button></div>',
      { cls: "dismissable" },
    );
    $("diagClose").addEventListener("click", () => closeSheet());
  }
})();
