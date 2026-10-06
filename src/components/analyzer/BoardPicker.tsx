import { useState } from 'react';
import { cardId, cardToString, parseBoard, SUIT_SYMBOLS, type CardId, type Suit } from '../../lib/poker/cards';
import { usePrefs } from '../../lib/prefs';
import { PlayingCard } from '../PlayingCard';
import { suitColorVar } from '../SuitIcon';

const RANKS = 'AKQJT98765432';
const SUIT_ROWS: Suit[] = ['s', 'h', 'd', 'c'];
const SUIT_INDEX: Record<Suit, number> = { c: 0, d: 1, h: 2, s: 3 };

interface Props {
  value: string; // e.g. "Qs7h2d"
  onChange: (board: string) => void;
}

/** Click-to-pick board (3–5 cards). A card can only be picked once. */
export function BoardPicker({ value, onChange }: Props) {
  const [prefs] = usePrefs();
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setText(value);
  }
  const cards = parseBoard(value) ?? [];
  const selected = new Set(cards);
  const full = cards.length >= 5;

  const toggle = (c: CardId) => {
    const next = selected.has(c) ? cards.filter((x) => x !== c) : [...cards, c];
    onChange(next.map(cardToString).join(''));
  };

  return (
    <fieldset className="board-picker" data-testid="board-picker">
      <legend>Board</legend>
      <div className="board-cards" aria-label="Selected board cards">
        {cards.length === 0 && <span className="muted small">Pick 3 to 5 cards</span>}
        {cards.map((c, i) => (
          <PlayingCard key={`${c}-${i}`} card={c} anim="flip" width={46} fourColor={prefs.fourColor} delayMs={i * 60} />
        ))}
      </div>
      <label className="field">
        Board text
        <input
          type="text"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value.replace(/[\s,]+/g, ''));
          }}
          placeholder="Qs7h2d"
          data-testid="board-text"
        />
      </label>
      <div className="card-picker" role="group" aria-label="Pick board cards">
        {RANKS.split('').map((r) => (
          <div key={r} className="card-picker-rank" role="presentation">
            {SUIT_ROWS.map((s) => {
              const c = cardId('23456789TJQKA'.indexOf(r), SUIT_INDEX[s]);
              const on = selected.has(c);
              return (
                <button
                  key={r + s}
                  type="button"
                  className={`pick-card${on ? ' on' : ''}`}
                  aria-pressed={on}
                  aria-label={cardToString(c)}
                  disabled={!on && full}
                  onClick={() => toggle(c)}
                  data-card={cardToString(c)}
                  style={{ color: suitColorVar(s, prefs.fourColor) }}
                >
                  <span className="pick-rank">{r}</span>
                  <span className="pick-suit" aria-hidden="true">
                    {SUIT_SYMBOLS[s]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
