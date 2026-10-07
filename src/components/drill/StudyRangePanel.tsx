import { useMemo, useState } from 'react';
import { comboCount } from '../../lib/poker/hands';
import { CATEGORY_LABELS, categorize } from '../../lib/preflop/categories';
import { ACTION_COLORS, preflopBands } from '../../lib/preflop/colors';
import { reachWeight } from '../../lib/preflop/drill';
import { reachPercent } from '../../lib/preflop/facts';
import { spotTitle } from '../../lib/preflop/spots';
import { ACTION_LABELS, type SpotData } from '../../lib/preflop/types';
import { RangeGrid, type CellInfo } from '../RangeGrid';

const pct1 = (f: number) => `${(f * 100).toFixed(1)}%`;

interface Props {
  spot: SpotData;
  hand: string;
  /** True while the user is still deciding (range shown before answering). */
  beforeAnswer: boolean;
}

/** The chart for the current drill spot, with the dealt hand outlined. Hover, tap or focus a hand for exact numbers. */
export function StudyRangePanel({ spot, hand, beforeAnswer }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const getCell = useMemo(
    () =>
      (label: string): CellInfo => {
        const inRange = reachWeight(spot, label) > 0;
        return {
          bands: preflopBands(spot.actions, spot.hands[label] ?? {}),
          dimmed: !inRange,
          note: inRange ? undefined : `not in the ${spot.hero} opening range`,
        };
      },
    [spot],
  );
  const detail = hovered ?? pinned ?? hand;
  const f = spot.hands[detail] ?? {};
  const base = spot.heroRangeSpot ? 'of your opening range' : 'of all hands';
  return (
    <section className="panel study-range" aria-labelledby="study-range-title" data-testid="study-range">
      <div className="study-head">
        <h2 id="study-range-title">Range: {spotTitle(spot)}</h2>
        <span className={`study-badge${beforeAnswer ? ' open-book' : ''}`}>{beforeAnswer ? 'Open book' : 'Review'}</span>
      </div>
      <p className="muted small">
        Your hand <strong>{hand}</strong> is outlined. Hover, tap or focus any hand for its exact mix.
      </p>
      <RangeGrid getCell={getCell} selected={hand} onSelect={setPinned} onHover={setHovered} label={`Range for ${spot.description}`} compact />
      <div className="legend" data-testid="study-legend">
        {spot.actions.map((a) => (
          <span key={a} className="legend-item" data-action={a}>
            <span className="legend-swatch" style={{ background: ACTION_COLORS[a] }} />
            {ACTION_LABELS[a]} <strong>{reachPercent(spot, a).toFixed(1)}%</strong>
          </span>
        ))}
        <span className="legend-note muted small">{base}</span>
      </div>
      <div className="study-detail" data-testid="study-detail" aria-live="polite">
        <h3>
          {detail}
          {detail === hand && <span className="muted small"> · your hand</span>}
        </h3>
        <p className="muted small">
          {CATEGORY_LABELS[categorize(detail)]} · {comboCount(detail)} combos
          {reachWeight(spot, detail) <= 0 ? ` · not in the ${spot.hero} opening range` : ''}
        </p>
        <dl className="freq-list">
          {spot.actions.map((a) => (
            <div key={a} className="freq-row">
              <dt>
                <span className="legend-swatch" style={{ background: ACTION_COLORS[a] }} />
                {ACTION_LABELS[a]}
              </dt>
              <dd>{pct1(f[a] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
