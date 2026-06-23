import type { Page } from "@playwright/test";

/**
 * When the audio context is still suspended, the "no browser sound" info toast may appear with an
 * "Enable sound" action. Clicking it resumes the audio context and clears the toast.
 * No-op if the toast is not shown before the microphone is in visible state.
 */
export async function dismissNoBrowserSoundInfoToast(page: Page, timeoutMs: number = 5_000): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("audio-playback-retry"), async () => {
        try {
            await page.getByTestId("audio-playback-retry").click();
        } catch (e) {
            if (e instanceof Error && e.message.includes("Target page, context or browser has been closed")) {
                return;
            }
            throw e;
        }
    });
}
