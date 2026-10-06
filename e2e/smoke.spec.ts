import { expect, test } from '@playwright/test';
import { gotoScreen, SCREENS, watchProblems } from './helpers';

test('E2E-01 the built app loads from a sub-path and every screen renders without console errors or failed requests', async ({ page, baseURL }) => {
  expect(new URL(baseURL!).pathname).toBe('/poker-gto-trainer/');
  const problems = watchProblems(page);
  for (const s of SCREENS) {
    await gotoScreen(page, s.hash);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('data-route', s.name);
    const text = await page.locator('main').innerText();
    expect(text.length, s.name).toBeGreaterThan(40);
  }
  // Navigating through the header works without full reloads (hash routing).
  await gotoScreen(page, '#/');
  for (const label of ['Preflop Drill', 'Ranges', 'Stats', 'Postflop', 'About', 'Home']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  // the source repository is linked from the footer
  await expect(page.locator('footer a', { hasText: 'Source code' })).toHaveAttribute('href', /github\.com/);
  expect(problems).toEqual([]);
});
