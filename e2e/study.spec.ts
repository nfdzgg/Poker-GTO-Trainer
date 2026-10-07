import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { gotoScreen, VIEWPORTS, watchProblems } from './helpers';

for (const vp of VIEWPORTS) {
  test(`E2E-06 P1-STUDY-01 study mode shows the spot range next to the dealt hand at ${vp.width}x${vp.height}`, async ({ page }) => {
    const problems = watchProblems(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoScreen(page, '#/drill?seed=4242');
    await expect(page.getByTestId('study-range')).toHaveCount(0); // default: only after answering
    await expect(page.getByTestId('spot-info')).toBeVisible();
    await page.getByTestId('range-mode').getByText('Always', { exact: true }).click();
    const panel = page.getByTestId('study-range');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.range-cell')).toHaveCount(169);
    const selected = panel.locator('.range-cell.selected');
    await expect(selected).toHaveCount(1);
    await expect(page.getByLabel('Your hand')).toBeVisible();
    // grid fully on screen horizontally, no page-level horizontal scroll
    const grid = (await panel.getByTestId('range-grid').boundingBox())!;
    expect(grid.x).toBeGreaterThanOrEqual(0);
    expect(grid.x + grid.width).toBeLessThanOrEqual(vp.width);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    if (vp.name === 'desktop') {
      // side by side: the hand and the grid are both in the first screen
      const cards = (await page.getByLabel('Your hand').boundingBox())!;
      expect(grid.x).toBeGreaterThan(cards.x + cards.width);
    }
    // segmented control targets are at least 44px
    for (const label of await page.getByTestId('range-mode').locator('label').all()) {
      const b = (await label.boundingBox())!;
      expect(Math.round(b.height)).toBeGreaterThanOrEqual(44);
      expect(Math.round(b.width)).toBeGreaterThanOrEqual(44);
    }
    const hand = await selected.getAttribute('data-hand');
    await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
    await expect(page.getByTestId('drill-result')).toBeVisible();
    await expect(page.getByTestId('view-range')).toHaveAttribute('href', new RegExp(`hand=${hand}$`));
    await expect(panel.getByText('Review')).toBeVisible();
    mkdirSync(path.resolve('artifacts/screenshots'), { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.resolve(`artifacts/screenshots/drill-study-${vp.name}.png`), fullPage: true });
    expect(problems).toEqual([]);
  });
}
