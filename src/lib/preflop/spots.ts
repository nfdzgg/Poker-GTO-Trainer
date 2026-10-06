import type { Position, SpotData, SpotType } from './types';
import { POSITIONS } from './types';

const modules = import.meta.glob<SpotData>('../../data/preflop/*.json', { eager: true, import: 'default' });

/** All 35 spots, ordered by type, then hero position, then villain position. */
export const ALL_SPOTS: readonly SpotData[] = Object.values(modules).sort((a, b) => {
  const t = ['rfi', 'vs-open', 'vs-3bet'];
  return (
    t.indexOf(a.type) - t.indexOf(b.type) ||
    POSITIONS.indexOf(a.hero) - POSITIONS.indexOf(b.hero) ||
    POSITIONS.indexOf(a.villain ?? 'UTG') - POSITIONS.indexOf(b.villain ?? 'UTG')
  );
});

const BY_ID = new Map(ALL_SPOTS.map((s) => [s.id, s]));

export function getSpot(id: string): SpotData | undefined {
  return BY_ID.get(id);
}

export function spotsFor(type?: SpotType | null, hero?: Position | null): SpotData[] {
  return ALL_SPOTS.filter((s) => (!type || s.type === type) && (!hero || s.hero === hero));
}

export function spotTitle(s: SpotData): string {
  if (s.type === 'rfi') return `${s.hero} open`;
  if (s.type === 'vs-open') return `${s.hero} vs ${s.villain} open`;
  return `${s.hero} vs ${s.villain} 3-bet`;
}
