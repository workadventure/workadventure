import {expect, test} from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {expectInViewport} from "./utils/viewport";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";

test.describe('Modal', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('test', async ({ browser }) => {
        // Go to
        const page = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "modal_script"));
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