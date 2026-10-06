// Message handling for the solver worker, independent of the worker global so it can be unit-tested.
import { PostflopSolver } from './engine';
import type { WorkerRequest, WorkerResponse } from './protocol';
import type { WasmSource } from './wasm';

export function createWorkerHandler(post: (msg: WorkerResponse) => void, wasmSource?: WasmSource) {
  let solverPromise: Promise<PostflopSolver> | null = null;
  const getSolver = () => (solverPromise ??= PostflopSolver.create(wasmSource));
  let active: PostflopSolver | null = null;

  return async function handle(msg: WorkerRequest): Promise<void> {
    if (msg.type === 'cancel') {
      active?.cancel();
      return;
    }
    const id = msg.id;
    try {
      const solver = await getSolver();
      if (msg.type === 'estimate') {
        solver.configure(msg.config);
        post({ type: 'estimate', id, memory: solver.estimateMemory() });
      } else if (msg.type === 'solve') {
        solver.configure(msg.config);
        solver.allocate(msg.options.compression);
        active = solver;
        const result = await solver.solve({
          targetExploitability: msg.options.targetExploitability,
          maxIterations: msg.options.maxIterations,
          timeLimitMs: msg.options.timeLimitMs,
          checkEvery: 5,
          sliceMs: 30,
          onProgress: (progress) => post({ type: 'progress', id, progress }),
        });
        active = null;
        post({ type: 'solved', id, result });
      } else if (msg.type === 'view') {
        solver.applyHistory(msg.history);
        post({ type: 'view', id, view: solver.getNode() });
      }
    } catch (e) {
      active = null;
      post({ type: 'error', id, message: e instanceof Error ? e.message : String(e) });
    }
  };
}
