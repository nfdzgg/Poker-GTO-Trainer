// Typed TypeScript API over the postflop-solver WebAssembly module.
import { cardToString, parseCard, type CardId } from '../lib/poker/cards';
import { COMBO_CARDS, comboIndex, handCombos, handLabelOf, HAND_LABELS, isHandLabel, TOTAL_COMBOS } from '../lib/poker/hands';
import { parseRange } from '../lib/poker/range';
import type {
  ActionInfo,
  ActionKind,
  ActionNode,
  HandEV,
  HandRow,
  MemoryEstimate,
  NodeView,
  RangeInput,
  SolveOptions,
  SolveResult,
  SolverConfig,
} from './types';
import { initSolverWasm, upstreamCommit, WasmSolver, type WasmSource } from './wasm';

/** Chips per big blind used inside the solver (it works in integers). */
export const CHIPS_PER_BB = 100;

export class SolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolverError';
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));
const toBb = (chips: number) => chips / CHIPS_PER_BB;

/** Expand a range (text, class weights or raw 1326 weights) into postflop-solver's raw format. */
export function rangeToRaw(input: RangeInput): Float32Array {
  if (input instanceof Float32Array) {
    if (input.length !== TOTAL_COMBOS) throw new SolverError(`Raw ranges need ${TOTAL_COMBOS} weights`);
    return input;
  }
  let weights: Map<string, number>;
  if (typeof input === 'string') {
    const r = parseRange(input);
    if (!r.ok) throw new SolverError(r.error);
    weights = r.range;
  } else weights = input;
  const raw = new Float32Array(TOTAL_COMBOS);
  for (const label of HAND_LABELS) {
    const w = weights.get(label) ?? 0;
    if (w <= 0) continue;
    for (const [a, b] of handCombos(label)) raw[comboIndex(a, b)] = Math.min(1, w);
  }
  return raw;
}

export function normalizeBoard(board: SolverConfig['board']): CardId[] {
  const items = typeof board === 'string' ? (board.replace(/[\s,]+/g, '').match(/.{1,2}/g) ?? []) : board;
  const out: CardId[] = [];
  for (const c of items) {
    const id = typeof c === 'number' ? c : parseCard(c);
    if (id === null || !Number.isInteger(id) || id < 0 || id > 51) throw new SolverError(`Invalid board card "${String(c)}"`);
    out.push(id);
  }
  if (out.length < 3 || out.length > 5) throw new SolverError('The board must have 3, 4 or 5 cards');
  if (new Set(out).size !== out.length) throw new SolverError('The board contains duplicate cards');
  return out;
}

export function parseActionCode(code: string, index: number): ActionInfo {
  const kindMap: Record<string, ActionKind> = { F: 'fold', X: 'check', C: 'call', B: 'bet', R: 'raise', A: 'allin' };
  const kind = kindMap[code[0]!];
  if (!kind) throw new SolverError(`Unknown action code ${code}`);
  const amount = code.length > 1 ? toBb(Number(code.slice(1))) : 0;
  const amt = Number(amount.toFixed(2));
  const label =
    kind === 'fold' ? 'Fold' : kind === 'check' ? 'Check' : kind === 'call' ? 'Call' : kind === 'bet' ? `Bet ${amt}` : kind === 'raise' ? `Raise ${amt}` : `All-in ${amt}`;
  return { index, kind, amount, label, code };
}

function comboString(a: CardId, b: CardId): string {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return cardToString(hi) + cardToString(lo);
}

export interface ConfiguredInfo {
  startingPotChips: number;
  board: CardId[];
}

/**
 * Postflop solver backed by postflop-solver compiled to single-threaded WASM.
 * Lifecycle: configure → estimateMemory → allocate → solve/solveStep → finalize → getNode/play/dealCard.
 */
export class PostflopSolver {
  private wasm: WasmSolver;
  private configured: ConfiguredInfo | null = null;
  private allocated = false;
  private finalized = false;
  private cancelRequested = false;
  private lastExploitability = NaN;

  private constructor() {
    this.wasm = new WasmSolver();
  }

  /** Load the WASM module (once) and create a solver. */
  static async create(source?: WasmSource): Promise<PostflopSolver> {
    await initSolverWasm(source);
    return new PostflopSolver();
  }

  static upstreamCommit(): string {
    return upstreamCommit();
  }

