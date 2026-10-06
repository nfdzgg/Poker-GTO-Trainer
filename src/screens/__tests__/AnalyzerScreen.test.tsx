import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYZER_KEY, EXAMPLES } from '../../analyzer/form';
import { RANGE_PRESETS } from '../../components/analyzer/RangeEditor';
import { createSolverWorker, SolverClient } from '../../solver/client';
import { InProcessWorker } from '../../test/inProcessWorker';
import AnalyzerScreen from '../AnalyzerScreen';

let workers: InProcessWorker[] = [];
function setup() {
  workers = [];
  const factory = () => {
    const w = new InProcessWorker();
    workers.push(w);
    return new SolverClient(w);
  };
  return render(<AnalyzerScreen clientFactory={factory} />);
}
const memory = () => screen.getByTestId('memory-estimate');
const solveBtn = () => screen.getByTestId('solve') as HTMLButtonElement;
const setValue = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });

async function solveExample(id: 'flop' | 'turn' | 'river') {
  fireEvent.click(screen.getByTestId(`example-${id}`));
  await waitFor(() => expect(memory().textContent).toMatch(/Estimated memory/), { timeout: 10000 });
  fireEvent.click(solveBtn());
  await screen.findByTestId('results', {}, { timeout: 30000 });
  await screen.findByTestId('node-player', {}, { timeout: 30000 });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Postflop analyzer', () => {
  it('P2-UI-01 spot builder has seats, stack, pot, two ranges, board picker and sizes', async () => {
    setup();
    expect(screen.getByTestId('oop-seat')).toBeInTheDocument();
    expect(screen.getByTestId('ip-seat')).toBeInTheDocument();
    setValue('oop-seat', 'SB');
    expect(screen.getByText(/SB range \(out of position\)/)).toBeInTheDocument();
    setValue('stack', '60');
    setValue('pot', '12');
    expect((screen.getByTestId('stack') as HTMLInputElement).value).toBe('60');
    // range text
    setValue('oop-range-text', 'QQ+,AKs,A5s:0.5');
    expect(screen.getByTestId('oop-range-info').textContent).toMatch(/24\.0 combos/);
    // grid with weight slider
    fireEvent.click(screen.getByTestId('oop-range-grid-toggle'));
    setValue('oop-range-weight', '50');
    const grid = within(screen.getByTestId('oop-range')).getByTestId('range-grid');
    fireEvent.click(grid.querySelector('[data-hand="JJ"]')!);
    expect((screen.getByTestId('oop-range-text') as HTMLTextAreaElement).value).toBe('QQ+,JJ:0.5,AKs,A5s:0.5');
    fireEvent.click(grid.querySelector('[data-hand="JJ"]')!); // same weight again removes it
    expect((screen.getByTestId('oop-range-text') as HTMLTextAreaElement).value).toBe('QQ+,AKs,A5s:0.5');
    // presets imported from any Phase 1 spot
    expect(RANGE_PRESETS.length).toBeGreaterThanOrEqual(35 + 30);
    const preset = RANGE_PRESETS.find((p) => p.id === 'rfi-CO:raise')!;
    setValue('ip-range-preset', preset.id);
    expect((screen.getByTestId('ip-range-text') as HTMLTextAreaElement).value).toBe(preset.text);
    // board picker: click to add, click to remove, no duplicates, max 5
    setValue('board-text', '');
    const picker = screen.getByTestId('board-picker');
    for (const c of ['As', 'Kd', '7h']) fireEvent.click(within(picker).getByRole('button', { name: c }));
    expect((screen.getByTestId('board-text') as HTMLInputElement).value).toBe('AsKd7h');
    fireEvent.click(within(picker).getByRole('button', { name: 'Kd' }));
    expect((screen.getByTestId('board-text') as HTMLInputElement).value).toBe('As7h');
    for (const c of ['Kd', '2c', '3c']) fireEvent.click(within(picker).getByRole('button', { name: c }));
    expect(within(picker).getByRole('button', { name: 'Qs' })).toBeDisabled(); // 5 cards chosen
    expect(within(picker).getByRole('button', { name: 'As' })).toHaveAttribute('aria-pressed', 'true');
    // sizes per street and player, all-in option
    setValue('board-text', 'AsKd7h');
    for (const st of ['flop', 'turn', 'river']) for (const p of ['oop', 'ip']) for (const k of ['bet', 'raise']) expect(screen.getByTestId(`size-${st}-${p}-${k}`)).toBeInTheDocument();
    setValue('size-flop-oop-bet', '33, 75');
    expect((screen.getByTestId('size-flop-oop-bet') as HTMLInputElement).value).toBe('33, 75');
    expect(screen.getByTestId('allin-toggle')).toBeInTheDocument();
  });

  it('P2-UI-02 invalid inputs are blocked with clear messages', async () => {
    setup();
    await waitFor(() => expect(memory().textContent).toMatch(/Estimated memory/), { timeout: 10000 });
    expect(solveBtn()).not.toBeDisabled();
    setValue('board-text', 'QsQs7h');
    expect(screen.getByTestId('validation').textContent).toMatch(/Duplicate board card: Qs/);
    expect(solveBtn()).toBeDisabled();
    setValue('board-text', 'Qs7h2d4c9s');
    setValue('oop-range-text', '');
    expect(screen.getByTestId('validation').textContent).toMatch(/range is empty/);
    expect(solveBtn()).toBeDisabled();
    setValue('oop-range-text', 'AA');
    setValue('stack', '0');
    expect(screen.getByTestId('validation').textContent).toMatch(/effective stack must be greater than 0/);
    setValue('stack', '50');
    fireEvent.click(screen.getByTestId('allin-toggle'));
    setValue('size-river-oop-bet', '');
    expect(screen.getByTestId('validation').textContent).toMatch(/Add at least one river bet size for the out-of-position player/);
    expect(solveBtn()).toBeDisabled();
    expect(memory().textContent).toMatch(/Fix the problems above/);
    setValue('size-river-oop-bet', '50');
    expect(screen.queryByTestId('validation')).toBeNull();
  });

  it('P2-UI-03 shows the estimated memory before solving and blocks solves above the safe limit', async () => {
    setup();
    await waitFor(() => expect(memory().textContent).toMatch(/^Estimated memory: [\d.]+ MB$/), { timeout: 10000 });
    expect(solveBtn()).not.toBeDisabled();
    // BTN vs BB single-raised flop with pot-sized raises needs several GB even compressed.
    fireEvent.click(screen.getByTestId('example-turn'));
    setValue('board-text', 'Qs7h2d');
    setValue('size-flop-oop-bet', '33');
    setValue('size-flop-ip-bet', '33');
    for (const st of ['flop', 'turn', 'river']) for (const p of ['oop', 'ip']) setValue(`size-${st}-${p}-raise`, '100');
    await waitFor(() => expect(memory().textContent).toMatch(/Too large to solve here/), { timeout: 30000 });
    expect(memory().textContent).toMatch(/Reduce the number of bet and raise sizes.*narrow the ranges/);
    expect(solveBtn()).toBeDisabled();
  });

  it('P2-UI-03 the phone limit (600 MB) is stricter than desktop', async () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) => ({ matches: q.includes('max-width: 599px'), media: q, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    );
    setup();
    fireEvent.click(screen.getByTestId('example-flop')); // ~612 MB uncompressed: fits on a phone only with compression
    await waitFor(() => expect(memory().textContent).toMatch(/Estimated memory: \d+ MB with compression/), { timeout: 15000 });
    expect(solveBtn()).not.toBeDisabled();
    // Full BTN-open vs BB-flat ranges on the flop: allowed on desktop, too big for a phone.
    fireEvent.click(screen.getByTestId('example-turn'));
    setValue('board-text', 'Qs7h2d');
    setValue('size-flop-oop-bet', '33');
    setValue('size-flop-ip-bet', '33');
    await waitFor(() => expect(memory().textContent).toMatch(/600 MB safe limit for phones/), { timeout: 15000 });
    const needed = Number(/needs ([\d,]+) MB/.exec(memory().textContent!)![1]!.replace(/,/g, ''));
    expect(needed).toBeGreaterThan(600);
    expect(needed).toBeLessThan(1500); // would be allowed on desktop
    expect(solveBtn()).toBeDisabled();
    mm.mockRestore();
  });

  it('P2-UI-04 solving runs in a Web Worker with progress (iterations, exploitability, time) and a working cancel', async () => {
    // The production client starts a module worker from worker.ts.
    const ctor = vi.fn();
    class FakeWorker {
      onmessage = null;
      constructor(url: URL, opts: WorkerOptions) {
        ctor(url, opts);
      }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal('Worker', FakeWorker);
    createSolverWorker();
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(String(ctor.mock.calls[0]![0])).toMatch(/worker\.ts/);
    expect(ctor.mock.calls[0]![1]).toMatchObject({ type: 'module' });
    vi.unstubAllGlobals();

    setup();
    fireEvent.click(screen.getByTestId('example-turn'));
    setValue('target', '0.05');
    setValue('max-iterations', '100000');
    await waitFor(() => expect(memory().textContent).toMatch(/Estimated memory/), { timeout: 10000 });
    fireEvent.click(solveBtn());
    const prog = await screen.findByTestId('solve-progress');
    expect(prog.dataset.status).toBe('solving');
    expect(within(prog).getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => expect(Number(screen.getByTestId('solve-iterations').textContent)).toBeGreaterThanOrEqual(5), { timeout: 20000 });
    expect(screen.getByTestId('solve-exploitability').textContent).toMatch(/^\d+\.\d\d% of pot$/);
    expect(screen.getByTestId('solve-elapsed').textContent).toMatch(/^\d+\.\d s$/);
    // (main-thread responsiveness with a real Worker is proven in the Playwright test tagged P2-UI-04)
    expect(workers[0]!.posted.some((m) => m.type === 'solve')).toBe(true);
    fireEvent.click(screen.getByTestId('cancel-solve'));
    expect(workers[0]!.posted.some((m) => m.type === 'cancel')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('solve-progress').dataset.status).toBe('cancelled'), { timeout: 20000 });
    expect(screen.getByText(/Cancelled early/)).toBeInTheDocument();
  });

  it('P2-UI-05 results show action frequencies, EV, a 13x13 strategy grid, per-combo detail and a recommended play', async () => {
    setup();
    await solveExample('river');
    expect(screen.getByTestId('solve-progress').dataset.status).toBe('solved');
    const results = screen.getByTestId('results');
    expect(screen.getByTestId('node-player').textContent).toMatch(/BB to act/);
    const actions = within(results).getAllByTestId(/^node-action-/);
    expect(actions.map((a) => a.textContent)).toEqual([expect.stringMatching(/^Check [\d.]+%$/), expect.stringMatching(/^Bet 3\.63 [\d.]+%$/), expect.stringMatching(/^Bet 6\.8\d [\d.]+%$/), expect.stringMatching(/^All-in 97\.5 [\d.]+%$/)]);
    const total = actions.reduce((s, a) => s + Number(/([\d.]+)%$/.exec(a.textContent!)![1]), 0);
    expect(total).toBeCloseTo(100, 0);
    expect(screen.getByTestId('range-ev').textContent).toMatch(/Range EV \d+\.\d\dbb · equity \d+\.\d%/);
    const grid = within(results).getByTestId('range-grid');
    expect(grid.querySelectorAll('.range-cell')).toHaveLength(169);
    const aa = grid.querySelector<HTMLButtonElement>('[data-hand="AA"]')!;
    expect(aa.getAttribute('aria-label')).toMatch(/^AA: Check [\d.]+%, Bet 3\.63 [\d.]+%/);
    fireEvent.click(grid.querySelector('[data-hand="AQs"]')!);
    const detail = screen.getByTestId('hand-detail');
    expect(within(detail).getByRole('heading').textContent).toMatch(/AQs\s+EV -?\d+\.\d\dbb · equity \d+\.\d%/);
    const rows = within(screen.getByTestId('combo-table')).getAllByRole('row');
    expect(rows.length).toBe(1 + 3); // header + AQs combos not blocked by Qs on board (Ah Qh, Ad Qd, Ac Qc)
    expect(rows[1]!.textContent).toMatch(/[\d.]+%.*bb.*%/);
    expect(screen.getByTestId('recommended-play').textContent).toMatch(/^Recommended play with A.Q.: (Check|Bet [\d.]+|All-in [\d.]+) \([\d.]+%\) · (mix: .+|pure)$/);
    setValue('combo-select', 'AcQc');
    expect(screen.getByTestId('recommended-play').textContent).toMatch(/^Recommended play with A♣Q♣: /);
  });

  it('P2-UI-06 tree navigation: actions move to the next node, cards are dealt at chance nodes, breadcrumb goes back', async () => {
    setup();
    // small turn spot so a check-check reaches the river chance node quickly
    fireEvent.click(screen.getByTestId('example-turn'));
    setValue('oop-range-text', 'AA,KK,QQ,AQs,76s');
    setValue('ip-range-text', 'JJ,TT,KQs,A5s');
    setValue('target', '1');
    await waitFor(() => expect(memory().textContent).toMatch(/Estimated memory/), { timeout: 10000 });
    fireEvent.click(solveBtn());
    await screen.findByTestId('node-player', {}, { timeout: 30000 });
    expect(screen.getByTestId('node-player').textContent).toMatch(/^BB to act/);
    fireEvent.click(screen.getByTestId('node-action-0')); // BB checks
    await waitFor(() => expect(screen.getByTestId('node-player').textContent).toMatch(/^BTN to act/));
    const crumbs = () => within(screen.getByTestId('breadcrumb')).getAllByRole('listitem').map((li) => li.textContent);
    expect(crumbs()).toEqual(['Turn root', 'BB Check']);
    fireEvent.click(screen.getByTestId('node-action-0')); // BTN checks back
    const chance = await screen.findByTestId('chance-node');
    expect(chance.textContent).toMatch(/Choose the river card/);
    expect(within(chance).getByRole('button', { name: 'Qs' })).toBeDisabled(); // on the board
    fireEvent.click(within(chance).getByRole('button', { name: '3c' }));
    await waitFor(() => expect(screen.getByTestId('node-player').textContent).toMatch(/^BB to act/));
    expect(crumbs()).toEqual(['Turn root', 'BB Check', 'BTN Check', 'River 3♣']);
    expect(screen.getByLabelText('Board').querySelectorAll('.playing-card')).toHaveLength(5);
    fireEvent.click(screen.getByTestId('crumb-1')); // back to "BB Check"
    await waitFor(() => expect(screen.getByTestId('node-player').textContent).toMatch(/^BTN to act/));
    expect(crumbs()).toEqual(['Turn root', 'BB Check']);
    fireEvent.click(screen.getByTestId('crumb-0'));
    await waitFor(() => expect(screen.getByTestId('node-player').textContent).toMatch(/^BB to act/));
    expect(crumbs()).toEqual(['Turn root']);
  });

  it('P2-UI-07 the three examples load with one click and the configuration survives a reload', async () => {
    const { unmount } = setup();
    for (const ex of EXAMPLES) {
      fireEvent.click(screen.getByTestId(`example-${ex.id}`));
      expect((screen.getByTestId('board-text') as HTMLInputElement).value).toBe(ex.form.board);
      expect(screen.getByTestId('spot-name').textContent).toBe(ex.form.name);
      expect((screen.getByTestId('oop-range-text') as HTMLTextAreaElement).value).toBe(ex.form.oopRange);
    }
    setValue('pot', '33');
    setValue('board-text', 'AhKh5c');
    unmount();
    expect(JSON.parse(window.localStorage.getItem(ANALYZER_KEY)!).pot).toBe(33);
    setup();
    expect((screen.getByTestId('pot') as HTMLInputElement).value).toBe('33');
    expect((screen.getByTestId('board-text') as HTMLInputElement).value).toBe('AhKh5c');
    expect(screen.getByTestId('spot-name').textContent).toBe('Custom spot');
  });
});
