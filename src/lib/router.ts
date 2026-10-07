import { useEffect, useState } from 'react';

export type RouteName = 'home' | 'learn' | 'drill' | 'ranges' | 'stats' | 'analyzer' | 'about';

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

const ROUTES: Record<string, RouteName> = {
  '': 'home',
  '/': 'home',
  '/learn': 'learn',
  '/drill': 'drill',
  '/ranges': 'ranges',
  '/stats': 'stats',
  '/analyzer': 'analyzer',
  '/about': 'about',
};

/** Parse a location hash such as `#/drill?pos=CO&type=rfi`. Unknown paths fall back to home. */
export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path = '', query = ''] = raw.split('?');
  const name = ROUTES[path] ?? 'home';
  return { name, params: new URLSearchParams(query) };
}

export function hrefFor(name: RouteName, params?: Record<string, string>): string {
  const path = name === 'home' ? '/' : `/${name}`;
  const qs = params ? new URLSearchParams(params).toString() : '';
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export function navigate(name: RouteName, params?: Record<string, string>): void {
  window.location.hash = hrefFor(name, params);
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
