// Shared spot definitions used by checks, tests and the analyzer's built-in examples.
import type { RangeWeights } from '../lib/poker/range';
import type { PreflopAction, SpotData } from '../lib/preflop/types';
import type { SolverConfig, StreetSizes } from './types';

export const sizes = (bet: string, raise: string): StreetSizes => ({ oop: { bet, raise }, ip: { bet, raise } });
export const NO_BETS = sizes('', '');

/** Range of hands that take `action` in a preflop spot, weighted by frequency. */
export function rangeFromSpot(spot: Pick<SpotData, 'hands'>, action: PreflopAction): RangeWeights {
  const m: RangeWeights = new Map();
  for (const [h, f] of Object.entries(spot.hands)) {
    const w = f[action] ?? 0;
    if (w > 0) m.set(h, w);
  }
  return m;
}

/** Toy river spot with a known equilibrium (P2-ENG-02). */
export const TOY_RIVER: SolverConfig = {
  oopRange: 'KK,99,66,87o', // sets (always win) + 8-high air (always loses)
  ipRange: 'JJ', // bluff-catcher
  board: 'Ks9d6c3h2s',
  startingPot: 100,
  effectiveStack: 100,
  flop: NO_BETS,
  turn: NO_BETS,
  river: sizes('100%', ''),
};
export const TOY_VALUE = ['KK', '99', '66'];
export const TOY_BLUFF = ['87o'];

/** BTN vs BB single-raised pot with Phase 1 ranges: BB (OOP) calls, BTN (IP) opened. */
export function btnVsBb(board: string, rfiBtn: SpotData, bbVsBtn: SpotData): SolverConfig {
  return {
    oopRange: rangeFromSpot(bbVsBtn, 'call'),
    ipRange: rangeFromSpot(rfiBtn, 'raise'),
    board,
    startingPot: 5.5,
    effectiveStack: 97.5,
    flop: sizes('33%', 'a'),
    turn: sizes('66%', 'a'),
    river: sizes('66%', 'a'),
  };
}
