import { expect, test } from '@playwright/test';

test.describe('Error pages', () => {
  test('successfully displayed for unsupported URLs', async ({ page }) => {
    await page.goto(
      'http://play.workadventure.localhost/@/not/supported'
    );

    await expect(page.getByText('Unsupported URL format')).toBeVisible();
  });

  test('successfully displayed for not found pages', async ({ page }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/does/not/exist'
    );

    await page.fill('input[name="loginSceneName"]', 'Alice');
    await page.click('button.loginSceneFormSubmit');
    await page.click('button.selectCharacterSceneFormSubmit');
    await page.click("text=Let's go!");

    await expect(page.getByText('An error occurred')).toBeVisible();
  });
});
