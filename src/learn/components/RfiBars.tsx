import { getSpot } from '../../lib/preflop/spots';
import type { Position } from '../../lib/preflop/types';
import { actionPercent } from '../../lib/preflop/validate';

const SEATS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];

/** How much of the 1326 combos each seat opens, straight from the charts. */
export function rfiPercents(): { pos: Position; pct: number }[] {
  return SEATS.map((pos) => ({ pos, pct: actionPercent(getSpot(`rfi-${pos}`)!, 'raise') }));
}

export function RfiBars() {
  const rows = rfiPercents();
  return (
    <figure className="rfi-bars" aria-label={`Share of hands opened: ${rows.map((r) => `${r.pos} ${r.pct.toFixed(0)}%`).join(', ')}`} data-testid="rfi-bars">
      {rows.map((r) => (
        <div key={r.pos} className="rfi-row">
          <span className="rfi-pos">{r.pos}</span>
          <span className="rfi-track" aria-hidden="true">
            <span className="rfi-fill" style={{ width: `${r.pct}%` }} />
          </span>
          <span className="rfi-pct">{r.pct.toFixed(0)}%</span>
        </div>
      ))}
      <figcaption className="muted small">Share of all starting hands each seat opens when everyone folds to it.</figcaption>
    </figure>
  );
}
