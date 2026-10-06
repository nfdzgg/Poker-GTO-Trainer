// Pure validation helpers shared by `check:data` and unit tests.
import { comboCount, HAND_LABELS, TOTAL_COMBOS } from '../poker/hands';
import { POSITIONS, SPOT_ACTIONS, type Position, type SpotData } from './types';

export const EXPECTED_SPOT_COUNT = 35;

export const RFI_BANDS: Record<Exclude<Position, 'BB'>, [number, number]> = {
  UTG: [13, 20],
  HJ: [17, 25],
  CO: [24, 33],
  BTN: [38, 52],
  SB: [35, 52],
};

/** P1-DATA-02: 169 hands; each frequency in [0,1]; sums to 1 ±0.001; only the spot's actions. */
export function validateSpotFrequencies(spot: SpotData): string[] {
  const errs: string[] = [];
  const labels = Object.keys(spot.hands);
  if (labels.length !== 169) errs.push(`${spot.id}: has ${labels.length} hand classes, expected 169`);
  for (const h of HAND_LABELS) if (!(h in spot.hands)) errs.push(`${spot.id}: missing ${h}`);
  for (const [h, f] of Object.entries(spot.hands)) {
    if (!HAND_LABELS.includes(h)) errs.push(`${spot.id}: unknown hand ${h}`);
    let sum = 0;
    for (const [a, v] of Object.entries(f)) {
      if (!spot.actions.includes(a as never)) errs.push(`${spot.id}: ${h} has unexpected action ${a}`);
      if (typeof v !== 'number' || !(v >= 0 && v <= 1)) errs.push(`${spot.id}: ${h} ${a}=${String(v)} outside [0,1]`);
      sum += typeof v === 'number' ? v : NaN;
    }
    if (!(Math.abs(sum - 1) <= 0.001)) errs.push(`${spot.id}: ${h} frequencies sum to ${sum}`);
  }
  if (JSON.stringify(spot.actions) !== JSON.stringify(SPOT_ACTIONS[spot.type])) errs.push(`${spot.id}: wrong action list`);
  return errs;
}

/** Combo-weighted frequency (percent) of an action over all 1326 combos. */
export function actionPercent(spot: SpotData, action: string): number {
  let c = 0;
  for (const [h, f] of Object.entries(spot.hands)) c += ((f as Record<string, number>)[action] ?? 0) * comboCount(h);
  return (c / TOTAL_COMBOS) * 100;
}

export interface StructureReport {
  errors: string[];
  count: number;
  perPosition: Record<Position, number>;
  perType: Record<string, number>;
}

/** P1-DATA-01: 35 spots (5 RFI, 15 vs-open, 15 vs-3bet), every position appears as hero. */
export function validateStructure(spots: SpotData[]): StructureReport {
  const errors: string[] = [];
  const perPosition = Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<Position, number>;
  const perType: Record<string, number> = { rfi: 0, 'vs-open': 0, 'vs-3bet': 0 };
  const ids = new Set<string>();
  for (const s of spots) {
    if (ids.has(s.id)) errors.push(`duplicate spot id ${s.id}`);
    ids.add(s.id);
    if (!POSITIONS.includes(s.hero)) errors.push(`${s.id}: bad hero ${s.hero}`);
    else perPosition[s.hero]++;
    perType[s.type] = (perType[s.type] ?? 0) + 1;
    if (s.type !== 'rfi') {
      if (!s.villain || !POSITIONS.includes(s.villain)) errors.push(`${s.id}: missing villain`);
      else if (s.type === 'vs-open' && POSITIONS.indexOf(s.villain) >= POSITIONS.indexOf(s.hero))
        errors.push(`${s.id}: hero must act after the opener`);
      else if (s.type === 'vs-3bet' && POSITIONS.indexOf(s.villain) <= POSITIONS.indexOf(s.hero))
        errors.push(`${s.id}: 3-bettor must act after the opener`);
    }
    if (!(s.pot > 0) || !s.sizes || !(s.sizes.open > 0)) errors.push(`${s.id}: missing pot/size metadata`);
  }
  if (spots.length !== EXPECTED_SPOT_COUNT) errors.push(`expected ${EXPECTED_SPOT_COUNT} spots, found ${spots.length}`);
  if (perType.rfi !== 5 || perType['vs-open'] !== 15 || perType['vs-3bet'] !== 15)
    errors.push(`expected 5/15/15 spots by type, found ${perType.rfi}/${perType['vs-open']}/${perType['vs-3bet']}`);
  for (const p of POSITIONS) if (perPosition[p] === 0) errors.push(`position ${p} never appears as hero`);
  return { errors, count: spots.length, perPosition, perType };
}

export interface InvariantReport {
  errors: string[];
  rfiPercents: Partial<Record<Position, number>>;
}

/** P1-DATA-03 sanity invariants. */
export function validateInvariants(spots: SpotData[]): InvariantReport {
  const errors: string[] = [];
  for (const s of spots) {
    const aa = s.hands['AA'];
    if (!aa || (aa.fold ?? 0) > 0) errors.push(`${s.id}: AA folds ${aa?.fold}`);
    const t = s.hands['72o'];
    if (!t || t.fold !== 1) errors.push(`${s.id}: 72o is not a pure fold`);
    if (s.type === 'vs-open') {
      const a = s.hands['AA']?.['3bet'] ?? 0;
      const d = s.hands['22']?.['3bet'] ?? 0;
      if (!(a >= d)) errors.push(`${s.id}: 3-bet AA (${a}) < 3-bet 22 (${d})`);
    }
  }
  const rfiPercents: Partial<Record<Position, number>> = {};
  for (const s of spots.filter((x) => x.type === 'rfi')) rfiPercents[s.hero] = actionPercent(s, 'raise');
  for (const [p, [lo, hi]] of Object.entries(RFI_BANDS) as [Exclude<Position, 'BB'>, [number, number]][]) {
    const v = rfiPercents[p];
    if (v === undefined) errors.push(`missing RFI spot for ${p}`);
    else if (!(v >= lo && v <= hi)) errors.push(`RFI ${p} ${v.toFixed(1)}% outside ${lo}-${hi}%`);
  }
  const order: Position[] = ['UTG', 'HJ', 'CO', 'BTN'];
  for (let i = 1; i < order.length; i++) {
    const a = rfiPercents[order[i - 1]!];
    const b = rfiPercents[order[i]!];
    if (a === undefined || b === undefined || !(b > a)) errors.push(`RFI % not strictly increasing ${order[i - 1]} < ${order[i]}`);
  }
  return { errors, rfiPercents };
}
