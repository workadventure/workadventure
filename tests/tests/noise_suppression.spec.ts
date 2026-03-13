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

        const toggleInput = page.locator("#noise-suppression-toggle");
        await expect(toggleInput).not.toBeChecked();

        // Onboarding can reappear after the panel opens; force keeps this test focused on noise suppression.
        // eslint-disable-next-line playwright/no-force-option
        await page.getByTestId("noise-suppression-toggle").click({ force: true });
        await expect(toggleInput).toBeChecked();

        const noiseSuppressionPanel = page.getByTestId("noise-suppression-panel");
        await expect(noiseSuppressionPanel.getByTestId("noise-suppression-loading")).toBeHidden({ timeout: 30_000 });
        await expect(noiseSuppressionPanel.getByTestId("noise-suppression-error")).toBeHidden();
    });
});
