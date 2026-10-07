// Spot information for the drill's "Spot info" panel. Everything here describes the
// spot (positions, prices, range widths) and the hand's category — never the chart's
// answer for the dealt hand.
import { comboCount, HAND_LABELS } from '../poker/hands';
import { CATEGORY_LABELS, categorize, type HandCategory } from './categories';
import { reachWeight } from './drill';
import { getSpot } from './spots';
import { inPosition } from './structure';
import { ACTION_LABELS, POSITION_NAMES, POSITIONS, type Position, type PreflopAction, type SpotData } from './types';
import { actionPercent } from './validate';

/** Percentage of hero's range at this spot taking `action`, weighted by combos and by the
 * chance hero holds the hand here (for facing-3-bet spots: % of hero's opening range). */
export function reachPercent(spot: SpotData, action: PreflopAction): number {
  let num = 0;
  let den = 0;
  for (const h of HAND_LABELS) {
    const w = reachWeight(spot, h) * comboCount(h);
    den += w;
    num += w * (spot.hands[h]?.[action] ?? 0);
  }
  return den > 0 ? (num / den) * 100 : 0;
}

export interface SpotOption {
  action: PreflopAction;
  label: string; // e.g. "3-bet to 10bb", "Call 1.5bb more"
}

export interface SpotFacts {
  spotId: string;
  hero: Position;
  heroName: string;
  villain: Position | null;
  /** Postflop position, in words. */
  positionNote: string;
  /** Players who have not acted yet and are still to act behind hero. */
  playersBehind: Position[];
  pot: number;
  toCall: number;
  /** Equity needed to call: toCall / (pot + toCall); null when there is nothing to call. */
  potOdds: number | null;
  potAfterCall: number | null;
  effectiveStack: number;
  options: SpotOption[];
  /** How wide the opponent's range is at this point, if anyone has acted. */
  villainRange: { text: string; percent: number } | null;
  /** Hero's chart range for the spot (reach-weighted), per action. */
  heroRange: { action: PreflopAction; label: string; percent: number }[];
  /** What heroRange percentages are a share of. */
  rangeBase: 'all hands' | 'your opening range';
  hand: { label: string; category: HandCategory; categoryLabel: string; combos: number };
  tip: string;
}

const fmt = (x: number) => Number(x.toFixed(2)).toString();

function optionLabel(spot: SpotData, a: PreflopAction): string {
  switch (a) {
    case 'raise':
      return `Raise to ${fmt(spot.sizes.open)}bb`;
    case '3bet':
      return `3-bet to ${fmt(spot.sizes.threeBet ?? 0)}bb`;
    case '4bet':
      return `4-bet to ${fmt(spot.sizes.fourBet ?? 0)}bb`;
    case 'call':
      return `Call ${fmt(spot.toCall)}bb more`;
    default:
      return 'Fold';
  }
}

function playersBehind(spot: SpotData): Position[] {
  if (spot.type === 'vs-3bet') return []; // everyone else has folded
  return POSITIONS.slice(POSITIONS.indexOf(spot.hero) + 1);
}

function positionNote(spot: SpotData, behind: Position[]): string {
  if (spot.type !== 'rfi' && spot.villain) {
    return spot.heroInPosition
      ? `You will be in position against ${spot.villain} after the flop (you act last).`
      : `You will be out of position against ${spot.villain} after the flop (you act first).`;
  }
  const withPosition = behind.filter((p) => inPosition(p, spot.hero));
  if (withPosition.length === 0) return 'Nobody left to act can have position on you after the flop.';
  if (spot.hero === 'SB') return 'Only the big blind is left, and they would have position on you after the flop.';
  return `${withPosition.join(', ')} would have position on you after the flop; the blinds would not.`;
}

function villainRange(spot: SpotData): SpotFacts['villainRange'] {
  if (!spot.villain) return null;
  if (spot.type === 'vs-open') {
    const rfi = getSpot(`rfi-${spot.villain}`);
    if (!rfi) return null;
    const p = actionPercent(rfi, 'raise');
    return { percent: p, text: `${spot.villain} opens about ${p.toFixed(0)}% of hands from this seat` };
  }
  const tb = getSpot(`vsopen-${spot.villain}-vs-${spot.hero}`);
  if (!tb) return null;
  const p = actionPercent(tb, '3bet');
  return { percent: p, text: `${spot.villain} 3-bets about ${p.toFixed(1)}% of hands against a ${spot.hero} open` };
}

function tip(spot: SpotData, heroRange: SpotFacts['heroRange']): string {
  if (spot.type === 'rfi') {
    return 'Raise or fold — never limp. The fewer players left behind you, the wider you can open.';
  }
  if (spot.type === 'vs-open') {
    if (spot.hero === 'BB') return 'You already have 1bb in and close the action, so the price is good: defend widely, mostly by calling.';
    if (spot.hero === 'SB') return 'From the small blind you are out of position against everyone: mostly 3-bet or fold, rarely call.';
    return 'In position you can call more; 3-bet your strongest hands plus a few suited aces that block the opener’s best hands.';
  }
  const cont = heroRange.filter((r) => r.action !== 'fold').reduce((a, r) => a + r.percent, 0);
  return `About ${cont.toFixed(0)}% of your opening range continues here: 4-bet the strongest hands and a few blockers, call hands that play well, fold the rest.`;
}

export function spotFacts(spot: SpotData, hand: string): SpotFacts {
  const behind = playersBehind(spot);
  const heroRange = spot.actions.map((a) => ({ action: a, label: ACTION_LABELS[a], percent: reachPercent(spot, a) }));
  const category = categorize(hand);
  const potOdds = spot.toCall > 0 ? spot.toCall / (spot.pot + spot.toCall) : null;
  return {
    spotId: spot.id,
    hero: spot.hero,
    heroName: POSITION_NAMES[spot.hero],
    villain: spot.villain,
    positionNote: positionNote(spot, behind),
    playersBehind: behind,
    pot: spot.pot,
    toCall: spot.toCall,
    potOdds,
    potAfterCall: spot.toCall > 0 ? spot.pot + spot.toCall : null,
    effectiveStack: 100,
    options: spot.actions.map((a) => ({ action: a, label: optionLabel(spot, a) })),
    villainRange: villainRange(spot),
    heroRange,
    rangeBase: spot.heroRangeSpot ? 'your opening range' : 'all hands',
    hand: { label: hand, category, categoryLabel: CATEGORY_LABELS[category], combos: comboCount(hand) },
    tip: tip(spot, heroRange),
  };
}
