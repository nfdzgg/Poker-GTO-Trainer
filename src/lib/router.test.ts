import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './router';

describe('hash router', () => {
  it('parses known routes and query params', () => {
    const r = parseHash('#/drill?pos=CO&type=rfi');
    expect(r.name).toBe('drill');
    expect(r.params.get('pos')).toBe('CO');
    expect(r.params.get('type')).toBe('rfi');
  });
  it('falls back to home for unknown or empty hashes', () => {
    expect(parseHash('').name).toBe('home');
    expect(parseHash('#/nope').name).toBe('home');
  });
  it('builds hrefs', () => {
    expect(hrefFor('home')).toBe('#/');
    expect(hrefFor('stats')).toBe('#/stats');
    expect(hrefFor('drill', { pos: 'BTN' })).toBe('#/drill?pos=BTN');
  });
});
