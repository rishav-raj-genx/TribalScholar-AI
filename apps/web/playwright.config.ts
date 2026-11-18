import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @tribalscholar/api start',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @tribalscholar/web start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
