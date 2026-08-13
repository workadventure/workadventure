import { z } from "zod";
import {
    MAX_EVENT_ID_LENGTH,
    MAX_EVENT_NAME_LENGTH,
    MAX_TIMESTAMP_MS,
    isAnalyticsEventSource,
} from "@workadventure/messages";

// The taxonomy and its bounds are a contract shared with the front, so they live
// in @workadventure/messages. Re-exported here so every pusher-side importer keeps
// a single place to reach for.
export {
    MAX_EVENT_ID_LENGTH,
    MAX_EVENT_NAME_LENGTH,
    MAX_TIMESTAMP_MS,
    TIMED_EVENT_END_REASONS,
    isAnalyticsEventSource,
    isClientAnalyticsEventSource,
} from "@workadventure/messages";
export type { AnalyticsEventSourceSchema, TimedEventEndReason } from "@workadventure/messages";

/**
 * Validation of the analytics event envelope reported by a client.
 *
 * This guards the *envelope only*, and two shapes that look obvious here are
 * deliberately avoided. Both were measured; please read before "improving" it.
 *
 * 1. `eventName` is an opaque bounded string, never a `z.enum` or a
 *    `z.discriminatedUnion`. Unknown event names are a supported, load-bearing
 *    case: the pipeline is designed to let a newer front ship an event family
 *    before admin knows about it: the admin's AnalyticsEventsService
 *    logs-and-accepts unknown names for exactly this reason, and buckets them
 *    into a default category. This is not hypothetical: 23 of the ~163 names the
 *    front emits today are already unknown to the admin's allowlist, so a strict
 *    union would silently drop a seventh of the taxonomy.
 *
 * 2. `properties` is a flat record of unknown, never a recursive `z.lazy` JSON
 *    schema. A recursive schema costs ~134x more per event (~82µs vs ~618ns,
 *    most of a core at 10k events/s) and — worse — throws a RangeError that
 *    `safeParse` does NOT catch on deeply nested input, which would turn a
 *    handled drop into a crash on the hot path. It is also redundant:
 *    `properties` arrives as a `google.protobuf.Value` (messages.proto), which
 *    can only encode JSON, so the wire format already guarantees JSON-ness. The
 *    byte cap in AnalyticsEventsQueue.normalizeEvent stays the real guard on
 *    size.
 *
 * The caps mirror the admin's own validator (AnalyticsEventsBatchRequest:
 * `max:255` on eventName and eventId) so the pusher drops locally what the admin
 * would reject with a 422. That matters: a 422 makes the queue re-send the whole
 * batch one event at a time, and if that run is throttled the remaining events
 * are counted as send failures and never requeued — one oversized name from one
 * client costs everyone else's events in the same batch.
 */

export const isAnalyticsEventInput = z.object({
    eventName: z.string().min(1).max(MAX_EVENT_NAME_LENGTH),
    source: isAnalyticsEventSource,
    clientEventTimeMs: z.number().int().nonnegative().max(MAX_TIMESTAMP_MS),
    eventId: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    properties: z.record(z.unknown()),
});
