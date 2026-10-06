// Analyzer spot-builder state: defaults, built-in examples, validation, persistence
// and conversion to the solver's configuration.
import { cardToString, parseBoard, type CardId } from '../lib/poker/cards';
import { COMBO_CARDS, handLabelOf } from '../lib/poker/hands';
import { formatRange, parseRange } from '../lib/poker/range';
import { getSpot } from '../lib/preflop/spots';
import { isPosition, type Position } from '../lib/preflop/types';
import { rangeFromSpot } from '../solver/presets';
import type { MemoryEstimate, Player, SolverConfig, Street } from '../solver/types';

export interface PlayerSizesForm {
  bet: string; // comma-separated % of pot, e.g. "33, 75"
  raise: string; // comma-separated % of pot
}
export type SizesForm = Record<Street, Record<Player, PlayerSizesForm>>;

export interface AnalyzerForm {
  version: 1;
  name: string;
  oopSeat: Position;
  ipSeat: Position;
  oopRange: string;
  ipRange: string;
  board: string; // e.g. "Qs7h2d"
  pot: number; // bb
  stack: number; // effective stack behind, bb
  sizes: SizesForm;
  allIn: boolean;
  target: number; // exploitability target, % of pot
  maxIterations: number;
}

export const STREETS: Street[] = ['flop', 'turn', 'river'];
export const ANALYZER_KEY = 'pgt.analyzer.v1';

const ps = (bet: string, raise: string): Record<Player, PlayerSizesForm> => ({ oop: { bet, raise }, ip: { bet, raise } });
export const uniformSizes = (flop: [string, string], turn: [string, string], river: [string, string]): SizesForm => ({
  flop: ps(...flop),
  turn: ps(...turn),
  river: ps(...river),
});

function presetRange(spotId: string, action: 'raise' | 'call' | '3bet' | '4bet'): string {
  const s = getSpot(spotId);
  return s ? formatRange(rangeFromSpot(s, action)) : '';
}

export interface Example {
  id: 'flop' | 'turn' | 'river';
  label: string;
  description: string;
  form: AnalyzerForm;
}

export const EXAMPLES: Example[] = [
  {
    id: 'flop',
    label: 'Flop example',
    description: 'BB 3-bets the BTN open, BTN calls · K♠8♦3♣ · 20.5bb pot, 90bb behind',
    form: {
      version: 1,
      name: 'Flop: BB vs BTN 3-bet pot, Ks8d3c',
      oopSeat: 'BB',
      ipSeat: 'BTN',
      oopRange: presetRange('vsopen-BB-vs-BTN', '3bet'),
      ipRange: presetRange('vs3bet-BTN-vs-BB', 'call'),
      board: 'Ks8d3c',
      pot: 20.5,
      stack: 90,
      sizes: uniformSizes(['33', ''], ['75', ''], ['75', '']),
      allIn: true,
      target: 1,
      maxIterations: 300,
    },
  },
  {
    id: 'turn',
    label: 'Turn example',
    description: 'BTN opens, BB calls, flop checks through · Q♠7♥2♦4♣ · 5.5bb pot',
    form: {
      version: 1,
      name: 'Turn: BTN vs BB single-raised pot, Qs7h2d4c',
      oopSeat: 'BB',
      ipSeat: 'BTN',
      oopRange: presetRange('vsopen-BB-vs-BTN', 'call'),
      ipRange: presetRange('rfi-BTN', 'raise'),
      board: 'Qs7h2d4c',
      pot: 5.5,
      stack: 97.5,
      sizes: uniformSizes(['', ''], ['66', ''], ['66', '']),
      allIn: true,
      target: 0.5,
      maxIterations: 500,
    },
  },
  {
    id: 'river',
    label: 'River example',
    description: 'BTN vs BB single-raised pot checked to the river · Q♠7♥2♦4♣9♠',
    form: {
      version: 1,
      name: 'River: BTN vs BB single-raised pot, Qs7h2d4c9s',
      oopSeat: 'BB',
      ipSeat: 'BTN',
      oopRange: presetRange('vsopen-BB-vs-BTN', 'call'),
      ipRange: presetRange('rfi-BTN', 'raise'),
      board: 'Qs7h2d4c9s',
      pot: 5.5,
      stack: 97.5,
      sizes: uniformSizes(['', ''], ['', ''], ['66, 125', '']),
      allIn: true,
      target: 0.3,
      maxIterations: 1000,
    },
  },
];

