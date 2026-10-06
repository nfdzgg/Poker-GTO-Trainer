import type { CardId } from '../lib/poker/cards';
import { POSITIONS, type Position, type PreflopAction, type SpotData } from '../lib/preflop/types';
import { BetChips, ChipStack } from './Chip';
import { PlayingCard } from './PlayingCard';

type SeatStatus = 'hero' | 'folded' | 'waiting' | 'raised' | '3bet';
interface Seat {
  pos: Position;
  status: SeatStatus;
  bet: number;
  note: string;
}

const BLIND: Partial<Record<Position, number>> = { SB: 0.5, BB: 1 };

export function seatStates(spot: SpotData): Seat[] {
  const order = POSITIONS;
  const hi = order.indexOf(spot.hero);
  return order.map((pos, i) => {
    const blind = BLIND[pos] ?? 0;
    if (pos === spot.hero) {
      const bet = spot.type === 'vs-3bet' ? spot.sizes.open : blind;
      return { pos, status: 'hero', bet, note: 'You' };
    }
    if (spot.type === 'rfi') {
      return i < hi ? { pos, status: 'folded', bet: 0, note: 'Fold' } : { pos, status: 'waiting', bet: blind, note: blind ? `Posts ${blind}` : '' };
    }
    if (spot.type === 'vs-open') {
      if (pos === spot.villain) return { pos, status: 'raised', bet: spot.sizes.open, note: `Raise ${spot.sizes.open}` };
      return i < hi ? { pos, status: 'folded', bet: 0, note: 'Fold' } : { pos, status: 'waiting', bet: blind, note: blind ? `Posts ${blind}` : '' };
    }
    if (pos === spot.villain) return { pos, status: '3bet', bet: spot.sizes.threeBet ?? 0, note: `3-bet ${spot.sizes.threeBet}` };
    return { pos, status: 'folded', bet: 0, note: 'Fold' };
  });
}

/** Total hero commitment after taking `action` (bb). */
export function heroBetAfter(spot: SpotData, action: PreflopAction): number {
  switch (action) {
    case 'raise':
      return spot.sizes.open;
    case '3bet':
      return spot.sizes.threeBet ?? 0;
    case '4bet':
      return spot.sizes.fourBet ?? 0;
    case 'call':
      return spot.type === 'vs-3bet' ? (spot.sizes.threeBet ?? 0) : spot.sizes.open;
    default:
      return 0;
  }
}

interface Props {
  spot: SpotData;
  cards: [CardId, CardId];
  fourColor: boolean;
  dealKey: unknown;
  heroAction: PreflopAction | null;
}

export function PokerTable({ spot, cards, fourColor, dealKey, heroAction }: Props) {
  const seats = seatStates(spot);
  const heroIdx = POSITIONS.indexOf(spot.hero);
  const heroBet = heroAction && heroAction !== 'fold' ? heroBetAfter(spot, heroAction) : 0;
  return (
    <div className="poker-table" data-testid="poker-table">
      <div className="table-felt">
        <div className="table-rail" aria-hidden="true" />
        <div className="table-center">
          <ChipStack amount={spot.pot} size={18} />
          <div className="pot-label">
            Pot <strong>{spot.pot}bb</strong>
          </div>
        </div>
        {seats.map((s) => {
          const k = (POSITIONS.indexOf(s.pos) - heroIdx + 6) % 6;
          const angle = ((90 + k * 60) * Math.PI) / 180;
          const x = 50 + Math.cos(angle) * 44;
          const y = 50 + Math.sin(angle) * 40;
          const bx = 50 + Math.cos(angle) * 27;
          const by = 50 + Math.sin(angle) * 22;
          const isHero = s.status === 'hero';
          return (
            <div key={s.pos}>
              <div
                className={`seat seat-${s.status}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                data-position={s.pos}
                aria-label={`${s.pos}${isHero ? ' (you)' : ''}: ${s.note || 'waiting'}`}
              >
                <span className="seat-pos">{s.pos}</span>
                {!isHero && <span className="seat-note">{s.note || '…'}</span>}
              </div>
              {s.bet > 0 && !isHero && (
                <div className="seat-bet" style={{ left: `${bx}%`, top: `${by}%` }}>
                  <ChipStack amount={s.bet} size={16} />
                  <span className="bet-amount">{s.bet}</span>
                </div>
              )}
              {isHero && (s.bet > 0 || heroBet > 0) && (
                <div className="seat-bet hero-bet" style={{ left: `${bx - 22}%`, top: `${by}%` }}>
                  <BetChips amount={heroBet || s.bet} toPot={heroBet > 0} label={`${heroBet || s.bet}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="hero-cards" aria-label="Your hand">
        <PlayingCard card={cards[0]} fourColor={fourColor} anim="deal" animKey={dealKey} width={68} />
        <PlayingCard card={cards[1]} fourColor={fourColor} anim="deal" animKey={dealKey} width={68} delayMs={90} className="second" />
      </div>
    </div>
  );
}
