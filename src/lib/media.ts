import { useEffect, useState } from 'react';

/**
 * Windows where the whole preflop drill fits one screen. This exact string is also the media
 * query of the one-screen block in src/styles/components.css (a unit test keeps them in sync).
 */
export const DRILL_FIT_QUERY = '(min-width: 1200px) and (min-height: 580px), (min-width: 1024px) and (min-height: 700px)';

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** Live result of a CSS media query (false where matchMedia is unavailable). */
export function useMediaQuery(query: string): boolean {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const update = () => setOn(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => mql.removeEventListener?.('change', update);
  }, [query]);
  return on;
}
