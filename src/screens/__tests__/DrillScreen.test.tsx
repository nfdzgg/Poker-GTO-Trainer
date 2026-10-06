import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getSpot } from '../../lib/preflop/spots';
import { loadStats } from '../../lib/stats/store';
import { DrillScreen } from '../DrillScreen';
import { StatsScreen } from '../StatsScreen';

const params = (q: string) => new URLSearchParams(q);

describe('Preflop drill screen', () => {
  it('P1-DRILL-04 after answering shows grade, explanation, frequency bar and a range button', () => {
    render(<DrillScreen params={params('seed=12345')} />);
    const situation = screen.getByTestId('situation').textContent!;
    const buttons = within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId('drill-result')).toBeNull();
    fireEvent.click(buttons[buttons.length - 1]!); // fold
    const result = screen.getByTestId('drill-result');
    const badge = within(result).getByRole('status');
    expect(['Best', 'Acceptable mix', 'Mistake']).toContain(badge.textContent!.replace(/^[✓≈✕]/, ''));
    const explanation = screen.getByTestId('explanation').textContent!;
    expect(explanation.length).toBeGreaterThan(80);
    expect(explanation).toContain(situation);
    const bar = within(result).getByTestId('freq-bar');
    expect(bar.getAttribute('aria-label')).toMatch(/Fold \d/);
    const link = within(result).getByTestId('view-range') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toMatch(/^#\/ranges\?spot=[\w-]+&hand=\w+$/);
    const spotId = new URLSearchParams(link.getAttribute('href')!.split('?')[1]).get('spot')!;
    expect(getSpot(spotId)?.description).toBe(situation);
    // all action buttons are locked after answering
    for (const b of buttons) expect(b).toBeDisabled();
  });

  it('P1-DRILL-04 the grade matches the chart and next hand deals a new spot', () => {
    render(<DrillScreen params={params('seed=999')} />);
    const link = () => screen.queryByTestId('view-range') as HTMLAnchorElement | null;
    const buttons = within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button');
    fireEvent.click(buttons[0]!);
    const q = new URLSearchParams(link()!.getAttribute('href')!.split('?')[1]);
    const spot = getSpot(q.get('spot')!)!;
    const f = spot.hands[q.get('hand')!]!;
    const chosen = spot.actions[0]!;
    const max = Math.max(...spot.actions.map((a) => f[a] ?? 0));
    const expected = (f[chosen] ?? 0) === max ? 'best' : (f[chosen] ?? 0) >= 0.2 ? 'acceptable' : 'mistake';
    expect(screen.getByRole('status').getAttribute('data-grade')).toBe(expected);
    fireEvent.click(screen.getByTestId('next-hand'));
    expect(screen.queryByTestId('drill-result')).toBeNull();
    expect(screen.getByTestId('session-count').textContent).toBe('1');
  });

  it('P1-DRILL-01 the same seed replays the same hands in the UI', () => {
    const run = () => {
      const { unmount } = render(<DrillScreen params={params('seed=4242')} />);
      const seq: string[] = [];
      for (let i = 0; i < 4; i++) {
        seq.push(screen.getByTestId('situation').textContent! + screen.getByLabelText('Your hand').innerHTML.length);
        fireEvent.click(within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button')[0]!);
        fireEvent.click(screen.getByTestId('next-hand'));
      }
      unmount();
      return seq;
    };
    expect(run()).toEqual(run());
  });

  it('P1-STAT-03 a leak link (pos + type params) starts a drill filtered to that bucket', () => {
    render(<DrillScreen params={params('seed=7&pos=CO&type=vs-open')} />);
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId('situation').textContent).toMatch(/to CO\. CO can 3-bet/);
      fireEvent.click(within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button')[0]!);
      fireEvent.click(screen.getByTestId('next-hand'));
    }
    expect((screen.getByTestId('filter-position') as HTMLSelectElement).value).toBe('CO');
    expect((screen.getByTestId('filter-type') as HTMLSelectElement).value).toBe('vs-open');
  });

  it('P1-DRILL-01 changing the filters re-deals within the filter', () => {
    render(<DrillScreen params={params('seed=3')} />);
    fireEvent.change(screen.getByTestId('filter-type'), { target: { value: 'vs-3bet' } });
    fireEvent.change(screen.getByTestId('filter-position'), { target: { value: 'BTN' } });
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId('situation').textContent).toMatch(/^BTN opens .* 3-bets/);
      fireEvent.click(within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button')[0]!);
      fireEvent.click(screen.getByTestId('next-hand'));
    }
  });

  it('P1-STAT-01 drill answers are saved and survive a remount (reload) into the stats screen', () => {
    const { unmount } = render(<DrillScreen params={params('seed=11')} />);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button')[0]!);
      fireEvent.click(screen.getByTestId('next-hand'));
    }
    unmount();
    expect(loadStats().records).toHaveLength(3);
    render(<StatsScreen />);
    expect(screen.getByTestId('total-hands').textContent).toBe('3');
  });

  it('keyboard shortcuts answer and advance', () => {
    render(<DrillScreen params={params('seed=5')} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    });
    expect(screen.getByTestId('drill-result')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    });
    expect(screen.queryByTestId('drill-result')).toBeNull();
  });
});
