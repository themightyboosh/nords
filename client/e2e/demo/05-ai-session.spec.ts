/**
 * Scene 5: THE AI SESSION (2:40–3:25)
 *
 * This is the HERO scene. Live AI interaction via Gemini.
 *
 * Script lines to capture:
 *   - Open Test Runner. Show the test scenarios.
 *   - Select a test — scroll down to show all editable details.
 *   - Open Preview Chat. Dr. Sharma persona. Guided mode.
 *   - Type a message — AI responds with full context awareness.
 *   - Type: "What's blocking verification?"
 *   - AI responds, traverses graph, identifies gap.
 *   - Type a mitigation answer. AI fills property. Goal progress updates.
 *   - Toggle Dev Mode ON. Show tool call timeline.
 *   - Flash the system prompt tab.
 *   - Switch back to Canvas. Show the Risk card has animated to a new position.
 *
 * NOTE: This scene uses LIVE GEMINI. The AI responses are non-deterministic.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe, fitToView } from './helpers';

test('Scene 5 — AI Session (Live)', async ({ page }) => {
  test.setTimeout(180_000); // AI round-trips can be slow

  await openProject(page);

  // ── Step 1: Open Test Runner to show test scenarios and form details ──
  const testsGroupBtn = page.locator('[data-testid="header-group-test"]');
  if (await testsGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await testsGroupBtn.click();
    await page.waitForTimeout(500);

    const testRunnerBtn = page.locator('[data-testid="header-test-runner"]');
    if (await testRunnerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await testRunnerBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // Wait for the test runner panel
  const testRunner = page.locator('.test-runner');
  if (await testRunner.isVisible({ timeout: 5000 }).catch(() => false)) {
    await breathe(page, 2000);

    // Click first scenario
    const firstScenario = page.locator('.test-runner__scenario-item').first();
    if (await firstScenario.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstScenario.click();
      await page.waitForTimeout(1000);
      await breathe(page, 2000);

      // Scroll the form to show all fields
      const testForm = page.locator('.test-runner__form, .test-runner__content').first();
      if (await testForm.isVisible()) {
        for (let i = 0; i < 5; i++) {
          await testForm.evaluate(el => el.scrollTo({ top: el.scrollTop + 150, behavior: 'smooth' }));
          await page.waitForTimeout(400);
        }
        await breathe(page, 2000);
        await testForm.evaluate(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(800);
      }
    }

    // Close test runner
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── Step 2: Open Preview Chat — clear stale position so centered default kicks in ──
  await page.evaluate(() => {
    localStorage.removeItem('nords-preview-chat-rect');
  });

  if (await testsGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await testsGroupBtn.click();
    await page.waitForTimeout(500);
  }
  const previewBtn = page.locator('[data-testid="header-preview"]');
  if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await previewBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for the chat panel
  const chatPanel = page.locator('.preview-chat');
  await chatPanel.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
    console.log('Preview chat panel not found');
  });
  await breathe(page, 1000);

  // ── Step 3: Reset session to get a clean start ──
  const resetBtn = page.locator('button[title="Reset Session"]').first();
  if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await resetBtn.click();
    await page.waitForTimeout(1500);
  }

  // ── Step 4: Type first message — the session starts on first send ──
  const chatInput = page.locator('.preview-chat textarea, .preview-chat input[type="text"], [placeholder*="message"]').first();
  if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatInput.click();
    await page.keyboard.type("What's blocking verification?", { delay: 40 });
    await breathe(page, 800);
    await page.keyboard.press('Enter');

    // Wait for AI response (shorter timeout — don't blow the test budget)
    const assistantMsg = page.locator('.preview-chat__message--assistant').first();
    await assistantMsg.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {
      console.log('No assistant message appeared');
    });
    await breathe(page, 3000);

    // ── Step 5: Type a mitigation answer ──
    await chatInput.click();
    await page.keyboard.type(
      "Use hypoallergenic medical-grade silicone adhesive with skin barrier primer. Perform 48-hour patch testing per ISO 10993-10.",
      { delay: 30 }
    );
    await breathe(page, 500);
    await page.keyboard.press('Enter');

    // Wait for second AI response
    await page.waitForTimeout(3000);
    const secondResponse = page.locator('.preview-chat__message--assistant').nth(1);
    await secondResponse.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {
      console.log('No second assistant response');
    });
    await breathe(page, 3000);
  }

  // ── Step 6: Toggle Dev Mode ON ──
  const devModeToggle = page.locator('[data-testid="dev-mode-toggle"], button[title*="Dev"], .preview-chat__dev-toggle').first();
  if (await devModeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await devModeToggle.click();
    await breathe(page, 2000);
  }

  // ── Step 7: Flash the tool calls / system prompt tabs ──
  const devTabs = page.locator('.preview-chat__dev-tab, [class*="dev-tab"]');
  const tabCount = await devTabs.count();
  for (let i = 0; i < Math.min(tabCount, 3); i++) {
    await devTabs.nth(i).click();
    await breathe(page, 2000);
  }

  // ── Step 8: Close chat, switch back to canvas ──
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  await fitToView(page);
  await breathe(page, 3000);
});
