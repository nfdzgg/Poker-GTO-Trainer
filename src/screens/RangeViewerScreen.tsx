import { useMemo, useState } from 'react';
import { RangeGrid, type CellInfo } from '../components/RangeGrid';
import { comboCount, isHandLabel } from '../lib/poker/hands';
import { CATEGORY_LABELS, categorize } from '../lib/preflop/categories';
import { ACTION_COLORS, preflopBands } from '../lib/preflop/colors';
import { reachWeight } from '../lib/preflop/drill';
import { ALL_SPOTS, getSpot } from '../lib/preflop/spots';
import { ACTION_LABELS, POSITIONS, SPOT_TYPE_NAMES, SPOT_TYPES, isSpotType, type Position, type SpotData, type SpotType } from '../lib/preflop/types';
import { actionPercent } from '../lib/preflop/validate';

const heroesFor = (t: SpotType) => POSITIONS.filter((p) => ALL_SPOTS.some((s) => s.type === t && s.hero === p));
const villainsFor = (t: SpotType, h: Position) =>
  ALL_SPOTS.filter((s) => s.type === t && s.hero === h && s.villain).map((s) => s.villain as Position);

function resolveSpot(type: SpotType, hero: Position, villain: Position | null): SpotData {
  const heroes = heroesFor(type);
  const h = heroes.includes(hero) ? hero : heroes[0]!;
  const vs = villainsFor(type, h);
  const v = type === 'rfi' ? null : villain && vs.includes(villain) ? villain : (vs[0] ?? null);
  return ALL_SPOTS.find((s) => s.type === type && s.hero === h && s.villain === v)!;
}

const fmt1 = (f: number) => `${(f * 100).toFixed(1)}%`;

export function RangeViewerScreen({ params }: { params?: URLSearchParams }) {
  const spotParam = params?.get('spot') ?? '';
  const handParam = params?.get('hand') ?? '';
  const [spot, setSpot] = useState<SpotData>(() => getSpot(spotParam) ?? getSpot('rfi-BTN')!);
  const [selected, setSelected] = useState<string | null>(isHandLabel(handParam) ? handParam : null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [lastParam, setLastParam] = useState(`${spotParam}|${handParam}`);
  if (lastParam !== `${spotParam}|${handParam}`) {
    setLastParam(`${spotParam}|${handParam}`);
    const s = getSpot(spotParam);
    if (s) setSpot(s);
    if (isHandLabel(handParam)) setSelected(handParam);
  }

  const getCell = useMemo(() => {
    return (label: string): CellInfo => {
      const inRange = reachWeight(spot, label) > 0;
      return {
        bands: preflopBands(spot.actions, spot.hands[label] ?? {}),
        dimmed: !inRange,
        note: inRange ? undefined : `not in the ${spot.hero} opening range`,
      };
    };
  }, [spot]);

  const totals = spot.actions.map((a) => ({ a, pct: actionPercent(spot, a) }));
  const detail = hovered ?? selected;
  const detailFreq = detail ? spot.hands[detail] : undefined;

  return (
    <section className="ranges" aria-labelledby="ranges-title">
      <div className="screen-head">
        <div>
          <h1 id="ranges-title">Range Viewer</h1>
          <p className="muted small">Hand-written approximations of solver charts · 6-max · 100bb</p>
        </div>
      </div>
      <div className="filters panel" role="group" aria-label="Choose a spot">
        <label className="field">
          Spot type
          <select
            value={spot.type}
            data-testid="viewer-type"
            onChange={(e) => isSpotType(e.target.value) && setSpot(resolveSpot(e.target.value, spot.hero, spot.villain))}
          >
            {SPOT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SPOT_TYPE_NAMES[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Hero position
          <select value={spot.hero} data-testid="viewer-hero" onChange={(e) => setSpot(resolveSpot(spot.type, e.target.value as Position, spot.villain))}>
            {heroesFor(spot.type).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {spot.type !== 'rfi' && (
          <label className="field">
            {spot.type === 'vs-open' ? 'Opener' : '3-bettor'}
            <select
              value={spot.villain ?? ''}
              data-testid="viewer-villain"
              onChange={(e) => setSpot(resolveSpot(spot.type, spot.hero, e.target.value as Position))}
            >
              {villainsFor(spot.type, spot.hero).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="viewer-layout">
        <div className="viewer-grid-wrap">
          <p className="situation" data-testid="viewer-description">
            {spot.description}
          </p>
          <RangeGrid
            getCell={getCell}
            selected={selected}
            onSelect={setSelected}
            onHover={setHovered}
            label={`Range for ${spot.description}`}
          />
          <div className="legend" data-testid="legend">
            {totals.map(({ a, pct }) => (
              <span key={a} className="legend-item" data-action={a}>
                <span className="legend-swatch" style={{ background: ACTION_COLORS[a] }} />
                {ACTION_LABELS[a]} <strong>{pct.toFixed(1)}%</strong>
              </span>
            ))}
            <span className="legend-note muted small">of all 1326 combos</span>
          </div>
        </div>
        <aside className="panel cell-detail" aria-live="polite" data-testid="cell-detail">
          {detail && detailFreq ? (
            <>
              <h2>{detail}</h2>
              <p className="muted small">
                {CATEGORY_LABELS[categorize(detail)]} · {comboCount(detail)} combos
              </p>
              {reachWeight(spot, detail) <= 0 && <p className="small">Not in the {spot.hero} opening range: this hand never reaches this spot.</p>}
              <dl className="freq-list">
                {spot.actions.map((a) => (
                  <div key={a} className="freq-row">
                    <dt>
                      <span className="legend-swatch" style={{ background: ACTION_COLORS[a] }} />
                      {ACTION_LABELS[a]}
                    </dt>
                    <dd>{fmt1(detailFreq[a] ?? 0)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="muted">Hover, tap or focus a hand to see its exact frequencies and combo count.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
