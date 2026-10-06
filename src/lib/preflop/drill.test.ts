import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { handLabelOf } from '../poker/hands';
import { dealHand, focusHands, reachWeight } from './drill';
import { ALL_SPOTS } from './spots';

describe('P1-DRILL-01 drill dealing', () => {
  it('P1-DRILL-01 deals a valid random spot and hand consistent with the cards', () => {
    const rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      const d = dealHand(rng, ALL_SPOTS, { types: [], positions: [], focus: false })!;
      expect(d).not.toBeNull();
      expect(ALL_SPOTS).toContain(d.spot);
      expect(d.cards[0]).not.toBe(d.cards[1]);
      expect(handLabelOf(d.cards[0], d.cards[1])).toBe(d.hand);
      expect(reachWeight(d.spot, d.hand)).toBeGreaterThan(0);
    }
  });

  it('P1-DRILL-01 the RNG is seedable: the same seed gives the same sequence', () => {
    const run = (seed: number) => {
      const rng = createRng(seed);
      return Array.from({ length: 25 }, () => {
        const d = dealHand(rng, ALL_SPOTS, { types: [], positions: [], focus: true })!;
        return `${d.spot.id}:${d.hand}:${d.cards.join('-')}`;
      });
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('P1-DRILL-01 spot type and position filters restrict the dealt spots', () => {
    const rng = createRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const d = dealHand(rng, ALL_SPOTS, { types: ['vs-open'], positions: ['BB'], focus: false })!;
      expect(d.spot.type).toBe('vs-open');
      expect(d.spot.hero).toBe('BB');
      seen.add(d.spot.id);
    }
    expect(seen.size).toBe(5); // BB faces opens from UTG, HJ, CO, BTN and SB
    for (let i = 0; i < 100; i++) {
      const d = dealHand(rng, ALL_SPOTS, { types: ['rfi', 'vs-3bet'], positions: ['SB', 'CO'], focus: false })!;
      expect(['rfi', 'vs-3bet']).toContain(d.spot.type);
      expect(['SB', 'CO']).toContain(d.spot.hero);
    }
    expect(dealHand(rng, ALL_SPOTS, { types: ['rfi'], positions: ['BB'], focus: false })).toBeNull();
  });

  it('P1-DRILL-01 facing a 3-bet only deals hands from hero opening range; focus mode skips trivial folds', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const d = dealHand(rng, ALL_SPOTS, { types: ['vs-3bet'], positions: [], focus: false })!;
      expect(reachWeight(d.spot, d.hand)).toBeGreaterThan(0);
    }
    const utg = ALL_SPOTS.find((s) => s.id === 'rfi-UTG')!;
    const focus = focusHands(utg);
    expect(focus.has('AA')).toBe(true);
    expect(focus.has('72o')).toBe(false);
    for (let i = 0; i < 100; i++) {
      const d = dealHand(rng, [utg], { types: [], positions: [], focus: true })!;
      expect(focus.has(d.hand)).toBe(true);
    }
  });
});
