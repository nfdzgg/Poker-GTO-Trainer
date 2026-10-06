import { describe, expect, it } from 'vitest';
import { HAND_LABELS } from '../poker/hands';
import { ALL_SPOTS } from './spots';
import { buildSkeletons } from './structure';
import { POSITIONS } from './types';
import { RFI_BANDS, validateInvariants, validateSpotFrequencies, validateStructure } from './validate';

describe('preflop range data', () => {
  it('P1-DATA-01 all 35 spots load and every position appears as hero', () => {
    expect(ALL_SPOTS.length).toBe(35);
    const report = validateStructure([...ALL_SPOTS]);
    expect(report.errors).toEqual([]);
    for (const p of POSITIONS) expect(ALL_SPOTS.some((s) => s.hero === p)).toBe(true);
    const ids = buildSkeletons().map((s) => s.id).sort();
    expect(ALL_SPOTS.map((s) => s.id).sort()).toEqual(ids);
  });

  it('P1-DATA-01 validateStructure rejects a missing spot and a missing position', () => {
    const fewer = ALL_SPOTS.filter((s) => s.hero !== 'BB');
    const report = validateStructure(fewer);
    expect(report.errors.some((e) => e.includes('expected 35'))).toBe(true);
    expect(report.errors.some((e) => e.includes('BB never appears'))).toBe(true);
  });

  it('P1-DATA-02 every spot has 169 hands with frequencies in [0,1] summing to 1', () => {
    for (const s of ALL_SPOTS) {
      expect(Object.keys(s.hands).sort()).toEqual([...HAND_LABELS].sort());
      expect(validateSpotFrequencies(s)).toEqual([]);
    }
  });

  it('P1-DATA-02 validation catches bad sums and out-of-range values', () => {
    const s = structuredClone(ALL_SPOTS[0]!);
    s.hands['AA'] = { raise: 0.7, fold: 0.2 };
    s.hands['KK'] = { raise: 1.2, fold: -0.2 };
    delete s.hands['22'];
    const errs = validateSpotFrequencies(s);
    expect(errs.some((e) => e.includes('AA frequencies sum'))).toBe(true);
    expect(errs.some((e) => e.includes('KK raise=1.2'))).toBe(true);
    expect(errs.some((e) => e.includes('missing 22'))).toBe(true);
  });

  it('P1-DATA-03 sanity invariants hold (AA, 72o, RFI bands and order, 3-bet AA >= 22)', () => {
    const inv = validateInvariants([...ALL_SPOTS]);
    expect(inv.errors).toEqual([]);
    for (const [p, [lo, hi]] of Object.entries(RFI_BANDS)) {
      const v = inv.rfiPercents[p as keyof typeof inv.rfiPercents]!;
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
    }
    const r = inv.rfiPercents;
    expect(r.UTG! < r.HJ! && r.HJ! < r.CO! && r.CO! < r.BTN!).toBe(true);
    for (const s of ALL_SPOTS) {
      expect(s.hands['AA']!.fold ?? 0).toBe(0);
      expect(s.hands['72o']!.fold).toBe(1);
    }
  });

  it('P1-DATA-03 invariant checker detects violations', () => {
    const spots = structuredClone([...ALL_SPOTS]);
    const open = spots.find((s) => s.type === 'vs-open')!;
    open.hands['22'] = { '3bet': 1, call: 0, fold: 0 };
    open.hands['AA'] = { '3bet': 0.5, call: 0, fold: 0.5 };
    spots.find((s) => s.id === 'rfi-UTG')!.hands['72o'] = { raise: 1, fold: 0 };
    const errs = validateInvariants(spots).errors;
    expect(errs.some((e) => e.includes('AA folds'))).toBe(true);
    expect(errs.some((e) => e.includes('72o'))).toBe(true);
    expect(errs.some((e) => e.includes('3-bet AA'))).toBe(true);
  });

  it('stores metadata for every spot', () => {
    for (const s of ALL_SPOTS) {
      expect(s.pot).toBeGreaterThan(0);
      expect(s.sizes.open).toBeGreaterThan(0);
      expect(s.description).toContain(s.hero);
      if (s.type !== 'rfi') expect(s.sizes.threeBet).toBeGreaterThan(0);
      if (s.type === 'vs-3bet') expect(s.sizes.fourBet).toBeGreaterThan(s.sizes.threeBet!);
    }
    const s = ALL_SPOTS.find((x) => x.id === 'vs3bet-CO-vs-BTN')!;
    expect(s.pot).toBe(11.5);
    expect(s.toCall).toBe(5);
  });
});
