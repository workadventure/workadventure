import type { Page } from "@playwright/test";

/**
 * Clears the "never show" flag and sets a fake deferred install prompt so the app treats
 * the Web App install flow as available (e.g. profile menu "Install Web App" in E2E).
 */
export async function ensureWebAppInstallMenuEligibility(page: Page): Promise<void> {
    await page.evaluate(() => {
        try {
            localStorage.removeItem("workadventure_pwa_install_prompt_shown");
        } catch {
            // ignore
        }
        const mockPromptEvent = Object.assign(new Event("beforeinstallprompt"), {
            prompt: async (): Promise<void> => undefined,
            userChoice: Promise.resolve({ outcome: "dismissed" as const }),
        });
        window.dispatchEvent(mockPromptEvent);
    });
}

/**
 * After the camera step or when opening the game, the Web App install screen may appear.
 * Waits until that screen, the game (microphone), or an error message is visible; if the PWA
 * screen is shown, clicks "Continue in browser" so tests can proceed.
 */
export async function dismissPwaInstallScreenIfShown(page: Page, dontShowAgain: boolean = false): Promise<void> {
    const skip = page.getByTestId("pwa-install-skip");
    const neverShowAgain = page.getByTestId("pwa-install-never-show-input");
    const microphone = page.getByTestId("microphone-button");
    const errorOccurred = page.getByText("An error occurred").first();

    await Promise.race([
        skip.waitFor({ state: "visible", timeout: 90_000 }),
        microphone.waitFor({ state: "visible", timeout: 90_000 }),
        errorOccurred.waitFor({ state: "visible", timeout: 90_000 }),
    ]);

    if (await skip.isVisible()) {
        if (dontShowAgain) {
            await neverShowAgain.check();
        }
        await skip.click();
    }
}
