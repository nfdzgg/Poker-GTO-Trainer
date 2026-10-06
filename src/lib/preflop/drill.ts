import { handCombos, handClass, HAND_CLASSES, HAND_LABELS } from '../poker/hands';
import type { CardId } from '../poker/cards';
import { pickWeighted, type Rng } from '../rng';
import { getSpot } from './spots';
import type { Position, SpotData, SpotType } from './types';

export interface DrillFilters {
  types: SpotType[]; // empty = all
  positions: Position[]; // hero positions; empty = all
  /** Deal only hands that are played, or that border a played hand in the grid. */
  focus: boolean;
}

export const DEFAULT_FILTERS: DrillFilters = { types: [], positions: [], focus: true };

export interface DealtHand {
  spot: SpotData;
  hand: string;
  cards: [CardId, CardId];
}

export function filterSpots(spots: readonly SpotData[], f: Pick<DrillFilters, 'types' | 'positions'>): SpotData[] {
  return spots.filter((s) => (f.types.length === 0 || f.types.includes(s.type)) && (f.positions.length === 0 || f.positions.includes(s.hero)));
}

/** Probability hero holds this hand when the spot arises (vs-3bet: hero's opening frequency). */
export function reachWeight(spot: SpotData, hand: string): number {
  if (!spot.heroRangeSpot) return 1;
  return getSpot(spot.heroRangeSpot)?.hands[hand]?.raise ?? 1;
}

const isPlayed = (spot: SpotData, hand: string) => (spot.hands[hand]?.fold ?? 0) < 0.999;

/** Hands eligible in focus mode: played, or adjacent (8-neighbourhood) to a played hand. */
export function focusHands(spot: SpotData): Set<string> {
  const out = new Set<string>();
  for (const h of HAND_CLASSES) {
    if (reachWeight(spot, h.label) <= 0) continue;
    let ok = isPlayed(spot, h.label);
    for (let dr = -1; dr <= 1 && !ok; dr++)
      for (let dc = -1; dc <= 1 && !ok; dc++) {
        const r = h.row + dr;
        const c = h.col + dc;
        if (r < 0 || c < 0 || r > 12 || c > 12) continue;
        const n = HAND_CLASSES[r * 13 + c]!;
        if (isPlayed(spot, n.label)) ok = true;
      }
    if (ok) out.add(h.label);
  }
  return out;
}

/**
 * Deal a random spot (uniform over the filtered spots) and a random hand
 * (weighted by combos and by hero's probability of reaching the spot).
 * Deterministic for a given RNG state.
 */
export function dealHand(rng: Rng, spots: readonly SpotData[], filters: DrillFilters): DealtHand | null {
  const pool = filterSpots(spots, filters);
  if (pool.length === 0) return null;
  const spot = pool[Math.floor(rng() * pool.length)]!;
  const eligible = filters.focus ? focusHands(spot) : null;
  const hand = pickWeighted(rng, HAND_LABELS, (h) =>
    eligible && !eligible.has(h) ? 0 : reachWeight(spot, h) * (handClass(h).kind === 'pair' ? 6 : handClass(h).kind === 'suited' ? 4 : 12),
  );
  if (!hand) return null;
  const combos = handCombos(hand);
  const pair = combos[Math.floor(rng() * combos.length)]!;
  const cards: [CardId, CardId] = rng() < 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]];
  return { spot, hand, cards };
}
