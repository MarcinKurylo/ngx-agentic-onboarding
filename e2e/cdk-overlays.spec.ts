import { expect, test } from '@playwright/test';

/**
 * Tour D — CDK overlays as first-class tour targets.
 *
 * Regression guard for the CDK top-layer interaction: since CDK 20.1 overlays
 * render in the browser's top layer (native Popover API, `popover="manual"`),
 * which paints above everything regardless of z-index. Without opting out
 * (`OVERLAY_DEFAULT_CONFIG: { usePopover: false }`, set in the demo's app
 * config) the tour's Driver.js overlay ends up *under* the cdkDialog / menu, so
 * the highlighted field looks un-highlighted and the popover is unclickable.
 *
 * The `driver-active-element` assertions below verify the spotlight actually
 * lands on the element inside each overlay; the popover `.click()`s verify the
 * popover sits on top and is interactive.
 */
test('drives a tour through a cdkDialog and a connected-overlay menu', async ({
  page,
}) => {
  const popover = page.locator('.driver-popover');
  const title = page.locator('.driver-popover-title');
  const nextBtn = page.locator('.driver-popover-next-btn');
  const status = page.locator('.status');

  await page.goto('/');
  await page
    .locator('article.tour.cdk')
    .getByRole('button', { name: /Uruchom/ })
    .click();

  // 1/7 — welcome (centered); the engine navigated to /cdk-lab.
  await expect(title).toHaveText('Overlaye CDK 🧩');
  await expect(page).toHaveURL(/\/cdk-lab$/);
  await nextBtn.click();

  // 2/7 — open the dialog (gated on CDK_DIALOG_OPENED).
  await expect(title).toHaveText('Otwórz dialog');
  await expect(status).toContainText('waiting');
  await page.locator('#cdk-open-dialog').click();

  // 3/7 — a field *inside* the cdkDialog is highlighted and the popover is on top.
  await expect(title).toHaveText('Nazwij projekt');
  const nameField = page.locator('#cdk-dialog-name');
  await expect(nameField).toHaveClass(/driver-active-element/);
  await nameField.fill('Orion');
  await nextBtn.click();

  // 4/7 — the dialog's save button is highlighted (gated on CDK_DIALOG_SAVED).
  await expect(title).toHaveText('Zapisz');
  await expect(page.locator('#cdk-dialog-save')).toHaveClass(/driver-active-element/);
  await page.locator('#cdk-dialog-save').click();

  // 5/7 — the menu trigger is highlighted (gated on CDK_MENU_OPENED).
  await expect(title).toHaveText('Rozwiń widok');
  await expect(page.locator('#cdk-menu-trigger')).toHaveClass(/driver-active-element/);
  await page.locator('#cdk-menu-trigger').click();

  // 6/7 — an item *inside* the connected overlay is highlighted (gated on CDK_VIEW_PICKED).
  await expect(title).toHaveText('Wybierz „Tablica”');
  const item = page.locator('#cdk-menu-board');
  await expect(item).toHaveClass(/driver-active-element/);
  await item.click();

  // 7/7 — finish.
  await expect(title).toHaveText('Gotowe 🎉');
  await expect(nextBtn).toHaveText('Zakończ');
  await nextBtn.click();
  await expect(popover).toHaveCount(0);
});
