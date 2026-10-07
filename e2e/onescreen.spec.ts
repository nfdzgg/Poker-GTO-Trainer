import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { gotoScreen, watchProblems } from './helpers';

// Common laptop and desktop browser windows (inner sizes), including short ones such as a
// 1366x768 laptop with the taskbar and browser toolbars, and the narrower 1024-1199 layout.
const DESKTOPS = [
  { width: 1200, height: 580 },
  { width: 1366, height: 625 },
  { width: 1280, height: 650 },
  { width: 1366, height: 657 },
  { width: 1024, height: 700 },
  { width: 1280, height: 800 },
  { width: 1536, height: 730 },
  { width: 1920, height: 1080 },
] as const;
// 4242: facing an open from the small blind; 26 and 497: the longest explanations (about 630
// characters); 7: facing a 3-bet, the longest spot info.
const SEEDS = [4242, 26, 497, 7];

/** Start as a brand-new visitor (so the course link shows) with the given drill settings. */
async function freshStart(page: Page, drillRange: string, drillInfo: boolean) {
  await gotoScreen(page, '#/');
  await page.evaluate(
    ([r, i]) => {
      localStorage.clear();
      localStorage.setItem('pgt.prefs.v1', JSON.stringify({ fourColor: false, drillRange: r, drillInfo: i }));
    },
    [drillRange, drillInfo] as const,
  );
}

/** Page scroll, drill parts that poke out of the drill area or scroll on their own, and a misplaced dealer button. */
async function fitProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight || scrollY !== 0) out.push(`page scrolls ${de.scrollHeight - innerHeight}px`);
    if (de.scrollWidth > innerWidth) out.push(`page scrolls sideways ${de.scrollWidth - innerWidth}px`);
    const rect = (el: Element) => el.getBoundingClientRect();
    const stage = rect(document.querySelector('.drill-stage')!);
    const below = (el: Element | null, what: string) => {
      if (el && rect(el).bottom > stage.bottom + 1) out.push(`${what} ends ${Math.round(rect(el).bottom - stage.bottom)}px below the drill`);
    };
    below(document.querySelector('.drill-next'), 'next-hand row');
    for (const el of document.querySelectorAll('.drill-range > *, .drill-coach > *:not(:empty)')) below(el, el.className);
    for (const el of document.querySelectorAll<HTMLElement>('.drill-range, .drill-coach'))
      if (el.scrollHeight > el.clientHeight + 1) out.push(`${el.className} scrolls ${el.scrollHeight - el.clientHeight}px`);
    const fitBox = rect(document.querySelector('.table-fit')!);
    const felt = rect(document.querySelector('.poker-table')!);
    if (felt.top < fitBox.top - 1 || felt.bottom > fitBox.bottom + 1 || felt.left < fitBox.left - 1 || felt.right > fitBox.right + 1) out.push('the table spills out of its space');
    if (felt.top < stage.top - 1) out.push('the table pokes above the drill');
    // the dealer button: nearest the BTN seat, clear of everything else on the felt
    const puck = rect(document.querySelector('.table-dealer')!);
    const overlap = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const gap = (a: DOMRect, b: DOMRect) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
    const seats = [...document.querySelectorAll('.poker-table .seat')];
    const nearest = seats.reduce((a, b) => (gap(rect(a), puck) <= gap(rect(b), puck) ? a : b));
    if (nearest.getAttribute('data-position') !== 'BTN') out.push(`dealer button nearest ${nearest.getAttribute('data-position')}`);
    const others = [
      ...seats.filter((s) => s.getAttribute('data-position') !== 'BTN'),
      ...document.querySelectorAll('.poker-table .seat-bet, .poker-table .playing-card, .poker-table .pot-label'),
    ];
    for (const el of others) if (overlap(rect(el), puck)) out.push(`dealer button covers ${el.className} ${el.getAttribute('data-position') ?? ''}`);
    // the hand, the actions and the next-hand row are on screen
    for (const sel of ['[aria-label="Your hand"]', '[role="group"][aria-label="Your action"]', '.drill-next']) {
      const r = rect(document.querySelector(sel)!);
      if (r.top < 0 || r.bottom > innerHeight) out.push(`${sel} off screen`);
    }
    return out;
  });
}

test('E2E-08 UI-07 UI-08 the preflop drill fits one screen on laptop and desktop windows with every study setting, before and after answering; the dealt hand stands out in the grid', async ({ page }) => {
  test.setTimeout(500_000);
  const problems = watchProblems(page);
  const bad: string[] = [];
  let i = 0;
  for (const vp of DESKTOPS) {
    await page.setViewportSize(vp);
    for (const range of ['off', 'after', 'always']) {
      for (const info of [true, false]) {
        const seed = SEEDS[i % SEEDS.length]!;
        const goal = i % 3 === 1 ? '&type=rfi&goal=open' : '';
        i++;
        await freshStart(page, range, info);
        await gotoScreen(page, `#/drill?seed=${seed}${goal}`);
        const tag = `${vp.width}x${vp.height} range=${range} info=${info} seed=${seed}${goal ? ' goal' : ''}`;
        for (const p of await fitProblems(page)) bad.push(`${tag} deciding: ${p}`);
        await page.getByRole('group', { name: 'Your action' }).getByRole('button').last().click();
        await expect(page.getByTestId('drill-result')).toBeVisible();
        for (const p of await fitProblems(page)) bad.push(`${tag} answered: ${p}`);
        if (info) {
          await page.getByTestId('show-spot-info').click();
          await expect(page.getByTestId('spot-info')).toBeVisible();
          for (const p of await fitProblems(page)) bad.push(`${tag} spot info after answering: ${p}`);
          await page.getByTestId('show-result').click();
          await expect(page.getByTestId('drill-result')).toBeVisible();
        }
      }
    }
  }
  expect(bad).toEqual([]);
  // the dealt hand stands out in the study grid (UI-08)
  await page.setViewportSize({ width: 1280, height: 800 });
  await freshStart(page, 'always', true);
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
    const scrolled = await page.evaluate(() => scrollY);
    expect(scrolled, `${sel}: the page scrolled`).toBe(0);
    expect(b.y, sel).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, sel).toBeLessThanOrEqual(844);
  };
  await inFirstScreen('[aria-label="Your hand"]');
  await inFirstScreen('[role="group"][aria-label="Your action"]');
  await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
  await expect(page.getByTestId('next-hand')).toBeFocused();
  await inFirstScreen('[data-testid="next-hand"]'); // focusing it did not need to scroll the page
  // result, range and spot info follow in that order; the settings come last, and the Settings button brings them into view
  const top = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
  expect(await top('[data-testid="drill-result"]')).toBeLessThan(await top('[data-testid="spot-info"]'));
  expect(await top('.drill-settings')).toBeGreaterThan(await top('[data-testid="spot-info"]'));
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('filter-type')).toBeInViewport();
  await expect(page.getByTestId('filter-type')).toBeFocused();
});
