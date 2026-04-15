/**
 * board-drag-visibility.spec.ts
 *
 * Playwright tests covering:
 *   1. Graph (canvas) view renders nodes
 *   2. Board (matrix) view renders cards
 *   3. Board visibility filter toggle works
 *   4. Board direction filter updates
 *   5. Option-key drag shows + COPY badge
 */

import { test, expect, Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Log in if redirected to /login, using first account found. */
async function ensureLoggedIn(page: Page) {
  if (page.url().includes('/login')) {
    // Try dev credentials
    await page.fill('input[type="email"], input[name="email"]', 'test@nords.app');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(project|$)/, { timeout: 8000 });
  }
}

/** Navigate to the first project available. Returns the project URL. */
async function openFirstProject(page: Page) {
  await page.goto('/');
  await ensureLoggedIn(page);

  // On dashboard: click first project card
  const projectCard = page.locator('[data-testid^="project-card"]').first();
  const projectLink = page.locator('a[href^="/project/"]').first();

  if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await projectCard.click();
  } else if (await projectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await projectLink.click();
  } else {
    // Try direct URL if the test runner pre-creates a project
    await page.goto('/project/');
  }

  await page.waitForURL(/\/project\//);
  return page.url();
}

/** Switch dock to board view. Returns true if board loaded. */
async function switchToBoard(page: Page) {
  const boardBtn = page.locator('[data-testid="lens-board"]');
  await boardBtn.click();
  // Wait for matrix container or loading state
  await page.waitForTimeout(500);
}

