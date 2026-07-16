import { z } from "zod";
import type { AnalyticsEventReportMessage } from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import type { AnalyticsEventInput, AnalyticsEventsQueue } from "./AnalyticsEventsQueue";
import { MAX_EVENT_ID_LENGTH, TIMED_EVENT_END_REASONS, isAnalyticsEventInput, isClientAnalyticsEventSource } from "./AnalyticsEventSchema";
import type { AnalyticsTimedEventTracker } from "./AnalyticsTimedEventTracker";
import { analyticsTimedEventTracker, TIMED_EVENT_NAMES } from "./AnalyticsTimedEventTracker";

/**
 * Maximum number of analytics events a single websocket message may carry.
 * Bounds the queue from a misbehaving client flooding analyticsEventReportMessage
 * with one giant batch (the queue is bounded too, but a single hostile client
 * could otherwise saturate it in one go and evict everyone else's events).
 */
export const MAX_EVENTS_PER_REPORT_MESSAGE = 100;

/**
 * Event names the backend synthesizes itself, which a socket must never be able
 * to forge. Guarding the source alone is not enough: these are the names the
 * admin gives special meaning to, and it keys that meaning off the name.
 *
 * `user.connected` / `user.disconnected` are emitted by AnalyticsPresenceTracker
 * and are projected by the admin into `analytics_connection_sessions`, taking
 * `connectedAt` / `disconnectedAt` / `durationSeconds` straight from the event
 * properties. A client sending one of these under source "front" would therefore
 * write session rows of its own choosing and inflate the world's connection time
 * and risk score. `media.video_quality.sample` is likewise synthesized from
 * videoQualityReportMessage, not reported directly.
 *
 * The `media.` prefix as such stays open — the front legitimately emits other
 * `media.*` events; only this exact name is reserved.
 */
const PUSHER_SYNTHESIZED_EVENT_NAMES = ["user.connected", "user.disconnected", "media.video_quality.sample"];

/**
 * Names a socket may not send directly. The timed-event names join the list for the
 * same reason: the pusher is their sole emitter (it measures the interval on its own
 * clock), so one arriving from a client is either a mistake or an attempt to claim a
 * duration.
 */
const PUSHER_RESERVED_EVENT_NAMES = new Set([...PUSHER_SYNTHESIZED_EVENT_NAMES, ...TIMED_EVENT_NAMES]);

/**
 * Control frames. They ride the analytics event channel because it already carries a
 * validated, batched, source-checked envelope — a dedicated proto message would buy
 * nothing and cost a regen plus a second validation path. They are intercepted here
 * and **never enqueued**: they are instructions to the tracker, not events, so
 * grepping the admin for `timed_event.open` will find nothing. On purpose.
 */
const TIMED_EVENT_OPEN = "timed_event.open";
const TIMED_EVENT_CLOSE = "timed_event.close";
const CONTROL_EVENT_NAMES = new Set([TIMED_EVENT_OPEN, TIMED_EVENT_CLOSE]);

const isTimedEventOpen = z.object({
    handle: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    eventName: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    properties: z.record(z.unknown()).default({}),
});

const isTimedEventClose = z.object({
    handle: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    // Anything outside the enum becomes "other" rather than being rejected: an
    // unknown reason is not worth losing the interval's duration over.
    endReason: z.enum(TIMED_EVENT_END_REASONS).catch("other").default("closed_by_client"),
});

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
    tracker: Pick<AnalyticsTimedEventTracker, "open" | "close"> = analyticsTimedEventTracker,
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
        if (!isClientAnalyticsEventSource.safeParse(event.source).success) {
            console.warn("Analytics event dropped: invalid client source", {
                eventName: event.eventName,
                eventId: event.eventId,
                source: event.source,
                reporterUserUuid: socketData.userUuid,
            });
            continue;
        }

        if (PUSHER_RESERVED_EVENT_NAMES.has(event.eventName)) {
            console.warn("Analytics event dropped: event name is reserved for the backend", {
                eventName: event.eventName,
                eventId: event.eventId,
                source: event.source,
                reporterUserUuid: socketData.userUuid,
            });
            continue;
        }

        if (CONTROL_EVENT_NAMES.has(event.eventName)) {
            handleControlFrame(event.eventName, event.properties, socketData, tracker);
            continue;
        }

        // `properties` is `any` here: the proto declares it as google.protobuf.Value,
        // so nothing has checked its shape yet. Everything below the envelope is
        // validated here rather than cast.
        const parsed = isAnalyticsEventInput.safeParse({
            eventName: event.eventName,
            source: event.source,
            clientEventTimeMs: event.clientEventTimeMs,
            eventId: event.eventId,
            properties: event.properties ?? {},
        });
        if (!parsed.success) {
            console.warn("Analytics event dropped: malformed envelope", {
                eventName: typeof event.eventName === "string" ? event.eventName.slice(0, 64) : typeof event.eventName,
                eventId: typeof event.eventId === "string" ? event.eventId.slice(0, 64) : typeof event.eventId,
                issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
                reporterUserUuid: socketData.userUuid,
            });
            continue;
        }

        queue.enqueueEvent(
            {
                ...parsed.data,
                // Sound because google.protobuf.Value can only carry JSON — see
                // AnalyticsEventSchema for why this is not a recursive schema.
                properties: parsed.data.properties as AnalyticsEventInput["properties"],
            },
            socketData,
        );
    }
}

/**
 * Routes an open/close instruction to the tracker. Nothing is enqueued here: the row
 * is emitted by the tracker when the interval closes, timed on the pusher's clock.
 */
function handleControlFrame(
    eventName: string,
    rawProperties: unknown,
    socketData: SocketData,
    tracker: Pick<AnalyticsTimedEventTracker, "open" | "close">,
): void {
    if (eventName === TIMED_EVENT_OPEN) {
        const parsed = isTimedEventOpen.safeParse(rawProperties ?? {});
        if (!parsed.success) {
            console.warn("Timed event open dropped: malformed control frame", {
                issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
                reporterUserUuid: socketData.userUuid,
            });
            return;
        }
        tracker.open(parsed.data.handle, parsed.data.eventName, parsed.data.properties, socketData);
        return;
    }

    const parsed = isTimedEventClose.safeParse(rawProperties ?? {});
    if (!parsed.success) {
        console.warn("Timed event close dropped: malformed control frame", {
            issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
            reporterUserUuid: socketData.userUuid,
        });
        return;
    }
    tracker.close(parsed.data.handle, socketData, parsed.data.endReason);
}
