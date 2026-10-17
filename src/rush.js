// BONUS RUSH: the 15-second crate-smashing mini-game.

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
