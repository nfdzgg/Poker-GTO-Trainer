import { cardId, rankOf, suitOf, type CardId } from './cards';

/** Ranks in grid order (row/column 0 = Ace). */
export const GRID_RANKS = 'AKQJT98765432';

export type HandKind = 'pair' | 'suited' | 'offsuit';

export interface HandClass {
  label: string; // 'AA', 'AKs', 'AKo'
  kind: HandKind;
  high: number; // rank index 0..12 (2..A) of the higher card
  low: number;
  row: number; // grid row 0..12
  col: number; // grid col 0..12
}

/** Rank index (0 = deuce .. 12 = ace) from a grid index (0 = ace). */
const gridToRank = (g: number) => 12 - g;

function makeHand(row: number, col: number): HandClass {
  const a = GRID_RANKS[row]!;
  const b = GRID_RANKS[col]!;
  if (row === col) return { label: a + b, kind: 'pair', high: gridToRank(row), low: gridToRank(col), row, col };
  if (row < col) return { label: `${a}${b}s`, kind: 'suited', high: gridToRank(row), low: gridToRank(col), row, col };
  return { label: `${b}${a}o`, kind: 'offsuit', high: gridToRank(col), low: gridToRank(row), row, col };
}

/** All 169 hand classes in grid order (row-major): pairs on the diagonal, suited above, offsuit below. */
export const HAND_CLASSES: readonly HandClass[] = (() => {
  const out: HandClass[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(makeHand(r, c));
  return out;
})();

export const HAND_LABELS: readonly string[] = HAND_CLASSES.map((h) => h.label);
const BY_LABEL = new Map(HAND_CLASSES.map((h) => [h.label, h]));

export function handClass(label: string): HandClass {
  const h = BY_LABEL.get(label);
  if (!h) throw new Error(`Unknown hand class: ${label}`);
  return h;
}
export function isHandLabel(label: string): boolean {
  return BY_LABEL.has(label);
}

/** Number of card combinations: pairs 6, suited 4, offsuit 12. */
export function comboCount(label: string): number {
  const k = handClass(label).kind;
  return k === 'pair' ? 6 : k === 'suited' ? 4 : 12;
}

export const TOTAL_COMBOS = 1326;

/** All specific two-card combos for a hand class. */
export function handCombos(label: string): [CardId, CardId][] {
  const h = handClass(label);
  const out: [CardId, CardId][] = [];
  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (h.kind === 'pair' && s2 <= s1) continue;
      if (h.kind === 'suited' && s1 !== s2) continue;
      if (h.kind === 'offsuit' && s1 === s2) continue;
      out.push([cardId(h.high, s1), cardId(h.low, s2)]);
    }
  }
  return out;
}

/** Hand class label for two specific cards. */
export function handLabelOf(c1: CardId, c2: CardId): string {
  const r1 = rankOf(c1);
  const r2 = rankOf(c2);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const R = '23456789TJQKA';
  if (hi === lo) return R[hi]! + R[lo]!;
  return `${R[hi]}${R[lo]}${suitOf(c1) === suitOf(c2) ? 's' : 'o'}`;
}

/** Index into postflop-solver's 1326-length raw range array (c1 != c2). */
export function comboIndex(c1: CardId, c2: CardId): number {
  const a = Math.min(c1, c2);
  const b = Math.max(c1, c2);
  return (a * (101 - a)) / 2 + b - 1;
}

/** Inverse of comboIndex over all 1326 combos. */
export const COMBO_CARDS: readonly [CardId, CardId][] = (() => {
  const out: [CardId, CardId][] = new Array(TOTAL_COMBOS);
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) out[comboIndex(a, b)] = [a, b];
  return out;
})();
