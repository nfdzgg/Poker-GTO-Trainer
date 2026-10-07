import { PlayingCard } from '../../components/PlayingCard';
import { parseCard } from '../../lib/poker/cards';
import { Callout } from '../components/Callout';

const cards = (a: string, b: string) => (
  <span className="lesson-cards" aria-hidden="true">
    <PlayingCard card={parseCard(a)} width={44} />
    <PlayingCard card={parseCard(b)} width={44} />
  </span>
);

export function HandsLesson() {
  return (
    <>
      <p>
        There are 1,326 ways to be dealt two cards, but for strategy many of them are equivalent: A♠K♠ plays exactly like
        A♥K♥. So we group them into <strong>169 hand classes</strong> written in a short notation.
      </p>
      <div className="notation-examples">
        <div className="notation-example">
          {cards('Ah', 'Ad')}
          <p>
            <strong>AA</strong> — a <strong>pocket pair</strong>. 6 combinations.
          </p>
        </div>
        <div className="notation-example">
          {cards('Ks', 'Qs')}
          <p>
            <strong>KQs</strong> — <strong>suited</strong> (same suit). 4 combinations.
          </p>
        </div>
        <div className="notation-example">
          {cards('Th', '9c')}
          <p>
            <strong>T9o</strong> — <strong>offsuit</strong> (different suits). 12 combinations. “T” means ten.
          </p>
        </div>
      </div>
      <h2>Counting combos</h2>
      <p>
        Combos tell you how often a hand is dealt. A pair needs two of the four cards of one rank: 6 ways. A suited hand
        needs the same suit for both cards: 4 ways. An offsuit hand has 4 × 3 = 12 ways. That’s why there are three times as
        many AKo as AKs — and why ranges that include offsuit hands grow quickly.
      </p>
      <h2>The 13×13 grid</h2>
      <p>
        Every chart in this app is drawn on a 13×13 grid. Ranks run A, K, Q … 2 along both the rows and the columns. The{' '}
        <strong>diagonal</strong> holds the pairs, everything <strong>above</strong> it is suited and everything{' '}
        <strong>below</strong> it is offsuit. To find a hand, take the row of its higher card and the column of its lower
        card (or the other way round for offsuit hands).
      </p>
      <Callout title="Hand categories" tone="info">
        The drill describes hands by category: <em>premium</em> (AA–QQ, AK), <em>strong broadways</em> (AQ, AJ, KQs),{' '}
        <em>suited wheel aces</em> (A5s–A2s), <em>suited connectors</em> (T9s, 76s…), <em>small pairs</em> and so on. Each
        category tends to play the same way, which makes the charts much easier to remember.
      </Callout>
      <p>Try it: the quiz below has a grid colored by hand type.</p>
    </>
  );
}
