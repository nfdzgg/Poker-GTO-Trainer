import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpotInfoPanel } from '../components/drill/SpotInfoPanel';
import { RangePlaceholder, StudyRangePanel } from '../components/drill/StudyRangePanel';
import { FrequencyBar } from '../components/FrequencyBar';
import { GradeBadge } from '../components/GradeBadge';
import { heroBetAfter, PokerTable } from '../components/PokerTable';
import { createRng, randomSeed } from '../lib/rng';
import { hrefFor } from '../lib/router';
import { DRILL_FIT_QUERY, useMediaQuery } from '../lib/media';
import { DRILL_RANGE_MODES, usePrefs, type DrillRangeMode } from '../lib/prefs';
import { preflopBands } from '../lib/preflop/colors';
import { dealHand, type DealtHand, type DrillFilters } from '../lib/preflop/drill';
import { explain, type Explanation } from '../lib/preflop/explain';
import { GRADE_LABELS, isCorrect } from '../lib/preflop/grading';
import { ALL_SPOTS } from '../lib/preflop/spots';
import { ACTION_LABELS, isPosition, isSpotType, POSITIONS, SPOT_TYPE_NAMES, SPOT_TYPES, type Position, type PreflopAction, type SpotType } from '../lib/preflop/types';
import { addRecord, loadStats } from '../lib/stats/store';
import { getStage, stageProgress } from '../learn/plan';
import { useCourseProgress } from '../learn/progress';

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
  const [statsVersion, setStatsVersion] = useState(0);
  const [course] = useCourseProgress();
  // Deal number on which the range was visible before answering (open book), if any.
  const [peekedDeal, setPeekedDeal] = useState<number | null>(null);
  const [prefs, setPrefs] = usePrefs();
  // One-screen desktop layout (columns) or the stacked phone/tablet layout.
  const fit = useMediaQuery(DRILL_FIT_QUERY);
  // One-screen layout only: after answering, the side column shows the result and the spot info is one click away.
  const [coachView, setCoachView] = useState<'result' | 'info'>('result');
  const nextRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const showInfoRef = useRef<HTMLButtonElement>(null);
  const showResultRef = useRef<HTMLButtonElement>(null);
  // Which toggle the user just pressed, so focus can move to its counterpart once it is rendered.
  const toggledTo = useRef<'result' | 'info' | null>(null);

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
      setCoachView('result');
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
      setStatsVersion((v) => v + 1);
    },
    [deal, answer, prefs.drillRange, peekedDeal, dealNo],
  );

  useEffect(() => {
    if (answer) nextRef.current?.focus();
  }, [answer]);

  useEffect(() => {
    if (toggledTo.current === 'info') showResultRef.current?.focus();
    else if (toggledTo.current === 'result') showInfoRef.current?.focus();
    toggledTo.current = null;
  }, [coachView]);

  const toggleCoach = (view: 'result' | 'info') => {
    toggledTo.current = view;
    setCoachView(view);
  };

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
  // Practice-plan goal (from links like #/drill?type=rfi&goal=open).
  const goalStage = getStage(params?.get('goal'));
  const goal = useMemo(() => {
    if (!goalStage || !goalStage.filter) return null;
    void statsVersion; // recompute after every answer
    return { stage: goalStage, progress: stageProgress(goalStage, loadStats()) };
  }, [goalStage, statsVersion]);
  const showNudge = useMemo(() => {
    void statsVersion;
    return course.completed.length === 0 && course.last === null && loadStats().records.length === 0;
  }, [course, statsVersion]);
  const freqs = deal ? deal.spot.hands[deal.hand] : undefined;
  const bands = useMemo(() => (deal && freqs ? preflopBands(deal.spot.actions, freqs) : []), [deal, freqs]);

  const gradeIcon = answer ? (answer.result.grade === 'best' ? '✓' : answer.result.grade === 'acceptable' ? '≈' : '✕') : '';
  // Stacked layout: result, range and spot info are all shown, one under the other.
  const viewingInfo = fit && !!answer && prefs.drillInfo && coachView === 'info';

  const goalStrip = goal && (
    <div className={`goal-strip panel${goal.progress.done ? ' done' : ''}`} data-testid="goal-strip" aria-live="polite">
      <div className="goal-text">
        <strong>{goal.progress.done ? '✓ Goal reached: ' : 'Goal: '}</strong>
        {goal.stage.title} <span className="muted">· {goal.progress.summary}</span>
      </div>
      <div className="meter" role="progressbar" aria-label={`${goal.stage.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goal.progress.progress * 100)}>
        <span className="meter-fill" style={{ transform: `scaleX(${goal.progress.progress})` }} />
      </div>
      <a className="btn btn-ghost" href={hrefFor('learn', { lesson: 'plan' })}>
        Back to your plan
      </a>
    </div>
  );

  const settings = (
    <div className="panel drill-settings" ref={settingsRef}>
      <div className="filters" role="group" aria-label="Drill filters">
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

      <div className="study-tools" role="group" aria-label="Study tools">
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
        <label className="toggle">
          <input type="checkbox" checked={prefs.fourColor} onChange={(e) => setPrefs({ fourColor: e.target.checked })} />
          <span>Four-color deck</span>
        </label>
      </div>
    </div>
  );

  let stage;
  if (!deal) {
    stage = (
      <div className="drill-stage drill-empty">
        {goalStrip}
        <div className="panel empty-state">
          <p>No spots match these filters (for example, the big blind never raises first in). Pick another position or spot type.</p>
        </div>
      </div>
    );
  } else {
    const table = (
      <div className="drill-table">
        {goalStrip}
        <div className="table-fit">
          <PokerTable spot={deal.spot} cards={deal.cards} fourColor={prefs.fourColor} dealKey={dealNo} heroAction={answer?.action ?? null} />
        </div>
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
        <div className="drill-next">
          {answer ? (
            <>
              <span className={`grade-chip grade-${answer.result.grade}`} aria-hidden="true">
                {gradeIcon} {GRADE_LABELS[answer.result.grade]}
              </span>
              <button ref={nextRef} type="button" className="btn btn-primary next-btn" onClick={redeal} data-testid="next-hand" aria-keyshortcuts="N">
                Next hand
              </button>
            </>
          ) : (
            <div className="drill-hint">
              {rangeVisible ? (
                <span className="small open-book-note">Open book: answers made with the range showing are saved separately, not graded.</span>
              ) : (
                <span className="muted small">
                  Keyboard: <kbd>R</kbd> raise · <kbd>C</kbd> call · <kbd>F</kbd> fold · <kbd>N</kbd> next hand
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );

    const range = prefs.drillRange !== 'off' && (
      <div className="drill-range">
        {rangeVisible ? <StudyRangePanel key={dealNo} spot={deal.spot} hand={deal.hand} beforeAnswer={!answer} /> : <RangePlaceholder />}
      </div>
    );

    // The live region only ever holds the answer feedback, so the spot info is not read out on every deal.
    const result = (
      <div className="coach-live" aria-live="polite">
        {answer && (
          <div className="panel result-panel" data-testid="drill-result" hidden={viewingInfo}>
            <div className="result-head">
              <GradeBadge grade={answer.result.grade} animKey={dealNo} />
              <h2 className="result-hand">
                {deal.hand} <span className="muted">· {deal.spot.hero}</span>
              </h2>
            </div>
            <FrequencyBar bands={bands} title={`${deal.hand} frequencies`} />
            <p className="explanation" data-testid="explanation">
              {answer.result.text}
            </p>
            <div className="result-actions">
              <a className="btn btn-ghost" href={hrefFor('ranges', { spot: deal.spot.id, hand: deal.hand })} data-testid="view-range">
                View full range
              </a>
              {fit && prefs.drillInfo && (
                <button ref={showInfoRef} type="button" className="btn btn-ghost" onClick={() => toggleCoach('info')} data-testid="show-spot-info">
                  Spot info
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );

    const info = prefs.drillInfo ? (
      <SpotInfoPanel
        spot={deal.spot}
        hand={deal.hand}
        action={
          viewingInfo ? (
            <button ref={showResultRef} type="button" className="btn btn-ghost btn-compact" onClick={() => toggleCoach('result')} data-testid="show-result">
              Back to result
            </button>
          ) : null
        }
      />
    ) : (
      <div className="panel hint-panel">
        <h2>Your call</h2>
        <p className="muted">Pick an action under the table. After you answer, this panel shows your grade, the chart’s frequencies for the hand and why.</p>
      </div>
    );

    stage = fit ? (
      <div className={`drill-stage${prefs.drillRange === 'off' ? ' no-range' : ''}`}>
        {table}
        {range}
        <div className="drill-coach">
          {result}
          {(!answer || viewingInfo) && info}
        </div>
      </div>
    ) : (
      <div className="drill-stage">
        {table}
        {result}
        {range}
        {(prefs.drillInfo || !answer) && <div className="drill-coach">{info}</div>}
      </div>
    );
  }

  // The settings come first on desktop (a toolbar above the drill) and last on phones, in the DOM
  // as on screen, so focus and reading order follow what is shown.
  return (
    <section className="drill" aria-labelledby="drill-title">
      <div className="drill-head">
        <h1 id="drill-title">Preflop Drill</h1>
        <p className="muted small drill-session">
          Session: <strong data-testid="session-count">{session.hands}</strong> hands,{' '}
          {session.hands - session.assisted ? Math.round((session.correct / (session.hands - session.assisted)) * 100) : 0}% correct
          {session.assisted > 0 && <span data-testid="session-assisted"> · {session.assisted} with the range shown (not graded)</span>}
        </p>
        {showNudge && (
          <a className="btn btn-ghost course-nudge" href={hrefFor('learn', { lesson: 'welcome' })} data-testid="course-nudge">
            New here? Take the beginner course
          </a>
        )}
        {!fit && (
          <button
            type="button"
            className="btn btn-ghost settings-jump"
            onClick={() => {
              settingsRef.current?.scrollIntoView?.({ block: 'start' });
              settingsRef.current?.querySelector('select')?.focus({ preventScroll: true });
            }}
          >
            Settings
          </button>
        )}
      </div>
      {fit && settings}
      {stage}
      {!fit && settings}
    </section>
  );
}
