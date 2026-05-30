/**
 * Scene 6: THREE MODES + CLOSE (3:25–3:50)
 *
 * Script lines to capture:
 *   - Show Project Settings → Mode selector.
 *   - Flash each mode card (Explore, Collect, Guided).
 *   - Pull back to full canvas. Slow zoom out.
 *   - Final establishing shot.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView } from './helpers';

test('Scene 6 — Three Modes + Close', async ({ page }) => {
  await openProject(page);

  // ── Open Project Settings ──
  const settingsButton = page.locator('[data-testid="dock-settings"], .nords-dock__item').filter({ hasText: /setting/i }).first();
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
    await page.waitForTimeout(1000);
  }

  await breathe(page, 2000);

  // ── Find the mode selector area ──
  const modeSection = page.locator('.settings-mode, .project-mode, [data-testid="mode-selector"]').first();
  if (await modeSection.isVisible()) {
    // Highlight each mode
    const exploreMode = page.locator('[data-testid="mode-explore"], .mode-card').filter({ hasText: /explore/i }).first();
    if (await exploreMode.isVisible()) {
      await exploreMode.hover();
      await breathe(page, 1500);
    }

    const collectMode = page.locator('[data-testid="mode-collect"], .mode-card').filter({ hasText: /collect/i }).first();
    if (await collectMode.isVisible()) {
      await collectMode.hover();
      await breathe(page, 1500);
    }

    const guidedMode = page.locator('[data-testid="mode-guided"], .mode-card').filter({ hasText: /guided/i }).first();
    if (await guidedMode.isVisible()) {
      await guidedMode.hover();
      await breathe(page, 1500);
    }

    // Click Guided (the active one for our demo project)
    if (await guidedMode.isVisible()) {
      await guidedMode.click();
      await breathe(page, 1000);
    }
  }

  // ── Close settings ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── THE CLOSE: Pull back to full canvas ──
  await fitToView(page);
  await breathe(page, 2000);

  // Slow zoom out for the establishing shot
  const pane = page.locator('.react-flow__pane');
  const box = await pane.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    // Zoom out slowly
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(300);
    }
  }

  await breathe(page, 4000); // Final establishing shot — let it breathe

  // Fade to black? We'll do this in Premiere.
});
