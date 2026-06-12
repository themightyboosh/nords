/**
 * Scene 6: SESSION EXPLORER (3:25–3:50)
 *
 * Script lines to capture:
 *   - Open Session Explorer from the header Test group.
 *   - Show the session list — filter by Tests, then All.
 *   - Select the session that was just created in Scene 5.
 *   - Browse all 4 tabs: Conversation, Events, Metrics, Collection.
 *   - Click "Score This Session" to show the scorer cards.
 *   - Expand a scorer card to show detailed breakdown.
 */

import { test, expect } from '@playwright/test';
import { openProject, breathe } from './helpers';

test('Scene 6 — Session Explorer', async ({ page }) => {
  await openProject(page);

  // ── Open Sessions from the Test header group ──
  const testsGroupBtn = page.locator('[data-testid="header-group-test"]');
  if (await testsGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await testsGroupBtn.click();
    await page.waitForTimeout(500);
  }

  const sessionsBtn = page.locator('[data-testid="header-sessions"]');
  if (await sessionsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sessionsBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for the Session Explorer panel
  const explorer = page.locator('[data-testid="session-explorer"]');
  await explorer.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
    console.log('Session explorer not found');
  });
  await breathe(page, 2000); // Show the session list

  // ── Filter by "Tests" to show test/chat sessions ──
  const testsFilter = page.locator('[data-testid="filter-tests"]');
  if (await testsFilter.isVisible().catch(() => false)) {
    await testsFilter.click();
    await page.waitForTimeout(1000);
    await breathe(page, 1500);
  }

  // ── Switch back to "All" to show all session types ──
  const allFilter = page.locator('[data-testid="filter-all"]');
  if (await allFilter.isVisible().catch(() => false)) {
    await allFilter.click();
    await page.waitForTimeout(1000);
    await breathe(page, 1000);
  }

  // ── Select the first (most recent) session ──
  const firstSession = page.locator('.session-explorer__session-row').first();
  if (await firstSession.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstSession.click();
    await page.waitForTimeout(1000);
    await breathe(page, 2500); // Show Conversation tab with messages

    // ── Switch to Events tab ──
    const eventsTab = page.locator('.session-explorer__tab').filter({ hasText: 'Events' });
    if (await eventsTab.isVisible().catch(() => false)) {
      await eventsTab.click();
      await page.waitForTimeout(800);
      await breathe(page, 2500); // Show the event timeline with action types

      // Scroll down through events
      const eventList = page.locator('.session-explorer__event-list');
      if (await eventList.isVisible()) {
        for (let i = 0; i < 3; i++) {
          await eventList.evaluate(el => el.scrollTo({ top: el.scrollTop + 200, behavior: 'smooth' }));
          await page.waitForTimeout(400);
        }
        await breathe(page, 1500);
      }
    }

    // ── Switch to Metrics tab ──
    const metricsTab = page.locator('.session-explorer__tab').filter({ hasText: 'Metrics' });
    if (await metricsTab.isVisible().catch(() => false)) {
      await metricsTab.click();
      await page.waitForTimeout(1000);
      await breathe(page, 2000);

      // Click "Score This Session" if available
      const scoreBtn = page.locator('.session-explorer__score-btn');
      if (await scoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scoreBtn.click();
        // Wait for scoring to complete (~30s)
        await page.waitForTimeout(5000);
        
        // Wait for the scoring spinner to disappear (scores loaded)
        await page.locator('.session-explorer__scorer-grid').waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {
          console.log('Scorer grid did not appear');
        });
        await breathe(page, 3000); // Show the scorer cards with scores
      }

      // Expand a scorer card to show details
      const scorerCards = page.locator('.session-explorer__scorer-card');
      const cardCount = await scorerCards.count();
      if (cardCount > 0) {
        // Click the first scorer card to expand it
        await scorerCards.first().click();
        await breathe(page, 2500);

        // Click second card if available
        if (cardCount > 1) {
          await scorerCards.nth(1).click();
          await breathe(page, 2000);
        }

        // Click third card
        if (cardCount > 2) {
          await scorerCards.nth(2).click();
          await breathe(page, 2000);
        }
      }
    }

    // ── Switch to Collection tab ──
    const collectionTab = page.locator('.session-explorer__tab').filter({ hasText: 'Collection' });
    if (await collectionTab.isVisible().catch(() => false)) {
      await collectionTab.click();
      await page.waitForTimeout(800);
      await breathe(page, 2000);

      // Expand a variable to show the collection round detail
      const varRows = page.locator('.session-explorer__var-row');
      const varCount = await varRows.count();
      if (varCount > 0) {
        await varRows.first().click();
        await breathe(page, 2000); // Show the user→agent conversation that collected this variable

        if (varCount > 1) {
          await varRows.nth(1).click();
          await breathe(page, 1500);
        }
      }
    }

    // ── Switch back to Conversation for a final look ──
    const convoTab = page.locator('.session-explorer__tab').filter({ hasText: 'Conversation' });
    if (await convoTab.isVisible().catch(() => false)) {
      await convoTab.click();
      await breathe(page, 1500);
    }

    // ── Click "Replay" to show the session replay in the PreviewChat ──
    const replayBtn = page.locator('.session-explorer__action-btn').filter({ hasText: 'Replay' });
    if (await replayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await replayBtn.click();
      await page.waitForTimeout(2000); // Wait for the replay to load and chat to open

      // Watch the replay — messages drip in with typing animation
      const previewChat = page.locator('.preview-chat');
      if (await previewChat.isVisible({ timeout: 5000 }).catch(() => false)) {
        await breathe(page, 5000); // Watch the first few messages animate in

        // Scroll down the chat to follow the replay
        const chatBody = page.locator('.preview-chat__body');
        if (await chatBody.isVisible()) {
          await chatBody.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
          await page.waitForTimeout(600);
        }
        await breathe(page, 5000); // Watch more messages stream in

        // Scroll to bottom again to catch latest
        if (await chatBody.isVisible()) {
          await chatBody.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
          await page.waitForTimeout(600);
        }
        await breathe(page, 3000); // Final look at the replay

        // Close the replay chat
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } else {
      // Close the explorer if replay wasn't available
      await page.keyboard.press('Escape');
    }
  }

  await breathe(page, 1000);
});
