import { expect, test } from '@playwright/test';

const SHOTS = 'test-results/shots';

/**
 * Full event-driven flow through the realistic demo: the engine coordinates a
 * dropdown, a filter reload (loader), a modal and a simulated HTTP create
 * (spinner), then navigates and waits for the dashboard chart to load. It
 * exercises waitForEvent gating, waitForSelector after loaders, and
 * navigateToRoute — all from declarative config.
 */
test('drives the async app: dropdown -> filter -> modal -> create -> dashboard', async ({
  page,
}) => {
  const popover = page.locator('.driver-popover');
  const title = page.locator('.driver-popover-title');
  const nextBtn = page.locator('.driver-popover-next-btn');
  const status = page.locator('.status');

  await page.goto('/');
  await page.getByRole('button', { name: /Run tour/ }).click();

  // 1/8 — welcome. Must read "Next", not "Finish".
  await expect(title).toHaveText('Welcome! 👋');
  await expect(nextBtn).toHaveText('Next');
  await expect(status).toContainText('step: 1/8');
  await nextBtn.click();

  // 2/8 — open the dropdown (gated on MENU_OPENED).
  await expect(title).toHaveText('Open the filter');
  await expect(status).toContainText('waiting');
  await page.locator('#filter-btn').click();

  // 3/8 — pick a filter (gated on FILTER_APPLIED; triggers a reload/loader).
  await expect(title).toHaveText('Pick "Active"');
  await page.locator('#filter-active').click();

  // 4/8 — open the modal (gated on MODAL_OPENED).
  await expect(title).toHaveText('New project');
  await page.locator('#new-project-btn').click();

  // 5/8 — name the project (plain Next). Modal is highlighted.
  await expect(title).toHaveText('Name the project');
  await page.locator('#project-name').fill('Orion');
  await page.screenshot({ path: `${SHOTS}/05-modal.png` });
  await nextBtn.click();

  // 6/8 — submit (gated on PROJECT_CREATED, fired after the simulated request).
  await expect(title).toHaveText('Create');
  await expect(status).toContainText('waiting');
  await page.locator('#modal-submit').click();

  // 7/8 — dashboard: engine navigated and waited for #chart-main after the
  // stats loader resolved.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(title).toHaveText('Your dashboard 📊');
  await expect(page.locator('#chart-main')).toBeVisible();
  await expect(status).toContainText('step: 7/8');
  await page.screenshot({ path: `${SHOTS}/07-dashboard.png` });
  await nextBtn.click();

  // 8/8 — finish.
  await expect(title).toHaveText('All set! 🎉');
  await expect(nextBtn).toHaveText('Finish');
  await nextBtn.click();

  await expect(popover).toHaveCount(0);
  await expect(status).toContainText('completed');
});

test('persists completion: dismissed tour does not reopen until reset', async ({
  page,
}) => {
  const popover = page.locator('.driver-popover');
  const status = page.locator('.status');
  const guarded = page.getByRole('button', { name: 'Start if not completed' });

  await page.goto('/');
  await expect(status).toContainText('completed: no');

  // Start then dismiss via the popover close button — counts as "seen".
  await page.getByRole('button', { name: /Run tour/ }).click();
  await expect(popover).toBeVisible();
  await page.locator('.driver-popover-close-btn').click();
  await expect(popover).toHaveCount(0);
  await expect(status).toContainText('completed: yes');

  // Guarded start must NOT reopen a seen tour.
  await guarded.click();
  await expect(popover).toHaveCount(0);

  // After reset, the guarded start shows it again.
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(status).toContainText('completed: no');
  await guarded.click();
  await expect(popover).toBeVisible();
});
