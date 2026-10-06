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

    // One wait, not a Promise.race of three: the losers of a race keep polling for their full
    // timeout, and every extra in-flight operation can trigger a registered locator handler
    // concurrently. Playwright only keeps the last handler promise, so the earlier waiters are
    // never resolved and hang until they time out.
    await skip.or(microphone).or(errorOccurred).first().waitFor({ state: "visible", timeout: 90_000 });

    if (await skip.isVisible()) {
        if (dontShowAgain) {
            await neverShowAgain.click();
        }
        await skip.click();
    }
}
