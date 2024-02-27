import {expect, test} from '@playwright/test';
import Menu from "./utils/menu";
import {login} from "./utils/roles";
import Map from "./utils/map";
import {play_url} from "./utils/urls";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: play_url,
})
test.describe('Map editor', () => {
    test('Successfully bubble discussion with mobile device', async ({ page, browser, request, browserName }) => {
        await page.goto(Map.url("empty"));
        await login(page, "Bob", 3);

        // mouse click on the map not working withmobile playwright
        // TODO: find a solution to test Joystick
        await page.locator('#body').press('ArrowRight', { delay: 1000 });

        // Text open menu
        await Menu.openMenu(page);
        // Text close menu
        await Menu.closeMenu(page);

        // Second browser
        const newBrowserAlice = await browser.browserType().launch();
        const pageAlice = await newBrowserAlice.newPage();
        await pageAlice.goto(Map.url("empty"));
        await pageAlice.evaluate(() => localStorage.setItem('debug', '*'));
        await login(pageAlice, "Alice", 5);

        // Move Alice and create a bubble with another user
        await pageAlice.locator('#body').press('ArrowRight', { delay: 1000 });

        await expect(pageAlice.locator(`.cameras-container .other-cameras .media-container`).nth(0)).toBeVisible({
            timeout: 10000
        });
        await expect(page.locator(`.cameras-container .other-cameras .media-container`).nth(0)).toBeVisible({
            timeout: 10000
        });
        expect(await pageAlice.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(1);
        expect(await page.locator(`.cameras-container .other-cameras .media-container`).count()).toBe(1);

        // Second browser
        const newBrowserJohn = await browser.browserType().launch();
        const pageJohn = await newBrowserJohn.newPage();
        await pageJohn.goto(Map.url("empty"));
        await pageJohn.evaluate(() => localStorage.setItem('debug', '*'));
        await login(pageJohn, "John", 5);

        // Move John and create a bubble with another user
        await pageJohn.locator('#body').press('ArrowRight', { delay: 1000 });

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

        pageAlice.close();
        pageJohn.close();
        page.close();
    });

    test('Successfully jitsi cowebsite with mobile device', async ({ page, browser, request, browserName }) => {
        page.goto('/_/global/maps.workadventure.localhost/tests/jitsi_config.json');
        await login(page, "Bob", 3);

        // Move to open a cowebsite
        await page.locator('#body').press('ArrowRight', { delay: 1000 });
        await page.locator('.blue-dialog-box').click({timeout: 10000});

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
});