import { expect, Page, test } from '@playwright/test';

/**
 * Multi-tour coverage: two extra scenarios (dashboard + settings) that live
 * alongside the flagship tour, each with its own persistence, and the
 * conditional-step (`enabled`) behaviour driven by the shared account plan.
 */

const title = (p: Page) => p.locator('.driver-popover-title');
const nextBtn = (p: Page) => p.locator('.driver-popover-next-btn');

function launch(page: Page, cardText: string) {
  return page
    .locator('article.tour', { hasText: cardText })
    .getByRole('button', { name: 'Run' });
}

test('dashboard tour: navigates by route and SKIPS the premium step on the free plan', async ({
  page,
}) => {
  await page.goto('/');
  await launch(page, 'Dashboard in 60 seconds').click();

  // Engine navigated to the dashboard route for the first (centered) step.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(title(page)).toHaveText('Dashboard in 60 seconds 📈');
  await nextBtn(page).click();

  // KPI tiles appear only after the stats loader resolves — engine waits.
  await expect(title(page)).toHaveText('Your KPIs');
  await nextBtn(page).click();

  // Range step is gated on RANGE_CHANGED; picking a segment (inside the
  // highlighted box) fires it and triggers a reload.
  await expect(title(page)).toHaveText('Change the range');
  await page.locator('#range-seg').getByRole('button', { name: '90 days' }).click();

  // Free plan: the '#insights-panel' step is disabled, so it is skipped and we
  // land on the chart step directly.
  await expect(title(page)).toHaveText('Trend');
  await nextBtn(page).click();

  await expect(title(page)).toHaveText("That's it 🎉");
  await expect(nextBtn(page)).toHaveText('Finish');
  await nextBtn(page).click();

  await expect(page.locator('.driver-popover')).toHaveCount(0);
  // Independent persistence: this tour is now marked seen.
  await expect(
    page.locator('article.tour', { hasText: 'Dashboard in 60 seconds' }),
  ).toContainText('completed');
});

test('dashboard tour: SHOWS the premium step once the plan is team', async ({
  page,
}) => {
  // Flip the plan to team on the settings page first.
  await page.goto('/settings');
  await page.locator('#plan-toggle').getByRole('button', { name: 'Team' }).click();
  await expect(page.locator('#team-section')).toBeVisible();

  await launch(page, 'Dashboard in 60 seconds').click();
  await expect(title(page)).toHaveText('Dashboard in 60 seconds 📈');
  await nextBtn(page).click(); // KPI
  await expect(title(page)).toHaveText('Your KPIs');
  await nextBtn(page).click(); // range
  await expect(title(page)).toHaveText('Change the range');
  await page.locator('#range-seg').getByRole('button', { name: '7 days' }).click();

  // Team plan: the premium step is now enabled and shown before the chart.
  await expect(title(page)).toHaveText('Premium insights 🔒');
  await expect(page.locator('#insights-panel')).toBeVisible();
});

test('settings tour: team-only step shows and the save step advances on SETTINGS_SAVED', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.locator('#plan-toggle').getByRole('button', { name: 'Team' }).click();

  await launch(page, 'Account setup').click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(title(page)).toHaveText('Account setup ⚙️');
  await nextBtn(page).click(); // name

  await expect(title(page)).toHaveText('Display name');
  await nextBtn(page).click(); // plan

  await expect(title(page)).toHaveText('Your plan');
  await nextBtn(page).click(); // team section (enabled on team)

  await expect(title(page)).toHaveText('Team settings');
  await nextBtn(page).click(); // save (gated on SETTINGS_SAVED)

  await expect(title(page)).toHaveText('Save changes');
  await page.locator('#save-btn').click(); // fires SETTINGS_SAVED after the fake request

  await expect(title(page)).toHaveText('All done ✅');
  await expect(nextBtn(page)).toHaveText('Finish');
  await nextBtn(page).click();
  await expect(page.locator('.driver-popover')).toHaveCount(0);
});
