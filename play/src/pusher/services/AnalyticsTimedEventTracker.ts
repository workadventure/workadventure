import type { AnyTimedAnalyticsEventName, TimedEventEndReason } from "@workadventure/messages";
import { timedAnalyticsEventDefinition } from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import { analyticsEventsQueue, type AnalyticsEventInput } from "./AnalyticsEventsQueue";
import { analyticsConnectionId } from "./AnalyticsConnectionId";

type AnalyticsEventQueue = {
    enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void;
};

/**
 * Bounds the per-socket map. A client that opens handles and never closes them
 * would otherwise grow this without limit, and it is heap held per connection.
 * Well past what any real client opens at once (a conversation, an area, a
 * screenshare).
 */
export const MAX_OPEN_TIMED_EVENTS_PER_CONNECTION = 32;

/**
 * The handle a connection session is filed under.
 *
 * Fixed rather than generated: there is exactly one session per connection, so the
 * handle carries no information — and a fixed one makes `open()`'s idempotency do
 * the work the presence tracker needed a separate flag for.
 */
export const CONNECTION_SESSION_HANDLE = "connection";

type OpenTimedEvent = {
    eventName: AnyTimedAnalyticsEventName;
    startedAtMs: number;
    properties: Record<string, unknown>;
    socketData: SocketData;
};

/**
 * Holds open intervals and emits one row per interval, when it closes.
 *
 * The front opens an interval and asks for it to be closed; it never reports a
 * duration. That is the point: the duration is measured by the pusher's clock on
 * both ends, so a client cannot inflate a world's collaboration time by claiming
 * one — with sampling it had to forge 60 events to fake an hour, with a scalar it
 * would have taken one.
 *
 * **An interval only exists if it closes.** There is no start row: the time is
 * carried by the single closing row. So every reachable close path must be wired,
 * and they are: the client's own close, socket close (SocketManager.leaveRoom),
 * graceful shutdown and crash (server.ts). The one gap is SIGKILL/OOM, where the
 * process dies with this map — nothing can be emitted, and unlike a heartbeat
 * pipeline there is no partial record to fall back on. Persisting the map would not
 * fix it either: on recovery we would know an interval was open but not when it
 * ended, and inventing that timestamp is worse than losing it. This matches what
 * analytics_connection_sessions already does.
 *
 * A 30s network blip does NOT close anything: PusherRoomSocketController defers the
 * socket close by CLIENT_DISCONNECTION_RETENTION_MS and cancels it if the tab comes
 * back, so hooking leaveRoom inherits reconnect tolerance for free — one session,
 * one conversation, both spanning the blip.
 */
export class AnalyticsTimedEventTracker {
    private readonly openByConnection = new Map<string, Map<string, OpenTimedEvent>>();

    public constructor(
        private readonly queue: AnalyticsEventQueue = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now,
    ) {}

    /**
     * @returns true when the interval was opened; false when it was rejected.
     */
    public open(
        handle: string,
        // Narrowed to the names built with `timedEvent` in the catalog. The runtime
        // check that used to live here is now the `z.enum(TIMED_ANALYTICS_EVENT_NAMES)`
        // in the control-frame schema, which is the only way in — so the compiler
        // enforces here what the schema enforces at the boundary.
        eventName: AnyTimedAnalyticsEventName,
        properties: Record<string, unknown>,
        socketData: SocketData,
    ): boolean {
        const connectionId = analyticsConnectionId(socketData);
        let open = this.openByConnection.get(connectionId);
        if (!open) {
            open = new Map<string, OpenTimedEvent>();
            this.openByConnection.set(connectionId, open);
        }

        // Idempotent, like AnalyticsPresenceTracker.trackConnected: re-opening a live
        // handle would move its startedAt forward and shorten the interval.
        if (open.has(handle)) {
            return false;
        }
        if (open.size >= MAX_OPEN_TIMED_EVENTS_PER_CONNECTION) {
            console.warn("Timed event rejected: too many open on this connection", {
                eventName,
                open: open.size,
                reporterUserUuid: socketData.userUuid,
            });
            return false;
        }

        const startedAtMs = this.nowMs();
        open.set(handle, { eventName, startedAtMs, properties, socketData });

        // Most intervals report nothing until they close — an interval that never
        // closes never happened. A session is the exception it declares itself to
        // be: presence at connect time is a datum in its own right, so it emits a
        // row at each end.
        const definition = timedAnalyticsEventDefinition(eventName);
        if (definition?.opensWith) {
            this.queue.enqueueEvent(
                {
                    eventName: definition.opensWith,
                    source: "pusher",
                    clientEventTimeMs: startedAtMs,
                    // Deterministic, unlike a uuid-suffixed client id: a retried batch
                    // re-sends this exact id and the backend dedupes on it instead of
                    // counting the open twice.
                    eventId: `${connectionId}:${handle}:opened:${startedAtMs}`,
                    properties: {
                        ...(properties as AnalyticsEventInput["properties"]),
                        [definition.intervalFields.start]: new Date(startedAtMs).toISOString(),
                    },
                },
                socketData,
            );
        }

        return true;
    }

