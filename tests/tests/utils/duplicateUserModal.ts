import type { Page } from "@playwright/test";
import { dismissOnboardingIfShown } from "./onboarding";

/**
 * After the room connection is established, the "already connected in another tab" modal may appear.
 * Waits until that screen, the game (microphone), or an error message is visible; if the duplicate-user
 * screen is shown, clicks "Continue" so tests can proceed (same pattern as `dismissPwaInstallScreenIfShown`).
 */
export async function dismissDuplicateUserConnectedModalIfShown(
    page: Page,
    dontRemindAgain: boolean = false,
): Promise<void> {
    const confirm = page.getByTestId("duplicate-user-confirm-continue");
    const dontRemindCheckbox = page.getByTestId("duplicate-user-dont-remind-again");
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
            confirm.waitFor({ state: "visible", timeout: 90_000 }).then(() => "confirm" as const),
            ...mapLoadedControls.map((control) =>
                control.waitFor({ state: "visible", timeout: 90_000 }).then(() => "map" as const),
            ),
            onboardingSkip.waitFor({ state: "visible", timeout: 90_000 }).then(() => "onboarding" as const),
            errorOccurred.waitFor({ state: "visible", timeout: 90_000 }).then(() => "error" as const),
        ]).catch(() => undefined);

        if (visibleControl === undefined) {
            throw new Error(
                "Timed out waiting for duplicate-user modal, onboarding, map controls, or an error screen.",
            );
        }

        if (visibleControl === "onboarding") {
            await dismissOnboardingIfShown(page, 500);
            continue;
        }

        if (visibleControl === "confirm") {
            if (dontRemindAgain) {
                await dontRemindCheckbox.check();
            }
            await confirm.click();
        }

        return;
    }

    throw new Error("Onboarding was still blocking duplicate-user modal handling after being dismissed twice.");
}
