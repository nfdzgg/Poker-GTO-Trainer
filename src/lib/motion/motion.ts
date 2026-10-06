import { useEffect, useRef, useState } from 'react';

/**
 * Fallback durations (ms) used when CSS custom properties cannot be read
 * (for example in jsdom). The canonical values live in `src/styles/tokens.css`.
 */
const FALLBACK_MS: Record<string, number> = {
  '--dur-fast': 140,
  '--dur-med': 260,
  '--dur-slow': 420,
  '--dur-deal': 380,
  '--dur-flip': 420,
  '--dur-chip': 520,
};

export type DurationToken = '--dur-fast' | '--dur-med' | '--dur-slow' | '--dur-deal' | '--dur-flip' | '--dur-chip';

/** Read a duration token from the document's computed style, in milliseconds. */
export function durationMs(token: DurationToken): number {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const m = /^([\d.]+)(ms|s)$/.exec(raw);
    if (m && m[1] && m[2]) {
      const v = parseFloat(m[1]);
      return m[2] === 's' ? v * 1000 : v;
    }
  }
  return FALLBACK_MS[token] ?? 250;
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** React hook tracking `prefers-reduced-motion`. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/**
 * Run through a sequence of animation phases. Each step is `[phase, durationMs]`;
 * after the duration elapses the next phase is entered. The final phase is
 * terminal. With reduced motion, jumps straight to the final phase.
 * Restarts whenever `key` changes.
 */
export function useAnimPhases<P extends string>(
  steps: ReadonlyArray<readonly [P, number]>,
  final: P,
  key: unknown,
  enabled = true,
): P {
  const reduced = useReducedMotion();
  const skip = reduced || !enabled;
  const first = steps[0]?.[0] ?? final;
  const [phase, setPhase] = useState<P>(skip ? final : first);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    const s = stepsRef.current;
    if (skip || s.length === 0) {
      setPhase(final);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    setPhase(s[0]![0]);
    let at = 0;
    for (let i = 0; i < s.length; i++) {
      at += s[i]![1];
      const next = i + 1 < s.length ? s[i + 1]![0] : final;
      timers.push(setTimeout(() => setPhase(next), at));
    }
    return () => timers.forEach(clearTimeout);
  }, [key, skip, final]);

  return phase;
}
