// The beginner course: lesson metadata. Content lives in ./lessons, questions in ./quiz.
import { hrefFor } from '../lib/router';
import { QUIZZES } from './quiz';

export interface LessonMeta {
  id: string;
  number: number;
  title: string;
  minutes: number;
  /** "After this lesson you can…" */
  goal: string;
  takeaway: string;
  /** Where to practise what the lesson taught. */
  practice?: { label: string; href: string };
}

export const LESSONS: LessonMeta[] = [
  {
    id: 'welcome',
    number: 0,
    title: 'Start here',
    minutes: 4,
    goal: 'Know what this trainer teaches, what “GTO” means and how to use each screen.',
    takeaway: 'Learn a decision, drill it with a clear target, check the range when you miss, and let your stats pick what to practise next.',
  },
  {
    id: 'table',
    number: 1,
    title: 'The table and positions',
    minutes: 5,
    goal: 'Name the six seats, know who acts first before and after the flop, and why position matters.',
    takeaway: 'Late seats (CO, BTN) act last after the flop and can play more hands; the blinds pay to play and are out of position.',
  },
  {
    id: 'hands',
    number: 2,
    title: 'Starting hands and the grid',
    minutes: 5,
    goal: 'Read hand names like AKs and T9o, count combos and find any hand on the 13×13 grid.',
    takeaway: 'Pairs have 6 combos, suited hands 4, offsuit hands 12. Pairs on the diagonal, suited above, offsuit below.',
  },
  {
    id: 'money',
    number: 3,
    title: 'Chips, bet sizes and pot odds',
    minutes: 5,
    goal: 'Count the pot, know the standard sizes and work out the equity you need to call.',
    takeaway: 'Pot odds = amount to call ÷ (pot + amount to call). A cheap price lets you continue with more hands.',
  },
  {
    id: 'opening',
    number: 4,
    title: 'Opening the pot',
    minutes: 6,
    goal: 'Decide raise-or-fold when everyone folds to you, and understand how the drill grades you.',
    takeaway: 'Raise or fold, never limp. Open tight from UTG and wider as fewer players are left behind you.',
    practice: { label: 'Practise opening', href: hrefFor('drill', { type: 'rfi', goal: 'open' }) },
  },
  {
    id: 'facing-open',
    number: 5,
    title: 'Facing an open',
    minutes: 6,
    goal: 'Choose between 3-bet, call and fold when someone has already raised.',
    takeaway: 'Respect early opens, call more in position, defend the big blind widely and play the small blind mostly 3-bet-or-fold.',
    practice: { label: 'Practise big blind defence', href: hrefFor('drill', { type: 'vs-open', pos: 'BB', goal: 'bb' }) },
  },
  {
    id: 'value-bluffs',
    number: 6,
    title: 'Value, bluffs and mixed strategies',
    minutes: 5,
    goal: 'Know why the charts 3-bet some weak-looking hands and how to read mixed frequencies.',
    takeaway: 'Raise strong hands for value, add bluffs with blockers and playability, and treat mixed hands as close decisions.',
    practice: { label: 'Practise facing opens', href: hrefFor('drill', { type: 'vs-open', goal: 'vs-open' }) },
  },
  {
    id: 'facing-3bet',
    number: 7,
    title: 'Facing a 3-bet',
    minutes: 5,
    goal: 'Decide 4-bet, call or fold after your open gets re-raised.',
    takeaway: 'Continue with about half your opening range: 4-bet the best hands and a few blockers, call playable hands, fold the rest.',
    practice: { label: 'Practise facing 3-bets', href: hrefFor('drill', { type: 'vs-3bet', goal: 'vs-3bet' }) },
  },
  {
    id: 'practice',
    number: 8,
    title: 'How to practise',
    minutes: 4,
    goal: 'Use the drill, range viewer and stats deliberately, with a target for every session.',
    takeaway: 'One spot type at a time, aim for 80–85% over your recent hands, review every miss, then mix everything.',
    practice: { label: 'Open your practice plan', href: hrefFor('learn', { lesson: 'plan' }) },
  },
  {
    id: 'postflop',
    number: 9,
    title: 'Beyond preflop (optional)',
    minutes: 4,
    goal: 'Know what the postflop solver does and how to study a spot with it.',
    takeaway: 'Solve the built-in examples, compare the strategy with your instincts and drill the solved spot.',
    practice: { label: 'Open the postflop analyzer', href: hrefFor('analyzer') },
  },
];

export const LESSON_IDS = LESSONS.map((l) => l.id);
export const COURSE_MINUTES = LESSONS.reduce((a, l) => a + l.minutes, 0);

export function getLesson(id: string | null | undefined): LessonMeta | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function nextLesson(id: string): LessonMeta | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

export function prevLesson(id: string): LessonMeta | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i > 0 ? LESSONS[i - 1] : undefined;
}

export function questionsFor(id: string) {
  return QUIZZES[id] ?? [];
}
