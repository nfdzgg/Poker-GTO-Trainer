import type { CSSProperties } from 'react';

/** The dealer button: an original SVG puck marked "D" that sits in front of the BTN seat. Decorative. */
export function DealerButton({ size = 26, className = '', style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={`dealer-button ${className}`.trim()} style={style} data-testid="dealer-button" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 40 40" className="dealer-svg">
        <circle cx="20" cy="20" r="19" fill="var(--chip-1)" stroke="var(--card-edge)" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="14.5" fill="none" stroke="var(--card-edge)" strokeWidth="1.2" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="19" fontWeight="800" fill="var(--text-on-card)">
          D
        </text>
      </svg>
    </span>
  );
}
