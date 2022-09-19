import { test } from '@playwright/test';
import {expectInViewport} from "./utils/viewport";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test.describe('Modal', () => {
    test('test', async ({ page }) => {
        // Go to http://play.workadventure.localhost/_/test/maps.workadventure.localhost/tests/modal/modal.json
        await page.goto('http://play.workadventure.localhost/_/test/maps.workadventure.localhost/tests/modal/modal.json');
        // Fill input[name="loginSceneName"]
        await page.locator('input[name="loginSceneName"]').fill('TEST');
        // Click text=Continue
        await page.locator('button.loginSceneFormSubmit').click();
        // Click text=Continue
        await page.locator('button.selectCharacterSceneFormSubmit').click();
        // Click text=Let's go!
        await page.locator('button.light').click();
        // Check the component of the Webpage
        timeout(10000);
        await expectInViewport("#modalIframe", page);
        // Check the component of the Webpage
        //await expect(page.locator('#modalIframe')).toHaveCount(0);
    });
});