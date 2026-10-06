import { lazy, Suspense } from 'react';
import { hrefFor, useHashRoute, type RouteName } from './lib/router';
import { ScreenTransition } from './components/ScreenTransition';
import { HomeScreen } from './screens/HomeScreen';
import { DrillScreen } from './screens/DrillScreen';
import { RangeViewerScreen } from './screens/RangeViewerScreen';
import { StatsScreen } from './screens/StatsScreen';
import { AboutScreen } from './screens/AboutScreen';

// The analyzer (and with it the solver WASM) is loaded lazily, only on its own screen.
const AnalyzerScreen = lazy(() => import('./screens/AnalyzerScreen'));

import { SOURCE_URL } from './lib/constants';

const NAV: { name: RouteName; label: string }[] = [
  { name: 'home', label: 'Home' },
  { name: 'drill', label: 'Preflop Drill' },
  { name: 'ranges', label: 'Ranges' },
  { name: 'stats', label: 'Stats' },
  { name: 'analyzer', label: 'Postflop' },
  { name: 'about', label: 'About' },
];

export function App() {
  const route = useHashRoute();

  let screen;
  switch (route.name) {
    case 'drill':
      screen = <DrillScreen params={route.params} />;
      break;
    case 'ranges':
      screen = <RangeViewerScreen params={route.params} />;
      break;
    case 'stats':
      screen = <StatsScreen />;
      break;
    case 'analyzer':
      screen = (
        <Suspense fallback={<p className="muted">Loading analyzer…</p>}>
          <AnalyzerScreen />
        </Suspense>
      );
      break;
    case 'about':
      screen = <AboutScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content" onClick={(e) => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href={hrefFor('home')} aria-label="Poker GTO Trainer home">
          <span className="brand-mark" aria-hidden="true">♠</span>
          <span className="brand-name">GTO Trainer</span>
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.name}
              className="nav-link"
              href={hrefFor(n.name)}
              aria-current={route.name === n.name ? 'page' : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main id="main-content" className="main" tabIndex={-1} data-route={route.name}>
        <ScreenTransition screenKey={route.name}>{screen}</ScreenTransition>
      </main>
      <footer className="footer">
        <span>Study tool only — no real-time assistance.</span>
        <span>
          Free software under AGPL-3.0-or-later ·{' '}
          <a href={SOURCE_URL} rel="noopener noreferrer" target="_blank">
            Source code
          </a>
        </span>
      </footer>
    </div>
  );
}
