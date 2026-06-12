/**
 * Scene 6: TEST RUNNER — Happy Path Demo
 *
 * A polished, demo-friendly walkthrough of the Test Runner:
 *   1. Open Test Runner panel from the header
 *   2. Browse through the seeded scenarios — show the form details
 *   3. Select the cooperative "Regulatory Gap Analysis" scenario (best for demos)
 *   4. Click "Run Test" and watch the live streaming transcript
 *   5. Wait for the run to complete, then show results
 *
 * NOTE: This scene triggers a LIVE Gemini test run. Budget ~3-5 min.
 */

import { test } from '@playwright/test';
import { openProject, breathe, smoothScroll } from './helpers';

test('Scene 6 — Test Runner Happy Path', async ({ page }) => {
  test.setTimeout(300_000); // 5 min — full run can take a while

  await openProject(page);

  // ── Step 1: Open Test Runner ──
  const testsGroupBtn = page.locator('[data-testid="header-group-test"]');
  if (await testsGroupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await testsGroupBtn.click();
    await page.waitForTimeout(500);
  }

  const testRunnerBtn = page.locator('[data-testid="header-test-runner"]');
  if (await testRunnerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await testRunnerBtn.click();
    await page.waitForTimeout(1500);
  }

  // Wait for test runner panel
  const testRunner = page.locator('.test-runner');
  await testRunner.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
    console.log('Test runner not visible');
  });
  await breathe(page, 2000);

  // ── Step 2: Browse each scenario — show form details ──
  const scenarioItems = page.locator('.test-runner__scenario-item');
  const scenarioCount = await scenarioItems.count();

  for (let i = 0; i < Math.min(scenarioCount, 3); i++) {
    await scenarioItems.nth(i).click();
    await page.waitForTimeout(600);

    const form = page.locator('.test-runner__form').first();
    if (await form.isVisible()) {
      // Scroll down to show all fields
      for (let j = 0; j < 4; j++) {
        await smoothScroll(page, '.test-runner__form', 130);
      }
      await breathe(page, i === 0 ? 2500 : 1500);

      // Scroll back to top
      await form.evaluate(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
      await page.waitForTimeout(500);
    }
  }

  // ── Step 3: Select the cooperative scenario (best happy path) ──
  // Look for "Regulatory Gap Analysis" (cooperative) or fall back to first
  const cooperativeScenario = page.locator('.test-runner__scenario-item').filter({
    hasText: 'cooperative',
  }).first();
  if (await cooperativeScenario.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cooperativeScenario.click();
  } else {
    await scenarioItems.first().click();
  }
  await page.waitForTimeout(500);
  await breathe(page, 1500);

  // ── Step 4: Click "Run Test" ──
  const runBtn = page.locator('.test-runner__run-btn').first();
  if (await runBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await runBtn.click();
    await breathe(page, 2000); // Show the "Starting..." state
  }

  // ── Step 5: Watch the live streaming transcript ──
  // The running state shows a spinner on the scenario item
  const spinner = page.locator('.test-runner__running');
  await spinner.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
    console.log('No spinner visible — run may have been instant');
  });

  // Wait for the run to complete — poll the scenario status
  // The spinner disappears and a pass/fail icon appears
  const resultIcon = page.locator('.test-runner__pass, .test-runner__fail');
  await resultIcon.first().waitFor({ state: 'visible', timeout: 240_000 }).catch(() => {
    console.log('Run did not complete within timeout — that is OK for the demo');
  });

  await breathe(page, 3000); // Let the viewer see the result

  // ── Step 6: Show the completed form with results ──
  const form = page.locator('.test-runner__form').first();
  if (await form.isVisible()) {
    // Scroll down through the results
    for (let j = 0; j < 6; j++) {
      await smoothScroll(page, '.test-runner__form', 150);
    }
    await breathe(page, 3000);
  }

  // Close test runner
  await page.keyboard.press('Escape');
  await breathe(page, 1000);
});
