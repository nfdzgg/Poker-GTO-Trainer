import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HAND_CLASSES } from '../../lib/poker/hands';
import { ALL_SPOTS, getSpot } from '../../lib/preflop/spots';
import { actionPercent } from '../../lib/preflop/validate';
import { RangeViewerScreen } from '../RangeViewerScreen';

const cell = (label: string) => document.querySelector<HTMLButtonElement>(`.range-cell[data-hand="${label}"]`)!;

describe('Range viewer', () => {
  it('P1-VIEW-01 renders a 13x13 grid of 169 labelled cells with pairs on the diagonal, suited above, offsuit below', () => {
    render(<RangeViewerScreen params={new URLSearchParams('spot=rfi-CO')} />);
    const grid = screen.getByTestId('range-grid');
    const rows = within(grid).getAllByRole('row');
    expect(rows).toHaveLength(13);
    const cells = grid.querySelectorAll('.range-cell');
    expect(cells).toHaveLength(169);
    rows.forEach((row, r) => {
      const btns = row.querySelectorAll('.range-cell');
      expect(btns).toHaveLength(13);
      btns.forEach((b, c) => {
        const label = b.getAttribute('data-hand')!;
        expect(b.textContent).toBe(label);
        if (r === c) expect(label).toMatch(/^(.)\1$/);
        else if (r < c) expect(label).toMatch(/s$/);
        else expect(label).toMatch(/o$/);
      });
    });
  });

  it('P1-VIEW-01 any of the 35 spots can be chosen via the spot type and position selectors', () => {
    render(<RangeViewerScreen />);
    const desc = () => screen.getByTestId('viewer-description').textContent;
    const seen = new Set<string>();
    for (const s of ALL_SPOTS) {
      fireEvent.change(screen.getByTestId('viewer-type'), { target: { value: s.type } });
      fireEvent.change(screen.getByTestId('viewer-hero'), { target: { value: s.hero } });
      if (s.villain) fireEvent.change(screen.getByTestId('viewer-villain'), { target: { value: s.villain } });
      expect(desc()).toBe(s.description);
      expect(document.querySelectorAll('.range-cell')).toHaveLength(169);
      seen.add(desc()!);
    }
    expect(seen.size).toBe(35);
  });

  it('P1-VIEW-02 a mixed hand renders proportional bands colored by action, with a legend and range percentages', () => {
    const spot = getSpot('vsopen-BTN-vs-CO')!;
    render(<RangeViewerScreen params={new URLSearchParams(`spot=${spot.id}`)} />);
    const f = spot.hands['AQs']!; // 3-bet 70%, call 30%
    expect(f['3bet']).toBeCloseTo(0.7);
    const bands = cell('AQs').querySelectorAll<HTMLElement>('.range-band');
    expect(bands.length).toBeGreaterThan(1);
    expect(bands[0]!.dataset.action).toBe('3bet');
    expect(bands[0]!.style.width).toBe('70%');
    expect(bands[0]!.style.background).toContain('--act-3bet');
    expect(bands[1]!.dataset.action).toBe('call');
    expect(bands[1]!.style.width).toBe('30%');
    expect(bands[1]!.style.background).toContain('--act-call');
    const pure = cell('72o').querySelectorAll<HTMLElement>('.range-band');
    expect(pure).toHaveLength(1);
    expect(pure[0]!.dataset.action).toBe('fold');
    expect(pure[0]!.style.width).toBe('100%');
    expect(pure[0]!.style.background).toContain('--act-fold');
    const legend = screen.getByTestId('legend');
    for (const a of spot.actions) {
      const item = legend.querySelector(`[data-action="${a}"]`)!;
      expect(item.textContent).toContain(`${actionPercent(spot, a).toFixed(1)}%`);
    }
  });

  it('P1-VIEW-03 hovering or tapping a cell shows exact frequencies and the combo count', () => {
    render(<RangeViewerScreen params={new URLSearchParams('spot=vsopen-BTN-vs-CO')} />);
    const detail = screen.getByTestId('cell-detail');
    fireEvent.mouseEnter(cell('AQs'));
    expect(detail.textContent).toContain('AQs');
    expect(detail.textContent).toContain('4 combos');
    expect(detail.textContent).toContain('70.0%');
    expect(detail.textContent).toContain('30.0%');
    fireEvent.mouseLeave(cell('AQs'));
    fireEvent.click(cell('KJo')); // tap
    expect(detail.textContent).toContain('KJo');
    expect(detail.textContent).toContain('12 combos');
  });

  it('P1-VIEW-03 cells are keyboard focusable with ARIA labels and arrow-key navigation', () => {
    render(<RangeViewerScreen params={new URLSearchParams('spot=rfi-UTG')} />);
    const all = [...document.querySelectorAll<HTMLButtonElement>('.range-cell')];
    expect(all.every((b) => b.tagName === 'BUTTON')).toBe(true);
    expect(all.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(cell('AA').getAttribute('aria-label')).toBe('AA: Raise 100%, Fold 0%. 6 combos');
    expect(cell('A7s').getAttribute('aria-label')).toBe('A7s: Raise 75%, Fold 25%. 4 combos');
    act(() => cell('AA').focus());
    expect(screen.getByTestId('cell-detail').textContent).toContain('6 combos');
    fireEvent.keyDown(cell('AA'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell('AKs'));
    fireEvent.keyDown(cell('AKs'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell('KK'));
    expect(screen.getByTestId('cell-detail').textContent).toContain('KK');
    expect(HAND_CLASSES).toHaveLength(169);
  });
});
