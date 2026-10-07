import { describe, expect, it } from 'vitest';
import { comboCount, HAND_LABELS } from '../lib/poker/hands';
import { reachPercent } from '../lib/preflop/facts';
import { gradeAction } from '../lib/preflop/grading';
import { dealHand } from '../lib/preflop/drill';
import { createRng } from '../lib/rng';
import { parseHash } from '../lib/router';
import { ALL_SPOTS, getSpot } from '../lib/preflop/spots';
import { isPosition, isSpotType } from '../lib/preflop/types';
import { actionPercent } from '../lib/preflop/validate';
import type { StatRecord } from '../lib/stats/store';
import { COURSE_MINUTES, getLesson, LESSONS, nextLesson, questionsFor } from './course';
import { LESSON_CONTENT } from './lessons';
import { currentStage, PLAN, stageProgress } from './plan';
import { COURSE_KEY, emptyProgress, loadProgress, nextIncomplete, recordAnswer, saveProgress } from './progress';
import { describeFreq, gridAnswers, mainAction, QUIZZES, type ChoiceQuestion } from './quiz';

const choice = (lesson: string, id: string) => QUIZZES[lesson]!.find((q) => q.id === id) as ChoiceQuestion;
const answerOf = (q: ChoiceQuestion) => q.options[q.correct];

/** A drill link must parse and deal a hand with its filters. */
function drillDeals(href: string): boolean {
  const r = parseHash(href);
  if (r.name !== 'drill') return true;
  const type = r.params.get('type');
  const pos = r.params.get('pos');
  if (type && !isSpotType(type)) return false;
  if (pos && !isPosition(pos)) return false;
  const filters = { types: type && isSpotType(type) ? [type] : [], positions: pos && isPosition(pos) ? [pos] : [], focus: true };
  return dealHand(createRng(1), ALL_SPOTS, filters) !== null;
}

describe('beginner course structure', () => {
  it('P1-LEARN-01 has at least 9 lessons from the basics to practising, each with content, a goal, a takeaway and questions', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(9);
    expect(LESSONS.map((l) => l.id)).toEqual(['welcome', 'table', 'hands', 'money', 'opening', 'facing-open', 'value-bluffs', 'facing-3bet', 'practice', 'postflop']);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    LESSONS.forEach((l, i) => {
      expect(l.number).toBe(i);
      expect(LESSON_CONTENT[l.id], l.id).toBeTypeOf('function');
      expect(l.goal.length).toBeGreaterThan(30);
      expect(l.takeaway.length).toBeGreaterThan(30);
      expect(questionsFor(l.id).length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.minutes).toBeGreaterThan(0);
    });
    expect(COURSE_MINUTES).toBeGreaterThanOrEqual(35);
    expect(nextLesson('welcome')!.id).toBe('table');
    expect(nextLesson('postflop')).toBeUndefined();
    expect(getLesson('nope')).toBeUndefined();
  });

  it('P1-LEARN-01 every practice link opens a working, correctly filtered screen', () => {
    for (const l of LESSONS) if (l.practice) expect(drillDeals(l.practice.href), l.id).toBe(true);
    const opening = parseHash(getLesson('opening')!.practice!.href);
    expect(opening.name).toBe('drill');
    expect(opening.params.get('type')).toBe('rfi');
    expect(opening.params.get('goal')).toBe('open');
    expect(parseHash(getLesson('practice')!.practice!.href).params.get('lesson')).toBe('plan');
    for (const s of PLAN) expect(drillDeals(s.href), s.id).toBe(true);
  });
});

