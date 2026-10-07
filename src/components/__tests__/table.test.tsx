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

const pos = (el: Element) => {
  const s = (el as HTMLElement).style;
  return { x: parseFloat(s.left), y: parseFloat(s.top) };
};
type Pt = { x: number; y: number };
// Distances in pixels on the two felt shapes the table uses: desktop (640 wide, 2:1.12) and phone (358 wide, 1.3:1).
const FELTS = [
  { w: 640, h: 640 / (2 / 1.12), cards: { x0: 39, x1: 61, y0: 60, y1: 87 }, puck: 13 },
  { w: 358, h: 358 / 1.3, cards: { x0: 35, x1: 65, y0: 59, y1: 85 }, puck: 10 },
];
const px = (a: Pt, b: Pt, f: (typeof FELTS)[number]) => Math.hypot(((a.x - b.x) * f.w) / 100, ((a.y - b.y) * f.h) / 100);
const dist = (a: Pt, b: Pt) => px(a, b, FELTS[0]!);

describe('Dealer button', () => {
  it('UI-09 the drill table shows one dealer button, next to the BTN seat, whichever seat you hold', () => {
    const heroes = new Set<string>();
    for (const spot of ALL_SPOTS) {
      const { container, unmount } = render(<PokerTable spot={spot} cards={[0, 1]} fourColor={false} dealKey={1} heroAction={null} />);
      const buttons = container.querySelectorAll('[data-testid="dealer-button"]');
      expect(buttons, spot.id).toHaveLength(1);
      const d = pos(buttons[0]!);
      const seats = [...container.querySelectorAll('.seat')];
      expect(seats).toHaveLength(6);
      for (const f of FELTS) {
        const byDist = [...seats].sort((a, b) => px(pos(a), d, f) - px(pos(b), d, f));
        expect(byDist[0]!.getAttribute('data-position'), `${spot.id} @${f.w}`).toBe('BTN');
        // clearly closer to the button than to anyone else, and clear of seat boxes, bets and the hero's cards
        expect(px(pos(byDist[1]!), d, f), `${spot.id} @${f.w}`).toBeGreaterThan(1.6 * px(pos(byDist[0]!), d, f));
        for (const s of seats) expect(px(pos(s), d, f), `${spot.id} @${f.w} vs ${s.getAttribute('data-position')}`).toBeGreaterThan(f.puck + 28);
        for (const b of container.querySelectorAll('.seat-bet')) expect(px(pos(b), d, f), `${spot.id} @${f.w} bet`).toBeGreaterThan(f.puck + 22);
        const c = f.cards;
        const inCards = d.x > c.x0 - (f.puck * 100) / f.w && d.x < c.x1 + (f.puck * 100) / f.w && d.y > c.y0 && d.y < c.y1 + (f.puck * 100) / f.h;
        expect(inCards, `${spot.id} @${f.w} clear of the hero's cards`).toBe(false);
        // inside the felt's oval
        expect(((d.x - 50) / 50) ** 2 + ((d.y - 50) / 50) ** 2, `${spot.id} on the felt`).toBeLessThan(0.85);
      }
      // screen readers hear it on the BTN seat; the puck itself is decorative
      expect(container.querySelector('[data-position="BTN"]')!.getAttribute('aria-label')).toContain('dealer button');
      expect(buttons[0]!.getAttribute('aria-hidden')).toBe('true');
      heroes.add(spot.hero);
      unmount();
    }
    expect([...heroes].sort()).toEqual([...POSITIONS].sort()); // every relative seat layout was covered
  });

  it('UI-09 the lesson table diagram marks the BTN seat with the dealer button', () => {
    const { container } = render(<SeatDiagram order="postflop" caption="Postflop order" />);
    const d = pos(container.querySelector('[data-testid="dealer-button"]')!);
    const seats = [...container.querySelectorAll('.diagram-seat')];
    const labelOf = (s: Element) => s.querySelector('.seat-pos')!.textContent;
    const nearest = seats.reduce((a, b) => (dist(pos(a), d) <= dist(pos(b), d) ? a : b));
    expect(labelOf(nearest)).toBe('BTN');
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
    const css = readFileSync(path.resolve(__dirname, '../../styles/components.css'), 'utf8');
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
