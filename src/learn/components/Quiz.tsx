import { useState } from 'react';
import { RangeGrid, type CellInfo } from '../../components/RangeGrid';
import { comboCount, handClass, HAND_LABELS } from '../../lib/poker/hands';
import { durationMs, useAnimPhases } from '../../lib/motion/motion';
import { gridAnswers, type Question } from '../quiz';

type Status = { kind: 'idle' } | { kind: 'wrong'; picked: string; tries: number } | { kind: 'right'; picked: string; firstTry: boolean } | { kind: 'revealed' };

interface Props {
  question: Question;
  number: number;
  /** Already solved in a previous visit. */
  solvedBefore: boolean;
  onAnswer: (correct: boolean) => void;
}

const KIND_COLOR = { pair: 'var(--act-raise)', suited: 'var(--act-call)', offsuit: 'var(--act-fold)' } as const;
const KIND_LABEL = { pair: 'Pair', suited: 'Suited', offsuit: 'Offsuit' } as const;

function Feedback({ ok, animKey, children }: { ok: boolean; animKey: unknown; children: React.ReactNode }) {
  const phase = useAnimPhases([['grade-enter', durationMs('--dur-slow')]] as const, 'grade-shown', animKey);
  return (
    <div className={`quiz-feedback ${ok ? 'ok' : 'no'}`} data-anim={phase} data-testid="quiz-feedback">
      {children}
    </div>
  );
}

/** One quiz question with instant feedback, retries and an explanation once solved. */
export function QuizQuestion({ question: q, number, solvedBefore, onAnswer }: Props) {
  const [status, setStatus] = useState<Status>(solvedBefore ? { kind: 'right', picked: '', firstTry: true } : { kind: 'idle' });
  const solved = status.kind === 'right';
  const revealed = status.kind === 'revealed';
  const [attempt, setAttempt] = useState(0);

  const answer = (picked: string, correct: boolean) => {
    if (solved) return;
    setAttempt((a) => a + 1);
    if (correct) setStatus({ kind: 'right', picked, firstTry: status.kind === 'idle' });
    else setStatus({ kind: 'wrong', picked, tries: status.kind === 'wrong' ? status.tries + 1 : 1 });
    onAnswer(correct);
  };

  const getCell = (h: string): CellInfo => {
    const kind = handClass(h).kind;
    if (q.kind !== 'grid' || !q.showKinds) return { bands: [{ key: 'h', label: 'Hand', freq: 0, color: 'var(--surface-3)' }] };
    return { bands: [{ key: kind, label: KIND_LABEL[kind], freq: 1, color: KIND_COLOR[kind] }] };
  };

  return (
    <section className={`quiz-question${solved ? ' solved' : ''}`} aria-labelledby={`q-${q.id}`} data-testid={`question-${q.id}`} data-solved={solved}>
      <h3 id={`q-${q.id}`} className="quiz-prompt">
        <span className="quiz-number">Q{number}</span> {q.prompt}
      </h3>
      {q.kind === 'choice' ? (
        <div className="quiz-options" role="group" aria-label={`Answers for question ${number}`}>
          {q.options.map((opt, i) => {
            const isPicked = (status.kind === 'wrong' || status.kind === 'right') && status.picked === opt;
            const showRight = (solved || revealed) && i === q.correct;
            return (
              <button
                key={opt}
                type="button"
                className={`btn quiz-option${isPicked && status.kind === 'wrong' ? ' wrong' : ''}${showRight ? ' right' : ''}`}
                onClick={() => answer(opt, i === q.correct)}
                disabled={solved}
                aria-pressed={isPicked}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="quiz-grid">
          <RangeGrid
            getCell={getCell}
            selected={status.kind === 'wrong' || status.kind === 'right' ? status.picked || null : null}
            onSelect={(h) => answer(h, q.isCorrect(h))}
            label={`Answer grid for question ${number}`}
            compact
            cellLabel={(h) => `${h}, ${KIND_LABEL[handClass(h).kind].toLowerCase()}, ${comboCount(h)} combos`}
          />
          {q.showKinds && (
            <div className="legend" aria-hidden="true">
              {(['pair', 'suited', 'offsuit'] as const).map((k) => (
                <span key={k} className="legend-item">
                  <span className="legend-swatch" style={{ background: KIND_COLOR[k] }} />
                  {KIND_LABEL[k]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div aria-live="polite">
        {status.kind === 'wrong' && (
          <Feedback ok={false} animKey={attempt}>
            <strong>Not quite.</strong> {q.kind === 'grid' ? `${status.picked} isn’t it. ` : ''}Try again.
            {status.tries >= 2 && (
              <button type="button" className="btn btn-ghost reveal-btn" onClick={() => setStatus({ kind: 'revealed' })}>
                Show the answer
              </button>
            )}
          </Feedback>
        )}
        {revealed && (
          <Feedback ok={false} animKey={`rev-${attempt}`}>
            <strong>Answer:</strong> {q.kind === 'choice' ? q.options[q.correct] : gridAnswers(q, HAND_LABELS).join(', ')}. Select it to continue. {q.explain}
          </Feedback>
        )}
        {solved && (
          <Feedback ok animKey={`ok-${attempt}`}>
            <strong>Correct!</strong> {q.explain}
          </Feedback>
        )}
      </div>
    </section>
  );
}
