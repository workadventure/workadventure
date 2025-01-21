import { expect, test } from '@playwright/test';
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from "./utils/auth";

test.describe('Translation', () => {
  test('can be switched to French', async ({
    browser
  }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/mousewheel.json", "translate"))

    // FIXME test for mobile might be broken
    if(project.name === "mobilechromium") {
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

    // FIXME test for mobile might be broken
    if(project.name === "mobilechromium"){
      await expect(page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
    }
    await page.getByTestId('action-user').click();         // new way
    await expect(page.locator('button:has-text("Paramètres")')).toBeVisible();

    await page.close();
    await page.context().close();
  });
});
