// META: daily quests, the login streak, the economy note, chests, the shop and trophies.

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
  $("questReset").innerHTML = '<i class="tp-clock"></i>' + untilMidnight();
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
const SHOP = ["hourglass", "rocket", "undo", "hammer", "freeze", "vacuum"].map((id) => ({ id, name: POWER_NAME[id], desc: POWER_TEXT[id], icon: id }));
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
