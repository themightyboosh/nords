/**
 * Scene 5: THE AI SESSION (2:40–3:25)
 *
 * This is the HERO scene. Live AI interaction via Gemini.
 *
 * Script lines to capture:
 *   - Open Preview Chat. Dr. Sharma persona. Guided mode.
 *   - New Session — AI greeting with full context awareness.
 *   - Type: "What's blocking verification?"
 *   - AI responds, traverses graph, identifies gap.
 *   - AI navigates to Risk #5 (adhesive dermatitis), asks about mitigation.
 *   - Type a mitigation answer. AI fills property. Goal progress updates.
 *   - Toggle Dev Mode ON. Show tool call timeline.
 *   - Flash the system prompt tab. Flash the tool call sequence.
 *   - Switch back to Canvas. Show the Risk card has animated to a new position.
 *
 * NOTE: This scene uses LIVE GEMINI. The AI responses are non-deterministic.
 * The selectors target UI elements that appear regardless of AI wording.
 * You may need to re-record this scene if the AI takes an unexpected path.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView, typeSlowly } from './helpers';

test('Scene 5 — AI Session (Live)', async ({ page }) => {
  test.setTimeout(180_000); // AI round-trips can be slow

  await openProject(page);

  // ── Step 1: Set persona to Dr. Sharma before opening chat ──
  const personaDockItem = page.locator('[data-testid="dock-personas"], .nords-dock__item').filter({ hasText: /persona/i });
  if (await personaDockItem.isVisible()) {
    await personaDockItem.click();
    await page.waitForTimeout(800);

    const priya = page.locator('.nords-flyout__row--selectable').filter({ hasText: /Priya Sharma/ }).first();
    if (await priya.isVisible()) {
      await priya.click();
      await page.waitForTimeout(1200);
    }
  }

  // ── Step 2: Open Preview Chat ──
  const chatButton = page.locator('[data-testid="dock-preview"], .nords-dock__item').filter({ hasText: /preview|chat|test/i }).first();
  await chatButton.click();
  await page.waitForTimeout(1500);

  // Wait for the chat panel to appear
  await expect(page.locator('.preview-chat')).toBeVisible({ timeout: 5_000 });
  await breathe(page, 1000);

  // ── Step 3: Start new session — AI greeting will show context awareness ──
  // Check if there's a "New Session" or "Start" button
  const newSessionBtn = page.locator('.preview-chat button, .preview-chat__action').filter({ hasText: /new session|start|reset/i }).first();
  if (await newSessionBtn.isVisible()) {
    await newSessionBtn.click();
    await page.waitForTimeout(2000);
  }

  // Wait for AI greeting to appear (first assistant message)
  await page.waitForSelector('.preview-chat__message--assistant', { timeout: 30_000 });
  await breathe(page, 4000); // Let the viewer read the context-aware greeting

  // ── Step 4: Ask "What's blocking verification?" ──
  const chatInput = page.locator('.preview-chat__input, .preview-chat textarea, input[placeholder*="message"]').first();
  await chatInput.click();
  await page.keyboard.type("What's blocking verification?", { delay: 40 });
  await breathe(page, 800);

  // Press Enter to send
  await page.keyboard.press('Enter');

  // Wait for AI response — this involves tool calls (graph traversal)
  await page.waitForSelector('.preview-chat__message--assistant:nth-child(n+2)', { timeout: 45_000 });
  await breathe(page, 4000); // Show the traversal + gap identification

  // ── Step 5: AI finds Risk #5 (adhesive dermatitis) and asks about mitigation ──
  // Type a mitigation answer
  await chatInput.click();
  await page.keyboard.type(
    "Use hypoallergenic medical-grade silicone adhesive (Dow Corning MG 7-9850) with skin barrier primer. Perform 48-hour patch testing per ISO 10993-10.",
    { delay: 30 }
  );
  await breathe(page, 500);
  await page.keyboard.press('Enter');

  // Wait for AI to process — this triggers nords_update_session_nord + evaluateGoals
  await page.waitForTimeout(5000);

  // Wait for the goal event system message to appear
  const goalMsg = page.locator('.preview-chat__message--system').filter({ hasText: /Goal|📊|🎯/ }).first();
  await goalMsg.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {
    // Goal event might not appear if AI doesn't update goal-bound properties
    console.log('No goal event appeared — continuing');
  });
  await breathe(page, 4000); // Show the goal progress update

  // ── Step 6: Toggle Dev Mode ON ──
  const devModeToggle = page.locator('[data-testid="dev-mode-toggle"], .preview-chat__dev-toggle').first();
  if (await devModeToggle.isVisible()) {
    await devModeToggle.click();
    await breathe(page, 2000);
  }

  // ── Step 7: Flash the tool calls panel ──
  const toolsTab = page.locator('.preview-chat__dev-tab').filter({ hasText: /tool/i }).first();
  if (await toolsTab.isVisible()) {
    await toolsTab.click();
    await breathe(page, 3000); // Show tool call timeline
  }

  // ── Step 8: Flash the system prompt tab ──
  const promptTab = page.locator('.preview-chat__dev-tab').filter({ hasText: /prompt/i }).first();
  if (await promptTab.isVisible()) {
    await promptTab.click();
    await breathe(page, 3000); // Show the full system prompt with persona weights
  }

  // ── Step 9: Flash the horizon tab ──
  const horizonTab = page.locator('.preview-chat__dev-tab').filter({ hasText: /horizon/i }).first();
  if (await horizonTab.isVisible()) {
    await horizonTab.click();
    await breathe(page, 2000);
  }

  // ── Step 10: Close chat, switch back to canvas ──
  // Close the chat panel
  const closeBtn = page.locator('.preview-chat__close, .preview-chat [aria-label="Close"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // The canvas should have auto-refreshed (Fix 1!)
  await fitToView(page);
  await breathe(page, 3000); // Show the canvas with updated card positions

  await breathe(page, 2000);
});
