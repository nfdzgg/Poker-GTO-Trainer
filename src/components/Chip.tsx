import { durationMs, useAnimPhases } from '../lib/motion/motion';

export type ChipColor = 'white' | 'red' | 'green' | 'black';
const FILL: Record<ChipColor, string> = {
  white: 'var(--chip-1)',
  red: 'var(--chip-5)',
  green: 'var(--chip-25)',
  black: 'var(--chip-100)',
};

/** An original SVG casino chip: solid body, stripe ring and inlay. */
export function Chip({ color = 'red', size = 22 }: { color?: ChipColor; size?: number }) {
  const inlay = color === 'white' ? 'var(--chip-5)' : 'var(--chip-stripe)';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="chip-svg" aria-hidden="true" data-chip={color}>
      <circle cx="20" cy="20" r="19" fill={FILL[color]} />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke={inlay} strokeWidth="5" strokeDasharray="6 6.17" />
      <circle cx="20" cy="20" r="11" fill={FILL[color]} stroke={inlay} strokeWidth="1.2" />
      <circle cx="20" cy="20" r="6" fill="none" stroke={inlay} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/** Pick chip colors for an amount in big blinds (purely decorative). */
export function chipsFor(amountBb: number): ChipColor[] {
  const out: ChipColor[] = [];
  let left = amountBb;
  const denoms: [number, ChipColor][] = [
    [25, 'black'],
    [5, 'green'],
    [1, 'red'],
    [0.5, 'white'],
  ];
  for (const [d, c] of denoms) {
    while (left >= d - 1e-9 && out.length < 5) {
      out.push(c);
      left -= d;
    }
  }
  return out.length ? out : ['white'];
}

export function ChipStack({ amount, size = 20 }: { amount: number; size?: number }) {
  const chips = chipsFor(amount);
  return (
    <span className="chip-stack" aria-hidden="true">
      {chips.map((c, i) => (
        <span key={i} className="chip-stack-item" style={{ transform: `translateY(${-i * 3}px)` }}>
          <Chip color={c} size={size} />
        </span>
      ))}
    </span>
  );
}

export type ChipPhase = 'idle' | 'moving' | 'in-pot';

/** A bet that slides into the pot once `toPot` becomes true. */
export function BetChips({ amount, toPot, label }: { amount: number; toPot: boolean; label?: string }) {
  const phase = useAnimPhases<ChipPhase>([['moving', durationMs('--dur-chip')]] as const, 'in-pot', toPot ? 'go' : 'stay', toPot);
  const shown: ChipPhase = toPot ? phase : 'idle';
  return (
    <span className="bet-chips" data-anim={shown} data-testid="bet-chips">
      <ChipStack amount={amount} />
      {label && <span className="bet-amount">{label}</span>}
    </span>
  );
}
