import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "./utils/map";

import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

import { resetWamMaps } from "./utils/map-editor/uploader";

import ConfigureMyRoom from "./utils/map-editor/configureMyRoom";
import Megaphone from "./utils/map-editor/megaphone";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";

test.setTimeout(240_000);

async function waitForRecordingToAppear(page: Page, index: number, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        let retry = false;
        try {
            await expect(page.getByTestId("recording-item-0")).toBeVisible({ timeout: 5000 });
        } catch {
            // If this fails, nothing to do, we will retry
            retry = true;
        }

        if (!retry) {
            break;
        }

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(6000);
        await page.getByRole("button", { name: "Refresh" }).click();
    }
}

test.describe("Recording test", () => {
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        ({ browserName, page, browser }) => {
            //Map Editor not available on mobile and webkit have issue with camera
            if (browserName === "webkit" || isMobile(page) || browser.browserType().name() === "firefox") {
                test.skip();
                return;
            }
        },
    );

    test("Recording should start and stop correctly @oidc", async ({ browser, request }) => {
        await resetWamMaps(request);
        // Go to the empty map
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        //TODO : delete all existing recordings
        await page.getByTestId("apps-button").click();

        await page.getByTestId("recordingButton-list").click();

        while (
            // eslint-disable-next-line playwright/no-conditional-expect,playwright/missing-playwright-await
            await expect(page.getByTestId("recording-item-0"))
                .toBeVisible({ timeout: 3000 })
                .then(() => true)
                .catch(() => false)
        ) {
            const recordingItem = page.getByTestId("recording-item-0");
            const optionsButton = recordingItem.getByTestId("recording-context-menu-trigger");
            await optionsButton.click();
            await page.getByTestId("recording-context-menu-delete").click();
            await expect(page.getByText("Recording deleted successfully")).toBeVisible();
            await expect(page.getByText("Recording deleted successfully")).toBeHidden();
        }

        await page.getByTestId("close-recording-modal").click();

        // Second browser
        await using page2 = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(page2, 0, 0);

        await expect(page.getByTestId("recordingButton-start")).toBeEnabled();

        await page.getByTestId("recordingButton-start").click();

        await expect(page2.getByTestId("recording-started-modal")).toBeVisible();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(5000);

        await expect(page.getByTestId("recordingButton-stop")).toBeEnabled();

        await expect(page2.getByTestId("recordingButton-stop")).toBeDisabled();

        await page.getByTestId("recordingButton-stop").click();

        await page.getByTestId("apps-button").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(3000);

        await page.getByTestId("recordingButton-list").click();

        await expect(page.getByTestId(`recording-item-0`)).toBeVisible();
        await page.getByTestId("close-recording-modal").click();

        await expect(page.getByTestId("recordingButton-start")).toBeEnabled();

        await page.getByTestId("recordingButton-start").click();

        // Second browser
        await using page3 = await getPage(browser, "Alice", Map.url("empty"));
        await Map.teleportToPosition(page3, 0, 0);
        await expect(page3.getByTestId("recording-started-modal")).toBeVisible();

        await Map.teleportToPosition(page, 8 * 32, 8 * 32);

        await page.getByTestId("apps-button").click();

        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(5000);
        await page.getByTestId("recordingButton-list").click();

        await waitForRecordingToAppear(page, 0);

        //await expect(page.locator(".recorded-items-list > div").first()).toBeVisible();
        await expect(page.getByTestId("recording-item-0")).toBeVisible({ timeout: 5000 });

        await page.getByTestId("close-recording-modal").click();

        await Map.walkToPosition(page2, 8 * 32, 8 * 32);
        await page.getByTestId("recordingButton-start").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(5000);

        await Map.teleportToPosition(page2, 0, 0);

        await page.getByTestId("apps-button").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(3000);

        await page.getByTestId("recordingButton-list").click();

        await waitForRecordingToAppear(page, 2);

        await page.close();
        await page2.close();
        await page3.close();
        await page2.context().close();
        await page.context().close();
        await page3.context().close();
    });

    test("Recording configuration @oidc", async ({ browser, request }) => {
        await resetWamMaps(request);
        // Go to the empty map
        await using page = await getPage(browser, "Admin1", Map.url("empty"));
        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        await Map.teleportToPosition(page, 0, 0);

        await Menu.openMapEditor(page);
        await MapEditor.openConfigureMyRoom(page);
        await ConfigureMyRoom.selectRecordingItemInCMR(page);

        // We use the same code as megaphone for the configuration UI, since the "rights" field is common to both features.
        await Megaphone.megaphoneAddNewRights(page, "foo");

        await page.getByRole("button", { name: "Save" }).click();

        // Now, let's start a recording to see if the rights are correctly applied.
        await using page2 = await getPage(browser, "Member1", Map.url("empty"));
        await Map.teleportToPosition(page2, 0, 0);

        // The admin can still see the recording button
        await expect(page.getByTestId("recordingButton-start")).toBeVisible();
        // The member (without the "foo" tag) should not see the recording button
        await expect(page2.getByTestId("recordingButton-start")).toBeHidden();

        await Map.teleportToPosition(page2, 160, 160);

        // Let's now configure the "member" tag instead of "foo"
        await Megaphone.megaphoneRemoveRights(page, "foo");
        await Megaphone.megaphoneAddNewRights(page, "member");
        await page.getByRole("button", { name: "Save" }).click();
        await expect(page.getByRole("button", { name: "Recording settings saved" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Recording settings saved" })).toBeHidden();

        await Map.teleportToPosition(page2, 0, 0);

        // The admin can still see the recording button
        await expect(page.getByTestId("recordingButton-start")).toBeVisible();
        // The member (with the "member" tag) should now see the recording button
        await expect(page2.getByTestId("recordingButton-start")).toBeVisible();
    });
});
