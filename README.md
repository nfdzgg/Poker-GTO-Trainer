# Poker GTO Trainer

A free, static web app for studying No-Limit Hold'em strategy:

- **Preflop trainer** — drill 6-max 100bb decisions (raise first in, facing an open, facing a 3-bet) against 35 hand-written range charts, with Best / Acceptable mix / Mistake grading, explanations, a 13×13 range viewer and stats with your biggest leaks.
- **Postflop analyzer** — build a heads-up spot (ranges, board, stacks, bet sizes) and solve it in your browser with a real CFR solver ([postflop-solver](https://github.com/b-inary/postflop-solver) compiled to WebAssembly), then browse the strategy node by node, or press **Drill this spot** to practise random hands at random decisions of the solved tree, graded against the solver with EV loss (results appear in a separate Postflop section of the stats).

Everything runs in the browser: no backend, no accounts, no analytics and no network requests after the page has loaded. Stats and settings stay in your browser's `localStorage`.

## Study tool only

This is a study tool for use away from the table. It has **no real-time assistance** features: no screen reading, no HUD, no live hand-history import and no overlay mode. Do not use it while playing; most poker sites forbid real-time assistance.

## Preflop ranges are approximations

The preflop ranges are **approximations of published solver charts, written by hand** in range syntax (`scripts/preflop-source.ts`). They are **not solver output** and should be treated as a reasonable baseline, not as exact equilibrium strategies. Game model: 6-max cash, 100bb effective, no ante; opens of 2.5bb (3bb from the small blind, which plays raise-or-fold), 3-bets of about 3× in position and 4× out of position, 4-bets of about 2.3×. `npm run gen:preflop` regenerates the 35 JSON files in `src/data/preflop/` from the source.

## Local development

Requirements: Node.js 20+ (22 recommended). Rust is **not** needed unless you change the solver.

```bash
npm ci                 # install dependencies
npm run dev            # start the dev server (http://localhost:5173)
npm run build          # production build into dist/
npm run preview        # serve the production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest unit and component tests (includes the WASM solver in Node)
npm run e2e            # Playwright end-to-end tests (needs a built dist/ and Chromium)
npm run verify         # everything above plus data/asset/solver/dist checks, one line per requirement
```

`npm run verify` runs lint, typecheck, unit tests, `check:data`, `check:assets`, `check:solver`, build, `check:dist` and the E2E suite, then prints `[PASS]/[FAIL]/[SKIP] <ID>` for every requirement and a final `VERIFY RESULT` line.

## Rebuilding the solver WASM

The compiled solver (`solver-wasm/pkg/solver_bg.wasm` plus its JS glue) is committed, so normal builds and CI need only Node. To rebuild it after changing `solver-wasm/src/lib.rs`:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack          # once
cargo install wasm-opt           # once (optional: wasm-pack downloads binaryen otherwise)
npm run build:wasm               # wasm-pack build --target web --release, single-threaded, SIMD
npm run check:solver             # correctness, convergence and speed checks in Node
```

The crate depends on postflop-solver pinned to commit `9d1509fe5077d019825f833eed04b16d342dfda1` with `default-features = false` (no rayon), because GitHub Pages cannot send the COOP/COEP headers that multithreaded WebAssembly needs.

## Credits

- **[postflop-solver](https://github.com/b-inary/postflop-solver)** by Wataru Inariba — the Discounted CFR solver engine used by the analyzer. License: **AGPL-3.0-or-later**. Development was suspended in October 2023; this project pins the last commit.
- **[wasm-postflop](https://github.com/b-inary/wasm-postflop)** by Wataru Inariba — used as a reference for the WebAssembly wrapper (`solver-wasm/src/lib.rs`). License: **AGPL-3.0-or-later**.
- Built with React, Vite, TypeScript, Vitest, Testing Library and Playwright (all MIT or Apache-2.0).

## Assets

All cards, chips, suit symbols, the table and icons are original SVG/CSS drawn in this repository (`src/components/`). Third-party or bundled files under `public/assets/` are listed in [`ASSETS.md`](ASSETS.md) with source and license:

| File | Source | License |
| --- | --- | --- |
| `public/assets/felt-noise.svg` | Original work created for this project | CC0 1.0 |

The app uses the system font stack; no fonts are downloaded.

## Deploying to GitHub Pages

1. Push the repository to GitHub as a public repo with `main` as the default branch.
2. In the repo, open Settings → Pages and set Source to "GitHub Actions".
3. Push to `main` (or run the "Deploy" workflow manually from the Actions tab).
4. When the workflow finishes, the site is live at `https://<username>.github.io/<repo>/`.
5. No secrets, tokens or paid services are involved, and nothing needs renewing.

The workflow (`.github/workflows/deploy.yml`) uses Node only: it installs dependencies, runs lint, typecheck and unit tests, builds, and deploys `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`. All asset URLs are relative and routing is hash-based, so the site works from any sub-path.

## License

Copyright © 2026 Poker GTO Trainer contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version (AGPL-3.0-or-later). It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [`LICENSE`](LICENSE) for the full text.

The AGPL applies because the app links postflop-solver (AGPL-3.0). If you host a modified version, you must offer its source code to its users; the app footer links to the source repository.
