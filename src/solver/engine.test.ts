// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { cardToString, parseCard } from '../lib/poker/cards';
import { CHIPS_PER_BB, parseActionCode, PostflopSolver, rangeToRaw, SolverError } from './engine';
import { NO_BETS, sizes, TOY_RIVER } from './presets';
import type { ActionNode, SolverConfig } from './types';
import { createWorkerHandler } from './workerCore';
import type { WorkerResponse } from './protocol';

const wasmBytes = readFileSync(path.resolve(__dirname, '../../solver-wasm/pkg/solver_bg.wasm'));
let solver: PostflopSolver;

const TURN: SolverConfig = {
  oopRange: 'AA,KK,QQ,AQs,76s',
  ipRange: 'JJ,TT,KQs,A5s',
  board: 'Qs7h2d4c',
  startingPot: 10,
  effectiveStack: 50,
  flop: NO_BETS,
  turn: sizes('50%', ''),
  river: sizes('75%', ''),
};

beforeAll(async () => {
  solver = await PostflopSolver.create(wasmBytes);
});

describe('P2-ENG-05 TypeScript solver API against the WASM in Node', () => {
  it('P2-ENG-05 exposes the pinned upstream commit and converts ranges and actions', () => {
    expect(PostflopSolver.upstreamCommit()).toMatch(/^[0-9a-f]{40}$/);
    const raw = rangeToRaw('AA,AKs:0.5');
    expect(raw).toHaveLength(1326);
    expect([...raw].filter((w) => w === 1)).toHaveLength(6);
    expect([...raw].filter((w) => w === 0.5)).toHaveLength(4);
    expect(parseActionCode('B250', 2)).toEqual({ index: 2, kind: 'bet', amount: 2.5, label: 'Bet 2.5', code: 'B250' });
    expect(parseActionCode('X', 0).kind).toBe('check');
    expect(parseActionCode('A9750', 1).label).toBe('All-in 97.5');
    expect(CHIPS_PER_BB).toBe(100);
  });

  it('P2-ENG-05 configure rejects invalid input with SolverError messages', () => {
    const bad: [Partial<SolverConfig>, RegExp][] = [
      [{ board: 'QsQs2d' }, /duplicate/],
      [{ board: 'Qs7h' }, /3, 4 or 5/],
      [{ board: 'Qs7hXx' }, /Invalid board card/],
      [{ oopRange: '' }, /OOP range is empty/],
      [{ ipRange: 'ZZ' }, /Invalid token/],
      [{ effectiveStack: 0 }, /stack/],
      [{ startingPot: -1 }, /pot/],
      [{ river: sizes('abc', '') }, /bet sizes/i],
    ];
    for (const [patch, re] of bad) {
      expect(() => solver.configure({ ...TOY_RIVER, ...patch }), re.source).toThrow(SolverError);
      expect(() => solver.configure({ ...TOY_RIVER, ...patch })).toThrow(re);
    }
    expect(solver.isConfigured).toBe(false);
    expect(() => solver.estimateMemory()).toThrow(/not configured/);
  });

  it('P2-ENG-05 estimateMemory, solveStep, solve with an exploitability target, and getNodeStrategy', async () => {
    solver.configure(TOY_RIVER);
    const mem = solver.estimateMemory();
    expect(mem.uncompressed).toBeGreaterThan(1000);
    expect(mem.compressed).toBeGreaterThan(0);
    expect(mem.compressed).toBeLessThanOrEqual(mem.uncompressed);
    solver.allocate(false);
    expect(solver.solveStep()).toBe(1);
    expect(solver.solveStep()).toBe(2);
    const progress: number[] = [];
    const res = await solver.solve({ targetExploitability: 0.1, maxIterations: 5000, onProgress: (p) => progress.push(p.exploitability) });
    expect(res.reason).toBe('target');
    expect(res.exploitability).toBeLessThanOrEqual(0.1);
    expect(progress.length).toBeGreaterThan(0);
    expect(solver.isFinalized).toBe(true);
    const node = solver.getNodeStrategy();
    expect(node.type).toBe('action');
    expect(node.player).toBe('oop');
    expect(node.pot).toBe(100);
    expect(node.actions.map((a) => a.kind)).toEqual(['check', 'allin']);
    expect(node.hands.length).toBe(9 + 12);
    for (const h of node.hands) {
      expect(h.strategy.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
      expect(h.combo).toMatch(/^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/);
      expect(typeof h.ev).toBe('number');
      expect(h.actionEv).toHaveLength(2);
    }
    expect(node.rangeFreqs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
    expect(node.solved).toBe(true);
  });

  it('P2-ENG-05 getHandEV returns strategy, EV and equity for a class or a combo', () => {
    solver.backToRoot();
    const kk = solver.getHandEV('KK');
    expect(kk.combos).toHaveLength(3); // one king is on the board
    expect(kk.strategy[1]).toBeGreaterThan(0.99); // value hands always bet
    expect(kk.equity).toBeCloseTo(1, 5);
    // betting the nuts into a 50% calling range wins pot + half a pot-sized bet
    expect(kk.ev).toBeGreaterThan(140);
    expect(kk.ev).toBeLessThan(160);
    const combo = solver.getHandEV('8h7d');
    expect(combo.combos).toHaveLength(1);
    expect(combo.equity).toBeCloseTo(0, 5);
    expect(() => solver.getHandEV('XXyy')).toThrow(SolverError);
  });

  it('P2-ENG-05 play(action) by index or label navigates the tree; back() returns', () => {
    solver.backToRoot();
    solver.play('All-in 100');
    let node = solver.getNodeStrategy();
    expect(node.player).toBe('ip');
    expect(node.toCall).toBe(100);
    expect(node.actions.map((a) => a.kind)).toEqual(['fold', 'call']);
    expect(node.rangeFreqs[1]).toBeGreaterThan(0.45);
    expect(node.rangeFreqs[1]).toBeLessThan(0.55);
    solver.play(1);
    expect(solver.getNode().type).toBe('terminal');
    expect(() => solver.getNodeStrategy()).toThrow(/terminal/);
    solver.back();
    solver.back();
    expect(solver.history()).toEqual([]);
    solver.play('check');
    node = solver.getNodeStrategy();
    expect(node.player).toBe('ip');
    expect(() => solver.play(7)).toThrow(/Invalid action/);
  });

  it('P2-ENG-05 dealCard deals the river at a chance node of a turn spot', async () => {
    solver.configure(TURN);
    const res = await solver.solve({ maxIterations: 30, checkEvery: 10 });
    expect(res.iteration).toBe(30);
    expect(res.reason).toBe('iterations');
    solver.play('check');
    solver.play('check');
    const chance = solver.getNode();
    expect(chance.type).toBe('chance');
    if (chance.type !== 'chance') return;
    expect(chance.street).toBe('river');
    expect(chance.possibleCards).toHaveLength(48);
    expect(chance.possibleCards).not.toContain(parseCard('Qs'));
    expect(() => solver.dealCard('Qs')).toThrow(/cannot be dealt/);
    solver.dealCard('3c');
    const river = solver.getNode() as ActionNode;
    expect(river.type).toBe('action');
    expect(river.board.map(cardToString)).toEqual(['Qs', '7h', '2d', '4c', '3c']);
    expect(river.player).toBe('oop');
    expect(river.hands.every((h) => !h.cards.includes(parseCard('3c')!))).toBe(true);
  });

  it('P2-ENG-05 time-limited solves and cancel() stop early', async () => {
    solver.configure(TURN);
    const t = await solver.solve({ timeLimitMs: 150, checkEvery: 1000 });
    expect(t.reason).toBe('time');
    expect(t.elapsedMs).toBeGreaterThanOrEqual(150);
    expect(Number.isFinite(t.exploitability)).toBe(true);
    solver.configure(TURN);
    const running = solver.solve({ checkEvery: 1000, sliceMs: 5 });
    setTimeout(() => solver.cancel(), 50);
    const c = await running;
    expect(c.cancelled).toBe(true);
    expect(c.reason).toBe('cancelled');
    expect(c.iteration).toBeGreaterThan(0);
  });

  it('P2-ENG-05 the worker message handler estimates, solves with progress, navigates and cancels', async () => {
    const out: WorkerResponse[] = [];
    const handle = createWorkerHandler((m) => out.push(m), wasmBytes);
    await handle({ type: 'estimate', id: 1, config: TOY_RIVER });
    expect(out.find((m) => m.type === 'estimate' && m.id === 1)).toBeTruthy();
    await handle({ type: 'solve', id: 2, config: TOY_RIVER, options: { targetExploitability: 0.2, maxIterations: 4000, compression: false } });
    expect(out.some((m) => m.type === 'progress' && m.id === 2)).toBe(true);
    const solved = out.find((m) => m.type === 'solved' && m.id === 2);
    expect(solved && solved.type === 'solved' && solved.result.reason).toBe('target');
    await handle({ type: 'view', id: 3, history: [1] });
    const view = out.find((m) => m.type === 'view' && m.id === 3);
    expect(view && view.type === 'view' && view.view.type === 'action' && view.view.player).toBe('ip');
    await handle({ type: 'estimate', id: 4, config: { ...TOY_RIVER, board: 'KsKs2d' } });
    expect(out.find((m) => m.type === 'error' && m.id === 4)).toBeTruthy();
    const p = handle({ type: 'solve', id: 5, config: TURN, options: { targetExploitability: 0, maxIterations: 1e9, compression: true } });
    setTimeout(() => void handle({ type: 'cancel' }), 60);
    await p;
    const r5 = out.find((m) => m.type === 'solved' && m.id === 5);
    expect(r5 && r5.type === 'solved' && r5.result.cancelled).toBe(true);
  });
});
