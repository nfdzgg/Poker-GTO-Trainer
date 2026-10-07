import { hrefFor } from '../../lib/router';
import { Callout } from '../components/Callout';
import { COURSE_MINUTES, LESSONS } from '../course';

export function WelcomeLesson() {
  return (
    <>
      <p>
        Welcome! This trainer teaches you a solid, modern way to play <strong>No-Limit Texas Hold’em</strong> at a 6-player
        cash table, starting with the part that comes up in every single hand: what to do <strong>before the flop</strong>{' '}
        (preflop). You don’t need to know any strategy yet — only the basic rules (two private cards each, five shared
        cards, best five-card hand wins).
      </p>
      <h2>What “GTO” means</h2>
      <p>
        <strong>GTO</strong> stands for <em>game-theory optimal</em>. A GTO strategy is balanced so well that an opponent
        can’t take advantage of it, even if they know exactly what you do. Computers called <strong>solvers</strong> find
        these strategies. Professionals study solver strategies as a baseline, then adjust against weaker players.
      </p>
      <p>
        Solver strategies are often <strong>mixed</strong>: with some hands they raise part of the time and call or fold the
        rest. You’ll see this as percentages like “3-bet 60% · call 40%”. Lesson 6 explains why.
      </p>
      <Callout title="About the charts in this app" tone="warn">
        The 35 preflop charts were <strong>written by hand to approximate published solver charts</strong> for 6-max,
        100-big-blind cash games. They are a sound baseline, not exact solver output.
      </Callout>
      <h2>The screens, in the order to use them</h2>
      <ol className="lesson-steps">
        <li>
          <strong>Learn</strong> (you are here): {LESSONS.length} short lessons, each with a few quiz questions, about {Math.round(COURSE_MINUTES / 5) * 5} minutes in total.
        </li>
        <li>
          <strong>
            <a href={hrefFor('drill')}>Preflop Drill</a>
          </strong>
          : you get dealt a hand in a spot, choose an action, and see your grade and an explanation. You can show the
          range for the spot while you decide (open book) or after you answer.
        </li>
        <li>
          <strong>
            <a href={hrefFor('ranges')}>Ranges</a>
          </strong>
          : browse all 35 charts as colored 13×13 grids.
        </li>
        <li>
          <strong>
            <a href={hrefFor('stats')}>Stats</a>
          </strong>
          : your accuracy by seat and spot, and your biggest leaks.
        </li>
        <li>
          <strong>
            <a href={hrefFor('analyzer')}>Postflop</a>
          </strong>
          : an optional solver for after the flop, for when preflop feels comfortable.
        </li>
      </ol>
      <Callout title="Your goal" tone="key">
        By the end of the course you’ll have a <strong>practice plan</strong>: one spot type at a time, with a clear target
        (about 80–85% correct over your recent hands) before you move on. No more guessing in the drill.
      </Callout>
    </>
  );
}
