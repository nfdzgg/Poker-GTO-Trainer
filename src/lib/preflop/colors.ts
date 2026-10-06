import type { Band } from '../../components/FrequencyBar';
import { ACTION_LABELS, type HandFrequencies, type PreflopAction } from './types';

export const ACTION_COLORS: Record<PreflopAction, string> = {
  raise: 'var(--act-raise)',
  '3bet': 'var(--act-3bet)',
  '4bet': 'var(--act-4bet)',
  call: 'var(--act-call)',
  fold: 'var(--act-fold)',
};

/** Bands for a hand in display order: raise family, call, fold. */
export function preflopBands(actions: readonly PreflopAction[], f: HandFrequencies): Band[] {
  return actions.map((a) => ({ key: a, label: ACTION_LABELS[a], freq: f[a] ?? 0, color: ACTION_COLORS[a] }));
}
