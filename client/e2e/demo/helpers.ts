/**
 * helpers.ts — Shared utilities for demo recording scripts.
 *
 * Provides login bypass, project navigation, and cinematic wait helpers.
 */

import { Page, expect } from '@playwright/test';

/**
 * The project ID of the Meridian Medical demo.
 * This is set by the seed script — run it first!
 * Check the seed output for the exact ID, or query the DB:
 *   SELECT id FROM projects WHERE name LIKE 'Pulse Sense%' LIMIT 1;
 */
export const DEMO_PROJECT_ID = process.env.DEMO_PROJECT_ID || '4618e912-6b6a-4d99-a75a-0ef333ae6072';

/** Navigate to the demo project and wait for canvas to render */
export async function openProject(page: Page) {
  await page.goto(`/project/${DEMO_PROJECT_ID}`);
  // Wait for the workspace shell to load (any view)
  await page.waitForSelector('.nords-canvas, .matrix-view, .board-view, [data-testid="view-toggle-graph"]', { timeout: 15_000 });
  // Ensure we're on the Graph (canvas) view — click Graph tab
  const graphTab = page.locator('button').filter({ hasText: 'Graph' }).first();
  if (await graphTab.isVisible()) {
    await graphTab.click();
    await page.waitForTimeout(1000);
  }
  // Wait for at least some nord cards to render on the canvas
  await expect(page.locator('[data-testid^="nord-node-"]').first()).toBeVisible({ timeout: 15_000 });
  // Let React Flow settle
  await page.waitForTimeout(1500);
}

/** Cinematic pause — let the viewer absorb what just happened */
export async function breathe(page: Page, ms = 2000) {
  await page.waitForTimeout(ms);
}

/** Slow human-like typing into an input */
export async function typeSlowly(page: Page, selector: string, text: string, delayMs = 50) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char, { delay: delayMs });
  }
}

/** Click the zoom-to-fit button and wait for the animation */
export async function fitToView(page: Page) {
  await page.click('[data-testid="zoom-fit"]');
  await page.waitForTimeout(1000);
}

/** Smooth scroll wheel zoom at a specific point */
export async function smoothZoom(page: Page, x: number, y: number, deltaY: number, steps = 5) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, deltaY / steps);
    await page.waitForTimeout(100);
  }
}

/** Smooth drag a card from its current position to a relative offset */
export async function dragCard(page: Page, selector: string, offsetX: number, offsetY: number) {
  const el = page.locator(selector);
  const box = await el.boundingBox();
  if (!box) throw new Error(`Element not found: ${selector}`);

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(cx + offsetX, cy + offsetY, { steps: 25 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/** Click a dock button by its label text */
export async function clickDockButton(page: Page, label: string) {
  await page.locator('.nords-dock__item').filter({ hasText: label }).click();
  await page.waitForTimeout(500);
}

/** Click a flyout row by text content */
export async function clickFlyoutRow(page: Page, text: string) {
  await page.locator('.nords-flyout__row--selectable').filter({ hasText: text }).click();
  await page.waitForTimeout(800);
}

/** Pan the canvas by dragging the background */
export async function panCanvas(page: Page, dx: number, dy: number) {
  const canvas = page.locator('.react-flow__pane');
  const box = await canvas.boundingBox();
  if (!box) return;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(startX + dx, startY + dy, { steps: 30 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(500);
}

/** Wait for a node to be visible on the canvas */
export async function waitForNode(page: Page, nodeId: string, timeout = 10_000) {
  await expect(page.locator(`[data-testid="nord-node-${nodeId}"]`)).toBeVisible({ timeout });
}
