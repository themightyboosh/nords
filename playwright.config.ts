import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: ['demo-screenshots.ts', 'demo-videos.ts'],
  timeout: 180000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    colorScheme: 'dark',
    viewport: null,           // no constraint — fill the screen for kiosk
    launchOptions: {
      slowMo: 80,
      args: [
        '--start-maximized',
        '--disable-infobars',
        '--hide-scrollbars',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chromium' },
    },
  ],
  outputDir: './screenshots/test-results',
});
