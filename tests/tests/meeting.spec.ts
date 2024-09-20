import {expect, test} from '@playwright/test';
import {login} from './utils/roles';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";

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
        await login(page, 'Alice', 2, 'en-US', project.name === "mobilechromium");

        // Move user
        await Map.walkTo(page, 'ArrowRight', 3000);

        const newBrowser = await browser.browserType().launch();
        const userBob = await newBrowser.newPage();
        // Go to the empty map
        await userBob.goto(publicTestMapUrl("tests/E2E/empty.json", "meeting"));
        // Login user "Bob"
        await login(userBob, 'Bob', 5, 'en-US', project.name === "mobilechromium");
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

        // Check if "Bob" user receive the request to be muted
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
});
