// Loads the single-threaded postflop-solver WebAssembly module.
import init, { Solver as WasmSolver, upstream_commit } from '../../solver-wasm/pkg/solver.js';

export type WasmSource = BufferSource | WebAssembly.Module | URL | string;

let ready: Promise<void> | null = null;

/**
 * Initialise the WASM module once. In the browser/worker the default fetches
 * `solver_bg.wasm` next to the glue (Vite emits it as a lazy asset); in Node,
 * pass the file's bytes.
 */
export function initSolverWasm(source?: WasmSource): Promise<void> {
  ready ??= (source ? init({ module_or_path: source }) : init()).then(() => undefined);
  return ready;
}

export function upstreamCommit(): string {
  return upstream_commit();
}

export { WasmSolver };
