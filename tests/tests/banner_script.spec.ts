import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import {evaluateScript} from "./utils/scripting";
import {expectInViewport} from "./utils/viewport";
import {RENDERER_MODE} from "./utils/environment";
import {publicTestMapUrl} from "./utils/urls";

test.describe('Modal', () => {
    test('test', async ({ page }) => {
        // Go to
        await page.goto(
            publicTestMapUrl("tests/E2E/empty.json", "banner_script")
        );

        // Connection with Alice
        await login(page, "Alice");

        // Create banner with scripting API
        await evaluateScript(page, async () => {
            return WA.ui.banner.openBanner({
                id: "banner-test",
                text: "Banner test",
                bgColor: "#000000",
                textColor: "#ffffff",
                link: {
                    label: "Test",
                    url: "https://workadventu.re"
                }
            });
        });

        // Check the component of the Webpage
        await expectInViewport("#banner-test", page);

        // Create banner with scripting API
        await evaluateScript(page, async () => {
            return WA.ui.banner.closeBanner();
        });

        // Check the component of the Webpage
        await expect(page.locator('#modalIframe')).toHaveCount(0);
    });
});