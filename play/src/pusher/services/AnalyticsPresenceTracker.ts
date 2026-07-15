import type { SocketData } from "../models/Websocket/SocketData";
import { analyticsEventsQueue, type AnalyticsEventInput } from "./AnalyticsEventsQueue";

type AnalyticsEventQueue = {
    enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void;
};

type DisconnectReason = "client_closed" | "join_failed";

/**
 * Pusher-side source of truth for how long a connection lasted.
 *
 * The front reports its own end-of-session events, but only on paths where it
 * still gets to run: RoomConnection.closeConnection() flushes them while the
 * socket is deliberately still open. A tab close, a crash or a dropped network
 * flush nothing, so connect/disconnect is tracked here instead, against the
 * socket lifecycle the pusher observes directly.
 *
 * The pairing state is in memory and per pusher instance. A pusher restart
 * therefore forgets every open connection, and their eventual disconnect is
 * dropped rather than reported with a wrong duration (see trackDisconnected).
 */
export class AnalyticsPresenceTracker {
    private readonly connectedAtByConnectionId = new Map<string, number>();

    public constructor(
        private readonly queue: AnalyticsEventQueue = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now,
    ) {}

    public trackConnected(socketData: SocketData): void {
        const connectedAtMs = this.nowMs();
        const connectionId = this.connectionId(socketData);
        // Idempotent on purpose: re-tracking a live connection would move its
        // connectedAt forward and shorten every duration derived from it.
        if (this.connectedAtByConnectionId.has(connectionId)) {
            return;
        }

        this.connectedAtByConnectionId.set(connectionId, connectedAtMs);

        this.queue.enqueueEvent(
            {
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: connectedAtMs,
                // Deterministic, unlike the front's uuid-suffixed heartbeat id:
                // a retried batch re-sends this exact id and the backend dedupes
                // on it instead of counting the connection twice.
                eventId: `${connectionId}:connected:${connectedAtMs}`,
                properties: {
                    connectionId,
                    connectedAt: new Date(connectedAtMs).toISOString(),
                },
            },
            socketData,
        );
    }

    public trackDisconnected(socketData: SocketData, disconnectReason: DisconnectReason): void {
        const disconnectedAtMs = this.nowMs();
        const connectionId = this.connectionId(socketData);
        const connectedAtMs = this.connectedAtByConnectionId.get(connectionId);
        // Unpaired disconnect: the matching connect was never seen (pusher
        // restarted mid-session, or the connection predates this instance).
        // Drop it — an event with no trustworthy connectedAt would land in
        // connection_sessions as a bogus duration.
        if (connectedAtMs === undefined) {
            return;
        }

        this.connectedAtByConnectionId.delete(connectionId);

        this.queue.enqueueEvent(
            {
                eventName: "user.disconnected",
                source: "pusher",
                clientEventTimeMs: disconnectedAtMs,
                eventId: `${connectionId}:disconnected:${disconnectedAtMs}`,
                properties: {
                    connectionId,
                    connectedAt: new Date(connectedAtMs).toISOString(),
                    disconnectedAt: new Date(disconnectedAtMs).toISOString(),
                    disconnectReason,
                    durationSeconds: Math.max(0, Math.round((disconnectedAtMs - connectedAtMs) / 1000)),
                },
            },
            socketData,
        );
    }

    // tabId is what keeps two tabs of the same user in the same room apart. When
    // it is missing the fallback collapses them onto one id, so their connects
    // and disconnects interleave on a single pairing and only one session is
    // reported — acceptable, but it is why tabId is preferred rather than a
    // stylistic choice.
    private connectionId(socketData: SocketData): string {
        return socketData.tabId || `${socketData.userUuid}:${socketData.roomId}`;
    }
}

export const analyticsPresenceTracker = new AnalyticsPresenceTracker();
