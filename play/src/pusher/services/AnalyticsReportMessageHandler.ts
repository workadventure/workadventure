import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import type { AnalyticsEventsQueue } from "./AnalyticsEventsQueue";

/**
 * Maximum number of analytics events a single websocket message may carry.
 * Bounds the queue from a misbehaving client flooding analyticsEventReportMessage
 * with one giant batch (the queue is bounded too, but a single hostile client
 * could otherwise saturate it in one go and evict everyone else's events).
 */
export const MAX_EVENTS_PER_REPORT_MESSAGE = 100;

/**
 * Sources that may legitimately originate from a connected client. "pusher" is
 * reserved for backend-emitted events and must not be accepted from a socket.
 */
const CLIENT_ALLOWED_SOURCES = new Set(["front", "media"] as const);

/**
 * Process an incoming AnalyticsEventReportMessage from a websocket client,
 * applying the per-message cap and the per-event source whitelist before
 * forwarding accepted events to the queue.
 *
 * Extracted from IoSocketController so it can be unit-tested without spinning
 * up the uWebSocket app.
 */
export function processAnalyticsReportMessage(
    report: AnalyticsEventReportMessage,
    socketData: SocketData,
    queue: Pick<AnalyticsEventsQueue, "enqueueEvent">,
): void {
    const events = report.events ?? [];
    if (events.length > MAX_EVENTS_PER_REPORT_MESSAGE) {
        console.warn("Analytics report message exceeds max events per message — dropping", {
            received: events.length,
            max: MAX_EVENTS_PER_REPORT_MESSAGE,
            reporterUserUuid: socketData.userUuid,
            roomId: socketData.roomId,
        });
        return;
    }

    for (const event of events) {
        if (!CLIENT_ALLOWED_SOURCES.has(event.source as "front" | "media")) {
            console.warn("Analytics event dropped: invalid client source", {
                eventName: event.eventName,
                eventId: event.eventId,
                source: event.source,
                reporterUserUuid: socketData.userUuid,
            });
            continue;
        }

        queue.enqueueEvent(
            {
                eventName: event.eventName,
                source: event.source as "front" | "media",
                clientEventTimeMs: event.clientEventTimeMs,
                eventId: event.eventId,
                properties: event.properties ?? {},
            },
            socketData,
        );
    }
}
