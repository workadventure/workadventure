import { expect } from "@playwright/test";
import type { Page } from "playwright/test";

/**
 * Closes the onboarding modal if it exists.
 * Waits at least 2 seconds before checking (as onboarding opens after 1 second).
 * @param page - The Playwright page instance
 */
export async function closeOnboarding(page: Page): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("onboarding-step"), async () => {
        try {
            // Click on the button to close onboarding
            await page.getByTestId("onboarding-button-welcome-skip").click();
            // Check if onboarding is hidden
            await expect(page.getByTestId("onboarding-step")).toBeHidden();
        } catch (error) {
            console.error("Error closing onboarding", error);
        }
    });
}
