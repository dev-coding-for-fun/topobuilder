import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalTimeout: 45_000,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8091',
    launchOptions: {
      args: ['--disable-gpu', '--disable-dev-shm-usage'],
    },
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx expo export --platform web && node scripts/serve-web.js dist 8091',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:8091',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
