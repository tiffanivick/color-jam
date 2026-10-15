# Color Jam: Master Handoff & Implementation Spec

Audience: an LLM coding agent (Claude Code) taking over development.
Repo: `github.com/tiffanivick/color-jam` (branch `main`), deployed by GitHub Pages at
`https://tiffanivick.github.io/color-jam/`. Owner plays it as an iPhone home-screen web app.
Current live build: **45** (`?v=45`).

---

## 0. Correct the assumed stack first

Earlier planning assumed **React + HTML5 Canvas + Node.js backend**. That is **not** what exists.
Do not scaffold React, Canvas or a server. The actual stack:

| Layer | Reality |
|---|---|
| Frontend | Vanilla JS (no framework, no bundler, no npm deps), plain `<script>` tags in `index.html` |
| Rendering | **DOM + inline SVG + CSS**. Blocks are absolutely positioned `div`s; their 3D look is an SVG built by `src/brick.js`. No `<canvas>`, no `ctx.save/translate/rotate` anywhere. |
| Animation | CSS transitions + Web Animations API (`el.animate`) + `requestAnimationFrame` |
| Backend | **None.** Static files on GitHub Pages. Save data in `localStorage`. |
| Offline | `sw.js` service worker, network-first, `cache: "no-store"` |
| Level tooling | Python 3 (BFS solver/generators in `tools/`), Playwright + Chromium for visual tests |

Every requirement below that mentions Canvas transforms must be implemented with the DOM equivalents:
CSS `transform` (`translate/rotate/scale`, `transform-origin`) and WAAPI keyframes, **or** pre-rendered
3D sprites (see §3.6). Introducing a `<canvas>` overlay just for the tools is acceptable only if it
stays in the board's coordinate system (see §3.3).

---

## 1. Project overview

