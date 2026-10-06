// Pre-written explanation templates keyed on spot type and hand category.
import { categorize, CATEGORY_LABELS, type HandCategory } from './categories';
import { bestActions, gradeAction, type Grade } from './grading';
import { getSpot } from './spots';
import { ACTION_LABELS, ACTION_VERBS, POSITION_NAMES, type PreflopAction, type SpotData, type SpotType } from './types';

/** Why this kind of hand plays the way it does in this kind of spot. {hero}/{villain} are substituted. */
export const CATEGORY_TEMPLATES: Record<SpotType, Record<HandCategory, string>> = {
  rfi: {
    premium: 'Premium hands are always opened from {hero}: they win the most when called and are happy to face a 3-bet.',
    'strong-pair': 'Strong pairs open from every seat; they are well ahead of the hands that continue and play well against 3-bets.',
    'medium-pair': 'Medium pairs open from {hero} because they have showdown value and can flop sets; from the earliest seats the lowest of them start to mix.',
    'small-pair': 'Small pairs mostly win by flopping a set, so from {hero} they open more often the fewer players are left to act behind.',
    'strong-broadway': 'Strong broadways dominate the hands that call opens and make top pair with good kickers, so they open from {hero}.',
    broadway: 'Weaker broadways open when there are few players behind; from early seats they are often dominated by stronger aces and kings.',
    'suited-ace-blocker': 'Suited wheel aces open widely: they block the aces that 3-bet, make nut flushes and wheels, and are easy to fold to aggression.',
    'suited-ace': 'Suited aces open from most seats thanks to nut-flush potential, though the middle kickers mix from early position.',
    'offsuit-ace': 'Offsuit weak aces are dominated often; they only open from the later seats where fewer players can wake up with a better ace.',
    'suited-connector': 'Suited connectors realize equity well with straight and flush draws, so they open more as {hero} gets closer to the button.',
    'suited-gapper': 'Suited gappers have some straight and flush potential but less than connectors, so they open mainly from late position.',
    'suited-high-card': 'Suited kings and queens open from late seats where stealing the blinds matters; from early seats they are dominated too often.',
    'offsuit-connector': 'Offsuit connectors lack flush potential and are only worth opening from the latest seats.',
    'offsuit-high-card': 'Offsuit high-card hands make second-best pairs a lot, so they only open from late position.',
    trash: 'Weak, disconnected hands lose money even as a steal; with players left to act behind {hero} they are folded.',
  },
  'vs-open': {
    premium: 'Against an open from {villain}, premium hands 3-bet for value to build the pot while ahead.',
    'strong-pair': 'Strong pairs are ahead of most of the {villain} opening range and mix 3-bets for value with calls that keep weaker hands in.',
    'medium-pair': 'Medium pairs flat to see a flop and set-mine when the price is right, and fold when they would be squeezed or out of position too often.',
    'small-pair': 'Small pairs need implied odds; they call when getting a good price (especially in the big blind) and fold otherwise.',
    'strong-broadway': 'Strong broadways continue against {villain}: the best ones 3-bet, the rest call because they dominate many hands in the opening range.',
    broadway: 'Weaker broadways are often dominated by the {villain} range; they continue mainly in position or from the big blind with a discount.',
    'suited-ace-blocker': 'Suited wheel aces are classic 3-bet bluffs: they block the ace-x value hands in the {villain} range and keep equity when called.',
    'suited-ace': 'Suited aces have nut-flush playability and continue by calling in position or from the big blind, with some 3-bets.',
    'offsuit-ace': 'Offsuit weak aces are dominated by the ace-x in the {villain} range and mostly fold unless the big blind gets a discount.',
    'suited-connector': 'Suited connectors defend in position and from the big blind, and are sometimes 3-bet as bluffs with good playability.',
    'suited-gapper': 'Suited gappers defend mainly from the big blind, where the price is best, and fold from other seats.',
    'suited-high-card': 'Suited kings and queens defend from the big blind against later-position opens; elsewhere they are dominated too often.',
    'offsuit-connector': 'Offsuit connectors only defend from the big blind against wide opens, where the pot odds make up for poor playability.',
    'offsuit-high-card': 'Offsuit high-card hands are frequently dominated and mostly fold, except from the big blind against wide steals.',
    trash: 'Weak, disconnected hands have too little equity to continue against an open, even with a discount.',
  },
  'vs-3bet': {
    premium: 'Premium hands 4-bet for value against the {villain} 3-bet; they are ahead of the hands that continue.',
    'strong-pair': 'Strong pairs are too good to fold to a 3-bet and usually call to keep the {villain} bluffs in, with some 4-bets.',
    'medium-pair': 'Medium pairs call 3-bets when deep enough to set-mine, more often in position, and fold the weakest ones.',
    'small-pair': 'Small pairs face a 3-bet with poor odds; they continue mainly in position and otherwise fold.',
    'strong-broadway': 'Strong broadways continue against the {villain} 3-bet, mostly by calling, because they dominate many 3-bet bluffs.',
    broadway: 'Weaker broadways are dominated by the {villain} 3-bet value range and continue only in position or against wide 3-bets.',
    'suited-ace-blocker': 'Suited wheel aces are the standard 4-bet bluffs: they block aces and still have equity when called.',
    'suited-ace': 'Suited aces with middle kickers mostly continue only in position against wide 3-bets.',
    'offsuit-ace': 'Offsuit weak aces are dominated by the {villain} 3-bet range and fold almost always.',
    'suited-connector': 'Suited connectors call 3-bets in position when deep, but fold out of position against tight ranges.',
    'suited-gapper': 'Suited gappers lack the equity to continue against a 3-bet in most spots and are mostly folded.',
    'suited-high-card': 'Suited kings and queens continue against 3-bets only when the 3-bettor is wide and {hero} has position.',
    'offsuit-connector': 'Offsuit connectors have too little equity against a 3-bet range and fold.',
    'offsuit-high-card': 'Offsuit high-card hands are dominated by 3-bet ranges and fold.',
    trash: 'Weak hands that open as steals simply fold to a 3-bet.',
  },
};

