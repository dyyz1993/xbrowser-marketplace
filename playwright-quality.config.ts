import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'quality.spec.ts',
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: 0,
  workers: 1,
  globalSetup: undefined as any,
  globalTeardown: undefined as any,
  reporter: [['list']],
  outputDir: 'playwright-artifacts',
  use: {
    actionTimeout: 30000,
    navigationTimeout: 60000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--proxy-server=http://127.0.0.1:7890'],
        },
      },
    },
  ],
})
