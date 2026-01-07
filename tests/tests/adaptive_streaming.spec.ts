import {expect, test } from '@playwright/test';
import Map from "./utils/map";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";
import Menu from "./utils/menu";


test.setTimeout(240_000);

test.describe('Adaptive streaming test @nomobile', () => {

    test.beforeEach(
        "Ignore tests on mobile because test depends on screen size",
        ({ browserName, page , browser }) => {
            //Map Editor not available on mobile adn webkit have issue with camera
            if (isMobile(page)) {
                test.skip();
                return;
            }
        }
    );


    test('Should adapt screen size', async ({ browser }) => {
        
        // Go to the empty map
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "adaptive_streaming"));
        await page.evaluate(() => localStorage.setItem("debug", "*"));
        // Move user Alice to the meeting area
        await Map.teleportToPosition(page, 160, 160);
        
        await using userBob = await getPage(browser, 'Bob', publicTestMapUrl("tests/E2E/empty.json", "adaptive_streaming"));
        await userBob.evaluate(() => localStorage.setItem("debug", "*"));
        await Map.teleportToPosition(userBob, 160, 160);

        // Let's enable the video quality display and test it works
        await Menu.openMenu(page);
        await page.getByRole('button', { name: 'All settings' }).click();
        await page.getByText('Display video quality').click();
        await page.locator('#closeMenu').click();
        await expect(page.getByRole('cell', { name: 'video/VP8' }).first()).toBeVisible();

        await expect(page.getByRole('cell', { name: '320x180' })).toBeVisible({ timeout: 60_000 });
        await page.getByTestId("cameras-container").locator("div", { hasText: 'Bob' }).locator("button.full-screen-button").click();
        await expect(page.getByRole('cell', { name: '1280x720' })).toBeVisible({ timeout: 60_000 });

        // Clean up
        await page.close();
        await userBob.close();
        await userBob.context().close();
        await page.context().close();
    });
});
