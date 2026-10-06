# NOTES

Build notes for the Poker GTO Trainer (see `SPEC.md`-derived requirements in `scripts/requirements.mjs`).

## Assumptions

- Game model: 6-max cash, 100bb effective, no ante. Sizings: open 2.5bb (SB opens 3bb, SB is raise-or-fold), 3-bet about 3× in position and 4× out of position (SB/BB 3-bets are treated as out of position), 4-bet about 2.3× the 3-bet. The BB 3-bet vs the SB open is in position (4× is not used there; ~3×).
- "Facing open" spots are always heads-up: everyone between the opener and hero has folded. "Facing 3-bet" spots are heads-up between the opener and a single 3-bettor.
- The source repository URL used in the footer and README is `https://github.com/nfdzgg/Poker-GTO-Trainer` (the git remote of this checkout).
- The session clock date is used for milestone log dates.

## Decisions

- Four-color deck: diamonds blue, clubs green; toggled on the drill screen and stored in `pgt.prefs.v1`. The green was darkened to reach 4.5:1 contrast on the card face.
- Tooling versions installed from npm at build time: Vite 8, Vitest 5, TypeScript 6, ESLint 10 (flat config) with typescript-eslint.
- `@playwright/test` is pinned to **1.56.1** because the pre-installed Chromium in the build environment is revision 1194, which is exactly the revision Playwright 1.56.1 expects (newer Playwright wants 1243 and cannot download it here).
- Hash-based routing is implemented with a ~40-line hook (`src/lib/router.ts`) instead of a router dependency.
- Requirement IDs are mapped to evidence by name: every Vitest/Playwright test that proves an ID has the ID in its title; check scripts write per-ID JSON results to `artifacts/verify/`. `scripts/verify.mjs` aggregates them; an ID passes only if every required evidence source reported at least one pass and nothing tagged with it failed. `scripts/requirements.mjs` is the single ID list.
- Preflop ranges are hand-written in range syntax in `scripts/preflop-source.ts` (one string per action per spot; fold is the remainder) and expanded by `npm run gen:preflop` into the 35 committed JSON files. Writing them as range text instead of 169-entry tables keeps them reviewable; the JSON is the data the app ships.
- Facing-3-bet spots store all 169 hands; hands outside hero's opening range are stored as pure folds and the explanation says the hand never reaches the spot. The drill never deals them (hands are weighted by hero's opening frequency).
- Drill "focus" mode (default on) deals only hands that are played in the spot or border a played hand in the 13×13 grid, so the drill concentrates on real decisions; it can be turned off.
- Hand dealing is weighted by combos (pairs 6, suited 4, offsuit 12) times reach probability; the RNG is mulberry32 seeded from the clock or `?seed=` in the drill URL.
- Explanations combine: the spot description, the hero position, the exact chart frequencies, a verdict sentence for the chosen action, a template keyed on (spot type × hand category) and a sentence on what the main action accomplishes.
- Each drill deal is a pure function of (seed, deal number, filters), so `?seed=` replays a session exactly and React re-renders cannot consume RNG state.
- The stats file is `{version: 1, records: [...], postflop: [...]}` under `pgt.stats.v1`; anything unparseable, of another version or of the wrong shape loads as empty stats and individual malformed records are dropped. Records are capped at 20,000.
- "Correct" for accuracy = Best or Acceptable mix. Leak buckets are only the position × spot-type pairs that exist (BB has no RFI spot; those cells show "n/a").
- The reset confirmation is an in-page `alertdialog` rather than `window.confirm`, so it is styleable and testable.
- Animations are driven by a `useAnimPhases` hook that steps a `data-anim` attribute through named phases on timers (deal: `dealing → flipping → revealed`; flip: `face-down → flipping → revealed`; chips: `idle → moving → in-pot`; grade: `grade-enter → grade-shown`; screen: `entering → entered`). CSS keys off the attribute and animates only `transform`/`opacity` (enforced by `check:assets` and a unit test). With `prefers-reduced-motion` the hook jumps to the final phase and a global media query shortens any remaining CSS motion to 1ms.
- Tap targets: every button, link, select and checkbox label is at least 44×44px on the phone viewport (Playwright check). The 169 range-grid cells are exempt: SPEC requires the whole 13×13 grid to be visible without horizontal scrolling at 390px, which makes cells ~26px; this is the WCAG 2.5.8 "essential" exception. Each cell remains a focusable button with a full ARIA label, and the detail panel is reachable by keyboard. Inline links inside paragraphs are exempt (WCAG "inline" exception). The E2E check rounds to whole CSS pixels because sub-pixel layout can report 43.99px for a 44px control.
- The only file under `public/assets/` is an original noise texture (`felt-noise.svg`, CC0) referenced with a base-relative URL; all cards, chips, suits and the table are inline SVG/CSS components.
- Solver: `solver-wasm/` wraps b-inary/postflop-solver pinned at commit `9d1509fe5077d019825f833eed04b16d342dfda1` with `default-features = false` (no rayon, no bincode/zstd), built by `wasm-pack --target web` with `+simd128` and `wasm-opt -O3`. The Rust toolchain, `wasm-pack` (installed with `cargo install`) and `wasm-opt` (`cargo install wasm-opt`, because the binaryen release download from GitHub was blocked by the sandbox) all worked, so the TypeScript fallback was **not** used. The `custom-alloc` feature was not enabled because it needs nightly Rust.
- WASM SIMD (`+simd128`) is enabled: ~30% faster per iteration. It is supported by every current browser (Chrome/Edge 91+, Firefox 89+, Safari 16.4+) and Node.
- The solver works in integer chips; the TS API uses 100 chips per big blind and converts every pot, bet and EV back to bb. EVs are postflop-solver's per-hand EVs: the chips a hand expects to collect from the pot from this node on, net of future bets (folding = 0).
- P2-ENG-04's sample flop spot uses **all-in as its one raise size** on every street. With a 3x raise the tree needs 7.3 GB (3.7 GB compressed), beyond wasm32's 4 GB address space and its 2 GB single-allocation limit; with all-in raises it needs 1.59 GB (0.81 GB compressed). The Node check solves it uncompressed (faster per iteration) and the analyzer compresses automatically when the uncompressed size exceeds the device limit.
- Exploitability is reported as a percentage of the starting pot (postflop-solver's exploitability in chips ÷ starting pot).
- The solver runs in a module Web Worker (`src/solver/worker.ts`) whose message handling lives in `workerCore.ts` so it can be unit-tested in Node; solves run in ~30ms slices and yield to the worker's event loop so a `cancel` message is picked up promptly.
- Motion durations are defined once as CSS custom properties in `src/styles/tokens.css`; JS reads them at runtime with `getComputedStyle` (fallback constants exist only for jsdom, where stylesheets are not computed).

## Test changes

- None so far.

## Known limitations

- Single-threaded WASM is slow on wide flop trees: the P2-ENG-04 sample flop (full BTN open vs BB flat ranges) completes ~13 iterations in a ~38 s budget and reaches only ~40% of pot exploitability; turn and river spots converge to <1% in seconds. The analyzer's built-in flop example therefore uses narrower (3-bet pot) ranges.

## Milestone log

### M0 — 2026-10-06 — scaffold, tooling, verify harness

Vite + React + TS strict, ESLint, Vitest, Playwright (pinned), hash routing, design tokens, app shell, `npm run verify` with all 45 IDs. M0 targets BUILD-01 and DOC-02 pass; everything else fails as expected.

`VERIFY SUMMARY: required 3/43, stretch 0/2, skipped 0`

### M1 — 2026-10-06 — preflop data, combo math, grading, explanations

35 hand-written spot files (RFI UTG 16.1%, HJ 21.0%, CO 28.4%, BTN 44.1%, SB 43.0%), range parser/formatter, combo math, seedable drill dealer with filters, Best/Acceptable/Mistake grading, template explanations for all 35×169×actions.

`VERIFY SUMMARY: required 10/43, stretch 0/2, skipped 0`

### M2 — 2026-10-06 — drill UI, range viewer, stats

Drill screen with felt table, dealt SVG cards, action buttons, grade badge, explanation, frequency bar and range link; 13×13 range viewer with proportional bands, legend, detail panel, roving-tabindex keyboard navigation; stats screen (versioned localStorage, accuracy tables, biggest leaks with drill links, confirm-to-reset).

`VERIFY SUMMARY: required 18/43, stretch 0/2, skipped 0`

### M3 — 2026-10-06 — visual design, cards, chips, animations, Phase 1 E2E

Original SVG cards/chips, card fan on Home, animation phases with reduced-motion support, contrast/focus/tap-target checks, ASSETS.md, Playwright smoke/responsive/preflop-flow/screenshot tests from a `/poker-gto-trainer/` sub-path. **Phase 1 gate passed:** every P1-*, UI-* and E2E-01/02/03/05 ID passes.

`VERIFY SUMMARY: required 28/43, stretch 0/2, skipped 0`

### M4 — 2026-10-06 — solver WASM, TypeScript API, Node checks, worker

postflop-solver@9d1509f built single-threaded to a 268 kB SIMD WASM (committed), typed `PostflopSolver` API (configure/estimateMemory/allocate/solveStep/solve/cancel/finalize/getNode/getNodeStrategy/getHandEV/play/dealCard/back), worker + client. check:solver: toy river IP calls 50.2% and value:bluff 2.00:1; turn spot 0.475% of pot in 140 iterations (3.5 s); flop spot root strategy in 44.5 s wall clock.

`VERIFY SUMMARY: required 33/43, stretch 0/2, skipped 0`
