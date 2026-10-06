import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;
export const BASE_URL = `http://127.0.0.1:${PORT}/poker-gto-trainer/`;

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'artifacts/verify/e2e.json' }]],
  use: {
    baseURL: BASE_URL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    url: BASE_URL,
    reuseExistingServer: false,
    env: { PORT: String(PORT) },
    timeout: 30_000,
  },
});