  get isConfigured(): boolean {
    return this.configured !== null;
  }
  get isAllocated(): boolean {
    return this.allocated;
  }
  get isFinalized(): boolean {
    return this.finalized;
  }
  get iteration(): number {
    return this.wasm.iteration();
  }

  /** Build the game tree. Throws SolverError with a readable message on invalid input. */
  configure(config: SolverConfig): void {
    const board = normalizeBoard(config.board);
    const oop = rangeToRaw(config.oopRange);
    const ip = rangeToRaw(config.ipRange);
    if (!oop.some((w) => w > 0)) throw new SolverError('The OOP range is empty');
    if (!ip.some((w) => w > 0)) throw new SolverError('The IP range is empty');
    if (!(config.startingPot > 0)) throw new SolverError('The pot must be greater than 0');
    if (!(config.effectiveStack > 0)) throw new SolverError('The effective stack must be greater than 0');
    const pot = Math.round(config.startingPot * CHIPS_PER_BB);
    const stack = Math.round(config.effectiveStack * CHIPS_PER_BB);
    const s = (x: string) => x.trim();
    const err = this.wasm.configure(
      oop,
      ip,
      Uint8Array.from(board),
      pot,
      stack,
      s(config.flop.oop.bet),
      s(config.flop.oop.raise),
      s(config.flop.ip.bet),
      s(config.flop.ip.raise),
      s(config.turn.oop.bet),
      s(config.turn.oop.raise),
      s(config.turn.ip.bet),
      s(config.turn.ip.raise),
      s(config.river.oop.bet),
      s(config.river.oop.raise),
      s(config.river.ip.bet),
      s(config.river.ip.raise),
      config.addAllInThreshold ?? 1.5,
      config.forceAllInThreshold ?? 0.15,
      config.mergingThreshold ?? 0.1,
    );
    if (err) {
      this.configured = null;
      throw new SolverError(err);
    }
    this.configured = { startingPotChips: pot, board };
    this.allocated = false;
    this.finalized = false;
    this.lastExploitability = NaN;
  }

  private requireConfigured(): ConfiguredInfo {
    if (!this.configured) throw new SolverError('The solver is not configured');
    return this.configured;
  }

  /** Estimated memory needed to solve, in bytes. */
  estimateMemory(): MemoryEstimate {
    this.requireConfigured();
    const [u, c] = this.wasm.memory_usage();
    return { uncompressed: u ?? 0, compressed: c ?? 0 };
  }

  allocate(compression = false): void {
    this.requireConfigured();
    this.wasm.allocate(compression);
    this.allocated = true;
    this.finalized = false;
  }

  /** Run one CFR iteration; returns the number of completed iterations. */
  solveStep(): number {
    this.requireConfigured();
    if (!this.allocated) this.allocate(false);
    if (this.finalized) throw new SolverError('The solve was finalized; configure again to re-solve');
    this.wasm.solve_step();
    return this.wasm.iteration();
  }

  /** Exploitability as a percentage of the starting pot. */
  exploitability(): number {
    const cfg = this.requireConfigured();
    if (!this.allocated) throw new SolverError('Memory is not allocated');
    this.lastExploitability = (this.wasm.exploitability() / cfg.startingPotChips) * 100;
    return this.lastExploitability;
  }

  /** Request that a running `solve()` stops after its current slice. */
  cancel(): void {
    this.cancelRequested = true;
  }

