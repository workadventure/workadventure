import type { Page } from "@playwright/test";

export async function dismissNoMicrophoneSoundToastWhenShown(page: Page): Promise<void> {
    const ignoreButton = page.getByTestId("no-microphone-sound-ignore");
    await page.addLocatorHandler(ignoreButton, async () => {
        try {
            // Short timeout: the toast also hides on its own (sound detected, someone joins the conversation), and
            // clicking a button that is gone would wait for the whole action timeout, failing the test.
            await ignoreButton.click({ timeout: 5_000 });
        } catch (e) {
            if (e instanceof Error && e.message.includes("Target page, context or browser has been closed")) {
                return;
            }
            if (await ignoreButton.isVisible().catch(() => false)) {
                throw e;
            }
        }
    });
}
