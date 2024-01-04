import { expect, test, webkit } from '@playwright/test';
import { login } from './utils/roles';
import Map from "./utils/map";

test.describe('meeting multiple users', () => {
  test('can mute video & microphone user', async ({page, browser}) => {
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browser.browserType() === webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    // Go to the empty map
    await page.goto(`http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`);
    // Login user "Alice"
    await login(page, 'Alice');

    // Move user
    await Map.walkTo(page, 'ArrowRight', 3000);

    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    // Go to the empty map
    await userBob.goto(`http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`);
    // Login user "Bob"
    await login(userBob, 'Bob');
    // Move user
    await Map.walkTo(userBob, 'ArrowRight', 3000);

    // The user in the bubble meeting should be visible
    await expect(page.locator('.cameras-container .other-cameras .video-container')).toBeVisible({timeout: 20_000});
    // The user in the bubble meeting should have action button
    await expect(page.locator('.cameras-container .other-cameras .video-container .action-button')).toBeVisible({timeout: 20_000});

    // Click on the action button of "Alice"
    await page.click('.cameras-container .other-cameras .video-container .action-button#more-action');
    // Click on the mute button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-audio-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    await expect(page.locator('.cameras-container .other-cameras .video-container .media-box-camera-off-size')).toBeVisible({timeout: 20_000});
    // Click on the mute video button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-video-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    await expect(page.locator('.cameras-container .other-cameras .video-container.video-off')).toBeVisible({timeout: 20_000});

    page.close();
    userBob.close();
  });

  // TODO create test for jitsi
});