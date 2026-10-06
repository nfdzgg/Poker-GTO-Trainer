# NOTES

Build notes for the Poker GTO Trainer (see `SPEC.md`-derived requirements in `scripts/requirements.mjs`).

## Assumptions

- Game model: 6-max cash, 100bb effective, no ante. Sizings: open 2.5bb (SB opens 3bb, SB is raise-or-fold), 3-bet about 3× in position and 4× out of position (SB/BB 3-bets are treated as out of position), 4-bet about 2.3× the 3-bet. The BB 3-bet vs the SB open is in position (4× is not used there; ~3×).
- "Facing open" spots are always heads-up: everyone between the opener and hero has folded. "Facing 3-bet" spots are heads-up between the opener and a single 3-bettor.
- The source repository URL used in the footer and README is `https://github.com/nfdzgg/Poker-GTO-Trainer` (the git remote of this checkout).
- The session clock date is used for milestone log dates.

## Decisions

- Tooling versions installed from npm at build time: Vite 8, Vitest 5, TypeScript 6, ESLint 10 (flat config) with typescript-eslint.
- `@playwright/test` is pinned to **1.56.1** because the pre-installed Chromium in the build environment is revision 1194, which is exactly the revision Playwright 1.56.1 expects (newer Playwright wants 1243 and cannot download it here).
- Hash-based routing is implemented with a ~40-line hook (`src/lib/router.ts`) instead of a router dependency.
- Requirement IDs are mapped to evidence by name: every Vitest/Playwright test that proves an ID has the ID in its title; check scripts write per-ID JSON results to `artifacts/verify/`. `scripts/verify.mjs` aggregates them; an ID passes only if every required evidence source reported at least one pass and nothing tagged with it failed. `scripts/requirements.mjs` is the single ID list.
- Preflop ranges are hand-written in range syntax in `scripts/preflop-source.ts` (one string per action per spot; fold is the remainder) and expanded by `npm run gen:preflop` into the 35 committed JSON files. Writing them as range text instead of 169-entry tables keeps them reviewable; the JSON is the data the app ships.
- Facing-3-bet spots store all 169 hands; hands outside hero's opening range are stored as pure folds and the explanation says the hand never reaches the spot. The drill never deals them (hands are weighted by hero's opening frequency).
- Drill "focus" mode (default on) deals only hands that are played in the spot or border a played hand in the 13×13 grid, so the drill concentrates on real decisions; it can be turned off.
- Hand dealing is weighted by combos (pairs 6, suited 4, offsuit 12) times reach probability; the RNG is mulberry32 seeded from the clock or `?seed=` in the drill URL.
- Explanations combine: the spot description, the hero position, the exact chart frequencies, a verdict sentence for the chosen action, a template keyed on (spot type × hand category) and a sentence on what the main action accomplishes.
- Motion durations are defined once as CSS custom properties in `src/styles/tokens.css`; JS reads them at runtime with `getComputedStyle` (fallback constants exist only for jsdom, where stylesheets are not computed).

## Test changes

- None so far.

## Known limitations

- None recorded yet.

## Milestone log

### M0 — 2026-10-06 — scaffold, tooling, verify harness

Vite + React + TS strict, ESLint, Vitest, Playwright (pinned), hash routing, design tokens, app shell, `npm run verify` with all 45 IDs. M0 targets BUILD-01 and DOC-02 pass; everything else fails as expected.

`VERIFY SUMMARY: required 3/43, stretch 0/2, skipped 0`

### M1 — 2026-10-06 — preflop data, combo math, grading, explanations

35 hand-written spot files (RFI UTG 16.1%, HJ 21.0%, CO 28.4%, BTN 44.1%, SB 43.0%), range parser/formatter, combo math, seedable drill dealer with filters, Best/Acceptable/Mistake grading, template explanations for all 35×169×actions.

`VERIFY SUMMARY: required 10/43, stretch 0/2, skipped 0`
