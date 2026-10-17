// PLAY: everything while a level is open: the level card and pre-level boosters, loading a
// level, the clock, losing, star goals, tips, combos, power-ups and the never-stuck rewind.

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

// before every level: the level card, where you can pick the Hourglass and the Rocket
const PRE = ["hourglass", "rocket"];
let preSel = {};
function startLevel() {
  if (allDone()) return showHub("Home");
  const idx = S.cleared;
  const L = LEVELS[idx];
  const t = tierOf(L);
  const tile = (id) =>
    '<button class="pre-tile' + (preSel[id] && S.inv[id] > 0 ? " on" : "") + '" data-id="' + id + '">' + ICON[id] + '<em class="pre-n">' + (S.inv[id] > 0 ? S.inv[id] : "+") + '</em><i class="pre-check">' + ICON.check + "</i></button>";
  openSheet(
    '<button class="x-btn" id="preX" aria-label="Close">✕</button><div class="ribbon">Level ' + (idx + 1) + "</div>" +
      (S.vault.n > 0 ? '<div class="streak-sign"><small>Streak</small><b>' + S.vault.n + "</b></div>" : "") +
      '<div class="sheet-body pre"><div class="pre-info' + (t ? " " + t : "") + '">' + (t ? '<span class="pre-skull">' + ICON.skull + "</span>" : '<span class="pre-skull">' + ICON.block + "</span>") +
      "<div><b>" + (t ? L.difficulty + " level" : WORLDS[L.world].name) + "</b><span>" + (t ? "Take your time and plan ahead" : (L.difficulty || "Easy") + " · " + (L.rows || 6) + "×" + (L.cols || 6) + " board") + "</span></div></div>" +
      '<h4 class="pre-h">Select boosters:</h4><div class="pre-row">' + PRE.map(tile).join("") + '</div><p class="pre-hint" id="preHint">Hourglass: +30 seconds. Rocket: knocks a block out at the start.</p>' +
      '<button class="btn-big green" id="preGo">Play</button></div>',
    { cls: "dismissable pre-sheet" },
  );
  $("preX").addEventListener("click", closeSheet);
  $("sheet").querySelectorAll(".pre-tile").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      if (S.inv[id] <= 0) {
        if (S.coins < COST[id]) return Sfx.error(), toast("Not enough coins for a " + POWER_NAME[id]);
        S.coins -= COST[id];
        S.inv[id]++;
        save();
        renderTop();
        toast(powerGlyph(id) + " Bought a " + POWER_NAME[id] + " for " + COST[id]);
        b.querySelector(".pre-n").textContent = S.inv[id];
      }
      preSel[id] = !preSel[id];
      b.classList.toggle("on", preSel[id]);
      Sfx.pop();
    }),
  );
  $("preGo").addEventListener("click", () => {
    closeSheet();
    const use = PRE.filter((id) => preSel[id] && S.inv[id] > 0);
    $("hub").hidden = true;
    $("game").hidden = false;
    loadLevel(idx);
    use.forEach((id) => S.inv[id]--);
    if (use.length) (usedPower = true), save(), renderTop();
    if (use.includes("hourglass")) {
      timeMax = timeLeft += 30;
      renderTimer();
      toast(ICON.hourglass.replace("<svg", '<svg class="t-ic"') + " +30 seconds");
    }
    if (use.includes("rocket")) setTimeout(launchRocket, 450);
  });
}
// the Rocket: flies up from the bottom and knocks out one block before you start
function launchRocket() {
  const pick = blocks.filter((b) => isNeeded(b) && !b.removed && !b.ice && b.lockBy == null && !b.bomb);
  const pool = pick.length ? pick : blocks.filter((b) => isNeeded(b) && !b.removed);
  if (!pool.length) return;
  const b = pool[Math.floor(Math.random() * pool.length)];
  const e = b.el;
  const x = parseFloat(e.style.left) + parseFloat(e.style.width) / 2;
  const y = parseFloat(e.style.top) + parseFloat(e.style.height) / 2;
  const r = el("div", "fx fx-rocket", ICON.rocket);
  boardEl.appendChild(r);
  const fromY = boardEl.offsetHeight + 120;
  const fromX = boardEl.offsetWidth / 2;
  const ang = (Math.atan2(x - fromX, -(y - fromY)) * 180) / Math.PI;
  Sfx.whoosh();
  fxBusy++;
  r.animate(
    [
      { transform: "translate(" + (fromX - 22) + "px," + (fromY - 22) + "px) rotate(" + ang + "deg) scale(1.2)" },
      { transform: "translate(" + (x - 22) + "px," + (y - 22) + "px) rotate(" + ang + "deg) scale(1)" },
    ],
    { duration: 520, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" },
  ).onfinish = () => {
    r.remove();
    Sfx.boom();
    boardEl.animate([{ transform: "none" }, { transform: "translateY(5px)" }, { transform: "none" }], { duration: 240, easing: "ease-out" });
    burst(PADDING + x, PADDING + y, "#ffb020", 22);
    popBlock(b);
    fxBusy--;
    refreshIce();
    resetHistory();
    updateBoosters();
    checkWin();
  };
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
  fitBoard();
  $("levelTitle").textContent = idx + 1;
  $("game").classList.toggle("hard", !!tierOf(L));
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
// restarting or leaving a level you've started breaks the Vault Run streak, so ask first
function confirmLeave(what, go) {
  if (!inLevel() || S.vault.n <= 0) return go();
  openSheet(
    '<div class="ribbon red">' + what + '?</div><div class="sheet-body small"><div class="vault-mini">' + ICON.vault + "</div><h3>Lose your streak?</h3><p>You've won " + S.vault.n + " in a row. " + what + " now and the Vault Run starts again from 0.</p>" +
      '<div class="btn-row"><button class="btn-big green" id="leaveNo">Keep playing</button><button class="btn-link" id="leaveYes">' + what + " anyway</button></div></div>",
    { cls: "dismissable" },
  );
  $("leaveNo").addEventListener("click", closeSheet);
  $("leaveYes").addEventListener("click", () => {
    closeSheet();
    breakStreak();
    go();
  });
}
$("resetBtn").addEventListener("click", () => {
  if (levelOver) return;
  confirmLeave("Restart", () => {
    if (inLevel()) breakStreak();
    loadLevel(curIdx);
  });
});
function leaveLevel() {
  if (inLevel()) breakStreak();
  levelOver = true;
  cancelAnimationFrame(tickHandle);
  showHub("Home");
}
$("pauseBtn").addEventListener("click", () => {
  if (levelOver) return;
  openSheet(
    '<div class="ribbon">Paused</div><div class="sheet-body small"><div class="set-list"><button class="set-row" id="pSound"><span>Sound</span><i class="toggle' + (S.muted ? "" : " on") + '"></i></button></div>' +
      '<button class="btn-big green" id="pResume">Resume</button><button class="btn-big blue" id="pHome">Home</button></div>',
    { cls: "dismissable" },
  );
  $("pSound").addEventListener("click", () => {
    S.muted = !S.muted;
    Sfx.setMuted(S.muted);
    save();
    $("pSound").querySelector(".toggle").classList.toggle("on", !S.muted);
  });
  $("pResume").addEventListener("click", closeSheet);
  $("pHome").addEventListener("click", () => {
    closeSheet();
    confirmLeave("Leave", leaveLevel);
  });
});

// ---- the clock: starts on your first touch, pauses while a pop-up is open
const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.ceil(s) % 60 === 0 && s % 60 !== 0 ? 0 : Math.floor(s % 60)).padStart(2, "0");
function renderTimer(frozen = false) {
  const t = $("timer");
  const s = Math.ceil(timeLeft);
  $("timerText").textContent = pad(Math.floor(s / 60)) + ":" + pad(s % 60);
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
    breakStreak();
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
    breakStreak();
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
      breakStreak();
      loadLevel(curIdx);
    });
    $("failHome").addEventListener("click", () => {
      closeSheet();
      breakStreak();
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
  const cut = starCut(par);
  $("goalStars").innerHTML = mk(999, "any") + mk(cut.two, "≤" + cut.two) + mk(cut.three, "≤" + cut.three);
}
function updateHUD() {
  $("moveCount").textContent = moves;
  [...$("goalStars").children].forEach((s) => s.classList.toggle("lost", moves > +s.dataset.t));
}
// Stars leave room for working it out: par is what someone who already knows the answer
// needs, so 3 stars allow half as many moves again (+1), and 2 stars twice as many (+3).
const starCut = (par) => ({ three: Math.ceil(par * 1.5) + 1, two: par * 2 + 3 });
const starsFor = (m, par) => (m <= starCut(par).three ? 3 : m <= starCut(par).two ? 2 : 1);

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
