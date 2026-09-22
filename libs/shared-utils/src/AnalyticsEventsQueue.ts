import axios, { isAxiosError } from "axios";
import type { AnalyticsEventsBatchPayload, AnalyticsStoredEvent } from "@workadventure/messages";

const SCHEMA_VERSION = 1;
const RETRY_JITTER_MIN_MS = 50;
const RETRY_JITTER_MAX_MS = 250;
const MAX_FLUSH_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 5_000;

export type AnalyticsEventsQueueConfig = {
    adminApiUrl: string | undefined;
    adminApiToken: string | undefined;
    flushIntervalMs: number;
    timeoutMs: number;
    maxQueueSize: number;
    maxBatchSize: number;
    /**
     * Named for the pusher because that is who filled it first. The admin treats it as
     * an opaque instance label and nothing keys on it, so the back fills it too.
     */
    pusherInstanceId: string;
};

export type AnalyticsEventsQueueStats = {
    queueSize: number;
    droppedOnOverflow: number;
    droppedInvalid: number;
    droppedAfterSendFailure: number;
    batchesSent: number;
    eventsSent: number;
    flushErrors: number;
};

/**
 * Derived from the schema Swagger publishes, rather than written out again here:
 * the two used to be separate declarations that could disagree without anything
 * noticing.
 */
export type AnalyticsEventsBatch = AnalyticsEventsBatchPayload;

export type AnalyticsEventsHttpPost = (
    url: string,
    payload: AnalyticsEventsBatch,
    options: { headers: Record<string, string>; timeout: number },
) => Promise<unknown>;

/**
 * A bounded queue of analytics rows, flushed to the admin's `events-batch` endpoint
 * in batches, with transient-failure retries and a bounded drain for shutdown.
 *
 * Shared by the pusher and the back, which both write rows and would otherwise
 * carry two copies of the same transport. What is NOT here is everything that
 * shapes a row: the pusher validates and enriches what its sockets report, the back
 * builds rows from its own state, and each does that on its own side before
 * calling `enqueue`.
 *
 * Nothing is sent until `setEnabled(true)`: the pusher gates on the admin
 * advertising the endpoint, the back on being configured at all.
 */
export class AnalyticsEventsQueue {
    private readonly queue: AnalyticsStoredEvent[] = [];
    private readonly endpointUrl: string | undefined;
    private readonly timer: NodeJS.Timeout | undefined;
    private isFlushing = false;
    private enabled = false;
    protected droppedOnOverflow = 0;
    protected droppedInvalid = 0;
    protected droppedAfterSendFailure = 0;
    protected batchesSent = 0;
    protected eventsSent = 0;
    protected flushErrors = 0;

