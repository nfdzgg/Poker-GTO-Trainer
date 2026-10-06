import { useCallback, useEffect, useState } from 'react';

export interface Prefs {
  fourColor: boolean;
}
export const PREFS_KEY = 'pgt.prefs.v1';
const DEFAULTS: Prefs = { fourColor: false };
const EVENT = 'pgt-prefs-change';

export function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { fourColor: typeof p.fourColor === 'boolean' ? p.fourColor : DEFAULTS.fourColor };
  } catch {
    return { ...DEFAULTS };
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
