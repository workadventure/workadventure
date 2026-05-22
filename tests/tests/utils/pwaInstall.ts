import type { Page } from "@playwright/test";
import { dismissOnboardingIfShown } from "./onboarding";

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
 * Waits until that screen, the game UI, or an error message is visible; if the PWA
 * screen is shown, clicks "Continue in browser" so tests can proceed.
 */
export async function dismissPwaInstallScreenIfShown(page: Page, dontShowAgain: boolean = false): Promise<void> {
    const skip = page.getByTestId("pwa-install-skip");
    const neverShowAgain = page.getByTestId("pwa-install-never-show-input");
    const microphone = page.getByTestId("microphone-button");
    const mapLoadedControls = [
        page.locator("#game canvas").first(),
        page.getByRole("button", { name: "Explore the room" }),
        page.getByTestId("action-user"),
        page.getByTestId("map-menu"),
        microphone,
    ];
    const onboardingSkip = page.getByTestId("onboarding-button-welcome-skip");
    const errorOccurred = page.getByText("An error occurred").first();

    for (let attempt = 0; attempt < 2; attempt++) {
        const visibleControl = await Promise.race([
            skip.waitFor({ state: "visible", timeout: 90_000 }).then(() => "pwa" as const),
            ...mapLoadedControls.map((control) =>
                control.waitFor({ state: "visible", timeout: 90_000 }).then(() => "map" as const),
            ),
            onboardingSkip.waitFor({ state: "visible", timeout: 90_000 }).then(() => "onboarding" as const),
            errorOccurred.waitFor({ state: "visible", timeout: 90_000 }).then(() => "error" as const),
        ]).catch(() => undefined);

        if (visibleControl === undefined) {
            throw new Error("Timed out waiting for PWA install screen, onboarding, map controls, or an error screen.");
        }

        if (visibleControl === "onboarding") {
            await dismissOnboardingIfShown(page, 500);
            continue;
        }

        if (visibleControl === "pwa" && (await skip.isVisible())) {
            if (dontShowAgain) {
                await neverShowAgain.click();
            }
            await skip.click();
        }

        return;
    }

    throw new Error("Onboarding was still blocking PWA install screen handling after being dismissed twice.");
}
