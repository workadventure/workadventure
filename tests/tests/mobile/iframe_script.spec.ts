import { expect, test } from "@playwright/test";
import { evaluateScript } from "../utils/scripting";
import { publicTestMapUrl } from "../utils/urls";
import { getPage } from "../utils/auth";
import {getDevices} from "../utils/devices";

test.describe("Iframe API", () => {
    test.beforeEach(async ({ page }) => {
        if (!getDevices(page)) {
            // eslint-disable-next-line playwright/no-skipped-test
            test.skip();
        }
    });
    test("test disable invite user button", async ({ browser }) => {
        const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "iframe_script"));
        await page.evaluate(() => localStorage.setItem("debug", "*"));
        await page.getByTestId('burger-menu').click();
        await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();
        // Create a script to evaluate function to disable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();
            WA.controls.disableInviteButton();
        });

        // Check if the map editor is enabled

        await expect(page.getByRole('button', { name: 'Invite' })).toBeHidden();

        await page.close();
        await page.context().close();
    });
    test("test disable screen sharing", async ({ browser }) => {
        const page = await getPage(browser, 'Alice',
            publicTestMapUrl("tests/E2E/empty.json", "iframe_script")
        );
        await page.evaluate(() => localStorage.setItem("debug", "*"));

        // Create a script to evaluate function to disable map editor
        await evaluateScript(page, async () => {
            await WA.onInit();

            WA.controls.disableScreenSharing();
        });

        // Second browser
        const pageBob = await getPage(browser, 'Bob',
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

        await pageBob.close();
        await pageBob.context().close();
        await page.close();
        await page.context().close();
    });

    test("test disable right click user button", async ({ browser }) => {
        const page = await getPage(browser, 'Alice',
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

        await page.close();
        await page.context().close();
    });
});