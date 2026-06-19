import type { Page } from "@playwright/test";

export async function dismissNoMicrophoneSoundToastWhenShown(page: Page): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("no-microphone-sound-ignore"), async () => {
        try {
            await page.getByTestId("no-microphone-sound-ignore").click();
        } catch (e) {
            if (e instanceof Error && e.message.includes("Target page, context or browser has been closed")) {
                return;
            }
            throw e;
        }
    });
}
