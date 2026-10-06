import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FORM,
  EXAMPLES,
  isPhoneViewport,
  loadForm,
  memoryPlan,
  saveForm,
  toSolverConfig,
  validateForm,
  type AnalyzerForm,
} from '../analyzer/form';
import { BoardPicker } from '../components/analyzer/BoardPicker';
import { PostflopDrill } from '../components/analyzer/PostflopDrill';
import { RangeEditor } from '../components/analyzer/RangeEditor';
import { ResultsView } from '../components/analyzer/ResultsView';
import { SizesEditor } from '../components/analyzer/SizesEditor';
import { SolveProgressBar, type SolveStatus } from '../components/analyzer/SolveProgress';
import { parseBoard } from '../lib/poker/cards';
import { POSITIONS, type Position } from '../lib/preflop/types';
import { SolverClient } from '../solver/client';
import type { WorkerSolveOptions } from '../solver/protocol';
import type { MemoryEstimate, NodeView, SolveProgress, SolveResult, SolverConfig } from '../solver/types';

export interface SolverClientLike {
  estimate(config: SolverConfig): Promise<MemoryEstimate>;
  solve(config: SolverConfig, options: WorkerSolveOptions, onProgress?: (p: SolveProgress) => void): Promise<SolveResult>;
  view(history: number[]): Promise<NodeView>;
  cancel(): void;
  terminate(): void;
}

interface Props {
  /** Creates the worker-backed solver client (overridable in tests). */
  clientFactory?: () => SolverClientLike;
}

type Estimate = { status: 'idle' | 'pending' } | { status: 'ready'; memory: MemoryEstimate } | { status: 'error'; message: string };

