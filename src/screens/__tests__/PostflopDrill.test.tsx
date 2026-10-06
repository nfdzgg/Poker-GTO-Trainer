import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SolverClient } from '../../solver/client';
import { loadStats, STATS_KEY } from '../../lib/stats/store';
import { InProcessWorker } from '../../test/inProcessWorker';
import AnalyzerScreen from '../AnalyzerScreen';
import { StatsScreen } from '../StatsScreen';

async function solveRiver() {
  render(<AnalyzerScreen clientFactory={() => new SolverClient(new InProcessWorker())} />);
  fireEvent.click(screen.getByTestId('example-river'));
  await waitFor(() => expect(screen.getByTestId('memory-estimate').textContent).toMatch(/Estimated memory/), { timeout: 10000 });
  expect(screen.queryByTestId('drill-spot')).toBeNull(); // only offered after a solve
  fireEvent.click(screen.getByTestId('solve'));
  await screen.findByTestId('drill-spot', {}, { timeout: 30000 });
}

describe('Postflop drill UI', () => {
  it('P2-DRILL-01 "Drill this spot" deals a hand at a solved decision, grades the answer and shows EV loss', async () => {
    await solveRiver();
    fireEvent.click(screen.getByTestId('drill-spot'));
    const prompt = await screen.findByTestId('pf-prompt', {}, { timeout: 20000 });
    expect(prompt.textContent).toMatch(/^You are (BB|BTN) \((OOP|IP)\) with .{4}\. What do you do\?$/);
    expect(screen.getByTestId('pf-line')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pf-action-0'));
    const result = await screen.findByTestId('pf-result');
    expect(result.querySelector('[data-grade]')!.getAttribute('data-grade')).toMatch(/^(best|acceptable|mistake)$/);
    expect(screen.getByTestId('pf-ev-loss').textContent).toMatch(/EV loss: \d+\.\d\dbb$/);
    expect(result.querySelector('[data-testid="freq-bar"]')).not.toBeNull();
    expect(screen.getByTestId('pf-action-0')).toBeDisabled();
    fireEvent.click(screen.getByTestId('pf-next'));
    await screen.findByTestId('pf-prompt', {}, { timeout: 20000 });
    expect(screen.queryByTestId('pf-result')).toBeNull();
    fireEvent.click(screen.getByTestId('pf-action-1'));
    await screen.findByTestId('pf-result');
    expect(screen.getByTestId('pf-session').textContent).toMatch(/^2 hands/);
    fireEvent.click(screen.getByTestId('close-drill'));
    expect(await screen.findByTestId('results')).toBeInTheDocument();
  });

  it('P2-DRILL-02 postflop drill results are stored and shown under a separate Postflop stats section', async () => {
    await solveRiver();
    fireEvent.click(screen.getByTestId('drill-spot'));
    for (let i = 0; i < 3; i++) {
      await screen.findByTestId('pf-prompt', {}, { timeout: 20000 });
      fireEvent.click(screen.getByTestId('pf-action-0'));
      await screen.findByTestId('pf-result');
      fireEvent.click(screen.getByTestId('pf-next'));
    }
    const stored = loadStats();
    expect(stored.postflop).toHaveLength(3);
    expect(stored.records).toHaveLength(0); // preflop records are untouched
    for (const r of stored.postflop) {
      expect(r.evLoss).toBeGreaterThanOrEqual(0);
      expect(r.spot).toMatch(/^River: BTN vs BB/);
    }
    document.body.innerHTML = '';
    render(<StatsScreen />);
    const section = screen.getByTestId('postflop-stats');
    expect(section.textContent).toMatch(/Postflop/);
    expect(screen.getByTestId('postflop-hands').textContent).toBe('3');
    expect(screen.getByTestId('postflop-evloss').textContent).toMatch(/^\d+\.\d\dbb$/);
    expect(screen.getByTestId('postflop-recent').querySelectorAll('tbody tr')).toHaveLength(3);
    expect(screen.getByTestId('total-hands').textContent).toBe('0'); // preflop totals are separate
    fireEvent.click(screen.getByTestId('reset-stats'));
    fireEvent.click(screen.getByTestId('confirm-reset'));
    expect(window.localStorage.getItem(STATS_KEY)).toBeNull();
    expect(screen.getByTestId('postflop-empty')).toBeInTheDocument();
  });
});
