/**
 * Scene 3: PERSONA LENS (1:55–2:20)
 *
 * Script lines to capture:
 *   - Click Persona Lens
 *   - Click Dr. Priya Sharma → risks/regulatory snap to center
 *   - Click Marcus Cole → architecture/subsystems center
 *   - Quick click Sarah Kim → clinical protocols center
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView } from './helpers';

test('Scene 3 — Persona Lens', async ({ page }) => {
  await openProject(page);
  await fitToView(page);
  await breathe(page, 1500);

  // ── Open Personas flyout from the dock ──
  // The dock item for Personas
  const personaDockItem = page.locator('[data-testid="dock-personas"], .nords-dock__item').filter({ hasText: /persona/i });
  if (await personaDockItem.isVisible()) {
    await personaDockItem.click();
    await page.waitForTimeout(800);
  }

  // ── Select Dr. Priya Sharma — Regulatory ──
  const priya = page.locator('.nords-flyout__row--selectable, [data-testid*="persona"]').filter({
    hasText: /Priya Sharma|Regulatory/,
  }).first();

  if (await priya.isVisible()) {
    await priya.click();
    await page.waitForTimeout(1500); // Wait for lens layout animation
    await breathe(page, 3000); // Show the heatmap — risks center, engineering fades
  }

  // ── Select Marcus Cole — Engineering ──
  const marcus = page.locator('.nords-flyout__row--selectable, [data-testid*="persona"]').filter({
    hasText: /Marcus Cole|Engineer/,
  }).first();

  if (await marcus.isVisible()) {
    await marcus.click();
    await page.waitForTimeout(1500);
    await breathe(page, 2500); // Architecture, interfaces, subsystems center
  }

  // ── Quick flash: Sarah Kim — Clinical ──
  const sarah = page.locator('.nords-flyout__row--selectable, [data-testid*="persona"]').filter({
    hasText: /Sarah Kim|Clinical/,
  }).first();

  if (await sarah.isVisible()) {
    await sarah.click();
    await page.waitForTimeout(1500);
    await breathe(page, 2000); // Clinical protocols, patient data center
  }

  // ── Clear persona lens to return to neutral ──
  // Click the active persona again to deselect, or find the clear button
  const clearBtn = page.locator('[data-testid="clear-persona"], .nords-flyout__clear').first();
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(1000);
  }

  await breathe(page, 1500);
});
