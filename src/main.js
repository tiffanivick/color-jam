// MAIN: starts the game once every other file has loaded, plus the iPhone viewport fixes and
// the hidden diagnostics. Must stay the last script on the page.

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
// Big grids (8 wide) don't fit a phone at full size: scale the board down to the space it has.
// The board keeps its own size in pixels; only #boardScale is scaled, and #boardFit takes the
// scaled size so it stays centred. Dragging and aiming divide finger distances by the scale.
function fitBoard() {
  const wrap = document.querySelector(".board-wrap");
  if (!wrap || $("game").hidden) return;
  const fit = $("boardFit"), sc = $("boardScale");
  const w = boardEl.offsetWidth, h = boardEl.offsetHeight;
  if (!w || !h) return;
  const k = Math.min(1, (wrap.clientWidth - 16) / w, (wrap.clientHeight - 12) / h);
  sc.style.transform = k < 1 ? "scale(" + k.toFixed(4) + ")" : "";
  fit.style.width = w * k + "px";
  fit.style.height = h * k + "px";
}
function fixViewport() {
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const portrait = window.matchMedia && matchMedia("(orientation: portrait)").matches;
  const full = Math.max(screen.height || 0, screen.width || 0);
  const short = !!(standalone && portrait && full && window.innerHeight < full - 2);
  document.documentElement.classList.toggle("vp-short", short);

}
["resize", "orientationchange", "pageshow", "focus"].forEach((ev) => window.addEventListener(ev, () => setTimeout(fixViewport, 50)));
window.addEventListener("resize", () => setTimeout(fitBoard, 60));
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
