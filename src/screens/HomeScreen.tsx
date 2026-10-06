import { hrefFor } from '../lib/router';

const TILES = [
  { route: 'drill', title: 'Preflop Drill', body: 'Get dealt a spot and a hand, pick an action, and get graded against the chart.' },
  { route: 'ranges', title: 'Range Viewer', body: 'Browse all 35 six-max spots as color-coded 13×13 grids with exact mixes.' },
  { route: 'stats', title: 'Stats', body: 'Accuracy by position and spot, plus your biggest leaks with one-click drills.' },
  { route: 'analyzer', title: 'Postflop Analyzer', body: 'Build a spot and solve it in your browser with a real CFR solver.' },
] as const;

export function HomeScreen() {
  return (
    <section className="home" aria-labelledby="home-title">
      <div className="hero">
        <p className="eyebrow">No-Limit Hold'em · 6-max · 100bb</p>
        <h1 id="home-title">Study game-theory-optimal poker, one decision at a time.</h1>
        <p className="lead muted">
          A free, offline-friendly study tool. Drill preflop decisions against hand-built approximations of solver
          charts, then take any spot postflop and solve it right in your browser.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={hrefFor('drill')}>
            Start drilling
          </a>
          <a className="btn btn-ghost" href={hrefFor('analyzer')}>
            Open analyzer
          </a>
        </div>
      </div>
      <div className="tiles">
        {TILES.map((t) => (
          <a key={t.route} className="tile panel" href={hrefFor(t.route)}>
            <h2>{t.title}</h2>
            <p className="muted">{t.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