describe('course quizzes', () => {
  it('P1-LEARN-02 every multiple-choice question has unique options and exactly one correct answer', () => {
    let n = 0;
    for (const [lesson, qs] of Object.entries(QUIZZES)) {
      expect(getLesson(lesson), lesson).toBeDefined();
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.prompt.length).toBeGreaterThan(10);
        expect(q.explain.length).toBeGreaterThan(30);
        if (q.kind === 'choice') {
          expect(new Set(q.options).size, q.id).toBe(q.options.length);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, q.id).toBe(true);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(25);
  });

  it('P1-LEARN-02 grid questions accept some hands and reject others', () => {
    const grids = Object.values(QUIZZES).flat().filter((q) => q.kind === 'grid');
    expect(grids.length).toBeGreaterThanOrEqual(1);
    for (const q of grids) {
      if (q.kind !== 'grid') continue;
      const ok = gridAnswers(q, HAND_LABELS);
      expect(ok.length, q.id).toBeGreaterThan(0);
      expect(ok.length).toBeLessThan(HAND_LABELS.length);
    }
    const tap = QUIZZES.hands!.find((q) => q.id === 'hands-tap-76s')!;
    expect(tap.kind === 'grid' && gridAnswers(tap, HAND_LABELS)).toEqual(['76s']);
  });

  it('P1-LEARN-02 answers that depend on the charts match the chart data', () => {
    expect(answerOf(choice('hands', 'hands-aks'))).toBe(String(comboCount('AKs')));
    const widest = (['UTG', 'HJ', 'CO', 'BTN'] as const).map((p) => ({ p, v: actionPercent(getSpot(`rfi-${p}`)!, 'raise') })).sort((a, b) => b.v - a.v)[0]!.p;
    expect(answerOf(choice('opening', 'opening-widest'))).toBe(widest);
    expect(getSpot('rfi-UTG')!.hands['K9o']!.fold).toBe(1);
    expect(answerOf(choice('opening', 'opening-k9o'))).toBe('Always fold');
    expect(answerOf(choice('opening', 'opening-grade'))).toBe(gradeAction(getSpot('rfi-UTG')!.hands['A7s']!, ['raise', 'fold'], 'fold') === 'acceptable' ? 'Acceptable mix' : 'x');
    const bb = getSpot('vsopen-BB-vs-BTN')!;
    expect(answerOf(choice('money', 'money-odds'))).toBe(`${Math.round((bb.toCall / (bb.pot + bb.toCall)) * 100)}%`);
    expect(answerOf(choice('money', 'money-tocall'))).toBe(`${bb.toCall}bb`);
    expect(answerOf(choice('facing-open', 'open-98o-bb'))).toBe('Call');
    expect(mainAction(bb, '98o')).toBe('call');
    expect(mainAction(getSpot('vsopen-SB-vs-BTN')!, '22')).toBe('fold');
    expect(mainAction(bb, '22')).toBe('call');
    expect(answerOf(choice('facing-open', 'open-22-sb-bb'))).toBe('Fold in the small blind, call in the big blind');
    expect(reachPercent(bb, 'call')).toBeGreaterThan(reachPercent(getSpot('vsopen-SB-vs-BTN')!, 'call'));
    expect(answerOf(choice('facing-open', 'open-who-calls'))).toBe('The big blind');
    expect(answerOf(choice('value-bluffs', 'vb-bluff'))).toBe('A5s');
    expect(answerOf(choice('value-bluffs', 'vb-grade-a5s'))).toBe('Acceptable mix');
    expect(describeFreq(getSpot('vs3bet-BTN-vs-BB')!.hands['KK']!['4bet']!)).toBe('always');
    expect(answerOf(choice('facing-3bet', '3b-value'))).toBe('KK');
    expect(answerOf(choice('facing-3bet', '3b-ajo'))).toBe('Fold');
    const cont = 100 - reachPercent(getSpot('vs3bet-BTN-vs-BB')!, 'fold');
    expect(cont).toBeGreaterThan(35);
    expect(cont).toBeLessThan(65);
    expect(answerOf(choice('facing-3bet', '3b-share'))).toBe('About half');
    expect(answerOf(choice('table', 'table-btn-bb'))).toBe('The button');
  });
});

