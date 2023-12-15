import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import {RENDERER_MODE} from "./utils/environment";

test.describe('Translation', () => {
  test('can be switched to French', async ({
    page,
  }) => {
    await page.goto(
      `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page);

    await page.click('#menuIcon img:first-child');
    await page.click('button:has-text("Settings")');
    await page.selectOption('.languages-switcher', 'fr-FR');

    await page.reload();
    await page.click('#menuIcon img:first-child');
    await expect(page.locator('button:has-text("Paramètres")')).toBeVisible();
  });
});
