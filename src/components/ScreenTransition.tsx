import type { ReactNode } from 'react';
import { durationMs, useAnimPhases } from '../lib/motion/motion';

/** Fades/slides a screen in whenever `screenKey` changes. Uses only transform and opacity. */
export function ScreenTransition({ screenKey, children }: { screenKey: string; children: ReactNode }) {
  const phase = useAnimPhases([['entering', durationMs('--dur-med')]] as const, 'entered', screenKey);
  return (
    <div className="screen" data-anim={phase} data-testid="screen-transition">
      {children}
    </div>
  );
}
