import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../test/memoryStorage';
import { aggregate, assistedRecords, biggestLeaks, gradedRecords } from './aggregate';
import { addRecord, loadStats, STATS_KEY, type StatRecord } from './store';

const rec = (over: Partial<StatRecord> = {}): StatRecord => ({
  t: 1,
  spotId: 'rfi-CO',
  type: 'rfi',
  hero: 'CO',
  villain: null,
  hand: 'AKo',
  action: 'raise',
  grade: 'best',
  ...over,
});

describe('open-book (assisted) answers', () => {
  it('P1-STUDY-03 assisted answers are stored with a flag and old records without it still load', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATS_KEY, JSON.stringify({ version: 1, records: [rec()], postflop: [] })); // pre-study-mode file
    addRecord(rec({ hand: '72o', grade: 'mistake', assisted: true }), storage);
    const f = loadStats(storage);
    expect(f.records).toHaveLength(2);
    expect(f.records[0]!.assisted).toBeUndefined();
    expect(f.records[1]!.assisted).toBe(true);
    storage.setItem(STATS_KEY, JSON.stringify({ version: 1, records: [rec({ assisted: 'yes' as never })], postflop: [] }));
    expect(loadStats(storage).records).toHaveLength(0); // malformed flag is rejected
  });

  it('P1-STUDY-03 assisted answers are excluded from accuracy and leaks', () => {
    const records: StatRecord[] = [];
    for (let i = 0; i < 12; i++) records.push(rec({ hero: 'UTG', spotId: 'rfi-UTG', grade: i < 9 ? 'best' : 'mistake' }));
    for (let i = 0; i < 12; i++) records.push(rec({ hero: 'SB', spotId: 'rfi-SB', grade: 'mistake', assisted: true }));
    expect(gradedRecords(records)).toHaveLength(12);
    expect(assistedRecords(records)).toHaveLength(12);
    expect(aggregate(gradedRecords(records)).total).toEqual({ attempts: 12, correct: 9, best: 9 });
    expect(biggestLeaks(gradedRecords(records)).map((l) => l.position)).toEqual(['UTG']); // the assisted SB misses are not a leak
  });
});
