import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast, over, parseHex, readTokens } from '../test/contrast';

const dir = path.resolve(__dirname);
const tokensCss = readFileSync(path.join(dir, 'tokens.css'), 'utf8');
const tokens = readTokens(tokensCss);
const color = (name: string) => parseHex(tokens[name]!);

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(css|tsx?)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

describe('design tokens', () => {
  it('UI-01 colors, spacing, radii, durations and easing are defined once as custom properties', () => {
    expect(Object.keys(tokens).filter((k) => /^--(felt|surface|text|accent|act|grade|suit|chip)/.test(k)).length).toBeGreaterThan(30);
    for (const k of ['--space-1', '--space-4', '--radius-md', '--radius-pill', '--dur-fast', '--dur-deal', '--ease-out', '--ease-in-out']) {
      expect(tokens[k], k).toBeDefined();
    }
    // each token is declared exactly once
    const names = [...tokensCss.matchAll(/(--[\w-]+):/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('UI-01 no source file outside tokens.css contains a hard-coded hex color, and stylesheets use the tokens', () => {
    const src = path.resolve(dir, '..');
    const offenders: string[] = [];
    for (const f of sourceFiles(src)) {
      if (f.endsWith(path.join('styles', 'tokens.css')) || f.includes(`${path.sep}test${path.sep}`)) continue;
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g)) offenders.push(`${path.relative(src, f)} ${m[0]}`);
    }
    expect(offenders).toEqual([]);
    for (const css of ['global.css', 'app.css', 'components.css', 'analyzer.css']) {
      const text = readFileSync(path.join(dir, css), 'utf8');
      expect((text.match(/var\(--/g) ?? []).length, css).toBeGreaterThan(10);
    }
  });

  it('UI-06 body text contrast is at least 4.5:1 on every surface', () => {
    const base = color('--felt-900');
    const surfaces = ['--felt-950', '--felt-900', '--felt-800', '--felt-700', '--surface-1', '--surface-2', '--surface-3'].map((s) => over(color(s), base));
    surfaces.push(over(color('--surface-glass'), base));
    for (const text of ['--text-strong', '--text', '--text-muted']) {
      for (const bg of surfaces) expect(contrast(color(text), bg), `${text}`).toBeGreaterThanOrEqual(4.5);
    }
    // text on the accent button and on cards
    expect(contrast(color('--text-on-accent'), color('--accent'))).toBeGreaterThanOrEqual(4.5);
    for (const suit of ['--suit-spade', '--suit-heart', '--suit4-diamond', '--suit4-club']) {
      expect(contrast(color(suit), color('--card-face')), suit).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('UI-06 interactive controls have a visible focus style and 44px minimum tap size tokens', () => {
    const global = readFileSync(path.join(dir, 'global.css'), 'utf8');
    expect(global).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus-ring\)/);
    expect(tokens['--tap-min']).toBe('44px');
    expect(global).toMatch(/\.btn\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
    expect(contrast(color('--focus-ring'), color('--felt-900'))).toBeGreaterThanOrEqual(3);
  });
});
