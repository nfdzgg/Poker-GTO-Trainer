import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator } from '@playwright/test';
import { gotoScreen, VIEWPORTS, watchProblems } from './helpers';

/** Answer a multiple-choice question by trying its options until one is accepted. */
async function solve(question: Locator) {
  const options = question.locator('.quiz-option');
  const n = await options.count();
  for (let i = 0; i < n; i++) {
    if ((await question.getAttribute('data-solved')) === 'true') break;
    const o = options.nth(i);
    if (await o.isEnabled()) await o.click();
  }
  await expect(question).toHaveAttribute('data-solved', 'true');
}

test('E2E-07 a beginner starts the course from Home, finishes a lesson, keeps progress after a reload and drills a plan goal', async ({ page }) => {
  const problems = watchProblems(page);
  await gotoScreen(page, '#/');
  await expect(page.getByTestId('home-cta')).toHaveText('Start the beginner course');
  await page.getByTestId('home-cta').click();
  await expect(page.getByTestId('lesson')).toHaveAttribute('data-lesson', 'welcome');
  for (const q of await page.locator('.quiz-question').all()) await solve(q);
  await expect(page.getByText('✓ Lesson complete')).toBeVisible();
  await page.reload();
  await gotoScreen(page, '#/learn');
  await expect(page.getByTestId('course-progress-text')).toHaveText(/^1 of \d+ lessons complete$/);
  await expect(page.getByTestId('lesson-card-welcome')).toHaveClass(/complete/);
  await gotoScreen(page, '#/');
  await expect(page.getByTestId('home-cta')).toHaveText('Continue the course: Lesson 1');
  // a grid question in the hands lesson
  await gotoScreen(page, '#/learn?lesson=hands');
  const grid = page.getByTestId('question-hands-tap-76s');
  await grid.locator('.range-cell[data-hand="76s"]').click();
  await expect(grid).toHaveAttribute('data-solved', 'true');
  // the practice plan opens a filtered drill that tracks the goal
  await gotoScreen(page, '#/learn?lesson=plan');
  await page.getByTestId('stage-open-link').click();
  await expect(page.getByTestId('goal-strip')).toContainText('Goal: Opening ranges');
  await expect(page.getByTestId('situation')).toContainText(/raise to .* or fold/);
  await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
  await expect(page.getByTestId('goal-strip')).toContainText('1/30 hands');
  expect(problems).toEqual([]);
});

for (const vp of VIEWPORTS) {
  test(`E2E-07 course pages fit the ${vp.name} viewport without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    mkdirSync(path.resolve('artifacts/screenshots'), { recursive: true });
    for (const lesson of ['welcome', 'table', 'hands', 'money', 'opening', 'facing-open', 'value-bluffs', 'facing-3bet', 'practice', 'postflop', 'plan']) {
      await gotoScreen(page, `#/learn?lesson=${lesson}`);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      expect(scrollWidth, lesson).toBeLessThanOrEqual(innerWidth);
      if (lesson === 'hands' || lesson === 'plan') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.resolve(`artifacts/screenshots/learn-${lesson}-${vp.name}.png`), fullPage: true });
      }
    }
  });
}
