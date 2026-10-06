import type { Suit } from '../lib/poker/cards';

// Original suit shapes drawn on a 100×100 grid.
export const SUIT_PATHS: Record<Suit, string> = {
  h: 'M50 88 C 20 66 4 46 14 27 C 23 11 43 13 50 30 C 57 13 77 11 86 27 C 96 46 80 66 50 88 Z',
  d: 'M50 6 Q 67 30 86 50 Q 67 70 50 94 Q 33 70 14 50 Q 33 30 50 6 Z',
  s: 'M50 8 C 62 28 92 44 86 66 C 81 82 62 82 54 70 C 56 80 60 88 68 93 L 32 93 C 40 88 44 80 46 70 C 38 82 19 82 14 66 C 8 44 38 28 50 8 Z',
  c: 'M50 14 A 16 16 0 0 1 64 38 A 16 16 0 1 1 56 64 C 57 78 61 87 68 93 L 32 93 C 39 87 43 78 44 64 A 16 16 0 1 1 36 38 A 16 16 0 0 1 50 14 Z',
};

export function suitColorVar(suit: Suit, fourColor: boolean): string {
  if (suit === 'h') return 'var(--suit-heart)';
  if (suit === 's') return 'var(--suit-spade)';
  if (suit === 'd') return fourColor ? 'var(--suit4-diamond)' : 'var(--suit-diamond)';
  return fourColor ? 'var(--suit4-club)' : 'var(--suit-club)';
}

export function SuitIcon({ suit, fourColor = false, size = 16, title }: { suit: Suit; fourColor?: boolean; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={SUIT_PATHS[suit]} fill={suitColorVar(suit, fourColor)} />
    </svg>
  );
}
