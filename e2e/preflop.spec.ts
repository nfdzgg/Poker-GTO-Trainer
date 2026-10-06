import { expect, test } from '@playwright/test';
import { gotoScreen } from './helpers';

test('E2E-03 complete 5 drill hands, reload, and the stats screen shows 5 hands (P1-STAT-01)', async ({ page }) => {
  await gotoScreen(page, '#/stats');
  await expect(page.getByTestId('total-hands')).toHaveText('0');
  await gotoScreen(page, '#/drill?seed=77');
  for (let i = 0; i < 5; i++) {
    const actions = page.getByRole('group', { name: 'Your action' }).getByRole('button');
    await actions.nth(i % 2).click();
    await expect(page.getByTestId('drill-result')).toBeVisible();
    await expect(page.getByTestId('explanation')).toContainText('Chart frequencies');
    await expect(page.getByTestId('freq-bar')).toBeVisible();
    await page.getByTestId('next-hand').click();
  }
  await expect(page.getByTestId('session-count')).toHaveText('5');
  await page.reload();
  await gotoScreen(page, '#/stats');
  await expect(page.getByTestId('total-hands')).toHaveText('5');
  // View-full-range button opens the viewer on that spot
  await gotoScreen(page, '#/drill?seed=78');
  await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
  const situation = await page.getByTestId('situation').innerText();
  await page.getByTestId('view-range').click();
  await expect(page.getByTestId('viewer-description')).toHaveText(situation);
});
