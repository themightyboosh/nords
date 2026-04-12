import { test, expect } from '@playwright/test';

test('app loads and displays title', async ({ page }) => {
  await page.goto('/');
  // Basic smoke test to ensure Vite compiles and serves the page without crashing
  await expect(page).toHaveTitle(/Vite \+ React/);
});
