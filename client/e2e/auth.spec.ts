import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('unauthenticated users are redirected from / to /login', async ({ page }) => {
    // Navigate to root (protected by default)
    await page.goto('/');
    
    // Should be redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should see the login form
    await expect(page.locator('h2')).toContainText('Welcome back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('can switch between login and signup screens', async ({ page }) => {
    await page.goto('/login');
    
    // Click "Create one" link
    await page.click('text=Create one');
    
    // Should be on signup page
    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.locator('h2')).toContainText('Create your account');
    
    // Click "Sign in" link
    await page.click('text=Sign in');
    
    // Should be back on login page
    await expect(page).toHaveURL(/.*\/login/);
  });
  
  test('can navigate to forgot password screen', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('text=Forgot password?');
    
    await expect(page).toHaveURL(/.*\/forgot-password/);
    await expect(page.locator('h2')).toContainText('Reset Password');
  });
});
