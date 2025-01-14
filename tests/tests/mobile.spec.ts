import {expect, test} from '@playwright/test';
import Menu from "./utils/menu";
import {login} from "./utils/roles";
import Map from "./utils/map";
import {play_url, publicTestMapUrl} from "./utils/urls";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: play_url,
})
test.describe('Mobile', () => {
    test('Successfully bubble discussion with mobile device', async ({ page, browser, request, browserName }, workerInfo) => {
        // If the browser is webkit
        if (workerInfo.project.name!== "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        await page.goto(Map.url("empty"));
        await login(page, "Bob", 3, 'en-US', true);

        const positionToDiscuss = {
            x: 3 * 32,
            y: 4 * 32
        };

        // walk on the position for the test
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
        //await page.pause();
        // Text open menu
        await Menu.openMenuMobile(page);
        // Text close menu
        await Menu.closeMenu(page);

        // Second browser
        const newBrowserAlice = await browser.newContext();
        const pageAlice = await newBrowserAlice.newPage();
        await pageAlice.goto(Map.url("empty"));
        await pageAlice.evaluate(() => localStorage.setItem('debug', '*'));
        await login(pageAlice, "Alice", 5, 'en-US', true);

        // Move Alice and create a bubble with another user
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(pageAlice, positionToDiscuss.x, positionToDiscuss.y);

        await expect(pageAlice.locator(`.cameras-container .other-cameras .media-container`).nth(0)).toBeVisible({
            timeout: 10000
        });
        await expect(page.locator(`.cameras-container .other-cameras .media-container`).nth(0)).toBeVisible({
            timeout: 10000
        });
        expect(await pageAlice.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(1);
        expect(await page.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(1);

        // Second browser
        const newBrowserJohn = await browser.newContext();
        const pageJohn = await newBrowserJohn.newPage();
        await pageJohn.goto(Map.url("empty"));
        await pageJohn.evaluate(() => localStorage.setItem('debug', '*'));
        await login(pageJohn, "John", 5, 'en-US', true);

        // Move John and create a bubble with another user
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(pageJohn, positionToDiscuss.x, positionToDiscuss.y);

        // Expect to see camera of users
        await expect(pageJohn.locator(`.cameras-container .other-cameras .media-container`).nth(1)).toBeVisible({
            timeout: 10000
        });
        await expect(pageAlice.locator(`.cameras-container .other-cameras .media-container`).nth(1)).toBeVisible({
            timeout: 10000
        });
        await expect(page.locator(`.cameras-container .other-cameras .media-container`).nth(1)).toBeVisible({
            timeout: 10000
        });
        expect(await pageAlice.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(2);
        expect(await page.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(2);
        expect(await pageJohn.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(2);

        await pageAlice.close();
        await pageJohn.close();
        await page.close();
        await newBrowserAlice.close();
        await newBrowserJohn.close();
    });

    test('Successfully jitsi cowebsite with mobile device', async ({ page, browser }, workerInfo) => {
        // If the browser is webkit, we skip the test because the option 'ArrowRight' doesn't work
        if (workerInfo.project.name !== "mobilechromium") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
        page.goto(
            publicTestMapUrl('tests/CoWebsite/cowebsite_jitsiroom.json', 'mobile')
        );
        await login(page, "Bob", 3, 'en-US', true);

        // Move to open a cowebsite
        await page.locator('#body').press('ArrowRight', { delay: 3000 });
        // Now, let's move player 2 to the speaker zone

        // Check that the cowebsite is visible
        await expect(page.locator(`#cowebsite #cowebsite-aside #cowebsite-aside-buttons #cowebsite-close`)).toBeVisible({
            timeout: 10000
        });

        // Click on the button to close the cowebsite
        await page.locator(`#cowebsite #cowebsite-aside #cowebsite-aside-buttons #cowebsite-close`).click({timeout: 10000});

        // Check that the cowebsite is hidden
        await expect(page.locator(`#cowebsite #cowebsite-aside`)).toBeHidden({
            timeout: 10000
        });

        page.close();
    });

    // TODO: create test to interact with another object
});//.cameras-container .other-cameras .media-container