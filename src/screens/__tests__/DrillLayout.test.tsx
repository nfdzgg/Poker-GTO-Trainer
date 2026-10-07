import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DRILL_FIT_QUERY, DRILL_SHORT_QUERY } from '../../lib/media';
import { DrillScreen } from '../DrillScreen';

const params = (q: string) => new URLSearchParams(q);
const actions = () => within(screen.getByRole('group', { name: 'Your action' })).getAllByRole('button');
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const original = window.matchMedia;

function mockFit(fit: boolean, short = false) {
  window.matchMedia = ((query: string) => ({
    matches: (fit && query === DRILL_FIT_QUERY) || (short && query === DRILL_SHORT_QUERY),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = original;
});

describe('Drill layout', () => {
  it('UI-07 the one-screen media query in the stylesheet is the one the drill uses', () => {
    const css = readFileSync(path.resolve(__dirname, '../../styles/components.css'), 'utf8');
    expect(css).toContain(`@media ${DRILL_FIT_QUERY} {`);
    expect(css).toContain(`@media ${DRILL_SHORT_QUERY} {`);
  });

  it('UI-07 short desktop windows fold the settings into a pop-over that opens from the title row and closes with Escape', () => {
    mockFit(true, true);
    render(<DrillScreen params={params('seed=4242')} />);
    const toggle = screen.getByRole('button', { name: /^Settings · Range: After I answer$/ });
    const settings = document.getElementById('drill-settings')!;
    expect(toggle).toHaveAttribute('aria-controls', 'drill-settings');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(settings).not.toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(settings).toBeVisible();
    fireEvent.click(screen.getByTestId('range-mode-always')); // the drill reacts while the pop-over stays open
    expect(screen.getByTestId('study-range')).toBeInTheDocument();
    expect(settings).toBeVisible();
    expect(toggle).toHaveTextContent('Range: Always');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(settings).not.toBeVisible();
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    fireEvent.mouseDown(screen.getByTestId('poker-table')); // a click elsewhere closes it too
    expect(settings).not.toBeVisible();
  });

  it('UI-07 phones and tablets: hand and actions first, settings last in the page as on screen; result, range and spot info all shown after answering', () => {
    mockFit(false);
    render(<DrillScreen params={params('seed=4242')} />);
    const settings = document.querySelector('.drill-settings')!;
    expect(before(screen.getByTestId('poker-table'), settings)).toBe(true);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    fireEvent.click(actions()[0]!);
    const result = screen.getByTestId('drill-result');
    const range = screen.getByTestId('study-range');
    const info = screen.getByTestId('spot-info');
    // reading and focus order match the stacked order on screen: result, then range, then spot info
    expect(before(result, range)).toBe(true);
    expect(before(range, info)).toBe(true);
    expect(screen.queryByTestId('show-spot-info')).toBeNull();
    // only the answer is in a live region, so the spot info is not read out on every deal
    expect(result.closest('[aria-live]')).not.toBeNull();
    expect(info.closest('[aria-live]')).toBeNull();
  });

  it('UI-07 desktop: settings first; after answering the side panel shows the result, Spot info is one click away and focus follows the toggle', () => {
    mockFit(true);
    render(<DrillScreen params={params('seed=4242')} />);
    const settings = document.querySelector('.drill-settings')!;
    expect(before(settings, screen.getByTestId('poker-table'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.getByTestId('spot-info').closest('[aria-live]')).toBeNull();
    fireEvent.click(actions()[0]!);
    expect(screen.getByTestId('drill-result')).toBeVisible();
    expect(screen.queryByTestId('spot-info')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('next-hand'));

    fireEvent.click(screen.getByTestId('show-spot-info'));
    expect(screen.getByTestId('spot-info')).toBeInTheDocument();
    expect(screen.getByTestId('drill-result')).not.toBeVisible(); // kept mounted (no replayed grade animation), just hidden
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('show-result'));

    fireEvent.click(screen.getByTestId('show-result'));
    expect(screen.queryByTestId('spot-info')).toBeNull();
    expect(screen.getByTestId('drill-result')).toBeVisible();
    expect(document.activeElement).toBe(screen.getByTestId('show-spot-info'));

    // the next hand starts with the spot info again, and its answer opens on the result
    fireEvent.click(screen.getByTestId('show-spot-info'));
    fireEvent.click(screen.getByTestId('next-hand'));
    expect(screen.getByTestId('spot-info')).toBeInTheDocument();
    expect(screen.queryByTestId('show-result')).toBeNull();
    fireEvent.click(actions()[0]!);
    expect(screen.getByTestId('drill-result')).toBeVisible();
    expect(screen.queryByTestId('spot-info')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('next-hand'));
  });

  it('UI-07 desktop with spot info off: no toggle, the result simply replaces the hint', () => {
    mockFit(true);
    window.localStorage.setItem('pgt.prefs.v1', JSON.stringify({ fourColor: false, drillRange: 'after', drillInfo: false }));
    render(<DrillScreen params={params('seed=4242')} />);
    expect(screen.getByRole('heading', { name: 'Your call' })).toBeInTheDocument();
    fireEvent.click(actions()[0]!);
    expect(screen.getByTestId('drill-result')).toBeVisible();
    expect(screen.queryByTestId('show-spot-info')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Your call' })).toBeNull();
  });
});
