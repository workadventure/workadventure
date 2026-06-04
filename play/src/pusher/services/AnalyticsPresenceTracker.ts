import type { SocketData } from "../models/Websocket/SocketData";
import { analyticsEventsQueue, type AnalyticsEventInput } from "./AnalyticsEventsQueue";

type AnalyticsEventQueue = {
    enqueueEvent(event: AnalyticsEventInput, socketData: SocketData): void;
};

type DisconnectReason = "client_closed" | "join_failed";

export class AnalyticsPresenceTracker {
    private readonly connectedAtByConnectionId = new Map<string, number>();

    public constructor(
        private readonly queue: AnalyticsEventQueue = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now
    ) {}

    public trackConnected(socketData: SocketData): void {
        const connectedAtMs = this.nowMs();
        const connectionId = this.connectionId(socketData);
        if (this.connectedAtByConnectionId.has(connectionId)) {
            return;
        }

        this.connectedAtByConnectionId.set(connectionId, connectedAtMs);

        this.queue.enqueueEvent(
            {
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: connectedAtMs,
                eventId: `${connectionId}:connected:${connectedAtMs}`,
                properties: {
                    connectionId,
                    connectedAt: new Date(connectedAtMs).toISOString(),
                },
            },
            socketData
        );
    }

    public trackDisconnected(socketData: SocketData, disconnectReason: DisconnectReason): void {
        const disconnectedAtMs = this.nowMs();
        const connectionId = this.connectionId(socketData);
        const connectedAtMs = this.connectedAtByConnectionId.get(connectionId);
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
            socketData
        );
    }

    private connectionId(socketData: SocketData): string {
        return socketData.tabId || `${socketData.userUuid}:${socketData.roomId}`;
    }
}

export const analyticsPresenceTracker = new AnalyticsPresenceTracker();
