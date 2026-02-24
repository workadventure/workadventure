import { expect, test } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import { publicTestMapUrl } from "./utils/urls";

test.describe("Onboarding tutorial @nomobile", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), "Skip on mobile devices");
    });

    test("completes all onboarding steps and Help & Tips reopens the tutorial", async ({ browser }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "onboarding");

        await using page = await getPage(browser, "Alice", mapUrl, { skipCloseOnboarding: true });

        // --- Part 1: Go through all onboarding steps ---
        await expect(page.getByTestId("onboarding-step")).toBeVisible();
        await expect(page.getByTestId("onboarding-button-welcome-start")).toBeVisible();

        await page.getByTestId("onboarding-button-welcome-start").click();
        await expect(page.getByTestId("onboarding-button-movement-next")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-movement-next").click();

        await expect(page.getByTestId("onboarding-button-communication-next")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-communication-next").click();

        await expect(page.getByTestId("onboarding-button-lockBubble-next")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-lockBubble-next").click();

        await expect(page.getByTestId("onboarding-button-screenSharing-next")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-screenSharing-next").click();

        await expect(page.getByTestId("onboarding-button-pictureInPicture-next")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-pictureInPicture-next").click();

        await expect(page.getByTestId("onboarding-button-complete-finish")).toBeVisible({ timeout: 3000 });
        await page.getByTestId("onboarding-button-complete-finish").click();

        await expect(page.getByTestId("onboarding-step")).toBeHidden({ timeout: 5000 });

        // --- Part 2: Help & Tips reopens the tutorial ---
        await page.getByTestId("action-user").click();
        await expect(page.getByTestId("profile-menu")).toBeVisible();
        await page.getByTestId("profile-menu-help-and-tips").click();

        await expect(page.getByTestId("onboarding-step")).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId("onboarding-button-welcome-start")).toBeVisible();
    });
});
