import { expect, test } from '@playwright/test';
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('Translation', () => {
  test.beforeEach(async ({ page }) => {
  test.skip(isMobile(page), 'Skip on mobile devices');
  });
  test('can be switched to French', async ({ browser }) => {
    await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/mousewheel.json", "translate"))

    await page.getByTestId('action-user').click();         // new way
    await page.click('button:has-text("Settings")');
    await page.selectOption('.languages-switcher', 'fr-FR');

    await page.reload();
    await page.getByTestId('action-user').click();         // new way
    await expect(page.locator('button:has-text("Paramètres")')).toBeVisible();


    await page.context().close();
  });
});
