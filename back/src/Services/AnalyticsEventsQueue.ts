import axios from "axios";
import * as Sentry from "@sentry/node";
import type { AnalyticsEventsBatchPayload, AnalyticsStoredEvent } from "@workadventure/messages";
import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    ANALYTICS_FLUSH_INTERVAL_MS,
    ANALYTICS_MAX_BATCH_SIZE,
    ANALYTICS_MAX_QUEUE_SIZE,
    ANALYTICS_TIMEOUT_MS,
} from "../Enum/EnvironmentVariable";
import { registerDrainableService } from "./ShutdownDrains";

const SCHEMA_VERSION = 1;

/**
 * Sends the back's own analytics rows to the admin.
 *
 * A deliberate sibling of the pusher's queue rather than a shared one: the pusher's
 * every entry point is shaped by `SocketData`, which the back has no equivalent of —
 * a meeting is not a socket. What is shared is the wire contract, imported from
 * `@workadventure/messages` so the two cannot drift.
 *
 * It is also much smaller. Everything the pusher's queue does to defend itself from a
 * hostile client — catalog validation per event, the per-socket space check, the
 * world-settings gate — is absent because nothing here comes from a client. The rows
 * are built by the back from its own state, and the admin gates them on the world's
 * settings anyway (fail closed, in AnalyticsEventsService).
 *
 * Why the back posts directly instead of going through a pusher: a room and a space
 * are watched by EVERY pusher holding a client in them, so a meeting row relayed that
 * way would be emitted once per pusher. ClickHouse would not save us — its merges are
 * asynchronous and no read uses FINAL, so a duplicated conversation stays doubled for
 * an unbounded window.
 */
export class AnalyticsEventsQueue {
    private queue: AnalyticsStoredEvent[] = [];
    private flushTimer: NodeJS.Timeout | undefined;
    private isFlushing = false;
    private droppedOnOverflow = 0;
    private droppedAfterSendFailure = 0;
    private eventsSent = 0;

    public constructor(
        private readonly adminApiUrl: string | undefined = ADMIN_API_URL,
        private readonly adminApiToken: string | undefined = ADMIN_API_TOKEN,
        private readonly instanceId: string = `back:${process.env.HOSTNAME || process.env.SERVER_NAME || "back"}`,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public start(): void {
        if (!this.canSend() || this.flushTimer) {
            return;
        }

        // unref so a queue with nothing to say never holds the process open.
        this.flushTimer = setInterval(() => {
            this.flush().catch((error) => console.error("Error while flushing analytics events", error));
        }, ANALYTICS_FLUSH_INTERVAL_MS);
        this.flushTimer.unref();

        registerDrainableService({
            name: "analytics events queue",
            drain: (timeoutMs: number) => this.drain(timeoutMs),
            stop: () => this.stop(),
        });
    }

    public enqueue(event: AnalyticsStoredEvent): void {
        if (!this.canSend()) {
            return;
        }

        // Drop the oldest rather than the newest: an interval that closed five minutes
        // ago is less interesting than the one that just did, and a bounded queue is
        // what keeps a wedged admin from turning into a memory leak.
        if (this.queue.length >= ANALYTICS_MAX_QUEUE_SIZE) {
            this.queue.shift();
            this.droppedOnOverflow += 1;
        }

        this.queue.push(event);
    }

    public async flush(): Promise<void> {
        if (!this.canSend() || this.queue.length === 0 || this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        const events = this.queue.splice(0, ANALYTICS_MAX_BATCH_SIZE);
        const batch: AnalyticsEventsBatchPayload = {
            schemaVersion: SCHEMA_VERSION,
            sentAt: this.now().toISOString(),
            // The field is named for the pusher because that is who filled it first.
            // The admin treats it as an opaque instance label and nothing keys on it.
            pusherInstanceId: this.instanceId,
            events,
        };

        try {
            await axios.post(new URL("api/analytics/events-batch", this.adminApiUrl).toString(), batch, {
                headers: {
                    Authorization: `Bearer ${this.adminApiToken ?? ""}`,
                    "Content-Type": "application/json",
                },
                timeout: ANALYTICS_TIMEOUT_MS,
            });
            this.eventsSent += events.length;
        } catch (error) {
            // One attempt, then the batch is gone. A retry would need the deadline
            // plumbing the pusher's queue has; the rows worth more than that are the
            // ones already lost to SIGKILL, and no retry saves those either.
            this.droppedAfterSendFailure += events.length;
            console.error("Failed to send analytics batch to the admin", error);
            Sentry.captureException(error);
        } finally {
            this.isFlushing = false;
        }
    }

    /** Empties the queue within the budget, for a graceful shutdown. Never rejects. */
    public async drain(timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (this.queue.length > 0 && Date.now() < deadline) {
            // Sequential on purpose: flush() takes one batch and guards itself with
            // isFlushing, so firing these in parallel would spin the loop on no-ops
            // instead of emptying the queue.
            // eslint-disable-next-line no-await-in-loop
            await this.flush();
        }
    }

    public stop(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
    }

    public getStats(): {
        queueSize: number;
        droppedOnOverflow: number;
        droppedAfterSendFailure: number;
        eventsSent: number;
    } {
        return {
            queueSize: this.queue.length,
            droppedOnOverflow: this.droppedOnOverflow,
            droppedAfterSendFailure: this.droppedAfterSendFailure,
            eventsSent: this.eventsSent,
        };
    }

    private canSend(): boolean {
        return this.adminApiUrl !== undefined && this.adminApiUrl !== "";
    }
}

export const analyticsEventsQueue = new AnalyticsEventsQueue();
