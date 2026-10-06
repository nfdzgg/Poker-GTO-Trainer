// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRng } from '../lib/rng';
import { gradeAction, gradeFrequencies } from '../lib/preflop/grading';
import { PostflopSolver } from '../solver/engine';
import { NO_BETS, sizes } from '../solver/presets';
import type { SolverConfig } from '../solver/types';
import { EXAMPLES, toSolverConfig } from './form';
import { dealPostflop, gradePostflop, type NodeSource } from './postflopDrill';

let solver: PostflopSolver;
let source: NodeSource;
const seats = { oop: 'BB', ip: 'BTN' };

beforeAll(async () => {
  solver = await PostflopSolver.create(readFileSync(path.resolve(__dirname, '../../solver-wasm/pkg/solver_bg.wasm')));
  source = {
    view: async (h) => {
      solver.applyHistory(h);
      return solver.getNode();
    },
  };
});

describe('postflop drill', () => {
  it('P2-DRILL-01 uses the same Best / Acceptable mix / Mistake rule as the preflop drill', () => {
    const cases: number[][] = [
      [0.6, 0.3, 0.1],
      [0.4, 0.4, 0.2],
      [0.81, 0.19, 0],
      [1, 0, 0],
      [0.5, 0.5, 0],
    ];
    for (const f of cases) {
      for (let i = 0; i < 3; i++) {
        const asMap = { '3bet': f[0], call: f[1], fold: f[2] };
        const a = (['3bet', 'call', 'fold'] as const)[i]!;
        expect(gradeFrequencies(f, i)).toBe(gradeAction(asMap, ['3bet', 'call', 'fold'], a));
      }
    }
  });

  it('P2-DRILL-01 deals hero hands from the range at decision nodes of the solved tree (seedable)', async () => {
    solver.configure(toSolverConfig(EXAMPLES[2]!.form));
    await solver.solve({ targetExploitability: 0.5, maxIterations: 1000 });
    const seen = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const d = (await dealPostflop(createRng(1000 + i), source, seats))!;
      expect(d).not.toBeNull();
      expect(d.node.type).toBe('action');
      expect(d.node.actions.length).toBeGreaterThan(1);
      expect(d.hand.weight).toBeGreaterThan(0);
      expect(d.node.hands.some((h) => h.combo === d.hand.combo)).toBe(true);
      expect(d.steps).toHaveLength(d.history.length);
      seen.add(d.history.join(','));
    }
    expect(seen.size).toBeGreaterThan(1); // reaches more than one node
    const a = await dealPostflop(createRng(42), source, seats);
    const b = await dealPostflop(createRng(42), source, seats);
    expect(a!.history).toEqual(b!.history);
    expect(a!.hand.combo).toBe(b!.hand.combo);
  });

  it('P2-DRILL-01 walks through chance nodes on a turn spot and deals the river card', async () => {
    const turn: SolverConfig = {
      oopRange: 'AA,KK,QQ,AQs,76s',
      ipRange: 'JJ,TT,KQs,A5s',
      board: 'Qs7h2d4c',
      startingPot: 10,
      effectiveStack: 50,
      flop: NO_BETS,
      turn: sizes('50%', ''),
      river: sizes('75%', ''),
    };
    solver.configure(turn);
    await solver.solve({ targetExploitability: 1, maxIterations: 500 });
    let rivers = 0;
    for (let i = 0; i < 30; i++) {
      const d = (await dealPostflop(createRng(i), source, seats, { stopProb: 0.2 }))!;
      if (d.node.board.length === 5) {
        rivers++;
        expect(d.steps.some((s) => /^River /.test(s.label))).toBe(true);
      }
    }
    expect(rivers).toBeGreaterThan(0);
  });

  it('P2-DRILL-01 grades against the solver frequencies and reports EV loss', async () => {
    solver.configure(toSolverConfig(EXAMPLES[2]!.form));
    await solver.solve({ targetExploitability: 0.3, maxIterations: 1000 });
    let mistakesWithLoss = 0;
    for (let i = 0; i < 30; i++) {
      const d = (await dealPostflop(createRng(500 + i), source, seats))!;
      const f = d.hand.strategy;
      const best = f.indexOf(Math.max(...f));
      const g = gradePostflop(d.hand, best);
      expect(g.grade).toBe('best');
      expect(g.evLoss).toBeLessThan(0.05 * d.node.pot + 0.01); // equilibrium actions are ~EV-maximising
      for (let a = 0; a < f.length; a++) {
        const r = gradePostflop(d.hand, a);
        expect(r.grade).toBe(gradeFrequencies(f, a));
        expect(r.evLoss).toBeGreaterThanOrEqual(0);
        const evs = d.hand.actionEv!;
        expect(r.evLoss).toBeCloseTo(Math.max(...evs) - evs[a]!, 6);
        if (r.grade === 'mistake' && r.evLoss > 0.01) mistakesWithLoss++;
      }
    }
    expect(mistakesWithLoss).toBeGreaterThan(0);
  });
});
