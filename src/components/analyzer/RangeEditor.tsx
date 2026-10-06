import { useId, useMemo, useState } from 'react';
import { formatRange, parseRange, rangeCombos, type RangeWeights } from '../../lib/poker/range';
import { ALL_SPOTS, spotTitle } from '../../lib/preflop/spots';
import { ACTION_LABELS } from '../../lib/preflop/types';
import { rangeFromSpot } from '../../solver/presets';
import { RangeGrid, type CellInfo } from '../RangeGrid';

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  testId: string;
}

/** Every Phase 1 spot × non-fold action as an importable preset. */
export const RANGE_PRESETS = ALL_SPOTS.flatMap((s) =>
  s.actions
    .filter((a) => a !== 'fold')
    .map((a) => ({ id: `${s.id}:${a}`, label: `${spotTitle(s)} — ${ACTION_LABELS[a].toLowerCase()}`, text: formatRange(rangeFromSpot(s, a)) }))
    .filter((p) => p.text.length > 0),
);

export function RangeEditor({ label, value, onChange, testId }: Props) {
  const id = useId();
  const [weight, setWeight] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const parsed = useMemo(() => parseRange(value), [value]);
  const range: RangeWeights = parsed.ok ? parsed.range : new Map();
  const combos = rangeCombos(range);

  const getCell = (h: string): CellInfo => {
    const w = range.get(h) ?? 0;
    return { bands: [{ key: 'w', label: 'Weight', freq: w, color: 'var(--accent)' }], dimmed: w === 0 };
  };

  const toggle = (h: string) => {
    const next = new Map(range);
    const w = weight / 100;
    if (Math.abs((next.get(h) ?? 0) - w) < 1e-9 || w === 0) next.delete(h);
    else next.set(h, w);
    onChange(formatRange(next));
  };

  return (
    <fieldset className="range-editor" data-testid={testId}>
      <legend>{label}</legend>
      <label className="field" htmlFor={`${id}-text`}>
        Range text
        <textarea
          id={`${id}-text`}
          rows={3}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!parsed.ok}
          aria-describedby={`${id}-info`}
          data-testid={`${testId}-text`}
        />
      </label>
      <p id={`${id}-info`} className={`small ${parsed.ok ? 'muted' : 'error-text'}`} data-testid={`${testId}-info`}>
        {parsed.ok ? `${combos.toFixed(1)} combos (${((combos / 1326) * 100).toFixed(1)}% of hands)` : parsed.error}
      </p>
      <div className="range-editor-row">
        <label className="field grow">
          Import a Phase 1 range
          <select
            value=""
            onChange={(e) => {
              const p = RANGE_PRESETS.find((x) => x.id === e.target.value);
              if (p) onChange(p.text);
            }}
            data-testid={`${testId}-preset`}
          >
            <option value="">Choose a preflop spot…</option>
            {RANGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" aria-expanded={showGrid} onClick={() => setShowGrid((v) => !v)} data-testid={`${testId}-grid-toggle`}>
          {showGrid ? 'Hide grid' : 'Edit on grid'}
        </button>
      </div>
      {showGrid && (
        <div className="range-editor-grid">
          <label className="field">
            Weight for clicked hands: <strong>{weight}%</strong>
            <input type="range" min={0} max={100} step={5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} data-testid={`${testId}-weight`} />
          </label>
          <RangeGrid getCell={getCell} onSelect={toggle} label={`${label} grid editor`} compact />
          <p className="muted small">Click a hand to set it to the chosen weight; click again to remove it.</p>
        </div>
      )}
    </fieldset>
  );
}
