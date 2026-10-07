import { render, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SeatDiagram } from '../../learn/components/SeatDiagram';
import { HAND_CLASSES } from '../../lib/poker/hands';
import { ALL_SPOTS } from '../../lib/preflop/spots';
import { POSITIONS } from '../../lib/preflop/types';
import { PokerTable } from '../PokerTable';
import { RangeGrid } from '../RangeGrid';

const css = readFileSync(path.resolve(__dirname, '../../styles/components.css'), 'utf8');
const pos = (el: Element) => {
  const s = (el as HTMLElement).style;
  return { x: parseFloat(s.left), y: parseFloat(s.top) };
};
/** The --dealer-dx / --dealer-dy offsets (px) declared for a selector, outside any container query. */
function offsets(selector: string): { dx: number; dy: number } {
  const top = css.split('@container')[0]!;
  let dx = 0;
  let dy = 0;
  for (const m of top.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!m[1]!.split(',').some((sel) => sel.trim() === selector)) continue;
    dx = Number(/--dealer-dx:\s*(-?[\d.]+)px/.exec(m[2]!)?.[1] ?? dx);
    dy = Number(/--dealer-dy:\s*(-?[\d.]+)px/.exec(m[2]!)?.[1] ?? dy);
  }
  return { dx, dy };
}

describe('Dealer button', () => {
  it('UI-09 the drill table shows one dealer button, placed at the BTN seat, whichever seat you hold', () => {
    const heroes = new Set<string>();
    for (const spot of ALL_SPOTS) {
      const { container, unmount } = render(<PokerTable spot={spot} cards={[0, 1]} fourColor={false} dealKey={1} heroAction={null} />);
      const buttons = container.querySelectorAll('[data-testid="dealer-button"]');
      expect(buttons, spot.id).toHaveLength(1);
      const btn = container.querySelector('[data-position="BTN"]')!;
      expect(pos(buttons[0]!), spot.id).toEqual(pos(btn)); // anchored on the BTN seat...
      const slot = (POSITIONS.indexOf('BTN') - POSITIONS.indexOf(spot.hero) + 6) % 6;
      expect(buttons[0]!.classList.contains(`dealer-slot-${slot}`), spot.id).toBe(true); // ...and pushed off it on the open side
      // decorative puck; screen readers get "dealer button" on the BTN seat itself
      expect(buttons[0]!.getAttribute('aria-hidden')).toBe('true');
      expect(btn.getAttribute('aria-label')).toContain('dealer button');
      expect(btn.querySelector('.visually-hidden')!.textContent).toBe(', dealer button');
      for (const other of container.querySelectorAll('.seat:not([data-position="BTN"])')) expect(other.textContent).not.toContain('dealer');
      heroes.add(spot.hero);
      unmount();
    }
    expect([...heroes].sort()).toEqual([...POSITIONS].sort()); // every seat slot of the button was covered
  });

  it('UI-09 each seat slot pushes the puck off the seat towards open felt, away from the bets and the cards', () => {
    // slot k counts seats clockwise from you at the bottom: 0 you, 1 bottom left, 2 top left, 3 top, 4 top right, 5 bottom right.
    // Bets sit between a seat and the pot, and your cards sit above your seat, so the puck goes beside, above or below the seat box.
    // (The real-browser geometry at many table sizes is checked by E2E-08.)
    const o = [0, 1, 2, 3, 4, 5].map((k) => offsets(`.dealer-slot-${k}`));
    expect(o[0]!.dx).toBeGreaterThan(40); // beside your seat (your bet is on the left, your cards above)
    expect(o[1]!.dy).toBeLessThan(-30); // bottom corners: above the seat
    expect(o[5]!.dy).toBeLessThan(-30);
    expect(o[2]!.dy).toBeGreaterThan(30); // top corners: below the seat
    expect(o[4]!.dy).toBeGreaterThan(30);
    expect(o[3]!.dx).toBeGreaterThan(45); // top seat: beside it, level with it, clear of its bet below
    expect(o[3]!.dy).toBe(0);
    expect(css).toMatch(/transform:\s*translate\(calc\(-50% \+ var\(--dealer-dx, 0px\)\), calc\(-50% \+ var\(--dealer-dy, 0px\)\)\)/);
  });

  it('UI-09 the lesson table diagram marks the BTN seat with the dealer button', () => {
    const { container } = render(<SeatDiagram order="postflop" caption="Postflop order" />);
    const buttons = container.querySelectorAll('[data-testid="dealer-button"]');
    expect(buttons).toHaveLength(1);
    const btnSeat = [...container.querySelectorAll('.diagram-seat')].find((s) => s.querySelector('.seat-pos')!.textContent === 'BTN')!;
    expect(pos(buttons[0]!)).toEqual(pos(btnSeat));
    expect(offsets('.dealer-diagram').dy).toBeLessThan(-30); // above the bottom-right BTN seat
    expect(within(container).getByRole('img').getAttribute('aria-label')).toContain('Button (BTN), with the dealer button');
  });
});

describe('Highlighted hand in range grids', () => {
  const getCell = () => ({ bands: [{ key: 'raise', label: 'Raise', freq: 0.5, color: 'var(--act-raise)' }] });

  it('UI-08 the selected hand is marked and its row and column carry guides', () => {
    const { container, rerender } = render(<RangeGrid getCell={getCell} selected="A5s" label="grid" />);
    const selected = container.querySelectorAll('.range-cell.selected');
    expect(selected).toHaveLength(1);
    expect(selected[0]!.getAttribute('data-hand')).toBe('A5s');
    expect(selected[0]!.getAttribute('aria-pressed')).toBe('true');
    const idx = HAND_CLASSES.findIndex((h) => h.label === 'A5s');
    const expected = HAND_CLASSES.filter((_, i) => i !== idx && (Math.floor(i / 13) === Math.floor(idx / 13) || i % 13 === idx % 13)).map((h) => h.label);
    const guides = [...container.querySelectorAll('.range-cell.guide')].map((c) => c.getAttribute('data-hand'));
    expect(guides.sort()).toEqual(expected.sort());
    expect(guides).toHaveLength(24);
    expect(guides).toContain('AA'); // same row
    expect(guides).toContain('A2s'); // same row
    expect(guides).toContain('K5s'); // same column
    expect(guides).toContain('54o'); // same column, below the diagonal
    rerender(<RangeGrid getCell={getCell} selected={null} label="grid" />);
    expect(container.querySelectorAll('.range-cell.selected, .range-cell.guide')).toHaveLength(0);
    rerender(<RangeGrid getCell={getCell} selected="KK" guides={false} label="grid" />);
    expect(container.querySelectorAll('.range-cell.selected')).toHaveLength(1);
    expect(container.querySelectorAll('.range-cell.guide')).toHaveLength(0);
  });

  it('UI-08 the highlight is a lifted brass ring that keeps the focus outline separate', () => {
    const rule = (sel: string) => {
      const m = new RegExp(`${sel.replace(/[.:()]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(css);
      expect(m, sel).not.toBeNull();
      return m![1]!;
    };
    const sel = rule('.range-cell.selected');
    expect(sel).toMatch(/transform:\s*scale\(1\.1\d\)/);
    expect(sel).toMatch(/box-shadow:[^;]*var\(--accent-strong\)/);
    expect(sel).toMatch(/z-index:\s*2/);
    expect(sel).not.toMatch(/outline/); // the focus ring stays visible on a selected cell
    expect(rule('.range-cell.guide::after')).toMatch(/var\(--accent\)/);
    expect(rule('.range-cell:focus-visible')).toMatch(/z-index:\s*3/);
  });
});
