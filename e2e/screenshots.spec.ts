import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { gotoScreen, SCREENS, VIEWPORTS } from './helpers';

const DIR = path.resolve('artifacts/screenshots');

test('E2E-05 screenshots of every screen at both viewports', async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  const files: string[] = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const s of SCREENS) {
      await gotoScreen(page, s.hash);
      if (s.name === 'drill') {
        await page.getByRole('group', { name: 'Your action' }).getByRole('button').first().click();
        await page.waitForTimeout(700);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const file = path.join(DIR, `${s.name}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      files.push(file);
    }
  }
  console.log('Screenshots written:');
  for (const f of files) {
    expect(existsSync(f)).toBe(true);
    expect(statSync(f).size).toBeGreaterThan(5000);
    console.log(`  ${path.relative(process.cwd(), f)} (${statSync(f).size} bytes)`);
  }
  expect(files).toHaveLength(SCREENS.length * VIEWPORTS.length);
});
