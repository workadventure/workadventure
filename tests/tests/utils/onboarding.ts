import { expect } from "@playwright/test";
import type { Page } from "playwright/test";

/**
 * Closes the onboarding modal if it exists.
 * Waits at least 2 seconds before checking (as onboarding opens after 1 second).
 * @param page - The Playwright page instance
 */
export async function closeOnboarding(page: Page): Promise<void> {
    // Add a localtor handler. When onboarding is showing, close it.
    await page.addLocatorHandler(page.getByTestId("onboarding-step"), async () => {
        // Pressing ESC key
        await page.keyboard.press("Escape");
        // Check if onboarding is hidden. If Escape key is not working, click on the button to close onboarding.
        try {
            await expect(page.getByTestId("onboarding-step")).toBeHidden({ timeout: 1000 });
        } catch (error) {
            console.error("Error checking if onboarding is hidden", error);
            // Click on the button to close onboarding
            await page.getByTestId("onboarding-button-welcome-start").click();
        }
    });
}
