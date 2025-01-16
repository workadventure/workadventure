import {expect, test, webkit} from '@playwright/test';
import {login} from './utils/roles';
import Map from "./utils/map";
// import { resetWamMaps } from './utils/map-editor/uploader';
// import Menu from "./utils/menu";
// import MapEditor from "./utils/mapeditor";
// import AreaEditor from "./utils/map-editor/areaEditor";
import {publicTestMapUrl} from "./utils/urls";
import {resetWamMaps} from "./utils/map-editor/uploader";
import menu from "./utils/menu";
import Mapeditor from "./utils/mapeditor";
import AreaEditor from "./utils/map-editor/areaEditor";
import Menu from "./utils/menu";
import {oidcAdminTagLogin} from "./utils/oidc";

test.describe('Meeting actions test', () => {

    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({browserName}, {project}) => {
            //Map Editor not available on mobile
            if (project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }

            //WebKit has issue with camera
            if (browserName === "webkit") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test('Meeting action to mute microphone & video', async ({page, browser}, {project}) => {
        // Go to the empty map
        await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        // Login user "Alice"
        await login(page, 'Alice', 2, 'en-US');

        // Move user
        await Map.teleportToPosition(page, 160, 160);

        const newBrowser = await browser.newContext();
        const userBob = await newBrowser.newPage();
        // Go to the empty map
        await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        // Login user "Bob"
        await login(userBob, 'Bob', 5, 'en-US');
        // Move user
        await Map.teleportToPosition(userBob, 160, 160);

        // The user in the bubble meeting should be visible
        //await expect(page.locator('#container-media')).toBeVisible({timeout: 30_000});
        // The user in the bubble meeting should have action button

        await expect(page.locator('#cameras-container #unique-mycam')).toBeVisible({timeout: 30_000});

        // Click on the action button of "Alice"
        await page.click('#cameras-container .camera-box .video-media-box .user-menu-btn');

        // Click on the mute button
        await page.locator('#cameras-container .camera-box .video-media-box').getByRole('button', { name: 'Mute audio', exact: true }).click();

        // Check if "Bob" user receive the request to be muted
        await expect(userBob.locator('div').filter({ hasText: /^Can I mute your microphone\?$/ })).toBeVisible();

        // Click on the accept button
        await userBob.getByRole('button', { name: 'Yes' }).click();

        // Check if the user has been muted
        await expect(page.locator("svg[aria-label='Bob is muted.']")).toBeVisible({timeout: 20_000});
        // Click on the mute video button

        // Click on the action button of "Alice"
        await page.click('#cameras-container .camera-box .video-media-box .user-menu-btn');

        // Click on the mute button
        await page.locator('#cameras-container .camera-box .video-media-box').getByRole('button', { name: 'Mute video', exact: true }).click();

        // Check if "Bob" user receive the request to be muted
        await expect(userBob.locator('div').filter({ hasText: /^Can I mute your camera\?$/ })).toBeVisible();
        // Click on the accept button
        await userBob.getByRole('button', { name: 'Yes' }).click();

        // Check if the user has been muted
        await expect(page.locator('#cameras-container .camera-box .video-media-box video')).toHaveClass(/w-0/);

        await page.close();
        await userBob.close();
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

    // await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));

    //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page.reload();
    await login(page, "Alice", 3);
    await oidcAdminTagLogin(page, false);

    // Open the map editor
    await menu.openMapEditor(page);
    // Create a new area
    await Mapeditor.openAreaEditor(page);
    // Draw the area
    await AreaEditor.drawArea(page, {x: 0*32*1.5, y: 5}, {x: 9*32*1.5, y: 4*32*1.5});
    // Add a property Speaker zone to create new Jitsi meeting zone
    await AreaEditor.addProperty(page, 'Speaker zone');
    // Set the speaker zone property
    await AreaEditor.setSpeakerMegaphoneProperty(page, `${browser.browserType().name()}SpeakerZone`);
    // Close the map editor
    await Menu.closeMapEditor(page);

    // Move user "Alice" to the new area
    await Map.walkTo(page, 'ArrowRight', 1000);
    await Map.walkTo(page, 'ArrowUp', 2000);

    // Add a second user "Bob"
    const newBrowser = await browser.browserType().launch();
    const userBob = await newBrowser.newPage();
    await userBob.goto(Map.url("empty"));
    // Login user "Bob"
    await login(userBob, "Bob", 3);
    // Move user "Bob" to the new area
    // FIME: the teleportToPosition does not work ??
    await Map.walkTo(userBob, 'ArrowUp', 2000);

    // The user in the bubble meeting should be visible
    await page.locator('.video-media-box:has-text("Bob")').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Mute audio', exact: true }).click();


    // Check if "Bob" user receive the request to be muted
    // Because Alice is admin, Bob is directly muted.
    await expect(userBob.getByText("Your microphone was muted by a moderator")).toBeVisible();
    await menu.expectMicrophoneOff(userBob);
    
    // Check if the user has been muted
    await expect(page.getByLabel('Bob is muted.')).toBeVisible();

    // Click on the mute video button
    await page.locator('.video-media-box:has-text("Bob")').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Mute video', exact: true }).click();

    // Check if "Bob" user receive the request to be muted
    // Because Alice is admin, Bob is directly muted.
    await expect(userBob.getByText("Your camera was muted by a moderator")).toBeVisible();

    // Check if the user has been muted
    await expect(page.locator('.video-media-box:has-text("Bob") video')).toHaveClass(/w-0/);

    await page.close();
    await userBob.close();
    await newBrowser.close();
  });
});
