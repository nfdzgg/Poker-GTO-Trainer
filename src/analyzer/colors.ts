import type { ActionInfo } from '../solver/types';

const BET_COLORS = ['var(--act-bet)', 'var(--act-3bet)', 'var(--act-4bet)'];

/** Colors for postflop actions: fold blue-grey, check/call green, bets and raises in the red family. */
export function actionColors(actions: readonly ActionInfo[]): string[] {
  let bet = 0;
  return actions.map((a) => {
    switch (a.kind) {
      case 'fold':
        return 'var(--act-fold)';
      case 'check':
        return 'var(--act-check)';
      case 'call':
        return 'var(--act-call)';
      case 'allin':
        return 'var(--act-allin)';
      default:
        return BET_COLORS[Math.min(BET_COLORS.length - 1, bet++)]!;
    }
  });
}
