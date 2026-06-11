/**
 * demo-videos.ts — Playwright script that records demo videos
 * matching the acts outlined in the demo walkthrough.
 *
 * Each test creates its own BrowserContext with video recording enabled,
 * performs human-paced interactions, then closes the context to finalize
 * the video. Videos are saved to: videos/demo/
 *
 * Prerequisites:
 *   1. Dev server running (`cd client && npm run dev`)
 *   2. API server running (`cd server && npx tsx --env-file=.env src/index.ts`)
 *   3. Seed executed (Pulse Sense CGM project exists with sessions)
 *   4. VITE_SKIP_AUTH=true in client/.env.local
 *   5. SKIP_AUTH=true in server/.env
 *
 * Usage:
 *   npx playwright test scripts/demo-videos.ts --reporter=list
 *   npx playwright test scripts/demo-videos.ts -g "ACT 1"
 */

import { test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const VIDEO_DIR = 'videos/demo';

// Record at 2560×1440. We inject CSS zoom (1.2) on <html> after page load
// to make UI elements ~20% larger while keeping the full-resolution recording.
const VIEWPORT = { width: 2560, height: 1440 };
const CSS_ZOOM = 1.2;

// ── Helpers ──

/** Create a recording context with video capture */
async function createRecordingContext(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();
  return { context, page };
}

/** Navigate to URL and apply CSS zoom for larger UI elements */
async function navigateWithZoom(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, CSS_ZOOM);
  await page.waitForTimeout(300);
}

/** Wait for the project dashboard to load */
async function waitForDashboard(page: Page, timeout = 20000) {
  await page.getByRole('heading', { name: /Favorites|All Projects|Pulse Sense/i }).first().waitFor({ state: 'visible', timeout });
}