    public constructor(
        protected readonly config: AnalyticsEventsQueueConfig,
        private readonly post: AnalyticsEventsHttpPost = (url, payload, options) => axios.post(url, payload, options),
        protected readonly now: () => Date = () => new Date(),
        private readonly random: () => number = Math.random,
    ) {
        this.endpointUrl = config.adminApiUrl
            ? `${config.adminApiUrl.replace(/\/+$/, "")}/api/analytics/events-batch`
            : undefined;

        if (this.hasAdminApiConfig() && config.flushIntervalMs > 0) {
            this.timer = setInterval(() => {
                this.flush().catch((error) => {
                    this.logFlushError(error);
                });
            }, config.flushIntervalMs);
            // unref so a queue with nothing to say never holds the process open.
            this.timer.unref();
        }
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.queue.length = 0;
        }
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    /**
     * Drains the queue by flushing batches sequentially until it is empty or the deadline elapses.
     * Used by the graceful-shutdown hook so events queued at SIGTERM time still reach the admin.
     * Sequential awaits are intentional: flush() must complete before the next batch is sent.
     */
    public async drain(timeoutMs = 10_000): Promise<void> {
        if (!this.canSend()) {
            return;
        }

        const deadline = Date.now() + timeoutMs;
        // `isFlushing` too: flush() splices its batch out of the queue before
        // awaiting the POST, so on the last batch the queue is already empty while
        // the request is still in flight — and process.exit would cut it short.
        while ((this.queue.length > 0 || this.isFlushing) && Date.now() < deadline) {
            const lengthBefore = this.queue.length;
            // eslint-disable-next-line no-await-in-loop
            await this.flush(deadline);
            // flush() splices maxBatchSize events; loop again until queue is empty.
            // If nothing was sent (e.g. another flush is in flight), wait briefly and retry.
            if (this.queue.length === lengthBefore) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 50);
                });
            }
        }
    }

    public enqueue(event: AnalyticsStoredEvent): void {
        if (!this.canSend()) {
            return;
        }

        // Drop the oldest rather than the newest: an interval that closed five minutes
        // ago is less interesting than the one that just did, and a bounded queue is
        // what keeps a wedged admin from turning into a memory leak.
        if (this.queue.length >= this.config.maxQueueSize) {
            this.queue.shift();
            this.droppedOnOverflow += 1;
        }

        this.queue.push(event);
    }

    public async flush(deadline?: number): Promise<void> {
        if (!this.canSend() || this.queue.length === 0 || this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        const batchEvents = this.queue.splice(0, this.config.maxBatchSize);
        const batch: AnalyticsEventsBatch = {
            schemaVersion: SCHEMA_VERSION,
            sentAt: this.now().toISOString(),
            pusherInstanceId: this.config.pusherInstanceId,
            events: batchEvents,
        };

        try {
            const sentEvents = await this.sendWithRetry(batch, deadline);
            this.batchesSent += 1;
            this.eventsSent += sentEvents;
        } catch (error) {
            this.flushErrors += 1;
            this.droppedAfterSendFailure += batchEvents.length;
            this.logFlushError(error);
        } finally {
            this.isFlushing = false;
        }
    }

    public getStats(): AnalyticsEventsQueueStats {
        return {
            queueSize: this.queue.length,
            droppedOnOverflow: this.droppedOnOverflow,
            droppedInvalid: this.droppedInvalid,
            droppedAfterSendFailure: this.droppedAfterSendFailure,
            batchesSent: this.batchesSent,
            eventsSent: this.eventsSent,
            flushErrors: this.flushErrors,
        };
    }

    protected canSend(): boolean {
        return this.enabled && this.hasAdminApiConfig() && this.config.maxQueueSize > 0 && this.config.maxBatchSize > 0;
    }

    private hasAdminApiConfig(): boolean {
        return this.endpointUrl !== undefined && this.config.adminApiToken !== undefined;
    }

    private async sendWithRetry(batch: AnalyticsEventsBatch, deadline?: number): Promise<number> {
        if (!this.endpointUrl) {
            return 0;
        }

        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_FLUSH_ATTEMPTS; attempt++) {
            // During a bounded drain (SIGTERM), stop before starting an attempt we
            // have no time budget left for, so the drain never overshoots its deadline.
            if (deadline !== undefined && Date.now() >= deadline) {
                break;
            }
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.postBatch(batch, deadline);
                return batch.events.length;
            } catch (error) {
                lastError = error;
                if (this.shouldSplitInvalidBatch(error, batch)) {
                    // eslint-disable-next-line no-await-in-loop
                    return await this.sendEventsIndividually(batch, deadline);
                }
                // Don't retry on non-transient errors (4xx that isn't 422 already handled above).
                if (this.isNonRetryableError(error)) {
                    throw error;
                }
                if (attempt < MAX_FLUSH_ATTEMPTS - 1) {
                    const delay = this.retryDelayMs(attempt);
                    // Don't sleep past the drain deadline — that's exactly the overshoot
                    // (SIGKILL mid-flush) this bound exists to prevent.
                    if (deadline !== undefined && Date.now() + delay >= deadline) {
                        break;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await sleep(delay);
                }
            }
        }

        if (lastError instanceof Error) {
            throw lastError;
        }
        throw new Error("Analytics drain deadline reached before the batch could be sent");
    }

    private isNonRetryableError(error: unknown): boolean {
        if (!isAxiosError(error)) {
            return false;
        }
        const status = error.response?.status;
        // Retry 5xx + network failures. Treat 408/429 as retryable too.
        // 422 is handled via shouldSplitInvalidBatch above.
        if (status === undefined) {
            return false;
        }
        if (status === 408 || status === 429) {
            return false;
        }
        return status >= 400 && status < 500;
    }

    private async postBatch(batch: AnalyticsEventsBatch, deadline?: number): Promise<void> {
        if (!this.endpointUrl || this.config.adminApiToken === undefined) {
            return;
        }

        // Under a bounded drain, cap the HTTP timeout to the time left so a single
        // slow request cannot run past the drain deadline.
        const timeout =
            deadline !== undefined
                ? Math.max(1, Math.min(this.config.timeoutMs, deadline - Date.now()))
                : this.config.timeoutMs;

        await this.post(this.endpointUrl, batch, {
            headers: {
                Authorization: `Bearer ${this.config.adminApiToken}`,
                "Content-Type": "application/json",
            },
            timeout,
        });
    }

    /**
     * Per-event retry path after a 422 split. Never throws: partial success and
     * per-event failure are accounted to the per-class counters so the caller
     * cannot double-count `droppedAfterSendFailure` for events that already
     * succeeded individually. A non-validation error aborts the loop and the
     * remaining unsent events are recorded against `droppedAfterSendFailure`.
     */
    private async sendEventsIndividually(batch: AnalyticsEventsBatch, deadline?: number): Promise<number> {
        let sentEvents = 0;
        for (let i = 0; i < batch.events.length; i++) {
            const event = batch.events[i];

            // postBatch caps each request's timeout by the remaining budget, but the
            // loop itself must stop too: past the deadline this would still fire one
            // request per event (up to maxBatchSize, i.e. 1000 by default) with a 1ms
            // timeout each, pushing the shutdown well past its grace period.
            if (deadline !== undefined && Date.now() >= deadline) {
                const remaining = batch.events.length - i;
                this.droppedAfterSendFailure += remaining;
                console.warn("Analytics events dropped: drain deadline reached during the per-event retry", {
                    dropped: remaining,
                    sent: sentEvents,
                });
                return sentEvents;
            }

            try {
                // Same transient-retry policy as the batch: a 5xx/429 on one singleton
                // must not drop it and everything after it on the first attempt.
                // eslint-disable-next-line no-await-in-loop
                await this.sendWithRetry(
                    {
                        ...batch,
                        events: [event],
                    },
                    deadline,
                );
                sentEvents += 1;
            } catch (error) {
                if (this.isValidationError(error)) {
                    this.droppedInvalid += 1;
                    console.warn("Analytics event dropped after admin validation failed", {
                        eventName: event.eventName,
                        eventId: event.eventId,
                        response: isAxiosError(error) ? (error.response?.data as unknown) : undefined,
                    });
                    continue;
                }

                // Non-validation error mid-loop: stop and count only the events we did
                // not send (current one + everything after) as send-failure drops.
                const remaining = batch.events.length - i;
                this.droppedAfterSendFailure += remaining;
                this.flushErrors += 1;
                this.logFlushError(error);
                return sentEvents;
            }
        }
        return sentEvents;
    }

    private shouldSplitInvalidBatch(error: unknown, batch: AnalyticsEventsBatch): boolean {
        return batch.events.length > 1 && this.isValidationError(error);
    }

    private isValidationError(error: unknown): boolean {
        return isAxiosError(error) && error.response?.status === 422;
    }

    private retryDelayMs(attempt = 0): number {
        // Exponential backoff with full-jitter, capped at RETRY_MAX_DELAY_MS.
        // attempt is 0-based. attempt=0 ⇒ ~RETRY_BASE_DELAY_MS,
        // attempt=1 ⇒ up to 2x, attempt=2 ⇒ up to 4x, …
        const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
        const jitter =
            RETRY_JITTER_MIN_MS + Math.floor(this.random() * (RETRY_JITTER_MAX_MS - RETRY_JITTER_MIN_MS + 1));
        return exponential + jitter;
    }

    private logFlushError(error: unknown): void {
        if (isAxiosError(error)) {
            console.warn("Analytics events batch send failed", {
                message: error.message,
                status: error.response?.status,
                code: error.code,
                response: error.response?.data as unknown,
            });
            return;
        }

        console.warn("Analytics events batch send failed", error);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
