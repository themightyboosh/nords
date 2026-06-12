/**
 * Scene 7: COLLECTION VARIABLES
 *
 * Script lines to capture:
 *   - Open Collection Variables panel from the Behavior header group.
 *   - Show the variable groups — each group is a category of data the AI collects.
 *   - Click into variable groups to expand and show individual variables.
 *   - Show required vs optional, types, descriptions.
 */

import { test } from '@playwright/test';
import { openProject, breathe } from './helpers';

test('Scene 7 — Collection Variables', async ({ page }) => {
  await openProject(page);

  // ── Open Collection Variables from the "Direct" header group ──
  const behaviorGroupBtn = page.locator('[data-testid="header-group-behavior"]');
  if (await behaviorGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await behaviorGroupBtn.click();
    await page.waitForTimeout(500);
  }

  const variablesBtn = page.locator('[data-testid="header-variables"]');
  if (await variablesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await variablesBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for the variables panel (rendered inside FloatingPanel)
  const variablesPanel = page.locator('.manage-variables').first();
  if (await variablesPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
    await breathe(page, 2000); // Show the panel opening

    // Wait for collection groups to load from API
    await page.locator('.manage-variables__list-item').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
      console.log('No collection groups loaded');
    });
    await breathe(page, 1500); // Show the full variable groups overview

    // Click through variable groups in the sidebar to show different collections
    const groupItems = page.locator('.manage-variables__list-item');
    const groupCount = await groupItems.count();
    console.log(`Collection groups found: ${groupCount}`);

    for (let i = 0; i < Math.min(groupCount, 6); i++) {
      await groupItems.nth(i).click();
      await page.waitForTimeout(600);
      await breathe(page, 2000);

      // Scroll the editor pane to show variable details (types, descriptions, required flags)
      const editor = page.locator('.manage-variables__editor').first();
      if (await editor.isVisible()) {
        for (let j = 0; j < 2; j++) {
          await editor.evaluate(el => el.scrollTo({ top: el.scrollTop + 200, behavior: 'smooth' }));
          await page.waitForTimeout(500);
        }
        await breathe(page, 1000);
        // Scroll back to top for next group
        await editor.evaluate(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(400);
      }
    }

    // If no groups found, try clicking variable rows directly
    if (groupCount === 0) {
      const varRows = page.locator('[class*="variable-row"], [class*="property-row"]');
      const varCount = await varRows.count();
      for (let i = 0; i < Math.min(varCount, 3); i++) {
        await varRows.nth(i).click();
        await breathe(page, 1500);
      }
    }

    // Final scroll through the panel
    const mainPanel = variablesPanel.first();
    for (let i = 0; i < 3; i++) {
      await mainPanel.evaluate(el => el.scrollTo({ top: el.scrollTop + 200, behavior: 'smooth' }));
      await page.waitForTimeout(400);
    }
    await breathe(page, 2000);
  } else {
    console.log('Variables panel not visible');
    await breathe(page, 1000);
  }

  // Close
  await page.keyboard.press('Escape');
  await breathe(page, 1000);
});