/** Navigate into the Pulse Sense project from the dashboard */
async function navigateToProject(page: Page) {
  await navigateWithZoom(page, BASE_URL);
  await waitForDashboard(page);
  await page.waitForTimeout(800);
  await page.getByRole('heading', { name: /Pulse Sense/i }).click();
  await page.locator('[data-testid="global-dock"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);
}

/** Wait for canvas nodes to appear and settle */
async function waitForCanvas(page: Page, timeout = 15000) {
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(2500);
}

/** Click the fit/re-center button and wait for animation */
async function fitView(page: Page) {
  const fitBtn = page.locator('[data-testid="zoom-fit"]');
  if (await fitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fitBtn.click();
    await page.waitForTimeout(800);
  }
}

/** Smooth drag on a range input slider */
async function dragSlider(page: Page, slider: ReturnType<Page['locator']>, fromFraction: number, toFraction: number, steps = 25) {
  const box = await slider.boundingBox();
  if (!box) return;

  const startX = box.x + box.width * fromFraction;
  const endX = box.x + box.width * toFraction;
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(800);
}

/** Finalize recording: close context, rename video file */
async function finalizeVideo(context: BrowserContext, page: Page, outputName: string) {
  const videoPath = await page.video()?.path();
  await context.close();

  if (videoPath && fs.existsSync(videoPath)) {
    const dest = path.join(VIDEO_DIR, `${outputName}.webm`);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(videoPath, dest);
    console.log(`  📹 Saved: ${dest}`);
  }
}

// ── Ensure output directory ──
fs.mkdirSync(VIDEO_DIR, { recursive: true });


test.describe('Demo Video Recordings', () => {
  test.describe.configure({ mode: 'serial' });

  // ═══════════════════════════════════════════════════════════
  // BEAUTY SHOT — General purpose sizzle reel (~20s)
  // Rapid switching through lenses, categories, personas
  // ═══════════════════════════════════════════════════════════

  test('BEAUTY SHOT — Sizzle reel', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Start on Graph lens
    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }
    await waitForCanvas(page);
    // Auto-fit fires from the code change — give it time
    await page.waitForTimeout(1500);

    // Cycle through 3 graph categories
    const graphCategoryBtn = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();
    for (let i = 1; i <= 3; i++) {
      await graphCategoryBtn.click();
      await page.waitForTimeout(400);
      const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
      if (await flyoutRows.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
        await flyoutRows.nth(i).click();
        // Auto-fit fires from code change after category switch
        await page.waitForTimeout(1500);
      }
    }

    // Click a node
    const nodes = page.locator('.react-flow__node');
    if (await nodes.nth(2).isVisible({ timeout: 2000 }).catch(() => false)) {
      await nodes.nth(2).click({ force: true });
      await page.waitForTimeout(1200);
    }

    // Switch to Board
    await page.locator('[data-testid="lens-board"]').click();
    await page.waitForTimeout(1800);

    // Switch to Persona — Priya
    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(2500);

    // Switch persona via flyout
    const personaPill = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();
    await personaPill.click();
    await page.waitForTimeout(500);
    const personaRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
    if (await personaRows.nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
      await personaRows.nth(1).click();
      await page.waitForTimeout(2000);
    }

    // Switch to Goals
    await page.locator('[data-testid="lens-goals"]').click();
    await page.waitForTimeout(2000);

    // Back to Graph for the ending frame
    await page.locator('[data-testid="lens-canvas"]').click();
    await page.waitForTimeout(2500);

    await finalizeVideo(context, page, 'beauty-shot');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 1 — THE GRAPH (~30s)
  // Navigate into project → canvas → fit → click Risk card
  // ═══════════════════════════════════════════════════════════

  test('ACT 1 — The Graph', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);

    // Dashboard → click into project
    await navigateWithZoom(page, BASE_URL);
    await waitForDashboard(page);
    await page.waitForTimeout(1500);

    await page.getByRole('heading', { name: /Pulse Sense/i }).click();
    await page.locator('[data-testid="global-dock"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Ensure Graph lens
    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }
    await waitForCanvas(page);
    // Auto-fit fires from code change
    await page.waitForTimeout(2000);

    // Switch category to show the graph reshaping
    const graphCategoryBtn = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();
    await graphCategoryBtn.click();
    await page.waitForTimeout(400);
    const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
    if (await flyoutRows.nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
      await flyoutRows.nth(1).click();
      await page.waitForTimeout(2000);
    }

    // Click a Risk card to open detail drawer
    const riskNode = page.locator('.react-flow__node')
      .filter({ hasText: /Battery thermal|Inaccurate glucose|thermal runaway/i }).first();
    if (await riskNode.isVisible({ timeout: 5000 }).catch(() => false)) {
      await riskNode.click({ force: true });
    } else {
      const allNodes = page.locator('.react-flow__node');
      const count = await allNodes.count();
      if (count > 2) await allNodes.nth(2).click({ force: true });
    }
    await page.waitForTimeout(3000);

    // Pause to show the drawer content
    await page.waitForTimeout(2000);

    await finalizeVideo(context, page, 'act1-graph');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 2 — THE BOARD (~30s)
  // Board view → scroll → toggle multiple categories
  // ═══════════════════════════════════════════════════════════

  test('ACT 2 — The Board', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Switch to Board
    await page.locator('[data-testid="lens-board"]').click();
    await page.waitForTimeout(3000);

    // Let viewer read the columns
    await page.waitForTimeout(2000);

    // Smooth horizontal scroll to show more lanes
    const boardArea = page.locator('main').first();
    if (await boardArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      for (let i = 0; i < 12; i++) {
        await boardArea.evaluate(el => el.scrollLeft += 100);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(1500);

      // Scroll back
      for (let i = 0; i < 8; i++) {
        await boardArea.evaluate(el => el.scrollLeft -= 120);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(1000);
    }

    // Open Category flyout — toggle multiple categories
    const categoryItem = page.locator('.nords-dock__item').filter({ hasText: /Category/i }).first();
    if (await categoryItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryItem.click();
      await page.waitForTimeout(800);

      const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
      const rowCount = await flyoutRows.count();

      // Toggle 2nd category off
      if (rowCount > 1) {
        await flyoutRows.nth(1).click();
        await page.waitForTimeout(1200);
      }
      // Toggle 3rd category off
      if (rowCount > 2) {
        await flyoutRows.nth(2).click();
        await page.waitForTimeout(1200);
      }
      // Toggle 4th off if present
      if (rowCount > 3) {
        await flyoutRows.nth(3).click();
        await page.waitForTimeout(1200);
      }
      // Toggle 2nd back on
      if (rowCount > 1) {
        await flyoutRows.nth(1).click();
        await page.waitForTimeout(1200);
      }
      // Toggle 3rd back on
      if (rowCount > 2) {
        await flyoutRows.nth(2).click();
        await page.waitForTimeout(1200);
      }

      // Close flyout
      await page.locator('.nords-flyout-scrim').click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Final pause on board
    await page.waitForTimeout(2000);

    await finalizeVideo(context, page, 'act2-board');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 3 — EXPERT LENSES (~40s)
  // Persona lens → fit → open drawer → drag sliders → switch
  // ═══════════════════════════════════════════════════════════

  test('ACT 3 — Expert Lenses', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Switch to Persona lens — Priya auto-loads
    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(3000);
    // Auto-fit fires from code change — give extra time for persona layout
    await page.waitForTimeout(2000);

    // Click the persona center node to open PersonaLensDrawer
    const anyCenter = page.locator('.persona-center-node, .react-flow__node--persona-center').first();
    const centerNode = page.locator('.react-flow__node').filter({ hasText: /Priya|Dr\./i }).first();

    if (await anyCenter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anyCenter.click({ force: true });
    } else if (await centerNode.isVisible({ timeout: 3000 }).catch(() => false)) {
      await centerNode.click({ force: true });
    } else {
      const firstNode = page.locator('.react-flow__node').first();
      await firstNode.click({ force: true });
    }
    await page.waitForTimeout(2000);

    // Drag weight sliders if PersonaLensDrawer opened
    const sliders = page.locator('.persona-weight-slider__input');
    const sliderCount = await sliders.count();

    if (sliderCount > 0) {
      // Drag first slider up
      await dragSlider(page, sliders.first(), 0.8, 1.0, 30);
      await page.waitForTimeout(1500);

      // Drag second slider down
      if (sliderCount > 1) {
        await dragSlider(page, sliders.nth(1), 0.6, 0.25, 30);
        await page.waitForTimeout(1500);
      }

      // Drag third slider to neutral
      if (sliderCount > 2) {
        await dragSlider(page, sliders.nth(2), 0.7, 0.5, 20);
        await page.waitForTimeout(1000);
      }

      // Close the drawer
      const closeBtn = page.locator('.persona-lens-drawer .nords-close-btn').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Switch to Marcus via persona flyout
    const personaPill = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();
    await personaPill.click();
    await page.waitForTimeout(500);

    const marcusRow = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable').filter({ hasText: /Marcus/i }).first();
    if (await marcusRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await marcusRow.click();
    } else {
      const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
      if (await flyoutRows.nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
        await flyoutRows.nth(1).click();
      }
    }
    await page.waitForTimeout(3000);

    // Switch to Sarah
    await personaPill.click();
    await page.waitForTimeout(500);
    const sarahRow = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable').filter({ hasText: /Sarah/i }).first();
    if (await sarahRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sarahRow.click();
    } else {
      const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
      if (await flyoutRows.nth(2).isVisible({ timeout: 2000 }).catch(() => false)) {
        await flyoutRows.nth(2).click();
      }
    }
    await page.waitForTimeout(3000);

    await finalizeVideo(context, page, 'act3-expert-lenses');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 4 — THE GOAL DAG (~25s)
  // Goals lens → DAG → click Risk Analysis Complete
  // ═══════════════════════════════════════════════════════════

  test('ACT 4 — The Goal DAG', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Switch to Goals lens
    await page.locator('[data-testid="lens-goals"]').click();
    await page.waitForTimeout(3000);

    // Let viewer absorb the DAG
    await page.waitForTimeout(2500);

    // Click "Risk Analysis Complete" goal
    const riskGoal = page.getByText(/Risk Analysis/i).first();
    if (await riskGoal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await riskGoal.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // Show the goal detail drawer
    await page.waitForTimeout(3000);

    await finalizeVideo(context, page, 'act4-goals');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 5 — TESTS (~25s)
  // Test Runner → 5 scenarios → click a scenario
  // ═══════════════════════════════════════════════════════════

  test('ACT 5 — Tests', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Open the Tests group flyout, then click Test Runner
    await page.locator('[data-testid="header-group-test"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="header-test-runner"]').click();
    await page.waitForTimeout(2000);

    // Wait for the Test Runner panel to be visible
    const testPanel = page.locator('.test-runner, .manage-tests, .nords-test-runner');
    await testPanel.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // Click on a test scenario
    const tangential = page.getByText(/Tangential|Hallucination|Nord Traversal/i).first();
    if (await tangential.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tangential.click({ force: true });
      await page.waitForTimeout(3000);
    }

    // Pause on scenario detail
    await page.waitForTimeout(2000);

    await finalizeVideo(context, page, 'act5-tests');
  });

  // ═══════════════════════════════════════════════════════════
  // ACT 6 — SHARE (~30s)
  // Share panel → show the UI
  // ═══════════════════════════════════════════════════════════

  test('ACT 6 — Share', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Open the Publish group flyout, then click Share
    await page.locator('[data-testid="header-group-publish"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="header-share"]').click();
    await page.waitForTimeout(2000);

    // Wait for the Share panel to be visible
    const sharePanel = page.locator('.share-panel, .manage-share, .nords-share');
    await sharePanel.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Click "Create Share Link" to show the creation flow
    const createBtn = page.getByText(/Create.*Link|Generate.*Link|New.*Link|Share/i).first();
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(3000);
    }

    // End on the share panel — no incognito open
    await page.waitForTimeout(2000);

    await finalizeVideo(context, page, 'act6-share');
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS — DRAW CONNECTION (Active → Ghosted Nord)
  // Show dragging a line from an active node to a ghosted node
  // ═══════════════════════════════════════════════════════════

  test('BONUS — Draw Connection', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Ensure Graph lens with a category active (so some nodes are ghosted)
    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }
    await waitForCanvas(page);
    await page.waitForTimeout(1500);

    // Select a specific category to ghost some nodes (if not already ghosted)
    let hasGhosted = await page.locator('.nords-node--ghosted').count() > 0;
    if (!hasGhosted) {
      // Open the category flyout from the dock
      const graphCategoryBtn = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();
      if (await graphCategoryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await graphCategoryBtn.click();
        await page.waitForTimeout(400);
        const flyoutRows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
        if (await flyoutRows.nth(0).isVisible({ timeout: 2000 }).catch(() => false)) {
          await flyoutRows.nth(0).click();
          await page.waitForTimeout(2000);
        }
      }
    }
    await page.waitForTimeout(500);

    // Find an active (non-ghosted) node and a ghosted node using CSS :has()
    const activeNodes = page.locator('.react-flow__node:not(:has(.nords-node--ghosted))');
    const ghostedNodes = page.locator('.react-flow__node:has(.nords-node--ghosted)');

    const activeCount = await activeNodes.count();
    const ghostedCount = await ghostedNodes.count();

    if (activeCount > 0 && ghostedCount > 0) {
      const sourceNode = activeNodes.first();
      const targetNode = ghostedNodes.first();
      const sourceBox = await sourceNode.boundingBox();
      const targetBox = await targetNode.boundingBox();

      if (sourceBox && targetBox) {
        // Hover over source node to reveal the handle
        const srcCenterX = sourceBox.x + sourceBox.width / 2;
        const srcBottomY = sourceBox.y + sourceBox.height;
        const tgtCenterX = targetBox.x + targetBox.width / 2;
        const tgtCenterY = targetBox.y + targetBox.height / 2;

        await page.waitForTimeout(1000);

        // Start from the bottom edge of the source node (source handle position)
        await page.mouse.move(srcCenterX, srcBottomY);
        await page.waitForTimeout(500);

        // Click on the source handle
        const sourceHandle = sourceNode.locator('.react-flow__handle[data-handlepos="bottom"]').first();
        const handleBox = await sourceHandle.boundingBox().catch(() => null);

        const startX = handleBox ? handleBox.x + handleBox.width / 2 : srcCenterX;
        const startY = handleBox ? handleBox.y + handleBox.height / 2 : srcBottomY;

        // Smooth drag from source handle to ghosted target
        await page.mouse.move(startX, startY);
        await page.waitForTimeout(300);
        await page.mouse.down();
        await page.waitForTimeout(200);

        // Animate the drag in steps for visual effect
        const steps = 30;
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const x = startX + (tgtCenterX - startX) * progress;
          const y = startY + (tgtCenterY - startY) * progress;
          await page.mouse.move(x, y);
          await page.waitForTimeout(40);
        }

        await page.waitForTimeout(300);
        await page.mouse.up();
        await page.waitForTimeout(2000);

        // Show the result — the ghosted node should now be promoted
        await page.waitForTimeout(2000);
      }
    } else {
      // Fallback: just show the category view
      await page.waitForTimeout(3000);
    }

    await finalizeVideo(context, page, 'bonus-draw-connection');
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS — SESSION REPLAY (Preview Chat in Demo Mode)
  // Opens Sessions → replays a transcript → hides playback controls
  // ═══════════════════════════════════════════════════════════

  test('BONUS — Session Replay', async ({ browser }) => {
    test.setTimeout(180000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Open Sessions Explorer
    const sessionsBtn = page.locator('[data-testid="header-sessions"]');
    if (await sessionsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sessionsBtn.click();
    } else {
      const headerGroup = page.locator('[data-testid="header-group-run"]');
      if (await headerGroup.isVisible({ timeout: 2000 }).catch(() => false)) {
        await headerGroup.click();
        await page.waitForTimeout(500);
        await page.locator('[data-testid="header-sessions"]').click();
      }
    }
    await page.waitForTimeout(2000);

    // Click the first session's replay button to load it into PreviewChat
    const replayBtn = page.getByText(/Replay|View/i).first();
    if (await replayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await replayBtn.click();
      await page.waitForTimeout(2000);
    }

    // Wait for PreviewChat to appear
    const previewChat = page.locator('[data-testid="preview-chat"]');
    await previewChat.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Click the demo mode button (Eye/EyeOff toggle) to hide playback controls
    // The demo mode button has title "Demo mode — hide controls"
    const demoToggle = page.locator('.preview-chat__action-btn').filter({ has: page.locator('svg') }).last();
    // More reliable: find the button by its title
    const demoBtn = page.locator('button[title*="Demo mode"], button[title*="replay controls"]').first();
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForTimeout(500);
    } else if (await demoToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoToggle.click();
      await page.waitForTimeout(500);
    }

    // Let the replay run with typewriter animation
    // Wait for several rounds to play through
    await page.waitForTimeout(20000);

    // Show final state
    await page.waitForTimeout(3000);

    await finalizeVideo(context, page, 'bonus-session-replay');
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS — CREATE TYPE (ManageTypes workflow)
  // Open types panel → create a new type → rename → change icon
  // → change color → add 3 properties with different types
  // ═══════════════════════════════════════════════════════════

  test('BONUS — Create Type', async ({ browser }) => {
    test.setTimeout(120000);
    const { context, page } = await createRecordingContext(browser);
    await navigateToProject(page);

    // Open the Design flyout → Types
    const designGroup = page.locator('[data-testid="header-group-design"]');
    await designGroup.click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="header-nords"]').click();
    await page.waitForTimeout(1500);

    // Wait for the ManageTypes modal to appear
    const modal = page.locator('[data-testid="manage-types-modal"]');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1500);

    // Click "+ New Type" button in the sidebar
    const newTypeBtn = modal.locator('.manage-types__new-btn');
    await newTypeBtn.click();
    await page.waitForTimeout(1200);

    // The new type "New Type" should now be selected — rename it
    const nameInput = modal.locator('.manage-types__name-input');
    await nameInput.click();
    await nameInput.fill('');
    await page.waitForTimeout(200);

    // Typewriter-style name entry
    const typeName = 'Verification Activity';
    for (const char of typeName) {
      await nameInput.press(char === ' ' ? 'Space' : char);
      await page.waitForTimeout(50 + Math.random() * 50);
    }
    await page.waitForTimeout(1000);

    // Click the icon button to open the IconPicker
    const iconBtn = modal.locator('.manage-types__icon-btn');
    await iconBtn.click();
    await page.waitForTimeout(1000);

    // Click through different icons — each click closes the picker, so reopen
    const iconGridSel = '.icon-picker__grid .icon-picker__item';

    // Icon 1
    await iconBtn.click();
    await page.waitForTimeout(600);
    let iconItems = page.locator(iconGridSel);
    if (await iconItems.nth(3).isVisible({ timeout: 3000 }).catch(() => false)) {
      await iconItems.nth(3).click();
      await page.waitForTimeout(600);
    }

    // Icon 2 — reopen picker
    await iconBtn.click();
    await page.waitForTimeout(600);
    iconItems = page.locator(iconGridSel);
    if (await iconItems.nth(7).isVisible({ timeout: 3000 }).catch(() => false)) {
      await iconItems.nth(7).click();
      await page.waitForTimeout(600);
    }

    // Icon 3 — reopen picker
    await iconBtn.click();
    await page.waitForTimeout(600);
    iconItems = page.locator(iconGridSel);
    if (await iconItems.nth(12).isVisible({ timeout: 3000 }).catch(() => false)) {
      await iconItems.nth(12).click();
      await page.waitForTimeout(600);
    }

    // Final icon — reopen, pick, then stay open for color
    await iconBtn.click();
    await page.waitForTimeout(600);
    iconItems = page.locator(iconGridSel);
    if (await iconItems.nth(5).isVisible({ timeout: 3000 }).catch(() => false)) {
      await iconItems.nth(5).click();
      await page.waitForTimeout(400);
    }

    // Reopen picker to access the hue slider (color control is inside the popover)
    await iconBtn.click();
    await page.waitForTimeout(600);

    // Drag the color/hue slider to change the accent color
    const hueSlider = modal.locator('.nords-hue-slider__input, input[type="range"]').first();
    if (await hueSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dragSlider(page, hueSlider, 0.3, 0.7, 30);
      await page.waitForTimeout(600);
      // Drag again for a second color
      await dragSlider(page, hueSlider, 0.7, 0.15, 25);
      await page.waitForTimeout(600);
    }

    // Close the icon/color picker — click somewhere on the modal body
    await modal.locator('.manage-types__editor').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // Add description
    const descInput = modal.locator('.manage-types__desc-input');
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.click();
      const desc = 'Testing or inspection activity that confirms design outputs meet requirements.';
      for (const char of desc) {
        await descInput.press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(20 + Math.random() * 30);
      }
      await page.waitForTimeout(600);
    }

    // Add Property 1: "Protocol ID" (short_text)
    const addPropBtn = modal.locator('.manage-types__add-prop-btn');
    await addPropBtn.click();
    await page.waitForTimeout(800);

    // Rename the first property
    const propInputs = modal.locator('.manage-types__prop-input');
    if (await propInputs.last().isVisible({ timeout: 2000 }).catch(() => false)) {
      await propInputs.last().click();
      await propInputs.last().fill('');
      await page.waitForTimeout(100);
      const propName1 = 'Protocol ID';
      for (const char of propName1) {
        await propInputs.last().press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(600);
    }

    // Add Property 2: "Status" (select)
    await addPropBtn.click();
    await page.waitForTimeout(800);
    if (await propInputs.last().isVisible({ timeout: 2000 }).catch(() => false)) {
      await propInputs.last().click();
      await propInputs.last().fill('');
      const propName2 = 'Status';
      for (const char of propName2) {
        await propInputs.last().press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(400);

      // Change type to "select"
      const typeSelects = modal.locator('.manage-types__prop-select');
      if (await typeSelects.last().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelects.last().selectOption('select');
        await page.waitForTimeout(600);
      }
    }

    // Add Property 3: "Due Date" (date)
    await addPropBtn.click();
    await page.waitForTimeout(800);
    if (await propInputs.last().isVisible({ timeout: 2000 }).catch(() => false)) {
      await propInputs.last().click();
      await propInputs.last().fill('');
      const propName3 = 'Due Date';
      for (const char of propName3) {
        await propInputs.last().press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(400);

      // Change type to "date"
      const typeSelects = modal.locator('.manage-types__prop-select');
      if (await typeSelects.last().isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelects.last().selectOption('date');
        await page.waitForTimeout(600);
      }
    }

    // Final pause to show the completed type with 3 properties
    await page.waitForTimeout(3000);

    await finalizeVideo(context, page, 'bonus-create-type');
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS — Persona Cycling
  // Zoom into the persona center avatar, cycle through personas
  // twice via the dock flyout.
  // ═══════════════════════════════════════════════════════════

  test('BONUS — Persona Cycling', async ({ browser }) => {
    const { context, page } = await createRecordingContext(browser);

    await navigateToProject(page);

    // Switch to persona lens
    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(3000);

    // Let the persona radial layout load and center
    await page.locator('.persona-center-node').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1500);

    // Cycle through personas — the persona switcher is the first dock item in persona mode
    // (it shows the active persona's name, not "Persona")
    const personaFlyoutBtn = page.locator('[data-testid="global-dock"] .nords-dock__section .nords-dock__item').first();

    // Do 2 full cycles through all available personas
    for (let cycle = 0; cycle < 2; cycle++) {
      // Open the persona switcher flyout
      await personaFlyoutBtn.click();
      await page.waitForTimeout(600);

      // Count available personas
      const rows = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable');
      const count = await rows.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          // Reopen flyout if it closed after previous selection
          const flyoutOpen = await page.locator('.nords-flyout.is-open').isVisible().catch(() => false);
          if (!flyoutOpen) {
            await personaFlyoutBtn.click();
            await page.waitForTimeout(400);
          }

          const row = page.locator('.nords-flyout.is-open .nords-flyout__row--selectable').nth(i);
          if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
            await row.click();
            await page.waitForTimeout(2500);
          }
        }
      }
    }

    await page.waitForTimeout(2000);
    await finalizeVideo(context, page, 'bonus-persona-cycling');
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS — Create Persona
  // Full creation flow: open ManagePersonas via Behavior header,
  // click New, name it, pick avatar, set color, fill in fields,
  // add a mental model, drag relevance sliders.
  // ═══════════════════════════════════════════════════════════

  test('BONUS — Create Persona', async ({ browser }) => {
    const { context, page } = await createRecordingContext(browser);

    await navigateToProject(page);

    // Open ManagePersonas via Behavior group → Personas
    await page.locator('[data-testid="header-group-behavior"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="header-personas"]').click();
    await page.waitForTimeout(1200);

    const modal = page.locator('.manage-personas');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(800);

    // Click "+ New Persona"
    await modal.locator('.manage-personas__add-btn').click();
    await page.waitForTimeout(1200);

    // Type a name (typewriter style)
    const nameInput = modal.locator('.manage-personas__editor-name');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.click();
      await nameInput.fill('');
      const personaName = 'Dr. Maya Rodriguez';
      for (const char of personaName) {
        await nameInput.press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(30 + Math.random() * 50);
      }
      await nameInput.press('Tab');
      await page.waitForTimeout(600);
    }

    // Click avatar to open the avatar picker
    const avatarEl = modal.locator('.manage-personas__editor-avatar');
    if (await avatarEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await avatarEl.click();
      await page.waitForTimeout(800);

      // Click a few avatar seeds
      const opts = modal.locator('.manage-personas__avatar-option:not(.manage-personas__avatar-randomize)');
      const optCount = await opts.count();
      if (optCount > 7) {
        await opts.nth(2).click(); await page.waitForTimeout(500);
        await avatarEl.click(); await page.waitForTimeout(500);
        await opts.nth(7).click(); await page.waitForTimeout(500);
        await avatarEl.click(); await page.waitForTimeout(500);
        await opts.nth(5).click(); await page.waitForTimeout(500);
      }
    }

    // Reopen picker for hue slider
    await avatarEl.click();
    await page.waitForTimeout(600);

    const hueSlider = modal.locator('.nords-hue-slider__input, input[type="range"]').first();
    if (await hueSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dragSlider(page, hueSlider, 0.2, 0.65, 25);
      await page.waitForTimeout(500);
      await dragSlider(page, hueSlider, 0.65, 0.4, 20);
      await page.waitForTimeout(600);
    }

    // Close avatar picker
    await modal.locator('.manage-personas__editor-header-right').click();
    await page.waitForTimeout(400);

    // Fill Background (typewriter)
    const bgTextarea = modal.locator('textarea').nth(0);
    if (await bgTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bgTextarea.click();
      const bgText = 'Former FDA reviewer with 12 years in medical device regulatory affairs.';
      for (const char of bgText) {
        await bgTextarea.press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(15 + Math.random() * 25);
      }
      await page.waitForTimeout(400);
    }

    // Fill Primary Motivation
    const motTextarea = modal.locator('textarea').nth(1);
    if (await motTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await motTextarea.click();
      const motText = 'Ensure patient safety through rigorous design verification.';
      for (const char of motText) {
        await motTextarea.press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(15 + Math.random() * 25);
      }
      await page.waitForTimeout(400);
    }

    // Fill Voice & Tone
    const vtTextarea = modal.locator('textarea').nth(2);
    if (await vtTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vtTextarea.click();
      const vtText = 'Precise and methodical. References FDA guidance documents.';
      for (const char of vtText) {
        await vtTextarea.press(char === ' ' ? 'Space' : char);
        await page.waitForTimeout(15 + Math.random() * 25);
      }
      await page.waitForTimeout(400);
    }

    // Scroll down to mental models section
    const editorPane = modal.locator('.manage-personas__editor');
    await editorPane.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(800);

    // Add a mental model — use the empty-state button (not the title bar one which can be disabled)
    const addModelBtn = modal.getByText('Add a mental model');
    if (await addModelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addModelBtn.click({ force: true });
      await page.waitForTimeout(600);

      const modelNameInput = modal.locator('.manage-personas__model-name').first();
      if (await modelNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modelNameInput.click();
        await modelNameInput.fill('');
        const modelName = 'Risk-Benefit Analysis Framework';
        for (const char of modelName) {
          await modelNameInput.press(char === ' ' ? 'Space' : char);
          await page.waitForTimeout(30 + Math.random() * 40);
        }
        await page.waitForTimeout(300);
      }

      const modelBody = modal.locator('.manage-personas__model-body').first();
      if (await modelBody.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modelBody.click();
        const bodyText = 'Weighs clinical benefit against residual risk using ISO 14971 methodology.';
        for (const char of bodyText) {
          await modelBody.press(char === ' ' ? 'Space' : char);
          await page.waitForTimeout(12 + Math.random() * 20);
        }
        await page.waitForTimeout(400);
      }
    }

    // Scroll to relevance sliders
    await editorPane.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // Drag a few relevance sliders
    const weightSliders = modal.locator('.manage-personas__weight-slider');
    const sliderCount = await weightSliders.count();
    if (sliderCount > 0) {
      await dragSlider(page, weightSliders.nth(0), 0.5, 0.85, 20);
      await page.waitForTimeout(400);
    }
    if (sliderCount > 1) {
      await dragSlider(page, weightSliders.nth(1), 0.5, 0.3, 15);
      await page.waitForTimeout(400);
    }
    if (sliderCount > 2) {
      await dragSlider(page, weightSliders.nth(2), 0.5, 0.7, 15);
      await page.waitForTimeout(400);
    }

    // Final pause showing the completed persona
    await page.waitForTimeout(3000);

    await finalizeVideo(context, page, 'bonus-create-persona');
  });
});
