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
- Motion durations are defined once as CSS custom properties in `src/styles/tokens.css`; JS reads them at runtime with `getComputedStyle` (fallback constants exist only for jsdom, where stylesheets are not computed).

## Test changes

- None so far.

## Known limitations

- None recorded yet.

## Milestone log

### M0 — 2026-10-06 — scaffold, tooling, verify harness

Vite + React + TS strict, ESLint, Vitest, Playwright (pinned), hash routing, design tokens, app shell, `npm run verify` with all 45 IDs. M0 targets BUILD-01 and DOC-02 pass; everything else fails as expected.

`VERIFY SUMMARY: required 3/43, stretch 0/2, skipped 0`
