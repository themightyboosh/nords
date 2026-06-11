/**
 * Scene 6: THREE MODES + SHARE + CLOSE (3:25–3:50)
 *
 * Script lines to capture:
 *   - Show Share panel — a dummy link is already there with details expanded.
 *   - Show Project Settings → Mode selector.
 *   - Flash each mode card (Explore, Collect, Guided).
 *   - Pull back to full canvas. Slow zoom out.
 *   - Final establishing shot.
 *
 * PRE-REQUISITE: Ensure a share link has been created for this project
 * before running, so the "Share Links" section shows populated data.
 * The seed script should create one, or create via the API:
 *   POST /api/projects/{id}/share-links { label: "Beta Testers" }
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView } from './helpers';
import { DEMO_PROJECT_ID } from './helpers';

test('Scene 6 — Share + Three Modes + Close', async ({ page }) => {
  await openProject(page);

  // ── Ensure a share link exists for the demo ──
  // Create one via API if needed — this guarantees the panel isn't empty
  await page.evaluate(async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/share-links`);
      const links = await res.json();
      if (!links || links.length === 0) {
        // Create a dummy share link
        await fetch(`/api/projects/${projectId}/share-links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'Beta Testers — Batch 1',
            welcome_message_override: "Welcome to the Pulse Sense Clinical Trial Portal. I'll help guide you through the regulatory requirements.",
            model: 'gemini-2.5-flash',
            expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          }),
        });
      }
    } catch (e) {
      console.log('Share link creation skipped:', e);
    }
  }, DEMO_PROJECT_ID);

  // ── Open Share Panel ──
  // Click "Publish" group in the header
  const publishGroupBtn = page.locator('[data-testid="header-group-publish"]');
  if (await publishGroupBtn.isVisible()) {
    await publishGroupBtn.click();
    await page.waitForTimeout(500);
  }

  // Click "Share" sub-item
  const shareBtn = page.locator('[data-testid="header-share"]');
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for the share panel to appear
  const sharePanel = page.locator('.share-panel');
  if (await sharePanel.isVisible({ timeout: 5000 }).catch(() => false)) {
    await breathe(page, 2000); // Show the share panel with links

    // Expand the first share link to show its details (URL, model, persona, expiry)
    const expandBtn = page.locator('.nords-form__share-link-card .nords-form__icon-btn').filter({ hasText: '' }).nth(2); // The chevron button
    const detailToggle = page.locator('.nords-form__share-link-card button[title="Details"]').first();
    if (await detailToggle.isVisible()) {
      await detailToggle.click();
      await breathe(page, 3000); // Show the expanded details — URL, model, welcome override, expiry
    }

    // Close share panel
    const closeShareBtn = page.locator('.share-panel .nords-close-btn, .share-panel button[aria-label="Close"]').first();
    if (await closeShareBtn.isVisible()) {
      await closeShareBtn.click();
      await page.waitForTimeout(500);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // ── Open Project Settings ──
  if (await publishGroupBtn.isVisible()) {
    await publishGroupBtn.click();
    await page.waitForTimeout(500);
  }
  const settingsBtn = page.locator('[data-testid="header-settings"]');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
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
  // Switch back to graph view
  const graphLensBtn = page.locator('[data-testid="lens-canvas"]');
  if (await graphLensBtn.isVisible()) {
    await graphLensBtn.click();
    await page.waitForTimeout(1000);
  }

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
});
