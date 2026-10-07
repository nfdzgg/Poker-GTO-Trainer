// Course quiz questions. Answers that depend on the preflop charts are computed from the
// chart data at load time, so they can never drift from what the drill grades against.
import { comboCount } from '../lib/poker/hands';
import { reachPercent } from '../lib/preflop/facts';
import { gradeAction, GRADE_LABELS } from '../lib/preflop/grading';
import { getSpot } from '../lib/preflop/spots';
import { inPosition } from '../lib/preflop/structure';
import { ACTION_LABELS, type PreflopAction, type SpotData } from '../lib/preflop/types';
import { actionPercent } from '../lib/preflop/validate';

export interface ChoiceQuestion {
  kind: 'choice';
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface GridQuestion {
  kind: 'grid';
  id: string;
  prompt: string;
  isCorrect: (hand: string) => boolean;
  /** Short description of the right answer, shown with the explanation. */
  answer: string;
  explain: string;
  /** Color the grid by hand kind (pairs / suited / offsuit) as a visual aid. */
  showKinds?: boolean;
}

export type Question = ChoiceQuestion | GridQuestion;

const spot = (id: string): SpotData => {
  const s = getSpot(id);
  if (!s) throw new Error(`missing spot ${id}`);
  return s;
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "Always …" / "Mix …" / "Never …" description of one action's frequency. */
export function describeFreq(f: number): 'always' | 'mix' | 'never' {
  if (f >= 0.999) return 'always';
  if (f <= 0.001) return 'never';
  return 'mix';
}

/** The chart's main (highest-frequency) action for a hand. */
export function mainAction(s: SpotData, hand: string): PreflopAction {
  const f = s.hands[hand] ?? {};
  return s.actions.reduce((best, a) => ((f[a] ?? 0) > (f[best] ?? 0) ? a : best), s.actions[0]!);
}

function choice(id: string, prompt: string, options: string[], correctText: string, explain: string): ChoiceQuestion {
  const correct = options.indexOf(correctText);
  if (correct < 0) throw new Error(`question ${id}: correct answer "${correctText}" is not an option`);
  return { kind: 'choice', id, prompt, options, correct, explain };
}

// ----- data-derived facts used by the questions -------------------------------------------
const OPENERS = ['UTG', 'HJ', 'CO', 'BTN'] as const;
const widestOpener = OPENERS.reduce((a, b) => (actionPercent(spot(`rfi-${b}`), 'raise') > actionPercent(spot(`rfi-${a}`), 'raise') ? b : a));
const k9oUtg = describeFreq(spot('rfi-UTG').hands['K9o']!.raise ?? 0);
const a7sUtg = spot('rfi-UTG').hands['A7s']!;
const a7sGrade = gradeAction(a7sUtg, spot('rfi-UTG').actions, 'fold');
const bbVsBtn = spot('vsopen-BB-vs-BTN');
const sbVsBtn = spot('vsopen-SB-vs-BTN');
const potOddsBb = bbVsBtn.toCall / (bbVsBtn.pot + bbVsBtn.toCall);
const a5sBb = bbVsBtn.hands['A5s']!;
const a5sCallGrade = gradeAction(a5sBb, bbVsBtn.actions, 'call');
const btnVsBb3 = spot('vs3bet-BTN-vs-BB');
const btnContinue = 100 - reachPercent(btnVsBb3, 'fold');
const share = (p: number) => (p < 35 ? 'About a quarter' : p <= 65 ? 'About half' : 'Almost all of it');
const actionWord = (a: PreflopAction) => ACTION_LABELS[a];

export const QUIZZES: Record<string, Question[]> = {
  welcome: [
    choice(
      'welcome-gto',
      'Which description fits a GTO (game-theory-optimal) strategy best?',
      ['The strategy that wins the most against every player', 'A balanced strategy that an opponent cannot exploit, even if they know it', 'Always betting your strongest hands and never bluffing', 'Copying what the best professionals do'],
      'A balanced strategy that an opponent cannot exploit, even if they know it',
      'A GTO strategy is a defensive baseline: nobody can beat it by adjusting to it. Against weak players you can sometimes win more by deviating, but you need the baseline first to know what a deviation is.',
    ),
    choice(
      'welcome-charts',
      'What does the preflop drill grade your answers against?',
      ['Hand-written approximations of published solver charts', 'Live results from online games', 'Whatever most players do', 'Random answers'],
      'Hand-written approximations of published solver charts',
      'The 35 charts were written by hand to approximate solver output for 6-max, 100bb cash games. They are a solid baseline, not exact solver output.',
    ),
    choice(
      'welcome-path',
      'What is the best way to use this trainer?',
      ['Memorise all 35 charts before trying a drill', 'Go straight to the postflop solver', 'Course → drill each spot type → check the ranges → fix your leaks', 'Guess in the drill until you get lucky'],
      'Course → drill each spot type → check the ranges → fix your leaks',
      'Learn what each decision is about, practise one spot type at a time with a clear target, review the range when you miss, and let the stats tell you what to work on next.',
    ),
  ],
  table: [
    choice('table-first-preflop', 'Who acts first before the flop (preflop) at a 6-max table?', ['Small blind', 'Big blind', 'Under the gun (UTG)', 'Button'], 'Under the gun (UTG)', 'Preflop, the action starts to the left of the big blind: UTG, then HJ, CO, BTN, SB and finally the BB.'),
    choice('table-first-postflop', 'After the flop, which player still in the hand acts first?', ['The button', 'The small blind (or the next player to its left still in the hand)', 'Whoever raised preflop', 'UTG, always'], 'The small blind (or the next player to its left still in the hand)', 'From the flop on, action starts with the first player still in the hand to the left of the button. That is why the blinds are out of position after the flop and the button always acts last.'),
    choice(
      'table-btn-bb',
      'The button opens and the big blind calls. Who is in position after the flop?',
      ['The button', 'The big blind'],
      inPosition('BTN', 'BB') ? 'The button' : 'The big blind',
      'Being in position means acting last on every later street, so you see what your opponent does before you decide. The button is in position against everyone.',
    ),
    choice('table-blinds', 'How big are the blinds in this trainer?', ['Small blind 1bb, big blind 2bb', 'Small blind 0.5bb, big blind 1bb', 'There are no blinds, only antes', 'Both blinds post 1bb'], 'Small blind 0.5bb, big blind 1bb', 'Everything is measured in big blinds (bb): the small blind posts half a big blind and the big blind posts one. Stacks start at 100bb.'),
  ],
  hands: [
    choice('hands-aks', 'How many different card combinations make AKs (ace-king suited)?', ['4', '6', '12', '16'], String(comboCount('AKs')), 'A suited hand needs both cards in the same suit, and there are 4 suits, so there are 4 combos. Offsuit hands have 12 and pocket pairs have 6.'),
    choice('hands-pair', 'How many combinations of a pocket pair like 77 are there?', ['4', '6', '12'], String(comboCount('77')), 'Pick 2 of the four sevens: 4 × 3 ÷ 2 = 6 combos. Pairs are rarer than they look on the grid.'),
    {
      kind: 'grid',
      id: 'hands-tap-76s',
      prompt: 'Tap 76s (seven-six suited) on the grid. Pairs are on the diagonal, suited hands above it, offsuit hands below it.',
      isCorrect: (h) => h === '76s',
      answer: '76s is in the 7 row, under the 6 column, above the diagonal',
      explain: 'Read the row for the higher card and the column for the lower card. Above the diagonal the hand is suited ("s"), below it offsuit ("o").',
      showKinds: true,
    },
    choice('hands-offsuit', 'Where are the offsuit hands on the 13×13 grid?', ['Above the diagonal', 'On the diagonal', 'Below the diagonal'], 'Below the diagonal', 'Pairs sit on the diagonal, suited hands above it and offsuit hands below it. The same hand (for example AK) appears twice: AKs above, AKo below.'),
  ],
  money: [
    choice('money-pot', 'UTG opens to 2.5bb and everyone folds to you on the button. How big is the pot now?', ['2.5bb', '3.5bb', '4bb', '5bb'], `${spot('vsopen-BTN-vs-UTG').pot}bb`, 'Small blind 0.5 + big blind 1 + the 2.5bb open = 4bb.'),
    choice('money-tocall', 'You are in the big blind and the button opens to 2.5bb. How much more do you need to put in to call?', ['1bb', '1.5bb', '2.5bb'], `${bbVsBtn.toCall}bb`, 'You already have 1bb in the pot as the big blind, so calling costs only 1.5bb more.'),
    choice(
      'money-odds',
      `You must call ${bbVsBtn.toCall}bb to win a pot of ${bbVsBtn.pot}bb. How much equity (share of the pot) do you need for the call to break even?`,
      ['15%', `${Math.round(potOddsBb * 100)}%`, '37%', '50%'],
      `${Math.round(potOddsBb * 100)}%`,
      `Pot odds = what you pay ÷ (pot + what you pay) = ${bbVsBtn.toCall} ÷ ${bbVsBtn.pot + bbVsBtn.toCall} ≈ ${pct(potOddsBb)}. That cheap price is why the big blind defends so many hands.`,
    ),
    choice('money-3bet', 'In this trainer, how big is a 3-bet made out of position (from the blinds) compared with the open?', ['About 2×', 'About 4×', 'About 10×'], `About ${bbVsBtn.sizes.threeBet! / bbVsBtn.sizes.open}×`, 'Out of position you 3-bet bigger (about 4× the open, e.g. 10bb against 2.5bb) because you will have to play the rest of the hand without position. In position it is about 3×.'),
  ],
  opening: [
    choice('opening-widest', 'Which seat opens the widest range when everyone has folded to it (UTG, HJ, CO or BTN)?', ['UTG', 'HJ', 'CO', 'BTN'], widestOpener, 'The later your seat, the fewer players are left behind you who could have a strong hand, so you can open more hands. The button only has the two blinds left to beat, and they will play out of position.'),
    choice(
      'opening-k9o',
      'The button always opens K9o. What does the UTG chart do with K9o?',
      ['Always raise', 'Mix raise and fold', 'Always fold'],
      k9oUtg === 'always' ? 'Always raise' : k9oUtg === 'mix' ? 'Mix raise and fold' : 'Always fold',
      'From UTG five players are still to act, and K9o is often dominated by the hands that continue (AK, KQ, KJ…). The same hand is a profitable open from the button.',
    ),
    choice(
      'opening-grade',
      `The UTG chart raises A7s ${pct(a7sUtg.raise ?? 0)} of the time and folds it ${pct(a7sUtg.fold ?? 0)}. You fold. How does the drill grade that?`,
      ['Best', 'Acceptable mix', 'Mistake'],
      GRADE_LABELS[a7sGrade],
      'The most frequent action is Best. Any other action the chart takes at least 20% of the time is an Acceptable mix — both count as correct. Below 20% it is a Mistake.',
    ),
    choice('opening-limp', 'Folded to you before the flop, should you ever just call the big blind (limp)?', ['Yes, with small pairs', 'No: in these charts you raise or fold', 'Yes, from the small blind always'], 'No: in these charts you raise or fold', 'Raising first gives you two ways to win: everyone folds now, or you play the pot with the initiative. These charts never limp, so the drill only offers Raise or Fold here.'),
  ],
  'facing-open': [
    choice(
      'open-98o-bb',
      'The button opens to 2.5bb and you are in the big blind with 98o. What does the chart do?',
      ['3-bet', 'Call', 'Fold'],
      actionWord(mainAction(bbVsBtn, '98o')),
      'You close the action and only need about a quarter of the pot, so even modest hands with some playability are profitable calls in the big blind against a wide button range.',
    ),
    choice(
      'open-22-sb-bb',
      'Pocket twos (22) against a button open: what does the chart do from the small blind, and from the big blind?',
      ['Fold in both', 'Call in both', 'Fold in the small blind, call in the big blind', '3-bet in both'],
      (() => {
        const sb = mainAction(sbVsBtn, '22');
        const bb = mainAction(bbVsBtn, '22');
        if (sb === 'fold' && bb === 'call') return 'Fold in the small blind, call in the big blind';
        if (sb === 'fold' && bb === 'fold') return 'Fold in both';
        if (sb === 'call' && bb === 'call') return 'Call in both';
        return '3-bet in both';
      })(),
      'The small blind has to put in more, is out of position and can be squeezed by the big blind, so it plays mostly 3-bet-or-fold. The big blind gets the best price and closes the action.',
    ),
    choice(
      'open-who-calls',
      'Against a button open, who calls more often?',
      ['The big blind', 'The small blind'],
      reachPercent(bbVsBtn, 'call') > reachPercent(sbVsBtn, 'call') ? 'The big blind' : 'The small blind',
      `In these charts the big blind calls about ${reachPercent(bbVsBtn, 'call').toFixed(0)}% of hands against a button open; the small blind calls only about ${reachPercent(sbVsBtn, 'call').toFixed(1)}% and 3-bets or folds the rest.`,
    ),
    choice('open-why-bb', 'Why does the big blind defend so many hands?', ['The big blind is always the strongest seat', 'It already has 1bb in the pot and closes the action, so the price is good', 'Folding the big blind is not allowed'], 'It already has 1bb in the pot and closes the action, so the price is good', 'Paying 1.5bb to win 4bb is a great price, and nobody can raise behind you. You still play out of position after the flop, so the very worst hands still fold.'),
  ],
  'value-bluffs': [
    choice(
      'vb-bluff',
      'As the big blind against a button open, which of these hands does the chart 3-bet most often?',
      ['K5o', 'A5s', '98o', '22'],
      ['K5o', 'A5s', '98o', '22'].reduce((a, b) => ((bbVsBtn.hands[b]!['3bet'] ?? 0) > (bbVsBtn.hands[a]!['3bet'] ?? 0) ? b : a)),
      'A5s is a classic 3-bet bluff: the ace makes it less likely the opener has AA or AK, and when called it can still make wheels and nut flushes. The other hands are better as calls.',
    ),
    choice('vb-why-a5s', 'Why are suited wheel aces (A2s–A5s) popular bluffs?', ['They block the opponent’s best aces and keep good equity when called', 'They are among the strongest hands', 'Opponents always fold to them'], 'They block the opponent’s best aces and keep good equity when called', 'Good bluffs remove some of the opponent’s strong hands (blockers) and can still win when called. Hands that are too good to fold, like AQ, make better calls than bluffs.'),
    choice(
      'vb-grade-a5s',
      `Big blind against a button open: the chart plays A5s as 3-bet ${pct(a5sBb['3bet'] ?? 0)} and call ${pct(a5sBb.call ?? 0)}. You call. How is that graded?`,
      ['Best', 'Acceptable mix', 'Mistake'],
      GRADE_LABELS[a5sCallGrade],
      'Calling is not the most frequent action, but the chart uses it more than 20% of the time, so it is an Acceptable mix and counts as correct.',
    ),
    choice('vb-mixed', 'What does a mixed frequency like "3-bet 60%, call 40%" mean?', ['The chart is unsure', 'Alternate the two actions exactly every other time', 'Both actions are about equally profitable; mixing keeps your range balanced'], 'Both actions are about equally profitable; mixing keeps your range balanced', 'When a hand is mixed, the solver is close to indifferent between the actions. Mixing in roughly those proportions keeps your 3-bets and calls both containing strong hands, so you are hard to read.'),
  ],
  'facing-3bet': [
    choice(
      '3b-value',
      'You open on the button and the big blind 3-bets. Which of these hands does the chart 4-bet every time?',
      ['AJo', '76s', '22', 'KK'],
      ['AJo', '76s', '22', 'KK'].find((h) => describeFreq(btnVsBb3.hands[h]!['4bet'] ?? 0) === 'always') ?? 'KK',
      'The best hands (QQ+, AK) 4-bet for value. Hands like AJo, 76s and small pairs prefer to call in position and see a flop.',
    ),
    choice(
      '3b-ajo',
      'UTG opens and the button 3-bets. What does the UTG chart do with AJo?',
      ['4-bet', 'Call', 'Fold'],
      actionWord(mainAction(spot('vs3bet-UTG-vs-BTN'), 'AJo')),
      'UTG opened a strong range and the 3-bettor is strong too. AJo is dominated by AQ and AK and has to play out of position, so it folds.',
    ),
    choice(
      '3b-share',
      'Roughly how much of the button’s opening range continues (calls or 4-bets) against a big blind 3-bet?',
      ['About a quarter', 'About half', 'Almost all of it'],
      share(btnContinue),
      `In these charts the button continues with about ${btnContinue.toFixed(0)}% of the hands it opened. Folding the rest is fine: the 3-bettor’s range is much stronger than a random open.`,
    ),
    choice('3b-oop', 'Why do openers fold more to a 3-bet when they will be out of position?', ['Playing a bigger pot without position is harder, so only stronger hands continue', 'Out of position you cannot call', 'The 3-bet is always smaller'], 'Playing a bigger pot without position is harder, so only stronger hands continue', 'After a 3-bet the pot is large and the stacks are shallower relative to it. Acting first on every street makes marginal hands hard to play, so out of position you continue tighter.'),
  ],
  practice: [
    choice('practice-next', 'After 30 hands your accuracy as the big blind facing opens is 60%. What is the best next step?', ['Move on to postflop', 'Reset your stats and start over', 'Drill “facing an open” from the big blind, review the range after each answer, until you are above 80%'], 'Drill “facing an open” from the big blind, review the range after each answer, until you are above 80%', 'Practise the weak spot on purpose. Seeing the full range right after each answer shows you which hands you misjudged.'),
    choice('practice-always', 'What does the “Always” range setting in the drill do?', ['Hides the explanation', 'Shows the range while you decide; those answers are practice and are not graded', 'Makes the drill harder'], 'Shows the range while you decide; those answers are practice and are not graded', 'Open-book practice is great for learning a new spot. Switch back to “After I answer” to test yourself for real.'),
    choice('practice-good', 'What counts as “good enough” to move on to the next stage of your practice plan?', ['A perfect score with no mistakes', 'Any five correct answers in a row', 'About 80–85% correct over your recent hands of that spot type'], 'About 80–85% correct over your recent hands of that spot type', 'Mixed hands make 100% unrealistic and unnecessary. Consistently above the target over a few dozen hands means the spot is learned.'),
  ],
  postflop: [
    choice('pf-solver', 'What does a poker solver do?', ['Predicts the next card', 'Finds strategies for both players that neither can improve on', 'Reads your opponent’s tells'], 'Finds strategies for both players that neither can improve on', 'A solver plays the spot against itself over and over and adjusts both players until neither can gain by changing strategy (an equilibrium).'),
    choice('pf-expl', 'A solve finishes at an exploitability of 0.5% of the pot. What does that mean?', ['You win 0.5% of the time', 'The solve is 0.5% complete', 'A perfect opponent could gain at most about 0.5% of the pot against it'], 'A perfect opponent could gain at most about 0.5% of the pot against it', 'Exploitability measures how far from equilibrium the strategy still is. Lower is better; under 1% of the pot is very close.'),
    choice('pf-why-preflop', 'Why learn preflop before postflop?', ['Postflop does not matter', 'Every hand starts preflop, and good preflop ranges make postflop decisions easier', 'The solver needs your preflop stats'], 'Every hand starts preflop, and good preflop ranges make postflop decisions easier', 'Your preflop choices decide which hands you take to the flop. With sound ranges you reach easier, more profitable postflop spots.'),
  ],
};

/** Hands that satisfy a grid question (used by tests and the "show answer" button). */
export function gridAnswers(q: GridQuestion, hands: readonly string[]): string[] {
  return hands.filter((h) => q.isCorrect(h));
}

