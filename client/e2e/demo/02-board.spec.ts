/**
 * Scene 2: BOARD VIEW (1:30–1:55)
 *
 * Script lines to capture:
 *   - Click Board View — Design Control Phase columns.
 *   - Drag a Test Case card from "Protocol Ready" to "Tested".
 *   - Switch dimension to "Blocks".
 *   - Switch dimension to "Assigned To" — show Marcus overloaded.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, clickDockButton } from './helpers';

test('Scene 2 — Board View', async ({ page }) => {
  await openProject(page);

  // ── Switch to Board View ──
  // Look for the board toggle in the view bar
  await page.locator('[data-testid="view-toggle-board"]').click();
  await page.waitForTimeout(2000);
  await breathe(page, 2500); // Show Design Control Phase columns: User Need → ... → Transfer

  // ── Scroll slowly across the board to show all columns ──
  const boardContainer = page.locator('.matrix-view, .board-view').first();
  if (await boardContainer.isVisible()) {
    // Smooth horizontal scroll to show all stages
    for (let i = 0; i < 5; i++) {
      await boardContainer.evaluate(el => el.scrollLeft += 200);
      await page.waitForTimeout(400);
    }
    // Scroll back
    await boardContainer.evaluate(el => el.scrollLeft = 0);
    await breathe(page, 1000);
  }

  // ── Drag a Test Case card between columns ──
  // Find a Test Case in a lower stage and drag to the next column
  const testCaseCards = page.locator('.matrix-view__card, .board-card').filter({
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
    // Select "Blocks"
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
