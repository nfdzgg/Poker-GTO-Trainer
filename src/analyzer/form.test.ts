import { describe, expect, it } from 'vitest';
import { formatRange, parseRange } from '../lib/poker/range';
import {
  ANALYZER_KEY,
  DEFAULT_FORM,
  EXAMPLES,
  loadForm,
  memoryPlan,
  parseSizeList,
  saveForm,
  streetsFor,
  toSolverConfig,
  validateForm,
  type AnalyzerForm,
} from './form';

const river = (): AnalyzerForm => structuredClone(EXAMPLES[2]!.form);

describe('analyzer form', () => {
  it('P2-UI-01 the range text parser round-trips through the canonical formatter', () => {
    for (const ex of EXAMPLES) {
      for (const text of [ex.form.oopRange, ex.form.ipRange]) {
        const a = parseRange(text);
        expect(a.ok).toBe(true);
        if (!a.ok) continue;
        const again = parseRange(formatRange(a.range));
        expect(again.ok && [...again.range.entries()].sort()).toEqual([...a.range.entries()].sort());
        expect(formatRange(a.range)).toBe(text); // examples are stored canonically
      }
    }
    const custom = 'QQ+,AKs,A5s:0.5,KTs-K8s:0.25,76s';
    const p = parseRange(custom);
    expect(p.ok && formatRange(p.range)).toBe('QQ+,AKs,A5s:0.5,KTs-K8s:0.25,76s');
  });

  it('P2-UI-01 bet and raise sizes are % of pot per street and player, with an all-in option', () => {
    expect(parseSizeList('33, 75%')).toEqual({ ok: true, values: [33, 75] });
    expect(parseSizeList('')).toEqual({ ok: true, values: [] });
    expect(parseSizeList('abc').ok).toBe(false);
    const f = river();
    f.sizes.river.oop = { bet: '50', raise: '' };
    f.sizes.river.ip = { bet: '33, 125', raise: '60' };
    const cfg = toSolverConfig(f);
    expect(cfg.river.oop).toEqual({ bet: '50%, a', raise: 'a' });
    expect(cfg.river.ip).toEqual({ bet: '33%, 125%, a', raise: '60%, a' });
    expect(toSolverConfig({ ...f, allIn: false }).river.ip).toEqual({ bet: '33%, 125%', raise: '60%' });
    expect(cfg.startingPot).toBe(5.5);
    expect(cfg.effectiveStack).toBe(97.5);
    expect(streetsFor(3)).toEqual(['flop', 'turn', 'river']);
    expect(streetsFor(4)).toEqual(['turn', 'river']);
    expect(streetsFor(5)).toEqual(['river']);
  });

  it('P2-UI-02 impossible inputs produce clear messages', () => {
    expect(validateForm(river())).toEqual([]);
    const cases: [Partial<AnalyzerForm>, RegExp][] = [
      [{ board: 'QsQs7h' }, /Duplicate board card: Qs/],
      [{ board: 'Qs7h' }, /needs 3, 4 or 5 cards/],
      [{ board: 'Qs7hZz' }, /invalid card/],
      [{ oopRange: '' }, /Out-of-position range is empty/],
      [{ ipRange: 'AKx' }, /In-position range: Invalid/],
      [{ ipRange: 'QQ', board: 'QsQhQd' }, /no combos left after removing the board/],
      [{ stack: 0 }, /effective stack must be greater than 0/],
      [{ stack: -5 }, /effective stack must be greater than 0/],
      [{ pot: 0 }, /pot must be greater than 0/],
      [{ oopSeat: 'BTN', ipSeat: 'BTN' }, /different seats/],
    ];
    for (const [patch, re] of cases) {
      const errs = validateForm({ ...river(), ...patch });
      expect(errs.join(' | '), re.source).toMatch(re);
    }
    const noBets = river();
    noBets.allIn = false;
    noBets.sizes.river.ip.bet = '';
    expect(validateForm(noBets).join(' ')).toMatch(/Add at least one river bet size for the in-position player/);
    const badSize = river();
    badSize.sizes.river.oop.bet = '50, x';
    expect(validateForm(badSize).join(' ')).toMatch(/out-of-position river bet sizes: "x" is not a number/);
    // sizes for streets that are not played (river-only board) are ignored
    const unused = river();
    unused.sizes.flop.oop.bet = 'garbage';
    expect(validateForm(unused)).toEqual([]);
  });

  it('P2-UI-03 memory plan: compress only when needed, block above 1.5 GB desktop / 600 MB phone', () => {
    const small = { uncompressed: 200e6, compressed: 110e6 };
    expect(memoryPlan(small, false)).toMatchObject({ ok: true, compression: false });
    expect(memoryPlan(small, false).message).toBe('Estimated memory: 200 MB');
    const mid = { uncompressed: 1.59e9, compressed: 0.81e9 };
    expect(memoryPlan(mid, false)).toMatchObject({ ok: true, compression: true });
    expect(memoryPlan(mid, true)).toMatchObject({ ok: false });
    expect(memoryPlan(mid, true).message).toMatch(/600 MB safe limit for phones\. Reduce the number of bet and raise sizes/);
    const huge = { uncompressed: 7.3e9, compressed: 3.7e9 };
    expect(memoryPlan(huge, false).ok).toBe(false);
    expect(memoryPlan(huge, false).message).toMatch(/1,500 MB safe limit.*narrow the ranges/);
  });

  it('P2-UI-07 three built-in examples (flop, turn, river) are valid spots', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual(['flop', 'turn', 'river']);
    expect(EXAMPLES.map((e) => e.form.board.length / 2)).toEqual([3, 4, 5]);
    for (const e of EXAMPLES) expect(validateForm(e.form), e.id).toEqual([]);
  });

  it('P2-UI-07 the configuration is saved to localStorage and restored; corrupt data is ignored', () => {
    expect(loadForm()).toBeNull();
    const f = { ...river(), pot: 12.5, name: 'Mine' };
    saveForm(f);
    expect(loadForm()).toEqual(f);
    window.localStorage.setItem(ANALYZER_KEY, '{"version":1,"board":5');
    expect(loadForm()).toBeNull();
    window.localStorage.setItem(ANALYZER_KEY, JSON.stringify({ ...f, version: 2 }));
    expect(loadForm()).toBeNull();
    expect(DEFAULT_FORM.board).toBe('Qs7h2d4c9s');
  });
});