"Color Jam" is a personal clone of the mobile game *Color Block Jam*: a sliding-block puzzle.
Multi-cell coloured blocks sit on a grid surrounded by coloured gates. Drag a block; when it is pushed
fully against a gate of its own colour (and fits the gate's span), it slides out. Clear every block
before the clock runs out.

Content: 80 hand-verified levels in `levels.json` across 8 themed worlds (`src/worlds.js`): Sunny Meadow,
Frostbite Peak, Candy Cove, Ember Forge, Starlight Station, Coral Reef, Golden Dunes, Sunset Skies.
Meta: coins, stars, daily login, daily quests, trophies, chests, shop, Bonus Rush mode, per-world picture.

### File map

| File | Responsibility |
|---|---|
| `index.html` | Markup and script order: `sound.js, worlds.js, brick.js, block3d.js, engine.js, fx.js, workshop.js, app.js`, all `?v=N` |
| `src/engine.js` | Board, blocks, drag physics, movement rules, gates/exits, themed mechanics, bombs |
| `src/brick.js` | SVG "realistic" block: rounded outline across cells, gradients, studs, rim, and the overlays (ice, chains, stripes, arrows, snow) |
| `src/block3d.js` | Since build 39: the realistic block **body** as a real 3D render (WebGL2 ray-marcher, glossy plastic, studs, contact shadow), cached per shape + colour as a PNG data URL. `renderBlock()` puts it under the SVG (`img.block-3d`, wrapper class `.b3d`) and CSS hides the SVG's own body. Crates, rainbow, pillar, bubble, jelly and comet blocks keep the SVG body. No WebGL → SVG body as before. Preview: `tools/r3d/blocks.html`. |
| `src/fx.js` | **Power-up visuals and aiming**: hammer, vacuum, freeze, tool aiming/tracking |
| `src/solver.js` | Since build 45: in-game solver, run as a Web Worker after every settled change (`queueStuckCheck()` from `updateBoosters()`). Searches every option (no greedy exits), bombs ignored, crates smashable, cap 150k states → `null` (unknown). If the board can't be won, a card offers a free **rewind** to the newest snapshot (`boardHistory`) that can still win; `restoreSnapshot()` re-renders blocks that had left. Also runs in node: `require('./src/solver.js').solvable(board)`. |
| `src/workshop.js` | Since build 40: the **Workshop** (see §2.5): mystery blocks, blueprints, and the gadgets Magnet, Ghost, Saw, Rainbow Brush. Loaded before `app.js`, so its top-level code must not touch `app.js` names. |
| `src/app.js` | Game state and save, level flow, timer, boosters, win/lose, shop, quests, trophies, UI sheets |
| `src/sound.js` | WebAudio synth SFX (`Sfx.smash(n)`, `Sfx.suck()`, `Sfx.freeze()`, `Sfx.pop()`, …) |
| `src/worlds.js` | World themes: colours, backgrounds, and which mechanics each world introduces |
| `style.css` | All styling; `.skin-real` = realistic blocks; `.fx-*` = power-up effects |
| `sw.js` | Service worker |
| `t1/`, `t2/` | Alternate layout test pages; must get the same `?v=` bump |
| `tools/solver3.py` | BFS solver implementing every rule (used to verify all levels) |
| `tools/*.py` | Level generators/augmenters/repairers |
| `tools/tests/` | Playwright harnesses (see §4.4) |
| `tools/r3d/` | **In-progress** ray-marched 3D sprite renderer for the tools (see §3.6) |

---

## 2. Core mechanics & rules

### 2.1 Grid
- Per-level `rows × cols` (typically 6×7 … 7×6). Constants in `engine.js`: `CELL = 48`, `GAP = 6`,
  `STEP = 54` (cell pitch), `PADDING = 0`, `BORDER = 14`.
- Board-local pixel position of cell `(r, c)`: `x = PADDING + c*STEP`, `y = PADDING + r*STEP`.
  The board may be CSS-scaled to fit the phone: convert pointer coordinates with
  `k = rect.width / boardEl.offsetWidth` (see `boardPoint(e)` in `fx.js`).
- Fixed features: `walls` (tree stumps, impassable), `lava` (pass through, cannot stop on).

### 2.2 Blocks ("clusters")
- A block is one rigid polyomino: `{ color, cells: [[r,c],…], id, …flags }`. It moves as a unit.
  Blocks never merge or split. Each block is one `.block-group` element containing `.block-cell` divs
  (for hit-testing) plus the SVG body from `brick.js`.
- Dragging: `computeReachable(block)` floods every square-aligned offset reachable through empty space.
  The drag follows the pointer inside that set, and `endDrag()` snaps to the nearest legal resting spot.
- Exiting: `findExit()` checks for a gate of the block's colour on the side it is moving toward, and that
  **all** of its cells fit inside the gate's span. `exitPathClear()` stops a block from passing through
  other blocks on the way out.
- Since build 38 a block leaves only when it is **locked onto the square in front of its gate and the
  finger pushes on past it** (`gatePush()`, `PUSH = 0.4` squares). The square in front of a gate is an
  ordinary square: blocks may stop there or slide past. Tapping never sends a block out. The gate
  glows (`.exit.ready`) while a lined-up block is pushed toward it, and `exitBlock()` snaps the block
  exactly in line before sliding it through. `tools/solver3.py` mirrors this.
- Flags / themed kinds:
  - `ice: n`: frozen until `n` other blocks leave.
  - `axis`: slides along its arrow only.
  - `crate`: tap twice to smash; may drop a power-up.
  - `gray`: has no gate; it is an obstacle you shove aside.
  - `lockBy`: chained until the key block leaves.
  - `bomb: n`: fuse in seconds, `bombSeconds(n) = max(20, round(n*7.5/5)*5)`. It burns in real time
    while the clock runs (`burnFuses(dt)`); reaching 0 loses the level.
  - `jelly`: moves one square per drag.
  - `comet`: only flies straight to the end of a line. It cannot stop mid-line; another block or
    feature must be placed to stop it. Since build 42 the flick direction is read from the finger
    (`drag.target`), not the block, and it launches once the finger has gone 0.45 squares: a comet
    already in front of its gate can't move, but must still go out when flicked toward it.
    Since build 45 a flying comet also **parks** at the first square where a gate of its colour is
    straight off to its side with a clear way out (`cometSeesGate()`; mirrored in solver3 and
    src/solver.js). All 80 levels still solve; levels 42, 44, 47, 49 got 1-2 moves shorter.
  - `bubble`: floats up one square after every move.
  - `pillar`: blocks the way, crumbles after N moves.
  - `rainbow`: may use any gate.
- Every level is verified solvable by `tools/solver3.py` (BFS over full board state, all rules,
  bombs as a move-count proxy). **Any engine rule change must be mirrored in the solver, and all
  80 levels re-verified.**

### 2.3 Win / loss
- **Win:** every block that `isNeeded(b)` (not gray, crate or pillar) has left or been removed.
  `checkWin()` in `app.js`. Removal by power-up counts. The win check is deferred until power-up
  animations finish (`fxBusy` counter and `done` callbacks).
- **Loss:** the level timer reaches 0 (`timeUp()`, with a continue offer for coins), or a bomb fuse
  reaches 0.
- Timer: starts on the first move (`startTimer`). Freeze pauses it for 10 s.
- Stars: `starsFor(moves, par)`: 3 if `moves ≤ par`, 2 if `≤ par+2`, otherwise 1.

### 2.4 Power-ups (logic, unchanged and working)
- Inventory `S.inv = {undo, hammer, freeze, vacuum}`. Prices: undo 20, hammer 40, freeze 30, vacuum 80.
- All four are **locked until the first move starts the timer** (`lockedUntilStart`, `updateBoosters`).
- **Undo:** restores the previous snapshot.
- **Freeze:** `freezeUntil = now + 10000`, then calls `freezeFX(10000)`.
- **Hammer:** removes the one targeted block → `hammerFX(b, finish)`.
- **Vacuum:** removes the targeted block **and every other block of the same colour** (nearest first),
  not neighbours. Then `vacuumFX(group, finish)`.
- Tool arming: `setTool(mode)` in `app.js` sets `toolMode`/`blastMode` and calls `toolAimShow(mode)`.
  The actual use goes through `blast(b)`.

---

### 2.5 The Workshop (build 40)
- Every win pushes a mystery block onto `S.workshop.boxes` (`"gold"` for 3 stars, else `"plain"`;
  a finished world adds two gold ones). New and old saves start with one free gold block.
- Workshop screen (Home tile, `#paneWorkshop`, `renderWorkshop()`): tap a block twice. It cracks,
  then bursts and 2 pieces (gold: 3) fly into the current 3x3 blueprint (`S.workshop.got`).
  Never a duplicate; pieces beyond a full blueprint become 15 coins each. A full blueprint must be
  built before more blocks open.
- Building: blueprints 1-4 unlock a gadget each (+3 uses and 100/120/150/180 coins); then bonus
  blueprints (Pocket Rocket, Helper Robot, Sky Balloon, cycling) pay 200+50k coins and 2+ random
  gadgets. Pictures are inline SVG in `BP_ART`, shown 3x3 via `background-position`.
- Gadgets (`S.inv.magnet|ghost|saw|paint`, prices in `COST`) sit in `#gadgets` above the boosters
  once built, also in the Shop. They are player aids only: no level rule or solver change.
  - **Magnet**: every needed block with a clear straight run to a gate of its colour exits, one
    after another (`magnetPath()`), until none is left. Each exit counts as a move.
  - **Ghost**: `ghostBlock` in engine.js. `tryStep()` and `exitPathClear()` ignore other blocks
    for it; squares overlapping a block are `noStop`. Ends after it moves or leaves (`endGhost()`).
  - **Saw**: removes the tapped square (or the nearest end square if that would split the block),
    then `rebuildBlock()` (keeps the bomb fuse, clears undo).
  - **Rainbow Brush**: sets `b.rainbow` (any gate) and rebuilds.
  - Targeted gadgets go through `setTool(id)` → engine `blast(b, e)` → `gadgetTap()`.

### 2.6 Economy, board look and gadget toolbox (build 42)
- Economy: a win pays ~15-30 coins (`base 8`, `2/star`, `TIER_BONUS` up to 10, combo 2/step, time
  up to 6); quests 10-25; login 10-50; chests 15-40 + 2 power-ups; trophies 20; Bonus Rush crates
  1/2/5 with at most 2 free power-ups and 25 s; Workshop builds 60-120 (bonus 120+30k).
  Prices in `COST` (undo 40, freeze 80, hammer 120, vacuum 200, magnet 220, ghost 150, saw 130,
  paint 180), +20 s = 60, a mystery block = 150 (`BOX_COST`).
- Build 43: saves without `S.econ` are rebalanced once in `load()`: coins capped at `ECON_CAP` (300),
  the excess becomes gold mystery blocks (1 per 1200, max 5), power-ups trimmed to `ECON_INV` (5)
  each; `showEconNote()` explains it on the next start, before the login reward.
- Realistic board: sunken squares (`.skin-real .cell:not(.lava)`), each gate (build 44: solid, with a thin dark seam on its
  board side lit in its colour (`--gc`, set with `backgroundColor`, never the `background`
  shorthand), blocks darken as they slide in (`.exiting`), the frame takes a 2px knock.
- Gadgets: one **Gadgets** button (`#boosterTools`) on the power-up bar opens the `#gadgets` tray;
  while a gadget is picked the button shows it and tapping it puts it away.
- Home: the Workshop is a strip at the foot of the world card (`renderWsStrip()`); the win sheet's
  mystery-block note is an "Open it now" button to the Workshop.

## 3. Power-up visual spec (CRITICAL)

### 3.1 Status
**Build 37: the hammer and vacuum are pre-rendered 3D sprites (§3.6), approved by the owner from
stills before integration.** Earlier rejected iterations, all live at some point:
1. Toy hammer swinging in from the side.
2. Cartoon gloved hands or arms holding the tools.
3. Flat side-profile "T" mallet (horizontal log on a vertical handle) that glides up.
4. Top-down round "stamp" or "coin" (build 36). **Rejected:** it reads as a flat disc.

The owner wants the tools to look like the **3D, isometric, chunky** tools in *Color Block Jam*.
The hand-drawn SVGs (`FX_HAMMER_SVG`, `FX_NOZZLE_SVG`) are gone; `src/fx.js` now shows
`img/hammer-0..6.webp` and `img/vacuum.webp` through `fxSprite()` (see §3.6).

### 3.2 Hard requirements (both tools)
- R1. **No hands, arms, gloves or characters.** The tool is an isolated asset. (All hand code is
  already removed.)
- R2. **True 3D read.** Visible top, side and face planes with real shading: gradients, specular
  highlights, ambient occlusion, layered caps and sides. No flat circles, no side profiles.
- R3. **Isometric / high-angle orthographic camera**, matching the board's implied viewpoint.
- R4. The tool is **anchored to the pointer** (touch or mouse) and tracks it every move. The player's
  finger is the end of the handle; the head is drawn at a fixed offset above the finger so the finger
  does not hide it. The target is the block whose cell is under the **head's strike point**.
- R5. A **drop shadow** on the board under the head shows height. It is bigger and fainter when
  raised, tighter and darker at contact.
- R6. **Hover scale ≈ 1.2×** while floating over the target.
- R7. Do not slide tools in from the bottom of the screen during use. They appear at the pointer.
  (They may rest at bottom-centre while armed and untouched.)

### 3.3 Hammer
- Head: a **chunky wooden 3D cylinder** with gold bands, end-grain cap and a visible barrel side.
  At hover it is **tilted diagonally ~45° down toward the board**, so the barrel side dominates and the
  striking face is angled at the target.
- Handle: attaches to the **side of the cylinder** and runs **down and back off-screen toward the
  player**, foreshortened, diagonally to the lower right in the current draft. It never ends visibly
  on the board; it must exit the screen edge.
- Smash cycle (per strike, 3 strikes, then break):
  1. Hover: raised pose, scale 1.2, shadow wide and faint.
  2. Strike (~110 ms, ease-in): **rotate about the handle/pivot axis** so the face comes down flat onto
     the block. Scale 1.2 → 1.0, with a slight squash (`scale(1.07, 0.93)`) on contact.
  3. Contact: block squash (`el.animate` scaleY ~0.9), cracks grow (`.fx-crack` scale 0.5, 0.8, 1.1),
     board shake, `burst()` particles, `Sfx.smash(n)`.
  4. Pull back (~150 ms) to the hover pose.
  5. After the 3rd strike: break the block into ~9 wedge fragments. Keep the existing implementation:
     clip-path polygons over `el.cloneNode(true)`; hide the original with **`opacity: 0`, not
     `visibility`**, because the clones reference its SVG clipPath ids. Then fade the hammer and
     call `done()`.
- Strike point = the head-centre projection at the contact pose. The sprite's anchor must be defined in
  sprite pixel space and placed so this point lands exactly on the aimed cell.

### 3.4 Vacuum
- Nozzle: a **thick rectangular 3D block** (glossy blue floor head with red and orange buttons on top),
  **tilted slightly forward** so its top face **and** its front suction mouth (dark slot) are both visible.
- Hose: a silver ribbed hose from the **centre** of the nozzle, running **straight down the screen**
  and off the bottom edge.
- Cycle:
  1. Hover at the pointer: scale 1.2, shadow wide.
  2. On release over a block: **lower** to scale 1.0 while staying tilted forward, and settle; the
     shadow tightens.
  3. Hum: tiny jitter loop.
  4. Suck each block of the target colour in turn (stagger 300 ms). Keep the current block animation:
     tremble, stretch, then shrink to the mouth with `transformOrigin` at the mouth over ~760 ms; the
     block element is moved into `boardEl` at z-index 33, under the nozzle.
  5. Air and dust streaks converge on the mouth; gold sparkles pop.
  6. A lump in the block's colour travels down the hose and off-screen.
  7. The nozzle lifts and leaves, then call `done()`.

### 3.5 Freeze (next)
No target. An ice wand rises, bursts snowflakes, and `.fx-frost` covers the board for the freeze
duration. No hands (already removed). Keep it vertical (no tilt). Restyle to the same 3D standard
after the hammer and vacuum are accepted.

### 3.6 3D sprites (integrated in build 37)
npm and CDNs were blocked in the original environment, so three.js could not be used. Instead a
dependency-free **WebGL2 SDF ray-marcher** draws the tools, and the game shows pre-rendered images.
- `tools/r3d/render.html`: GLSL scene, `renderFrame(o)`. Units are board squares; the board is the
  plane y = 0; world (0,0,0) = the strike point. Uniforms/params: `tool` (0 hammer, 1 vacuum),
  `ang` (hammer swing about the pivot; vacuum forward tilt), `yaw` (handle direction), `elev`
  (camera elevation, 0.62 rad), `S` (px per square), `org` (`ox`,`oy`: where the strike point lands),
  hammer shape `hr` (head radius), `hh` (head half-length), `gz` (grip start), `pz` (pivot distance).
- `tools/r3d/preview.html#{"base":{...},"shots":[{...},…]}`: side-by-side variants over a board grid,
  for tuning with the owner.
- `tools/r3d/export.html`: renders the approved poses (4x supersampled, shown at 2x), crops each to
  its own box and saves `img/hammer-N.webp` (raised 0 → contact 6), `img/vacuum.webp` and
  `img/tools.json` (each image's size and strike point, the finger offset, the vacuum mouth).
  Needs `python3 tools/r3d/serve.py` (port 8792, repo root, also accepts PUT into `img/`).
  **After a re-export, copy the numbers from `img/tools.json` into `HAM3D` / `VAC3D` in `fx.js`.**
- Approved look: hammer `hr .8, hh .95, gz 2.4, pz 1.8, yaw -1.2`, swing `ang -0.8 → 0`; vacuum
  `ang 0.15` (chunky blue head, white bumper, mouth slot on the front, hose out of the top).
- `shoot.py` and the `*_draft.png` files are the earlier Playwright route and first drafts.

How the game uses them (`src/fx.js`):
- `fxSprite(cls, HAM3D|VAC3D)`: a zero-size box placed **at the strike point**, holding one `<img>`
  per pose, each offset by its own `hx, hy`; `el.show(i)` swaps poses. `transform-origin: 0 0`, so
  scaling never moves the hit point. Images are preloaded when `fx.js` loads.
- Hover size `HOVER = 1.2`. The finger sits `gy` px (× 1.2) straight below the strike point: on the
  hammer the handle runs ≥100 px to the right of the target, so a finger on the handle could not
  reach the right-hand columns. The vacuum's finger point is on its hose.
- `hammerFX` runs one `fxRun()` timeline (rAF, with a 100 ms interval fallback so it still finishes
  when the browser withholds frames): per strike, frame 0 → 6 and scale 1.2 → 1.0 with ease-in over
  110 ms, squash `(1.07, 0.93)` on contact, swing back over 110 ms; strikes at 300/600/900 ms,
  break at 990 ms, `done()` at 2070 ms.
- `vacuumFX`: scale 1.2 → 1.0 on release, hum, slurp toward the strike point (= the mouth), lump
  down the hose from `hit.y + 24`, lift and leave.

### 3.7 Existing plumbing to keep (`src/fx.js`)
- `TOOL` table, `toolAimShow(mode)`, `toolAimPlace(x,y,lifted)`, `toolAimRest()`, `toolAimFinger(e)`:
  - Window-level **capture-phase** `pointerdown/move/up/cancel` listeners. While a tool is armed they
    stop propagation so the engine's block drag never fires.
  - On `pointerup` over a target: `window.__toolFrom = {x,y}` (the head point), then
    `toolAimShow(null)`, then `blast(b)`. `hammerFX`/`vacuumFX` read `__toolFrom` so the animation
    starts exactly where the aim sprite was.
  - On release over an empty spot: go back to the rest state, still armed.
  - The target block gets `.aim-target` (a glow).
- `fxBusy`: counter; the win check waits for it to finish.
- `fxRect(b)` and `fxSpot(b)`: block box and best hit point in board px.
- `window.__FXK`: test-only time multiplier for rAF-driven timelines (slow-motion captures).

---

## 4. Immediate next steps for Claude Code

### 4.1 Scan first (do not assume Canvas or React)
1. `git pull`, then read `index.html` (script order, `?v=`), `src/fx.js` (entire), the `blast()`,
   `setTool()`, `checkWin()` and `startTimer()` sections of `src/app.js`, and `setupDrag()`,
   `endDrag()` and `tryStep()` in `src/engine.js`.
2. Confirm that the "game loop" is event-driven DOM: drag rAF `glide()` in `engine.js`, the timer
   `tick()` rAF in `app.js`, and per-effect rAF/WAAPI in `fx.js`. There is no central render loop to
   patch.

### 4.2 Fix tool orientation and art without breaking anchoring (done in build 37)
1. Replace `FX_HAMMER_SVG` and `FX_NOZZLE_SVG` usage with 3D sprite elements (§3.6). Update
   `TOOL.*.g` anchors to the new sprite geometry.
2. Rewrite the pose and keyframe sections of `hammerFX` and `vacuumFX` to the cycles in §3.3 and §3.4:
   - Hammer: frame-stepped rotation raised → contact plus scale 1.2 → 1.0 with a squash, ×3.
   - Vacuum: scale 1.2 → 1.0 while tilted.
3. Keep the CSS transform-origin at the strike point, so scaling never moves the hit location off the
   aimed cell.
4. Invariants:
   - Pointer-to-board conversion via `boardPoint(e)`, including the CSS scale factor.
   - Target = block containing the cell under the head point.
   - `__toolFrom` handoff.
   - Win only after `done()`.

### 4.3 Verify
- Owner sign-off is required on stills before shipping: render hover, contact and break frames.
- `tools/tests/aimtest.py <Hammer|Vac> out.png`: arms the tool, touches below a target, drags, releases,
  and captures slow-motion frames. Its finger offsets (`+92*k` / `+120*k`) match build 37
  (`HAM3D.gy`/`VAC3D.gy` × 1.2); change them together.
- `tools/tests/wintest.py`: the level must not count as won until the animation finishes (`fxBusy` → 0,
  then `levelOver`).
- `tools/tests/fxframes_slow.py`: generic slow-motion frame grabber (6× via patched timers and WAAPI).
- The harnesses expect a static server on **port 8792 serving the repo root**. Some scripts contain
  absolute paths from the old workspace (`/home/claude/v3`, `/tmp`); fix those paths before use.
- Level integrity (only if engine rules change): run `tools/solver3.py` over `levels.json`; all 80 must
  solve. Replay harness: `tools/tests/gp4.py` + `replay4.py`/`replay4.js`.

### 4.4 Deploy
1. Bump `?v=N` everywhere in `index.html`, `t1/index.html` and `t2/index.html` (37 next).
2. Commit and push to `main`. GitHub Pages serves within ~10 min.
3. The owner verifies on the phone by fully closing and reopening the home-screen app, then checking the
   build label (tap it for diagnostics).

### 4.5 Constraints and gotchas
- iPhone home-screen layout: the manifest `<link>` is intentionally **absent** (it made iOS use a short
  812 px window). Keep the `vp-short` class and `--safe-b` handling. No auto-reload.
- `.skin-real` CSS specificity is fragile. Old high-specificity rules caused seams; check blocks after
  any CSS change.
- `brick.js` inner corners: gap-crossing only when `R && D && RD` (prevents notches).
- Hide broken blocks with `opacity: 0`, not `visibility` (clip-path id references).
- `html` and `body` use `overflow: clip` (since build 41). `overflow: hidden` alone still let iPhone
  drag the page sideways when the hammer's long handle or flying pieces stuck out past the screen.
- Do not commit level-generation logs or `__pycache__`.
- Keep commit-message attribution lines as the repo history shows.
