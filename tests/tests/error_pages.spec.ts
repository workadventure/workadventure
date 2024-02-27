import { expect, test } from '@playwright/test';
import {RENDERER_MODE} from "./utils/environment";

test.describe('Error pages', () => {
  test('successfully displayed for unsupported URLs', async ({ page }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechrome") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    
    await page.goto(
      `/@/not/supported?phaserMode=${RENDERER_MODE}`
    );

    await expect(page.getByText('Unsupported URL format')).toBeVisible();
  });

  test('successfully displayed for not found pages', async ({ page }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechrome") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    
    await page.goto(
        `/_/global/maps.workadventure.localhost/does/not/exist?phaserMode=${RENDERER_MODE}`
    );

    await page.fill('input[name="loginSceneName"]', 'Alice');
    await page.click('button.loginSceneFormSubmit');
    await page.click('button.selectCharacterSceneFormSubmit');
    await page.click("text=Let's go!");

    await expect(page.getByText('An error occurred')).toBeVisible();
  });
});