describe('course progress', () => {
  it('P1-LEARN-03 a lesson completes when every question is answered correctly; first tries are kept', () => {
    const ids = questionsFor('table').map((q) => q.id);
    let p = emptyProgress();
    p = recordAnswer(p, 'table', ids[0]!, false, ids);
    p = recordAnswer(p, 'table', ids[0]!, true, ids);
    expect(p.firstTry[`table:${ids[0]}`]).toBe(false);
    for (const id of ids.slice(1, -1)) p = recordAnswer(p, 'table', id, true, ids);
    expect(p.completed).not.toContain('table');
    p = recordAnswer(p, 'table', ids.at(-1)!, true, ids);
    expect(p.completed).toContain('table');
    expect(p.firstTry[`table:${ids[1]}`]).toBe(true);
    expect(nextIncomplete(p)).toBe('welcome');
  });

  it('P1-LEARN-03 progress persists under a versioned key and corrupt or old data falls back', () => {
    expect(loadProgress()).toEqual(emptyProgress());
    saveProgress({ ...emptyProgress(), completed: ['welcome', 'not-a-lesson'], last: 'table' });
    expect(COURSE_KEY).toMatch(/\.v\d+$/);
    expect(loadProgress().completed).toEqual(['welcome']);
    expect(loadProgress().last).toBe('table');
    window.localStorage.setItem(COURSE_KEY, '{broken');
    expect(loadProgress()).toEqual(emptyProgress());
    window.localStorage.setItem(COURSE_KEY, JSON.stringify({ version: 0, completed: ['welcome'] }));
    expect(loadProgress()).toEqual(emptyProgress());
    window.localStorage.setItem(COURSE_KEY, JSON.stringify({ version: 1, completed: 'welcome', firstTry: { a: 'yes', b: true } }));
    expect(loadProgress()).toEqual({ ...emptyProgress(), firstTry: { b: true } });
  });
});

describe('practice plan', () => {
  const rec = (type: StatRecord['type'], hero: StatRecord['hero'], ok: boolean, assisted = false): StatRecord => ({
    t: 1,
    spotId: 'x',
    type,
    hero,
    villain: type === 'rfi' ? null : 'BTN',
    hand: 'AKo',
    action: 'fold',
    grade: ok ? 'best' : 'mistake',
    ...(assisted ? { assisted: true } : {}),
  });
  const file = (records: StatRecord[], postflop = 0) => ({
    version: 1,
    records,
    postflop: Array.from({ length: postflop }, () => ({ t: 1, spot: 's', hand: 'AsKs', action: 'Check', grade: 'best' as const, evLoss: 0 })),
  });
  const many = (n: number, f: (i: number) => StatRecord) => Array.from({ length: n }, (_, i) => f(i));

  it('P1-LEARN-04 stages measure recent graded accuracy against their targets', () => {
    const open = PLAN.find((s) => s.id === 'open')!;
    expect(stageProgress(open, file([])).done).toBe(false);
    expect(stageProgress(open, file([])).summary).toBe('0/30 hands · target 85%');
    const good = many(30, (i) => rec('rfi', 'CO', i % 10 !== 0)); // 90%
    expect(stageProgress(open, file(good))).toMatchObject({ hands: 30, done: true, progress: 1 });
    const weak = many(30, (i) => rec('rfi', 'CO', i % 5 !== 0)); // 80% < 85%
    const w = stageProgress(open, file(weak));
    expect(w.done).toBe(false);
    expect(w.summary).toBe('30/30 hands · 80% of the last 30 (target 85%)');
    // only the most recent window counts: an early bad patch is forgiven
    const improving = [...many(20, () => rec('rfi', 'UTG', false)), ...many(30, () => rec('rfi', 'UTG', true))];
    expect(stageProgress(open, file(improving)).done).toBe(true);
    // open-book answers never count
    expect(stageProgress(open, file(many(40, () => rec('rfi', 'CO', true, true)))).hands).toBe(0);
  });

  it('P1-LEARN-04 position filters, the leak stage and the postflop stage use the right data', () => {
    const bb = PLAN.find((s) => s.id === 'bb')!;
    const recs = [...many(30, () => rec('vs-open', 'BTN', true)), ...many(10, () => rec('vs-open', 'BB', true))];
    expect(stageProgress(bb, file(recs)).hands).toBe(10);
    const leaks = PLAN.find((s) => s.id === 'leaks')!;
    const leaky = [...many(140, () => rec('rfi', 'CO', true)), ...many(10, () => rec('vs-3bet', 'UTG', false))];
    const l = stageProgress(leaks, file(leaky));
    expect(l.done).toBe(false);
    expect(l.summary).toMatch(/weakest: UTG · facing a 3-bet at 0%/);
    expect(stageProgress(leaks, file(many(150, () => rec('rfi', 'CO', true)))).done).toBe(true);
    const pf = PLAN.find((s) => s.id === 'postflop')!;
    expect(stageProgress(pf, file([], 19)).done).toBe(false);
    expect(stageProgress(pf, file([], 20)).done).toBe(true);
    expect(currentStage(file([]))!.id).toBe('open');
    expect(currentStage(file(many(30, () => rec('rfi', 'BTN', true))))!.id).toBe('bb');
  });
});
