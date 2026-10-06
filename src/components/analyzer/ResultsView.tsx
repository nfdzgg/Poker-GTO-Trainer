import { useEffect, useMemo, useState } from 'react';
import { actionColors } from '../../analyzer/colors';
import { ALL_CARDS, cardSuit, cardToString, cardRankChar, SUIT_SYMBOLS, type CardId } from '../../lib/poker/cards';
import { HAND_CLASSES } from '../../lib/poker/hands';
import { usePrefs } from '../../lib/prefs';
import type { ActionNode, HandRow, NodeView } from '../../solver/types';
import { FrequencyBar } from '../FrequencyBar';
import { PlayingCard } from '../PlayingCard';
import { RangeGrid, type CellInfo } from '../RangeGrid';
import { suitColorVar } from '../SuitIcon';

export interface ViewSource {
  view(history: number[]): Promise<NodeView>;
}

interface Crumb {
  label: string;
  history: number[];
}

export interface ClassSummary {
  weight: number;
  freqs: number[];
  ev?: number;
  equity?: number;
  combos: HandRow[];
}

/** Aggregate per-combo rows into hand classes, weighted by each combo's range weight. */
export function summarizeByClass(node: ActionNode): Map<string, ClassSummary> {
  const out = new Map<string, ClassSummary>();
  for (const r of node.hands) {
    let s = out.get(r.handClass);
    if (!s) {
      s = { weight: 0, freqs: node.actions.map(() => 0), combos: [] };
      out.set(r.handClass, s);
    }
    s.combos.push(r);
  }
  for (const s of out.values()) {
    const w = s.combos.reduce((a, r) => a + r.weight, 0);
    s.weight = w;
    if (w > 0) {
      s.freqs = node.actions.map((_, i) => s.combos.reduce((a, r) => a + (r.strategy[i] ?? 0) * r.weight, 0) / w);
      if (node.solved) s.ev = s.combos.reduce((a, r) => a + (r.ev ?? 0) * r.weight, 0) / w;
      s.equity = s.combos.reduce((a, r) => a + (r.equity ?? 0) * r.weight, 0) / w;
    }
  }
  return out;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const bb = (x: number | undefined) => (x === undefined ? '—' : `${x.toFixed(2)}bb`);

export function ComboLabel({ combo }: { combo: string }) {
  const [prefs] = usePrefs();
  const parts = [combo.slice(0, 2), combo.slice(2, 4)];
  return (
    <span className="combo-label">
      {parts.map((p, i) => {
        const s = p[1] as 'c' | 'd' | 'h' | 's';
        return (
          <span key={i} style={{ color: suitColorVar(s, prefs.fourColor) }} className="combo-card">
            {p[0]}
            {SUIT_SYMBOLS[s]}
          </span>
        );
      })}
    </span>
  );
}

/** "Recommended play" for one specific combo: the highest-frequency action, with the mix. */
export function recommendation(node: ActionNode, row: HandRow): string {
  const order = node.actions.map((a, i) => ({ a, f: row.strategy[i] ?? 0 })).sort((x, y) => y.f - x.f);
  const top = order[0]!;
  const mix = order.slice(1).filter((x) => x.f >= 0.005);
  return `${top.a.label} (${pct(top.f)})${mix.length ? ` · mix: ${mix.map((x) => `${x.a.label} ${pct(x.f)}`).join(', ')}` : ' · pure'}`;
}

interface Props {
  source: ViewSource;
  seats: { oop: string; ip: string };
  rootLabel: string;
  onNode?: (view: NodeView, history: number[]) => void;
}

export function ResultsView({ source, seats, rootLabel, onNode }: Props) {
  const [prefs] = usePrefs();
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ label: rootLabel, history: [] }]);
  const [view, setView] = useState<NodeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<string>('');
  const history = crumbs[crumbs.length - 1]!.history;
  const historyKey = history.join(',');

  useEffect(() => {
    let alive = true;
    source
      .view(historyKey ? historyKey.split(',').map(Number) : [])
      .then((v) => {
        if (!alive) return;
        setView(v);
        setError(null);
        onNode?.(v, historyKey ? historyKey.split(',').map(Number) : []);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [source, historyKey, onNode]);

  const node = view?.type === 'action' ? view : null;
  const summary = useMemo(() => (node ? summarizeByClass(node) : new Map<string, ClassSummary>()), [node]);
  const colors = useMemo(() => (node ? actionColors(node.actions) : []), [node]);

  // Default the hand selection to the strongest-weighted class in range.
  const cls = selectedClass && summary.get(selectedClass)?.weight ? selectedClass : (HAND_CLASSES.find((h) => (summary.get(h.label)?.weight ?? 0) > 0)?.label ?? null);
  const clsSummary = cls ? summary.get(cls) : undefined;
  const comboRows = clsSummary?.combos.filter((r) => r.weight > 0) ?? [];
  const combo = comboRows.find((r) => r.combo === selectedCombo) ?? comboRows[0];

  const go = (label: string, step: number) => {
    setCrumbs((c) => [...c, { label, history: [...history, step] }]);
    setView(null);
  };

  const getCell = (label: string): CellInfo => {
    const s = summary.get(label);
    if (!node || !s || s.weight <= 0) return { bands: node ? node.actions.map((a, i) => ({ key: a.code, label: a.label, freq: 0, color: colors[i]! })) : [], dimmed: true, note: 'not in range' };
    return { bands: node.actions.map((a, i) => ({ key: a.code, label: a.label, freq: s.freqs[i] ?? 0, color: colors[i]! })) };
  };

  return (
    <section className="results panel" aria-labelledby="results-title" data-testid="results">
      <h2 id="results-title">Results</h2>
      <nav className="breadcrumb" aria-label="Game tree position" data-testid="breadcrumb">
        <ol>
          {crumbs.map((c, i) => (
            <li key={i}>
              {i < crumbs.length - 1 ? (
                <button type="button" className="crumb" onClick={() => setCrumbs(crumbs.slice(0, i + 1))} data-testid={`crumb-${i}`}>
                  {c.label}
                </button>
              ) : (
                <span className="crumb current" aria-current="step">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {error && <p className="error-text">{error}</p>}
      {!view && !error && <p className="muted">Loading node…</p>}
      {view && (
        <div className="node-board" aria-label="Board">
          {view.board.map((c, i) => (
            <PlayingCard key={`${c}-${i}`} card={c} width={40} anim={i >= 3 ? 'flip' : 'none'} animKey={`${historyKey}-${c}`} fourColor={prefs.fourColor} />
          ))}
          <span className="node-pot">
            Pot <strong>{view.pot.toFixed(2)}bb</strong>
          </span>
        </div>
      )}
      {view?.type === 'terminal' && (
        <p className="muted" data-testid="terminal-node">
          This line ends here. Use the breadcrumb to go back.
        </p>
      )}
      {view?.type === 'chance' && (
        <div className="chance" data-testid="chance-node">
          <h3>Choose the {view.street} card</h3>
          <div className="deal-picker" role="group" aria-label={`Deal the ${view.street}`}>
            {ALL_CARDS.map((c: CardId) => {
              const ok = view.possibleCards.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  className="pick-card"
                  disabled={!ok}
                  aria-label={cardToString(c)}
                  onClick={() => go(`${view.street === 'turn' ? 'Turn' : 'River'} ${cardRankChar(c)}${SUIT_SYMBOLS[cardSuit(c)]}`, c)}
                  data-card={cardToString(c)}
                  style={{ color: suitColorVar(cardSuit(c), prefs.fourColor) }}
                >
                  <span className="pick-rank">{cardRankChar(c)}</span>
                  <span className="pick-suit" aria-hidden="true">
                    {SUIT_SYMBOLS[cardSuit(c)]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {node && (
        <>
          <div className="node-head">
            <h3 data-testid="node-player">
              {node.player === 'oop' ? seats.oop : seats.ip} to act
              <span className="muted small"> ({node.player.toUpperCase()}{node.toCall > 0 ? `, ${node.toCall.toFixed(2)}bb to call` : ''})</span>
            </h3>
            <p className="small muted" data-testid="range-ev">
              Range EV {bb(node.rangeEv)} · equity {node.rangeEquity !== undefined ? pct(node.rangeEquity) : '—'}
            </p>
          </div>
          <div className="node-actions" role="group" aria-label="Actions (click to move to the next node)">
            {node.actions.map((a, i) => (
              <button
                key={a.code}
                type="button"
                className="btn node-action"
                onClick={() => go(`${node.player === 'oop' ? seats.oop : seats.ip} ${a.label}`, i)}
                data-testid={`node-action-${i}`}
              >
                <span className="legend-swatch" style={{ background: colors[i] }} />
                <span>{a.label}</span> <strong>{pct(node.rangeFreqs[i] ?? 0)}</strong>
              </button>
            ))}
          </div>
          <FrequencyBar
            bands={node.actions.map((a, i) => ({ key: a.code, label: a.label, freq: node.rangeFreqs[i] ?? 0, color: colors[i]! }))}
            title="Whole range"
          />
          <div className="results-layout">
            <div data-testid="results-grid-wrap">
              <RangeGrid
                getCell={getCell}
                selected={cls}
                onSelect={(h) => {
                  setSelectedClass(h);
                  setSelectedCombo('');
                }}
                label={`Strategy for ${node.player === 'oop' ? seats.oop : seats.ip}`}
              />
            </div>
            <div className="hand-detail" data-testid="hand-detail">
              {cls && clsSummary && clsSummary.weight > 0 ? (
                <>
                  <h3>
                    {cls}{' '}
                    <span className="muted small">
                      EV {bb(clsSummary.ev)} · equity {clsSummary.equity !== undefined ? pct(clsSummary.equity) : '—'}
                    </span>
                  </h3>
                  <label className="field">
                    Specific hand
                    <select value={combo?.combo ?? ''} onChange={(e) => setSelectedCombo(e.target.value)} data-testid="combo-select">
                      {comboRows.map((r) => (
                        <option key={r.combo} value={r.combo}>
                          {r.combo}
                        </option>
                      ))}
                    </select>
                  </label>
                  {combo && (
                    <p className="recommended" data-testid="recommended-play">
                      Recommended play with <ComboLabel combo={combo.combo} />: <strong>{recommendation(node, combo)}</strong>
                    </p>
                  )}
                  <div className="table-scroll">
                    <table className="stat-table combo-table" data-testid="combo-table">
                      <thead>
                        <tr>
                          <th scope="col">Combo</th>
                          <th scope="col">Weight</th>
                          {node.actions.map((a) => (
                            <th key={a.code} scope="col">
                              {a.label}
                            </th>
                          ))}
                          <th scope="col">EV</th>
                          <th scope="col">Equity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clsSummary.combos.map((r) => (
                          <tr key={r.combo} className={r.weight > 0 ? '' : 'muted'}>
                            <th scope="row">
                              <ComboLabel combo={r.combo} />
                            </th>
                            <td>{pct(r.weight)}</td>
                            {node.actions.map((a, i) => (
                              <td key={a.code}>{pct(r.strategy[i] ?? 0)}</td>
                            ))}
                            <td>{bb(r.ev)}</td>
                            <td>{r.equity !== undefined ? pct(r.equity) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted">Select a hand in the grid to see each combo’s frequencies, EV and equity.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
