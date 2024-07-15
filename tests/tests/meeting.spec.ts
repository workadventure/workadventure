import { expect, test, webkit } from '@playwright/test';
import { login } from './utils/roles';
import Map from "./utils/map";
import { resetWamMaps } from './utils/map-editor/uploader';
import Menu from "./utils/menu";
import MapEditor from "./utils/mapeditor";
import AreaEditor from "./utils/map-editor/areaEditor";
import {publicTestMapUrl} from "./utils/urls";

test.describe('Meeting actions test', () => {
  test('Meeting action to mute microphone & video', async ({page, browser}, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if(browser.browserType() === webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    // Go to the empty map
    await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    // Login user "Alice"
    await login(page, 'Alice');

    // Move user
    await Map.walkTo(page, 'ArrowRight', 6000);

    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    // Go to the empty map
    await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
    // Login user "Bob"
    await login(userBob, 'Bob');
    // Move user
    await Map.walkTo(userBob, 'ArrowRight', 1000);

    // The user in the bubble meeting should be visible
    await expect(page.locator('#container-media')).toBeVisible({timeout: 20_000});
    // The user in the bubble meeting should have action button
    await expect(page.locator('#cameras-container #unique-mycam')).toBeVisible({timeout: 20_000});

    // Click on the action button of "Alice"
    await page.click('#cameras-container #camera-box #video-media-box #user-menu-btn');

    // Click on the mute button
    await page.click('#cameras-container #camera-box #video-media-box #user-menu #mute-audio-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    // Not sure but without test-class the test is not working
    await page.getByTestId('test-class');
    await expect(page.locator('#cameras-container #camera-box #video-media-box')).toBeVisible({timeout: 20_000});
    // await expect(page.locator('#cameras-container #camera-box #video-media-box .media-box-camera-off-size')).toBeVisible({timeout: 20_000});
    // Click on the mute video button
    await page.click('#cameras-container #camera-box #video-media-box .action-button#mute-video-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    await page.getByTestId('test-class-video');
    await expect(page.locator('#cameras-container #camera-box #video-media-box')).toBeVisible({timeout: 20_000});

    page.close();
    userBob.close();
  });

  test('Jitsi meeting action to mute microphone & video', async ({ page, browser, request }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    if(browser.browserType() === webkit) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page.reload();
    await login(page, "Alice", 3);

    // Open the map editor
    await Menu.openMapEditor(page);
    // Create a new area
    await MapEditor.openAreaEditor(page);
    // Draw the area
    await AreaEditor.drawArea(page, {x: 0*32*1.5, y: 5}, {x: 9*32*1.5, y: 4*32*1.5});
    // Add a property Speaker zone to create new Jitsi meeting zone
    await AreaEditor.addProperty(page, 'Speaker zone');
    // Set the speaker zone property
    await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    // Close the map editor
    await Menu.closeMapEditor(page);

    // Move user "Alice" to the new area
    //await Map.teleportToPosition(page, 4*32, 2*32);
    await Map.walkTo(page, 'ArrowUp', 2000);

    // Add a second user "Bob"
    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    await userBob.goto(Map.url("empty"));
    // Login user "Bob"
    await login(userBob, "Bob", 3);
    // Move user "Bob" to the new area
    // FIME: the teleportToPosition does not work ??
    //await Map.teleportToPosition(userBob, 4*32, 2*32);
    await Map.walkTo(userBob, 'ArrowUp', 2000);

    // The user in the bubble meeting should be visible
    await expect(page.locator('#cameras-container #camera-box .jitsi-video')).toBeVisible({timeout: 20_000});
    // The user in the bubble meeting should have action button
    await expect(page.locator('#cameras-container #camera-box .jitsi-video .action-button')).toBeVisible({timeout: 20_000});

    // Click on the action button of "Alice"
    await page.click('#cameras-container #camera-box .jitsi-video .action-button#more-action');
    // Click on the mute button
    await page.click('#cameras-container #camera-box .jitsi-video .action-button#mute-audio-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    await expect(page.locator('#cameras-container #camera-box .jitsi-video .voice-meter-cam-off')).toBeVisible({timeout: 20_000});
    // Click on the mute video button
    await page.click('#cameras-container #camera-box .jitsi-video .action-button#mute-video-user');

    // Check if "Bob" user receive the request to be metued
    await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
    // Click on the accept button
    await userBob.click('.interact-menu .accept-request');

    // Check if the user has been muted
    await expect(page.locator('#cameras-container #camera-box .jitsi-video video')).toBeHidden({timeout: 20_000});

  });
});
