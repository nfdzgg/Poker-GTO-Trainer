import { hrefFor } from '../../lib/router';
import { Callout } from '../components/Callout';

export function PracticeLesson() {
  return (
    <>
      <p>
        You now know what every drill decision is about. The fastest way to improve is <strong>deliberate practice</strong>:
        one spot type at a time, a clear target, and feedback on every mistake.
      </p>
      <h2>A good drill session</h2>
      <ol className="lesson-steps">
        <li>
          Pick <strong>one spot type</strong> (and maybe one seat) with the drill filters, or start from your practice plan,
          which sets them for you and shows your progress at the top of the drill.
        </li>
        <li>
          Leave <strong>Focus on close decisions</strong> on: it skips hands that are obvious folds.
        </li>
        <li>
          Set <strong>Show the range</strong> to <em>After I answer</em>. Every answer is followed by the full chart for the
          spot with your hand outlined — look at the hands around yours.
        </li>
        <li>
          New spot? Use <em>Always</em> (open book) for a few hands to learn the shape of the range. Those answers are saved
          as practice and don’t count toward your accuracy. Then switch back and test yourself.
        </li>
        <li>
          Keep <strong>Spot info</strong> on to see the price, position and the opponent’s range at a glance.
        </li>
      </ol>
      <h2>What “good” looks like</h2>
      <p>
        Mixed hands make 100% unrealistic. Aim for <strong>about 80–85% correct</strong> over your recent hands of a spot
        type, then move on. The <a href={hrefFor('stats')}>Stats</a> screen shows accuracy by seat and spot type and lists your
        three biggest leaks, each with a button that starts a drill on exactly that spot.
      </p>
      <Callout title="Your practice plan" tone="key">
        The practice plan turns this into concrete stages — opening ranges, big blind defence, facing opens, facing 3-bets,
        a mixed session and fixing your leaks — and tracks each one from your graded answers.{' '}
        <a href={hrefFor('learn', { lesson: 'plan' })}>Open the practice plan</a>.
      </Callout>
    </>
  );
}