export const DEFAULT_FORM: AnalyzerForm = EXAMPLES[2]!.form;

/** Streets that are played given the board length. */
export function streetsFor(boardLength: number): Street[] {
  if (boardLength >= 5) return ['river'];
  if (boardLength === 4) return ['turn', 'river'];
  return ['flop', 'turn', 'river'];
}

export type SizeParse = { ok: true; values: number[] } | { ok: false; error: string };

/** Parse "33, 75%" into [33, 75]. Empty text = no sizes. */
export function parseSizeList(text: string): SizeParse {
  const parts = text
    .split(/[,\s]+/)
    .map((s) => s.trim().replace(/%$/, ''))
    .filter(Boolean);
  const values: number[] = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v) || !/^\d+(\.\d+)?$/.test(p)) return { ok: false, error: `"${p}" is not a number` };
    if (v <= 0 || v > 1000) return { ok: false, error: `${p}% must be between 0 and 1000` };
    values.push(v);
  }
  return { ok: true, values: [...new Set(values)].sort((a, b) => a - b) };
}

const STREET_NAME: Record<Street, string> = { flop: 'flop', turn: 'turn', river: 'river' };
const PLAYER_NAME: Record<Player, string> = { oop: 'out-of-position', ip: 'in-position' };

export function boardCards(form: Pick<AnalyzerForm, 'board'>): CardId[] | null {
  return parseBoard(form.board);
}

function liveCombos(rangeText: string, board: CardId[]): number {
  const r = parseRange(rangeText);
  if (!r.ok) return 0;
  const dead = new Set(board);
  let n = 0;
  for (const [a, b] of COMBO_CARDS) {
    if (dead.has(a) || dead.has(b)) continue;
    const label = handLabelOf(a, b);
    n += r.range.get(label) ?? 0;
  }
  return n;
}

/** Validate the form; returns human-readable problems (empty = valid). */
export function validateForm(form: AnalyzerForm): string[] {
  const errors: string[] = [];
  const board = parseBoard(form.board);
  if (!board) errors.push('The board has an invalid card. Use cards like "Qs 7h 2d".');
  else {
    if (board.length < 3 || board.length > 5) errors.push(`The board needs 3, 4 or 5 cards (it has ${board.length}).`);
    const dupes = board.filter((c, i) => board.indexOf(c) !== i);
    if (dupes.length) errors.push(`Duplicate board card: ${[...new Set(dupes)].map(cardToString).join(', ')}.`);
  }
  for (const [p, text] of [
    ['oop', form.oopRange],
    ['ip', form.ipRange],
  ] as const) {
    const who = p === 'oop' ? 'Out-of-position' : 'In-position';
    const r = parseRange(text);
    if (!r.ok) errors.push(`${who} range: ${r.error}.`);
    else if (r.range.size === 0) errors.push(`${who} range is empty.`);
    else if (board && liveCombos(text, board) <= 0) errors.push(`${who} range has no combos left after removing the board cards.`);
  }
  if (form.oopSeat === form.ipSeat) errors.push('The two players must sit in different seats.');
  if (!(form.pot > 0)) errors.push('The pot must be greater than 0.');
  if (!(form.stack > 0)) errors.push('The effective stack must be greater than 0.');
  if (!(form.target > 0)) errors.push('The exploitability target must be greater than 0.');
  if (!(form.maxIterations >= 1)) errors.push('Max iterations must be at least 1.');
  const streets = streetsFor(board?.length ?? 3);
  for (const st of streets) {
    for (const p of ['oop', 'ip'] as const) {
      const s = form.sizes[st][p];
      const bet = parseSizeList(s.bet);
      const raise = parseSizeList(s.raise);
      if (!bet.ok) errors.push(`${PLAYER_NAME[p]} ${STREET_NAME[st]} bet sizes: ${bet.error}.`);
      if (!raise.ok) errors.push(`${PLAYER_NAME[p]} ${STREET_NAME[st]} raise sizes: ${raise.error}.`);
      if (bet.ok && bet.values.length === 0 && !form.allIn)
        errors.push(`Add at least one ${STREET_NAME[st]} bet size for the ${PLAYER_NAME[p]} player (or allow all-in).`);
    }
  }
  return errors;
}

