import type { Page } from "@playwright/test";

export async function dismissNoMicrophoneSoundInfoToast(page: Page): Promise<void> {
    // Required because the "No sound" popup can clutter the view and prevent us clicking the "All settings" close button.
    await page.addLocatorHandler(page.getByTestId("no-microphone-sound-ignore"), async () => {
        await page.getByTestId("no-microphone-sound-ignore").click();
    });
}
