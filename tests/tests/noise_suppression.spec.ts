import { expect, test } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Menu from "./utils/menu";
import { publicTestMapUrl } from "./utils/urls";

test.describe("Noise suppression @nomobile @nowebkit", () => {
    test.beforeEach("Skip unsupported browsers", ({ browserName, page }) => {
        if (browserName === "webkit" || isMobile(page)) {
            test.skip();
        }
        if (browserName === "firefox") {
            test.fixme(
                true,
                "Firefox rejects connecting the microphone stream to the 16 kHz noise suppression AudioContext.",
            );
        }
    });

    test("should enable custom noise suppression without staying stuck loading or showing an error", async ({
        browser,
    }) => {
        await using page = await getPage(
            browser,
            "User1",
            publicTestMapUrl("tests/E2E/empty.json", "noise-suppression"),
        );

        await page.evaluate(() => {
            localStorage.setItem("noiseSuppressionEnabled", "false");
            localStorage.setItem("noiseSuppressionProvider", "workadventure");
            localStorage.setItem("tutorialDone", "true");
        });
        await page.reload();
        await page.addStyleTag({
            content: `
                [data-testid="onboarding-step"],
                [data-testid^="onboarding-highlight-"] {
                    display: none !important;
                    pointer-events: none !important;
                }
            `,
        });
        await Menu.waitForMapLoad(page, 120_000);

        await Menu.openMediaSettings(page);

        await page.getByTestId("microphone-settings-button").click({ force: true });
        await expect(page.getByTestId("microphone-settings-section")).toBeVisible();

        await page.locator("#noise-suppression-settings-toggle").evaluate((input: HTMLInputElement) => input.click());
        await expect(page.locator("#noise-suppression-settings-toggle")).toBeChecked();

        await page
            .locator("#noise-suppression-provider-workadventure")
            .evaluate((input: HTMLInputElement) => input.click());
        await expect(page.locator("#noise-suppression-provider-workadventure")).toBeChecked();

        const noiseSuppressionPanel = page.getByTestId("microphone-settings-section");
        await expect(noiseSuppressionPanel.getByTestId("noise-suppression-loading")).toBeHidden({ timeout: 30_000 });
        await expect(noiseSuppressionPanel.getByTestId("noise-suppression-error")).toBeHidden();
    });
});
