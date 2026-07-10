import { asError } from "catch-unknown";

/**
 * This class can create a lock by key to prevent async issues.
 * Each call to waitForLock chains after the previous one for the same key,
 * ensuring sequential execution even when multiple requests arrive concurrently.
 */
export class LockByKey<T> {
    private locks = new Map<T, Promise<void>>();

    /**
     * @param onTimeout Called when an operation exceeds its timeout, just before the returned promise rejects.
     *                  Use it to report the timeout (e.g. to Sentry).
     * @param onError   Called when a queued callback rejects, just before the returned promise rejects.
     *                  Use it to report the failure (e.g. console.error + Sentry). The error still
     *                  propagates to the caller of waitForLock; this is only for observability.
     */
    constructor(
        private readonly onTimeout: (error: Error, key: T, timeoutMs: number) => void,
        private readonly onError: (error: Error, key: T) => void,
    ) {}

    /**
     * Wraps a promise with a timeout.
     * Rejects if the promise doesn't resolve within timeoutMs.
     */
    private withTimeout<R>(promise: Promise<R>, timeoutMs: number, key: T): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                const error = new Error(`Lock timeout after ${timeoutMs}ms for key: ${String(key)}`);
                this.onTimeout(error, key, timeoutMs);
                reject(error);
            }, timeoutMs);

            promise
                .then((result) => {
                    clearTimeout(timeoutHandle);
                    resolve(result);
                })
                .catch((err: unknown) => {
                    clearTimeout(timeoutHandle);
                    reject(asError(err));
                });
        });
    }

    /**
     * Queues an operation for a specific key to ensure sequential execution.
     * Each new operation chains after the previous one, preventing race conditions.
     *
     * @param timeoutMs If set, the returned promise rejects when the operation takes longer.
     *                  Warning: the timeout does NOT cancel the running callback, and the next queued
     *                  operation starts as soon as the promise rejects, so it may run concurrently with
     *                  the timed-out callback. Only use a timeout when releasing the queue matters more
     *                  than strict mutual exclusion. Without a timeout, exclusion is guaranteed.
     */
    public waitForLock<R>(key: T, callback: () => Promise<R>, timeoutMs?: number): Promise<R> {
        const previousOperation = this.locks.get(key) ?? Promise.resolve();

        // Chain the new operation after the previous one
        const newOperation = previousOperation.then(() => {
            // Tap the raw callback rejection for observability, then rethrow so the caller still sees
            // it. Tapping here (not on the timeout wrapper) avoids double-reporting a timeout, which is
            // already surfaced through onTimeout.
            const result = callback().catch((err: unknown) => {
                const error = asError(err);
                this.onError(error, key);
                throw error;
            });
            return timeoutMs === undefined ? result : this.withTimeout(result, timeoutMs, key);
        });

        // Store a settled marker immediately (before awaiting) so subsequent calls chain after this
        // operation, and so a failed operation doesn't reject the whole queue.
        const marker = newOperation.then(
            () => undefined,
            () => undefined,
        );
        this.locks.set(key, marker);

        // Clean up the map once the queue for this key is idle
        marker
            .then(() => {
                if (this.locks.get(key) === marker) {
                    this.locks.delete(key);
                }
            })
            .catch(() => {
                // marker never rejects
            });

        return newOperation;
    }
}
