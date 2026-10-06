import { describe, expect, it } from 'vitest';
import { bestActions, gradeAction, isCorrect } from './grading';
import type { PreflopAction } from './types';

const A3: PreflopAction[] = ['3bet', 'call', 'fold'];

describe('P1-DRILL-02 grading', () => {
  it('P1-DRILL-02 the highest-frequency action is Best', () => {
    const f = { '3bet': 0.6, call: 0.3, fold: 0.1 };
    expect(gradeAction(f, A3, '3bet')).toBe('best');
    expect(gradeAction({ raise: 1, fold: 0 }, ['raise', 'fold'], 'raise')).toBe('best');
  });
  it('P1-DRILL-02 a non-best action with frequency >= 20% is an Acceptable mix', () => {
    const f = { '3bet': 0.6, call: 0.3, fold: 0.1 };
    expect(gradeAction(f, A3, 'call')).toBe('acceptable');
    expect(gradeAction({ '3bet': 0.8, call: 0.2, fold: 0 }, A3, 'call')).toBe('acceptable');
  });
  it('P1-DRILL-02 anything else is a Mistake', () => {
    const f = { '3bet': 0.6, call: 0.3, fold: 0.1 };
    expect(gradeAction(f, A3, 'fold')).toBe('mistake');
    expect(gradeAction({ '3bet': 0.81, call: 0.19, fold: 0 }, A3, 'call')).toBe('mistake');
    expect(gradeAction({ raise: 0, fold: 1 }, ['raise', 'fold'], 'raise')).toBe('mistake');
  });
  it('P1-DRILL-02 ties: every action tied for the highest frequency is Best', () => {
    const f = { '3bet': 0.4, call: 0.4, fold: 0.2 };
    expect(bestActions(f, A3)).toEqual(['3bet', 'call']);
    expect(gradeAction(f, A3, '3bet')).toBe('best');
    expect(gradeAction(f, A3, 'call')).toBe('best');
    expect(gradeAction(f, A3, 'fold')).toBe('acceptable');
    const even = { raise: 0.5, fold: 0.5 };
    expect(gradeAction(even, ['raise', 'fold'], 'raise')).toBe('best');
    expect(gradeAction(even, ['raise', 'fold'], 'fold')).toBe('best');
  });
  it('P1-DRILL-02 Best and Acceptable count as correct, Mistake does not', () => {
    expect(isCorrect('best')).toBe(true);
    expect(isCorrect('acceptable')).toBe(true);
    expect(isCorrect('mistake')).toBe(false);
  });
});
