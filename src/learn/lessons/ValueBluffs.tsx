import { hrefFor } from '../../lib/router';
import { Callout } from '../components/Callout';
import { HandExample } from '../components/HandExample';

export function ValueBluffsLesson() {
  return (
    <>
      <p>
        Why would a chart re-raise with A5s but just call with a stronger-looking hand like AJs? Because good raising ranges
        contain two kinds of hands.
      </p>
      <h2>Value hands</h2>
      <p>
        <strong>Value</strong> hands raise because they are ahead of the hands that continue: AA, KK, QQ, AK. You want a
        bigger pot with them.
      </p>
      <h2>Bluffs (semi-bluffs)</h2>
      <p>
        If you only re-raised your value hands, good opponents would simply fold everything except their best hands. So the
        charts add some <strong>bluffs</strong>. The best bluffs have two properties:
      </p>
      <ul className="lesson-list">
        <li>
          <strong>Blockers:</strong> holding an ace makes it less likely the opponent has AA or AK, the hands that would
          punish you.
        </li>
        <li>
          <strong>Playability:</strong> when called, the hand can still make something strong — a wheel straight (A-2-3-4-5)
          or the nut flush.
        </li>
      </ul>
      <p>That is exactly what suited wheel aces (A5s–A2s) and some suited connectors offer.</p>
      <HandExample spotId="vsopen-BB-vs-BTN" hand="A5s" note="A5s is mostly a 3-bet bluff from the big blind, sometimes a call." />
      <HandExample spotId="vsopen-BB-vs-BTN" hand="AA" note="AA always 3-bets for value." />
      <h2>Reading mixed strategies</h2>
      <p>
        When a hand shows “3-bet 60% · call 40%”, both actions are about equally profitable. Solvers mix to keep both ranges
        (3-bets and calls) strong enough that opponents can’t easily read you. You don’t need a random-number generator: play
        the main action most of the time and the other one sometimes.
      </p>
      <Callout title="How mixes are graded" tone="key">
        The most frequent action is <strong>Best</strong>. Any other action the chart uses at least 20% of the time is an{' '}
        <strong>Acceptable mix</strong> and also counts as correct. So with A5s above, both 3-bet and call are fine.
      </Callout>
      <p className="muted small">
        Tip: in the <a href={hrefFor('ranges', { spot: 'vsopen-BB-vs-BTN' })}>range viewer</a>, cells with several colors are the
        mixed hands.
      </p>
    </>
  );
}
