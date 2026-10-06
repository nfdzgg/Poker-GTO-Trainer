import { durationMs, useAnimPhases } from '../lib/motion/motion';
import { GRADE_LABELS, type Grade } from '../lib/preflop/grading';

export type GradePhase = 'grade-enter' | 'grade-shown';

export function GradeBadge({ grade, animKey }: { grade: Grade; animKey: unknown }) {
  const phase = useAnimPhases<GradePhase>([['grade-enter', durationMs('--dur-slow')]] as const, 'grade-shown', animKey);
  const icon = grade === 'best' ? '✓' : grade === 'acceptable' ? '≈' : '✕';
  return (
    <div className={`grade-badge grade-${grade}`} data-anim={phase} data-grade={grade} role="status">
      <span className="grade-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="grade-text">{GRADE_LABELS[grade]}</span>
    </div>
  );
}
