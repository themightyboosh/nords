/**
 * Scene 1: THE CANVAS (1:05–1:30)
 *
 * Script lines to capture:
 *   - Open Pulse Sense project. Full canvas visible. ~60 cards.
 *   - Zoom in slowly to a card. Show the property sheet.
 *   - Select a nord and drag it — show spectrum values change on the line.
 *   - Distance value changed. Stage label updated.
 */

import { test } from '@playwright/test';
import { openProject, breathe, fitToView, smoothZoom, dragCard } from './helpers';

test('Scene 1 — Canvas + Data Model', async ({ page }) => {
  // ── Open project — wide establishing shot ──
  await openProject(page);
  await fitToView(page);
  await breathe(page, 3000); // Let the viewer see the full 61-card graph

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

  // ── Zoom into any visible nord card and click it ──
  const allCards = page.locator('[data-testid^="nord-node-"]');
  const cardCount = await allCards.count();

  if (cardCount > 5) {
    // Pick a card near the middle of the list for a good visual position
    const targetCard = allCards.nth(Math.min(14, cardCount - 1));
    const cardBox = await targetCard.boundingBox();

    if (cardBox) {
      // Zoom in on that card
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await smoothZoom(page, cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2, -600, 8);
      await breathe(page, 1500);
    }

    // Click to select — show the property sheet
    await targetCard.click();
    await breathe(page, 3000); // Show the property sheet with all metadata

    // Close drawer
    await page.keyboard.press('Escape');
    await breathe(page, 800);

    // ── Drag the card to show spectrum values changing on the connection line ──
    const targetTestId = await targetCard.getAttribute('data-testid');
    if (targetTestId) {
      // First drag: move left slowly — viewer sees the spectrum line updating
      await dragCard(page, `[data-testid="${targetTestId}"]`, -150, 0);
      await breathe(page, 2000); // Pause so the viewer sees the stage label change

      // Second drag: move it further to show another spectrum threshold
      await dragCard(page, `[data-testid="${targetTestId}"]`, -100, 30);
      await breathe(page, 2000);

      // Click the card again to show the updated property sheet with new distance
      await targetCard.click();
      await breathe(page, 2500);
    }
  }

  // ── Final pause on the updated canvas state ──
  await page.keyboard.press('Escape');
  await fitToView(page);
  await breathe(page, 2000);
});
