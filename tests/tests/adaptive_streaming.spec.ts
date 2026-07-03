import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Menu from "./utils/menu";
import { dismissNoMicrophoneSoundInfoToast } from "./utils/noMicrophoneSoundInfoToast";

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
        await dismissNoMicrophoneSoundInfoToast(page);

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
        await expect(page.getByRole("cell", { name: "video/VP9" }).first()).toBeVisible();

        const isHeightBetween = async (low: number, high: number): Promise<boolean> => {
            const text = await page.getByTestId("resolution").textContent();
            // eslint-disable-next-line playwright/no-conditional-in-test
            if (text === null) {
                return false;
            }
            const height = Number(text.split("x")[1]);
            // eslint-disable-next-line playwright/no-conditional-in-test
            return height >= low && height <= high;
        };

        await expect
            .poll(
                async () => {
                    return isHeightBetween(124, 126);
                },
                {
                    timeout: 60_000,
                },
            )
            .toBeTruthy();
        await page
            .getByTestId("cameras-container")
            .locator("div", { hasText: "Bob" })
            .locator("button.full-screen-button")
            .click();

        await expect
            .poll(
                async () => {
                    return (
                        (await isHeightBetween(269, 271)) || // In CI
                        (await isHeightBetween(359, 361)) || // In CI
                        (await isHeightBetween(499, 501)) || // In CI
                        (await isHeightBetween(719, 721))
                    ); // In real usage
                },
                {
                    timeout: 60_000,
                },
            )
            .toBeTruthy();
    });
});
