import { expect, test } from '@playwright/test';
import {evaluateScript} from "./utils/scripting";
import {expectInViewport} from "./utils/viewport";
import {publicTestMapUrl} from "./utils/urls";
import { getPage } from './utils/auth';
import {isMobile} from "./utils/isMobile";

test.describe('Modal @nomobile', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), 'Skip on mobile devices');
    });
    test('Open banner', async ({ browser }) => {
        await using page = await getPage(browser, 'Alice', 
            publicTestMapUrl("tests/E2E/empty.json", "banner_script")
        );
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

        await page.context().close();
    });
});
