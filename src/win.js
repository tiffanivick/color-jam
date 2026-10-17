// WIN: checking for a win, paying out, the Level Complete screen and finished pictures.

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

  const vault = vaultWin();
  questEvent("clear", 1);
  questEvent("stars", stars);
  if (!usedPower) questEvent("nopower", 1);
  if (stars === 3) questEvent("three", 1);
  save();

  setTimeout(
    () =>
      showWin({
        idx, w, stars, base, starBonus, tier, comboBonus, timeBonus, worldBonus, total, chest, ticket, worldComplete, before, after, box, vault,
        difficulty: L.difficulty || "Easy",
      }),
    700,
  );
}

// a pile of coins for the win screen
function coinPile() {
  const spots = [[0, 0], [-30, 4], [30, 4], [-58, 14], [58, 14], [-16, -18], [16, -18], [0, -36], [-40, -10], [40, -10], [-22, 22], [22, 22], [0, 26]];
  return (
    '<svg viewBox="-100 -80 200 130" class="pile"><defs><radialGradient id="cpg" cx="35%" cy="30%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".55" stop-color="#ffc83a"/><stop offset="1" stop-color="#e58f10"/></radialGradient></defs>' +
    spots
      .sort((a, b) => a[1] - b[1])
      .map(([x, y], i) => {
        const tilt = ((i * 37) % 30) - 15;
        return '<g transform="translate(' + x + " " + y + ") rotate(" + tilt + ')"><ellipse cy="5" rx="24" ry="12" fill="#b86a08"/><ellipse rx="24" ry="12" fill="url(#cpg)" stroke="#c97a0a" stroke-width="1.5"/><ellipse rx="15" ry="7" fill="none" stroke="#e8a020" stroke-width="2"/></g>';
      })
      .join("") +
    "</svg>"
  );
}
function showWin(r) {
  Sfx.win();
  const starsHtml = [0, 1, 2].map((i) => '<span class="star' + (i < r.stars ? " on" : "") + '" style="animation-delay:' + (0.35 + i * 0.2) + 's">' + ICON.star + "</span>").join("");
  const extras = [];
  if (r.chest) extras.push(ICON.chest + "<span>Chest</span>");
  if (r.ticket) extras.push(ICON.rush + "<span>Rush ticket</span>");
  if (r.worldBonus) extras.push(ICON.gift + "<span>Picture done!</span>");
  if (r.vault.prize) extras.push(ICON.vault + "<span>" + r.vault.prize.text + "</span>");
  const nextLabel = r.worldComplete ? "See your picture" : allDone() ? "Finish" : "Continue";
  const steps = Object.keys(VAULT_PRIZES).map(Number);
  openSheet(
    '<div class="win-full"><h2 class="lc-title"><span>Level</span><span>Complete</span></h2><div class="stars">' + starsHtml + "</div>" +
      '<div class="lc-pile"><i class="rays"></i>' + coinPile() + '<b class="lc-amt"><em id="winTotal">+0</em><i class="coin"></i></b></div>' +
      '<div class="lc-chips"><button class="lc-chip ws" id="winOpen">' + ICON.workshop + "<span>" + (r.box === "gold" ? "Gold block" : "Mystery block") + "</span></button>" +
      extras.map((x) => '<div class="lc-chip">' + x + "</div>").join("") + "</div>" +
      '<div class="lc-actions"><button class="btn-big green" id="winNext">' + nextLabel + '</button><button class="btn-link" id="winHome">Home</button></div>' +
      '<div class="lc-vault"><span class="lcv-name">Vault<br>Run</span><span class="vb-bar"><i style="width:' + (100 * ((r.vault.n - 1) % VAULT_GOAL)) / VAULT_GOAL + '%" id="lcvFill"></i><b>' + r.vault.n + "/" + VAULT_GOAL + "</b>" +
      steps.map((k) => '<em class="vp-step' + (r.vault.n >= k ? " got" : "") + '" style="left:' + (100 * k) / VAULT_GOAL + '%">' + k + "</em>").join("") + '</span><span class="vb-prize">' + ICON.vault + "</span></div></div>",
    { cls: "win-sheet", over: "win-over" },
  );
  [0, 1, 2].forEach((i) => i < r.stars && setTimeout(() => Sfx.star(i), 350 + i * 200 + 150));
  setTimeout(() => countUp($("winTotal"), r.total, "+"), 700);
  setTimeout(() => Sfx.coin(), 750);
  setTimeout(() => {
    const f = $("lcvFill");
    if (f) f.style.width = (100 * r.vault.n) / VAULT_GOAL + "%";
  }, 900);
  renderTop();
  checkTrophies();
  $("winNext").addEventListener("click", () => {
    if (r.worldComplete) return showWorldComplete(r.w);
    closeSheet();
    if (allDone()) showHub("Home");
    else startLevel();
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
