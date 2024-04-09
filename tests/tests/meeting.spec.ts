import {expect, test} from '@playwright/test';
import {login} from './utils/roles';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
/*import {oidcAdminTagLogin, oidcLogout} from "./utils/oidc";
import { resetWamMaps } from './utils/map-editor/uploader';
import Menu from "./utils/menu";
import MapEditor from "./utils/mapeditor";
import AreaEditor from "./utils/map-editor/areaEditor";*/

test.describe('Meeting actions test', () => {

    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({}, {project}) => {
            //Map Editor not available on mobile
            if (project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({browserName}) => {
        //WebKit has issue with camera
        if (browserName === "webkit") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });

    test('Meeting action to mute microphone & video', async ({page, browser}, {project}) => {
        // Go to the empty map
        await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        // Login user "Alice"
        await login(page, 'Alice');

        // Move user
        await Map.walkTo(page, 'ArrowRight', 3000);

        const newBrowser = await browser.browserType().launch();
        const userBob = await newBrowser.newPage();
        // Go to the empty map
        await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
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

        // Check if "Bob" user receive the request to be muted
        await expect(userBob.locator('.interact-menu')).toBeVisible({timeout: 20_000});
        // Click on the accept button
        await userBob.click('.interact-menu .accept-request');

        // Check if the user has been muted
        await expect(page.locator('.cameras-container .other-cameras .video-container.video-off')).toBeVisible({timeout: 20_000});

        await page.close();
        await userBob.close();
    });
  // TODO: this test is deprecated, Jitsi meeting not working for production
  /*test('Jitsi meeting action to mute microphone & video', async ({ page, browser, request }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    test('Jitsi meeting action to mute microphone & video @oidc', async ({page, browser, request}, {project}) => {
        await resetWamMaps(request);

        await page.goto(Map.url("empty"));
        //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
        //await page.reload();
        await login(page, "Alice", 3);
        await oidcAdminTagLogin(page);

        // Open the map editor
        await Menu.openMapEditor(page);
        // Create a new area
        await MapEditor.openAreaEditor(page);
        // Draw the area
        await AreaEditor.drawArea(page, {x: 0, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        // Add a property Speaker zone to create new Jitsi meeting zone
        await AreaEditor.addProperty(page, 'Speaker zone');
        // Set the speaker zone property
        await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
        // Close the map editor
        await Menu.closeMapEditor(page);

        // Move user "Alice" to the new area
        //await Map.teleportToPosition(page, 4*32, 2*32);
        await oidcLogout(page);

        // Add a second user "Bob"
        const newBrowser = await browser.browserType().launch();
        const userBobPage = await newBrowser.newPage();
        await userBobPage.goto(Map.url("empty"));
        // Login user "Bob"
        await login(userBobPage, "Bob", 3);
        // Move user "Bob" to the new area
        // FIME: the teleportToPosition does not work ??
        //await Map.teleportToPosition(userBob, 4*32, 2*32);

        //Move to speaker zone for both wokas
        await Map.walkTo(userBobPage, 'ArrowUp', 2000);
        await Map.walkTo(page, 'ArrowUp', 2000);

        // The user in the bubble meeting should be visible
        await expect(page.locator('.cameras-container .other-cameras .jitsi-video')).toBeVisible({timeout: 20_000});
        // The user in the bubble meeting should have action button
        await expect(page.locator('.cameras-container .other-cameras .jitsi-video .action-button')).toBeVisible({timeout: 20_000});

        // Click on the action button of "Alice"
        await page.click('.cameras-container .other-cameras .jitsi-video .action-button#more-action');

        // Click on the mute button
        await page.click('.cameras-container .other-cameras .jitsi-video .action-button#mute-audio-user');

        // Check if "Bob" user receive the request to be muted
        await expect(userBobPage.locator('.interact-menu')).toBeVisible({timeout: 20_000});
        // Click on the accept button
        await userBobPage.click('.interact-menu .accept-request');

        // Check if the user has been muted
        await expect(page.locator('.cameras-container .other-cameras .jitsi-video .voice-meter-cam-off')).toBeVisible({timeout: 20_000});
        // Click on the mute video button

        try {
            // Sometimes the menu is closed again (maybe because Jitsi triggered a redisplay of the component?)
            // We need to reopen the menu
            await page.click('.cameras-container .other-cameras .jitsi-video .action-button#more-action', {timeout: 2_000});
        } catch {
            // Let's ignore the error
        }
        await page.click('.cameras-container .other-cameras .jitsi-video .action-button#mute-video-user');


        // Check if "Bob" user receive the request to be muted
        await expect(userBobPage.locator('.interact-menu')).toBeVisible({timeout: 20_000});
        // Click on the accept button
        await userBobPage.click('.interact-menu .accept-request');

        // Check if the user has been muted
        await expect(page.locator('.cameras-container .other-cameras .jitsi-video video')).toBeHidden({timeout: 20_000});

    });
  });*/
});
