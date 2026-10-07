import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpotInfoPanel } from '../../components/drill/SpotInfoPanel';
import { spotFacts } from '../../lib/preflop/facts';
import { getSpot } from '../../lib/preflop/spots';
import { loadPrefs, PREFS_KEY } from '../../lib/prefs';
import { loadStats, saveStats, type StatRecord } from '../../lib/stats/store';
import { DrillScreen } from '../DrillScreen';
import { StatsScreen } from '../StatsScreen';

const params = (q: string) => new URLSearchParams(q);
const actions = () => within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button');
const answered = () => {
  const href = screen.getByTestId('view-range').getAttribute('href')!;
  const q = new URLSearchParams(href.split('?')[1]);
  return { spot: getSpot(q.get('spot')!)!, hand: q.get('hand')! };
};
const selectedCell = () => screen.getByTestId('study-range').querySelector<HTMLButtonElement>('.range-cell.selected');

describe('Drill study mode', () => {
  it('P1-STUDY-01 by default the range for the spot appears beside the hand right after answering', () => {
    render(<DrillScreen params={params('seed=12345')} />);
    expect((screen.getByTestId('range-mode-after') as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByTestId('study-range')).toBeNull(); // no spoilers while deciding
    fireEvent.click(actions()[0]!);
    const { spot, hand } = answered();
    const panel = screen.getByTestId('study-range');
    expect(panel.querySelectorAll('.range-cell')).toHaveLength(169);
    expect(selectedCell()!.dataset.hand).toBe(hand);
    expect(selectedCell()!.getAttribute('aria-pressed')).toBe('true');
    expect(within(panel).getByRole('heading', { level: 2 }).textContent).toContain(spot.hero);
    expect(screen.getByTestId('study-detail').textContent).toContain(`${hand} · your hand`);
    for (const a of spot.actions) expect(screen.getByTestId('study-detail').textContent).toContain(`${((spot.hands[hand]![a] ?? 0) * 100).toFixed(1)}%`);
    // next hand: hidden again until answered
    fireEvent.click(screen.getByTestId('next-hand'));
    expect(screen.queryByTestId('study-range')).toBeNull();
  });

  it('P1-STUDY-01 "Always" shows the range with the dealt hand while deciding; "Off" never shows it; the choice persists', () => {
    const { unmount } = render(<DrillScreen params={params('seed=777')} />);
    fireEvent.click(screen.getByTestId('range-mode-always'));
    expect(loadPrefs().drillRange).toBe('always');
    const panel = screen.getByTestId('study-range');
    expect(within(panel).getByText('Open book')).toBeInTheDocument();
    const before = selectedCell()!.dataset.hand!;
    fireEvent.click(actions()[0]!);
    expect(answered().hand).toBe(before); // the outlined hand is the dealt hand
    expect(within(screen.getByTestId('study-range')).getByText('Review')).toBeInTheDocument();
    unmount();
    render(<DrillScreen params={params('seed=778')} />);
    expect((screen.getByTestId('range-mode-always') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId('study-range')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('range-mode-off'));
    expect(screen.queryByTestId('study-range')).toBeNull();
    fireEvent.click(actions()[0]!);
    expect(screen.queryByTestId('study-range')).toBeNull();
    expect(screen.getByTestId('drill-result')).toBeInTheDocument(); // result panel still explains the answer
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!).drillRange).toBe('off');
  });

  it('P1-STUDY-01 hovering another hand in the study grid shows its frequencies', () => {
    render(<DrillScreen params={params('seed=31')} />);
    fireEvent.click(screen.getByTestId('range-mode-always'));
    const aa = screen.getByTestId('study-range').querySelector<HTMLButtonElement>('.range-cell[data-hand="AA"]')!;
    fireEvent.mouseEnter(aa);
    expect(screen.getByTestId('study-detail').textContent).toMatch(/^AA/);
    expect(screen.getByTestId('study-detail').textContent).toContain('6 combos');
  });

  it('P1-STUDY-02 the spot info panel shows seats, pot odds, opponent range and hand category for the dealt spot', () => {
    render(<DrillScreen params={params('seed=5&type=vs-open&pos=BB')} />);
    const info = screen.getByTestId('spot-info');
    const situation = screen.getByTestId('situation').textContent!;
    const villain = /^(\w+) opens/.exec(situation)![1]!;
    const spot = getSpot(`vsopen-BB-vs-${villain}`)!;
    const f = spotFacts(spot, 'AA');
    expect(within(info).getByText('Big Blind (BB)')).toBeInTheDocument();
    expect(screen.getByTestId('fact-odds').textContent).toBe(`${spot.toCall}bb more into ${spot.pot}bb: you need ${(f.potOdds! * 100).toFixed(0)}% equity to call`);
    expect(screen.getByTestId('fact-villain').textContent).toBe(f.villainRange!.text);
    expect(screen.getByTestId('fact-position').textContent).toBe(f.positionNote);
    expect(screen.getByTestId('fact-hand').textContent).toMatch(/: an? .+ · \d+ combos$/);
    expect(screen.getByTestId('fact-tip').textContent).toMatch(/defend widely/);
    fireEvent.click(screen.getByTestId('spot-info-toggle'));
    expect(screen.queryByTestId('spot-info')).toBeNull();
    expect(loadPrefs().drillInfo).toBe(false);
  });

  it('P1-STUDY-02 spot info is the same for every hand in a spot apart from the hand line (it never gives the answer away)', () => {
    const spot = getSpot('vsopen-CO-vs-HJ')!;
    const text = (hand: string) => {
      const { container, unmount } = render(<SpotInfoPanel spot={spot} hand={hand} />);
      const clone = container.cloneNode(true) as HTMLElement;
      clone.querySelector('[data-testid="fact-hand"]')!.textContent = '';
      unmount();
      return clone.textContent;
    };
    const base = text('AA');
    for (const h of ['72o', 'A5s', '99', 'KJo']) expect(text(h)).toBe(base);
  });

  it('P1-STUDY-03 answers made while the range is visible are saved as open-book practice; others are graded', () => {
    render(<DrillScreen params={params('seed=900')} />);
    fireEvent.click(actions()[0]!); // "after" mode: graded
    fireEvent.click(screen.getByTestId('next-hand'));
    fireEvent.click(screen.getByTestId('range-mode-always'));
    fireEvent.click(actions()[0]!); // open book
    fireEvent.click(screen.getByTestId('next-hand'));
    fireEvent.click(screen.getByTestId('range-mode-off'));
    fireEvent.click(actions()[0]!); // this deal appeared with the range on screen, so switching it off first still counts as a peek
    const recs = loadStats().records;
    expect(recs.map((r) => r.assisted === true)).toEqual([false, true, true]);
  });

  it('P1-STUDY-03 a peek at the range before answering marks that answer as assisted', () => {
    render(<DrillScreen params={params('seed=901')} />);
    fireEvent.click(screen.getByTestId('range-mode-always'));
    fireEvent.click(screen.getByTestId('range-mode-after'));
    expect(screen.queryByTestId('study-range')).toBeNull();
    fireEvent.click(actions()[0]!);
    expect(loadStats().records[0]!.assisted).toBe(true);
    expect(screen.getByTestId('session-assisted').textContent).toMatch(/1 with the range shown/);
    fireEvent.click(screen.getByTestId('next-hand'));
    fireEvent.click(actions()[0]!);
    expect(loadStats().records[1]!.assisted).toBeUndefined();
  });

  it('P1-STUDY-03 the stats screen counts open-book answers separately from graded accuracy', () => {
    const r = (grade: StatRecord['grade'], assisted?: boolean): StatRecord => ({ t: 1, spotId: 'rfi-CO', type: 'rfi', hero: 'CO', villain: null, hand: 'AKo', action: 'raise', grade, ...(assisted ? { assisted } : {}) });
    saveStats({ version: 1, records: [r('best'), r('mistake'), r('mistake', true), r('mistake', true), r('mistake', true)], postflop: [] });
    render(<StatsScreen />);
    expect(screen.getByTestId('total-hands').textContent).toBe('2');
    expect(screen.getByTestId('total-accuracy').textContent).toBe('50%');
    expect(screen.getByTestId('assisted-hands').textContent).toBe('3');
  });
});
