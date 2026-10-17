// HOME: the Home screen (level path, event buttons, world strip), the Collection album, the
// Vault Run win streak and the Map. Uses the core in app.js.

// ---------------------------------------------------------------- home
// Laid out like Color Block Jam: the Vault Run bar on top, round event buttons down both sides,
// the next levels as a path of blocks in the middle, then the world strip and a big Level button.
const tierOf = (lv) => ({ Hard: "hard", "Very hard": "very-hard" })[lv && lv.difficulty] || "";
function untilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const m = Math.max(1, Math.round((end - now) / 60000));
  return Math.floor(m / 60) + "h " + pad(m % 60) + "m";
}
function evButton(node, icon, label, badge, glow) {
  node.innerHTML = '<span class="ev-ring">' + icon + '</span><span class="ev-label">' + label + "</span>" + (badge ? '<em class="badge">' + badge + "</em>" : "");
  node.classList.toggle("glow", !!glow);
}
function renderHome() {
  const w = currentWorld();
  setTheme(w);
  const W = WORLDS[w];
  $("vaultBar").innerHTML = vaultBarHTML();

  // the path: the level you're on (big, green) with the next two above it
  const path = $("lvPath");
  path.innerHTML = "";
  if (allDone()) {
    path.innerHTML = '<div class="lv-node done">' + ICON.check + "</div>";
  } else {
    for (let k = 2; k >= 0; k--) {
      const i = S.cleared + k;
      if (i >= LEVELS.length) continue;
      const lv = LEVELS[i];
      const t = tierOf(lv);
      const n = el("div", "lv-node" + (k === 0 ? " current" : " next") + (t ? " " + t : "") + (k === 2 ? " far" : ""));
      n.innerHTML = "<b>" + (i + 1) + "</b>" + (t ? '<span class="lv-skull">' + ICON.skull + "</span>" : "") + (k > 0 ? '<span class="lv-lock">' + ICON.lock + "</span>" : "");
      if (k === 0) n.addEventListener("click", () => startLevel());
      path.appendChild(n);
    }
  }

  // world strip: how far through this world's picture, with its chests along the way
  const k = clearedInWorld(w);
  const N = Math.max(1, worldCount[w]);
  let marks = "";
  for (let j = 3; j < N; j += 3) marks += '<i class="ws-chest' + (k >= j ? " got" : "") + '" style="left:' + (100 * j) / N + '%">' + ICON.chest + "<small>" + j + "</small></i>";
  marks += '<i class="ws-chest pic' + (k >= N ? " got" : "") + '" style="left:100%">' + ICON.gift + "<small>" + N + "</small></i>";
  $("worldStrip").innerHTML = '<span class="wst-name">' + W.name + '</span><span class="wst-bar"><i style="width:' + (100 * k) / N + '%"></i>' + marks + "</span>";

  const play = $("playBtn");
  if (allDone()) {
    $("playLevel").textContent = "All done!";
    play.disabled = true;
  } else {
    $("playLevel").textContent = "Level " + (S.cleared + 1);
    play.disabled = false;
    play.classList.toggle("hard", !!tierOf(LEVELS[S.cleared]));
  }

  const Wk = S.workshop;
  evButton($("evWorkshop"), ICON.workshop, bpComplete() ? "Build!" : Wk.boxes.length ? Wk.boxes.length + " to open" : "Workshop", Wk.boxes.length || (bpComplete() ? "!" : ""), Wk.boxes.length > 0 || bpComplete());
  evButton($("evChest"), S.chests > 0 ? ICON.chestOpen : ICON.chest, S.chests > 0 ? "Open!" : "Chests", S.chests, S.chests > 0);
  evButton($("evRush"), ICON.rush, "Rush", S.bonus, S.bonus > 0);
  const ready = questsReady();
  evButton($("evQuests"), ICON.quest, untilMidnight(), ready, ready > 0);
  evButton($("evVault"), ICON.vault, S.vault.n + "/" + VAULT_GOAL, "", false);
  const day = ((Math.max(1, S.login.count) - 1) % 7) + 1;
  evButton($("evLogin"), ICON.calendar(day), "Day " + day, "", false);
  renderTop();
}
$("playBtn").addEventListener("click", () => {
  if (!allDone()) startLevel();
});
$("evChest").addEventListener("click", openChest);
$("evQuests").addEventListener("click", () => showPane("Quests"));
$("evRush").addEventListener("click", () => openRush());
$("evWorkshop").addEventListener("click", () => showPane("Workshop"));
$("evVault").addEventListener("click", () => openVault());
$("vaultBar").addEventListener("click", () => openVault());
$("evLogin").addEventListener("click", () => showPane("Quests"));
$("worldStrip").addEventListener("click", () => showPane("Collection"));

