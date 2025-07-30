import {expect, test} from '@playwright/test';
import Menu from "../utils/menu";
import Map from "../utils/map";
import {play_url, publicTestMapUrl} from "../utils/urls";
import {getPage} from "../utils/auth";
import {isMobile} from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: play_url,
})

test.describe('Mobile', () => {
    test.beforeEach(async ({ page, browserName }) => {
        if (!isMobile(page) || browserName === "webkit") {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('Successfully bubble discussion with mobile device', async ({ browser }) => {
        const page = await getPage(browser, 'Bob', Map.url("empty"));

        const positionToDiscuss = {
            x: 3 * 32,
            y: 4 * 32
        };

        // walk on the position for the test
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(page, positionToDiscuss.x, positionToDiscuss.y);
        // Text open menu
        await Menu.openMenu(page);
        // Text close menu
        await Menu.closeMenu(page);

        // Second browser
        const pageAlice = await getPage(browser, 'Alice', Map.url("empty"));
        await pageAlice.evaluate(() => localStorage.setItem('debug', '*'));

        // Move Alice and create a bubble with another user
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(pageAlice, positionToDiscuss.x, positionToDiscuss.y);

        await expect(pageAlice.getByText('Bob')).toBeVisible();
        // check if we can still open and close burgerMenu when 2 in proximity chat with cam on
        await Menu.openMenu(pageAlice);
        await Menu.closeMenu(pageAlice);
        
        // check if we can pin the camera of other user
        // to do this we use the pin button to unpin the video
        await pageAlice.locator('#cameras-container').getByRole('button').nth(1).click();
        await pageAlice.getByRole('button', {name: 'Pin', exact: true }).click();

        // Second browser
        const pageJohn = await getPage(browser, 'John', Map.url("empty"));
        await pageJohn.evaluate(() => localStorage.setItem('debug', '*'));

        // Move John and create a bubble with another user
        // TODO: find a solution to test Joystick
        await Map.walkToPosition(pageJohn, positionToDiscuss.x, positionToDiscuss.y);

        // Expect to see camera of users
        await expect(pageJohn.getByText('Bob')).toBeVisible();
        await expect(pageJohn.getByText('Alice')).toBeVisible();

        // check if we can still open and close burgerMenu when 2 in proximity chat with cam on
        await Menu.openMenu(pageJohn);
        await Menu.closeMenu(pageJohn);
        
        await pageJohn.locator('#cameras-container').getByRole('button').nth(1).click();
        await pageJohn.getByRole('button', {name: 'Pin', exact: true }).click();
        

        await pageAlice.close();
        await pageJohn.close();
        await page.close();
        await pageJohn.context().close();
        await pageAlice.context().close();
        await page.context().close();
    });

    test('Successfully jitsi cowebsite with mobile device', async ({ browser }) => {
        const page = await getPage(browser, 'Bob',
            publicTestMapUrl('tests/CoWebsite/cowebsite_jitsiroom.json', 'mobile'));

        // Move to open a cowebsite
        await page.locator('#body').press('ArrowDown', { delay: 200 });
        await page.locator('#body').press('ArrowRight', { delay: 3000 });
        // Now, let's move player 2 to the speaker zone
        
        // Click on the button to close the cowebsite

        await page.getByTestId('tab2').getByRole('button', {name: 'Close'}).click();

        // Click on the button to close the Jitsi
        await page.getByTestId('tab1').getByRole('button', {name: 'Close'}).click();

        // Check that the cowebsite is hidden
        await expect(page.getByTestId('tab2').getByRole('button', {name: 'Close'})).toBeHidden({
            timeout: 10000
        });

        await page.close();
        await page.context().close();
    });

    // TODO: create test to interact with another object
});