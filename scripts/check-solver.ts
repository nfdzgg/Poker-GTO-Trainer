// P2-ENG-01..04: checks the committed postflop-solver WASM build in Node.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { SpotData } from '../src/lib/preflop/types';
import { PostflopSolver } from '../src/solver/engine';
import { btnVsBb, TOY_BLUFF, TOY_RIVER, TOY_VALUE } from '../src/solver/presets';
import { formatBytes } from './lib/fsutil';
import { Reporter } from './lib/report';

const r = new Reporter('solver');
const WASM = 'solver-wasm/pkg/solver_bg.wasm';
const spot = (id: string) => JSON.parse(readFileSync(path.join('src/data/preflop', `${id}.json`), 'utf8')) as SpotData;
const secs = (ms: number) => (ms / 1000).toFixed(2);

async function main() {
  // ------------------------------------------------------------ P2-ENG-01
  const cargo = existsSync('solver-wasm/Cargo.toml') ? readFileSync('solver-wasm/Cargo.toml', 'utf8') : '';
  const rev = /postflop-solver\s*=\s*\{[^}]*rev\s*=\s*"([0-9a-f]{40})"/.exec(cargo)?.[1];
  const noDefault = /postflop-solver\s*=\s*\{[^}]*default-features\s*=\s*false/.test(cargo) && !/rayon/.test(cargo.replace(/#.*$/gm, ''));
  const exists = existsSync(WASM);
  const size = exists ? statSync(WASM).size : 0;
  let committed: boolean;
  try {
    const tracked = execSync(`git ls-files ${WASM} solver-wasm/pkg/solver.js solver-wasm/pkg/solver.d.ts`, { encoding: 'utf8' });
    committed = tracked.trim().split('\n').filter(Boolean).length === 3;
  } catch {
    committed = false;
  }
  let solver: PostflopSolver | null = null;
  let builtCommit = '';
  let shared = true;
  if (exists) {
    const bytes = readFileSync(WASM);
    const mod = new WebAssembly.Module(bytes);
    shared = WebAssembly.Module.imports(mod).some((i) => i.kind === 'memory'); // threaded builds import a shared memory
    solver = await PostflopSolver.create(bytes);
    builtCommit = PostflopSolver.upstreamCommit();
  }
  console.log(`Pinned upstream commit: b-inary/postflop-solver@${rev ?? 'MISSING'}`);
  console.log(`WASM file: ${WASM} ${size} bytes (${formatBytes(size)})`);
  console.log(`SOLVER_ENGINE=postflop-solver-wasm`);
  r.check(
    'P2-ENG-01',
    !!rev && rev === builtCommit && noDefault && exists && committed && !shared,
    `rev ${rev?.slice(0, 12) ?? 'missing'} (built: ${builtCommit.slice(0, 12) || 'n/a'}), default-features=false/no rayon: ${noDefault}, ` +
      `committed: ${committed}, own (non-shared) memory: ${!shared}, size ${formatBytes(size)}`,
  );
  if (!solver) {
    for (const id of ['P2-ENG-02', 'P2-ENG-03', 'P2-ENG-04']) r.fail(id, 'WASM missing');
    return;
  }

  // ------------------------------------------------------------ P2-ENG-02
  {
    const t0 = performance.now();
    solver.configure(TOY_RIVER);
    const res = await solver.solve({ targetExploitability: 0.05, maxIterations: 5000 });
    const root = solver.getNodeStrategy();
    const bet = root.actions.findIndex((a) => a.kind === 'bet' || a.kind === 'allin');
    let value = 0;
    let bluff = 0;
    let valueTotal = 0;
    let bluffTotal = 0;
    for (const h of root.hands) {
      const b = (h.strategy[bet] ?? 0) * h.weight;
      if (TOY_VALUE.includes(h.handClass)) {
        value += b;
        valueTotal += h.weight;
      } else if (TOY_BLUFF.includes(h.handClass)) {
        bluff += b;
        bluffTotal += h.weight;
      }
    }
    solver.play(bet);
    const ipNode = solver.getNodeStrategy();
    const call = ipNode.actions.findIndex((a) => a.kind === 'call');
    const callPct = (ipNode.rangeFreqs[call] ?? 0) * 100;
    const ratio = value / bluff;
    console.log(
      `Toy river: pot 100, stack 100, bet 100% pot. OOP value combos ${valueTotal}, bluff combos ${bluffTotal}; ` +
        `${res.iteration} iterations, exploitability ${res.exploitability.toFixed(3)}% in ${secs(performance.now() - t0)}s`,
    );
    console.log(`  IP calls ${callPct.toFixed(2)}% facing the bet (expected 50 ±5)`);
    console.log(`  OOP bets ${value.toFixed(2)} value : ${bluff.toFixed(2)} bluff combos = ${ratio.toFixed(3)} : 1 (expected 2 ±10%)`);
    r.check(
      'P2-ENG-02',
      bluffTotal >= valueTotal / 2 && Math.abs(callPct - 50) <= 5 && Math.abs(ratio - 2) <= 0.2 && ipNode.player === 'ip',
      `IP call ${callPct.toFixed(2)}%, value:bluff ${ratio.toFixed(3)}:1`,
    );
  }

  const rfiBtn = spot('rfi-BTN');
  const bbVsBtn = spot('vsopen-BB-vs-BTN');

  // ------------------------------------------------------------ P2-ENG-03
  {
    const t0 = performance.now();
    solver.configure(btnVsBb('Qs7h2d4c', rfiBtn, bbVsBtn));
    const mem = solver.estimateMemory();
    const res = await solver.solve({ targetExploitability: 0.5, maxIterations: 2000, checkEvery: 10 });
    const s = (performance.now() - t0) / 1000;
    console.log(
      `Turn spot BTN vs BB SRP Qs7h2d4c (Phase 1 ranges, 66%/66% bets, all-in raise; ${formatBytes(mem.uncompressed)}): ` +
        `iterations ${res.iteration}, final exploitability ${res.exploitability.toFixed(3)}% of pot, ${s.toFixed(2)} seconds`,
    );
    r.check('P2-ENG-03', res.exploitability < 1 && res.reason === 'target', `${res.iteration} iterations, ${res.exploitability.toFixed(3)}% of pot, ${s.toFixed(2)}s`);
  }

  // ------------------------------------------------------------ P2-ENG-04
  {
    const t0 = performance.now();
    const cfg = btnVsBb('Qs7h2d', rfiBtn, bbVsBtn);
    solver.configure(cfg);
    const mem = solver.estimateMemory();
    const compression = mem.uncompressed > 3.5e9; // only if it would not fit in wasm32 memory
    solver.allocate(compression);
    const budgetMs = 34_000 - (performance.now() - t0);
    const res = await solver.solve({ timeLimitMs: budgetMs, checkEvery: 1_000_000 });
    const root = solver.getNodeStrategy();
    const elapsed = (performance.now() - t0) / 1000;
    let worst = 0;
    for (const h of root.hands) worst = Math.max(worst, Math.abs(h.strategy.reduce((a, b) => a + b, 0) - 1));
    console.log(
      `Flop spot BTN vs BB SRP Qs7h2d: pot 5.5bb, stacks 97.5bb, bets 33%/66%/66%, raise all-in; memory ${formatBytes(mem.uncompressed)} ` +
        `(compressed ${formatBytes(mem.compressed)}), compression ${compression ? 'on' : 'off'}`,
    );
    console.log(
      `  root (${root.player.toUpperCase()}): ${root.actions.map((a, i) => `${a.label} ${(root.rangeFreqs[i]! * 100).toFixed(1)}%`).join(', ')}; ` +
        `${root.hands.length} hands`,
    );
    console.log(
      `  elapsed ${elapsed.toFixed(2)} seconds wall clock (time-budgeted), ${res.iteration} iterations, exploitability reached ${res.exploitability.toFixed(2)}% of pot; ` +
        `max |sum(freq)-1| = ${worst.toExponential(2)}`,
    );
    r.check(
      'P2-ENG-04',
      elapsed < 60 && worst <= 0.001 && root.hands.length > 0 && res.iteration > 0 && Number.isFinite(res.exploitability),
      `${elapsed.toFixed(2)}s, ${res.iteration} iterations, exploitability ${res.exploitability.toFixed(2)}%, all ${root.hands.length} root hands sum to 1 ±0.001`,
    );
  }
  solver.dispose();
}

main()
  .catch((e) => {
    console.error(e);
    r.fail('P2-ENG-01', `check crashed: ${(e as Error).message}`);
  })
  .finally(() => r.finish());
