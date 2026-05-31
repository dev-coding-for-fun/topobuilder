import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalTimeout: 180_000,
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
    command: 'node scripts/playwright-web-server.js',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:8091',
  },
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
