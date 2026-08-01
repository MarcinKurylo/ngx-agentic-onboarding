import { expect, test } from '@playwright/test';

/**
 * Full event-driven flow through the demo, exercising all three pillars end to
 * end in a real browser: the event bus, the declarative config, and the
 * orchestrator driving the Driver.js overlay — including waitForEvent gating
 * and navigateToRoute. This is the regression guard for the "1 step then Done"
 * bug at the top of the pyramid.
 */
test('drives welcome -> create (waits for event) -> dashboard', async ({
  page,
}) => {
  const popover = page.locator('.driver-popover');
  const title = page.locator('.driver-popover-title');
  const nextBtn = page.locator('.driver-popover-next-btn');
  const status = page.locator('.status');

  await page.goto('/');
  await page.getByRole('button', { name: /Uruchom samouczek/ }).click();

  // Step 1/3 — welcome. Must read "Dalej", NOT "Zakończ" (the bug).
  await expect(popover).toBeVisible();
  await expect(title).toHaveText('Witaj! 👋');
  await expect(nextBtn).toHaveText('Dalej');
  await expect(status).toContainText('krok: 1/3');
  await expect(status).toContainText('running');

  await nextBtn.click();

  // Step 2/3 — create. Gated on PROJECT_CREATED: engine waits, Next is hidden.
  await expect(title).toHaveText('Stwórz projekt');
  await expect(status).toContainText('krok: 2/3');
  await expect(status).toContainText('waiting');
  await expect(nextBtn).toBeHidden();

  // Perform the real business action — the host app emits the event.
  await page.locator('#btn-submit').click();

  // Step 3/3 — dashboard. Engine auto-navigated and waited for #chart-main.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(title).toHaveText('Twój panel 📊');
  await expect(nextBtn).toHaveText('Zakończ');
  await expect(status).toContainText('krok: 3/3');

  // Finish the tour.
  await nextBtn.click();
  await expect(popover).toHaveCount(0);
  await expect(status).toContainText('completed');
});
