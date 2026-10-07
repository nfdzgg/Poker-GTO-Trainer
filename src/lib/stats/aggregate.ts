import { isCorrect } from '../preflop/grading';
import { POSITIONS, SPOT_TYPES, type Position, type SpotType } from '../preflop/types';
import type { StatRecord } from './store';

/** Records that count toward accuracy: answers given without the range visible. */
export function gradedRecords(records: readonly StatRecord[]): StatRecord[] {
  return records.filter((r) => !r.assisted);
}

/** Answers given with the range visible (open-book practice). */
export function assistedRecords(records: readonly StatRecord[]): StatRecord[] {
  return records.filter((r) => r.assisted === true);
}

export interface Tally {
  attempts: number;
  correct: number;
  best: number;
}
const tally = (): Tally => ({ attempts: 0, correct: 0, best: 0 });

export function accuracy(t: Tally): number {
  return t.attempts === 0 ? 0 : t.correct / t.attempts;
}

export interface Aggregate {
  total: Tally;
  byPosition: Record<Position, Tally>;
  byType: Record<SpotType, Tally>;
  byBucket: Record<string, Tally>; // key `${position}|${type}`
}

export const bucketKey = (p: Position, t: SpotType) => `${p}|${t}`;

export function aggregate(records: readonly StatRecord[]): Aggregate {
  const byPosition = Object.fromEntries(POSITIONS.map((p) => [p, tally()])) as Record<Position, Tally>;
  const byType = Object.fromEntries(SPOT_TYPES.map((t) => [t, tally()])) as Record<SpotType, Tally>;
  const byBucket: Record<string, Tally> = {};
  const total = tally();
  for (const r of records) {
    const ok = isCorrect(r.grade) ? 1 : 0;
    const best = r.grade === 'best' ? 1 : 0;
    const key = bucketKey(r.hero, r.type);
    for (const t of [total, byPosition[r.hero], byType[r.type], (byBucket[key] ??= tally())]) {
      t.attempts++;
      t.correct += ok;
      t.best += best;
    }
  }
  return { total, byPosition, byType, byBucket };
}

export interface Leak {
  position: Position;
  type: SpotType;
  tally: Tally;
  accuracy: number;
}

export const LEAK_MIN_ATTEMPTS = 10;

/** The `n` lowest-accuracy position × spot-type buckets with at least `min` attempts. */
export function biggestLeaks(records: readonly StatRecord[], n = 3, min = LEAK_MIN_ATTEMPTS): Leak[] {
  const agg = aggregate(records);
  const leaks: Leak[] = [];
  for (const p of POSITIONS)
    for (const t of SPOT_TYPES) {
      const tl = agg.byBucket[bucketKey(p, t)];
      if (tl && tl.attempts >= min) leaks.push({ position: p, type: t, tally: tl, accuracy: accuracy(tl) });
    }
  leaks.sort(
    (a, b) =>
      a.accuracy - b.accuracy ||
      b.tally.attempts - a.tally.attempts ||
      POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) ||
      SPOT_TYPES.indexOf(a.type) - SPOT_TYPES.indexOf(b.type),
  );
  return leaks.slice(0, n);
}
