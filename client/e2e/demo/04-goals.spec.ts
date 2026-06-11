/**
 * Scene 4: GOALS (2:20–2:40)
 *
 * Script lines to capture:
 *   - Click Goals view. Show the DAG.
 *   - Point to the DAG — 6 goals, prerequisite edges visible.
 *   - Click on a few goals to see different details.
 *   - Click "Requirements Locked" — show its detail.
 *   - Click "Risk Analysis Complete" — show 75% complete.
 *   - Click "Verification Complete" — show BLOCKED.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe } from './helpers';

test('Scene 4 — Goals DAG', async ({ page }) => {
  await openProject(page);

  // ── Switch to Goals lens from the dock ──
  const goalsLensBtn = page.locator('[data-testid="lens-goals"]');
  if (await goalsLensBtn.isVisible()) {
    await goalsLensBtn.click();
    await page.waitForTimeout(1500);
  }

  await breathe(page, 2500); // Show the full DAG — 6 goals with prerequisite edges

  // ── Click the first goal — "Requirements Locked" ──
  const reqGoal = page.locator('.goal-node, [data-testid*="goal"]').filter({
    hasText: /Requirements Locked/,
  }).first();

  if (await reqGoal.isVisible()) {
    await reqGoal.click();
    await breathe(page, 3000); // Show requirements goal detail — bindings, description
  }

  // ── Close and click "510(k) Ready" ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const fivetenGoal = page.locator('.goal-node, [data-testid*="goal"]').filter({
    hasText: /510\(k\) Ready/,
  }).first();

  if (await fivetenGoal.isVisible()) {
    await fivetenGoal.click();
    await breathe(page, 2500); // Show 510(k) Ready detail — different bindings/status
  }

  // ── Close and click "Risk Analysis Complete" — show progress ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const riskGoal = page.locator('.goal-node, [data-testid*="goal"]').filter({
    hasText: /Risk Analysis/,
  }).first();

  if (await riskGoal.isVisible()) {
    await riskGoal.click();
    await breathe(page, 3000); // Show 75% complete — 2 risk items missing mitigation
  }

  // ── Close and click "Verification Complete" — show BLOCKED ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const verificationGoal = page.locator('.goal-node, [data-testid*="goal"]').filter({
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
