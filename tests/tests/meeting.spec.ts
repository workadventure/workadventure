import {expect, test } from '@playwright/test';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('Meeting actions test', () => {

    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ browserName, page }) => {
            //Map Editor not available on mobile adn webkit have issue with camera
            if (browserName === "webkit" || isMobile(page)) {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
        }
    );

    test('Meeting action to mute microphone & video', async ({ browser }) => {
        if (browser.browserType().name() === "firefox") {
            // Sometimes, in Firefox, the WebRTC connection cannot be established and this causes this test to fail.
            test.skip();
        }
        // Go to the empty map
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "meeting"));

        // Move user
        await Map.teleportToPosition(page, 160, 160);
        const userBob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "meeting"));

        // Move user
        await Map.teleportToPosition(userBob, 160, 160);

        // The user in the bubble meeting should be visible
        //await expect(page.locator('#container-media')).toBeVisible({timeout: 30_000});
        // The user in the bubble meeting should have action button
        await expect(page.locator('#cameras-container').getByText("You")).toBeVisible({timeout: 30_000});

        // Click on the action button of "Bob" on Alice screen
        await page.click('#cameras-container .camera-box .video-media-box .user-menu-btn');

        // Click on the mute button
        await page.getByRole('button', { name: 'Mute audio', exact: true }).click();

        // Check if "Bob" user receive the request to be muted
        await expect(userBob.locator('div').filter({ hasText: /^Can I mute your microphone\?$/ })).toBeVisible();

        // Click on the accept button
        await userBob.getByRole('button', { name: 'Yes' }).click();

        // Check if the user has been muted
        await expect(page.locator("svg[aria-label='Bob is muted.']")).toBeVisible({timeout: 20_000});
        // Click on the mute video button

        // Click on the action button of "Bob" on Alice screen
        await page.click('#cameras-container .camera-box .video-media-box .user-menu-btn');

        // Click on the mute button
        await page.getByRole('button', { name: 'Mute video', exact: true }).click();

        // Check if "Bob" user receive the request to be muted
        await expect(userBob.locator('div').filter({ hasText: /^Can I mute your camera\?$/ })).toBeVisible();
        // Click on the accept button
        await userBob.getByRole('button', { name: 'Yes' }).click();

        // Check if the user has been muted
        await expect(page.locator('#cameras-container .camera-box .video-media-box', {
            hasText: "Bob",
        }).locator('video')).toHaveClass(/w-0/);

        await page.close();
        await userBob.close();
        await userBob.context().close();
        await page.context().close();
  });

    // FIXME jitsi bug
  /*test('Jitsi meeting action to mute microphone & video', async ({ browser, request }, { project }) => {
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
      const page = await getPage(browser, 'Admin1', Map.url("empty"));
    // await page.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));

    //await page.evaluate(() => { localStorage.setItem('debug', '*'); });
    //await page.reload();

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

    // Move user "Admin1" to the new area
    //await page.pause();
    await Map.teleportToPosition(page, 2, 5);
    //await Map.walkTo(page, 'ArrowRight', 1000);
    //await Map.walkTo(page, 'ArrowUp', 2000);

    // Add a second user "Bob"
    const userBob = await getPage(browser, "Bob", Map.url("empty"))
    // Move user "Bob" to the new area
    await Map.teleportToPosition(userBob, 2, 5);

    // The user in the bubble meeting should be visible
    await page.locator('.video-media-box:has-text("Bob")').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Mute audio', exact: true }).click();


    // Check if "Bob" user receive the request to be muted
    // Because Alice is admin, Bob is directly muted.
    await expect(userBob.getByText("Your microphone was muted by a moderator")).toBeVisible();
    await menu.expectMicrophoneOff(userBob);
    
    // Check if the user has been muted
    await expect(page.getByLabel('Bob is muted.')).toBeVisible();
    await expect(userBob.getByLabel('Bob is muted.')).toBeVisible();

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
    await userBob.context().close();
    await page.context().close();
  });*/

    test('Block users', async ({ browser }) => {
        if (browser.browserType().name() === "firefox") {
            // Sometimes, in Firefox, the WebRTC connection cannot be established and this causes this test to fail.
            test.skip();
        }
        // Go to the empty map
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "meeting"));

        // Move user
        await Map.teleportToPosition(page, 160, 160);
        const userBob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "meeting"));

        // Move user
        await Map.teleportToPosition(userBob, 192, 160);

        // The user in the bubble meeting should be visible
        //await expect(page.locator('#container-media')).toBeVisible({timeout: 30_000});
        // The user in the bubble meeting should have action button
        await expect(page.locator('#cameras-container').getByText("You")).toBeVisible({timeout: 30_000});

        // Click on the action button of "Bob" on Alice screen
        await page.click('#cameras-container .camera-box .video-media-box .user-menu-btn');

        // Click on the mute button
        await page.getByRole('button', { name: 'Moderation', exact: true }).click();
        await page.getByRole('button', { name: 'Block this user' }).click();

        await userBob.getByTestId('chat-btn').click();
        await userBob.getByTestId('messageInput').click();
        await userBob.getByTestId('messageInput').fill('Hello banned!');
        await userBob.getByTestId('messageInput').press('Enter');

        await page.locator('canvas').click({
            position: {
                x: 266,
                y: 240
            }
        });
        await page.getByRole('button', { name: 'Unblock this user' }).click();
        await page.getByRole('button', { name: 'Unblock this user' }).click();

        await userBob.getByTestId('messageInput').fill('Hello unbanned!');
        await userBob.getByTestId('messageInput').press('Enter');

        await expect(page.getByText('Hello unbanned!')).toBeVisible();
        await expect(page.getByText('Hello banned!')).toBeHidden();

        await page.close();
        await userBob.close();
        await userBob.context().close();
        await page.context().close();
    });
});
