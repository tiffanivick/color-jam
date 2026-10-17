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
  // build 50: Color Block Jam style art
  vault: '<svg viewBox="0 0 48 48"><g stroke="#7d6648" stroke-width="1.8"><ellipse cx="15" cy="12.5" rx="4.6" ry="2.6" fill="#f7eddc"/><ellipse cx="24" cy="12.5" rx="4.6" ry="2.6" fill="#f7eddc"/><ellipse cx="33" cy="12.5" rx="4.6" ry="2.6" fill="#f7eddc"/><rect x="6" y="13" width="36" height="30" rx="7" fill="#efe2cc"/><rect x="11" y="18" width="26" height="20" rx="4" fill="#dccbab"/><circle cx="24" cy="28" r="6.4" fill="#f7eddc"/></g><path d="M24 21.6v12.8M17.6 28h12.8" stroke="#7d6648" stroke-width="1.8"/><circle cx="24" cy="28" r="2.2" fill="#7d6648"/></svg>',
  rocket: '<svg viewBox="0 0 48 48"><path d="M24 3 32.5 15h-17Z" fill="#ffb020" stroke="#9a4a00" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 31 9 39h8M32.5 31 39 39h-8" fill="#ffb020" stroke="#9a4a00" stroke-width="2" stroke-linejoin="round"/><rect x="15.5" y="14" width="17" height="23" rx="3.5" fill="#ff4d5e" stroke="#8a1f28" stroke-width="2"/><path d="M16.5 21h15M16.5 28.5h15" stroke="#ffd447" stroke-width="3.6"/><path d="M20.5 38h7L24 46Z" fill="#ffd447" stroke="#e88a00" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  hourglass: '<svg viewBox="0 0 48 48"><path d="M13.5 9.5c0 9 8.5 10.5 8.5 14.5s-8.5 5.5-8.5 14.5h21c0-9-8.5-10.5-8.5-14.5s8.5-5.5 8.5-14.5Z" fill="#d6f2ff" stroke="#3a86c8" stroke-width="2"/><path d="M17.5 37c2.5-5 5.5-6 6.5-8.5 1 2.5 4 3.5 6.5 8.5Z" fill="#ffc83a"/><path d="M19 14h10c-1.5 3-4 4-5 6.5-1-2.5-3.5-3.5-5-6.5Z" fill="#ffc83a"/><ellipse cx="24" cy="8" rx="13.5" ry="4.2" fill="#ffb020" stroke="#9a5a00" stroke-width="2"/><ellipse cx="24" cy="40" rx="13.5" ry="4.2" fill="#ffb020" stroke="#9a5a00" stroke-width="2"/></svg>',
  skull: '<svg viewBox="0 0 48 48"><path d="M24 2l5.6 9.4 10.8-2.2-2.6 10.6L46 27l-10.4 3.6-.6 11L24 36.6l-11 5-.6-11L2 27l8.2-7.2L7.6 9.2l10.8 2.2Z" fill="#ffc83a" stroke="#9a5a00" stroke-width="2" stroke-linejoin="round"/><path d="M24 13.5c-6 0-9 4-9 8.5 0 3 1.5 4.6 3 5.5V31h12v-3.5c1.5-.9 3-2.5 3-5.5 0-4.5-3-8.5-9-8.5Z" fill="#fff" stroke="#3a2a10" stroke-width="1.6"/><circle cx="20.4" cy="22.5" r="2.4" fill="#3a2a10"/><circle cx="27.6" cy="22.5" r="2.4" fill="#3a2a10"/><path d="M22 31v-3M26 31v-3" stroke="#3a2a10" stroke-width="1.4"/></svg>',
  block: '<svg viewBox="0 0 48 48"><rect x="3" y="5" width="42" height="40" rx="10" fill="#e9a400"/><rect x="3" y="3" width="42" height="38" rx="10" fill="#ffc83a"/><g fill="#ffd96a" stroke="#e5a100" stroke-width="2"><circle cx="15.5" cy="15" r="6.2"/><circle cx="32.5" cy="15" r="6.2"/><circle cx="15.5" cy="30" r="6.2"/><circle cx="32.5" cy="30" r="6.2"/></g></svg>',
  gift: '<svg viewBox="0 0 48 48"><path d="M24 13c-3-7-12-8-11-2 .6 3 6 3 11 2Zm0 0c3-7 12-8 11-2-.6 3-6 3-11 2Z" fill="#ffd447" stroke="#9a5a00" stroke-width="2"/><rect x="7" y="13" width="34" height="10" rx="3" fill="#ff5d7a" stroke="#8a1f3a" stroke-width="2"/><rect x="10" y="22" width="28" height="21" rx="3" fill="#ff7a94" stroke="#8a1f3a" stroke-width="2"/><path d="M24 13v30" stroke="#ffd447" stroke-width="6"/></svg>',
  face: '<svg viewBox="0 0 48 48"><ellipse cx="16" cy="10" rx="5.4" ry="2.8" fill="#ffd96a" stroke="#b07800" stroke-width="1.6"/><ellipse cx="32" cy="10" rx="5.4" ry="2.8" fill="#ffd96a" stroke="#b07800" stroke-width="1.6"/><rect x="5" y="10" width="38" height="33" rx="10" fill="#ffc83a" stroke="#b07800" stroke-width="2"/><ellipse cx="18" cy="24" rx="4.4" ry="5.4" fill="#fff" stroke="#3a2a10" stroke-width="1.5"/><ellipse cx="30" cy="24" rx="4.4" ry="5.4" fill="#fff" stroke="#3a2a10" stroke-width="1.5"/><circle cx="19" cy="25" r="2.3" fill="#3a2a10"/><circle cx="31" cy="25" r="2.3" fill="#3a2a10"/><path d="M19.5 33.5q4.5 3.6 9 0" fill="none" stroke="#3a2a10" stroke-width="2.2" stroke-linecap="round"/><circle cx="11.5" cy="31" r="2.6" fill="#ff8a6a" opacity=".6"/><circle cx="36.5" cy="31" r="2.6" fill="#ff8a6a" opacity=".6"/></svg>',
  gear: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="#9a5a00" stroke-width="11" stroke-dasharray="6.4 6.95"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ffc83a" stroke-width="7.4" stroke-dasharray="4.8 8.55" stroke-dashoffset="-0.8"/><circle cx="24" cy="24" r="13" fill="#ffc83a" stroke="#9a5a00" stroke-width="2.4"/><circle cx="24" cy="24" r="6" fill="#3f7fe0" stroke="#9a5a00" stroke-width="2.4"/></svg>',
  calendar: (d) => '<svg viewBox="0 0 48 48"><rect x="7" y="10" width="34" height="32" rx="6" fill="#fff" stroke="#2e3f78" stroke-width="2"/><path d="M7 17a7 7 0 0 1 7-7h20a7 7 0 0 1 7 7v4H7Z" fill="#ff5d5d" stroke="#2e3f78" stroke-width="2"/><rect x="14" y="5" width="4.4" height="10" rx="2.2" fill="#2e3f78"/><rect x="29.6" y="5" width="4.4" height="10" rx="2.2" fill="#2e3f78"/><text x="24" y="37.5" text-anchor="middle" font-family="Bagel Fat One, sans-serif" font-size="15" fill="#2e3f78">' + d + "</text></svg>",
  tabShop: '<svg viewBox="0 0 48 48"><rect x="8" y="21" width="32" height="21" rx="3" fill="#3f7fe0" stroke="#1d3f7a" stroke-width="2"/><path d="M6 13h36l-2 9a4.2 4.2 0 0 1-8 0 4.2 4.2 0 0 1-8 0 4.2 4.2 0 0 1-8 0 4.2 4.2 0 0 1-8 0Z" fill="#ff7a3d" stroke="#8a3a10" stroke-width="2" stroke-linejoin="round"/><path d="M16 13l-1 9M24 13v9M32 13l1 9" stroke="#fff" stroke-width="2.6" opacity=".8"/><circle cx="24" cy="32" r="7.5" fill="#ffc83a" stroke="#9a5a00" stroke-width="2"/><circle cx="24" cy="32" r="4" fill="none" stroke="#e59a10" stroke-width="2"/></svg>',
  tabMap: '<svg viewBox="0 0 48 48"><path d="M5 12l12-4.5 14 4.5 12-4.5v29l-12 4.5-14-4.5-12 4.5Z" fill="#8ce6ac" stroke="#1e6a44" stroke-width="2" stroke-linejoin="round"/><path d="M17 7.5v29M31 12v29" stroke="#1e6a44" stroke-width="2"/><path d="M10 31c4-2 6-8 12-6s8-4 13-8" fill="none" stroke="#ff4d5e" stroke-width="2.6" stroke-dasharray="3 3.4" stroke-linecap="round"/><circle cx="36.5" cy="15.5" r="3.4" fill="#ff4d5e" stroke="#8a1f28" stroke-width="1.4"/></svg>',
  tabHome: '<svg viewBox="0 0 48 48"><rect x="3" y="7" width="23" height="19" rx="4.5" fill="#ffc83a" stroke="#9a6a00" stroke-width="2"/><rect x="24" y="11" width="20" height="23" rx="4.5" fill="#b06cf0" stroke="#5a2a8a" stroke-width="2"/><rect x="11" y="21" width="22" height="22" rx="4.5" fill="#3ccf6e" stroke="#1a6a36" stroke-width="2"/><g fill="#86f0a8"><circle cx="17.5" cy="28" r="2.8"/><circle cx="26.5" cy="28" r="2.8"/><circle cx="17.5" cy="36.5" r="2.8"/><circle cx="26.5" cy="36.5" r="2.8"/></g><g fill="#ffe08a"><circle cx="10" cy="13.5" r="2.6"/><circle cx="18.5" cy="13.5" r="2.6"/></g></svg>',
  tabBook: '<svg viewBox="0 0 48 48"><rect x="9" y="5" width="31" height="38" rx="5" fill="#6a3ad0" stroke="#33157a" stroke-width="2"/><rect x="13" y="5" width="27" height="33" rx="4" fill="#9a6af5"/><path d="M9.5 38.5h28" stroke="#ffd447" stroke-width="3"/><rect x="17" y="12" width="17" height="17" rx="4" fill="#ffc83a" stroke="#9a6a00" stroke-width="2"/><g fill="#ffe08a"><circle cx="22" cy="17" r="2.2"/><circle cx="29" cy="17" r="2.2"/><circle cx="22" cy="24" r="2.2"/><circle cx="29" cy="24" r="2.2"/></g></svg>',
  tabTrophy: '<svg viewBox="0 0 48 48"><path d="M14 10H8.5a6 6 0 0 0 7 8.5M34 10h5.5a6 6 0 0 1-7 8.5" fill="none" stroke="#9a5a00" stroke-width="2.6"/><path d="M14 5h20v11a10 10 0 0 1-20 0Z" fill="#ffc83a" stroke="#9a5a00" stroke-width="2"/><rect x="21" y="25" width="6" height="8" fill="#e8a020"/><rect x="12" y="32" width="24" height="10" rx="3" fill="#b06cf0" stroke="#5a2a8a" stroke-width="2"/><path d="M24 8.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z" fill="#fff6c0"/></svg>',
  sndOff: '<path d="M4 9v6h4l5 4V5L8 9H4Zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4-2.4-2.4Z"/>',
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
