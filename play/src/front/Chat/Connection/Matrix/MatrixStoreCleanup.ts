import * as Sentry from "@sentry/svelte";
import type { MatrixClient } from "matrix-js-sdk";
import { raceTimeout } from "../../../Utils/PromiseUtils";

/**
 * How long we are willing to wait for the Matrix IndexedDB databases to be dropped.
 *
 * Deleting them is normally instantaneous; the timeout only exists to bound the pathological case described
 * in {@link clearMatrixStores}.
 */
export const CLEAR_STORES_TIMEOUT_MS = 10_000;

/**
 * Clears the Matrix stores, giving up rather than waiting forever.
 *
 * matrix-js-sdk drops its databases with `indexedDB.deleteDatabase()`, and both call sites - `clearStores()`
 * for the rust crypto store and `LocalIndexedDBStoreBackend.clearDatabase()` for the sync store - install an
 * `onblocked` handler that only logs. IndexedDB blocks a deletion for as long as another connection to the
 * same database is open, and since every WorkAdventure tab opens the very same databases (the sync store is
 * named "workadventure-matrix" and the rust crypto store uses the SDK's global prefix), a second tab is
 * enough to keep the request blocked. Neither handler settles the promise in that case, so awaiting it as-is
 * hangs the caller for good: the connection status stays on its initial "CONNECTING" value and the chat
 * spins forever with nothing in the UI to say why.
 *
 * Failing here is not fatal - a stale store is recoverable, an infinite spinner is not - so the error is
 * reported and the caller carries on.
 */
export async function clearMatrixStores(client: MatrixClient): Promise<void> {
    try {
        await raceTimeout(client.clearStores(), CLEAR_STORES_TIMEOUT_MS);
    } catch (error) {
        console.error(
            "Failed to clear the Matrix stores. Another tab holding the same IndexedDB databases open will " +
                "block the deletion.",
            error,
        );
        Sentry.captureException(error);
    }
}