/** What the main action accomplishes in this spot type. */
export const ACTION_LOGIC: Record<SpotType, Partial<Record<PreflopAction, string>>> = {
  rfi: {
    raise: 'Opening takes the initiative and can win the blinds immediately.',
    fold: 'Folding first in avoids playing a dominated hand out of position against the players behind.',
  },
  'vs-open': {
    '3bet': 'A 3-bet builds the pot with value hands or puts pressure on the opener with well-chosen bluffs.',
    call: 'Calling keeps the opener’s weaker hands in and realizes equity cheaply.',
    fold: 'Folding avoids playing a dominated or low-equity hand in a raised pot.',
  },
  'vs-3bet': {
    '4bet': 'A 4-bet either gets value from worse hands or folds out hands with more equity.',
    call: 'Calling the 3-bet keeps the 3-bettor’s bluffs in while controlling the pot size.',
    fold: 'Folding gives up the open but avoids a bloated pot with a hand that is behind the 3-bet range.',
  },
};

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function frequencySummary(spot: SpotData, hand: string): string {
  const f = spot.hands[hand] ?? {};
  return spot.actions.map((a) => `${ACTION_LABELS[a]} ${pct(f[a] ?? 0)}`).join(', ');
}

function heroInRange(spot: SpotData, hand: string): boolean {
  if (!spot.heroRangeSpot) return true;
  const rfi = getSpot(spot.heroRangeSpot);
  return !rfi || (rfi.hands[hand]?.raise ?? 0) > 0;
}

export interface Explanation {
  grade: Grade;
  text: string;
  category: HandCategory;
  best: PreflopAction[];
}

export function explain(spot: SpotData, hand: string, chosen: PreflopAction): Explanation {
  const f = spot.hands[hand] ?? {};
  const category = categorize(hand);
  const best = bestActions(f, spot.actions);
  const grade = gradeAction(f, spot.actions, chosen);
  const bestText = best.map((a) => `${ACTION_LABELS[a].toLowerCase()} (${pct(f[a] ?? 0)})`).join(' or ');
  const chosenLabel = ACTION_LABELS[chosen];
  const chosenPct = pct(f[chosen] ?? 0);

  const sub = (s: string) => s.replaceAll('{hero}', spot.hero).replaceAll('{villain}', spot.villain ?? 'the opener');
  const parts: string[] = [];
  parts.push(`${spot.description} You hold ${hand}, ${CATEGORY_LABELS[category]}, in the ${POSITION_NAMES[spot.hero]} (${spot.hero}).`);
  parts.push(`Chart frequencies for ${hand}: ${frequencySummary(spot, hand)}.`);

  if (grade === 'best') {
    parts.push(
      best.length > 1
        ? `${chosenLabel} is Best: it is tied for the most frequent action at ${chosenPct}.`
        : `${chosenLabel} is Best: it is the most frequent action at ${chosenPct}.`,
    );
  } else if (grade === 'acceptable') {
    parts.push(`${chosenLabel} is an Acceptable mix: it is played ${chosenPct} of the time, while the main line is to ${bestText}.`);
  } else if ((f[chosen] ?? 0) === 0) {
    parts.push(`${chosenLabel} is a Mistake: the chart never ${ACTION_VERBS[chosen]} ${hand} here; the correct play is to ${bestText}.`);
  } else {
    parts.push(
      `${chosenLabel} is a Mistake: it is used only ${chosenPct} of the time, below the 20% threshold for a mix; prefer to ${bestText}.`,
    );
  }

  if (!heroInRange(spot, hand)) {
    parts.push(`${hand} is not part of the ${spot.hero} opening range, so it should never face this 3-bet; the chart simply folds it.`);
  } else {
    parts.push(sub(CATEGORY_TEMPLATES[spot.type][category]));
    const logic = ACTION_LOGIC[spot.type][best[0]!];
    if (logic) parts.push(logic);
  }
  const played = spot.actions.filter((a) => (f[a] ?? 0) > 0);
  if (played.length > 1) parts.push('This is a mixed strategy: the solver is close to indifferent, so the listed frequencies are what matters.');
  return { grade, text: parts.join(' '), category, best };
}
