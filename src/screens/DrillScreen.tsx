import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpotInfoPanel } from '../components/drill/SpotInfoPanel';
import { StudyRangePanel } from '../components/drill/StudyRangePanel';
import { FrequencyBar } from '../components/FrequencyBar';
import { GradeBadge } from '../components/GradeBadge';
import { heroBetAfter, PokerTable } from '../components/PokerTable';
import { createRng, randomSeed } from '../lib/rng';
import { hrefFor } from '../lib/router';
import { DRILL_RANGE_MODES, usePrefs, type DrillRangeMode } from '../lib/prefs';
import { preflopBands } from '../lib/preflop/colors';
import { dealHand, type DealtHand, type DrillFilters } from '../lib/preflop/drill';
import { explain, type Explanation } from '../lib/preflop/explain';
import { isCorrect } from '../lib/preflop/grading';
import { ALL_SPOTS } from '../lib/preflop/spots';
import { ACTION_LABELS, isPosition, isSpotType, POSITIONS, SPOT_TYPE_NAMES, SPOT_TYPES, type Position, type PreflopAction, type SpotType } from '../lib/preflop/types';
import { addRecord } from '../lib/stats/store';

interface Answer {
  action: PreflopAction;
  result: Explanation;
}

const SHORTCUTS: Record<PreflopAction, string> = { fold: 'f', call: 'c', raise: 'r', '3bet': 'r', '4bet': 'r' };

const RANGE_MODE_LABELS: Record<DrillRangeMode, string> = { off: 'Off', after: 'After I answer', always: 'Always' };

function filtersFrom(params?: URLSearchParams): DrillFilters {
  const type = params?.get('type');
  const pos = params?.get('pos');
  const focus = params?.get('focus');
  return {
    types: isSpotType(type) ? [type] : [],
    positions: isPosition(pos) ? [pos] : [],
    focus: focus !== '0',
  };
}

function actionButtonLabel(d: DealtHand, a: PreflopAction): string {
  if (a === 'fold') return 'Fold';
  const amt = heroBetAfter(d.spot, a);
  return `${ACTION_LABELS[a]} ${amt}bb`;
}

