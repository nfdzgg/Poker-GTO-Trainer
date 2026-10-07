import type { Page } from '@playwright/test';

export const SCREENS = [
  { name: 'home', hash: '#/' },
  { name: 'learn', hash: '#/learn' },
  { name: 'drill', hash: '#/drill?seed=2024' },
  { name: 'ranges', hash: '#/ranges?spot=vsopen-BTN-vs-CO' },
  { name: 'stats', hash: '#/stats' },
  { name: 'analyzer', hash: '#/analyzer' },
  { name: 'about', hash: '#/about' },
] as const;

export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

/** Collect console errors, page errors, failed requests and any request leaving the local origin. */
export function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol !== 'data:' && u.protocol !== 'blob:')
      problems.push(`external request: ${r.url()}`);
  });
  return problems;
}

export async function gotoScreen(page: Page, hash: string): Promise<void> {
  await page.goto(`./${hash}`);
  await page.locator('main h1').first().waitFor();
  await page.waitForTimeout(600); // let entrance animations settle
}
