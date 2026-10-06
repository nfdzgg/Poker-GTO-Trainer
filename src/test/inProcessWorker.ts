import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { WorkerLike } from '../solver/client';
import type { WorkerRequest, WorkerResponse } from '../solver/protocol';
import { createWorkerHandler } from '../solver/workerCore';

export const WASM_BYTES = readFileSync(path.resolve(__dirname, '../../solver-wasm/pkg/solver_bg.wasm'));

/** A WorkerLike that runs the real worker code (and the real WASM) asynchronously in-process. */
export class InProcessWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null = null;
  posted: WorkerRequest[] = [];
  received: WorkerResponse[] = [];
  terminated = false;
  private handle = createWorkerHandler((m) => {
    this.received.push(m);
    setTimeout(() => this.onmessage?.({ data: m } as MessageEvent<WorkerResponse>), 0);
  }, WASM_BYTES);

  postMessage(msg: WorkerRequest): void {
    this.posted.push(msg);
    setTimeout(() => void this.handle(msg), 0);
  }

  terminate(): void {
    this.terminated = true;
  }
}
