import type { ReactNode } from 'react';
import { spotFacts } from '../../lib/preflop/facts';
import type { SpotData } from '../../lib/preflop/types';

const bb = (x: number) => `${Number(x.toFixed(2))}bb`;

/** Context for the current drill spot: seats, prices, range widths and the hand's category. Never the answer. */
export function SpotInfoPanel({ spot, hand, action }: { spot: SpotData; hand: string; action?: ReactNode }) {
  const f = spotFacts(spot, hand);
  return (
    <section className="panel spot-info" aria-labelledby="spot-info-title" data-testid="spot-info">
      <div className="panel-head">
        <h2 id="spot-info-title">Spot info</h2>
        {action}
      </div>
      <dl className="facts">
        <div className="fact">
          <dt>Your seat</dt>
          <dd>
            <span className="fact-main">
              {f.heroName} ({f.hero})
            </span>{' '}
            <span className="fact-sub" data-testid="fact-position">
              {f.positionNote}
            </span>
          </dd>
        </div>
        <div className="fact">
          <dt>Still to act</dt>
          <dd data-testid="fact-behind">
            {f.playersBehind.length ? f.playersBehind.join(', ') : f.villain ? `Nobody: it is just you and ${f.villain}` : 'Nobody'}
          </dd>
        </div>
        <div className="fact">
          <dt>Pot</dt>
          <dd data-testid="fact-pot">
            {bb(f.pot)} · stacks {f.effectiveStack}bb
          </dd>
        </div>
        {f.potOdds !== null && (
          <div className="fact">
            <dt>Price</dt>
            <dd data-testid="fact-odds">
              {bb(f.toCall)} more into {bb(f.pot)}: you need {(f.potOdds * 100).toFixed(0)}% equity to call
            </dd>
          </div>
        )}
        {f.villainRange && (
          <div className="fact">
            <dt>Opponent</dt>
            <dd data-testid="fact-villain">{f.villainRange.text}</dd>
          </div>
        )}
        <div className="fact">
          <dt>Your chart</dt>
          <dd data-testid="fact-range">
            {f.heroRange.map((r) => `${r.label} ${r.percent.toFixed(1)}%`).join(' · ')} <span className="muted">({f.rangeBase})</span>
          </dd>
        </div>
        <div className="fact">
          <dt>Your hand</dt>
          <dd data-testid="fact-hand">
            {f.hand.label}: {f.hand.categoryLabel} · {f.hand.combos} combos
          </dd>
        </div>
      </dl>
      <p className="spot-tip" data-testid="fact-tip">
        <strong>Rule of thumb:</strong> {f.tip}
      </p>
    </section>
  );
}
