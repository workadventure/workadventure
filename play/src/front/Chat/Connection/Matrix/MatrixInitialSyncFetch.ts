/**
 * How long an initial `/sync` is allowed to run before we give up on it.
 *
 * Still bounded: an unbounded request would reintroduce the wedged-connection problem the SDK's own
 * deadline guards against. This only has to be longer than the homeserver takes to answer.
 */
export const INITIAL_SYNC_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Whether this request is an *initial* `/sync` - the one that returns the whole account, with no
 * `since` token to start from.
 *
 * matrix-js-sdk adds `_cacheBuster` to a sync request precisely when it has no sync token to send
 * (`getSyncParams` in its sync.ts), so its presence is what marks an initial sync; `since` is checked
 * as well so the test stays right if that ever changes.
 */
function isInitialSyncRequest(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    return (
        parsed.pathname.endsWith("/sync") &&
        parsed.searchParams.has("_cacheBuster") &&
        !parsed.searchParams.has("since")
    );
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input;
    }
    if (input instanceof URL) {
        return input.href;
    }
    return input.url;
}

/**
 * `fetch` for the Matrix client, giving the initial sync more time than the SDK would.
 *
 * matrix-js-sdk caps how long it keeps a `/sync` connection open at the requested `timeout=` plus a
 * fixed 80s buffer (`BUFFER_PERIOD_MS` in its sync.ts). That buffer is meant to detect a wedged
 * connection on a long poll, where `timeout=` is 30s and the ceiling therefore lands at 110s. The
 * initial sync is not a long poll though - it sends `timeout=0` because there is nothing to wait for -
 * so the ceiling collapses to a flat 80s deadline on a response whose cost grows with the size of the
 * account. Past that, the SDK aborts and retries from scratch, which produces the exact same request
 * and the exact same abort: the chat never connects, and signing out makes it worse by clearing the
 * store and guaranteeing another full initial sync.
 *
 * Lazy loading should keep the initial sync well under the SDK's deadline; this is the net for the
 * accounts that stay above it. The value is not configurable in the SDK, and swapping the abort signal
 * is the only way to raise it from the outside.
 *
 * Trade-off: the SDK can no longer abort this particular request, so `stopClient()` leaves it in
 * flight. It is harmless - the sync loop has stopped by the time the response lands, and ignores it.
 */
export const initialSyncAwareFetch: typeof globalThis.fetch = (input, init) => {
    if (!isInitialSyncRequest(requestUrl(input))) {
        return fetch(input, init);
    }
    return fetch(input, { ...init, signal: AbortSignal.timeout(INITIAL_SYNC_TIMEOUT_MS) });
};
