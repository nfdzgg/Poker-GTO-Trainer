import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../test/memoryStorage';
import { addRecord, clearStats, loadStats, STATS_KEY, type StatRecord } from './store';

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

describe('P1-STAT-01 stats persistence', () => {
  it('P1-STAT-01 saves answers under a versioned key and reloads them from a fresh read', () => {
    const storage = new MemoryStorage();
    addRecord(rec(), storage);
    addRecord(rec({ hand: '72o', action: 'raise', grade: 'mistake' }), storage);
    expect(STATS_KEY).toMatch(/\.v\d+$/);
    expect(storage.getItem(STATS_KEY)).toContain('"version":1');
    const reloaded = loadStats(storage); // simulates a page reload: nothing kept in memory
    expect(reloaded.records).toHaveLength(2);
    expect(reloaded.records[1]!.hand).toBe('72o');
  });

  it('P1-STAT-01 corrupt JSON falls back to empty stats without throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATS_KEY, '{not json');
    expect(() => loadStats(storage)).not.toThrow();
    expect(loadStats(storage).records).toEqual([]);
    addRecord(rec(), storage); // recovers and overwrites
    expect(loadStats(storage).records).toHaveLength(1);
  });

  it('P1-STAT-01 old-version or wrong-shape data falls back cleanly; bad records are dropped', () => {
    const storage = new MemoryStorage();
    storage.setItem(STATS_KEY, JSON.stringify({ version: 0, records: [rec()] }));
    expect(loadStats(storage).records).toEqual([]);
    storage.setItem(STATS_KEY, JSON.stringify({ version: 1, records: 'nope' }));
    expect(loadStats(storage).records).toEqual([]);
    storage.setItem(STATS_KEY, JSON.stringify({ version: 1, records: [rec(), { foo: 1 }, rec({ hero: 'XX' as never })] }));
    expect(loadStats(storage).records).toHaveLength(1);
    storage.setItem(STATS_KEY, 'null');
    expect(loadStats(storage).records).toEqual([]);
  });

  it('P1-STAT-01 storage that throws (e.g. disabled) does not crash', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadStats(broken).records).toEqual([]);
    expect(() => addRecord(rec(), broken)).not.toThrow();
    expect(() => clearStats(broken)).not.toThrow();
    expect(loadStats(null).records).toEqual([]);
  });
});
