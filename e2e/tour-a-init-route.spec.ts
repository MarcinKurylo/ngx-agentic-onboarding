import { expect, test } from '@playwright/test';

// Regression: the flagship tour must land on its own start route (home) on init,
// like the other three tours do — even when launched from a different route.
test('Full flow tour navigates home on init when launched from another route', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page
    .locator('article.tour', { hasText: 'Full flow' })
    .getByRole('button', { name: /Run tour/ })
    .click();

  // Must return to home and highlight the welcome card there.
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.locator('.driver-popover-title')).toHaveText('Welcome! 👋');
  await expect(page.locator('#welcome-card')).toHaveClass(/driver-active-element/);
});
