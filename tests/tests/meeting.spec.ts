import { expect, test } from '@playwright/test';
import {hideNoCamera, login} from './utils/roles';
import Map from "./utils/map";

test.describe('meeting multiple users', () => {
  test('can mute video & microphone user', async ({page, browser, browserName}) => {
    // Go to the empty map
    await page.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`
    );
    // Login user "Alice"
    await login(page, 'Alice');
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
      await hideNoCamera(page);
    }

    // Move user
    await Map.walkTo(page, 'ArrowRight', 3000);

    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    // Go to the empty map
    await userBob.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`
    );
    // Login user "Bob"
    await login(userBob, 'Bob');
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
        await hideNoCamera(userBob);
    }
    // Move user
    await Map.walkTo(userBob, 'ArrowRight', 3000);

    // The user in the bubble meeting should be visible
    await expect(await page.locator('.cameras-container .other-cameras .video-container')).toBeVisible({timeout: 20_000});
    // The user in the bubble meeting should have action button
    await expect(await page.locator('.cameras-container .other-cameras .video-container .action-button')).toBeVisible({timeout: 20_000});

    // Click on the action button of "Alice"
    await page.click('.cameras-container .other-cameras .video-container .action-button#more-action');
    // Click on the mute button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-audio-user');

    // Check if the user has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container .media-box-camera-off-size')).toBeVisible({timeout: 20_000});

    // Click on the mute video button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-video-user');

    // Check if the user has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container.video-off')).toBeVisible({timeout: 20_000});

    page.close();
    userBob.close();
  });

  test('can mute every video & microphone', async ({page, browser, browserName}) => {
    // Go to the empty map
    await page.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`
    );
    // Login user "Alice"
    await login(page, 'Alice');
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
      await hideNoCamera(page);
    }

    // Move user
    await Map.walkTo(page, 'ArrowRight', 3000);

    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    // Go to the empty map
    await userBob.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`
    );
    // Login user "Bob"
    await login(userBob, 'Bob');
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
        await hideNoCamera(userBob);
    }
    // Move user
    await Map.walkTo(userBob, 'ArrowRight', 3000);

    const newBrowser2 = await browser.browserType().launch();
    const userTest = await newBrowser2.newPage();
    // Go to the empty map
    await userTest.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json`
    );
    // Login user "Bob"
    await login(userTest, 'Bob');
    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browserName === "webkit"){
        await hideNoCamera(userTest);
    }
    // Move user
    await Map.walkTo(userTest, 'ArrowRight', 3000);

    // The user in the bubble meeting should be visible
    await expect(await page.locator('.cameras-container .other-cameras .video-container').nth(0)).toBeVisible({timeout: 20_000});
    // The user in the bubble meeting should have action button
    await expect(await page.locator('.cameras-container .other-cameras .video-container .action-button').nth(0)).toBeVisible({timeout: 20_000});

    // Click on the action button of "Alice"
    await page.click('.cameras-container .other-cameras .video-container .action-button#more-action');
    // Click on the mute everybody button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-audio-everybody');

    // Check if the user "Bob" has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container .media-box-camera-off-size').nth(0)).toBeVisible({timeout: 20_000});
    // Check if the user "Test" has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container .media-box-camera-off-size').nth(1)).toBeVisible({timeout: 20_000});

    // Click on the mute video button
    await page.click('.cameras-container .other-cameras .video-container .action-button#mute-video-everybody');

    // Check if the user "Bob" has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container.video-off').nth(0)).toBeVisible({timeout: 20_000});
    // Check if the user "Test" has been muted
    await expect(await page.locator('.cameras-container .other-cameras .video-container.video-off').nth(1)).toBeVisible({timeout: 20_000});

    // Click on the kickoff button
    await page.click('.cameras-container .other-cameras .video-container .action-button#kickoff-user');
    // Check if the user "Bob" has been kicked off
    await expect(await page.locator('.cameras-container .other-cameras .video-container').nth(1)).toBeHidden({timeout: 20_000});
    // Check if the user "Test" hasn't been kicked off
    await expect(await page.locator('.cameras-container .other-cameras .video-container').nth(0)).toBeVisible({timeout: 20_000});

    page.close();
    userBob.close();
    userTest.close();
  });

  // TODO create test for jitsi
});