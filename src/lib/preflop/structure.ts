// Shared spot structure (positions, sizes, pots) used by the range generator
// and tests. Sizings: open 2.5bb (SB 3bb), 3-bet 3x in position / 4x out of
// position, 4-bet 2.3x (rounded to 0.5bb).
import { POSITIONS, SPOT_ACTIONS, type Position, type SpotData, type SpotType } from './types';

const BLIND: Record<Position, number> = { UTG: 0, HJ: 0, CO: 0, BTN: 0, SB: 0.5, BB: 1 };

export const openSize = (p: Position) => (p === 'SB' ? 3 : 2.5);

/** Postflop: is `a` in position against `b`? Blinds act first postflop, except BB vs SB. */
export function inPosition(a: Position, b: Position): boolean {
  const order: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  return order.indexOf(a) > order.indexOf(b);
}

const round05 = (x: number) => Math.round(x * 2) / 2;

export function threeBetSize(opener: Position, threeBettor: Position): number {
  return round05(openSize(opener) * (inPosition(threeBettor, opener) ? 3 : 4));
}

export function fourBetSize(threeBet: number): number {
  return round05(threeBet * 2.3);
}

/** Total pot given each player's total commitment; folded blinds still count. */
function potWith(commit: Partial<Record<Position, number>>): number {
  let pot = 0;
  for (const p of POSITIONS) pot += Math.max(BLIND[p], commit[p] ?? 0);
  return pot;
}

export type SpotSkeleton = Omit<SpotData, 'hands'>;

export function spotId(type: SpotType, hero: Position, villain: Position | null): string {
  if (type === 'rfi') return `rfi-${hero}`;
  if (type === 'vs-open') return `vsopen-${hero}-vs-${villain}`;
  return `vs3bet-${hero}-vs-${villain}`;
}

export function buildSkeletons(): SpotSkeleton[] {
  const out: SpotSkeleton[] = [];
  const openers: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  for (const hero of openers) {
    out.push({
      id: spotId('rfi', hero, null),
      type: 'rfi',
      hero,
      villain: null,
      actions: SPOT_ACTIONS.rfi,
      heroInPosition: null,
      sizes: { open: openSize(hero) },
      pot: potWith({}),
      toCall: 0,
      heroRangeSpot: null,
      description: `Folded to ${hero}. ${hero} can raise to ${openSize(hero)}bb or fold.`,
    });
  }
  for (const opener of openers) {
    const behind = POSITIONS.slice(POSITIONS.indexOf(opener) + 1);
    for (const hero of behind) {
      const open = openSize(opener);
      const tb = threeBetSize(opener, hero);
      out.push({
        id: spotId('vs-open', hero, opener),
        type: 'vs-open',
        hero,
        villain: opener,
        actions: SPOT_ACTIONS['vs-open'],
        heroInPosition: inPosition(hero, opener),
        sizes: { open, threeBet: tb },
        pot: potWith({ [opener]: open }),
        toCall: open - BLIND[hero],
        heroRangeSpot: null,
        description: `${opener} opens to ${open}bb and it is folded to ${hero}. ${hero} can 3-bet to ${tb}bb, call or fold.`,
      });
    }
  }
  for (const opener of openers) {
    const behind = POSITIONS.slice(POSITIONS.indexOf(opener) + 1);
    for (const tbr of behind) {
      const open = openSize(opener);
      const tb = threeBetSize(opener, tbr);
      const fb = fourBetSize(tb);
      out.push({
        id: spotId('vs-3bet', opener, tbr),
        type: 'vs-3bet',
        hero: opener,
        villain: tbr,
        actions: SPOT_ACTIONS['vs-3bet'],
        heroInPosition: inPosition(opener, tbr),
        sizes: { open, threeBet: tb, fourBet: fb },
        pot: potWith({ [opener]: open, [tbr]: tb }),
        toCall: tb - open,
        heroRangeSpot: spotId('rfi', opener, null),
        description: `${opener} opens to ${open}bb and ${tbr} 3-bets to ${tb}bb. ${opener} can 4-bet to ${fb}bb, call or fold.`,
      });
    }
  }
  return out;
}
