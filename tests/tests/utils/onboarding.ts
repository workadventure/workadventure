import type { Page } from 'playwright/test';

/**
 * Closes the onboarding modal if it exists.
 * Waits at least 2 seconds before checking (as onboarding opens after 1 second).
 * @param page - The Playwright page instance
 */
export async function closeOnboarding(page: Page): Promise<void> {

    // Add a localtor handler. When onboarding is showing, close it.
    await page.addLocatorHandler(
        page.locator('[data-testid^="onboarding-highlight-"]'),
        async () => {
            // If button not found, try pressing ESC key (fallback)
            await page.keyboard.press('Escape');
        },
    );
}
