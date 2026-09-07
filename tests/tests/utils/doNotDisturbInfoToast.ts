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

/**
 * The "no microphone sound" warning toast sits at z-999 in the top-right corner and can appear at
 * any moment once the mic is live — including in the middle of a test, on top of whatever the test
 * is about to click. It swallowed the shared-screen controls in screenAnnotation.
 *
 * Registered as a locator handler rather than dismissed once at login: it is not there at login,
 * it shows up when the detector decides it has heard nothing.
 */
export async function dismissNoMicrophoneSoundToast(page: Page, timeoutMs: number = 5_000): Promise<void> {
    await page.addLocatorHandler(page.getByTestId("no-microphone-sound-ignore"), async (ignoreButton) => {
        try {
            // The toast auto-dismisses, so do not wait for stable actionability.
            // eslint-disable-next-line playwright/no-force-option
            await ignoreButton.click({ force: true, timeout: timeoutMs });
        } catch (e) {
            if (page.isClosed() || (await ignoreButton.isHidden().catch(() => true))) {
                return;
            }
            throw e;
        }
    });
}