export default function AnalyzerScreen({ clientFactory = () => new SolverClient() }: Props) {
  const [form, setFormState] = useState<AnalyzerForm>(() => loadForm() ?? DEFAULT_FORM);
  const [estimate, setEstimate] = useState<Estimate>({ status: 'idle' });
  const [status, setStatus] = useState<SolveStatus>('idle');
  const [progress, setProgress] = useState<SolveProgress | null>(null);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [solvedSeats, setSolvedSeats] = useState<{ oop: string; ip: string; key: number } | null>(null);
  const [drilling, setDrilling] = useState(false);
  const clientRef = useRef<SolverClientLike | null>(null);
  const factoryRef = useRef(clientFactory);
  const getClient = useCallback(() => (clientRef.current ??= factoryRef.current()), []);

  useEffect(() => () => clientRef.current?.terminate(), []);

  const setForm = (patch: Partial<AnalyzerForm>) => {
    setFormState((f) => ({ ...f, ...patch, name: patch.name ?? 'Custom spot' }));
    if (status !== 'solving') {
      setSolvedSeats(null);
      setDrilling(false);
      setStatus('idle');
      setProgress(null);
    }
  };

  useEffect(() => saveForm(form), [form]);

  const errors = useMemo(() => validateForm(form), [form]);
  const config = useMemo(() => (errors.length === 0 ? toSolverConfig(form) : null), [form, errors]);
  const configKey = config ? JSON.stringify(config, (_k, v) => (v instanceof Map ? [...v] : v)) : '';

  // Estimate memory (in the worker) whenever the configuration changes.
  useEffect(() => {
    if (!config) {
      setEstimate({ status: 'idle' });
      return;
    }
    let alive = true;
    setEstimate({ status: 'pending' });
    const t = setTimeout(() => {
      getClient()
        .estimate(config)
        .then((memory) => alive && setEstimate({ status: 'ready', memory }))
        .catch((e: Error) => alive && setEstimate({ status: 'error', message: e.message }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, getClient]);

  const phone = isPhoneViewport();
  const plan = estimate.status === 'ready' ? memoryPlan(estimate.memory, phone) : null;
  const canSolve = !!config && !!plan?.ok && status !== 'solving';

  const solve = () => {
    if (!config || !plan?.ok) return;
    setStatus('solving');
    setProgress({ iteration: 0, exploitability: NaN, elapsedMs: 0 });
    setSolveError(null);
    setSolvedSeats(null);
    setDrilling(false);
    getClient()
      .solve(config, { targetExploitability: form.target, maxIterations: form.maxIterations, compression: plan.compression }, setProgress)
      .then((res) => {
        setProgress(res);
        setStatus(res.cancelled ? 'cancelled' : 'solved');
        setSolvedSeats({ oop: form.oopSeat, ip: form.ipSeat, key: Date.now() });
      })
      .catch((e: Error) => {
        setStatus('error');
        setSolveError(e.message);
      });
  };

  const board = parseBoard(form.board) ?? [];
  const street = board.length >= 5 ? 'River' : board.length === 4 ? 'Turn' : 'Flop';
  const source = useMemo(() => ({ view: (h: number[]) => getClient().view(h) }), [getClient]);
  const onNode = useCallback((_v: NodeView, _h: number[]) => {}, []);

  return (
    <section className="analyzer" aria-labelledby="analyzer-title">
      <div className="screen-head">
        <div>
          <h1 id="analyzer-title">Postflop Analyzer</h1>
          <p className="muted small">
            Heads-up spots solved in your browser by postflop-solver (single-threaded WebAssembly in a Web Worker). Amounts in big blinds.
          </p>
        </div>
      </div>

      <div className="examples panel" role="group" aria-label="Built-in examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="btn example-btn"
            title={ex.description}
            onClick={() => setForm({ ...ex.form })}
            disabled={status === 'solving'}
            data-testid={`example-${ex.id}`}
          >
            {ex.label}
          </button>
        ))}
        <p className="muted small example-name" data-testid="spot-name">
          {form.name}
        </p>
      </div>

      <div className="analyzer-layout">
        <form className="builder panel" onSubmit={(e) => e.preventDefault()} aria-label="Spot builder">
          <fieldset className="builder-fields" disabled={status === 'solving'}>
            <div className="seats-row">
              <label className="field">
                Out of position
                <select value={form.oopSeat} onChange={(e) => setForm({ oopSeat: e.target.value as Position })} data-testid="oop-seat">
                  {POSITIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                In position
                <select value={form.ipSeat} onChange={(e) => setForm({ ipSeat: e.target.value as Position })} data-testid="ip-seat">
                  {POSITIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Pot (bb)
                <input type="number" min={0} step={0.5} value={form.pot} onChange={(e) => setForm({ pot: Number(e.target.value) })} data-testid="pot" />
              </label>
              <label className="field">
                Effective stack (bb)
                <input type="number" min={0} step={0.5} value={form.stack} onChange={(e) => setForm({ stack: Number(e.target.value) })} data-testid="stack" />
              </label>
            </div>
            <RangeEditor label={`${form.oopSeat} range (out of position)`} value={form.oopRange} onChange={(v) => setForm({ oopRange: v })} testId="oop-range" />
            <RangeEditor label={`${form.ipSeat} range (in position)`} value={form.ipRange} onChange={(v) => setForm({ ipRange: v })} testId="ip-range" />
            <BoardPicker value={form.board} onChange={(v) => setForm({ board: v })} />
            <SizesEditor
              sizes={form.sizes}
              allIn={form.allIn}
              boardLength={Math.max(3, board.length)}
              oopSeat={form.oopSeat}
              ipSeat={form.ipSeat}
              onChange={(sizes) => setForm({ sizes })}
              onAllIn={(allIn) => setForm({ allIn })}
            />
            <div className="seats-row">
              <label className="field">
                Target exploitability (% of pot)
                <input type="number" min={0.05} step={0.05} value={form.target} onChange={(e) => setForm({ target: Number(e.target.value) })} data-testid="target" />
              </label>
              <label className="field">
                Max iterations
                <input type="number" min={1} step={50} value={form.maxIterations} onChange={(e) => setForm({ maxIterations: Number(e.target.value) })} data-testid="max-iterations" />
              </label>
            </div>
          </fieldset>

          {errors.length > 0 && (
            <ul className="validation" role="alert" data-testid="validation">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <div className="solve-box">
            <p className={`memory${plan && !plan.ok ? ' error-text' : ''}`} data-testid="memory-estimate">
              {errors.length > 0
                ? 'Fix the problems above to estimate memory.'
                : estimate.status === 'pending' || estimate.status === 'idle'
                  ? 'Estimating memory…'
                  : estimate.status === 'error'
                    ? `Cannot build this tree: ${estimate.message}. Reduce the number of bet and raise sizes or narrow the ranges.`
                    : plan!.message}
            </p>
            <button type="button" className="btn btn-primary solve-btn" onClick={solve} disabled={!canSolve} data-testid="solve">
              {status === 'solving' ? 'Solving…' : 'Solve'}
            </button>
            {status !== 'idle' && (
              <SolveProgressBar status={status} progress={progress} target={form.target} maxIterations={form.maxIterations} onCancel={() => getClient().cancel()} />
            )}
            {solveError && <p className="error-text">{solveError}</p>}
            {status === 'cancelled' && <p className="small muted">Cancelled early: the results below are from a partial solve and are approximate.</p>}
          </div>
        </form>

        {solvedSeats && drilling ? (
          <PostflopDrill source={source} seats={solvedSeats} spotName={form.name} onClose={() => setDrilling(false)} />
        ) : solvedSeats ? (
          <div className="results-col">
            <div className="drill-cta panel">
              <p className="small muted">Practice this solution: random hands at random decisions of the solved tree, graded with EV loss.</p>
              <button type="button" className="btn btn-primary" onClick={() => setDrilling(true)} data-testid="drill-spot">
                Drill this spot
              </button>
            </div>
            <ResultsView key={solvedSeats.key} source={source} seats={solvedSeats} rootLabel={`${street} root`} onNode={onNode} />
          </div>
        ) : (
          <div className="results panel results-empty">
            <h2>Results</h2>
            <p className="muted">Load an example or build a spot, then press Solve. Results appear here with the strategy grid and tree navigation.</p>
          </div>
        )}
      </div>
    </section>
  );
}
