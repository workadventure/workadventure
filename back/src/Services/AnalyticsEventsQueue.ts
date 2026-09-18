import { AnalyticsEventsQueue, registerDrainableService } from "@workadventure/shared-utils";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";

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
    // ponytail: the pusher's defaults, hardcoded; expose as env vars when an operator needs to tune them.
    flushIntervalMs: 10_000,
    timeoutMs: 2_000,
    maxQueueSize: 10_000,
    maxBatchSize: 1_000,
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