export function DrillScreen({ params }: { params?: URLSearchParams }) {
  const seedParam = Number(params?.get('seed'));
  const [seed] = useState(() => (Number.isFinite(seedParam) && seedParam > 0 ? seedParam : randomSeed()));
  const [filters, setFilters] = useState<DrillFilters>(() => filtersFrom(params));
  const [dealNo, setDealNo] = useState(1);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [session, setSession] = useState({ hands: 0, correct: 0, assisted: 0 });
  // Deal number on which the range was visible before answering (open book), if any.
  const [peekedDeal, setPeekedDeal] = useState<number | null>(null);
  const [prefs, setPrefs] = usePrefs();
  const nextRef = useRef<HTMLButtonElement>(null);

  // Each deal is a pure function of (seed, deal number, filters), so a fixed ?seed= replays exactly.
  const deal = useMemo(
    () => dealHand(createRng((seed ^ Math.imul(dealNo, 0x9e3779b1)) >>> 0), ALL_SPOTS, filters),
    [seed, dealNo, filters],
  );

  const typeKey = params?.get('type') ?? '';
  const posKey = params?.get('pos') ?? '';
  // Follow filter changes that arrive through the URL (e.g. "drill this leak" links).
  const [lastParams, setLastParams] = useState(`${typeKey}|${posKey}`);
  if (lastParams !== `${typeKey}|${posKey}`) {
    setLastParams(`${typeKey}|${posKey}`);
    setFilters(filtersFrom(params));
    setDealNo((n) => n + 1);
    setAnswer(null);
  }

  if (deal && !answer && prefs.drillRange === 'always' && peekedDeal !== dealNo) setPeekedDeal(dealNo);

  const redeal = useCallback(() => {
    setDealNo((n) => n + 1);
    setAnswer(null);
  }, []);

  const updateFilters = (patch: Partial<DrillFilters>) => {
    setFilters({ ...filters, ...patch });
    redeal();
  };

  const choose = useCallback(
    (action: PreflopAction) => {
      if (!deal || answer) return;
      const result = explain(deal.spot, deal.hand, action);
      // Answers given after seeing the range (even briefly) are open-book practice, tracked separately.
      const assisted = prefs.drillRange === 'always' || peekedDeal === dealNo;
      setAnswer({ action, result });
      setSession((s) => ({
        hands: s.hands + 1,
        correct: s.correct + (!assisted && isCorrect(result.grade) ? 1 : 0),
        assisted: s.assisted + (assisted ? 1 : 0),
      }));
      addRecord({
        t: Date.now(),
        spotId: deal.spot.id,
        type: deal.spot.type,
        hero: deal.spot.hero,
        villain: deal.spot.villain,
        hand: deal.hand,
        action,
        grade: result.grade,
        ...(assisted ? { assisted: true } : {}),
      });
    },
    [deal, answer, prefs.drillRange, peekedDeal, dealNo],
  );

  useEffect(() => {
    if (answer) nextRef.current?.focus();
  }, [answer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!deal) return;
      const k = e.key.toLowerCase();
      if (!answer) {
        const a = deal.spot.actions.find((x) => SHORTCUTS[x] === k);
        if (a) {
          e.preventDefault();
          choose(a);
        }
      } else if (k === 'n') {
        e.preventDefault();
        redeal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deal, answer, choose, redeal]);

  const rangeVisible = !!deal && (prefs.drillRange === 'always' || (prefs.drillRange === 'after' && !!answer));
  const freqs = deal ? deal.spot.hands[deal.hand] : undefined;
  const bands = useMemo(() => (deal && freqs ? preflopBands(deal.spot.actions, freqs) : []), [deal, freqs]);

  return (
    <section className="drill" aria-labelledby="drill-title">
      <div className="screen-head">
        <div>
          <h1 id="drill-title">Preflop Drill</h1>
          <p className="muted small">
            Session: <strong data-testid="session-count">{session.hands}</strong> hands,{' '}
            {session.hands - session.assisted ? Math.round((session.correct / (session.hands - session.assisted)) * 100) : 0}% correct
            {session.assisted > 0 && <span data-testid="session-assisted"> · {session.assisted} with the range shown (not graded)</span>}
          </p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={prefs.fourColor} onChange={(e) => setPrefs({ fourColor: e.target.checked })} />
          <span>Four-color deck</span>
        </label>
      </div>

      <div className="filters panel" role="group" aria-label="Drill filters">
        <label className="field">
          Spot type
          <select
            value={filters.types[0] ?? ''}
            onChange={(e) => updateFilters({ types: isSpotType(e.target.value) ? [e.target.value as SpotType] : [] })}
            data-testid="filter-type"
          >
            <option value="">All spots</option>
            {SPOT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SPOT_TYPE_NAMES[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Your position
          <select
            value={filters.positions[0] ?? ''}
            onChange={(e) => updateFilters({ positions: isPosition(e.target.value) ? [e.target.value as Position] : [] })}
            data-testid="filter-position"
          >
            <option value="">All positions</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={filters.focus} onChange={(e) => updateFilters({ focus: e.target.checked })} />
          <span>Focus on close decisions</span>
        </label>
      </div>

      <div className="study-tools panel" role="group" aria-label="Study tools">
        <fieldset className="segmented" data-testid="range-mode">
          <legend>Show the range</legend>
          {DRILL_RANGE_MODES.map((m) => (
            <label key={m} className={`segment${prefs.drillRange === m ? ' on' : ''}`}>
              <input
                type="radio"
                name="drill-range-mode"
                value={m}
                checked={prefs.drillRange === m}
                onChange={() => setPrefs({ drillRange: m })}
                data-testid={`range-mode-${m}`}
              />
              <span>{RANGE_MODE_LABELS[m]}</span>
            </label>
          ))}
        </fieldset>
        <label className="toggle">
          <input type="checkbox" checked={prefs.drillInfo} onChange={(e) => setPrefs({ drillInfo: e.target.checked })} data-testid="spot-info-toggle" />
          <span>Spot info</span>
        </label>
        {prefs.drillRange === 'always' && <p className="small muted study-note">Open book: answers made while the range is visible are saved separately and don’t count toward your accuracy.</p>}
      </div>

      {!deal ? (
        <div className="panel empty-state">
          <p>No spots match these filters (for example, the big blind never raises first in). Pick another position or spot type.</p>
        </div>
      ) : (
        <div className="drill-layout">
          <div className="drill-table">
            <PokerTable spot={deal.spot} cards={deal.cards} fourColor={prefs.fourColor} dealKey={dealNo} heroAction={answer?.action ?? null} />
            <p className="situation" data-testid="situation">
              {deal.spot.description}
            </p>
            <div className="action-row" role="group" aria-label="Your action">
              {deal.spot.actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`btn action-btn action-${a}${answer?.action === a ? ' chosen' : ''}`}
                  onClick={() => choose(a)}
                  disabled={!!answer}
                  data-testid={`action-${a}`}
                  aria-keyshortcuts={SHORTCUTS[a].toUpperCase()}
                >
                  {actionButtonLabel(deal, a)}
                </button>
              ))}
            </div>
            {prefs.drillInfo && <SpotInfoPanel spot={deal.spot} hand={deal.hand} />}
          </div>
          <div className="drill-side">
            <div className="drill-result" aria-live="polite">
              {answer ? (
                <div className="panel result-panel" data-testid="drill-result">
                  <GradeBadge grade={answer.result.grade} animKey={dealNo} />
                  <h2 className="result-hand">
                    {deal.hand} <span className="muted">· {deal.spot.hero}</span>
                  </h2>
                  <FrequencyBar bands={bands} title={`${deal.hand} frequencies`} />
                  <p className="explanation" data-testid="explanation">
                    {answer.result.text}
                  </p>
                  <div className="result-actions">
                    <button ref={nextRef} type="button" className="btn btn-primary" onClick={redeal} data-testid="next-hand">
                      Next hand
                    </button>
                    <a className="btn btn-ghost" href={hrefFor('ranges', { spot: deal.spot.id, hand: deal.hand })} data-testid="view-range">
                      View full range
                    </a>
                  </div>
                </div>
              ) : (
                <div className={`panel hint-panel${rangeVisible ? ' with-range' : ''}`}>
                  <p className="muted">
                    Pick an action. Keyboard: <kbd>R</kbd> raise, <kbd>C</kbd> call, <kbd>F</kbd> fold, <kbd>N</kbd> next hand.
                  </p>
                </div>
              )}
            </div>
            {rangeVisible && <StudyRangePanel key={dealNo} spot={deal.spot} hand={deal.hand} beforeAnswer={!answer} />}
          </div>
        </div>
      )}
    </section>
  );
}