    /** Closes one interval the client asked to close. */
    public close(handle: string, socketData: SocketData, endReason: TimedEventEndReason = "closed_by_client"): void {
        const connectionId = analyticsConnectionId(socketData);
        const open = this.openByConnection.get(connectionId);
        const entry = open?.get(handle);
        // Unpaired close: no trustworthy startedAt, so no event rather than a bogus
        // duration — same rule as AnalyticsPresenceTracker.trackDisconnected.
        if (!open || !entry) {
            return;
        }

        open.delete(handle);
        if (open.size === 0) {
            this.openByConnection.delete(connectionId);
        }
        this.emit(connectionId, handle, entry, endReason);
    }

    /**
     * Closes every interval still open on one socket. Called from the socket
     * lifecycle, immediately *before* the connection session is closed, so that
     * `endedAt <= disconnectedAt` and the admin's session join keeps the interval.
     *
     * @returns how many were closed.
     */
    public closeConnection(socketData: SocketData, endReason: TimedEventEndReason): number {
        const connectionId = analyticsConnectionId(socketData);
        const open = this.openByConnection.get(connectionId);
        if (!open) {
            return 0;
        }

        const closed = open.size;
        for (const [handle, entry] of sessionsLast(open)) {
            this.emit(connectionId, handle, entry, endReason);
        }
        this.openByConnection.delete(connectionId);

        return closed;
    }

    /**
     * Closes everything still open, for a graceful shutdown or a crash. Must run
     * before the queues are drained: this only enqueues.
     *
     * @returns how many were closed.
     */
    public closeAll(endReason: TimedEventEndReason = "pusher_shutdown"): number {
        let closed = 0;
        for (const [connectionId, open] of this.openByConnection) {
            for (const [handle, entry] of sessionsLast(open)) {
                this.emit(connectionId, handle, entry, endReason);
                closed += 1;
            }
        }
        this.openByConnection.clear();

        return closed;
    }

    private emit(connectionId: string, handle: string, entry: OpenTimedEvent, endReason: TimedEventEndReason): void {
        const endedAtMs = this.nowMs();
        const definition = timedAnalyticsEventDefinition(entry.eventName);
        const fields = definition?.intervalFields ?? { start: "startedAt", end: "endedAt", reason: "endReason" };

        // Per-event, from the catalog. Transition churn for a conversation is a real
        // connection for a session, so the threshold is a property of the event
        // rather than a law of intervals.
        if (endedAtMs - entry.startedAtMs < (definition?.minDurationMs ?? 0)) {
            return;
        }

        this.queue.enqueueEvent(
            {
                eventName: entry.eventName,
                source: "pusher",
                // event_time is the END instant, like user.disconnected and
                // meeting.screenshare.ended. A whole interval therefore lands in the
                // bucket where it ended: a conversation spanning midnight counts on the
                // second day. Deliberate — the interval is in startedAt/endedAt for any
                // query that needs to allocate it properly.
                clientEventTimeMs: endedAtMs,
                // Deterministic: a retried batch re-sends this exact id and the backend
                // dedupes on it instead of counting the interval twice.
                eventId: `${connectionId}:${handle}:${endedAtMs}`,
                // Computed keys widen the literal to an index signature, which JsonObject
                // is not; the values below are all strings and numbers.
                properties: {
                    ...entry.properties,
                    [fields.start]: new Date(entry.startedAtMs).toISOString(),
                    [fields.end]: new Date(endedAtMs).toISOString(),
                    // Sessions have always reported whole seconds; other intervals keep
                    // their fractional precision. Rounding everything would coarsen
                    // existing metrics, and rounding nothing would change the column the
                    // admin already stores for sessions.
                    durationSeconds:
                        entry.eventName === "user.disconnected"
                            ? Math.max(0, Math.round((endedAtMs - entry.startedAtMs) / 1000))
                            : Math.max(0, (endedAtMs - entry.startedAtMs) / 1000),
                    [fields.reason]: endReason,
                } as AnalyticsEventInput["properties"],
            },
            entry.socketData,
        );
    }
}

/**
 * Orders a connection's open intervals so sessions are emitted last.
 *
 * Load-bearing, and invisible if you get it wrong: the admin attributes an
 * interval to the session containing it, and drops one whose end falls even a
 * millisecond after its session's disconnect. Both timestamps are read from the
 * same clock as this loop runs, so the emission order *is* the timestamp order.
 * This is the invariant server.ts and SocketManager used to get by calling two
 * trackers in a fixed order; with one tracker it has to live here.
 */
function sessionsLast(open: Map<string, OpenTimedEvent>): [string, OpenTimedEvent][] {
    const entries = [...open];

    return [
        ...entries.filter(([, entry]) => entry.eventName !== "user.disconnected"),
        ...entries.filter(([, entry]) => entry.eventName === "user.disconnected"),
    ];
}

export const analyticsTimedEventTracker = new AnalyticsTimedEventTracker();
