import type { Page } from "@playwright/test";

/**
 * When the audio context is still suspended, the "no browser sound" info toast may appear with an
 * "Enable sound" action. Clicking it resumes the audio context and clears the toast.
 * No-op if the toast is not shown before the microphone is in visible state.
 */
export async function dismissNoBrowserSoundInfoToast(page: Page, timeoutMs: number = 5_000): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("audio-playback-retry"), async (retryButton) => {
        try {
            // The toast can start disappearing as the AudioContext resumes, so do not wait for stable actionability.
            // eslint-disable-next-line playwright/no-force-option
            await retryButton.click({ force: true, timeout: timeoutMs });
        } catch (e) {
            if (page.isClosed() || (await retryButton.isHidden().catch(() => true))) {
                return;
            }
            throw e;
        }
    });
}
