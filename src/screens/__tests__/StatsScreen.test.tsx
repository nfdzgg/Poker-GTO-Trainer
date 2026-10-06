import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Grade } from '../../lib/preflop/grading';
import type { Position, SpotType } from '../../lib/preflop/types';
import { loadStats, saveStats, STATS_KEY, type StatRecord } from '../../lib/stats/store';
import { StatsScreen } from '../StatsScreen';

function seed(spec: [Position, SpotType, number, number][]) {
  const records: StatRecord[] = [];
  for (const [hero, type, ok, bad] of spec)
    for (let i = 0; i < ok + bad; i++) {
      const grade: Grade = i < ok ? 'best' : 'mistake';
      records.push({ t: i, spotId: 'x', type, hero, villain: type === 'rfi' ? null : 'UTG', hand: 'AKo', action: 'fold', grade });
    }
  saveStats({ version: 1, records, postflop: [] });
}

describe('Stats screen', () => {
  it('P1-STAT-02 shows accuracy by position, by spot type, by position x spot type, and total hands', () => {
    seed([
      ['CO', 'rfi', 3, 1],
      ['BB', 'vs-open', 1, 1],
    ]);
    render(<StatsScreen />);
    expect(screen.getByTestId('total-hands').textContent).toBe('6');
    expect(screen.getByTestId('total-accuracy').textContent).toBe('67%');
    const pos = screen.getByTestId('by-position');
    expect(within(pos).getByRole('rowheader', { name: 'CO' }).parentElement!.textContent).toContain('75%');
    expect(within(pos).getByRole('rowheader', { name: 'BB' }).parentElement!.textContent).toContain('50%');
    const type = screen.getByTestId('by-type');
    expect(within(type).getByRole('rowheader', { name: 'Raise first in' }).parentElement!.textContent).toContain('75%');
    const bucket = screen.getByTestId('by-bucket');
    const coRow = within(bucket).getByRole('rowheader', { name: 'CO' }).parentElement!;
    expect(coRow.textContent).toContain('75%(4)'.replace('(', ' ('));
    const bbRow = within(bucket).getByRole('rowheader', { name: 'BB' }).parentElement!;
    expect(bbRow.textContent).toContain('n/a'); // BB never raises first in
  });

  it('P1-STAT-03 lists the 3 lowest buckets with >= 10 attempts with drill links', () => {
    seed([
      ['UTG', 'rfi', 9, 1],
      ['HJ', 'vs-open', 5, 5],
      ['CO', 'vs-3bet', 2, 8],
      ['BB', 'vs-open', 3, 7],
      ['SB', 'rfi', 0, 5],
    ]);
    render(<StatsScreen />);
    const items = within(screen.getByTestId('leaks')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain('CO');
    expect(items[0]!.textContent).toContain('20%');
    const links = items.map((li) => within(li).getByRole('link').getAttribute('href'));
    expect(links).toEqual(['#/drill?pos=CO&type=vs-3bet', '#/drill?pos=BB&type=vs-open', '#/drill?pos=HJ&type=vs-open']);
  });

  it('P1-STAT-03 shows a friendly empty state below the sample threshold', () => {
    seed([['CO', 'rfi', 2, 7]]);
    render(<StatsScreen />);
    expect(screen.getByTestId('leaks-empty').textContent).toMatch(/at least 10 answers/);
    expect(screen.queryByTestId('leaks')).toBeNull();
  });

  it('P1-STAT-04 reset clears stats only after confirmation', () => {
    seed([['CO', 'rfi', 2, 2]]);
    render(<StatsScreen />);
    fireEvent.click(screen.getByTestId('reset-stats'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-reset'));
    expect(screen.getByTestId('total-hands').textContent).toBe('4');
    expect(loadStats().records).toHaveLength(4);
    fireEvent.click(screen.getByTestId('reset-stats'));
    fireEvent.click(screen.getByTestId('confirm-reset'));
    expect(screen.getByTestId('total-hands').textContent).toBe('0');
    expect(window.localStorage.getItem(STATS_KEY)).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('P1-STAT-01 corrupt stored data renders an empty stats screen instead of crashing', () => {
    window.localStorage.setItem(STATS_KEY, '{"version":1,"records":[{"broken"');
    render(<StatsScreen />);
    expect(screen.getByTestId('total-hands').textContent).toBe('0');
  });
});
