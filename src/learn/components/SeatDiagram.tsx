import { POSITION_NAMES, POSITIONS, type Position } from '../../lib/preflop/types';

const POSTFLOP_ORDER: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

interface Props {
  /** Show the order in which seats act. */
  order?: 'preflop' | 'postflop';
  highlight?: Position[];
  caption: string;
}

/** A static 6-max table with the seats labelled, optionally numbered in acting order. */
export function SeatDiagram({ order, highlight = [], caption }: Props) {
  const seq = order === 'postflop' ? POSTFLOP_ORDER : POSITIONS;
  return (
    <figure className="seat-diagram">
      <div className="table-felt diagram-felt" role="img" aria-label={`${caption}. ${seq.map((p, i) => `${order ? `${i + 1}. ` : ''}${POSITION_NAMES[p]} (${p})`).join(', ')}`}>
        <div className="table-rail" aria-hidden="true" />
        <div className="diagram-center" aria-hidden="true">
          {order === 'preflop' ? 'Preflop order' : order === 'postflop' ? 'Postflop order' : '6-max'}
        </div>
        {POSITIONS.map((p, i) => {
          // BTN at the bottom right, seats clockwise
          const angle = ((60 + i * 60 + 180) * Math.PI) / 180;
          const x = 50 + Math.cos(angle) * 42;
          const y = 50 + Math.sin(angle) * 38;
          const n = order ? seq.indexOf(p) + 1 : null;
          return (
            <div key={p} className={`seat diagram-seat${highlight.includes(p) ? ' seat-hero' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
              {n !== null && <span className="seat-order">{n}</span>}
              <span className="seat-pos">{p}</span>
              <span className="seat-note">{POSITION_NAMES[p]}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="muted small">{caption}</figcaption>
    </figure>
  );
}
