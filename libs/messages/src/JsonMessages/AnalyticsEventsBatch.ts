import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import {
  analyticsEventCatalogUnion,
  isAnalyticsEventSource,
} from "./AnalyticsEventCatalog";

/**
 * The pusher → admin ingestion contract for `POST /api/analytics/events-batch`.
 *
 * Kept next to the catalog rather than in the pusher because it is the shape the
 * admin validates against: the two have to agree, and a contract only one side
 * can see is one that drifts. The catalog describes what an event *is*; this
 * describes the envelope columns the pusher adds and the batch it ships them in.
 */

/** The current envelope version. Any change to the batch shape bumps this. */
export const ANALYTICS_BATCH_SCHEMA_VERSION = 1;

/**
 * One event as stored, i.e. what the client reported plus what the pusher knows
 * about the socket it arrived on.
 *
 * `properties` stays the catalog's, per event — the enrichment lives beside it as
 * columns rather than being folded in, which is why the catalog entries do not
 * mention userUuid and friends.
 */
export const analyticsStoredEvent = extendApi(
  z.object({
    eventName: extendApi(z.string(), {
      description:
        "The event's name, from the shared catalog. The pusher rejects names it does not carry.",
      example: "conversation.ended",
    }),
    source: extendApi(isAnalyticsEventSource, {
      description:
        "Who produced the event. `pusher` marks one the pusher synthesized itself and a socket may never claim; the admin gives those special meaning.",
      example: "pusher",
    }),
    clientEventTime: extendApi(z.string().datetime(), {
      description:
        "When the client believes it happened. Untrusted — it comes from the browser clock.",
    }),
    pusherReceivedAt: extendApi(z.string().datetime(), {
      description:
        "When the pusher received it. Trusted, and what the admin clamps clientEventTime against.",
    }),
    eventId: extendApi(z.string(), {
      description:
        "Idempotency key. A retried batch collapses on it instead of double-counting, so ingestion should be idempotent on this field.",
    }),
    userUuid: extendApi(z.string(), {
      description:
        "Reporting user. Pseudonymized by the admin for worlds that opted out of user-level activity.",
    }),
    userId: extendApi(z.number().nullable(), {
      description: "Numeric member id, when the world has one.",
    }),
    spaceUserId: extendApi(z.string(), {
      description: "Space-scoped user id, unique per connection.",
    }),
    clientIp: extendApi(z.string().nullable(), {
      description:
        "Reporter's IP. The admin resolves the country from it before dropping it.",
    }),
    world: extendApi(z.string(), {
      description:
        "World the event belongs to. The admin drops any event it cannot attribute to a known world.",
    }),
    roomId: extendApi(z.string(), {
      description: "Room the event happened in.",
    }),
    tabId: extendApi(z.string().nullable(), {
      description: "Browser tab the socket belongs to.",
    }),
    properties: extendApi(z.record(z.unknown()), {
      description:
        "The event's own payload, as declared by its catalog entry. Passthrough: a newer front may add fields to a known event without a lockstep deploy, so unknown keys are expected rather than an error.",
    }),
  }),
  { description: "One analytics event, enriched with its socket's context." },
);

export const analyticsEventsBatch = extendApi(
  z.object({
    schemaVersion: extendApi(z.literal(ANALYTICS_BATCH_SCHEMA_VERSION), {
      description: "Envelope version. Bumped on any change to this shape.",
      example: 1,
    }),
    sentAt: extendApi(z.string().datetime(), {
      description: "When the pusher flushed the batch.",
    }),
    pusherInstanceId: extendApi(z.string(), {
      description:
        "Which pusher sent it, so a replica flapping can be told from a world-wide problem.",
    }),
    events: extendApi(z.array(analyticsStoredEvent), {
      description: "The events, capped per batch by ANALYTICS_MAX_BATCH_SIZE.",
    }),
  }),
  {
    description:
      "A best-effort batch of analytics events collected by one pusher instance.",
  },
);

export type AnalyticsStoredEvent = z.infer<typeof analyticsStoredEvent>;
export type AnalyticsEventsBatchPayload = z.infer<typeof analyticsEventsBatch>;

/**
 * The catalog union, exported under the name Swagger registers it as.
 *
 * Registered as the union rather than member-by-member: 166 top-level definitions
 * would be unreadable, and @anatine/zod-openapi renders a ZodDiscriminatedUnion
 * as a single `oneOf` + `discriminator` node.
 */
export const analyticsEvent = analyticsEventCatalogUnion;
