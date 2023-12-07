import {expect, test} from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {expectInViewport} from "./utils/viewport";
import {RENDERER_MODE} from "./utils/environment";

test.describe('Modal', () => {
    test('test', async ({ page }) => {
        // Go to 
        await page.goto(
            `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
        );
        await login(page, "Alice");
        await evaluateScript(page, async () => {
            return WA.ui.modal.openModal({
                src: "https://workadventu.re"
            });
        });

        // Check the component of the Webpage
        await expectInViewport("#modalIframe", page);

        await evaluateScript(page, async () => {
            WA.ui.modal.closeModal();
        });

        // Let's expect #modalIframe to not be displayed
        await expect(page.locator('#modalIframe')).toBeVisible({
            visible: false
        });

        // Opening a modal with a relative path
        await evaluateScript(page, async () => {
            return WA.ui.modal.openModal({
                src: "../index.html"
            });
        });

        // Check the modal is loaded
        await expect(page.frameLocator('#modalIframe').locator("body")).toContainText("WorkAdventure test cases");

        //TODO fix me
        //await timeout(3000);
        //await expect(page.locator('#modalIframe')).toHaveCount(0);
    });
});