// Course progress, persisted in localStorage under a versioned key.
import { useCallback, useEffect, useState } from 'react';
import { LESSON_IDS } from './course';

export const COURSE_KEY = 'pgt.course.v1';
export const COURSE_VERSION = 1;
const EVENT = 'pgt-course-change';

export interface CourseProgress {
  version: number;
  /** Lessons whose questions have all been answered correctly. */
  completed: string[];
  /** Per question ("lesson:question"): correct on the first try? */
  firstTry: Record<string, boolean>;
  /** Questions answered correctly (eventually). */
  solved: string[];
  /** Last lesson opened, for "Continue". */
  last: string | null;
}

export const emptyProgress = (): CourseProgress => ({ version: COURSE_VERSION, completed: [], firstTry: {}, solved: [], last: null });

/** Load progress; anything missing, corrupt or from another version loads as empty. */
export function loadProgress(): CourseProgress {
  try {
    const raw = window.localStorage.getItem(COURSE_KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Partial<CourseProgress> | null;
    if (!p || typeof p !== 'object' || p.version !== COURSE_VERSION) return emptyProgress();
    const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
    const firstTry: Record<string, boolean> = {};
    if (p.firstTry && typeof p.firstTry === 'object') for (const [k, v] of Object.entries(p.firstTry)) if (typeof v === 'boolean') firstTry[k] = v;
    return {
      version: COURSE_VERSION,
      completed: strings(p.completed).filter((id) => LESSON_IDS.includes(id)),
      firstTry,
      solved: strings(p.solved),
      last: typeof p.last === 'string' && LESSON_IDS.includes(p.last) ? p.last : null,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: CourseProgress): void {
  try {
    window.localStorage.setItem(COURSE_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable
  }
  window.dispatchEvent(new Event(EVENT));
}

export function resetProgress(): void {
  try {
    window.localStorage.removeItem(COURSE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

export const questionKey = (lessonId: string, questionId: string) => `${lessonId}:${questionId}`;

/** Record an answer; returns the new progress. The lesson completes when every question is solved. */
export function recordAnswer(p: CourseProgress, lessonId: string, questionId: string, correct: boolean, allQuestionIds: string[]): CourseProgress {
  const key = questionKey(lessonId, questionId);
  const next: CourseProgress = { ...p, firstTry: { ...p.firstTry }, solved: [...p.solved], completed: [...p.completed], last: lessonId };
  if (!(key in next.firstTry)) next.firstTry[key] = correct;
  if (correct && !next.solved.includes(key)) next.solved.push(key);
  const done = allQuestionIds.every((q) => next.solved.includes(questionKey(lessonId, q)));
  if (done && !next.completed.includes(lessonId)) next.completed.push(lessonId);
  return next;
}

export function markOpened(p: CourseProgress, lessonId: string): CourseProgress {
  return p.last === lessonId ? p : { ...p, last: lessonId };
}

/** The lesson to continue with: the first one not completed (in course order). */
export function nextIncomplete(p: CourseProgress): string | null {
  return LESSON_IDS.find((id) => !p.completed.includes(id)) ?? null;
}

export function useCourseProgress(): [CourseProgress, (next: CourseProgress) => void] {
  const [progress, setProgress] = useState<CourseProgress>(loadProgress);
  useEffect(() => {
    const on = () => setProgress(loadProgress());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const update = useCallback((next: CourseProgress) => {
    saveProgress(next);
    setProgress(next);
  }, []);
  return [progress, update];
}
