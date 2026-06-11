/**
 * Scene 3: PERSONA LENS (1:55–2:20)
 *
 * NOTE: The sidebar flyout rows can be overlapped by canvas nodes
 * (z-index issue), so we use { force: true } on all flyout clicks.
 *
 * Persona flyout rows are at indices 23-27:
 *   23: Dr. Maya Rodriguez, 24: Marcus Cole, 25: Sarah Kim,
 *   26: James Okonkwo, 27: Elena Vasquez
 * Nord Visibility rows are 8-17.
 */

import { test } from '@playwright/test';
import { openProject, breathe, fitToView, smoothZoom } from './helpers';

test('Scene 3 — Persona Lens', async ({ page }) => {
  await openProject(page);
  await fitToView(page);
  await breathe(page, 1500);

  // ── Switch to Persona Lens ──
  await page.locator('[data-testid="lens-persona"]').click();
  await page.waitForTimeout(2000);
  await breathe(page, 2000);

  // ── Zoom in for better visibility ──
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  if (paneBox) {
    const cx = paneBox.x + paneBox.width / 2;
    const cy = paneBox.y + paneBox.height / 2;
    await smoothZoom(page, cx, cy, -1200, 12);
    await breathe(page, 1500);
  }

  // ── Cycle through personas ──
  // Canvas nodes overlap sidebar rows, so force: true is required
  const allRows = page.locator('.nords-flyout__row--selectable');

  // Marcus Cole (row 24)
  await allRows.nth(24).click({ force: true });
  await page.waitForTimeout(1500);
  await breathe(page, 2500);

  // Sarah Kim (row 25)
  await allRows.nth(25).click({ force: true });
  await page.waitForTimeout(1500);
  await breathe(page, 2000);

  // James Okonkwo (row 26)
  await allRows.nth(26).click({ force: true });
  await page.waitForTimeout(1500);
  await breathe(page, 2000);

  // Elena Vasquez (row 27)
  await allRows.nth(27).click({ force: true });
  await page.waitForTimeout(1500);
  await breathe(page, 2000);

  // Back to Dr. Maya Rodriguez (row 23)
  await allRows.nth(23).click({ force: true });
  await page.waitForTimeout(1500);
  await breathe(page, 2000);

  // ── Nord Visibility cycling (show/dim/hide) ──
  await allRows.nth(8).click({ force: true });
  await breathe(page, 1000);
  await allRows.nth(8).click({ force: true });
  await breathe(page, 1000);
  await allRows.nth(8).click({ force: true });
  await breathe(page, 800);

  await breathe(page, 1500);
});
