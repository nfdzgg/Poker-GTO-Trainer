import { expect, test } from '@playwright/test';
import { gotoScreen, watchProblems } from './helpers';

test('E2E-04 postflop flow: load the river example, solve, see progress then a results grid, navigate one action deep', async ({ page }) => {
  const problems = watchProblems(page);
  await gotoScreen(page, '#/analyzer');
  await page.getByTestId('example-river').click();
  await expect(page.getByTestId('memory-estimate')).toHaveText(/Estimated memory: [\d.]+ MB/);
  await page.getByTestId('solve').click();
  const progress = page.getByTestId('solve-progress');
  await expect(progress).toBeVisible();
  await expect(progress.getByRole('progressbar')).toBeVisible();
  await expect(progress).toHaveAttribute('data-status', 'solved', { timeout: 60_000 });
  expect(Number(await page.getByTestId('solve-iterations').innerText())).toBeGreaterThan(0);
  const results = page.getByTestId('results');
  await expect(results.getByTestId('range-grid')).toBeVisible();
  await expect(results.locator('.range-cell')).toHaveCount(169);
  await expect(page.getByTestId('node-player')).toContainText('BB to act');
  await page.getByTestId('node-action-0').click();
  await expect(page.getByTestId('node-player')).toContainText('BTN to act');
  await expect(page.getByTestId('breadcrumb').getByRole('listitem')).toHaveCount(2);
  await expect(results.locator('.range-cell')).toHaveCount(169);
  await results.locator('.range-cell[data-hand="AQs"]').click();
  await expect(page.getByTestId('recommended-play')).toContainText('Recommended play with');
  expect(problems).toEqual([]);
});

test('P2-UI-04 the main thread stays responsive during a solve in the Web Worker, and cancel works', async ({ page }) => {
  const problems = watchProblems(page);
  await gotoScreen(page, '#/analyzer');
  await page.getByTestId('example-flop').click();
  await page.getByTestId('target').fill('0.01');
  await page.getByTestId('max-iterations').fill('100000');
  await expect(page.getByTestId('memory-estimate')).toHaveText(/Estimated memory: \d+ MB/, { timeout: 30_000 });
  // Main-thread counters: an animation-frame loop and a 10ms interval.
  await page.evaluate(() => {
    const w = window as unknown as { __raf: number; __ticks: number; __stop: boolean };
    w.__raf = 0;
    w.__ticks = 0;
    w.__stop = false;
    const loop = () => {
      w.__raf++;
      if (!w.__stop) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    setInterval(() => w.__ticks++, 10);
  });
  await page.getByTestId('solve').click();
  await expect(page.getByTestId('solve-progress')).toHaveAttribute('data-status', 'solving');
  const before = await page.evaluate(() => {
    const w = window as unknown as { __raf: number; __ticks: number };
    return { raf: w.__raf, ticks: w.__ticks, t: performance.now() };
  });
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => {
    const w = window as unknown as { __raf: number; __ticks: number };
    return { raf: w.__raf, ticks: w.__ticks, t: performance.now() };
  });
  const seconds = (after.t - before.t) / 1000;
  const fps = (after.raf - before.raf) / seconds;
  const tps = (after.ticks - before.ticks) / seconds;
  console.log(`During the solve: ${fps.toFixed(1)} animation frames/s and ${tps.toFixed(1)} timer ticks/s on the main thread`);
  expect(fps).toBeGreaterThan(20);
  expect(tps).toBeGreaterThan(40);
  await expect(page.getByTestId('solve-progress')).toHaveAttribute('data-status', 'solving');
  // A UI interaction is handled immediately while solving.
  const t0 = Date.now();
  await page.getByRole('link', { name: 'About' }).hover();
  expect(Date.now() - t0).toBeLessThan(1000);
  await expect.poll(async () => Number(await page.getByTestId('solve-iterations').innerText()), { timeout: 60_000 }).toBeGreaterThan(0);
  await page.getByTestId('cancel-solve').click();
  await expect(page.getByTestId('solve-progress')).toHaveAttribute('data-status', 'cancelled', { timeout: 60_000 });
  await expect(page.getByTestId('results').getByTestId('range-grid')).toBeVisible({ timeout: 60_000 });
  expect(problems).toEqual([]);
});
