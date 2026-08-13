import { z } from "zod";
import type { AnalyticsEventName, AnalyticsEventReportMessage } from "@workadventure/messages";
import {
    ANALYTICS_EVENTS,
    ANALYTICS_EVENT_CATALOG,
    LEGACY_TIMED_EVENT_END_REASONS,
    MAX_EVENT_ID_LENGTH,
    TIMED_ANALYTICS_EVENT_NAMES,
    TIMED_EVENT_END_REASONS,
    isClientAnalyticsEventSource,
} from "@workadventure/messages";
import type { SocketData } from "../models/Websocket/SocketData";
import type { AnalyticsEventInput, AnalyticsEventsQueue } from "./AnalyticsEventsQueue";
import type { AnalyticsTimedEventTracker } from "./AnalyticsTimedEventTracker";
import { analyticsTimedEventTracker } from "./AnalyticsTimedEventTracker";

/**
 * Maximum number of analytics events a single websocket message may carry.
 * Bounds the queue from a misbehaving client flooding analyticsEventReportMessage
 * with one giant batch (the queue is bounded too, but a single hostile client
 * could otherwise saturate it in one go and evict everyone else's events).
 */
export const MAX_EVENTS_PER_REPORT_MESSAGE = 100;

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

/**
 * Opening an interval asks the pusher to emit a row signed `source: "pusher"`,
 * which the admin trusts — so the name is constrained to the catalog's timed
 * events rather than accepted as a string. This enum is the whole gate: the
 * tracker's `open()` takes the narrowed type and no longer re-checks.
 */
const isTimedEventOpen = z.object({
    handle: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    eventName: z.enum(TIMED_ANALYTICS_EVENT_NAMES),
    properties: z.record(z.unknown()).default({}),
});

const isTimedEventClose = z.object({
    handle: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    // A tab loaded before the reason set was trimmed still sends the old strings,
    // so translate them rather than dropping them on the floor. Anything still
    // unknown after that becomes `closed_by_client` rather than being rejected: an
    // unrecognised reason is not worth losing the interval's duration over.
    endReason: z
        .string()
        .default("closed_by_client")
        .transform((reason) => LEGACY_TIMED_EVENT_END_REASONS[reason] ?? reason)
        .pipe(z.enum(TIMED_EVENT_END_REASONS).catch("closed_by_client")),
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

        // Before the catalog lookup: the control frames are deliberately absent
        // from it — they are instructions to the tracker, not events — so checking
        // the catalog first would reject them as unknown names.
        if (CONTROL_EVENT_NAMES.has(event.eventName)) {
            handleControlFrame(event.eventName, event.properties, socketData, tracker);
            continue;
        }

        // Look the name up before parsing, rather than handing the whole envelope
        // to the catalog union. Both reach the same verdict, but a discriminator
        // miss makes zod build an issue enumerating all 166 expected names — ~8.8 KB
        // of error object, 11x the cost of a successful parse, paid on exactly the
        // events a strict gate rejects. A property lookup costs nothing.
        // See AnalyticsEventCatalog.bench.ts.
        const schema = ANALYTICS_EVENT_CATALOG[event.eventName as AnalyticsEventName] as
            | (typeof ANALYTICS_EVENT_CATALOG)[AnalyticsEventName]
            | undefined;
        if (!schema) {
            console.warn("Analytics event dropped: unknown event name", {
                eventName: typeof event.eventName === "string" ? event.eventName.slice(0, 64) : typeof event.eventName,
                eventId: typeof event.eventId === "string" ? event.eventId.slice(0, 64) : typeof event.eventId,
                reporterUserUuid: socketData.userUuid,
            });
            continue;
        }

        // `properties` is `any` here: the proto declares it as google.protobuf.Value,
        // so nothing has checked its shape yet. Everything below the envelope is
        // validated here rather than cast.
        const parsed = schema.safeParse({
            eventName: event.eventName,
            source: event.source,
            clientEventTimeMs: event.clientEventTimeMs,
            eventId: event.eventId,
            properties: event.properties ?? {},
        });
        if (!parsed.success) {
            // A failure on `source` is not a malformed payload: the catalog pins
            // each event's source, so this is a socket claiming a name the pusher
            // synthesizes — user.connected, conversation.ended and friends, which
            // the admin projects into connection sessions straight from their
            // properties. Worth its own line; the reserved-name list this replaces
            // existed to produce it.
            const forgedSource = parsed.error.issues.some(
                (issue) => issue.path[0] === "source" && issue.code === "invalid_literal",
            );
            console.warn(
                forgedSource
                    ? "Analytics event dropped: event name is reserved for the backend"
                    : "Analytics event dropped: payload does not match the catalog",
                {
                    eventName: event.eventName,
                    eventId: typeof event.eventId === "string" ? event.eventId.slice(0, 64) : typeof event.eventId,
                    source: event.source,
                    issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
                    reporterUserUuid: socketData.userUuid,
                },
            );
            continue;
        }

        queue.enqueueEvent(parsed.data as AnalyticsEventInput, socketData);
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
        // Validate the payload the client opened with, not just the name. The row
        // the tracker eventually emits is this payload plus the interval bounds, so
        // checking it here is what makes that row catalog-shaped by construction
        // rather than only when it reaches the admin.
        const openProperties = ANALYTICS_EVENTS[parsed.data.eventName].openProperties.safeParse(parsed.data.properties);
        if (!openProperties.success) {
            console.warn("Timed event open dropped: payload does not match the catalog", {
                eventName: parsed.data.eventName,
                issues: openProperties.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    code: issue.code,
                })),
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
