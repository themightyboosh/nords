/**
 * Scene 3: PERSONA LENS (1:55–2:20)
 *
 * Script lines to capture:
 *   - Switch to Persona Lens — radial heatmap layout.
 *   - Open the Persona dock flyout and switch between personas.
 *   - Open Manage Personas panel — show the editor.
 *   - Drag the relevance bias sliders to different positions.
 *   - Close panel, show the canvas reweighted by the new biases.
 *   - Cycle through Nord Visibility (show/dim/hide).
 *
 * NOTE: The sidebar flyout rows can be overlapped by canvas nodes
 * (z-index issue), so we use { force: true } on all flyout clicks.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView, smoothZoom } from './helpers';

test('Scene 3 — Persona Lens', async ({ page }) => {
  await openProject(page);
  await fitToView(page);
  await breathe(page, 1500);

  // ── Switch to Persona Lens ──
  await page.locator('[data-testid="lens-persona"]').click();
  await page.waitForTimeout(2000);
  await breathe(page, 2000);

  // ── Dramatic zoom in / out on the persona radial heatmap ──
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  if (paneBox) {
    const cx = paneBox.x + paneBox.width / 2;
    const cy = paneBox.y + paneBox.height / 2;
    // Zoom in to show heatmap detail
    await smoothZoom(page, cx, cy, -1800, 15);
    await breathe(page, 2000);
    // Zoom back out to see the full radial
    await smoothZoom(page, cx, cy, 800, 8);
    await breathe(page, 1500);
  }

  // ── Switch personas via dock flyout ──
  const personaDockBtn = page.locator('.nords-dock__item').filter({ hasText: 'Persona' }).first();
  if (await personaDockBtn.isVisible().catch(() => false)) {
    // Open persona flyout
    await personaDockBtn.click();
    await breathe(page, 1000);

    // Click Marcus Cole
    const marcusRow = page.locator('.nords-flyout__row--selectable').filter({ hasText: 'Marcus Cole' }).first();
    if (await marcusRow.isVisible().catch(() => false)) {
      await marcusRow.click({ force: true });
      await page.waitForTimeout(1500);
      await breathe(page, 2500); // Show Marcus's weighted heatmap
    }

    // Open flyout again, switch to Sarah Kim
    await personaDockBtn.click();
    await breathe(page, 800);
    const sarahRow = page.locator('.nords-flyout__row--selectable').filter({ hasText: 'Sarah Kim' }).first();
    if (await sarahRow.isVisible().catch(() => false)) {
      await sarahRow.click({ force: true });
      await page.waitForTimeout(1500);
      await breathe(page, 2000);
    }

    // Back to Dr. Priya Sharma
    await personaDockBtn.click();
    await breathe(page, 800);
    const priyaRow = page.locator('.nords-flyout__row--selectable').filter({ hasText: 'Sharma' }).first();
    if (await priyaRow.isVisible().catch(() => false)) {
      await priyaRow.click({ force: true });
      await page.waitForTimeout(1500);
      await breathe(page, 2000);
    }
  }

  // ── Click a nord to show the drawer with persona-weighted properties ──
  const nordCards = page.locator('[data-testid^="nord-card-"]');
  const cardCount = await nordCards.count();
  if (cardCount > 0) {
    // Click a visible card to open the drawer
    const targetCard = nordCards.nth(Math.min(2, cardCount - 1));
    await targetCard.click();
    await page.waitForTimeout(1000);

    // Show the drawer — persona-weighted properties are highlighted
    const drawerContent = page.locator('.nords-drawer-content').first();
    if (await drawerContent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await breathe(page, 2000); // Show properties with persona relevance

      // Scroll through the drawer slowly
      for (let i = 0; i < 3; i++) {
        await drawerContent.evaluate(el => el.scrollTo({ top: el.scrollTop + 150, behavior: 'smooth' }));
        await page.waitForTimeout(600);
      }
      await breathe(page, 1500);

      // Switch to Connections tab to show persona-influenced connections
      const connTab = page.locator('.nords-drawer-tab').filter({ hasText: 'Connections' });
      if (await connTab.isVisible().catch(() => false)) {
        await connTab.click();
        await breathe(page, 2000);
      }

      // Back to Properties
      const propsTab = page.locator('.nords-drawer-tab').filter({ hasText: 'Properties' });
      if (await propsTab.isVisible().catch(() => false)) {
        await propsTab.click();
        await page.waitForTimeout(500);
      }
    }

    // Close drawer before opening manage panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── Open Manage Personas panel — show bias category sliders ──
  // Click "Personas" in the header (Design group → Personas)
  const designGroupBtn = page.locator('[data-testid="header-group-design"]');
  if (await designGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await designGroupBtn.click();
    await page.waitForTimeout(500);
  }
  // Try Design group first, then fall back to Behavior group
  let personasBtn = page.locator('[data-testid="header-personas"]');
  if (!(await personasBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
    const behaviorGroupBtn = page.locator('[data-testid="header-group-behavior"]');
    if (await behaviorGroupBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await behaviorGroupBtn.click();
      await page.waitForTimeout(500);
    }
    personasBtn = page.locator('[data-testid="header-personas"]');
  }
  if (await personasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await personasBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for the Manage Personas panel
  const managePanel = page.locator('.manage-personas');
  if (await managePanel.isVisible({ timeout: 5000 }).catch(() => false)) {
    await breathe(page, 2000); // Show the panel with persona list and editor

    // ── Scroll down to the Relevance sliders section ──
    const editor = page.locator('.manage-personas__editor');
    if (await editor.isVisible()) {
      // Scroll to the bottom where relevance sliders are
      for (let i = 0; i < 6; i++) {
        await editor.evaluate(el => el.scrollTo({ top: el.scrollTop + 200, behavior: 'smooth' }));
        await page.waitForTimeout(350);
      }
      await breathe(page, 1500);

      // ── Drag the relevance bias sliders ──
      const sliders = page.locator('.manage-personas__weight-slider');
      const sliderCount = await sliders.count();

      if (sliderCount > 0) {
        // Drag first slider (e.g. "Design Control Phase") rightward
        const slider1 = sliders.nth(0);
        const slider1Box = await slider1.boundingBox();
        if (slider1Box) {
          const cx = slider1Box.x + slider1Box.width / 2;
          const cy = slider1Box.y + slider1Box.height / 2;
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          await page.mouse.move(cx + 80, cy, { steps: 20 }); // Drag right — increase weight
          await page.mouse.up();
          await breathe(page, 1200);
        }

        // Drag second slider leftward (decrease weight)
        if (sliderCount > 1) {
          const slider2 = sliders.nth(1);
          const slider2Box = await slider2.boundingBox();
          if (slider2Box) {
            const cx = slider2Box.x + slider2Box.width / 2;
            const cy = slider2Box.y + slider2Box.height / 2;
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx - 60, cy, { steps: 20 }); // Drag left — decrease weight
            await page.mouse.up();
            await breathe(page, 1200);
          }
        }

        // Drag third slider dramatically to the right
        if (sliderCount > 2) {
          const slider3 = sliders.nth(2);
          const slider3Box = await slider3.boundingBox();
          if (slider3Box) {
            const cx = slider3Box.x + slider3Box.width / 2;
            const cy = slider3Box.y + slider3Box.height / 2;
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx + 100, cy, { steps: 25 }); // Max weight
            await page.mouse.up();
            await breathe(page, 1200);
          }
        }

        // Drag fourth slider to negative territory
        if (sliderCount > 3) {
          const slider4 = sliders.nth(3);
          const slider4Box = await slider4.boundingBox();
          if (slider4Box) {
            const cx = slider4Box.x + slider4Box.width / 2;
            const cy = slider4Box.y + slider4Box.height / 2;
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx - 90, cy, { steps: 20 }); // Negative weight
            await page.mouse.up();
            await breathe(page, 1200);
          }
        }

        await breathe(page, 1500); // Let viewer absorb the changed weights
      }
    }

    // ── Close the Manage Personas panel ──
    const closeBtn = page.locator('.manage-personas__close').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);
    await breathe(page, 2000); // Show the canvas reweighted with new biases
  }

  // ── Nord Visibility cycling (show/dim/hide) ──
  const nordFilterBtn = page.locator('.nords-dock__item').filter({ hasText: 'Nord' }).first();
  if (await nordFilterBtn.isVisible().catch(() => false)) {
    await nordFilterBtn.click();
    await breathe(page, 800);

    const filterRows = page.locator('.nords-flyout__row--selectable');
    const filterCount = await filterRows.count();

    if (filterCount > 0) {
      // Cycle first nord type: show → dim → hide
      await filterRows.nth(0).click({ force: true });
      await breathe(page, 1000);
      await filterRows.nth(0).click({ force: true });
      await breathe(page, 1000);
      await filterRows.nth(0).click({ force: true });
      await breathe(page, 800);
    }

    // Close the flyout
    await page.locator('.nords-flyout-scrim').click().catch(() => page.keyboard.press('Escape'));
  }

  await breathe(page, 1500);
});
