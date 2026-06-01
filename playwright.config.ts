import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: 'demo-screenshots.ts',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'off', // We handle screenshots manually
    video: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: './screenshots/test-results',
});
