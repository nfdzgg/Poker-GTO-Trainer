/// <reference lib="webworker" />
// Web Worker entry: runs the solver off the main thread.
import type { WorkerRequest } from './protocol';
import { createWorkerHandler } from './workerCore';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const handle = createWorkerHandler((msg) => ctx.postMessage(msg));
ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  void handle(e.data);
};
