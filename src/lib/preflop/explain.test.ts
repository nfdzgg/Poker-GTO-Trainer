import { describe, expect, it } from 'vitest';
import { HAND_LABELS } from '../poker/hands';
import { categorize } from './categories';
import { explain, pct } from './explain';
import { ACTION_LABELS } from './types';
import { ALL_SPOTS } from './spots';

describe('P1-DRILL-03 explanations', () => {
  it('P1-DRILL-03 every spot x hand x action has a non-empty explanation naming the position and the correct frequencies', () => {
    let n = 0;
    const texts = new Set<string>();
    for (const spot of ALL_SPOTS) {
      for (const hand of HAND_LABELS) {
        const f = spot.hands[hand]!;
        for (const action of spot.actions) {
          const e = explain(spot, hand, action);
          expect(e.text.length).toBeGreaterThan(80);
          expect(e.text).toContain(`(${spot.hero})`);
          for (const a of spot.actions) expect(e.text).toContain(`${ACTION_LABELS[a]} ${pct(f[a] ?? 0)}`);
          expect(e.text).toContain(hand);
          expect(e.text).not.toMatch(/undefined|NaN|\{hero\}|\{villain\}/);
          texts.add(e.text);
          n++;
        }
      }
    }
    expect(n).toBe(5 * 169 * 2 + 30 * 169 * 3);
    expect(texts.size).toBe(n); // every combination yields its own text
  });

  it('P1-DRILL-03 explanations are built from category templates', () => {
    const rfi = ALL_SPOTS.find((s) => s.id === 'rfi-BTN')!;
    expect(categorize('AA')).toBe('premium');
    expect(categorize('A5s')).toBe('suited-ace-blocker');
    expect(categorize('76s')).toBe('suited-connector');
    expect(categorize('33')).toBe('small-pair');
    expect(categorize('KQo')).toBe('broadway');
    expect(categorize('72o')).toBe('trash');
    expect(explain(rfi, 'A5s', 'raise').text).toMatch(/wheel aces/);
    expect(explain(rfi, '72o', 'raise').text).toMatch(/Mistake/);
    expect(explain(rfi, '72o', 'fold').text).toMatch(/Best/);
    const vs3 = ALL_SPOTS.find((s) => s.id === 'vs3bet-UTG-vs-HJ')!;
    expect(explain(vs3, '72o', 'fold').text).toMatch(/not part of the UTG opening range/);
  });
});