  /**
   * Iterate until the exploitability target, iteration cap or time budget is
   * reached (or `cancel()` is called). Yields to the event loop between slices.
   */
  async solve(opts: SolveOptions = {}): Promise<SolveResult> {
    this.requireConfigured();
    if (!this.allocated) this.allocate(false);
    if (this.finalized) throw new SolverError('The solve was finalized; configure again to re-solve');
    this.cancelRequested = false;
    const start = now();
    const checkEvery = Math.max(1, opts.checkEvery ?? 10);
    const sliceMs = opts.sliceMs ?? 40;
    let expl = NaN;
    let reason: SolveResult['reason'] | null;
    const elapsed = () => now() - start;
    const limitReached = (): SolveResult['reason'] | null => {
      if (this.cancelRequested) return 'cancelled';
      if (opts.maxIterations !== undefined && this.wasm.iteration() >= opts.maxIterations) return 'iterations';
      if (opts.timeLimitMs !== undefined && elapsed() >= opts.timeLimitMs) return 'time';
      return null;
    };
    while (!(reason = limitReached())) {
      const sliceStart = now();
      do {
        this.wasm.solve_step();
        const it = this.wasm.iteration();
        if (it % checkEvery === 0) {
          expl = this.exploitability();
          opts.onProgress?.({ iteration: it, exploitability: expl, elapsedMs: elapsed() });
          if (opts.targetExploitability !== undefined && expl <= opts.targetExploitability) {
            reason = 'target';
            break;
          }
        }
      } while (now() - sliceStart < sliceMs && !limitReached());
      if (reason) break;
      await yieldToEventLoop();
    }
    const finalReason = reason ?? 'iterations';
    if (this.wasm.iteration() % checkEvery !== 0 || Number.isNaN(expl)) {
      if (this.wasm.iteration() > 0) expl = this.exploitability();
    }
    opts.onProgress?.({ iteration: this.wasm.iteration(), exploitability: expl, elapsedMs: elapsed() });
    if (opts.finalize !== false) this.finalize();
    return {
      iteration: this.wasm.iteration(),
      exploitability: expl,
      elapsedMs: elapsed(),
      cancelled: finalReason === 'cancelled',
      reason: finalReason,
    };
  }

  /** Normalize strategies and compute EVs. After this, EVs are available and solving stops. */
  finalize(): void {
    this.requireConfigured();
    if (this.finalized) return;
    if (!this.allocated) throw new SolverError('Memory is not allocated');
    this.wasm.finalize();
    this.finalized = true;
    this.wasm.back_to_root();
  }

  history(): number[] {
    return Array.from(this.wasm.history());
  }

  backToRoot(): void {
    this.wasm.back_to_root();
  }

  applyHistory(history: number[]): void {
    this.wasm.apply_history(Uint32Array.from(history));
  }

  /** Step back one action (or card). */
  back(): void {
    const h = this.history();
    h.pop();
    this.applyHistory(h);
  }

  private nodeBase() {
    const cfg = this.requireConfigured();
    const bets = this.wasm.total_bet_amount();
    const pot = toBb(cfg.startingPotChips + (bets[0] ?? 0) + (bets[1] ?? 0));
    return { bets, pot, board: Array.from(this.wasm.current_board()), history: this.history() };
  }

  /** Describe the current node: actions and per-hand strategy (plus EV/equity once finalized). */
  getNode(): NodeView {
    if (!this.allocated) throw new SolverError('Memory is not allocated');
    const type = this.wasm.node_type();
    const base = this.nodeBase();
    if (type === 'terminal') return { type: 'terminal', pot: base.pot, board: base.board, history: base.history };
    if (type === 'chance') {
      return {
        type: 'chance',
        street: base.board.length === 3 ? 'turn' : 'river',
        possibleCards: Array.from(this.wasm.possible_cards()),
        pot: base.pot,
        board: base.board,
        history: base.history,
      };
    }
    return this.getNodeStrategy();
  }

