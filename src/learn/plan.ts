// The practice plan shown after the course: staged goals measured on graded (not open-book) stats.
import { SPOT_TYPE_NAMES, type Position, type SpotType } from '../lib/preflop/types';
import { biggestLeaks, gradedRecords } from '../lib/stats/aggregate';
import { isCorrect } from '../lib/preflop/grading';
import { hrefFor } from '../lib/router';
import type { StatsFile } from '../lib/stats/store';

export type StageId = 'open' | 'bb' | 'vs-open' | 'vs-3bet' | 'mix' | 'leaks' | 'postflop';

export interface PlanStage {
  id: StageId;
  title: string;
  why: string;
  /** Drill filter for preflop stages. */
  filter?: { type?: SpotType; pos?: Position };
  minHands: number;
  /** Accuracy is measured over the most recent `window` graded hands of the stage. */
  window: number;
  target: number; // 0..1
  href: string;
  optional?: boolean;
}

const drill = (id: StageId, filter: PlanStage['filter']) =>
  hrefFor('drill', { ...(filter?.type ? { type: filter.type } : {}), ...(filter?.pos ? { pos: filter.pos } : {}), goal: id });

export const PLAN: PlanStage[] = [
  {
    id: 'open',
    title: 'Opening ranges',
    why: 'Folded to you: raise or fold from every seat. The foundation of every other spot.',
    filter: { type: 'rfi' },
    minHands: 30,
    window: 30,
    target: 0.85,
    href: drill('open', { type: 'rfi' }),
  },
  {
    id: 'bb',
    title: 'Big blind defence',
    why: 'The seat you play most hands from: defend widely with the good price.',
    filter: { type: 'vs-open', pos: 'BB' },
    minHands: 30,
    window: 30,
    target: 0.8,
    href: drill('bb', { type: 'vs-open', pos: 'BB' }),
  },
  {
    id: 'vs-open',
    title: 'Facing an open from every seat',
    why: '3-bet, call or fold in position, out of position and from the small blind.',
    filter: { type: 'vs-open' },
    minHands: 40,
    window: 40,
    target: 0.8,
    href: drill('vs-open', { type: 'vs-open' }),
  },
  {
    id: 'vs-3bet',
    title: 'Facing a 3-bet',
    why: 'Defend your opens: 4-bet, call or fold.',
    filter: { type: 'vs-3bet' },
    minHands: 30,
    window: 30,
    target: 0.8,
    href: drill('vs-3bet', { type: 'vs-3bet' }),
  },
  {
    id: 'mix',
    title: 'Everything mixed',
    why: 'All spot types at random, like a real session.',
    filter: {},
    minHands: 100,
    window: 50,
    target: 0.85,
    href: drill('mix', {}),
  },
  {
    id: 'leaks',
    title: 'Fix your biggest leaks',
    why: 'Your stats find the position × spot combinations you miss most; drill them until none is below 75%.',
    minHands: 150,
    window: 0,
    target: 0.75,
    href: hrefFor('stats'),
  },
  {
    id: 'postflop',
    title: 'Postflop preview',
    why: 'Solve the built-in examples in the analyzer and answer 20 hands with “Drill this spot”.',
    minHands: 20,
    window: 0,
    target: 0,
    href: hrefFor('analyzer'),
    optional: true,
  },
];

export interface StageProgress {
  hands: number;
  /** Accuracy over the stage window (null until there is at least one hand). */
  recentAccuracy: number | null;
  done: boolean;
  /** 0..1 for a progress bar. */
  progress: number;
  /** One-line status such as "14/30 hands · 82% of the last 14 (target 85%)". */
  summary: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function stageProgress(stage: PlanStage, stats: StatsFile): StageProgress {
  if (stage.id === 'postflop') {
    const n = stats.postflop.length;
    return { hands: n, recentAccuracy: null, done: n >= stage.minHands, progress: Math.min(1, n / stage.minHands), summary: `${Math.min(n, stage.minHands)}/${stage.minHands} postflop drill hands` };
  }
  const graded = gradedRecords(stats.records);
  if (stage.id === 'leaks') {
    const leaks = biggestLeaks(graded);
    const worst = leaks[0];
    const enough = graded.length >= stage.minHands;
    const clean = !worst || worst.accuracy >= stage.target;
    const done = enough && clean;
    const handsPart = Math.min(1, graded.length / stage.minHands);
    return {
      hands: graded.length,
      recentAccuracy: worst ? worst.accuracy : null,
      done,
      progress: done ? 1 : clean ? handsPart : handsPart * 0.9,
      summary: worst
        ? `${Math.min(graded.length, stage.minHands)}/${stage.minHands} hands · weakest: ${worst.position} · ${SPOT_TYPE_NAMES[worst.type].toLowerCase()} at ${pct(worst.accuracy)} (target ${pct(stage.target)})`
        : `${Math.min(graded.length, stage.minHands)}/${stage.minHands} hands · no leak with 10+ answers yet`,
    };
  }
  const f = stage.filter ?? {};
  const recs = graded.filter((r) => (!f.type || r.type === f.type) && (!f.pos || r.hero === f.pos));
  const recent = recs.slice(-stage.window);
  const acc = recent.length ? recent.filter((r) => isCorrect(r.grade)).length / recent.length : null;
  const done = recs.length >= stage.minHands && acc !== null && acc >= stage.target;
  const handsPart = Math.min(1, recs.length / stage.minHands);
  const accPart = acc === null ? 0 : Math.min(1, acc / stage.target);
  return {
    hands: recs.length,
    recentAccuracy: acc,
    done,
    progress: done ? 1 : Math.min(0.99, handsPart * accPart),
    summary:
      `${Math.min(recs.length, stage.minHands)}/${stage.minHands} hands` +
      (acc === null ? ` · target ${pct(stage.target)}` : ` · ${pct(acc)} of the last ${recent.length} (target ${pct(stage.target)})`),
  };
}

export function getStage(id: string | null | undefined): PlanStage | undefined {
  return PLAN.find((s) => s.id === id);
}

/** The first unfinished, non-optional stage. */
export function currentStage(stats: StatsFile): PlanStage | undefined {
  return PLAN.find((s) => !s.optional && !stageProgress(s, stats).done);
}
