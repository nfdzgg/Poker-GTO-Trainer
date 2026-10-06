import type { CardId } from '../lib/poker/cards';
import type { RangeWeights } from '../lib/poker/range';

export type Player = 'oop' | 'ip';
export type Street = 'flop' | 'turn' | 'river';

export interface PlayerSizes {
  /** Bet sizes in postflop-solver syntax, e.g. "33%, 75%, a". Empty = no bets. */
  bet: string;
  /** Raise sizes, e.g. "2.5x" or "60%". Empty = no raises. */
  raise: string;
}

export interface StreetSizes {
  oop: PlayerSizes;
  ip: PlayerSizes;
}

export type RangeInput = string | RangeWeights | Float32Array;

export interface SolverConfig {
  oopRange: RangeInput;
  ipRange: RangeInput;
  /** 3, 4 or 5 cards: ids or strings like "Qs". */
  board: (CardId | string)[] | string;
  /** Pot at the start of the tree, in big blinds. */
  startingPot: number;
  /** Effective stack behind at the start of the tree, in big blinds. */
  effectiveStack: number;
  flop: StreetSizes;
  turn: StreetSizes;
  river: StreetSizes;
  /** Add an all-in action when the max bet is within this multiple of the pot (default 1.5). */
  addAllInThreshold?: number;
  /** Force all-in when the remaining stack would be below this fraction of the pot (default 0.15). */
  forceAllInThreshold?: number;
  /** Merge bet sizes closer than this fraction (default 0.1). */
  mergingThreshold?: number;
}

export interface MemoryEstimate {
  uncompressed: number; // bytes
  compressed: number; // bytes
}

export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface ActionInfo {
  index: number;
  kind: ActionKind;
  /** Bet/raise size: total chips put in on this street after the action, in bb (0 for fold/check/call). */
  amount: number;
  label: string;
  code: string; // raw solver code, e.g. "B250"
}

export interface SolveOptions {
  /** Stop when exploitability falls below this % of the starting pot. */
  targetExploitability?: number;
  maxIterations?: number;
  /** Wall-clock budget for the iterations (ms). */
  timeLimitMs?: number;
  /** Compute exploitability every N iterations (default 10). */
  checkEvery?: number;
  /** Yield to the event loop at least this often (ms) so `cancel()` can be received (default 40). */
  sliceMs?: number;
  onProgress?: (p: SolveProgress) => void;
  /** Call finalize() at the end (default true). */
  finalize?: boolean;
}

export interface SolveProgress {
  iteration: number;
  exploitability: number; // % of starting pot (NaN if not yet computed)
  elapsedMs: number;
}

export interface SolveResult extends SolveProgress {
  cancelled: boolean;
  reason: 'target' | 'iterations' | 'time' | 'cancelled';
}

export interface HandRow {
  combo: string; // e.g. "AsKs"
  cards: [CardId, CardId];
  handClass: string; // e.g. "AKs"
  /** Weight of this combo in the acting player's range at this node (0..1, initial weight × reach). */
  weight: number;
  /** Action frequencies (same order as actions). */
  strategy: number[];
  /** EV in bb (only after finalize). */
  ev?: number;
  /** EV of each action in bb (only after finalize). */
  actionEv?: number[];
  equity?: number;
}

export interface ActionNode {
  type: 'action';
  player: Player;
  actions: ActionInfo[];
  hands: HandRow[];
  /** Range-wide action frequencies, weighted by combo weights. */
  rangeFreqs: number[];
  /** Range-average EV (bb) and equity, when available. */
  rangeEv?: number;
  rangeEquity?: number;
  pot: number; // bb in the middle (starting pot + both players' bets)
  toCall: number; // bb the acting player must add to call
  board: CardId[];
  history: number[];
  solved: boolean;
}

export interface ChanceNode {
  type: 'chance';
  street: Street; // the street being dealt
  possibleCards: CardId[];
  pot: number;
  board: CardId[];
  history: number[];
}

export interface TerminalNode {
  type: 'terminal';
  pot: number;
  board: CardId[];
  history: number[];
}

export type NodeView = ActionNode | ChanceNode | TerminalNode;

export interface HandEV {
  hand: string;
  combos: HandRow[];
  /** Weighted average strategy/EV/equity over the hand's combos at this node. */
  strategy: number[];
  ev?: number;
  equity?: number;
  weight: number;
}
