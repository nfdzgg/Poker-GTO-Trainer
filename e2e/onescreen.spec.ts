import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { gotoScreen, watchProblems } from './helpers';

// Common laptop and desktop browser windows (inner sizes), smallest first.
const DESKTOPS = [
  { width: 1280, height: 650 },
  { width: 1366, height: 657 },
  { width: 1280, height: 800 },
  { width: 1536, height: 730 },
  { width: 1920, height: 1080 },
] as const;

async function setPrefs(page: Page, drillRange: string, drillInfo: boolean) {
  await page.evaluate(([r, i]) => localStorage.setItem('pgt.prefs.v1', JSON.stringify({ fourColor: false, drillRange: r, drillInfo: i })), [drillRange, drillInfo] as const);
}

/** Page scroll, plus any drill panel that pokes out of the drill area or needs its own scrollbar. */
async function fitProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight) out.push(`page scrolls ${de.scrollHeight - innerHeight}px`);
    if (de.scrollWidth > innerWidth) out.push(`page scrolls sideways ${de.scrollWidth - innerWidth}px`);
    const stage = document.querySelector('.drill-stage')!.getBoundingClientRect();
    for (const el of document.querySelectorAll<HTMLElement>('.drill-table, .drill-range > *, .drill-coach > *')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > stage.bottom + 1) out.push(`${el.className} ends ${Math.round(r.bottom - stage.bottom)}px below the drill`);
    }
    for (const el of document.querySelectorAll<HTMLElement>('.drill-range, .drill-coach'))
      if (el.scrollHeight > el.clientHeight + 1) out.push(`${el.className} scrolls ${el.scrollHeight - el.clientHeight}px`);
    // the hand, the actions and the next-hand row are on screen
    for (const sel of ['[aria-label="Your hand"]', '[role="group"][aria-label="Your action"]', '.drill-next']) {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) out.push(`${sel} off screen`);
    }
    return out;
  });
}

test('E2E-08 UI-07 UI-08 the preflop drill fits one screen on laptop and desktop windows with every study setting, before and after answering; the dealt hand stands out in the grid', async ({ page }) => {
  test.setTimeout(400_000);
  const problems = watchProblems(page);
  const bad: string[] = [];
  for (const vp of DESKTOPS) {
    await page.setViewportSize(vp);
    for (const range of ['off', 'after', 'always']) {
      for (const info of [true, false]) {
        for (const goal of ['', '&type=rfi&goal=open']) {
          await gotoScreen(page, '#/');
          await setPrefs(page, range, info);
          await gotoScreen(page, `#/drill?seed=4242${goal}`);
          const tag = `${vp.width}x${vp.height} range=${range} info=${info}${goal ? ' goal' : ''}`;
          for (const p of await fitProblems(page)) bad.push(`${tag} deciding: ${p}`);
          await page.getByRole('group', { name: 'Your action' }).getByRole('button').last().click();
          await expect(page.getByTestId('drill-result')).toBeVisible();
          for (const p of await fitProblems(page)) bad.push(`${tag} answered: ${p}`);
        }
      }
    }
  }
  expect(bad).toEqual([]);
  // the dealt hand stands out in the study grid (UI-08)
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoScreen(page, '#/');
  await setPrefs(page, 'always', true);
  await gotoScreen(page, '#/drill?seed=4242');
  const cell = page.getByTestId('study-range').locator('.range-cell.selected');
  await expect(cell).toHaveCount(1);
  const style = await cell.evaluate((el) => ({ transform: getComputedStyle(el).transform, shadow: getComputedStyle(el).boxShadow, z: getComputedStyle(el).zIndex }));
  expect(style.transform).not.toBe('none');
  expect(style.shadow).not.toBe('none');
  expect(style.z).toBe('2');
  await expect(page.getByTestId('study-range').locator('.range-cell.guide')).toHaveCount(24);
  await expect(page.getByTestId('poker-table').getByTestId('dealer-button')).toBeVisible();
  mkdirSync(path.resolve('artifacts/screenshots'), { recursive: true });
  await page.screenshot({ path: path.resolve('artifacts/screenshots/drill-onescreen-1280x800.png') });
  expect(problems).toEqual([]);
});

test('E2E-08 UI-07 on a phone the hand, the actions and the next-hand button are in the first screen; settings follow the drill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoScreen(page, '#/drill?seed=4242');
  const inFirstScreen = async (sel: string) => {
    const b = (await page.locator(sel).first().boundingBox())!;
    expect(b.y, sel).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, sel).toBeLessThanOrEqual(844);
  };
  await inFirstScreen('[aria-label="Your hand"]');
  await inFirstScreen('[role="group"][aria-label="Your action"]');
  await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
  await inFirstScreen('[data-testid="next-hand"]');
  // the settings come after the drill, and the Settings button brings them into view
  const settings = page.locator('.drill-settings');
  const table = (await page.getByTestId('poker-table').boundingBox())!;
  expect((await settings.boundingBox())!.y).toBeGreaterThan(table.y + table.height);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('filter-type')).toBeInViewport();
  await expect(page.getByTestId('filter-type')).toBeFocused();
});
