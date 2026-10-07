import { Callout } from '../components/Callout';
import { HandExample } from '../components/HandExample';
import { RfiBars } from '../components/RfiBars';
import { hrefFor } from '../../lib/router';

export function OpeningLesson() {
  return (
    <>
      <p>
        When everyone before you has folded, you are the first to act voluntarily. This is called <strong>raise first in</strong>{' '}
        (RFI) or <strong>opening</strong>. You have two options in these charts: <strong>raise</strong> to 2.5bb (3bb from the small blind) or{' '}
        <strong>fold</strong>.
      </p>
      <Callout title="Raise or fold — never limp" tone="key">
        Raising gives you two ways to win: everyone folds right away (you win the blinds), or you play the pot as the
        aggressor. Just calling the big blind (“limping”) gives up the first way and invites the blinds in cheaply.
      </Callout>
      <h2>Ranges widen as the seats get later</h2>
      <RfiBars />
      <p>
        From UTG, five players are still to act, so somebody often has a strong hand: you open only good hands. On the button
        only the two blinds remain, and they will be out of position, so you can open almost half of all hands. The small
        blind opens wide too because only the big blind is left, but it will be out of position, so it doesn’t open more
        than the button.
      </p>
      <HandExample spotId="rfi-UTG" hand="K9o" note="UTG folds K9o: it is often dominated — players who continue often hold a better king such as AK, KQ or KJ, and when both players pair the king, the higher second card (the kicker) wins." />
      <HandExample spotId="rfi-BTN" hand="K9o" note="The button opens the same hand every time." />
      <h2>How the drill grades you</h2>
      <ul className="lesson-list">
        <li>
          <strong className="grade-word best">Best</strong> — the action the chart takes most often (ties are all Best).
        </li>
        <li>
          <strong className="grade-word ok">Acceptable mix</strong> — another action the chart takes at least 20% of the time.
        </li>
        <li>
          <strong className="grade-word mistake">Mistake</strong> — anything the chart takes less than 20% of the time.
        </li>
      </ul>
      <p>
        Best and Acceptable mix both count as correct in your stats. After every answer you see the chart’s exact
        frequencies, an explanation and (by default) the full range for the spot. You can also study any chart in the{' '}
        <a href={hrefFor('ranges', { spot: 'rfi-UTG' })}>range viewer</a>.
      </p>
    </>
  );
}
