import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actionColors } from '../../analyzer/colors';
import { dealPostflop, gradePostflop, type NodeSource, type PostflopAnswer, type PostflopDeal } from '../../analyzer/postflopDrill';
import { usePrefs } from '../../lib/prefs';
import { createRng, randomSeed } from '../../lib/rng';
import { addPostflopRecord } from '../../lib/stats/store';
import { FrequencyBar } from '../FrequencyBar';
import { GradeBadge } from '../GradeBadge';
import { PlayingCard } from '../PlayingCard';
import { ComboLabel } from './ResultsView';

interface Props {
  source: NodeSource;
  seats: { oop: string; ip: string };
  spotName: string;
  seed?: number;
  onClose: () => void;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** "Drill this spot": random hero hands at decision nodes of the solved tree, graded against the solver. */
export function PostflopDrill({ source, seats, spotName, seed, onClose }: Props) {
  const [prefs] = usePrefs();
  const rngRef = useRef(createRng(seed ?? randomSeed()));
  const [deal, setDeal] = useState<PostflopDeal | null>(null);
  const [dealNo, setDealNo] = useState(0);
  const [answer, setAnswer] = useState<(PostflopAnswer & { chosen: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState({ hands: 0, correct: 0, evLoss: 0 });

  const next = useCallback(() => {
    setAnswer(null);
    setDeal(null);
    dealPostflop(rngRef.current, source, seats)
      .then((d) => {
        if (!d) setError('Could not find a decision with hands in range in this tree.');
        setDeal(d);
        setDealNo((n) => n + 1);
      })
      .catch((e: Error) => setError(e.message));
  }, [source, seats]);

  useEffect(() => {
    next();
  }, [next]);

  const colors = useMemo(() => (deal ? actionColors(deal.node.actions) : []), [deal]);

  const choose = (i: number) => {
    if (!deal || answer) return;
    const res = gradePostflop(deal.hand, i);
    setAnswer({ ...res, chosen: i });
    const correct = res.grade !== 'mistake';
    setSession((s) => ({ hands: s.hands + 1, correct: s.correct + (correct ? 1 : 0), evLoss: s.evLoss + res.evLoss }));
    addPostflopRecord({
      t: Date.now(),
      spot: `${spotName}${deal.steps.length ? ` · ${deal.steps.map((s) => s.label).join(' › ')}` : ''}`,
      hand: deal.hand.combo,
      action: deal.node.actions[i]!.label,
      grade: res.grade,
      evLoss: res.evLoss,
    });
  };

  const actor = deal ? (deal.node.player === 'oop' ? seats.oop : seats.ip) : '';

  return (
    <section className="results panel postflop-drill" aria-labelledby="pf-drill-title" data-testid="postflop-drill">
      <div className="solve-progress-head">
        <h2 id="pf-drill-title">Drill this spot</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose} data-testid="close-drill">
          Back to results
        </button>
      </div>
      <p className="muted small" data-testid="pf-session">
        {session.hands} hands · {session.hands ? Math.round((session.correct / session.hands) * 100) : 0}% correct · total EV loss {session.evLoss.toFixed(2)}bb
      </p>
      {error && <p className="error-text">{error}</p>}
      {!deal && !error && <p className="muted">Dealing…</p>}
      {deal && (
        <>
          <p className="pf-line" data-testid="pf-line">
            <strong>Line:</strong> {deal.steps.length ? deal.steps.map((s) => s.label).join(' › ') : 'first decision'}
          </p>
          <div className="node-board" aria-label="Board">
            {deal.node.board.map((c, i) => (
              <PlayingCard key={`${c}-${i}`} card={c} width={40} fourColor={prefs.fourColor} />
            ))}
            <span className="node-pot">
              Pot <strong>{deal.node.pot.toFixed(2)}bb</strong>
              {deal.node.toCall > 0 ? ` · ${deal.node.toCall.toFixed(2)}bb to call` : ''}
            </span>
          </div>
          <div className="pf-hero">
            <div className="hero-cards-inline" aria-label="Your hand">
              <PlayingCard card={deal.hand.cards[0]} anim="deal" animKey={dealNo} width={60} fourColor={prefs.fourColor} />
              <PlayingCard card={deal.hand.cards[1]} anim="deal" animKey={dealNo} delayMs={90} width={60} fourColor={prefs.fourColor} />
            </div>
            <p data-testid="pf-prompt">
              You are <strong>{actor}</strong> ({deal.node.player.toUpperCase()}) with <ComboLabel combo={deal.hand.combo} />. What do you do?
            </p>
          </div>
          <div className="node-actions" role="group" aria-label="Your action">
            {deal.node.actions.map((a, i) => (
              <button key={a.code} type="button" className="btn node-action" disabled={!!answer} onClick={() => choose(i)} data-testid={`pf-action-${i}`}>
                <span className="legend-swatch" style={{ background: colors[i] }} />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
          {answer && (
            <div className="result-panel" data-testid="pf-result">
              <GradeBadge grade={answer.grade} animKey={dealNo} />
              <FrequencyBar
                bands={deal.node.actions.map((a, i) => ({ key: a.code, label: a.label, freq: deal.hand.strategy[i] ?? 0, color: colors[i]! }))}
                title={`Solver strategy for ${deal.hand.combo}`}
              />
              <p data-testid="pf-ev-loss">
                You chose <strong>{deal.node.actions[answer.chosen]!.label}</strong> ({pct(answer.chosenFreq)} in the solution). EV loss:{' '}
                <strong>{answer.evLoss.toFixed(2)}bb</strong>
              </p>
              <table className="stat-table">
                <thead>
                  <tr>
                    <th scope="col">Action</th>
                    <th scope="col">Frequency</th>
                    <th scope="col">EV</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.node.actions.map((a, i) => (
                    <tr key={a.code}>
                      <th scope="row">{a.label}</th>
                      <td>{pct(deal.hand.strategy[i] ?? 0)}</td>
                      <td>{deal.hand.actionEv?.[i] !== undefined ? `${deal.hand.actionEv[i]!.toFixed(2)}bb` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="result-actions">
                <button type="button" className="btn btn-primary" onClick={next} data-testid="pf-next">
                  Next spot
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
