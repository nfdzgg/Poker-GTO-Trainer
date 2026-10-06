import type { MemoryEstimate, NodeView, SolveProgress, SolveResult, SolverConfig } from './types';

export interface WorkerSolveOptions {
  targetExploitability: number; // % of pot
  maxIterations: number;
  timeLimitMs?: number;
  compression: boolean;
}

export type WorkerRequest =
  | { type: 'estimate'; id: number; config: SolverConfig }
  | { type: 'solve'; id: number; config: SolverConfig; options: WorkerSolveOptions }
  | { type: 'cancel' }
  | { type: 'view'; id: number; history: number[] };

export type WorkerResponse =
  | { type: 'estimate'; id: number; memory: MemoryEstimate }
  | { type: 'progress'; id: number; progress: SolveProgress }
  | { type: 'solved'; id: number; result: SolveResult }
  | { type: 'view'; id: number; view: NodeView }
  | { type: 'error'; id: number; message: string };
