import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/demo',
  fullyParallel: false,       // run scenes sequentially
  retries: 0,                 // we're recording, not testing
  workers: 1,                 // single thread for deterministic output
  reporter: [['list']],
  timeout: 180_000,           // generous — AI responses take time

  use: {
    baseURL: 'http://localhost:5174',
    viewport: null,             // no constraint — fill the screen
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    colorScheme: 'dark',
    headless: false,            // OBS needs to see the window
    launchOptions: {
      slowMo: 120,              // human-paced interactions
      args: [
        '--start-maximized',    // fill the screen
        '--disable-infobars',   // hide "controlled by automation" bar
        '--kiosk',              // true fullscreen — no URL bar, no chrome
      ],
    },
    // No screenshots / traces — we only want video
    screenshot: 'off',
    trace: 'off',
  },

  projects: [
    {
      name: 'demo-recording',
      use: {
        channel: 'chromium',
      },
    },
  ],

  // Start a dedicated Vite server with auth bypassed on port 5174
  webServer: {
    command: 'VITE_SKIP_AUTH=true npx vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      VITE_SKIP_AUTH: 'true',
    },
  },
});
