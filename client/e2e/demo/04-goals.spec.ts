/**
 * Scene 4: GOALS (2:20–2:40)
 *
 * Script lines to capture:
 *   - Click Goals view. Show the DAG.
 *   - Point to the DAG — 6 goals, prerequisite edges visible.
 *   - Click "Risk Analysis Complete" — show 75% complete.
 *   - Click "Verification Complete" — show BLOCKED.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe } from './helpers';

test('Scene 4 — Goals DAG', async ({ page }) => {
  await openProject(page);

  // ── Open Goals panel from the dock ──
  const goalsDockItem = page.locator('[data-testid="dock-goals"], .nords-dock__item').filter({ hasText: /goal/i });
  if (await goalsDockItem.isVisible()) {
    await goalsDockItem.click();
    await page.waitForTimeout(1000);
  }

  await breathe(page, 2500); // Show the full DAG — 6 goals with prerequisite edges

  // ── Click "Risk Analysis Complete" to show progress ──
  const riskGoal = page.locator('[data-testid*="goal"], .goal-node, .goals-card').filter({
    hasText: /Risk Analysis/,
  }).first();

  if (await riskGoal.isVisible()) {
    await riskGoal.click();
    await breathe(page, 3000); // Show 75% complete — 2 risk items missing mitigation
  }

  // ── Close the detail drawer ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── Click "Verification Complete" to show BLOCKED status ──
  const verificationGoal = page.locator('[data-testid*="goal"], .goal-node, .goals-card').filter({
    hasText: /Verification/,
  }).first();

  if (await verificationGoal.isVisible()) {
    await verificationGoal.click();
    await breathe(page, 3000); // Show BLOCKED — prerequisites not finished
  }

  // ── Close and show full DAG one more time ──
  await page.keyboard.press('Escape');
  await breathe(page, 2000);
});
