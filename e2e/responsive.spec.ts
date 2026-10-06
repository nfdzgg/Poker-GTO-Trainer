import { expect, test } from '@playwright/test';
import { gotoScreen, SCREENS, VIEWPORTS } from './helpers';

for (const vp of VIEWPORTS) {
  test(`E2E-02 no horizontal scrolling on any screen at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const s of SCREENS) {
      await gotoScreen(page, s.hash);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${s.name} @${vp.name}`).toBeLessThanOrEqual(innerWidth);
    }
  });
}

test('E2E-02 the 13x13 grid is fully visible without horizontal scrolling on the phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoScreen(page, '#/ranges?spot=rfi-BTN');
  const grid = page.getByTestId('range-grid');
  const box = (await grid.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const cells = page.locator('.range-cell');
  await expect(cells).toHaveCount(169);
  for (const label of ['AA', 'A2s', 'A2o', '22']) {
    const b = (await page.locator(`.range-cell[data-hand="${label}"]`).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    expect(b.width).toBeGreaterThan(18);
  }
});

test('UI-06 tap targets are at least 44px on the phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const small: string[] = [];
  for (const s of SCREENS) {
    await gotoScreen(page, s.hash);
    const found = await page.evaluate(() => {
      const out: string[] = [];
      const els = [...document.querySelectorAll<HTMLElement>('a[href], button, select, input, textarea')];
      for (const el of els) {
        if (el.classList.contains('range-cell') || el.classList.contains('skip-link')) continue; // grid cells: see NOTES.md
        if (el.closest('p, li > span, dd, td')) continue; // inline text links (WCAG 2.5.8 inline exception)
        const target = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? (el.closest('label') ?? el) : el;
        const r = target.getBoundingClientRect();
        const style = getComputedStyle(target);
        if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue;
        // round to whole CSS pixels: sub-pixel layout can report 43.99 for a 44px control
        if (Math.round(r.height) < 44 || Math.round(r.width) < 44) out.push(`${target.tagName}.${target.className} "${(target.textContent ?? '').trim().slice(0, 20)}" ${r.width.toFixed(2)}x${r.height.toFixed(2)}`);
      }
      return out;
    });
    small.push(...found.map((f) => `${s.name}: ${f}`));
  }
  expect(small).toEqual([]);
});

test('UI-06 keyboard focus is visible', async ({ page }) => {
  await gotoScreen(page, '#/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.tag).toBe('A');
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});
