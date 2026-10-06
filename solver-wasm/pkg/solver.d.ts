/* tslint:disable */
/* eslint-disable */

export class Solver {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Actions at the current node, '/'-separated: F, X, C, B<amt>, R<amt>, A<amt>.
     */
    actions(): string;
    allocate(enable_compression: boolean): void;
    apply_history(history: Uint32Array): void;
    back_to_root(): void;
    cache_normalized_weights(): void;
    /**
     * Configure a game. Ranges are 1326-length weight arrays (postflop-solver
     * card-pair order). Bet strings use postflop-solver syntax, e.g. "33%, a".
     * Returns an error message, or undefined on success.
     */
    configure(oop_range: Float32Array, ip_range: Float32Array, board: Uint8Array, starting_pot: number, effective_stack: number, oop_flop_bet: string, oop_flop_raise: string, ip_flop_bet: string, ip_flop_raise: string, oop_turn_bet: string, oop_turn_raise: string, ip_turn_bet: string, ip_turn_raise: string, oop_river_bet: string, oop_river_raise: string, ip_river_bet: string, ip_river_raise: string, add_allin_threshold: number, force_allin_threshold: number, merging_threshold: number): string | undefined;
    current_board(): Uint8Array;
    effective_stack(): number;
    /**
     * Equity of each hand (call cache_normalized_weights first).
     */
    equity(player: number): Float32Array;
    /**
     * EV of each hand in chips (requires finalize + cache_normalized_weights).
     */
    expected_values(player: number): Float32Array;
    /**
     * EV of each action for each hand of the current player: #actions × #hands.
     */
    expected_values_detail(player: number): Float32Array;
    /**
     * Exploitability in chips (same unit as the pot).
     */
    exploitability(): number;
    /**
     * Normalize the strategy and compute EVs. Required before reading EVs.
     */
    finalize(): void;
    history(): Uint32Array;
    iteration(): number;
    /**
     * Estimated memory in bytes: [uncompressed, compressed].
     */
    memory_usage(): Float64Array;
    constructor();
    /**
     * "oop", "ip", "chance" or "terminal".
     */
    node_type(): string;
    /**
     * Weights normalized for card removal (call cache_normalized_weights first).
     */
    normalized_weights(player: number): Float32Array;
    play(action: number): void;
    /**
     * Cards that can be dealt at the current chance node.
     */
    possible_cards(): Uint8Array;
    /**
     * Private hands of a player as (c1 | c2 << 8).
     */
    private_cards(player: number): Uint16Array;
    /**
     * Run one Discounted-CFR iteration.
     */
    solve_step(): void;
    starting_pot(): number;
    /**
     * Strategy of the current player: #actions × #hands (action-major).
     */
    strategy(): Float32Array;
    /**
     * [oop, ip] total chips committed so far in the hand beyond the starting pot.
     */
    total_bet_amount(): Int32Array;
    /**
     * Range weights of a player at the current node (reach probabilities × initial weights).
     */
    weights(player: number): Float32Array;
}

export function upstream_commit(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_solver_free: (a: number, b: number) => void;
    readonly solver_actions: (a: number) => [number, number];
    readonly solver_allocate: (a: number, b: number) => void;
    readonly solver_apply_history: (a: number, b: number, c: number) => void;
    readonly solver_back_to_root: (a: number) => void;
    readonly solver_cache_normalized_weights: (a: number) => void;
    readonly solver_configure: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number, x: number, y: number, z: number, a1: number, b1: number, c1: number, d1: number, e1: number, f1: number, g1: number, h1: number, i1: number, j1: number) => [number, number];
    readonly solver_current_board: (a: number) => [number, number];
    readonly solver_effective_stack: (a: number) => number;
    readonly solver_equity: (a: number, b: number) => [number, number];
    readonly solver_expected_values: (a: number, b: number) => [number, number];
    readonly solver_expected_values_detail: (a: number, b: number) => [number, number];
    readonly solver_exploitability: (a: number) => number;
    readonly solver_finalize: (a: number) => void;
    readonly solver_history: (a: number) => [number, number];
    readonly solver_iteration: (a: number) => number;
    readonly solver_memory_usage: (a: number) => [number, number];
    readonly solver_new: () => number;
    readonly solver_node_type: (a: number) => [number, number];
    readonly solver_normalized_weights: (a: number, b: number) => [number, number];
    readonly solver_play: (a: number, b: number) => void;
    readonly solver_possible_cards: (a: number) => [number, number];
    readonly solver_private_cards: (a: number, b: number) => [number, number];
    readonly solver_solve_step: (a: number) => void;
    readonly solver_starting_pot: (a: number) => number;
    readonly solver_strategy: (a: number) => [number, number];
    readonly solver_total_bet_amount: (a: number) => [number, number];
    readonly solver_weights: (a: number, b: number) => [number, number];
    readonly upstream_commit: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
