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
    viewport: { width: 1920, height: 1080 },
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    colorScheme: 'dark',
    launchOptions: {
      slowMo: 120,            // human-paced interactions
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
        deviceScaleFactor: 2,   // retina quality
      },
    },
  ],

  // Start a dedicated Vite server with auth bypassed on port 5174
  webServer: {
    command: 'VITE_SKIP_AUTH=true npx vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      VITE_SKIP_AUTH: 'true',
    },
  },
});
