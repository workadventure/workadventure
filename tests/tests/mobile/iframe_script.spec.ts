import { expect, test } from "@playwright/test";
import { evaluateScript } from "../utils/scripting";
import { publicTestMapUrl } from "../utils/urls";
import { getPage } from "../utils/auth";
import {isMobile} from "../utils/isMobile";
import Menu from "../utils/menu";

test.describe("Iframe API @nodesktop", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!isMobile(page), 'Run only on mobile');
    });
    test("disable invite user button", async ({ browser }) => {
        await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));
        await page.evaluate(() => localStorage.setItem("debug", "*"));
        await Menu.openMenu(page);
        await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
        // Create a script to evaluate function to disable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.controls.disableInviteButton();
        });

        // Check if the map editor is enabled

        await expect(page.getByRole('button', { name: 'Share' })).toBeHidden();


        await page.context().close();
    });
    test("disable screen sharing @nowebkit", async ({ browser, browserName }) => {
        // Skipping webkit because it has no webcam. Therefore, it opens the chat directly.
        // The chat masks the buttons we are interested in.
        test.skip(browserName === 'webkit', 'Skip on WebKit');

        await using page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
        );
        await page.evaluate(() => localStorage.setItem("debug", "*"));

        // Create a script to evaluate function to disable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();

            WA.controls.disableScreenSharing();
        });

        // Second browser
        await using pageBob = await getPage(browser, 'Bob',
            publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
        )
        await pageBob.evaluate(() => localStorage.setItem("debug", "*"));

        // Check if the screen sharing is disabled
        await expect(
            page.getByTestId("screenShareButton")
        ).toBeDisabled();

        // Create a script to evaluate function to enable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();

            WA.controls.restoreScreenSharing();
        });

        // Check if the screen sharing is enabled
        await expect(
            page.getByTestId("screenShareButton")
        ).toBeEnabled();

        await pageBob.context().close();

        await page.context().close();
    });

    test("disable right click user button", async ({ browser }) => {
        await using page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
        );
        await page.evaluate(() => localStorage.setItem("debug", "*"));

        // Create a script to evaluate function to disable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.controls.disableRightClick();
        });

        // Create a script to evaluate function to enable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.controls.restoreRightClick();
        });

        // TODO: check if the right click is enabled


        await page.context().close();
    });
});
