import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import {publicTestMapUrl} from "./utils/urls";

test.describe('Translation', () => {
  test('can be switched to French', async ({
    page
  }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    await page.goto(
      publicTestMapUrl("tests/mousewheel.json", "translate")
    );

    await login(page, 'Alice', 2, 'en-US');

    if(project.name === "mobilechromium"){
      await expect(page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
    }
    await page.getByTestId('action-user').click();         // new way
    await page.click('button:has-text("Settings")');
    await page.selectOption('.languages-switcher', 'fr-FR');

    await page.reload();

    if(project.name === "mobilechromium"){
      await expect(page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
    }
    await page.getByTestId('action-user').click();         // new way
    await expect(page.locator('button:has-text("Paramètres")')).toBeVisible();
  });
});
