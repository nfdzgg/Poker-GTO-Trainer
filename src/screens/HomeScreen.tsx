import { ChipStack } from '../components/Chip';
import { PlayingCard } from '../components/PlayingCard';
import { parseCard } from '../lib/poker/cards';
import { usePrefs } from '../lib/prefs';
import { hrefFor } from '../lib/router';
import { getLesson, LESSONS } from '../learn/course';
import { nextIncomplete, useCourseProgress } from '../learn/progress';

const FAN = ['Ah', 'Kd', 'Qs', 'Jc', 'Th'].map((c) => parseCard(c)!);

const TILES = [
  { route: 'learn', title: 'Learn the basics', body: 'A short beginner course: seats, hands, prices and every preflop decision, with quizzes.' },
  { route: 'drill', title: 'Drill', body: 'Get dealt a spot and a hand, pick an action, and get graded against the chart.' },
  { route: 'ranges', title: 'Review the ranges', body: 'Browse all 35 six-max spots as color-coded 13×13 grids with exact mixes.' },
  { route: 'stats', title: 'Fix your leaks', body: 'Accuracy by position and spot, plus your biggest leaks with one-click drills.' },
  { route: 'analyzer', title: 'Go postflop', body: 'Build a spot and solve it in your browser with a real CFR solver.' },
] as const;

export function HomeScreen() {
  const [prefs] = usePrefs();
  const [course] = useCourseProgress();
  const started = course.completed.length > 0 || course.last !== null;
  const next = getLesson(nextIncomplete(course));
  const cta = !started
    ? { href: hrefFor('learn', { lesson: LESSONS[0]!.id }), label: 'Start the beginner course' }
    : next
      ? { href: hrefFor('learn', { lesson: next.id }), label: next.number === 0 ? `Continue the course: ${next.title}` : `Continue the course: Lesson ${next.number}` }
      : { href: hrefFor('learn', { lesson: 'plan' }), label: 'Open your practice plan' };
  return (
    <section className="home" aria-labelledby="home-title">
      <div className="hero-wrap">
      <div className="hero">
        <p className="eyebrow">No-Limit Hold'em · 6-max · 100bb</p>
        <h1 id="home-title">Study game-theory-optimal poker, one decision at a time.</h1>
        <p className="lead muted">
          A free, offline-friendly study tool. Drill preflop decisions against hand-built approximations of solver
          charts, then take any spot postflop and solve it right in your browser.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={cta.href} data-testid="home-cta">
            {cta.label}
          </a>
          <a className="btn btn-ghost" href={hrefFor('drill')}>
            Jump into the drill
          </a>
        </div>
        <p className="small muted hero-note">
          {started ? `${course.completed.length} of ${LESSONS.length} lessons complete.` : 'New to poker strategy? Start with the course; it takes under an hour.'}
        </p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="card-fan">
          {FAN.map((c, i) => (
            <div key={c} className="fan-slot" style={{ transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 6}px)` }}>
              <PlayingCard card={c} anim="flip" delayMs={120 * i} width={84} fourColor={prefs.fourColor} />
            </div>
          ))}
        </div>
        <div className="hero-chips">
          <ChipStack amount={31.5} size={30} />
          <ChipStack amount={12} size={30} />
        </div>
      </div>
      </div>
      <div className="tiles">
        {TILES.map((t, i) => (
          <a key={t.route} className="tile panel" href={hrefFor(t.route)}>
            <span className="tile-step" aria-hidden="true">
              {i + 1}
            </span>
            <h2>{t.title}</h2>
            <p className="muted">{t.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
