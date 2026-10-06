import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = ['global.css', 'app.css', 'components.css'].map((f) => readFileSync(path.join(__dirname, f), 'utf8')).join('\n');

describe('motion CSS', () => {
  it('UI-02 keyframes and transitions animate only transform and opacity', () => {
    const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
    expect(keyframes.map((k) => k[1]).sort()).toEqual(['card-deal', 'card-flip', 'chip-to-pot', 'grade-pop']);
    for (const k of keyframes) for (const d of k[2]!.matchAll(/([\w-]+)\s*:/g)) expect(['transform', 'opacity']).toContain(d[1]);
    for (const m of css.matchAll(/transition:\s*([^;]+);/g)) {
      for (const part of m[1]!.split(/,(?![^(]*\))/)) expect(['transform', 'opacity', 'none']).toContain(part.trim().split(/\s+/)[0]);
    }
  });

  it('UI-03 prefers-reduced-motion disables non-essential motion in CSS', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*animation-duration:\s*1ms !important[\s\S]*transition-duration:\s*1ms !important/);
  });
});
