import type { HandFrequencies, PreflopAction } from './types';

export type Grade = 'best' | 'acceptable' | 'mistake';

export const GRADE_LABELS: Record<Grade, string> = {
  best: 'Best',
  acceptable: 'Acceptable mix',
  mistake: 'Mistake',
};

/** Threshold for an "acceptable mix": any non-best action played at least this often. */
export const ACCEPTABLE_THRESHOLD = 0.2;
const EPS = 1e-9;

/** All actions tied for the highest frequency. */
export function bestActions(freqs: HandFrequencies, actions: readonly PreflopAction[]): PreflopAction[] {
  let max = -1;
  for (const a of actions) max = Math.max(max, freqs[a] ?? 0);
  return actions.filter((a) => Math.abs((freqs[a] ?? 0) - max) < EPS);
}

/**
 * Grade a chosen action: the highest-frequency action(s) are "Best" (ties are
 * all Best); any other action with frequency >= 20% is an "Acceptable mix";
 * anything else is a "Mistake".
 */
export function gradeAction(freqs: HandFrequencies, actions: readonly PreflopAction[], chosen: PreflopAction): Grade {
  if (bestActions(freqs, actions).includes(chosen)) return 'best';
  if ((freqs[chosen] ?? 0) >= ACCEPTABLE_THRESHOLD - EPS) return 'acceptable';
  return 'mistake';
}

export function isCorrect(g: Grade): boolean {
  return g === 'best' || g === 'acceptable';
}

/** The same Best / Acceptable mix / Mistake rule for an array of frequencies (used by the postflop drill). */
export function gradeFrequencies(freqs: readonly number[], chosen: number): Grade {
  const max = Math.max(...freqs);
  const f = freqs[chosen] ?? 0;
  if (Math.abs(f - max) < EPS) return 'best';
  if (f >= ACCEPTABLE_THRESHOLD - EPS) return 'acceptable';
  return 'mistake';
}
