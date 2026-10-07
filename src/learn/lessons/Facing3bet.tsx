import { reachPercent } from '../../lib/preflop/facts';
import { getSpot } from '../../lib/preflop/spots';
import { Callout } from '../components/Callout';
import { HandExample } from '../components/HandExample';

export function Facing3betLesson() {
  const btnBb = getSpot('vs3bet-BTN-vs-BB')!;
  const utgBtn = getSpot('vs3bet-UTG-vs-BTN')!;
  const coBtn = getSpot('vs3bet-CO-vs-BTN')!;
  const cont = (s: typeof btnBb) => (100 - reachPercent(s, 'fold')).toFixed(0);
  return (
    <>
      <p>
        You opened and someone re-raised (3-bet). Now you choose between <strong>4-bet</strong>, <strong>call</strong> and{' '}
        <strong>fold</strong> — with the hands you opened, not all 169.
      </p>
      <h2>Continue with about half your range</h2>
      <p>
        A 3-bettor’s range is strong, and the pot is now big. In these charts the button continues with about{' '}
        <strong>{cont(btnBb)}%</strong> of its opening range against a big blind 3-bet, and UTG with about{' '}
        <strong>{cont(utgBtn)}%</strong> against a button 3-bet. Folding the rest isn’t weak — it’s correct.
      </p>
      <h2>Three groups of hands</h2>
      <ul className="lesson-list">
        <li>
          <strong>4-bet for value:</strong> the very best hands (QQ+, AK).
        </li>
        <li>
          <strong>4-bet as a bluff:</strong> a few suited wheel aces, for the same blocker reasons as before.
        </li>
        <li>
          <strong>Call:</strong> strong hands that play well after the flop — pairs, AQ, suited broadways, suited connectors in
          position.
        </li>
      </ul>
      <HandExample spotId="vs3bet-BTN-vs-BB" hand="KK" note="KK always 4-bets." />
      <HandExample spotId="vs3bet-BTN-vs-BB" hand="76s" note="76s mostly calls in position and sees a flop." />
      <HandExample spotId="vs3bet-UTG-vs-BTN" hand="AJo" note="UTG folds AJo: it is dominated by AQ/AK and out of position." />
      <h2>Position matters again</h2>
      <p>
        Out of position you continue tighter, because a big pot is hard to play when you act first. The cutoff, which is out
        of position against a button 3-bet, continues with only about <strong>{cont(coBtn)}%</strong> of its opens.
      </p>
      <Callout title="Rule of thumb" tone="key">
        4-bet the best hands and a few blockers, call hands that play well (more of them in position), and fold the bottom of
        your opening range without regret.
      </Callout>
    </>
  );
}
