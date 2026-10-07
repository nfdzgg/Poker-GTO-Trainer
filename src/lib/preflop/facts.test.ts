import { describe, expect, it } from 'vitest';
import { HAND_LABELS } from '../poker/hands';
import { reachPercent, spotFacts } from './facts';
import { getSpot, ALL_SPOTS } from './spots';
import { actionPercent } from './validate';

describe('spot facts', () => {
  it('P1-STUDY-02 pot, price to call and pot odds match every spot', () => {
    for (const s of ALL_SPOTS) {
      const f = spotFacts(s, 'AA');
      expect(f.pot).toBe(s.pot);
      expect(f.toCall).toBe(s.toCall);
      if (s.type === 'rfi') {
        expect(f.potOdds).toBeNull();
        expect(f.potAfterCall).toBeNull();
      } else {
        expect(f.potOdds).toBeCloseTo(s.toCall / (s.pot + s.toCall), 10);
        expect(f.potAfterCall).toBe(s.pot + s.toCall);
      }
      expect(f.options.map((o) => o.action)).toEqual(s.actions);
      expect(f.heroName.length).toBeGreaterThan(3);
      expect(f.tip.length).toBeGreaterThan(30);
    }
    // BB facing a BTN open: 1.5bb more into 4bb needs 27% equity
    const bb = spotFacts(getSpot('vsopen-BB-vs-BTN')!, 'K5o');
    expect(bb.potOdds! * 100).toBeCloseTo(27.27, 1);
    expect(bb.options.map((o) => o.label)).toEqual(['3-bet to 10bb', 'Call 1.5bb more', 'Fold']);
  });

  it('P1-STUDY-02 range widths are reach-weighted and the opponent range comes from the right chart', () => {
    for (const s of ALL_SPOTS) {
      const f = spotFacts(s, 'KQs');
      expect(f.heroRange.reduce((a, r) => a + r.percent, 0)).toBeCloseTo(100, 6);
      if (s.type !== 'vs-3bet') {
        expect(f.rangeBase).toBe('all hands');
        for (const r of f.heroRange) expect(r.percent).toBeCloseTo(actionPercent(s, r.action), 6);
      } else {
        expect(f.rangeBase).toBe('your opening range');
        // share of the hands hero actually opened, so folding is far below its share of all 1326 combos
        expect(reachPercent(s, 'fold')).toBeLessThan(actionPercent(s, 'fold'));
      }
      if (s.type === 'rfi') expect(f.villainRange).toBeNull();
      if (s.type === 'vs-open') expect(f.villainRange!.percent).toBeCloseTo(actionPercent(getSpot(`rfi-${s.villain}`)!, 'raise'), 6);
      if (s.type === 'vs-3bet') expect(f.villainRange!.percent).toBeCloseTo(actionPercent(getSpot(`vsopen-${s.villain}-vs-${s.hero}`)!, '3bet'), 6);
    }
    const vs3 = spotFacts(getSpot('vs3bet-BTN-vs-BB')!, 'AA');
    const cont = vs3.heroRange.filter((r) => r.action !== 'fold').reduce((a, r) => a + r.percent, 0);
    expect(vs3.tip).toContain(`About ${cont.toFixed(0)}% of your opening range continues`);
  });

  it('P1-STUDY-02 players behind and postflop position are described correctly', () => {
    expect(spotFacts(getSpot('rfi-UTG')!, 'AA').playersBehind).toEqual(['HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(spotFacts(getSpot('rfi-BTN')!, 'AA').positionNote).toMatch(/Nobody left to act can have position/);
    expect(spotFacts(getSpot('rfi-CO')!, 'AA').positionNote).toMatch(/^BTN would have position/);
    expect(spotFacts(getSpot('rfi-SB')!, 'AA').positionNote).toMatch(/big blind/);
    expect(spotFacts(getSpot('vsopen-BTN-vs-CO')!, 'AA').playersBehind).toEqual(['SB', 'BB']);
    expect(spotFacts(getSpot('vsopen-BTN-vs-CO')!, 'AA').positionNote).toMatch(/in position against CO/);
    expect(spotFacts(getSpot('vsopen-BB-vs-BTN')!, 'AA').positionNote).toMatch(/out of position against BTN/);
    expect(spotFacts(getSpot('vsopen-BB-vs-SB')!, 'AA').positionNote).toMatch(/in position against SB/);
    expect(spotFacts(getSpot('vs3bet-UTG-vs-BTN')!, 'AA').playersBehind).toEqual([]);
  });

  it('P1-STUDY-02 the facts never depend on the dealt hand except for the hand row (no answer leaks)', () => {
    for (const s of ALL_SPOTS) {
      const strip = (h: string) => {
        const { hand, ...rest } = spotFacts(s, h);
        return { hand, rest: JSON.stringify(rest) };
      };
      const a = strip('AA');
      for (const h of ['72o', 'A5s', 'T9s', '22', 'KJo']) {
        const b = strip(h);
        expect(b.rest).toBe(a.rest);
        expect(b.hand.label).toBe(h);
      }
    }
    expect(spotFacts(getSpot('rfi-BTN')!, 'A5s').hand).toEqual({ label: 'A5s', category: 'suited-ace-blocker', categoryLabel: 'a suited wheel ace (ace blocker)', combos: 4 });
    expect(HAND_LABELS).toHaveLength(169);
  });
});