// ---------------------------------------------------------------- collection
// Every world's brick picture is an album card; finishing a world's levels completes its picture.
function renderCollection() {
  const total = LEVELS.length;
  const pics = WORLDS.filter((_, w) => worldDone(w)).length;
  $("collHero").innerHTML =
    '<div class="ch-art">' + ICON.tabBook + '</div><div class="ch-main"><b>Complete every picture</b><span>' + pics + " of " + WORLDS.length + ' pictures rebuilt</span><div class="cbar"><i style="width:' + (100 * Math.min(S.cleared, total)) / total + '%"></i><span>' + Math.min(S.cleared, total) + "/" + total + "</span></div></div>";
  const grid = $("collGrid");
  grid.innerHTML = "";
  WORLDS.forEach((W, w) => {
    if (!worldCount[w]) return;
    const k = clearedInWorld(w);
    const open = worldUnlocked(w);
    const card = el("button", "coll-card" + (open ? "" : " locked") + (worldDone(w) ? " done" : ""));
    card.dataset.world = W.id || "";
    card.innerHTML =
      '<span class="cc-pic"><span class="mosaic mini" id="cm' + w + '"></span>' + (open ? "" : '<span class="cc-lock">' + ICON.lock + "</span>") + '</span><span class="cc-name">' + W.name + "</span>" +
      (worldDone(w) ? '<span class="cc-done">' + ICON.check + "</span>" : '<span class="cc-prog"><span class="cbar"><i style="width:' + (100 * k) / worldCount[w] + '%"></i><span>' + k + "/" + worldCount[w] + '</span></span><i class="coin"></i></span>');
    grid.appendChild(card);
    renderMosaic($("cm" + w), w, open ? revealedFor(w, k) : 0);
    card.addEventListener("click", () => {
      if (!open) return toast("Finish " + WORLDS[w - 1].name + " to unlock this picture");
      openSheet(
        '<div class="ribbon">' + W.name + '</div><div class="sheet-body"><div class="mosaic big" id="collBig"></div><h3>' + W.picture + "</h3><p>" + k + " of " + worldCount[w] + " levels · " + (worldDone(w) ? "complete!" : "every level adds bricks") + '</p><button class="btn-big green" id="collOk">Nice!</button></div>',
        { cls: "dismissable" },
      );
      renderMosaic($("collBig"), w, revealedFor(w, k));
      $("collOk").addEventListener("click", closeSheet);
    });
  });
}

// ---------------------------------------------------------------- vault run
// Win levels in a row without failing. Running out of time or a bomb going off (and then
// retrying or leaving), restarting or leaving mid-level breaks the run. 10 cracks the vault.
const VAULT_GOAL = 10;
const VAULT_PRIZES = {
  3: { coins: 25, text: "25 coins" },
  6: { inv: { hourglass: 1, rocket: 1 }, text: "Hourglass + Rocket" },
  10: { coins: 150, boxes: 2, inv: { rocket: 1, hammer: 1 }, text: "150 coins, 2 gold mystery blocks, Rocket and Hammer" },
};
function vaultBarHTML() {
  const n = S.vault.n;
  return '<span class="vb-ic">' + ICON.block + '</span><span class="vb-bar"><i style="width:' + (100 * n) / VAULT_GOAL + '%"></i><b>' + n + "/" + VAULT_GOAL + '</b></span><span class="vb-prize">' + ICON.vault + "</span>";
}
function vaultWin() {
  const V = S.vault;
  V.n++;
  const prize = VAULT_PRIZES[V.n];
  if (prize) {
    if (prize.coins) (S.coins += prize.coins), (S.stats.coinsEarned += prize.coins);
    if (prize.boxes) for (let i = 0; i < prize.boxes; i++) S.workshop.boxes.push("gold");
    if (prize.inv) for (const [k, v] of Object.entries(prize.inv)) S.inv[k] = (S.inv[k] || 0) + v;
  }
  const n = V.n;
  if (V.n >= VAULT_GOAL) (V.n = 0), V.round++;
  save();
  return { n, prize };
}
function breakStreak() {
  if (S.vault.n > 0) toast("Vault Run streak lost");
  S.vault.n = 0;
  save();
}
const inLevel = () => !levelOver && moves > 0;
function openVault() {
  const n = S.vault.n;
  const steps = Object.keys(VAULT_PRIZES).map(Number);
  openSheet(
    '<div class="vault-sheet"><button class="x-btn" id="vaultX" aria-label="Close">✕</button><h2 class="heist-title">Vault<br>Run</h2><div class="vault-art">' + ICON.vault + '</div>' +
      '<div class="vault-prog"><span class="vb-ic">' + ICON.block + '</span><span class="vb-bar"><i style="width:' + (100 * n) / VAULT_GOAL + '%"></i><b>' + n + "/" + VAULT_GOAL + "</b>" +
      steps.map((k) => '<em class="vp-step' + (n >= k ? " got" : "") + '" style="left:' + (100 * k) / VAULT_GOAL + '%">' + k + "</em>").join("") + "</span></div>" +
      '<div class="grand"><small>Grand prize!</small><b>' + VAULT_PRIZES[10].text + '</b></div><p class="vault-text">Beat levels in a row without failing to crack the vault! Prizes at 3 and 6 too.</p>' +
      (allDone() ? "" : '<button class="btn-big green" id="vaultPlay">Play</button>') + "</div>",
    { cls: "dismissable heist" },
  );
  $("vaultX").addEventListener("click", closeSheet);
  if ($("vaultPlay"))
    $("vaultPlay").addEventListener("click", () => {
      closeSheet();
      startLevel();
    });
}

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
