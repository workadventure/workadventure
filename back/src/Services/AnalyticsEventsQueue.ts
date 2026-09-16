import { AnalyticsEventsQueue, registerDrainableService } from "@workadventure/shared-utils";
import {
    ADMIN_API_TOKEN,
    ADMIN_API_URL,
    ANALYTICS_FLUSH_INTERVAL_MS,
    ANALYTICS_MAX_BATCH_SIZE,
    ANALYTICS_MAX_QUEUE_SIZE,
    ANALYTICS_TIMEOUT_MS,
} from "../Enum/EnvironmentVariable";

/**
 * The back's own analytics rows, on their way to the admin.
 *
 * The transport is the pusher's, shared. What the pusher does on top of it to defend
 * itself from a hostile client — catalog validation per event, the per-socket space
 * check, the world-settings gate — is absent here because nothing comes from a
 * client: the rows are built by the back from its own state, and the admin gates
 * them on the world's settings anyway (fail closed, in AnalyticsEventsService).
 *
 * Why the back posts directly instead of going through a pusher: a room and a space
 * are watched by EVERY pusher holding a client in them, so a session row relayed that
 * way would be emitted once per pusher. ClickHouse would not save us — its merges are
 * asynchronous and no read uses FINAL, so a duplicated conversation stays doubled for
 * an unbounded window.
 */
export const analyticsEventsQueue = new AnalyticsEventsQueue({
    adminApiUrl: ADMIN_API_URL,
    adminApiToken: ADMIN_API_TOKEN,
    flushIntervalMs: ANALYTICS_FLUSH_INTERVAL_MS,
    timeoutMs: ANALYTICS_TIMEOUT_MS,
    maxQueueSize: ANALYTICS_MAX_QUEUE_SIZE,
    maxBatchSize: ANALYTICS_MAX_BATCH_SIZE,
    pusherInstanceId: `back:${process.env.HOSTNAME || process.env.SERVER_NAME || "back"}`,
});

// The pusher waits for the admin to advertise the endpoint; the back has no
// capabilities round-trip and sends whenever it is configured to.
analyticsEventsQueue.setEnabled(true);

registerDrainableService({
    name: "analytics events queue",
    drain: (timeoutMs) => analyticsEventsQueue.drain(timeoutMs),
    stop: () => analyticsEventsQueue.stop(),
});