  /** Strategy at the current decision node. Throws at chance/terminal nodes. */
  getNodeStrategy(): ActionNode {
    if (!this.allocated) throw new SolverError('Memory is not allocated');
    const type = this.wasm.node_type();
    if (type !== 'oop' && type !== 'ip') throw new SolverError(`The current node is a ${type} node`);
    const player = type;
    const pi = player === 'oop' ? 0 : 1;
    const base = this.nodeBase();
    const actions = this.wasm
      .actions()
      .split('/')
      .filter(Boolean)
      .map((c, i) => parseActionCode(c, i));
    const cards = Array.from(this.wasm.private_cards(pi));
    const n = cards.length;
    const strat = this.wasm.strategy();
    this.wasm.cache_normalized_weights();
    const weights = this.wasm.weights(pi);
    const normalized = this.wasm.normalized_weights(pi);
    const equity = this.wasm.equity(pi);
    const ev = this.finalized ? this.wasm.expected_values(pi) : null;
    const evDetail = this.finalized ? this.wasm.expected_values_detail(pi) : null;
    const hands: HandRow[] = [];
    const rangeFreqs = new Array<number>(actions.length).fill(0);
    let wSum = 0;
    let evSum = 0;
    let eqSum = 0;
    for (let h = 0; h < n; h++) {
      const packed = cards[h]!;
      const c1 = packed & 0xff;
      const c2 = packed >> 8;
      const strategy = actions.map((_, a) => strat[a * n + h] ?? 0);
      const row: HandRow = {
        combo: comboString(c1, c2),
        cards: [Math.max(c1, c2), Math.min(c1, c2)],
        handClass: handLabelOf(c1, c2),
        weight: weights[h] ?? 0,
        strategy,
        equity: equity[h],
      };
      if (ev && evDetail) {
        row.ev = toBb(ev[h] ?? 0);
        row.actionEv = actions.map((_, a) => toBb(evDetail[a * n + h] ?? 0));
      }
      hands.push(row);
      const nw = normalized[h] ?? 0;
      if (nw > 0) {
        wSum += nw;
        strategy.forEach((f, a) => (rangeFreqs[a]! += f * nw));
        if (row.ev !== undefined) evSum += row.ev * nw;
        eqSum += (row.equity ?? 0) * nw;
      }
    }
    if (wSum > 0) for (let a = 0; a < rangeFreqs.length; a++) rangeFreqs[a]! /= wSum;
    const myBet = base.bets[pi] ?? 0;
    const theirBet = base.bets[1 - pi] ?? 0;
    return {
      type: 'action',
      player,
      actions,
      hands,
      rangeFreqs,
      rangeEv: this.finalized && wSum > 0 ? evSum / wSum : undefined,
      rangeEquity: wSum > 0 ? eqSum / wSum : undefined,
      pot: base.pot,
      toCall: toBb(Math.max(0, theirBet - myBet)),
      board: base.board,
      history: base.history,
      solved: this.finalized,
    };
  }

  /** Strategy/EV/equity for a hand class ("AKs") or a specific combo ("AsKs") at the current node. */
  getHandEV(hand: string): HandEV {
    const node = this.getNodeStrategy();
    let rows: HandRow[];
    if (isHandLabel(hand)) rows = node.hands.filter((r) => r.handClass === hand);
    else {
      const a = parseCard(hand.slice(0, 2));
      const b = parseCard(hand.slice(2, 4));
      if (a === null || b === null || hand.length !== 4) throw new SolverError(`Invalid hand "${hand}"`);
      const key = comboString(a, b);
      rows = node.hands.filter((r) => r.combo === key);
    }
    const weight = rows.reduce((s, r) => s + r.weight, 0);
    const avg = (f: (r: HandRow) => number | undefined) => {
      if (weight <= 0) return rows.length ? rows.reduce((s, r) => s + (f(r) ?? 0), 0) / rows.length : undefined;
      return rows.reduce((s, r) => s + (f(r) ?? 0) * r.weight, 0) / weight;
    };
    return {
      hand,
      combos: rows,
      strategy: node.actions.map((_, i) => avg((r) => r.strategy[i]) ?? 0),
      ev: node.solved ? avg((r) => r.ev) : undefined,
      equity: avg((r) => r.equity),
      weight,
    };
  }

  /** Take an action at the current decision node, by index, code ("X", "B250") or label/kind ("Check", "bet"). */
  play(action: number | string): void {
    const node = this.getNodeStrategy();
    let idx: number;
    if (typeof action === 'number') idx = action;
    else {
      const a = action.trim().toLowerCase();
      idx = node.actions.findIndex((x) => x.code.toLowerCase() === a || x.label.toLowerCase() === a);
      if (idx < 0) idx = node.actions.findIndex((x) => x.kind === a);
    }
    if (!Number.isInteger(idx) || idx < 0 || idx >= node.actions.length) throw new SolverError(`Invalid action ${String(action)}`);
    this.wasm.play(idx);
  }

  /** Deal the turn or river card at a chance node. */
  dealCard(card: CardId | string): void {
    if (this.wasm.node_type() !== 'chance') throw new SolverError('The current node is not a chance node');
    const id = typeof card === 'number' ? card : parseCard(card);
    if (id === null) throw new SolverError(`Invalid card ${String(card)}`);
    const possible = Array.from(this.wasm.possible_cards());
    if (!possible.includes(id)) throw new SolverError(`${cardToString(id)} cannot be dealt here`);
    this.wasm.play(id);
  }

  dispose(): void {
    this.wasm.free();
  }
}

export { COMBO_CARDS };
