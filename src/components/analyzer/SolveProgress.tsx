import type { SolveProgress as Progress } from '../../solver/types';

export type SolveStatus = 'idle' | 'solving' | 'solved' | 'cancelled' | 'error';

interface Props {
  status: SolveStatus;
  progress: Progress | null;
  target: number;
  maxIterations: number;
  onCancel: () => void;
}

/** Fraction done: the larger of iteration progress and exploitability progress (log scale). */
export function progressFraction(p: Progress | null, target: number, maxIterations: number): number {
  if (!p) return 0;
  const it = Math.min(1, p.iteration / Math.max(1, maxIterations));
  let ex = 0;
  if (Number.isFinite(p.exploitability) && p.exploitability > 0) {
    const start = 100; // ~100% of pot at the first iterations
    ex = p.exploitability <= target ? 1 : Math.max(0, Math.log(start / p.exploitability) / Math.log(start / target));
  }
  return Math.max(0, Math.min(1, Math.max(it, ex)));
}

export function SolveProgressBar({ status, progress, target, maxIterations, onCancel }: Props) {
  const frac = status === 'solved' ? 1 : progressFraction(progress, target, maxIterations);
  const pct = Math.round(frac * 100);
  const expl = progress && Number.isFinite(progress.exploitability) ? `${progress.exploitability.toFixed(2)}%` : '—';
  const label = status === 'solving' ? 'Solving…' : status === 'solved' ? 'Solved' : status === 'cancelled' ? 'Cancelled' : status === 'error' ? 'Error' : '';
  return (
    <div className="solve-progress" data-testid="solve-progress" data-status={status}>
      <div className="solve-progress-head">
        <strong>{label}</strong>
        {status === 'solving' && (
          <button type="button" className="btn btn-danger" onClick={onCancel} data-testid="cancel-solve">
            Cancel
          </button>
        )}
      </div>
      <div className="progress-track" role="progressbar" aria-label="Solve progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-fill" style={{ transform: `scaleX(${frac})` }} />
      </div>
      <dl className="solve-stats">
        <div>
          <dt>Iterations</dt>
          <dd data-testid="solve-iterations">{progress?.iteration ?? 0}</dd>
        </div>
        <div>
          <dt>Exploitability</dt>
          <dd data-testid="solve-exploitability">{expl} of pot</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd data-testid="solve-elapsed">{((progress?.elapsedMs ?? 0) / 1000).toFixed(1)} s</dd>
        </div>
      </dl>
    </div>
  );
}
