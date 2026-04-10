import type { Page } from "@playwright/test";

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
    const errorOccurred = page.getByText("An error occurred").first();

    await Promise.race([
        confirm.waitFor({ state: "visible", timeout: 90_000 }),
        microphone.waitFor({ state: "visible", timeout: 90_000 }),
        errorOccurred.waitFor({ state: "visible", timeout: 90_000 }),
    ]);

    if (await confirm.isVisible()) {
        if (dontRemindAgain) {
            await dontRemindCheckbox.check();
        }
        await confirm.click();
    }
}