function sizeString(text: string, allIn: boolean): string {
  const r = parseSizeList(text);
  const parts = r.ok ? r.values.map((v) => `${v}%`) : [];
  if (allIn) parts.push('a');
  return parts.join(', ');
}

/** Convert a valid form into a solver configuration. */
export function toSolverConfig(form: AnalyzerForm): SolverConfig {
  const street = (st: Street) => ({
    oop: { bet: sizeString(form.sizes[st].oop.bet, form.allIn), raise: sizeString(form.sizes[st].oop.raise, form.allIn) },
    ip: { bet: sizeString(form.sizes[st].ip.bet, form.allIn), raise: sizeString(form.sizes[st].ip.raise, form.allIn) },
  });
  return {
    oopRange: form.oopRange,
    ipRange: form.ipRange,
    board: form.board,
    startingPot: form.pot,
    effectiveStack: form.stack,
    flop: street('flop'),
    turn: street('turn'),
    river: street('river'),
  };
}

export const DESKTOP_LIMIT_BYTES = 1.5e9;
export const PHONE_LIMIT_BYTES = 600e6;

export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 599px)').matches) return true;
  return window.innerWidth > 0 && window.innerWidth < 600;
}

export interface MemoryPlan {
  ok: boolean;
  compression: boolean;
  needed: number;
  limit: number;
  message: string;
}

/** Decide whether a solve fits under the safe memory limit, using compression only if needed. */
export function memoryPlan(est: MemoryEstimate, phone: boolean): MemoryPlan {
  const limit = phone ? PHONE_LIMIT_BYTES : DESKTOP_LIMIT_BYTES;
  const mb = (b: number) => (b < 10e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e6).toLocaleString('en-US')} MB`);
  if (est.uncompressed <= limit) return { ok: true, compression: false, needed: est.uncompressed, limit, message: `Estimated memory: ${mb(est.uncompressed)}` };
  if (est.compressed <= limit)
    return {
      ok: true,
      compression: true,
      needed: est.compressed,
      limit,
      message: `Estimated memory: ${mb(est.compressed)} with compression (${mb(est.uncompressed)} without)`,
    };
  return {
    ok: false,
    compression: true,
    needed: est.compressed,
    limit,
    message:
      `Too large to solve here: needs ${mb(est.compressed)} even with compression, above the ${mb(limit)} safe limit` +
      `${phone ? ' for phones' : ''}. Reduce the number of bet and raise sizes, turn off all-in, or narrow the ranges.`,
  };
}

function isForm(x: unknown): x is AnalyzerForm {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  const sizesOk =
    !!f.sizes &&
    STREETS.every((st) => {
      const s = (f.sizes as Record<string, Record<string, Record<string, unknown>>>)[st];
      return !!s && ['oop', 'ip'].every((p) => typeof s[p]?.bet === 'string' && typeof s[p]?.raise === 'string');
    });
  return (
    f.version === 1 &&
    typeof f.oopRange === 'string' &&
    typeof f.ipRange === 'string' &&
    typeof f.board === 'string' &&
    typeof f.pot === 'number' &&
    typeof f.stack === 'number' &&
    typeof f.allIn === 'boolean' &&
    typeof f.target === 'number' &&
    typeof f.maxIterations === 'number' &&
    isPosition(f.oopSeat as string) &&
    isPosition(f.ipSeat as string) &&
    sizesOk
  );
}

export function loadForm(): AnalyzerForm | null {
  try {
    const raw = window.localStorage.getItem(ANALYZER_KEY);
    if (!raw) return null;
    const f = JSON.parse(raw) as unknown;
    return isForm(f) ? { ...f, name: typeof f.name === 'string' ? f.name : 'Custom spot' } : null;
  } catch {
    return null;
  }
}

export function saveForm(form: AnalyzerForm): void {
  try {
    window.localStorage.setItem(ANALYZER_KEY, JSON.stringify(form));
  } catch {
    // storage unavailable
  }
}
