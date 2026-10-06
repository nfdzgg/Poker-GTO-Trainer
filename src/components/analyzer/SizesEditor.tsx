import { parseSizeList, streetsFor, type SizesForm } from '../../analyzer/form';
import type { Player, Street } from '../../solver/types';

interface Props {
  sizes: SizesForm;
  allIn: boolean;
  boardLength: number;
  oopSeat: string;
  ipSeat: string;
  onChange: (sizes: SizesForm) => void;
  onAllIn: (v: boolean) => void;
}

const STREET_LABEL: Record<Street, string> = { flop: 'Flop', turn: 'Turn', river: 'River' };

/** Bet and raise sizes (% of pot) per street and player. */
export function SizesEditor({ sizes, allIn, boardLength, oopSeat, ipSeat, onChange, onAllIn }: Props) {
  const streets = streetsFor(boardLength);
  const set = (st: Street, p: Player, k: 'bet' | 'raise', v: string) =>
    onChange({ ...sizes, [st]: { ...sizes[st], [p]: { ...sizes[st][p], [k]: v } } });
  return (
    <fieldset className="sizes-editor" data-testid="sizes-editor">
      <legend>Bet sizes (% of pot)</legend>
      {streets.map((st) => (
        <div key={st} className="sizes-street">
          <h4>{STREET_LABEL[st]}</h4>
          <div className="sizes-grid">
            {(['oop', 'ip'] as const).map((p) =>
              (['bet', 'raise'] as const).map((k) => {
                const v = sizes[st][p][k];
                const ok = parseSizeList(v).ok;
                return (
                  <label key={`${p}-${k}`} className="field">
                    {p === 'oop' ? oopSeat : ipSeat} {k}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={v}
                      placeholder={k === 'bet' ? 'e.g. 33, 75' : 'e.g. 60'}
                      onChange={(e) => set(st, p, k, e.target.value)}
                      aria-invalid={!ok}
                      data-testid={`size-${st}-${p}-${k}`}
                    />
                  </label>
                );
              }),
            )}
          </div>
        </div>
      ))}
      <label className="toggle">
        <input type="checkbox" checked={allIn} onChange={(e) => onAllIn(e.target.checked)} data-testid="allin-toggle" />
        <span>Allow all-in as a bet and raise option</span>
      </label>
    </fieldset>
  );
}
