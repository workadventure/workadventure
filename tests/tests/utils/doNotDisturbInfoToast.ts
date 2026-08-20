import type { Page } from "@playwright/test";

/**
 * A locator handler runs *inside* the action that triggered it, so anything that wedges in the handler wedges
 * that action too. Observed in CI, the call log ends on
 *
 *   - found getByTestId('audio-playback-retry'), intercepting action to run the handler
 *
 * with no matching "locator handler has finished", and the triggering assertion then dies at the 120s test
 * timeout having never been evaluated once ("Received: undefined", or an empty class string for
 * `not.toHaveClass` — a value that trivially passes, which is the tell that it never ran).
 *
 * The click below already passes a Playwright `timeout`, and in a standalone reproduction that bound is
 * honoured — so whatever wedges in CI is not reproducible here and remains unexplained. Rather than trust the
 * inner timeout, the handler enforces its own: `withDeadline` resolves on a timer independent of Playwright,
 * so the handler returns even if the action inside it never settles. Verified against a handler that hangs
 * forever, in both chromium and firefox: without the deadline the triggering assertion starves for its whole
 * timeout, with it the assertion proceeds and passes.
 */
const DISMISS_DEADLINE_MS = 1_000;

/**
 * A toast that cannot be dismissed would otherwise re-enter the handler on every actionability poll for the
 * rest of the test, spending the deadline each time and dispatching an endless stream of clicks into the app
 * under test (each also triggers the toast's own pointerdown listener). The toast's real use case is a single
 * appearance on load that the first click clears, so a handful of attempts is plenty.
 */
const MAX_DISMISS_ATTEMPTS = 5;

/**
 * `addLocatorHandler` appends a handler, it does not replace one, and several helpers on the login path call
 * this for the same page. Without this guard they stack up and fight over the same button.
 */
const pagesWithHandler = new WeakSet<Page>();

/**
 * Resolves when `work` settles or when `ms` elapses, whichever comes first. Never rejects.
 *
 * `work` is always given a `.catch`, so a rejection arriving after the deadline cannot surface as an
 * unhandled rejection and fail an unrelated test.
 */
async function withDeadline(work: Promise<unknown>, ms: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            work.catch(() => undefined),
            new Promise<void>((resolve) => {
                timer = setTimeout(resolve, ms);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

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
            // Dismissing the toast is best effort: it never carries the assertion the caller cares about, so
            // failures are swallowed and the triggering action is left to report its own result. The toast can
            // start disappearing as the AudioContext resumes, so do not wait for stable actionability.
            // eslint-disable-next-line playwright/no-force-option
            await withDeadline(retryButton.click({ force: true, timeout: DISMISS_DEADLINE_MS }), DISMISS_DEADLINE_MS);
        },
        {
            // Do not block the triggering action waiting for the toast to disappear. The toast renders in the
            // top-right corner (MainLayout) and never covers the action bar the assertions target, so a retry
            // that fails to resume audio must not hold that action hostage.
            noWaitAfter: true,
            times: MAX_DISMISS_ATTEMPTS,
        },
    );
}
