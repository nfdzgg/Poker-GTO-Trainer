import { describe, expect, it } from 'vitest';
import { cardToString, parseBoard, parseCard } from './cards';
import { COMBO_CARDS, comboCount, comboIndex, HAND_CLASSES, HAND_LABELS, handCombos, handLabelOf, TOTAL_COMBOS } from './hands';

describe('P1-DATA-04 combo weighting', () => {
  it('P1-DATA-04 pairs have 6 combos, suited 4, offsuit 12, totalling 1326', () => {
    expect(comboCount('AA')).toBe(6);
    expect(comboCount('22')).toBe(6);
    expect(comboCount('AKs')).toBe(4);
    expect(comboCount('72o')).toBe(12);
    const pairs = HAND_CLASSES.filter((h) => h.kind === 'pair');
    const suited = HAND_CLASSES.filter((h) => h.kind === 'suited');
    const offsuit = HAND_CLASSES.filter((h) => h.kind === 'offsuit');
    expect([pairs.length, suited.length, offsuit.length]).toEqual([13, 78, 78]);
    const total = HAND_LABELS.reduce((a, h) => a + comboCount(h), 0);
    expect(total).toBe(1326);
    expect(TOTAL_COMBOS).toBe(1326);
  });

  it('P1-DATA-04 enumerated combos match the weights and cover every two-card hand exactly once', () => {
    const seen = new Set<number>();
    for (const h of HAND_LABELS) {
      const combos = handCombos(h);
      expect(combos.length).toBe(comboCount(h));
      for (const [a, b] of combos) {
        expect(handLabelOf(a, b)).toBe(h);
        const idx = comboIndex(a, b);
        expect(seen.has(idx)).toBe(false);
        seen.add(idx);
      }
    }
    expect(seen.size).toBe(1326);
    expect(COMBO_CARDS.length).toBe(1326);
  });
});

describe('cards and grid', () => {
  it('parses and prints cards', () => {
    expect(parseCard('As')).toBe(51);
    expect(parseCard('2c')).toBe(0);
    expect(cardToString(parseCard('Th')!)).toBe('Th');
    expect(parseCard('Xx')).toBeNull();
    expect(parseBoard('Qs7h2d')?.map(cardToString)).toEqual(['Qs', '7h', '2d']);
  });
  it('lays out pairs on the diagonal, suited above and offsuit below', () => {
    expect(HAND_CLASSES[0]!.label).toBe('AA');
    expect(HAND_CLASSES[1]!.label).toBe('AKs');
    expect(HAND_CLASSES[13]!.label).toBe('AKo');
    expect(HAND_CLASSES[168]!.label).toBe('22');
    for (const h of HAND_CLASSES) {
      if (h.row === h.col) expect(h.kind).toBe('pair');
      else if (h.row < h.col) expect(h.kind).toBe('suited');
      else expect(h.kind).toBe('offsuit');
    }
  });
});
