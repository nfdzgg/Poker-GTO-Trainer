import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BetChips } from '../Chip';
import { GradeBadge } from '../GradeBadge';
import { PlayingCard } from '../PlayingCard';
import { ScreenTransition } from '../ScreenTransition';

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/** Record every distinct value of data-anim as timers advance. */
function phases(el: () => Element, stepMs = 20, totalMs = 2000): string[] {
  const seen: string[] = [el().getAttribute('data-anim')!];
  for (let t = 0; t < totalMs; t += stepMs) {
    act(() => {
      vi.advanceTimersByTime(stepMs);
    });
    const v = el().getAttribute('data-anim')!;
    if (v !== seen[seen.length - 1]) seen.push(v);
  }
  return seen;
}

describe('animations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('UI-02 card dealing progresses dealing -> flipping -> revealed', () => {
    render(<PlayingCard card={51} anim="deal" animKey={1} />);
    expect(phases(() => screen.getByRole('img'))).toEqual(['dealing', 'flipping', 'revealed']);
  });

  it('UI-02 card flip reveal progresses face-down -> flipping -> revealed and restarts on a new key', () => {
    const { rerender } = render(<PlayingCard card={0} anim="flip" animKey="a" />);
    expect(phases(() => screen.getByRole('img'))).toEqual(['face-down', 'flipping', 'revealed']);
    rerender(<PlayingCard card={4} anim="flip" animKey="b" />);
    expect(phases(() => screen.getByRole('img'))).toEqual(['face-down', 'flipping', 'revealed']);
  });

  it('UI-02 chips move into the pot: idle -> moving -> in-pot', () => {
    const { rerender } = render(<BetChips amount={7.5} toPot={false} />);
    expect(screen.getByTestId('bet-chips').getAttribute('data-anim')).toBe('idle');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('bet-chips').getAttribute('data-anim')).toBe('idle');
    rerender(<BetChips amount={7.5} toPot />);
    expect(phases(() => screen.getByTestId('bet-chips'))).toEqual(['moving', 'in-pot']);
  });

  it('UI-02 grade feedback progresses grade-enter -> grade-shown', () => {
    render(<GradeBadge grade="best" animKey={1} />);
    expect(phases(() => screen.getByRole('status'))).toEqual(['grade-enter', 'grade-shown']);
  });

  it('UI-02 screen transitions progress entering -> entered on every screen change', () => {
    const { rerender } = render(
      <ScreenTransition screenKey="home">
        <p>home</p>
      </ScreenTransition>,
    );
    expect(phases(() => screen.getByTestId('screen-transition'))).toEqual(['entering', 'entered']);
    rerender(
      <ScreenTransition screenKey="stats">
        <p>stats</p>
      </ScreenTransition>,
    );
    expect(phases(() => screen.getByTestId('screen-transition'))).toEqual(['entering', 'entered']);
  });

  it('UI-03 with prefers-reduced-motion every animation jumps straight to its final state', () => {
    mockReducedMotion(true);
    render(
      <>
        <PlayingCard card={51} anim="deal" animKey={1} />
        <GradeBadge grade="mistake" animKey={1} />
        <BetChips amount={2.5} toPot />
        <ScreenTransition screenKey="x">
          <p>x</p>
        </ScreenTransition>
      </>,
    );
    expect(screen.getByRole('img', { name: /Ace of spades/ }).getAttribute('data-anim')).toBe('revealed');
    expect(screen.getByRole('status').getAttribute('data-anim')).toBe('grade-shown');
    expect(screen.getByTestId('bet-chips').getAttribute('data-anim')).toBe('in-pot');
    expect(screen.getByTestId('screen-transition').getAttribute('data-anim')).toBe('entered');
  });
});
