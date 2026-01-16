import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Menu from "./utils/menu";

test.setTimeout(240_000);

test.describe("Adaptive streaming test @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach(
        "Ignore tests on mobile because test depends on screen size and on Webkit because it does not support fake cameras and on Firefox because resolution is different from Chrome and does not work for this test",
        ({ browserName, page, browser }) => {
            if (isMobile(page) || browserName === "webkit" || browserName === "firefox") {
                test.skip();
                return;
            }
        },
    );

    test("Should adapt screen size", async ({ browser }) => {
        // Go to the empty map
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "adaptive_streaming"),
        );
        await page.evaluate(() => localStorage.setItem("debug", "*"));
        // Move user Alice to the meeting area
        await Map.teleportToPosition(page, 160, 160);

        await using userBob = await getPage(
            browser,
            "Bob",
            publicTestMapUrl("tests/E2E/empty.json", "adaptive_streaming"),
        );
        await userBob.evaluate(() => localStorage.setItem("debug", "*"));
        await Map.teleportToPosition(userBob, 160, 160);

        // Let's enable the video quality display and test it works
        await Menu.openMenu(page);
        await page.getByRole("button", { name: "All settings" }).click();
        await page.getByText("Display video quality").click();
        await page.locator("#closeMenu").click();
        await expect(page.getByRole("cell", { name: "video/VP8" }).first()).toBeVisible();

        await expect(page.getByRole("cell", { name: "223x125" })).toBeVisible({ timeout: 60_000 });
        await page
            .getByTestId("cameras-container")
            .locator("div", { hasText: "Bob" })
            .locator("button.full-screen-button")
            .click();
        // @ts-ignore Promise.any not recognized by Playwright Typescript definitions yet
        await Promise.any([
            // In CI
            // eslint-disable-next-line playwright/missing-playwright-await
            expect(page.getByRole("cell", { name: "640x360" })).toBeVisible({ timeout: 60_000 }),
            // In Real usage
            // eslint-disable-next-line playwright/missing-playwright-await
            expect(page.getByRole("cell", { name: "1280x720" })).toBeVisible({ timeout: 60_000 }),
        ]);

        // Clean up
        await userBob.context().close();
        await page.context().close();
    });
});
