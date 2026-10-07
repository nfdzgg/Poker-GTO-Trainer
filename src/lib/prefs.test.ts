import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, PREFS_KEY, savePrefs } from './prefs';

describe('preferences', () => {
  it('P1-STUDY-01 the drill range mode defaults to "after I answer" with spot info on', () => {
    expect(loadPrefs()).toEqual({ fourColor: false, drillRange: 'after', drillInfo: true });
    expect(DEFAULT_PREFS.drillRange).toBe('after');
  });

  it('P1-STUDY-01 range mode and spot info persist under the versioned prefs key', () => {
    savePrefs({ fourColor: true, drillRange: 'always', drillInfo: false });
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!)).toEqual({ fourColor: true, drillRange: 'always', drillInfo: false });
    expect(loadPrefs()).toEqual({ fourColor: true, drillRange: 'always', drillInfo: false });
    savePrefs({ ...loadPrefs(), drillRange: 'off' });
    expect(loadPrefs().drillRange).toBe('off');
  });

  it('P1-STUDY-01 old or malformed preferences fall back field by field', () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ fourColor: true })); // file from before study mode
    expect(loadPrefs()).toEqual({ fourColor: true, drillRange: 'after', drillInfo: true });
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ fourColor: 'yes', drillRange: 'sometimes', drillInfo: 1 }));
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    window.localStorage.setItem(PREFS_KEY, '{oops');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    window.localStorage.setItem(PREFS_KEY, 'null');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
});
