import { reachPercent } from '../../lib/preflop/facts';
import { getSpot } from '../../lib/preflop/spots';
import { Callout } from '../components/Callout';
import { HandExample } from '../components/HandExample';

export function FacingOpenLesson() {
  const bb = getSpot('vsopen-BB-vs-BTN')!;
  const sb = getSpot('vsopen-SB-vs-BTN')!;
  const vsUtg = getSpot('vsopen-BTN-vs-UTG')!;
  const vsCo = getSpot('vsopen-BTN-vs-CO')!;
  const cont = (s: typeof bb) => (100 - reachPercent(s, 'fold')).toFixed(0);
  return (
    <>
      <p>
        Someone has opened before you. Now you have three options: <strong>3-bet</strong> (re-raise),{' '}
        <strong>call</strong>, or <strong>fold</strong>. The questions to ask are: how strong is the opener’s range, will I
        have position after the flop, and what is the price?
      </p>
      <h2>1. Respect early opens</h2>
      <p>
        An UTG open is a strong range, so you continue with fewer hands against it. On the button the charts continue with
        about <strong>{cont(vsUtg)}%</strong> of hands against an UTG open, but about <strong>{cont(vsCo)}%</strong> against
        a cutoff open.
      </p>
      <h2>2. In position you can call more</h2>
      <p>
        Calling in position (for example on the button) is comfortable because you act last on every street. Out of position
        it is harder, so hands that aren’t strong enough to 3-bet often fold instead.
      </p>
      <h2>3. The big blind gets a discount</h2>
      <p>
        The big blind already has 1bb in and closes the action (nobody can raise behind). Against a button open it only needs
        about {Math.round((bb.toCall / (bb.pot + bb.toCall)) * 100)}% equity to call, so it defends about{' '}
        <strong>{cont(bb)}%</strong> of hands, mostly by calling.
      </p>
      <HandExample spotId="vsopen-BB-vs-BTN" hand="98o" note="Even a weak-looking hand like 98o is a call in the big blind against a button open." />
      <h2>4. The small blind plays 3-bet or fold</h2>
      <p>
        The small blind is out of position against everyone and can still be squeezed by the big blind, so it rarely calls:
        about {reachPercent(sb, 'call').toFixed(1)}% of hands against a button open, while it 3-bets about{' '}
        {reachPercent(sb, '3bet').toFixed(0)}%.
      </p>
      <HandExample spotId="vsopen-SB-vs-BTN" hand="22" note="Small pairs fold in the small blind…" />
      <HandExample spotId="vsopen-BB-vs-BTN" hand="22" note="…but call in the big blind, where the price is better." />
      <Callout title="Rule of thumb" tone="key">
        Tighter against early seats, more calls in position, a wide big blind defence and a 3-bet-or-fold small blind.
      </Callout>
    </>
  );
}
