import { useRef, useState, type KeyboardEvent } from 'react';
import { comboCount, HAND_CLASSES } from '../lib/poker/hands';
import type { Band } from './FrequencyBar';

export interface CellInfo {
  bands: Band[];
  dimmed?: boolean; // e.g. not in range
  note?: string;
}

interface Props {
  getCell: (label: string) => CellInfo;
  selected?: string | null;
  onSelect?: (label: string) => void;
  onHover?: (label: string | null) => void;
  label: string; // accessible name for the grid
  compact?: boolean;
}

const fmt = (f: number) => `${Math.round(f * 1000) / 10}%`;

export function cellAriaLabel(label: string, info: CellInfo): string {
  const parts = info.bands.map((b) => `${b.label} ${fmt(b.freq)}`).join(', ');
  const combos = comboCount(label);
  return `${label}: ${parts}. ${combos} combos${info.note ? `. ${info.note}` : ''}`;
}

/**
 * 13×13 hand grid (pairs on the diagonal, suited above, offsuit below). Each
 * cell shows proportional action bands. Cells are buttons with ARIA labels and
 * a roving tabindex (arrow keys move focus).
 */
export function RangeGrid({ getCell, selected, onSelect, onHover, label, compact = false }: Props) {
  const [focusIdx, setFocusIdx] = useState(() => Math.max(0, HAND_CLASSES.findIndex((h) => h.label === selected)));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const r = Math.floor(idx / 13);
    const c = idx % 13;
    let next: number;
    if (e.key === 'ArrowRight') next = r * 13 + Math.min(12, c + 1);
    else if (e.key === 'ArrowLeft') next = r * 13 + Math.max(0, c - 1);
    else if (e.key === 'ArrowDown') next = Math.min(12, r + 1) * 13 + c;
    else if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * 13 + c;
    else if (e.key === 'Home') next = r * 13;
    else if (e.key === 'End') next = r * 13 + 12;
    else return;
    e.preventDefault();
    setFocusIdx(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={`range-grid${compact ? ' compact' : ''}`} role="grid" aria-label={label} data-testid="range-grid">
      {Array.from({ length: 13 }, (_, r) => (
        <div className="range-row" role="row" key={r}>
          {HAND_CLASSES.slice(r * 13, r * 13 + 13).map((h, c) => {
            const idx = r * 13 + c;
            const info = getCell(h.label);
            const visible = info.bands.filter((b) => b.freq > 0.0005);
            return (
              <div role="gridcell" key={h.label} className="range-gridcell">
                <button
                  ref={(el) => {
                    refs.current[idx] = el;
                  }}
                  type="button"
                  className={`range-cell kind-${h.kind}${info.dimmed ? ' dimmed' : ''}${selected === h.label ? ' selected' : ''}`}
                  data-hand={h.label}
                  aria-label={cellAriaLabel(h.label, info)}
                  aria-pressed={selected === h.label}
                  tabIndex={idx === focusIdx ? 0 : -1}
                  onClick={() => {
                    setFocusIdx(idx);
                    onSelect?.(h.label);
                  }}
                  onFocus={() => onHover?.(h.label)}
                  onMouseEnter={() => onHover?.(h.label)}
                  onMouseLeave={() => onHover?.(null)}
                  onKeyDown={(e) => move(e, idx)}
                >
                  <span className="range-bands" aria-hidden="true">
                    {visible.map((b) => (
                      <span key={b.key} className="range-band" data-action={b.key} style={{ width: `${b.freq * 100}%`, background: b.color }} />
                    ))}
                  </span>
                  <span className="range-cell-label">{h.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
