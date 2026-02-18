/**
 * Configuration options for RetryWithBackoff
 */
export interface RetryWithBackoffOptions {
    /** Maximum number of retry attempts (default: 30) */
    maxAttempts?: number;
    /** Initial delay in milliseconds before first retry (default: 500ms) */
    initialDelayMs?: number;
    /** Maximum delay cap in milliseconds (default: 15000ms / 15s) */
    maxDelayMs?: number;
    /** Backoff multiplier applied to each subsequent retry (default: 1.2) */
    backoffMultiplier?: number;
    /** Callback executed when max retries are reached */
    onMaxRetriesReached?: () => void;
}

/**
 * Error thrown when maximum retry attempts are reached
 */
export class MaxRetriesReachedError extends Error {
    constructor(public readonly attemptCount: number, public readonly identifier: string) {
        super(`Max retries reached (${attemptCount}) for identifier: ${identifier}`);
        this.name = "MaxRetriesReachedError";
    }
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<Omit<RetryWithBackoffOptions, "onMaxRetriesReached">> = {
    maxAttempts: 30,
    initialDelayMs: 500,
    maxDelayMs: 15000,
    backoffMultiplier: 1.2,
};

/**
 * RetryWithBackoff - A utility class for implementing retry logic with exponential backoff
 *
 * Features:
 * - Exponential backoff with configurable multiplier
 * - Maximum delay cap (default 15 seconds)
 * - Maximum retry attempts (default 30)
 * - Callback when max retries reached
 * - Per-identifier tracking for concurrent retry operations
 * - Cancellation support
 *
 * @example
 * ```typescript
 * const retry = new RetryWithBackoff({
 *   maxAttempts: 30,
 *   maxDelayMs: 15000,
 *   onMaxRetriesReached: () => console.log('All retries exhausted')
 * });
 *
 * retry.scheduleRetry('user-123', () => attemptConnection());
 * ```
 */
export class RetryWithBackoff {
    private readonly maxAttempts: number;
    private readonly initialDelayMs: number;
    private readonly maxDelayMs: number;
    private readonly backoffMultiplier: number;
    private readonly onMaxRetriesReached?: () => void;

    private readonly attemptCounts: Map<string, number> = new Map();
    private readonly timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private readonly failedIdentifiers: Set<string> = new Set();

    constructor(options: RetryWithBackoffOptions = {}) {
        this.maxAttempts = options.maxAttempts ?? DEFAULT_OPTIONS.maxAttempts;
        this.initialDelayMs = options.initialDelayMs ?? DEFAULT_OPTIONS.initialDelayMs;
        this.maxDelayMs = options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;
        this.backoffMultiplier = options.backoffMultiplier ?? DEFAULT_OPTIONS.backoffMultiplier;
        this.onMaxRetriesReached = options.onMaxRetriesReached;
    }

    /**
     * Calculates the delay for a given attempt number using exponential backoff
     * Formula: min(initialDelay * multiplier^attempt, maxDelay)
     */
    public calculateDelay(attemptNumber: number): number {
        const exponentialDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attemptNumber);
        return Math.min(exponentialDelay, this.maxDelayMs);
    }

    /**
     * Schedules a retry for the given identifier
     * @param identifier - Unique identifier for the retry operation (e.g., userId)
     * @param retryCallback - Function to execute on retry
     * @returns true if retry was scheduled, false if max retries reached
     */
    public scheduleRetry(identifier: string, retryCallback: () => void): boolean {
        this.clearTimeout(identifier);

        const currentAttempt = this.attemptCounts.get(identifier) ?? 0;
        const nextAttempt = currentAttempt + 1;

        if (nextAttempt > this.maxAttempts) {
            this.failedIdentifiers.add(identifier);
            this.onMaxRetriesReached?.();
            return false;
        }

        this.attemptCounts.set(identifier, nextAttempt);

        const delay = this.calculateDelay(currentAttempt);

        const timeout = setTimeout(() => {
            this.timeouts.delete(identifier);
            retryCallback();
        }, delay);

        this.timeouts.set(identifier, timeout);
        return true;
    }

    /**
     * Cancels any pending retry for the given identifier and resets all state
     */
    public cancel(identifier: string): void {
        this.clearTimeout(identifier);
        this.attemptCounts.delete(identifier);
        this.failedIdentifiers.delete(identifier);
    }

    /**
     * Cancels only the pending retry timeout without resetting the attempt count.
     * Use this when you want to stop a pending retry but preserve the attempt history
     * (e.g., for tracking unstable connections).
     */
    public cancelTimeoutOnly(identifier: string): void {
        this.clearTimeout(identifier);
    }

    /**
     * Clears all pending retries and resets state
     */
    public cancelAll(): void {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        this.attemptCounts.clear();
        this.failedIdentifiers.clear();
    }

    /**
     * Resets the attempt count for a given identifier (e.g., after successful connection)
     */
    public resetAttempts(identifier: string): void {
        this.clearTimeout(identifier);
        this.attemptCounts.delete(identifier);
        this.failedIdentifiers.delete(identifier);
    }

    /**
     * Gets the current attempt count for an identifier
     */
    public getAttemptCount(identifier: string): number {
        return this.attemptCounts.get(identifier) ?? 0;
    }

    /**
     * Checks if an identifier has reached the maximum retry limit
     */
    public hasReachedMaxRetries(identifier: string): boolean {
        return this.failedIdentifiers.has(identifier);
    }

    /**
     * Gets all identifiers that have reached max retries
     */
    public getFailedIdentifiers(): ReadonlySet<string> {
        return this.failedIdentifiers;
    }

    /**
     * Checks if there's a pending retry for the given identifier
     */
    public hasPendingRetry(identifier: string): boolean {
        return this.timeouts.has(identifier);
    }

    /**
     * Gets the configured max attempts
     */
    public getMaxAttempts(): number {
        return this.maxAttempts;
    }

    /**
     * Gets the configured max delay in milliseconds
     */
    public getMaxDelayMs(): number {
        return this.maxDelayMs;
    }

    private clearTimeout(identifier: string): void {
        const existingTimeout = this.timeouts.get(identifier);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.timeouts.delete(identifier);
        }
    }
}
