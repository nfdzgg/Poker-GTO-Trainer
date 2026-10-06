import { useState } from 'react';
import { hrefFor } from '../lib/router';
import { POSITIONS, SPOT_TYPE_NAMES, SPOT_TYPES, ALL_SPOT_BUCKETS } from '../lib/preflop/bucket';
import { accuracy, aggregate, biggestLeaks, bucketKey, LEAK_MIN_ATTEMPTS, type Tally } from '../lib/stats/aggregate';
import { clearStats, loadStats, type StatsFile } from '../lib/stats/store';

const pctText = (t: Tally | undefined) => (t && t.attempts > 0 ? `${Math.round(accuracy(t) * 100)}%` : '—');

function TallyCell({ t }: { t: Tally | undefined }) {
  return (
    <td>
      <span className="acc">{pctText(t)}</span>
      {t && t.attempts > 0 && <span className="muted small"> ({t.attempts})</span>}
    </td>
  );
}

export function StatsScreen() {
  const [stats, setStats] = useState<StatsFile>(() => loadStats());
  const [confirming, setConfirming] = useState(false);
  const agg = aggregate(stats.records);
  const leaks = biggestLeaks(stats.records);
  const eligibleBuckets = Object.values(agg.byBucket).filter((t) => t.attempts >= LEAK_MIN_ATTEMPTS).length;

  return (
    <section className="stats" aria-labelledby="stats-title">
      <div className="screen-head">
        <div>
          <h1 id="stats-title">Stats</h1>
          <p className="muted small">Saved in this browser only. Best and Acceptable answers count as correct.</p>
        </div>
      </div>

      <div className="stat-cards">
        <div className="panel stat-card">
          <span className="stat-label">Total hands</span>
          <span className="stat-value" data-testid="total-hands">
            {agg.total.attempts}
          </span>
        </div>
        <div className="panel stat-card">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value" data-testid="total-accuracy">
            {pctText(agg.total)}
          </span>
        </div>
        <div className="panel stat-card">
          <span className="stat-label">Best answers</span>
          <span className="stat-value">{agg.total.attempts ? `${Math.round((agg.total.best / agg.total.attempts) * 100)}%` : '—'}</span>
        </div>
      </div>

      <div className="panel">
        <h2>Biggest leaks</h2>
        {leaks.length === 0 ? (
          <p className="muted" data-testid="leaks-empty">
            Not enough data yet. Leaks appear once a position × spot type has at least {LEAK_MIN_ATTEMPTS} answers
            {eligibleBuckets === 0 && agg.total.attempts > 0 ? ' — keep drilling!' : '.'}
          </p>
        ) : (
          <ol className="leaks" data-testid="leaks">
            {leaks.map((l) => (
              <li key={bucketKey(l.position, l.type)} className="leak">
                <span>
                  <strong>
                    {l.position} · {SPOT_TYPE_NAMES[l.type]}
                  </strong>{' '}
                  <span className="muted">
                    {Math.round(l.accuracy * 100)}% over {l.tally.attempts} hands
                  </span>
                </span>
                <a className="btn" href={hrefFor('drill', { pos: l.position, type: l.type })}>
                  Drill this
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="stats-tables">
        <div className="panel">
          <h2>By position</h2>
          <table className="stat-table" data-testid="by-position">
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Accuracy (hands)</th>
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((p) => (
                <tr key={p}>
                  <th scope="row">{p}</th>
                  <TallyCell t={agg.byPosition[p]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2>By spot type</h2>
          <table className="stat-table" data-testid="by-type">
            <thead>
              <tr>
                <th scope="col">Spot</th>
                <th scope="col">Accuracy (hands)</th>
              </tr>
            </thead>
            <tbody>
              {SPOT_TYPES.map((t) => (
                <tr key={t}>
                  <th scope="row">{SPOT_TYPE_NAMES[t]}</th>
                  <TallyCell t={agg.byType[t]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel wide">
          <h2>Position × spot type</h2>
          <div className="table-scroll">
            <table className="stat-table" data-testid="by-bucket">
              <thead>
                <tr>
                  <th scope="col">Position</th>
                  {SPOT_TYPES.map((t) => (
                    <th key={t} scope="col">
                      {SPOT_TYPE_NAMES[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POSITIONS.map((p) => (
                  <tr key={p}>
                    <th scope="row">{p}</th>
                    {SPOT_TYPES.map((t) =>
                      ALL_SPOT_BUCKETS.has(bucketKey(p, t)) ? <TallyCell key={t} t={agg.byBucket[bucketKey(p, t)]} /> : <td key={t} className="muted">n/a</td>,
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel danger-zone">
        <h2>Reset</h2>
        {!confirming ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)} data-testid="reset-stats" disabled={agg.total.attempts === 0 && stats.postflop.length === 0}>
            Reset stats…
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="reset-q" className="confirm">
            <p id="reset-q">Delete all {agg.total.attempts} saved answers? This cannot be undone.</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-danger"
                data-testid="confirm-reset"
                onClick={() => {
                  clearStats();
                  setStats(loadStats());
                  setConfirming(false);
                }}
              >
                Yes, delete stats
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} data-testid="cancel-reset">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
