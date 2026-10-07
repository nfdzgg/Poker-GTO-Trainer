import { useEffect, useState } from 'react';
import { ScreenTransition } from '../components/ScreenTransition';
import { COURSE_MINUTES, getLesson, LESSONS, nextLesson, prevLesson, questionsFor } from '../learn/course';
import { LESSON_CONTENT } from '../learn/lessons';
import { PLAN, stageProgress } from '../learn/plan';
import { loadProgress, markOpened, nextIncomplete, questionKey, recordAnswer, resetProgress, useCourseProgress } from '../learn/progress';
import { QuizQuestion } from '../learn/components/Quiz';
import { hrefFor } from '../lib/router';
import { loadStats } from '../lib/stats/store';

function ProgressMeter({ value, label, testId }: { value: number; label: string; testId?: string }) {
  return (
    <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} data-testid={testId}>
      <span className="meter-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(1, value))})` }} />
    </div>
  );
}

function Overview() {
  const [progress] = useCourseProgress();
  const [confirming, setConfirming] = useState(false);
  const done = progress.completed.length;
  const next = nextIncomplete(progress);
  const nextMeta = getLesson(next);
  return (
    <section className="learn" aria-labelledby="learn-title">
      <div className="learn-hero">
        <p className="eyebrow">Beginner course · {LESSONS.length} lessons · about {Math.round(COURSE_MINUTES / 5) * 5} minutes</p>
        <h1 id="learn-title">Learn preflop strategy from zero</h1>
        <p className="lead muted">
          Short lessons with quick quizzes. You’ll learn what each decision in the drill is about, then finish with a practice plan
          so you always know what you’re working towards.
        </p>
        <ProgressMeter value={done / LESSONS.length} label="Course progress" testId="course-progress" />
        <p className="small muted" data-testid="course-progress-text">
          {done} of {LESSONS.length} lessons complete
        </p>
        <div className="hero-actions">
          {nextMeta ? (
            <a className="btn btn-primary" href={hrefFor('learn', { lesson: nextMeta.id })} data-testid="course-continue">
              {done === 0 ? 'Start the course' : nextMeta.number === 0 ? `Continue: ${nextMeta.title}` : `Continue: Lesson ${nextMeta.number} — ${nextMeta.title}`}
            </a>
          ) : (
            <a className="btn btn-primary" href={hrefFor('learn', { lesson: 'plan' })} data-testid="course-continue">
              Open your practice plan
            </a>
          )}
          <a className="btn btn-ghost" href={hrefFor('learn', { lesson: 'plan' })}>
            Practice plan
          </a>
        </div>
      </div>
      <ol className="lesson-list-cards" aria-label="Lessons">
        {LESSONS.map((l) => {
          const complete = progress.completed.includes(l.id);
          return (
            <li key={l.id}>
              <a className={`lesson-card panel${complete ? ' complete' : ''}`} href={hrefFor('learn', { lesson: l.id })} data-testid={`lesson-card-${l.id}`}>
                <span className="lesson-num" aria-hidden="true">
                  {complete ? '✓' : l.number}
                </span>
                <span className="lesson-card-body">
                  <span className="lesson-card-title">{l.number === 0 ? l.title : `Lesson ${l.number}: ${l.title}`}</span>
                  <span className="muted small">
                    {l.minutes} min · {complete ? 'Complete' : l.goal}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <div className="panel danger-zone">
        {!confirming ? (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)} disabled={done === 0 && Object.keys(progress.firstTry).length === 0} data-testid="reset-course">
            Reset course progress…
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="reset-course-q" className="confirm">
            <p id="reset-course-q">Clear your lesson progress and quiz answers? Your drill stats are not affected.</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  resetProgress(); // the progress hook reloads on the change event
                  setConfirming(false);
                }}
                data-testid="confirm-reset-course"
              >
                Yes, reset
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LessonView({ id }: { id: string }) {
  const meta = getLesson(id)!;
  const Content = LESSON_CONTENT[id]!;
  const questions = questionsFor(id);
  const [progress, setProgress] = useCourseProgress();
  const complete = progress.completed.includes(id);
  const next = nextLesson(id);
  const prev = prevLesson(id);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id]);
  // Remember the lesson as "last opened" once, when it is shown (not on every progress change).
  useEffect(() => {
    const current = loadProgress();
    if (current.last !== id) setProgress(markOpened(current, id));
  }, [id, setProgress]);

  const solvedCount = questions.filter((q) => progress.solved.includes(questionKey(id, q.id))).length;

  return (
    <article className="lesson" aria-labelledby="lesson-title" data-testid="lesson" data-lesson={id}>
      <nav className="lesson-crumbs small" aria-label="Course navigation">
        <a href={hrefFor('learn')}>Course</a> <span aria-hidden="true">›</span>{' '}
        {meta.number === 0 ? 'Start here' : `Lesson ${meta.number} of ${LESSONS.length - 1}`}
      </nav>
      <h1 id="lesson-title">{meta.title}</h1>
      <p className="lesson-goal">
        <strong>Goal:</strong> {meta.goal} <span className="muted">· {meta.minutes} min</span>
      </p>
      <div className="lesson-content prose-lite">
        <Content />
      </div>
      <section className="quiz panel" aria-labelledby="quiz-title">
        <div className="quiz-head">
          <h2 id="quiz-title">Check yourself</h2>
          <span className="small muted" data-testid="quiz-score">
            {solvedCount} of {questions.length} answered
          </span>
        </div>
        {questions.map((q, i) => (
          <QuizQuestion
            key={`${id}-${q.id}`}
            question={q}
            number={i + 1}
            solvedBefore={progress.solved.includes(questionKey(id, q.id))}
            onAnswer={(correct) =>
              setProgress(
                recordAnswer(
                  progress,
                  id,
                  q.id,
                  correct,
                  questions.map((x) => x.id),
                ),
              )
            }
          />
        ))}
      </section>
      <aside className={`panel takeaway${complete ? ' complete' : ''}`} aria-labelledby="takeaway-title">
        <h2 id="takeaway-title">{complete ? '✓ Lesson complete' : 'Key takeaway'}</h2>
        <p>{meta.takeaway}</p>
        {!complete && <p className="small muted">Answer every question correctly to complete the lesson.</p>}
      </aside>
      <div className="lesson-nav">
        {prev ? (
          <a className="btn btn-ghost" href={hrefFor('learn', { lesson: prev.id })}>
            ← {prev.title}
          </a>
        ) : (
          <a className="btn btn-ghost" href={hrefFor('learn')}>
            ← All lessons
          </a>
        )}
        {meta.practice && (
          <a className="btn" href={meta.practice.href} data-testid="lesson-practice">
            {meta.practice.label}
          </a>
        )}
        {next ? (
          <a className="btn btn-primary" href={hrefFor('learn', { lesson: next.id })} data-testid="lesson-next">
            Next: {next.title} →
          </a>
        ) : (
          <a className="btn btn-primary" href={hrefFor('learn', { lesson: 'plan' })} data-testid="lesson-next">
            Your practice plan →
          </a>
        )}
      </div>
    </article>
  );
}

function PlanView() {
  const [stats] = useState(() => loadStats());
  const [progress] = useCourseProgress();
  const rows = PLAN.map((s) => ({ stage: s, p: stageProgress(s, stats) }));
  const current = rows.find((r) => !r.stage.optional && !r.p.done);
  return (
    <section className="plan" aria-labelledby="plan-title" data-testid="plan">
      <nav className="lesson-crumbs small" aria-label="Course navigation">
        <a href={hrefFor('learn')}>Course</a> <span aria-hidden="true">›</span> Practice plan
      </nav>
      <h1 id="plan-title">Your practice plan</h1>
      <p className="lead muted">
        Work through the stages in order. Each one measures your <strong>graded</strong> drill answers (open-book answers don’t
        count) and is done when you reach the target over your recent hands.
      </p>
      {progress.completed.length < LESSONS.length - 1 && (
        <p className="small muted">
          Tip: the <a href={hrefFor('learn')}>course</a> explains every stage ({progress.completed.length} of {LESSONS.length} lessons done).
        </p>
      )}
      <ol className="plan-stages">
        {rows.map(({ stage, p }, i) => (
          <li key={stage.id} className={`panel plan-stage${p.done ? ' done' : ''}${current?.stage.id === stage.id ? ' current' : ''}`} data-testid={`stage-${stage.id}`} data-done={p.done}>
            <div className="plan-stage-head">
              <span className="lesson-num" aria-hidden="true">
                {p.done ? '✓' : i + 1}
              </span>
              <div>
                <h2>
                  {stage.title}
                  {stage.optional && <span className="muted small"> · optional</span>}
                  {current?.stage.id === stage.id && <span className="study-badge open-book">Up next</span>}
                </h2>
                <p className="muted small">{stage.why}</p>
              </div>
            </div>
            <ProgressMeter value={p.progress} label={`${stage.title} progress`} />
            <div className="plan-stage-foot">
              <span className="small" data-testid={`stage-${stage.id}-summary`}>
                {p.done ? 'Done · ' : ''}
                {p.summary}
              </span>
              <a className={`btn${current?.stage.id === stage.id ? ' btn-primary' : ''}`} href={stage.href} data-testid={`stage-${stage.id}-link`}>
                {stage.id === 'leaks' ? 'See your leaks' : stage.id === 'postflop' ? 'Open the analyzer' : 'Drill this'}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LearnScreen({ params }: { params?: URLSearchParams }) {
  const lesson = params?.get('lesson') ?? '';
  if (lesson === 'plan')
    return (
      <ScreenTransition screenKey="plan">
        <PlanView />
      </ScreenTransition>
    );
  if (getLesson(lesson))
    return (
      <ScreenTransition screenKey={lesson}>
        <LessonView key={lesson} id={lesson} />
      </ScreenTransition>
    );
  return <Overview />;
}
