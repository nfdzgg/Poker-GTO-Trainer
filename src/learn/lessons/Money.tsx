import { getSpot } from '../../lib/preflop/spots';
import { Callout } from '../components/Callout';

export function MoneyLesson() {
  const bb = getSpot('vsopen-BB-vs-BTN')!;
  const btn = getSpot('vsopen-BTN-vs-CO')!;
  const vs3 = getSpot('vs3bet-CO-vs-BTN')!;
  const odds = (s: typeof bb) => Math.round((s.toCall / (s.pot + s.toCall)) * 100);
  return (
    <>
      <p>
        Poker decisions are about prices. This lesson gives you the standard bet sizes the charts assume and one formula you
        will use for the rest of your poker life: <strong>pot odds</strong>.
      </p>
      <h2>Standard sizes in these charts</h2>
      <div className="table-scroll">
        <table className="stat-table sizes-table">
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Size</th>
              <th scope="col">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Open (first raise)</th>
              <td>2.5bb (3bb from the small blind)</td>
              <td>CO raises to 2.5bb</td>
            </tr>
            <tr>
              <th scope="row">3-bet (re-raise)</th>
              <td>about 3× in position, 4× out of position</td>
              <td>
                BTN 3-bets to {btn.sizes.threeBet}bb; BB 3-bets to {bb.sizes.threeBet}bb
              </td>
            </tr>
            <tr>
              <th scope="row">4-bet</th>
              <td>about 2.3× the 3-bet</td>
              <td>
                CO 4-bets to {vs3.sizes.fourBet}bb over a {vs3.sizes.threeBet}bb 3-bet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The pot is everything already put in, including the blinds. If UTG opens to 2.5bb and everyone folds to you, the
        pot is 0.5 + 1 + 2.5 = <strong>4bb</strong>.
      </p>
      <h2>Pot odds</h2>
      <p>
        Calling costs something and wins the pot if you end up with the best hand. The share of the final pot you are paying
        is the share of the time you need to win (your <strong>equity</strong>) just to break even:
      </p>
      <p className="formula">equity needed = amount to call ÷ (pot + amount to call)</p>
      <ul className="lesson-list">
        <li>
          Big blind facing a button open: call {bb.toCall}bb more into {bb.pot}bb → {bb.toCall} ÷ {bb.pot + bb.toCall} ={' '}
          <strong>{odds(bb)}%</strong>.
        </li>
        <li>
          Button facing a cutoff open: call {btn.toCall}bb into {btn.pot}bb → <strong>{odds(btn)}%</strong>.
        </li>
        <li>
          Cutoff facing a 3-bet from the button: call {vs3.toCall}bb into {vs3.pot}bb → <strong>{odds(vs3)}%</strong>.
        </li>
      </ul>
      <Callout title="Equity isn’t everything" tone="info">
        Pot odds tell you the minimum. Position, how easy a hand is to play and whether you can be raised again also matter,
        which is why the charts fold some hands that “have the odds” and play others that don’t. The drill’s Spot info panel
        always shows the price for you.
      </Callout>
    </>
  );
}
