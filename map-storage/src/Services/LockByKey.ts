/**
 * This class can create a lock by key to prevent async issues.
 * Each call to waitForLock chains after the previous one for the same key,
 * ensuring sequential execution even when multiple requests arrive concurrently.
 */
import * as Sentry from "@sentry/node";
import { asError } from "catch-unknown";

export class LockByKey<T> {
    private locks = new Map<T, Promise<void>>();
    private static DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

    /**
     * Wraps a promise with a timeout.
     * Rejects if the promise doesn't resolve within timeoutMs.
     */
    private withTimeout<R>(promise: Promise<R>, timeoutMs: number, key: T): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                const error = new Error(`Lock timeout after ${timeoutMs}ms for key: ${String(key)}`);
                Sentry.captureException(error, {
                    tags: { key: String(key), location: "withTimeout" },
                    extra: { timeoutMs },
                });
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
     */
    public waitForLock(key: T, callback: () => Promise<void>, timeoutMs = LockByKey.DEFAULT_TIMEOUT_MS): Promise<void> {
        const previousOperation = this.locks.get(key) ?? Promise.resolve();

        // Chain the new operation after the previous one
        // We catch errors from previous operations to continue the queue
        const newOperation = previousOperation
            .catch((_err: Error) => {
                // Ignore errors from previous operations to continue the queue
            })
            .then(() => {
                return this.withTimeout(callback(), timeoutMs, key);
            });

        // Store the new operation immediately (before awaiting)
        // This is the key fix: subsequent calls will chain after this operation
        this.locks.set(key, newOperation);

        // Clean up the map when the operation completes
        newOperation
            .finally(() => {
                if (this.locks.get(key) === newOperation) {
                    this.locks.delete(key);
                }
            })
            .catch(() => {
                // Ignore cleanup errors (already handled by caller)
            });

        return newOperation;
    }
}
