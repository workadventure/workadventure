import type { SocketData } from "../models/Websocket/SocketData";
import { analyticsEventsQueue, type AnalyticsEventInput } from "./AnalyticsEventsQueue";
import { analyticsConnectionId } from "./AnalyticsConnectionId";
import type { TimedEventEndReason } from "./AnalyticsEventSchema";

type AnalyticsEventQueue = {
    enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void;
};


/**
 * The only event names a client may ask the pusher to synthesize.
 *
 * This is a **security** allowlist, not a taxonomy gate — the distinction matters,
 * because AnalyticsEventCatalog says at length that `eventName` must stay an opaque
 * string so a newer front can ship an event family before admin knows about it.
 * That rule is about the front↔admin skew and still holds for ordinary events.
 *
 * This is a different problem: `timed_event.open` asks the pusher to emit a row
 * **signed `source: "pusher"`**. Without an allowlist a client opens one named
 * `user.disconnected` and the pusher forges it a connection session — exactly the
 * hole PUSHER_RESERVED_EVENT_NAMES was added to close. Front and pusher are the
 * same `play` service and deploy together, so the only skew this can cause is a tab
 * from a new replica reconnecting to an old one mid-deploy; the degraded outcome is
 * a rejected open, i.e. what an unknown name already does today.
 */
export const TIMED_EVENT_NAMES = new Set<string>(["conversation.ended", "area.dwell", "meeting.screenshare.ended"]);

/**
 * Bounds the per-socket map. A client that opens handles and never closes them
 * would otherwise grow this without limit, and it is heap held per connection.
 * Well past what any real client opens at once (a conversation, an area, a
 * screenshare).
 */
export const MAX_OPEN_TIMED_EVENTS_PER_CONNECTION = 32;

type OpenTimedEvent = {
    eventName: string;
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
        eventName: string,
        properties: Record<string, unknown>,
        socketData: SocketData,
    ): boolean {
        if (!TIMED_EVENT_NAMES.has(eventName)) {
            console.warn("Timed event rejected: name is not openable by a client", {
                eventName: eventName.slice(0, 64),
                reporterUserUuid: socketData.userUuid,
            });
            return false;
        }

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

        open.set(handle, { eventName, startedAtMs: this.nowMs(), properties, socketData });

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
        for (const [handle, entry] of open) {
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
            for (const [handle, entry] of open) {
                this.emit(connectionId, handle, entry, endReason);
                closed += 1;
            }
        }
        this.openByConnection.clear();

        return closed;
    }

    private emit(connectionId: string, handle: string, entry: OpenTimedEvent, endReason: TimedEventEndReason): void {
        const endedAtMs = this.nowMs();

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
                properties: {
                    ...entry.properties,
                    startedAt: new Date(entry.startedAtMs).toISOString(),
                    endedAt: new Date(endedAtMs).toISOString(),
                    durationSeconds: Math.max(0, (endedAtMs - entry.startedAtMs) / 1000),
                    endReason,
                },
            },
            entry.socketData,
        );
    }
}

export const analyticsTimedEventTracker = new AnalyticsTimedEventTracker();