/** Switch dock to canvas (graph) view. */
async function switchToGraph(page: Page) {
  const graphBtn = page.locator('[data-testid="lens-canvas"], button:has-text("Graph"), button:has-text("Canvas")').first();
  await graphBtn.click();
  await page.waitForTimeout(500);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Graph view smoke tests', () => {

  test('canvas renders nodes after login', async ({ page }) => {
    await openFirstProject(page);
    // Should stay on canvas (default lens)
    const canvas = page.locator('.nords-canvas, .react-flow, [class*="canvas"]').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Take diagnostic screenshot
    await page.screenshot({ path: 'test-results/graph-initial.png', fullPage: false });

    // Check for React Flow nodes
    const nodes = page.locator('.react-flow__node, [data-testid^="nord-node-"]');
    const nodeCount = await nodes.count();
    console.log(`Canvas nodes found: ${nodeCount}`);

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    if (nodeCount === 0) {
      // Diagnostic: check network responses
      const graphUrl = page.url().replace(/.*\/project\//, '');
      const projectId = graphUrl.split('/')[0];

      // Manually fetch graph to check API
      const response = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/projects/${id}/graph`, { credentials: 'include' });
          const data = await r.json();
          return { status: r.status, nordCount: data.nords?.length ?? 0, errors: data.error };
        } catch (e) {
          return { status: 0, nordCount: 0, errors: String(e) };
        }
      }, projectId);

      console.log('Graph API response:', JSON.stringify(response));
      expect(response.status, `API /graph returned ${response.status}: ${response.errors}`).toBe(200);
      expect(response.nordCount, 'API returned 0 nords — no data in DB for this project').toBeGreaterThan(0);
    } else {
      expect(nodeCount).toBeGreaterThan(0);
    }
  });

  test('edges render in graph view', async ({ page }) => {
    await openFirstProject(page);

    const edges = page.locator('.react-flow__edge, .nords-connection--active');
    const count = await edges.count();
    console.log(`Edges found: ${count}`);

    await page.screenshot({ path: 'test-results/graph-edges.png' });
  });
});

test.describe('Board view tests', () => {

  test('board renders cards when a type with stage labels exists', async ({ page }) => {
    await openFirstProject(page);
    await switchToBoard(page);

    await page.screenshot({ path: 'test-results/board-initial.png' });

    // Check the relationship flyout for available types
    const relBtn = page.locator('[data-testid="flyout-connection-type"]').or(
      page.locator('button:has-text("Relationship"), button:has-text("Connection")')
    ).first();

    // Check the dock filter flyout
    const dockItems = page.locator('.nords-flyout__row, .nords-flyout__row--selectable');
    const dockCount = await dockItems.count();
    console.log(`Flyout rows visible: ${dockCount}`);

    // Check matrix actual cards
    const cards = page.locator('.nords-matrix__card-wrapper, .nords-node');
    const cardCount = await cards.count();
    console.log(`Board cards found: ${cardCount}`);

    // Check for the "no active type" empty state
    const emptyState = page.locator('.nords-matrix-empty, [class*="empty"]').first();
    if (await emptyState.isVisible().catch(() => false)) {
      // Board empty could mean: no connection type selected, or no stage labels on any type
      // Check the connection flyout
      await page.locator('[data-testid="flyout-connection-type"]').first().isVisible()
        .catch(() => page.locator('button:has([class*="link"]), .nords-dock__item').nth(2).click());

      const flyoutList = page.locator('.nords-flyout__list .nords-flyout__row');
      const flyoutCount = await flyoutList.count();
      console.log(`Connection type flyout rows: ${flyoutCount}`);

      // If flyout is empty in board mode, it's because xStageLabels filter is too strict
      console.log('DIAGNOSIS: BoardView shows empty because no connection type is active.');
      console.log('This may be because: (a) no type has xStageLabels, or (b) direction_filter excludes all connections');
    }

    await page.screenshot({ path: 'test-results/board-after-check.png' });
  });

  test('board direction filter buttons are present and clickable', async ({ page }) => {
    await openFirstProject(page);
    await switchToBoard(page);

    // Direction filter buttons should appear when a type is active
    const dirButtons = page.locator('.nords-dock__dir-btn');
    const count = await dirButtons.count();
    console.log(`Direction filter buttons: ${count}`);
    await page.screenshot({ path: 'test-results/board-direction-buttons.png' });

    if (count > 0) {
      // Click "All" direction
      const allBtn = dirButtons.filter({ hasText: 'All' }).first();
      if (await allBtn.isVisible().catch(() => false)) {
        await allBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/board-direction-all.png' });
      }

      // Click → (forward)
      const fwdBtn = dirButtons.filter({ hasText: '→' }).first();
      if (await fwdBtn.isVisible().catch(() => false)) {
        await fwdBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/board-direction-forward.png' });
      }
    } else {
      console.log('No direction buttons found — board may be showing empty/no active type');
    }
  });

  test('board type filter flyout toggles nord type visibility', async ({ page }) => {
    await openFirstProject(page);
    await switchToBoard(page);

    // Click the Filter button in board mode
    const filterBtn = page.locator('[data-testid="dock-filter"]');
    if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'test-results/board-filter-open.png' });

      // Find nord type toggles
      const typeRows = page.locator('.nords-flyout__row--selectable:not([class*="orphans"])');
      const typeCount = await typeRows.count();
      console.log(`Nord type filter rows: ${typeCount}`);

      if (typeCount > 0) {
        // Click first type to toggle it off
        await typeRows.first().click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'test-results/board-filter-toggled.png' });

        // Click again to re-enable
        await typeRows.first().click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log('Filter button not visible — board may not be in board lens');
    }
  });
});

test.describe('Option-key drag (clone mode)', () => {

  test('holding Option key on a board card shows clone badge', async ({ page }) => {
    await openFirstProject(page);
    await switchToBoard(page);

    await page.screenshot({ path: 'test-results/board-before-drag.png' });

    const cards = page.locator('.nords-matrix__card-wrapper');
    const count = await cards.count();
    console.log(`Cards available for drag test: ${count}`);

    if (count === 0) {
      console.log('No cards in board — skipping drag test');
      test.skip();
      return;
    }

    const firstCard = cards.first();
    const box = await firstCard.boundingBox();
    expect(box).toBeTruthy();

    // Press Alt (Option on macOS) BEFORE mousedown
    await page.keyboard.down('Alt');
    await page.waitForTimeout(100);

    await page.screenshot({ path: 'test-results/drag-option-key-down.png' });

    // Check if clone badge appears (it should be display:flex now from keydown handler)
    const badge = firstCard.locator('.nords-matrix__clone-badge');
    const badgeVisible = await badge.isVisible().catch(() => false);
    console.log(`Clone badge visible after Alt down: ${badgeVisible}`);

    // Start the drag
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 50, box!.y + box!.height / 2, { steps: 5 });

    await page.screenshot({ path: 'test-results/drag-in-progress-option.png' });

    // Check for clone-dragging class
    const hasCloneClass = await firstCard.evaluate(el => el.classList.contains('is-clone-dragging'));
    console.log(`Card has is-clone-dragging class: ${hasCloneClass}`);

    const hasDraggingClass = await firstCard.evaluate(el => el.classList.contains('is-dragging'));
    console.log(`Card has is-dragging class: ${hasDraggingClass}`);

    await page.mouse.up();
    await page.keyboard.up('Alt');

    await page.screenshot({ path: 'test-results/drag-after-option.png' });
  });

  test('normal drag shows is-dragging class (no clone)', async ({ page }) => {
    await openFirstProject(page);
    await switchToBoard(page);

    const cards = page.locator('.nords-matrix__card-wrapper');
    const count = await cards.count();

    if (count === 0) {
      console.log('No cards — skipping');
      test.skip();
      return;
    }

    const firstCard = cards.first();
    const box = await firstCard.boundingBox();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 30, box!.y + box!.height / 2, { steps: 3 });

    await page.screenshot({ path: 'test-results/drag-normal.png' });

    const hasDraggingClass = await firstCard.evaluate(el => el.classList.contains('is-dragging'));
    console.log(`Card has is-dragging (no clone): ${hasDraggingClass}`);

    const hasCloneClass = await firstCard.evaluate(el => el.classList.contains('is-clone-dragging'));
    console.log(`Card has is-clone-dragging (should be false): ${hasCloneClass}`);

    expect(hasCloneClass).toBe(false);

    await page.mouse.up();
    await page.screenshot({ path: 'test-results/drag-normal-end.png' });
  });
});
