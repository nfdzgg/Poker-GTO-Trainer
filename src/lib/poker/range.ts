import { GRID_RANKS, HAND_CLASSES, isHandLabel } from './hands';

/** A range: weight in [0,1] per hand class label. Missing labels have weight 0. */
export type RangeWeights = Map<string, number>;

export type ParseResult = { ok: true; range: RangeWeights } | { ok: false; error: string };

const RANK_ORDER = 'AKQJT98765432'; // index 0 = Ace (strongest)
const ri = (c: string) => RANK_ORDER.indexOf(c.toUpperCase());

function pairLabel(i: number) {
  return RANK_ORDER[i]! + RANK_ORDER[i]!;
}
function nonPairLabel(hi: number, lo: number, suit: 's' | 'o') {
  return `${RANK_ORDER[hi]}${RANK_ORDER[lo]}${suit}`;
}

/** Expand one token (without weight) into hand labels, or return an error string. */
function expandToken(tok: string): string[] | string {
  const t = tok.trim();
  // Pair forms
  let m = /^([2-9TJQKA])\1(\+)?$/i.exec(t);
  if (m) {
    const i = ri(m[1]!);
    if (!m[2]) return [pairLabel(i)];
    const out: string[] = [];
    for (let k = i; k >= 0; k--) out.push(pairLabel(k));
    return out;
  }
  m = /^([2-9TJQKA])\1-([2-9TJQKA])\2$/i.exec(t);
  if (m) {
    const a = ri(m[1]!);
    const b = ri(m[2]!);
    const out: string[] = [];
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) out.push(pairLabel(k));
    return out;
  }
  // Non-pair forms: XY[s|o][+]  or XYs-XZs
  m = /^([2-9TJQKA])([2-9TJQKA])([so])?(\+)?$/i.exec(t);
  if (m) {
    const hi = ri(m[1]!);
    const lo = ri(m[2]!);
    if (hi === lo) return `Invalid hand "${t}"`;
    if (hi > lo) return `Write the higher rank first in "${t}"`;
    const suits: ('s' | 'o')[] = m[3] ? [m[3].toLowerCase() as 's' | 'o'] : ['s', 'o'];
    const out: string[] = [];
    const kickers: number[] = [];
    if (m[4]) for (let k = lo; k > hi; k--) kickers.push(k);
    else kickers.push(lo);
    for (const k of kickers) for (const s of suits) out.push(nonPairLabel(hi, k, s));
    return out;
  }
  m = /^([2-9TJQKA])([2-9TJQKA])([so])?-([2-9TJQKA])([2-9TJQKA])([so])?$/i.exec(t);
  if (m) {
    const hi1 = ri(m[1]!);
    const hi2 = ri(m[4]!);
    const s1 = m[3]?.toLowerCase();
    const s2 = m[6]?.toLowerCase();
    if (hi1 !== hi2 || s1 !== s2) return `Invalid range "${t}" (both ends must share the first rank and suitedness)`;
    const a = ri(m[2]!);
    const b = ri(m[5]!);
    if (a <= hi1 || b <= hi1) return `Invalid range "${t}"`;
    const suits: ('s' | 'o')[] = s1 ? [s1 as 's' | 'o'] : ['s', 'o'];
    const out: string[] = [];
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) for (const s of suits) out.push(nonPairLabel(hi1, k, s));
    return out;
  }
  return `Invalid token "${t}"`;
}

/**
 * Parse range text such as `QQ+,AKs,A5s:0.5,KTs+,22-66,AJo-ATo:0.25`.
 * Later tokens override earlier ones for the same hand.
 */
export function parseRange(text: string): ParseResult {
  const range: RangeWeights = new Map();
  const tokens = text
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const raw of tokens) {
    const [handPart, weightPart, extra] = raw.split(':');
    if (extra !== undefined || !handPart) return { ok: false, error: `Invalid token "${raw}"` };
    let w = 1;
    if (weightPart !== undefined) {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(weightPart)) return { ok: false, error: `Invalid weight in "${raw}"` };
      w = Number(weightPart);
      if (!(w >= 0 && w <= 1)) return { ok: false, error: `Weight must be between 0 and 1 in "${raw}"` };
    }
    const hands = expandToken(handPart);
    if (typeof hands === 'string') return { ok: false, error: hands };
    for (const h of hands) {
      if (!isHandLabel(h)) return { ok: false, error: `Invalid hand "${h}"` };
      if (w === 0) range.delete(h);
      else range.set(h, w);
    }
  }
  return { ok: true, range };
}

export function parseRangeOrThrow(text: string): RangeWeights {
  const r = parseRange(text);
  if (!r.ok) throw new Error(r.error);
  return r.range;
}

function fmtWeight(w: number): string {
  if (w >= 0.9995) return '';
  return `:${Number(w.toFixed(3)).toString()}`;
}

const sameW = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Canonical compact text for a range (inverse of parseRange). */
export function formatRange(range: RangeWeights): string {
  const parts: string[] = [];
  const get = (label: string) => {
    const w = range.get(label) ?? 0;
    return w > 1 ? 1 : w < 0 ? 0 : w;
  };
  // Pairs: runs from AA downward.
  {
    let i = 0;
    while (i < 13) {
      const w = get(pairLabel(i));
      if (w <= 0) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < 13 && sameW(get(pairLabel(j + 1)), w)) j++;
      if (i === j) parts.push(pairLabel(i) + fmtWeight(w));
      else if (i === 0) parts.push(`${pairLabel(j)}+${fmtWeight(w)}`);
      else parts.push(`${pairLabel(i)}-${pairLabel(j)}${fmtWeight(w)}`);
      i = j + 1;
    }
  }
  for (const suit of ['s', 'o'] as const) {
    for (let hi = 0; hi < 12; hi++) {
      let k = hi + 1;
      while (k < 13) {
        const w = get(nonPairLabel(hi, k, suit));
        if (w <= 0) {
          k++;
          continue;
        }
        let j = k;
        while (j + 1 < 13 && sameW(get(nonPairLabel(hi, j + 1, suit)), w)) j++;
        if (k === j) parts.push(nonPairLabel(hi, k, suit) + fmtWeight(w));
        else if (k === hi + 1) parts.push(`${nonPairLabel(hi, j, suit)}+${fmtWeight(w)}`);
        else parts.push(`${nonPairLabel(hi, k, suit)}-${nonPairLabel(hi, j, suit)}${fmtWeight(w)}`);
        k = j + 1;
      }
    }
  }
  return parts.join(',');
}

/** Total combos (weighted) in a range. */
export function rangeCombos(range: RangeWeights): number {
  let n = 0;
  for (const h of HAND_CLASSES) {
    const w = range.get(h.label) ?? 0;
    n += w * (h.kind === 'pair' ? 6 : h.kind === 'suited' ? 4 : 12);
  }
  return n;
}

export { GRID_RANKS };
