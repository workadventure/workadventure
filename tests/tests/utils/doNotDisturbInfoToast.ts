import type { Page } from "@playwright/test";

/**
 * By default Playwright, after running a locator handler, blocks the triggering action until the handler's
 * locator becomes hidden. When the toast cannot be cleared — headless Firefox regularly refuses to resume the
 * AudioContext, and the app re-raises the toast when a retry fails — that wait never ends, so the action that
 * triggered the handler is never evaluated even once. It then fails at the test timeout with a message that
 * describes nothing ("Received: undefined", or an empty class string for `not.toHaveClass`).
 *
 * `noWaitAfter` is what breaks that: the toast sits in the top-right corner (see MainLayout), it never covers
 * the action bar the assertions target, so there is no reason to wait on it. Note that bounding the handler
 * with `times` alone does NOT help — the very first invocation blocks forever, so the limit is never reached.
 */
const CLICK_TIMEOUT_MS = 2_000;

/**
 * A stuck toast would otherwise have the handler re-fire on every actionability poll for the rest of the test,
 * dispatching an endless stream of clicks into the app under test (each one also triggers the toast's own
 * pointerdown listener). Retrying a handful of times is enough for the toast's real use case: it appears once,
 * on load, and the first click normally clears it.
 */
const MAX_DISMISS_ATTEMPTS = 10;

/**
 * `addLocatorHandler` appends a handler, it does not replace one, and several helpers on the login path call
 * this for the same page. Without this guard they stack up and fight over the same button.
 */
const pagesWithHandler = new WeakSet<Page>();

/**
 * When the audio context is still suspended, the "no browser sound" info toast may appear with an
 * "Enable sound" action. Clicking it resumes the audio context and clears the toast.
 * No-op if the toast is not shown before the microphone is in visible state.
 */
export async function dismissNoBrowserSoundInfoToast(page: Page): Promise<void> {
    if (pagesWithHandler.has(page)) {
        return;
    }
    pagesWithHandler.add(page);

    await page.addLocatorHandler(
        page.getByTestId("audio-playback-retry"),
        async (retryButton) => {
            try {
                // The toast can start disappearing as the AudioContext resumes, so do not wait for stable
                // actionability.
                // eslint-disable-next-line playwright/no-force-option
                await retryButton.click({ force: true, timeout: CLICK_TIMEOUT_MS });
            } catch {
                // Dismissing the toast is best effort: it never carries the assertion the caller cares about.
                // Throwing here would surface inside whatever unrelated action happened to trigger the
                // handler, so swallow it and let that action report its own result.
            }
        },
        { noWaitAfter: true, times: MAX_DISMISS_ATTEMPTS },
    );
}
