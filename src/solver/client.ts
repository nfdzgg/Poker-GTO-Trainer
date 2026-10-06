// Main-thread client for the solver Web Worker.
import type { WorkerRequest, WorkerResponse, WorkerSolveOptions } from './protocol';
import type { MemoryEstimate, NodeView, SolveProgress, SolveResult, SolverConfig } from './types';

export interface WorkerLike {
  postMessage(msg: WorkerRequest): void;
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null;
  terminate(): void;
}

export function createSolverWorker(): WorkerLike {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'postflop-solver' }) as unknown as WorkerLike;
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: (p: SolveProgress) => void };

export class SolverClient {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private worker: WorkerLike;

  constructor(worker: WorkerLike = createSolverWorker()) {
    this.worker = worker;
    this.worker.onmessage = (e) => this.onMessage(e.data);
  }

  private onMessage(msg: WorkerResponse) {
    const p = this.pending.get(msg.id);
    if (!p) return;
    switch (msg.type) {
      case 'progress':
        p.onProgress?.(msg.progress);
        return;
      case 'error':
        this.pending.delete(msg.id);
        p.reject(new Error(msg.message));
        return;
      case 'estimate':
        this.pending.delete(msg.id);
        p.resolve(msg.memory);
        return;
      case 'solved':
        this.pending.delete(msg.id);
        p.resolve(msg.result);
        return;
      case 'view':
        this.pending.delete(msg.id);
        p.resolve(msg.view);
        return;
    }
  }

  private request<T>(build: (id: number) => WorkerRequest, onProgress?: (p: SolveProgress) => void): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
      this.worker.postMessage(build(id));
    });
  }

  estimate(config: SolverConfig): Promise<MemoryEstimate> {
    return this.request((id) => ({ type: 'estimate', id, config }));
  }

  solve(config: SolverConfig, options: WorkerSolveOptions, onProgress?: (p: SolveProgress) => void): Promise<SolveResult> {
    return this.request((id) => ({ type: 'solve', id, config, options }), onProgress);
  }

  view(history: number[]): Promise<NodeView> {
    return this.request((id) => ({ type: 'view', id, history }));
  }

  cancel(): void {
    this.worker.postMessage({ type: 'cancel' });
  }

  terminate(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Error('Solver stopped'));
    this.pending.clear();
  }
}
