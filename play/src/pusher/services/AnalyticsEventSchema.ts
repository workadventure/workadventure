import { z } from "zod";

/**
 * Validation of the analytics event envelope reported by a client.
 *
 * This guards the *envelope only*, and two shapes that look obvious here are
 * deliberately avoided. Both were measured; please read before "improving" it.
 *
 * 1. `eventName` is an opaque bounded string, never a `z.enum` or a
 *    `z.discriminatedUnion`. Unknown event names are a supported, load-bearing
 *    case: the pipeline is designed to let a newer front ship an event family
 *    before admin knows about it. `analyticsMetricCategoryForEvent`
 *    (AnalyticsEventsQueue) prefix-matches and falls back to a default bucket,
 *    and the admin's AnalyticsEventsService logs-and-accepts unknown names for
 *    exactly this reason. This is not hypothetical: 23 of the ~163 names the
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

export const isAnalyticsEventSource = z.enum(["front", "pusher", "media"]);
export type AnalyticsEventSourceSchema = z.infer<typeof isAnalyticsEventSource>;

/**
 * Sources a socket may legitimately claim. "pusher" is backend-only: it marks
 * events the pusher synthesized itself, and the admin trusts it to decide what
 * may be projected into connection sessions.
 */
export const isClientAnalyticsEventSource = isAnalyticsEventSource.extract(["front", "media"]);

/** Mirrors the admin's `max:255` on eventName / eventId. */
export const MAX_EVENT_NAME_LENGTH = 255;
export const MAX_EVENT_ID_LENGTH = 255;

/**
 * Largest value `new Date(ms)` can represent. `z.number()` alone would accept
 * 1e300, which yields an Invalid Date downstream — and clientEventTimeMs is a
 * uint64 on the wire, so a client really can send one.
 */
export const MAX_TIMESTAMP_MS = 8.64e15;

export const isAnalyticsEventInput = z.object({
    eventName: z.string().min(1).max(MAX_EVENT_NAME_LENGTH),
    source: isAnalyticsEventSource,
    clientEventTimeMs: z.number().int().nonnegative().max(MAX_TIMESTAMP_MS),
    eventId: z.string().min(1).max(MAX_EVENT_ID_LENGTH),
    properties: z.record(z.unknown()),
});

/**
 * Why a timed event ends. Enum-constrained on purpose, and named `endReason`
 * rather than `reason`: the anonymization allowlist is keyed on the property key
 * alone, not on (eventName, key), and `reason` is already **free text** on the
 * experience-issue events (AnalyticsEventCatalog). Allow-listing `reason` to let
 * this one through would un-strip free-form text on those unrelated families for
 * every world that opted out of user-level activity. Mirrors `disconnectReason`.
 */
export const TIMED_EVENT_END_REASONS = [
    // Stated by the client when it closes its own interval. `type_changed` is the
    // one consumers cannot do without: it means one conversation was split because
    // its type changed, so a bubble that became a meeting reports two intervals and
    // has to be stitched on time rather than by id.
    "closed_by_client",
    "left_conversation",
    "type_changed",
    "cleanup",
    // Forced by the pusher, when the client never got to say anything.
    "socket_closed",
    "join_failed",
    "pusher_shutdown",
    "pusher_crashed",
    "other",
] as const;
export type TimedEventEndReason = (typeof TIMED_EVENT_END_REASONS)[number];
