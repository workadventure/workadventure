import { expect, test } from '@playwright/test';
import {RENDERER_MODE} from "./utils/environment";
import {publicTestMapUrl} from "./utils/urls";
import Map from "./utils/map";
import {isMobile} from "./utils/isMobile";

test.describe('Error pages', () => {
  test.beforeEach(async ({ page }) => {
    if (isMobile(page)) {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
    }
  });
  test('successfully displayed for unsupported URLs', async ({ page }) => {
    await page.goto(
      `/@/not/supported?phaserMode=${RENDERER_MODE}`
    );
    await expect(page.getByText('Unsupported URL format')).toBeVisible();
  });

  test('successfully displayed for not found public pages', async ({ page }) => {
    await page.goto(
        publicTestMapUrl("does/not/exist", "error_pages")
    );

    await page.fill('input[name="loginSceneName"]', 'Alice');
    await page.click('button.loginSceneFormSubmit');
    await page.click('button.selectCharacterSceneFormSubmit');
    await page.click("text=Save");

    await expect(page.getByText('An error occurred')).toBeVisible();
  });

  test('successfully displayed for not found WAM', async ({ page }) => {
    await page.goto(
        Map.url("not-found")
    );

    await page.fill('input[name="loginSceneName"]', 'Alice');
    await page.click('button.loginSceneFormSubmit');
    await page.click('button.selectCharacterSceneFormSubmit');
    await page.click("text=Save");

    await expect(page.getByText('An error occurred')).toBeVisible();
  });

  test('successfully displayed for resources not found', async ({ page }) => {
    // Let's test a clear error message is displayed when a resource is not found
    await page.goto(
        publicTestMapUrl("tests/MapWithError/error.json", "error_pages")
    );

    await page.fill('input[name="loginSceneName"]', 'Alice');
    await page.click('button.loginSceneFormSubmit');
    await page.click('button.selectCharacterSceneFormSubmit');
    await page.click("text=Save");

    await expect(page.getByText('An error occurred')).toBeVisible();
    await expect(page.getByText('NETWORK_ERROR')).toBeVisible();
    await expect(page.getByText('not_exists.png')).toBeVisible();
  });
});
