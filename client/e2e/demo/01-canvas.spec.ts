/**
 * Scene 1: THE CANVAS (1:05–1:30)
 *
 * Script lines to capture:
 *   - Open Pulse Sense project. Full canvas visible. ~60 cards.
 *   - Zoom in slowly to a card. Show the property sheet.
 *   - Select a nord and drag it — show spectrum values change on the line.
 *   - Distance value changed. Stage label updated.
 *   - Drag a second card to show multiple connection lines moving.
 *   - Switch category in the dock to show different relationship lines.
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

    // ── Dramatic zoom in / out — show the graph at multiple scales ──
    // Zoom in deep to show card detail
    await smoothZoom(page, cx, cy, -2000, 15);
    await breathe(page, 2000);
    // Zoom back out past original to show full breadth
    await smoothZoom(page, cx, cy, 2400, 15);
    await breathe(page, 1500);
    // Re-center
    await fitToView(page);
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
    await breathe(page, 2000);

    // ── Nord Drawer Deep Dive: scroll through properties, switch tabs ──
    const drawerContent = page.locator('.nords-drawer-content, .nords-properties-list').first();
    if (await drawerContent.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Scroll down through all properties smoothly
      for (let i = 0; i < 4; i++) {
        await drawerContent.evaluate(el => el.scrollTo({ top: el.scrollTop + 120, behavior: 'smooth' }));
        await page.waitForTimeout(600);
      }
      await breathe(page, 1500);

      // Switch to Categories tab
      const categoriesTab = page.locator('.nords-drawer-tab').filter({ hasText: 'Categories' });
      if (await categoriesTab.isVisible().catch(() => false)) {
        await categoriesTab.click();
        await breathe(page, 2000); // Show connection categories grouped by type
      }

      // Switch to Goals tab
      const goalsTab = page.locator('.nords-drawer-tab').filter({ hasText: 'Goals' });
      if (await goalsTab.isVisible().catch(() => false)) {
        await goalsTab.click();
        await breathe(page, 1500); // Show linked goals
      }

      // Back to Properties
      const propsTab = page.locator('.nords-drawer-tab').filter({ hasText: 'Properties' });
      if (await propsTab.isVisible().catch(() => false)) {
        await propsTab.click();
        await page.waitForTimeout(500);
      }
    }

    // Close drawer
    await page.keyboard.press('Escape');
    await breathe(page, 800);

    // ── Create a New Nord via right-click radial menu ──
    if (box) {
      // Right-click on empty canvas space
      await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.4, { button: 'right' });
      await page.waitForTimeout(800);

      const radialPalette = page.locator('.nords-radial-palette');
      if (await radialPalette.isVisible({ timeout: 2000 }).catch(() => false)) {
        await breathe(page, 1500); // Show the radial type picker

        // Click the first type in the list to create a nord
        const firstType = page.locator('.nords-radial-list__item').first();
        if (await firstType.isVisible().catch(() => false)) {
          await firstType.click();
          await breathe(page, 2000); // New card appears on canvas
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }

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

    // ── Drag a second card to show multiple connection lines stretching ──
    await page.keyboard.press('Escape');
    await breathe(page, 500);

    // Pick another card (offset from the first) and drag it dramatically
    const secondCard = allCards.nth(Math.min(18, cardCount - 1));
    const secondTestId = await secondCard.getAttribute('data-testid');
    if (secondTestId && await secondCard.isVisible()) {
      // Large diagonal drag — shows connection lines fanning out
      await dragCard(page, `[data-testid="${secondTestId}"]`, 180, -120);
      await breathe(page, 1500);

      // Drag it back the other way — shows real-time line recalculation
      await dragCard(page, `[data-testid="${secondTestId}"]`, -100, 80);
      await breathe(page, 1500);
    }

    // ── Rapid Category Cycling — switch through ALL categories for visual wow ──
    const categoryBtn = page.locator('.nords-dock__item').filter({ hasText: 'Category' }).first();
    if (await categoryBtn.isVisible().catch(() => false)) {
      await categoryBtn.click();
      await breathe(page, 800);

      const flyoutRows = page.locator('.nords-flyout__row--selectable');
      const flyoutCount = await flyoutRows.count();

      // Cycle through ALL categories — each one snaps the graph to a new spatial layout
      for (let i = 0; i < flyoutCount; i++) {
        if (i > 0) {
          // Reopen flyout (it closes after each selection)
          await categoryBtn.click();
          await page.waitForTimeout(400);
        }
        await flyoutRows.nth(i).click({ force: true });
        // Fast for the first few, slower for the last to let viewer absorb
        await breathe(page, i < flyoutCount - 2 ? 1200 : 2000);
      }
    }
  }

  // ── Final pause on the updated canvas state ──
  await page.keyboard.press('Escape');
  await fitToView(page);
  await breathe(page, 2000);
});
