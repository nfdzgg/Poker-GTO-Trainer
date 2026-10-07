import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';
import { LESSONS, questionsFor } from '../../learn/course';
import { COURSE_KEY, loadProgress } from '../../learn/progress';
import { saveStats, type StatRecord } from '../../lib/stats/store';
import { DrillScreen } from '../DrillScreen';
import { HomeScreen } from '../HomeScreen';
import { LearnScreen } from '../LearnScreen';

const lesson = (id: string) => render(<LearnScreen params={new URLSearchParams(`lesson=${id}`)} />);

/** Answer a multiple-choice question by trying options until one is accepted. */
function solveChoice(q: HTMLElement) {
  const options = within(q).getAllByRole('button').filter((b) => b.classList.contains('quiz-option'));
  for (const o of options) {
    if (q.dataset.solved === 'true') break;
    if (!(o as HTMLButtonElement).disabled) fireEvent.click(o);
  }
  expect(q.dataset.solved).toBe('true');
}

describe('Beginner course screens', () => {
  it('P1-LEARN-01 the course is in the main navigation and the overview lists every lesson', async () => {
    window.location.hash = '#/learn';
    render(<App />);
    await act(async () => {});
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '#/learn');
    for (const l of LESSONS) expect(screen.getByTestId(`lesson-card-${l.id}`)).toHaveAttribute('href', `#/learn?lesson=${l.id}`);
    expect(screen.getByTestId('course-progress-text').textContent).toBe(`0 of ${LESSONS.length} lessons complete`);
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Start the course');
  });

  it('P1-LEARN-01 every lesson renders its goal, content, quiz, takeaway and navigation', () => {
    for (const l of LESSONS) {
      const { unmount } = lesson(l.id);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(l.title);
      expect(screen.getByText(l.goal, { exact: false })).toBeInTheDocument();
      const qs = questionsFor(l.id);
      for (const q of qs) expect(screen.getByTestId(`question-${q.id}`)).toBeInTheDocument();
      expect(screen.getByTestId('quiz-score').textContent).toBe(`0 of ${qs.length} answered`);
      expect(screen.getByText(l.takeaway)).toBeInTheDocument();
      expect(screen.getByTestId('lesson-next')).toBeInTheDocument();
      if (l.practice) expect(screen.getByTestId('lesson-practice')).toHaveAttribute('href', l.practice.href);
      // at most one range grid per page (one keyboard tab stop)
      expect(document.querySelectorAll('[data-testid="range-grid"]').length).toBeLessThanOrEqual(1);
      unmount();
    }
  });

  it('P1-LEARN-01 Home invites new users into the course', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('home-cta')).toHaveTextContent('Start the beginner course');
    expect(screen.getByTestId('home-cta')).toHaveAttribute('href', '#/learn?lesson=welcome');
  });

  it('P1-LEARN-02 wrong answers get feedback and a retry; right answers show the explanation', () => {
    lesson('table');
    const q = screen.getByTestId('question-table-first-preflop');
    fireEvent.click(within(q).getByRole('button', { name: 'Small blind' }));
    expect(within(q).getByTestId('quiz-feedback')).toHaveTextContent(/Not quite/);
    expect(q.dataset.solved).toBe('false');
    fireEvent.click(within(q).getByRole('button', { name: 'Big blind' }));
    fireEvent.click(within(q).getByRole('button', { name: 'Show the answer' }));
    expect(within(q).getByTestId('quiz-feedback')).toHaveTextContent(/Answer: Under the gun \(UTG\)/);
    fireEvent.click(within(q).getByRole('button', { name: 'Under the gun (UTG)' }));
    expect(q.dataset.solved).toBe('true');
    expect(within(q).getByTestId('quiz-feedback')).toHaveTextContent(/Correct!.*left of the big blind/);
    for (const b of within(q).getAllByRole('button')) expect(b).toBeDisabled();
    expect(loadProgress().firstTry['table:table-first-preflop']).toBe(false);
  });

  it('P1-LEARN-02 grid questions are answered by tapping a hand', () => {
    lesson('hands');
    const q = screen.getByTestId('question-hands-tap-76s');
    fireEvent.click(q.querySelector('.range-cell[data-hand="67o"]') ?? q.querySelector('.range-cell[data-hand="76o"]')!);
    expect(within(q).getByTestId('quiz-feedback')).toHaveTextContent(/Not quite\. 76o isn’t it/);
    fireEvent.click(q.querySelector('.range-cell[data-hand="76s"]')!);
    expect(q.dataset.solved).toBe('true');
    expect(q.querySelector('.range-cell[data-hand="76s"]')!.getAttribute('aria-label')).toBe('76s, suited, 4 combos');
  });

  it('P1-LEARN-03 finishing every question completes the lesson and progress survives a reload', () => {
    const { unmount } = lesson('welcome');
    for (const q of questionsFor('welcome')) solveChoice(screen.getByTestId(`question-${q.id}`));
    expect(screen.getByText('✓ Lesson complete')).toBeInTheDocument();
    expect(loadProgress().completed).toEqual(['welcome']);
    unmount();
    const r = render(<LearnScreen />);
    expect(screen.getByTestId('course-progress-text').textContent).toBe(`1 of ${LESSONS.length} lessons complete`);
    expect(screen.getByTestId('course-continue')).toHaveTextContent('Continue: Lesson 1 — The table and positions');
    expect(screen.getByTestId('lesson-card-welcome')).toHaveClass('complete');
    r.unmount();
    render(<HomeScreen />);
    expect(screen.getByTestId('home-cta')).toHaveTextContent('Continue the course: Lesson 1');
    // the solved questions stay solved when the lesson is reopened
    const again = lesson('welcome');
    expect(screen.getByTestId('quiz-score').textContent).toBe(`3 of 3 answered`);
    again.unmount();
  });

  it('P1-LEARN-03 course progress can be reset after confirmation', () => {
    const view = lesson('welcome');
    for (const q of questionsFor('welcome')) solveChoice(screen.getByTestId(`question-${q.id}`));
    view.unmount();
    render(<LearnScreen />);
    fireEvent.click(screen.getByTestId('reset-course'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-reset-course'));
    expect(window.localStorage.getItem(COURSE_KEY)).toBeNull();
    expect(screen.getByTestId('course-progress-text').textContent).toBe(`0 of ${LESSONS.length} lessons complete`);
  });

  it('P1-LEARN-04 the practice plan shows each stage with progress from graded answers and drill links', () => {
    const r = (ok: boolean, assisted = false): StatRecord => ({ t: 1, spotId: 'rfi-CO', type: 'rfi', hero: 'CO', villain: null, hand: 'AKo', action: 'raise', grade: ok ? 'best' : 'mistake', ...(assisted ? { assisted } : {}) });
    saveStats({ version: 1, records: [...Array.from({ length: 12 }, () => r(true)), ...Array.from({ length: 50 }, () => r(false, true))], postflop: [] });
    render(<LearnScreen params={new URLSearchParams('lesson=plan')} />);
    expect(screen.getByTestId('stage-open-summary').textContent).toBe('12/30 hands · 100% of the last 12 (target 85%)');
    expect(screen.getByTestId('stage-open').dataset.done).toBe('false');
    expect(screen.getByTestId('stage-open-link')).toHaveAttribute('href', '#/drill?type=rfi&goal=open');
    expect(screen.getByTestId('stage-bb-link')).toHaveAttribute('href', '#/drill?type=vs-open&pos=BB&goal=bb');
    expect(within(screen.getByTestId('stage-open')).getByText('Up next')).toBeInTheDocument();
  });

  it('P1-LEARN-04 a drill opened from the plan shows the goal and updates it after each answer', () => {
    render(<DrillScreen params={new URLSearchParams('seed=77&type=rfi&goal=open')} />);
    const strip = screen.getByTestId('goal-strip');
    expect(strip).toHaveTextContent('Goal: Opening ranges · 0/30 hands · target 85%');
    fireEvent.click(within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button')[0]!);
    expect(screen.getByTestId('goal-strip')).toHaveTextContent(/1\/30 hands · (0|100)% of the last 1 \(target 85%\)/);
    expect(within(screen.getByTestId('goal-strip')).getByRole('link', { name: 'Back to your plan' })).toHaveAttribute('href', '#/learn?lesson=plan');
  });

  it('P1-LEARN-01 brand-new users see a course link in the drill; it disappears once they have started', () => {
    const { unmount } = render(<DrillScreen params={new URLSearchParams('seed=3')} />);
    expect(screen.getByTestId('course-nudge')).toHaveAttribute('href', '#/learn?lesson=welcome');
    unmount();
    lesson('table').unmount(); // opening a lesson counts as starting the course
    render(<DrillScreen params={new URLSearchParams('seed=3')} />);
    expect(screen.queryByTestId('course-nudge')).toBeNull();
  });
});
