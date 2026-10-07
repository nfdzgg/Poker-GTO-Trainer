import { hrefFor } from '../../lib/router';
import { Callout } from '../components/Callout';

export function PostflopLesson() {
  return (
    <>
      <p>
        Everything so far happened before the flop, where charts work well because there are only 169 hand classes and a
        handful of situations. After the flop the number of situations explodes, so instead of charts you use a{' '}
        <strong>solver</strong>.
      </p>
      <h2>What the analyzer does</h2>
      <p>
        You describe a spot — both players’ ranges, the board, the pot, the stacks and which bet sizes are allowed — and the
        solver plays it against itself over and over (hundreds or thousands of iterations), adjusting both strategies until neither player can gain by changing
        theirs. Here it runs entirely in your browser.
      </p>
      <p>
        Its progress is measured in <strong>exploitability</strong>: how much a perfect opponent could still win against the
        current strategy, as a percentage of the pot. Under about 1% is very close to equilibrium.
      </p>
      <h2>How to study a spot</h2>
      <ol className="lesson-steps">
        <li>Load one of the built-in examples (flop, turn or river) and press Solve.</li>
        <li>Look at the whole range first: how often does each player bet or check?</li>
        <li>Click hands on the grid to see why: strong hands and bluffs bet, medium hands often check.</li>
        <li>Click actions to walk down the game tree, then press “Drill this spot” to practise it.</li>
      </ol>
      <Callout title="Preflop first" tone="info">
        Solving is slower on a single browser thread, especially on the flop. Get comfortable with preflop first — it decides
        which hands you take to the flop in the first place. <a href={hrefFor('analyzer')}>Open the analyzer</a> when you’re
        ready.
      </Callout>
    </>
  );
}
