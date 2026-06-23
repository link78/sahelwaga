import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for MedSupply E2E smoke tests.
 *
 * Assumes the API (port 4000) and web (port 3000) are already running —
 * either started locally via `pnpm dev`, or by CI before invoking
 * `pnpm --filter @sahelwaga/e2e test`.
 */
const webBaseURL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const apiBaseURL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'playwright-report/results.xml' }]]
    : [['list']],
  use: {
    baseURL: webBaseURL,
    extraHTTPHeaders: { 'x-e2e': '1' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  metadata: { apiBaseURL },
});
