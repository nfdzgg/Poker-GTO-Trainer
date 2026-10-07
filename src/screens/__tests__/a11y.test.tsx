import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';

const ROUTES = ['#/', '#/learn', '#/learn?lesson=hands', '#/learn?lesson=plan', '#/drill?seed=3', '#/ranges', '#/stats', '#/about'];

describe('keyboard accessibility', () => {
  it('UI-06 every interactive control on every screen is keyboard reachable', async () => {
    for (const hash of ROUTES) {
      window.location.hash = hash;
      const { unmount, container } = render(<App />);
      await act(async () => {});
      const controls = [...container.querySelectorAll<HTMLElement>('a[href], button, select, input, textarea, [tabindex]')];
      expect(controls.length, hash).toBeGreaterThan(5);
      for (const el of controls) {
        if (el.closest('[hidden]') || (el as HTMLButtonElement).disabled) continue;
        const roving = el.classList.contains('range-cell');
        if (roving) continue; // grid cells use a roving tabindex; checked separately
        expect(el.tabIndex, `${hash} ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(el.id === 'main-content' ? -1 : 0);
        el.focus();
        expect(document.activeElement, `${hash} ${el.outerHTML.slice(0, 80)}`).toBe(el);
      }
      const cells = container.querySelectorAll<HTMLElement>('.range-cell');
      if (cells.length) expect([...cells].filter((c) => c.tabIndex === 0)).toHaveLength(1);
      unmount();
    }
  });

  it('UI-06 a skip link and labelled navigation exist', () => {
    window.location.hash = '#/';
    const { container } = render(<App />);
    expect(container.querySelector('.skip-link')).not.toBeNull();
    expect(container.querySelector('nav[aria-label="Main"]')).not.toBeNull();
    for (const sel of container.querySelectorAll('select')) expect(sel.closest('label')).not.toBeNull();
  });
});
