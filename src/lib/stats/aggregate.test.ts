import { describe, expect, it } from 'vitest';
import type { Grade } from '../preflop/grading';
import type { Position, SpotType } from '../preflop/types';
import { accuracy, aggregate, biggestLeaks, bucketKey } from './aggregate';
import type { StatRecord } from './store';

function make(hero: Position, type: SpotType, correct: number, wrong: number, best = correct): StatRecord[] {
  const out: StatRecord[] = [];
  const g = (i: number): Grade => (i < best ? 'best' : i < correct ? 'acceptable' : 'mistake');
  for (let i = 0; i < correct + wrong; i++)
    out.push({ t: i, spotId: `${type}-${hero}`, type, hero, villain: type === 'rfi' ? null : 'UTG', hand: 'AA', action: 'fold', grade: g(i) });
  return out;
}

describe('stats aggregation', () => {
  it('P1-STAT-02 aggregates by position, spot type, position x spot type and total', () => {
    const recs = [...make('CO', 'rfi', 8, 2, 6), ...make('CO', 'vs-open', 1, 3), ...make('BB', 'vs-open', 5, 5)];
    const a = aggregate(recs);
    expect(a.total.attempts).toBe(24);
    expect(a.total.correct).toBe(14);
    expect(a.byPosition.CO).toEqual({ attempts: 14, correct: 9, best: 7 });
    expect(a.byPosition.BB.attempts).toBe(10);
    expect(a.byPosition.UTG.attempts).toBe(0);
    expect(a.byType['vs-open']).toEqual({ attempts: 14, correct: 6, best: 6 });
    expect(a.byBucket[bucketKey('CO', 'rfi')]).toEqual({ attempts: 10, correct: 8, best: 6 });
    expect(accuracy(a.byBucket[bucketKey('BB', 'vs-open')]!)).toBe(0.5);
  });

  it('P1-STAT-03 leaks are the 3 lowest-accuracy buckets with at least 10 attempts', () => {
    const recs = [
      ...make('UTG', 'rfi', 9, 1), // 90%
      ...make('HJ', 'vs-open', 5, 5), // 50%
      ...make('CO', 'vs-3bet', 2, 8), // 20%
      ...make('BTN', 'vs-open', 7, 3), // 70%
      ...make('SB', 'rfi', 0, 9), // 0% but only 9 attempts -> excluded
      ...make('BB', 'vs-open', 3, 7), // 30%
    ];
    const leaks = biggestLeaks(recs);
    expect(leaks.map((l) => `${l.position}|${l.type}`)).toEqual(['CO|vs-3bet', 'BB|vs-open', 'HJ|vs-open']);
    expect(leaks[0]!.accuracy).toBeCloseTo(0.2);
    expect(leaks.every((l) => l.tally.attempts >= 10)).toBe(true);
  });

  it('P1-STAT-03 returns fewer than 3 (or none) below the sample threshold; ties break by sample size', () => {
    expect(biggestLeaks(make('CO', 'rfi', 1, 8))).toEqual([]);
    expect(biggestLeaks([...make('CO', 'rfi', 5, 5), ...make('BB', 'vs-open', 1, 1)])).toHaveLength(1);
    const tie = biggestLeaks([...make('HJ', 'rfi', 5, 5), ...make('BTN', 'rfi', 10, 10)]);
    expect(tie.map((l) => l.position)).toEqual(['BTN', 'HJ']);
  });
});
