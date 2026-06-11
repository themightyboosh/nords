/**
 * Scene 2: BOARD VIEW (1:30–1:55)
 *
 * Script lines to capture:
 *   - Click Board View — Design Control Phase columns.
 *   - Scroll down initially to show how many cards/swimlanes are there.
 *   - Show closing (collapsing) a swimlane.
 *   - Drag a Test Case card from "Protocol Ready" to "Tested".
 *   - Switch dimension to "Blocks".
 *   - Switch dimension to "Assigned To" — show Marcus overloaded.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe } from './helpers';

test('Scene 2 — Board View', async ({ page }) => {
  await openProject(page);

  // ── Switch to Board View ──
  await page.locator('[data-testid="lens-board"]').click();
  await page.waitForTimeout(2000);
  await breathe(page, 2000); // Show the swimlane layout — multiple categories

  // ── Scroll DOWN to show how many cards/swimlanes exist ──
  const boardContainer = page.locator('.nords-matrix__lanes').first();
  if (await boardContainer.isVisible()) {
    // Slow scroll down to reveal all the swimlanes and their card counts
    for (let i = 0; i < 6; i++) {
      await boardContainer.evaluate(el => el.scrollTop += 250);
      await page.waitForTimeout(500);
    }
    await breathe(page, 2000); // Pause at the bottom so viewer absorbs the density

    // Scroll back to top
    await boardContainer.evaluate(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
    await breathe(page, 1000);
  }

  // ── Collapse a swimlane — click the lane header to close it ──
  // Find the second lane header (keep the first one open for context)
  const laneHeaders = page.locator('.nords-matrix__lane-header');
  const laneCount = await laneHeaders.count();
  if (laneCount >= 2) {
    // Collapse the second lane
    await laneHeaders.nth(1).click();
    await breathe(page, 1500); // Show the collapsed state

    // Collapse one more to show the pattern
    if (laneCount >= 3) {
      await laneHeaders.nth(2).click();
      await breathe(page, 1500);
    }

    // Re-expand one to show it's toggleable
    await laneHeaders.nth(1).click();
    await breathe(page, 1500);
  }

  // ── Scroll across the first lane to show all columns ──
  if (await boardContainer.isVisible()) {
    for (let i = 0; i < 5; i++) {
      await boardContainer.evaluate(el => el.scrollLeft += 200);
      await page.waitForTimeout(400);
    }
    // Scroll back
    await boardContainer.evaluate(el => el.scrollLeft = 0);
    await breathe(page, 1000);
  }

  // ── Drag a Test Case card between columns ──
  const testCaseCards = page.locator('.nords-matrix__card-wrapper').filter({
    hasText: 'TC-',
  });
  const firstTC = testCaseCards.first();
  if (await firstTC.isVisible()) {
    const tcBox = await firstTC.boundingBox();
    if (tcBox) {
      await page.mouse.move(tcBox.x + tcBox.width / 2, tcBox.y + tcBox.height / 2);
      await page.mouse.down();
      // Drag rightward by ~300px (one column)
      await page.mouse.move(tcBox.x + tcBox.width / 2 + 300, tcBox.y + tcBox.height / 2, { steps: 30 });
      await page.mouse.up();
      await breathe(page, 2000);
    }
  }

  // ── Switch dimension to "Blocks" ──
  const dimensionDropdown = page.locator('[data-testid="lane-selector"], .matrix-view__dimension-select, select').first();
  if (await dimensionDropdown.isVisible()) {
    await dimensionDropdown.click();
    await page.waitForTimeout(400);
    const blocksOption = page.locator('option, li, [role="option"]').filter({ hasText: 'Blocks' }).first();
    await blocksOption.click();
    await breathe(page, 2500);
  }

  // ── Switch dimension to "Assigned To" ──
  if (await dimensionDropdown.isVisible()) {
    await dimensionDropdown.click();
    await page.waitForTimeout(400);
    const assignedOption = page.locator('option, li, [role="option"]').filter({ hasText: 'Assigned To' }).first();
    await assignedOption.click();
    await breathe(page, 3000); // Show Marcus overloaded with 7 items
  }

  await breathe(page, 2000);
});
