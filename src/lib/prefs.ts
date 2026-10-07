import { useCallback, useEffect, useState } from 'react';

/** When the drill shows the range for the current spot. */
export type DrillRangeMode = 'off' | 'after' | 'always';
export const DRILL_RANGE_MODES: readonly DrillRangeMode[] = ['off', 'after', 'always'];

export interface Prefs {
  fourColor: boolean;
  /** Range panel in the preflop drill: never, after answering (default) or while deciding. */
  drillRange: DrillRangeMode;
  /** Spot information panel in the preflop drill. */
  drillInfo: boolean;
}
export const PREFS_KEY = 'pgt.prefs.v1';
export const DEFAULT_PREFS: Prefs = { fourColor: false, drillRange: 'after', drillInfo: true };
const EVENT = 'pgt-prefs-change';

/** Load preferences; missing, unknown or malformed fields fall back to their defaults. */
export function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Partial<Record<keyof Prefs, unknown>> | null;
    if (!p || typeof p !== 'object') return { ...DEFAULT_PREFS };
    return {
      fourColor: typeof p.fourColor === 'boolean' ? p.fourColor : DEFAULT_PREFS.fourColor,
      drillRange: DRILL_RANGE_MODES.includes(p.drillRange as DrillRangeMode) ? (p.drillRange as DrillRangeMode) : DEFAULT_PREFS.drillRange,
      drillInfo: typeof p.drillInfo === 'boolean' ? p.drillInfo : DEFAULT_PREFS.drillInfo,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: keep in memory only
  }
  window.dispatchEvent(new Event(EVENT));
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => {
    const on = () => setPrefs(loadPrefs());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => {
    const next = { ...loadPrefs(), ...patch };
    savePrefs(next);
    setPrefs(next);
  }, []);
  return [prefs, update];
}
