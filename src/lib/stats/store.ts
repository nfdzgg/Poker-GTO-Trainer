// Drill answers persisted in localStorage under a versioned key.
import type { Grade } from '../preflop/grading';
import { isPosition, isSpotType, type Position, type PreflopAction, type SpotType } from '../preflop/types';

export const STATS_KEY = 'pgt.stats.v1';
export const STATS_VERSION = 1;
export const MAX_RECORDS = 20000;

export interface StatRecord {
  t: number; // timestamp (ms)
  spotId: string;
  type: SpotType;
  hero: Position;
  villain: Position | null;
  hand: string;
  action: PreflopAction;
  grade: Grade;
}

/** Postflop drill results are kept separately (stretch milestone M7). */
export interface PostflopRecord {
  t: number;
  spot: string; // short description of the solved spot / node
  hand: string;
  action: string;
  grade: Grade;
  evLoss: number; // in bb
}

export interface StatsFile {
  version: number;
  records: StatRecord[];
  postflop: PostflopRecord[];
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const GRADES = new Set(['best', 'acceptable', 'mistake']);

function isRecord(x: unknown): x is StatRecord {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.t === 'number' &&
    typeof r.spotId === 'string' &&
    isSpotType(r.type as string) &&
    isPosition(r.hero as string) &&
    (r.villain === null || isPosition(r.villain as string)) &&
    typeof r.hand === 'string' &&
    typeof r.action === 'string' &&
    GRADES.has(r.grade as string)
  );
}

function isPostflopRecord(x: unknown): x is PostflopRecord {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.t === 'number' && typeof r.hand === 'string' && typeof r.action === 'string' && GRADES.has(r.grade as string) && typeof r.evLoss === 'number';
}

const empty = (): StatsFile => ({ version: STATS_VERSION, records: [], postflop: [] });

/**
 * Load stats. Missing, corrupt or old-version data falls back to an empty
 * stats file instead of throwing; malformed individual records are dropped.
 */
export function loadStats(storage: StorageLike | null = defaultStorage()): StatsFile {
  if (!storage) return empty();
  let raw: string | null;
  try {
    raw = storage.getItem(STATS_KEY);
  } catch {
    return empty();
  }
  if (!raw) return empty();
  try {
    const data = JSON.parse(raw) as Partial<StatsFile>;
    if (!data || typeof data !== 'object' || data.version !== STATS_VERSION || !Array.isArray(data.records)) return empty();
    return {
      version: STATS_VERSION,
      records: data.records.filter(isRecord),
      postflop: Array.isArray(data.postflop) ? data.postflop.filter(isPostflopRecord) : [],
    };
  } catch {
    return empty();
  }
}

export function saveStats(file: StatsFile, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STATS_KEY, JSON.stringify({ ...file, records: file.records.slice(-MAX_RECORDS), postflop: file.postflop.slice(-MAX_RECORDS) }));
    return true;
  } catch {
    return false;
  }
}

export function addRecord(rec: StatRecord, storage: StorageLike | null = defaultStorage()): StatsFile {
  const f = loadStats(storage);
  f.records.push(rec);
  saveStats(f, storage);
  return f;
}

export function addPostflopRecord(rec: PostflopRecord, storage: StorageLike | null = defaultStorage()): StatsFile {
  const f = loadStats(storage);
  f.postflop.push(rec);
  saveStats(f, storage);
  return f;
}

export function clearStats(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(STATS_KEY);
  } catch {
    // ignore
  }
}
