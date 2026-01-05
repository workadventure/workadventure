import * as Sentry from "@sentry/svelte";

/**
 * Handle for a token removal operation that can be cancelled before execution.
 */
export interface TokenRemovalHandle {
    /**
     * Cancels the operation before execution. If the callback hasn't been executed yet,
     * it will never be executed and the token is refunded to the bucket.
     * Calling cancel() after the callback has already been executed has no effect.
     */
    cancel(this: void): void;
}

/**
 * A Token Bucket rate limiter that allows bursts of operations followed by a controlled refill rate.
 * Supports cancellation of pending operations with automatic token refund.
 *
 * @example
 * ```typescript
 * const bucket = new TokenBucket(5, 1, 1000); // 5 tokens, refill 1 token per second
 *
 * // Immediate execution (returns undefined)
 * const handle1 = bucket.removeToken(() => {
 *   console.log("Executed immediately");
 * });
 * // handle1 is undefined
 *
 * // Queued execution (returns handle)
 * const handle2 = bucket.removeToken(() => {
 *   console.log("Queued for later");
 * });
 * // handle2 can be used to cancel
 * handle2?.cancel(); // Token is refunded
 * ```
 */
export class TokenBucket {
    private tokens: number;
    private readonly queue: Array<{ callback: () => void; canceled: boolean; executed: boolean }> = [];
    private refillTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Creates a new TokenBucket rate limiter.
     *
     * @param capacity - Maximum number of tokens in the bucket
     * @param refillRate - Number of tokens to add per refill interval
     * @param refillInterval - Time in milliseconds between refills (default: 1000ms)
     */
    constructor(
        private readonly capacity: number,
        private readonly refillRate: number,
        private readonly refillInterval: number = 1000
    ) {
        if (capacity <= 0) {
            throw new Error("Capacity must be greater than 0");
        }
        if (refillRate <= 0) {
            throw new Error("Refill rate must be greater than 0");
        }
        if (refillInterval <= 0) {
            throw new Error("Refill interval must be greater than 0");
        }

        this.tokens = capacity;
    }

    /**
     * Removes a token and executes the callback immediately if tokens are available,
     * otherwise queues the callback for later execution when tokens are refilled.
     *
     * @param callback - Function to execute when a token is available
     * @returns Handle with a cancel() method if the callback is queued, or undefined if executed immediately
     */
    public removeToken(callback: () => void): TokenRemovalHandle | undefined {
        const queueEntry = { callback, canceled: false, executed: false };

        if (this.tokens > 0) {
            this.tokens--;
            this.executeCallback(queueEntry);
            this.startRefillTimerIfNeeded();
            return undefined;
        } else {
            this.queue.push(queueEntry);
            this.startRefillTimerIfNeeded();
            return {
                cancel: () => this.cancelOperation(queueEntry),
            };
        }
    }

    /**
     * Cancels a pending operation. If the callback hasn't been executed yet,
     * it will never be executed and the token is refunded.
     *
     * @param queueEntry - The queue entry to cancel
     */
    private cancelOperation(queueEntry: { callback: () => void; canceled: boolean; executed: boolean }): void {
        if (queueEntry.executed) {
            // Already executed, cannot cancel
            return;
        }

        if (!queueEntry.canceled) {
            queueEntry.canceled = true;

            // Refund the token (capped at capacity)
            if (this.tokens < this.capacity) {
                this.tokens++;

                // Try to process any waiting callbacks with the refunded token
                this.processQueue();
            }
        }
    }

    /**
     * Executes a callback safely with error handling.
     *
     * @param queueEntry - The queue entry to execute
     */
    private executeCallback(queueEntry: { callback: () => void; canceled: boolean; executed: boolean }): void {
        queueEntry.executed = true;
        try {
            queueEntry.callback();
        } catch (error) {
            console.error("Error executing TokenBucket callback:", error);
            Sentry.captureException(error);
        }
    }

    /**
     * Processes the queue, executing callbacks for available tokens while skipping canceled ones.
     */
    private processQueue(): void {
        while (this.queue.length > 0 && this.tokens > 0) {
            const queueEntry = this.queue.shift();
            if (!queueEntry) break;

            if (!queueEntry.canceled) {
                this.tokens--;
                this.executeCallback(queueEntry);
            }
            // If canceled, skip it (token already refunded)
        }
    }

    /**
     * Starts the refill timer if it's not already running and there are tokens to refill
     * or callbacks waiting in the queue.
     */
    private startRefillTimerIfNeeded(): void {
        if (this.refillTimer !== null) {
            // Timer already running
            return;
        }

        // Start timer if we're not at full capacity or have queued callbacks
        if (this.tokens < this.capacity || this.queue.length > 0) {
            this.scheduleNextRefill();
        }
    }

    /**
     * Schedules the next refill using setTimeout.
     */
    private scheduleNextRefill(): void {
        this.refillTimer = setTimeout(() => {
            this.refill();
        }, this.refillInterval);
    }

    /**
     * Refills tokens and processes the queue. Stops the timer if at full capacity with no queue.
     */
    private refill(): void {
        // Add tokens (capped at capacity)
        this.tokens = Math.min(this.tokens + this.refillRate, this.capacity);

        // Process any waiting callbacks
        this.processQueue();

        // Check if we should continue refilling
        if (this.tokens < this.capacity || this.queue.length > 0) {
            this.scheduleNextRefill();
        } else {
            // Stop refilling - we're at full capacity with no queue
            this.refillTimer = null;
        }
    }

    /**
     * Cleans up the refill timer. Should be called when the TokenBucket is no longer needed.
     */
    public destroy(): void {
        if (this.refillTimer !== null) {
            clearTimeout(this.refillTimer);
            this.refillTimer = null;
        }

        // Clear the queue
        this.queue.length = 0;
    }

    /**
     * Returns statistics about the current state of the TokenBucket.
     *
     * @returns Object containing current tokens, queue length, and refill status
     */
    public getStats(): { tokens: number; queueLength: number; isRefilling: boolean } {
        return {
            tokens: this.tokens,
            queueLength: this.queue.length,
            isRefilling: this.refillTimer !== null,
        };
    }
}
