/**
 * Scene 1: THE CANVAS (1:05–1:30)
 *
 * Script lines to capture:
 *   - Open Pulse Sense project. Full canvas visible. ~60 cards.
 *   - Zoom in slowly to a Risk card. Show the property sheet.
 *   - "battery thermal runaway" — severity 4, probability 1, mitigation.
 *   - Drag the Risk card closer to the Requirement.
 *   - Distance value changed. Stage label updated.
 */

import { test } from '@playwright/test';
import { openProject, breathe, fitToView, smoothZoom, dragCard } from './helpers';

test('Scene 1 — Canvas + Data Model', async ({ page }) => {
  // ── Open project — wide establishing shot ──
  await openProject(page);
  await fitToView(page);
  await breathe(page, 3000); // Let the viewer see the full 64-card graph

  // ── Slow pan across canvas to show density ──
  const pane = page.locator('.react-flow__pane');
  const box = await pane.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Gentle rightward pan
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(cx - 200, cy - 50, { steps: 40 });
    await page.mouse.up({ button: 'middle' });
    await breathe(page, 1500);
  }

  // ── Zoom into a Risk card (HAZ-002: battery thermal runaway) ──
  // Find any Risk card on the canvas
  const riskCards = page.locator('[data-testid^="nord-node-"]').filter({
    hasText: 'battery thermal runaway',
  });
  const riskCard = riskCards.first();
  const riskBox = await riskCard.boundingBox();

  if (riskBox) {
    // Scroll to zoom in on the risk card area
    await page.mouse.move(riskBox.x + riskBox.width / 2, riskBox.y + riskBox.height / 2);
    await smoothZoom(page, riskBox.x + riskBox.width / 2, riskBox.y + riskBox.height / 2, -600, 8);
    await breathe(page, 1500);
  }

  // ── Click the Risk card to open the detail drawer ──
  await riskCard.click();
  await breathe(page, 3000); // Show the property sheet: severity 4, probability 1, mitigation

  // ── Close drawer, find a connection to the requirement ──
  await page.keyboard.press('Escape');
  await breathe(page, 500);

  // ── Drag the Risk card closer to its connected Requirement ──
  // This changes the distance_x value — the key demo moment
  const riskTestId = await riskCard.getAttribute('data-testid');
  if (riskTestId) {
    await dragCard(page, `[data-testid="${riskTestId}"]`, -120, 0);
    await breathe(page, 2500); // Let the viewer see the distance value change

    // The stage label should have updated from Controls → Monitoring
    // Click the card again to show the updated property sheet
    await riskCard.click();
    await breathe(page, 2000);
  }

  // ── Final pause on the updated canvas state ──
  await page.keyboard.press('Escape');
  await fitToView(page);
  await breathe(page, 2000);
});
