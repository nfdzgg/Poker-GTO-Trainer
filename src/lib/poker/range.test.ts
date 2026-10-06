import { describe, expect, it } from 'vitest';
import { formatRange, parseRange, rangeCombos } from './range';

describe('range parser', () => {
  it('expands plus, dash and weight syntax', () => {
    const r = parseRange('QQ+,AKs,A5s:0.5,KTs+,22-44,AJo-ATo:0.25,T9');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.range;
    expect(['AA', 'KK', 'QQ'].every((h) => w.get(h) === 1)).toBe(true);
    expect(w.get('JJ')).toBeUndefined();
    expect(w.get('A5s')).toBe(0.5);
    expect(['KTs', 'KJs', 'KQs'].every((h) => w.get(h) === 1)).toBe(true);
    expect(['22', '33', '44'].every((h) => w.get(h) === 1)).toBe(true);
    expect(w.get('AJo')).toBe(0.25);
    expect(w.get('ATo')).toBe(0.25);
    expect(w.get('T9s')).toBe(1);
    expect(w.get('T9o')).toBe(1);
    expect(rangeCombos(w)).toBeCloseTo(18 + 4 + 2 + 12 + 18 + 6 + 16, 6);
  });
  it('rejects invalid input with a message', () => {
    for (const bad of ['QX', 'KA', 'AKs:2', 'AKs:-1', 'AK-QJ', 'A5s:0.5:1']) {
      const r = parseRange(bad);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(5);
    }
  });
  it('later tokens override earlier ones and weight 0 removes', () => {
    const r = parseRange('AKs,AKs:0.3,QQ,QQ:0');
    expect(r.ok && r.range.get('AKs')).toBe(0.3);
    expect(r.ok && r.range.has('QQ')).toBe(false);
  });
  it('formats canonically and round-trips', () => {
    const texts = ['QQ+,AKs,A5s:0.5', '22+,A2s+,K9s+,ATo+', 'TT-77,AQs-ATs:0.75,KJo:0.333', ''];
    for (const t of texts) {
      const a = parseRange(t);
      expect(a.ok).toBe(true);
      if (!a.ok) continue;
      const text = formatRange(a.range);
      const b = parseRange(text);
      expect(b.ok).toBe(true);
      if (b.ok) expect([...b.range.entries()].sort()).toEqual([...a.range.entries()].sort());
      expect(formatRange(b.ok ? b.range : new Map())).toBe(text);
    }
    expect(formatRange(parseRange('AA,KK,QQ,AKs,AQs').ok ? (parseRange('AA,KK,QQ,AKs,AQs') as { ok: true; range: Map<string, number> }).range : new Map())).toBe('QQ+,AQs+');
  });
});
