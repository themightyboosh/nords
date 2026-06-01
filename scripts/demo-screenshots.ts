/**
 * demo-screenshots.ts — Playwright script that captures screenshots
 * matching the moments outlined in the demo talk track (docs/demo/script.md).
 *
 * Prerequisites:
 *   1. Dev server running (`pnpm dev`)
 *   2. Seed executed (`npx tsx --env-file=.env src/seed-demo.ts <email>`)
 *   3. VITE_SKIP_AUTH=true in client/.env.local
 *
 * Usage:
 *   npx playwright test scripts/demo-screenshots.ts --headed
 *   npx playwright test scripts/demo-screenshots.ts  (headless)
 *
 * Screenshots saved to: screenshots/demo/
 */

import { test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'screenshots/demo';

// Wait for the app to load — uses heading text or role-based selectors
async function waitForDashboard(page: Page, timeout = 20000) {
  // The dashboard shows "Favorites" or "All Projects" heading when loaded
  await page.getByRole('heading', { name: /Favorites|All Projects|Pulse Sense/i }).first().waitFor({ state: 'visible', timeout });
}

// Navigate into the project from the dashboard
async function navigateToProject(page: Page) {
  await page.goto(BASE_URL);
  await waitForDashboard(page);
  // Click on the Pulse Sense project card
  await page.getByRole('heading', { name: /Pulse Sense/i }).click();
  // Wait for the workspace to load (global dock appears)
  await page.locator('[data-testid="global-dock"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000); // Let animations settle
}

// Wait for canvas nodes to appear
async function waitForCanvas(page: Page, timeout = 15000) {
  // Wait for actual node elements (not the container)
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(2500); // Let physics animations settle
}

test.describe('Demo Talk Track Screenshots', () => {
  test.describe.configure({ mode: 'serial' });

  // ═══════════════════════════════════════════════════════════
  // SCENE 0: PROJECT DASHBOARD
  // ═══════════════════════════════════════════════════════════

  test('00 — Project Dashboard', async ({ page }) => {
    test.setTimeout(30000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await waitForDashboard(page);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/00-project-dashboard.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SCENE 1: THE CANVAS (Script 1:05 – 1:30)
  // "You're looking at a medical device team building a CGM"
  // ═══════════════════════════════════════════════════════════

  test('01 — Full canvas overview', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    // Make sure we're on canvas lens
    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(2000);
    }

    await waitForCanvas(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-canvas-overview.png`,
      fullPage: false,
    });
  });

  test('02 — Click a Risk card to open detail drawer', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }

    await waitForCanvas(page);

    // Click on a node containing risk-related text
    // Use exact .react-flow__node class (not the container .react-flow__nodes)
    const riskNode = page.locator('.react-flow__node')
      .filter({ hasText: /Battery thermal|Inaccurate glucose|thermal runaway/i }).first();
    if (await riskNode.isVisible({ timeout: 5000 }).catch(() => false)) {
      await riskNode.click({ force: true });
      await page.waitForTimeout(2000);
    } else {
      // Fallback: click the 3rd node (skip first two which might be small)
      const nodes = page.locator('.react-flow__node');
      const count = await nodes.count();
      if (count > 2) {
        await nodes.nth(2).click({ force: true });
        await page.waitForTimeout(2000);
      } else if (count > 0) {
        await nodes.first().click({ force: true });
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-risk-card-detail.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SCENE 2: BOARD VIEW (Script 1:30 – 1:55)
  // "These columns? They're the FDA design control waterfall."
  // ═══════════════════════════════════════════════════════════

  test('03 — Board view (Design Control Phase)', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    // Switch to Board view
    await page.locator('[data-testid="lens-board"]').click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-board-design-control.png`,
      fullPage: false,
    });
  });

  test('04 — Board view — scrolled to show more lanes', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-board"]').click();
    await page.waitForTimeout(2000);

    // Scroll the board container to the right to reveal more swimlanes
    const boardArea = page.locator('.nords-canvas, .nords-matrix-view, main').first();
    if (await boardArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await boardArea.evaluate(el => el.scrollLeft += 600);
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-board-scrolled.png`,
      fullPage: false,
    });
  });

  test('05 — Board view — with category flyout open', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-board"]').click();
    await page.waitForTimeout(2000);

    // The board lens button, when in board mode, opens the category flyout
    // Click it again to toggle the flyout panel
    const boardBtn = page.locator('[data-testid="lens-board"]');
    await boardBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-board-category-flyout.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SCENE 3: PERSONA LENS (Script 1:55 – 2:20)
  // "Dr. Sharma... Risks, submission blockers snap to center"
  // ═══════════════════════════════════════════════════════════

  test('06 — Persona lens — Dr. Priya Sharma', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(2000);

    // Priya is default persona, but click her card to be sure
    const priyaEl = page.getByText(/Priya/i).first();
    if (await priyaEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priyaEl.click({ force: true });
      await page.waitForTimeout(2500);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-persona-priya-sharma.png`,
      fullPage: false,
    });
  });

  test('07 — Persona lens — Marcus Cole', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(2000);

    const marcusEl = page.getByText(/Marcus/i).first();
    if (await marcusEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await marcusEl.click({ force: true });
      await page.waitForTimeout(2500);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-persona-marcus-cole.png`,
      fullPage: false,
    });
  });

  test('08 — Persona lens — Sarah Kim', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-persona"]').click();
    await page.waitForTimeout(2000);

    const sarahEl = page.getByText(/Sarah/i).first();
    if (await sarahEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sarahEl.click({ force: true });
      await page.waitForTimeout(2500);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-persona-sarah-kim.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // SCENE 4: GOALS (Script 2:20 – 2:40)
  // "The path to FDA submission. Six goals. A dependency chain."
  // ═══════════════════════════════════════════════════════════

  test('09 — Goals DAG overview', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-goals"]').click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-goals-dag-overview.png`,
      fullPage: false,
    });
  });

  test('10 — Goals — click Risk Analysis Complete', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    await page.locator('[data-testid="lens-goals"]').click();
    await page.waitForTimeout(2000);

    // Click on "Risk Analysis" goal node
    const riskGoal = page.getByText(/Risk Analysis/i).first();
    if (await riskGoal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await riskGoal.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-goals-risk-analysis-detail.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS: Connection detail with properties
  // ═══════════════════════════════════════════════════════════

  test('11 — Canvas with connection clicked', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }

    await waitForCanvas(page);

    // Try clicking an edge path (the SVG path element inside edges)
    const edgePath = page.locator('.react-flow__edge path').first();
    if (await edgePath.isVisible({ timeout: 5000 }).catch(() => false)) {
      await edgePath.click({ force: true });
      await page.waitForTimeout(2000);
    } else {
      // Fallback: click a node instead to show the detail drawer
      const node = page.locator('.react-flow__node').nth(1);
      if (await node.isVisible({ timeout: 3000 }).catch(() => false)) {
        await node.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-connection-detail.png`,
      fullPage: false,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // BONUS: Canvas with category filter — single category view
  // ═══════════════════════════════════════════════════════════

  test('12 — Canvas — Mitigates category selected', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateToProject(page);

    const canvasBtn = page.locator('[data-testid="lens-canvas"]');
    if (await canvasBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await canvasBtn.click();
      await page.waitForTimeout(1500);
    }

    await waitForCanvas(page);

    // Open category flyout by clicking lens-canvas again or look for Mitigates in dock
    const mitigatesRow = page.getByText(/Mitigates/i).first();
    if (await mitigatesRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mitigatesRow.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-canvas-mitigates.png`,
      fullPage: false,
    });
  });
});
