import type { Page } from "@playwright/test";

/**
 * After the camera step or when opening the game, the Web App install screen may appear.
 * Waits until that screen, the game (microphone), or an error message is visible; if the PWA
 * screen is shown, clicks "Continue in browser" so tests can proceed.
 */
export async function dismissPwaInstallScreenIfShown(page: Page): Promise<void> {
    const skip = page.getByTestId("pwa-install-skip");
    const microphone = page.getByTestId("microphone-button");
    const errorOccurred = page.getByText("An error occurred").first();

    await Promise.race([
        skip.waitFor({ state: "visible", timeout: 90_000 }),
        microphone.waitFor({ state: "visible", timeout: 90_000 }),
        errorOccurred.waitFor({ state: "visible", timeout: 90_000 }),
    ]);

    if (await skip.isVisible()) {
        await skip.click();
    }
}
