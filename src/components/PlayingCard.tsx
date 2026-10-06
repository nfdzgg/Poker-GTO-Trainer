import { useId } from 'react';
import { cardName, cardRankChar, cardSuit, type CardId } from '../lib/poker/cards';
import { durationMs, useAnimPhases } from '../lib/motion/motion';
import { SUIT_PATHS, suitColorVar } from './SuitIcon';

export type CardAnim = 'deal' | 'flip' | 'none';
export type CardPhase = 'dealing' | 'face-down' | 'flipping' | 'revealed';

interface Props {
  card: CardId | null; // null = face-down card back
  fourColor?: boolean;
  width?: number;
  anim?: CardAnim;
  /** Changing this restarts the animation. */
  animKey?: unknown;
  delayMs?: number;
  className?: string;
}

/** An original SVG playing card. Faces are drawn from scratch: rank glyphs, pips and back pattern. */
export function CardFace({ card, fourColor = false }: { card: CardId; fourColor?: boolean }) {
  const suit = cardSuit(card);
  const rank = cardRankChar(card);
  const color = suitColorVar(suit, fourColor);
  const label = rank === 'T' ? '10' : rank;
  return (
    <svg viewBox="0 0 100 140" className="card-svg" aria-hidden="true">
      <rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="var(--card-face)" stroke="var(--card-edge)" strokeWidth="3" />
      <text x="10" y="31" fontSize={label === '10' ? 25 : 29} fontWeight="800" fill={color} fontFamily="var(--font-sans)" letterSpacing="-1">
        {label}
      </text>
      <path d={SUIT_PATHS[suit]} fill={color} transform="translate(9 37) scale(0.2)" />
      <path d={SUIT_PATHS[suit]} fill={color} transform="translate(26 50) scale(0.56)" />
      <g transform="rotate(180 50 70)">
        <text x="10" y="31" fontSize={label === '10' ? 25 : 29} fontWeight="800" fill={color} fontFamily="var(--font-sans)" letterSpacing="-1">
          {label}
        </text>
      </g>
    </svg>
  );
}

export function CardBack() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 140" className="card-svg" aria-hidden="true">
      <defs>
        <pattern id={`cb-${id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="var(--card-back)" />
          <rect width="4" height="10" fill="var(--card-back-pattern)" />
        </pattern>
      </defs>
      <rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="var(--card-face)" stroke="var(--card-edge)" strokeWidth="3" />
      <rect x="8" y="8" width="84" height="124" rx="6" fill={`url(#cb-${id})`} />
      <circle cx="50" cy="70" r="15" fill="var(--card-back)" stroke="var(--card-face)" strokeWidth="3" />
      <path d={SUIT_PATHS.s} fill="var(--card-face)" transform="translate(41 61) scale(0.18)" />
    </svg>
  );
}

export function PlayingCard({ card, fourColor = false, width = 64, anim = 'none', animKey, delayMs = 0, className = '' }: Props) {
  const steps =
    anim === 'deal'
      ? ([
          ['dealing', durationMs('--dur-deal') + delayMs],
          ['flipping', durationMs('--dur-flip')],
        ] as const)
      : anim === 'flip'
        ? ([
            ['face-down', delayMs + 60],
            ['flipping', durationMs('--dur-flip')],
          ] as const)
        : ([] as const);
  const phase = useAnimPhases<CardPhase>(steps, 'revealed', animKey ?? card, anim !== 'none');
  const showFace = card !== null;
  const label = card === null ? 'Face-down card' : cardName(card);
  return (
    <div
      className={`playing-card ${className}`}
      data-anim={phase}
      data-card={card === null ? 'back' : card}
      role="img"
      aria-label={label}
      style={{ width, height: Math.round(width * 1.4), animationDelay: `${delayMs}ms` }}
    >
      <div className="card-inner">
        <div className="card-face card-front">{showFace ? <CardFace card={card} fourColor={fourColor} /> : <CardBack />}</div>
        <div className="card-face card-back">
          <CardBack />
        </div>
      </div>
    </div>
  );
}
