import { FrequencyBar } from '../../components/FrequencyBar';
import { preflopBands } from '../../lib/preflop/colors';
import { getSpot, spotTitle } from '../../lib/preflop/spots';

/** One hand's chart frequencies in one spot, as a labelled bar. */
export function HandExample({ spotId, hand, note }: { spotId: string; hand: string; note?: string }) {
  const s = getSpot(spotId);
  if (!s) return null;
  const f = s.hands[hand] ?? {};
  return (
    <div className="hand-example">
      <p className="hand-example-title">
        <strong>{hand}</strong> <span className="muted">· {spotTitle(s)}</span>
      </p>
      <FrequencyBar bands={preflopBands(s.actions, f)} title={`${hand}, ${spotTitle(s)}`} />
      {note && <p className="muted small">{note}</p>}
    </div>
  );
}
