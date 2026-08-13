import { z } from "zod";

export const isAnalyticsEventSource = z.enum(["front", "pusher", "media"]);
export type AnalyticsEventSourceSchema = z.infer<typeof isAnalyticsEventSource>;

/**
 * Sources a socket may legitimately claim. "pusher" is backend-only: it marks
 * events the pusher synthesized itself, and the admin trusts it to decide what
 * may be projected into connection sessions.
 */
export const isClientAnalyticsEventSource = isAnalyticsEventSource.extract([
  "front",
  "media",
]);

/** Mirrors the admin's `max:255` on eventName / eventId. */
export const MAX_EVENT_NAME_LENGTH = 255;
export const MAX_EVENT_ID_LENGTH = 255;

/**
 * Largest value `new Date(ms)` can represent. `z.number()` alone would accept
 * 1e300, which yields an Invalid Date downstream — and clientEventTimeMs is a
 * uint64 on the wire, so a client really can send one.
 */
export const MAX_TIMESTAMP_MS = 8.64e15;

/**
 * Why a timed event ends. Enum-constrained on purpose, and named `endReason`
 * rather than `reason`: the admin's anonymization allowlist is keyed on the
 * property key alone, not on (eventName, key), and `reason` is already **free
 * text** on the experience-issue events below. Allow-listing `reason` to let this
 * one through would un-strip free-form text on those unrelated families for every
 * world that opted out of user-level activity. Mirrors `disconnectReason`.
 */
export const TIMED_EVENT_END_REASONS = [
  // ---- Stated by the client ----
  /** The client closed the interval normally. */
  "closed_by_client",
  /**
   * Not "why the client stopped" but "this row is half a conversation": the
   * conversation's type changed, so a bubble that became a meeting reports two
   * intervals under two ids that have to be stitched on time. Collapsing this into
   * closed_by_client would make every meeting-from-a-bubble count as two
   * conversations, which is a data-correctness loss rather than a simplification.
   */
  "type_changed",
  /**
   * A re-open replaced a handle that was still live, i.e. the matching leave never
   * arrived. Kept distinct because these are exactly the intervals whose *start* is
   * not trustworthy: merging them into closed_by_client would make a walk-through
   * that lost its leave indistinguishable from a clean one, and those inflate
   * durations.
   */
  "superseded",
  // ---- Forced by the pusher, when the client never got to say anything ----
  "socket_closed",
  "join_failed",
  "pusher_shutdown",
  "pusher_crashed",
] as const;
export type TimedEventEndReason = (typeof TIMED_EVENT_END_REASONS)[number];

/** The subset a client may state; the rest are the pusher's to decide. */
export type ClientTimedEventEndReason = Extract<
  TimedEventEndReason,
  "closed_by_client" | "type_changed" | "superseded"
>;

/**
 * Reasons that existed before the set was trimmed, mapped to their replacement.
 *
 * `left_conversation`, `left_area`, `status_changed` and `cleanup` only ever
 * appeared on the one event whose name already said the same thing, so they
 * carried no information and collapse into `closed_by_client`. `other` was
 * documented as pusher-forced but was in fact emitted by the front on the
 * stale-handle path, which is what `superseded` now names.
 *
 * Here for the deploy window: a tab loaded before this change still sends the old
 * strings, and mapping them beats losing the interval. Historical rows keep the
 * old values forever, so anything querying them has to accept both.
 */
export const LEGACY_TIMED_EVENT_END_REASONS: Record<
  string,
  TimedEventEndReason
> = {
  left_conversation: "closed_by_client",
  left_area: "closed_by_client",
  status_changed: "closed_by_client",
  cleanup: "closed_by_client",
  other: "superseded",
};

/**
 * One schema per analytics event, with every field `.describe()`d so the catalog
 * can be turned into documentation.
 *
 * ## This IS the runtime gate
 *
 * It did not use to be, and the reasoning that kept it out is worth recording,
 * because only one half of it survived measurement.
 *
 * The skew argument was: a newer front must be able to ship an event family
 * before admin knows about it, and 23 of the names the front emits today are
 * already unknown to the admin's allowlist. That is true — but it is about the
 * front↔ADMIN gap, and the admin is a separate deployment that logs-and-accepts
 * unknown names for exactly that reason. This catalog sits between the front and
 * the pusher, which ship from the same `play/` image and cannot skew. The
 * argument does not transfer.
 *
 * The performance argument was that a union costs ~134x a flat parse. That figure
 * was measured on a recursive `z.lazy` JSON schema, where the cost is nesting
 * depth. A discriminated union is a `Map.get` plus exactly one member parse:
 * remeasured at 2.4x, and 64-deep nesting neither throws nor recurses. See
 * `play/tests/pusher/AnalyticsEventCatalog.bench.ts` for the numbers, including
 * the one that did survive — a discriminator MISS costs 11x, so callers look the
 * name up here before handing it to the union.
 *
 * What stays open is the payload: `properties` is `passthrough()`, so a known
 * event whose payload a newer front extended keeps its extra fields. Only the
 * event *name* is closed.
 *
 * What it is for:
 * - documentation: every event and field carries a description, ready for a
 *   generator to walk (see `contrib/tools/generate-env-docs`, which already does
 *   this for the env vars by reading `_def.description` off a Zod schema);
 * - types: `AnalyticsEventProperties<"some.event">` is that event's precise
 *   payload, which is what gives the front compile-time checking of both the name
 *   it emits and the properties it attaches.
 *
 * ## Adding an event
 *
 * Add one entry to `ANALYTICS_EVENTS`. The key is the name that travels on the
 * wire — there is no second registry to update, and a duplicate key is a compile
 * error. `event({...})` for one that carries properties, `signal("…")` for a bare
 * one. Anything that emits it then type-checks against this entry.
 *
 * ## Reading the shapes
 *
 * `properties` here is only what the *call site* passes. The pusher enriches every
 * event with `userUuid`, `userId`, `spaceUserId`, `clientIp`, `world`, `roomId`,
 * `tabId`, `clientEventTime` and `pusherReceivedAt` in `normalizeEvent`; those are
 * envelope columns, not per-event properties, and are absent below on purpose.
 *
 * Anonymization is worth knowing when adding a field, but it is not applied here:
 * the admin owns it end to end and applies it at ingestion
 * (AnalyticsMetricsPolicyService::anonymizeEvent). For a world that opted out of
 * `user_level_activity`, numbers and booleans always survive, but a **string**
 * survives only if its key is on the admin's allowlist — a new free-form string
 * field will silently vanish for those worlds unless it is added there too.
 */

/* -------------------------------------------------------------------------- */
/*                              Envelope fields                               */
/* -------------------------------------------------------------------------- */

const eventIdField = z
  .string()
  .min(1)
  .max(MAX_EVENT_ID_LENGTH)
  .describe(
    "Idempotency key. The backend stores events in a ReplacingMergeTree keyed partly on it, so a retried batch collapses instead of double-counting. Deterministic for backend-synthesized events; uuid-suffixed for repeating client events.",
  );

const clientEventTimeMsField = z
  .number()
  .int()
  .nonnegative()
  .max(MAX_TIMESTAMP_MS)
  .describe(
    "When the client believes the event happened, in milliseconds since the epoch. Untrusted: it comes from the browser clock, and the admin clamps it to the pusher's receive time when the two are implausibly far apart.",
  );

/* -------------------------------------------------------------------------- */
/*                             Property building blocks                       */
/* -------------------------------------------------------------------------- */

/** Most events are a bare signal: the fact that they happened is the whole datum. */
const noProperties = z
  .object({})
  .describe("This event carries no properties of its own.");

/**
 * An event that reports a finished interval on a single point-in-time event,
 * rather than a start row and an end row that have to be paired up later.
 *
 * This is the shape the pipeline settled on for durations: it leaves no orphan
 * "start" to reconcile when a tab dies or a pusher restarts, and a consumer reads
 * the duration straight off the event. `user.disconnected` and
 * `conversation.ended` both use it.
 */
export const timedEventProperties = z.object({
  startedAt: z
    .string()
    .datetime()
    .describe("ISO-8601 instant the interval began."),
  endedAt: z
    .string()
    .datetime()
    .describe("ISO-8601 instant the interval ended."),
  durationSeconds: z
    .number()
    .nonnegative()
    .describe(
      "Length of the interval in seconds — endedAt minus startedAt, reported so nothing has to pair rows.",
    ),
});

/** Shared by the three events that report a user-facing reliability problem. */
const experienceIssueProperties = z.object({
  category: z
    .string()
    .optional()
    .describe("Coarse grouping of the issue, e.g. the subsystem that failed."),
  reason: z
    .string()
    .optional()
    .describe(
      "Short machine-readable cause. Free text; keep it low-cardinality.",
    ),
  durationMs: z
    .number()
    .optional()
    .describe("How long the degraded state lasted, when measurable."),
  count: z
    .number()
    .optional()
    .describe(
      "How many occurrences this one event stands for, when coalesced.",
    ),
});

/** Shared by the meeting lifecycle events emitted from AnalyticsClient. */
const meetingContextProperties = z.object({
  meetingId: z
    .string()
    .optional()
    .describe("Identifier of the meeting, when the provider exposes one."),
  roomId: z.string().optional().describe("Room the meeting belongs to."),
  meetingProvider: z
    .enum(["livekit", "jitsi", "webrtc"])
    .optional()
    .describe("Which media backend carried the meeting."),
});

/**
 * Shared by every `conversation.*` event.
 *
 * How well `conversationId` correlates across participants depends on the type,
 * and anything querying these has to account for it: a spontaneous bubble is
 * keyed on the server-assigned group id (`group:<n>`), so every participant
 * reports the *same* id — but meetings and remote conversations have no shared
 * handle, so each client falls back to a locally generated uuid and two
 * participants in one meeting report *different* ids.
 *
 * `group:<n>` is also only unique per room: the back's counter is static per
 * process, so ids repeat across rooms, replicas and restarts. Count these on
 * (world, room, conversationId), never on the bare id.
 */
const conversationContextProperties = z.object({
  schemaVersion: z
    .literal(1)
    .describe("Payload version for the conversation family."),
  conversationId: z
    .string()
    .describe(
      "`group:<n>` for a spontaneous bubble (shared between participants, unique only per room), otherwise a per-client uuid.",
    ),
  meetingSessionId: z
    .string()
    .optional()
    .describe("Set to the conversationId when conversationType is `meeting`."),
  conversationType: z
    .enum(["spontaneous_bubble", "meeting", "remote"])
    .describe(
      "Bubble formed by walking up to someone, a meeting area, or a remote conversation.",
    ),
  meetingProvider: z
    .enum(["livekit", "jitsi", "webrtc"])
    .optional()
    .describe("Media backend in use; absent for a remote conversation."),
});

/** The eight `settings.*.changed` events that report a single new value. */
const settingValueProperties = z.object({
  value: z.string().describe("The setting's new value, as the UI reports it."),
});

/** Shared by the `area.*` events. */
const areaProperties = z.object({
  areaId: z.string().describe("Identifier of the area."),
  areaName: z
    .string()
    .describe("Human-readable area name, as authored on the map."),
});

/** Shared by the `map_editor.property.*` events. */
const mapEditorPropertyProperties = z.object({
  name: z.string().describe("The property's name."),
  type: z.string().describe("The property's type."),
});

/** Shared by the `map_editor.entity.*` events. */
const mapEditorEntityProperties = z.object({
  entityType: z.string().optional().describe("Kind of entity involved."),
});

/** Shared by the `map_editor.area.*` events. */
const mapEditorAreaProperties = z.object({
  areaType: z.string().optional().describe("Kind of area involved."),
});

const mediaDeviceKind = z
  .enum(["camera", "microphone", "camera_microphone"])
  .describe("Which device the user was asked for.");

const feedbackSourceField = z
  .enum(["sentry", "external_report_url"])
  .describe("Which feedback channel was used.");

/* -------------------------------------------------------------------------- */
/*                                  Helper                                    */
/* -------------------------------------------------------------------------- */

export type AnalyticsEventSource = z.infer<typeof isAnalyticsEventSource>;

/**
 * What one entry of the catalog declares. The event *name* is not in here: it is
 * the key it is filed under, so the two cannot disagree.
 */
export type AnalyticsEventDefinition<
  P extends z.AnyZodObject = z.AnyZodObject,
> = {
  readonly description: string;
  readonly source: AnalyticsEventSource;
  readonly properties: P;
};

/** An event that carries properties. Defaults to `front`, the common case. */
function event<P extends z.AnyZodObject>(def: {
  properties: P;
  description: string;
  source?: AnalyticsEventSource;
}): AnalyticsEventDefinition<P> {
  return {
    description: def.description,
    source: def.source ?? "front",
    properties: def.properties,
  };
}

/** A bare signal: the fact that it happened is the whole datum. */
function signal(
  description: string,
): AnalyticsEventDefinition<typeof noProperties> {
  return { description, source: "front", properties: noProperties };
}

/**
 * An interval the client opens and asks to have closed, which the pusher then
 * measures and emits as one row.
 *
 * These have two shapes, and conflating them is how the front ended up passing
 * something the pusher would reject: `openProperties` is what the client sends
 * with `timed_event.open`, while `properties` is what is finally stored — the
 * same fields plus the interval bounds and the reason, all of which the pusher
 * adds on its own clock. Declaring the first and deriving the second keeps them
 * from drifting.
 *
 * `source` is always "pusher" here, which is exactly why the set of names a
 * client may open has to stay narrow: opening one is asking the pusher to sign a
 * row. TIMED_ANALYTICS_EVENT_NAMES is derived from these entries.
 */
function timedEvent<P extends z.AnyZodObject>(def: {
  openProperties: P;
  description: string;
  endReasonDescription: string;
}): AnalyticsEventDefinition & { readonly openProperties: P } {
  return {
    description: def.description,
    source: "pusher",
    openProperties: def.openProperties,
    properties: def.openProperties.merge(timedEventProperties).extend({
      endReason: z
        .enum(TIMED_EVENT_END_REASONS)
        .describe(def.endReasonDescription),
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*                        Presence — pusher-synthesized                       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                 The catalog                                */
/* -------------------------------------------------------------------------- */

/**
 * Every analytics event, keyed by the name that travels on the wire.
 *
 * One literal per event, so the key IS the event name: there is no second
 * registry to keep in sync, and a duplicate key is a compile error (ts1117)
 * rather than a module-load throw. `as const satisfies` keeps the keys literal,
 * which is what lets the front derive per-event property types from this object.
 */
export const ANALYTICS_EVENTS = {
  "user.connected": event({
    properties: z.object({
      connectionId: z
        .string()
        .describe(
          "Identifies one socket. The tab id when there is one, otherwise user+room — which collapses two tabs of the same user onto one session.",
        ),
      connectedAt: z
        .string()
        .datetime()
        .describe("ISO-8601 instant the socket joined."),
    }),
    description:
      "A user's socket joined a room. Emitted by the pusher, which owns the socket lifecycle — the front cannot report this reliably because a tab close or crash never runs its code.",
    source: "pusher",
  }),

  "user.disconnected": event({
    properties: timedEventProperties
      .omit({ startedAt: true, endedAt: true })
      .extend({
        connectionId: z
          .string()
          .describe("Matches the connectionId of the paired user.connected."),
        connectedAt: z
          .string()
          .datetime()
          .describe("ISO-8601 instant the socket joined."),
        disconnectedAt: z
          .string()
          .datetime()
          .describe("ISO-8601 instant the socket went away."),
        disconnectReason: z
          .enum(["client_closed", "join_failed", "pusher_shutdown"])
          .describe(
            "`pusher_shutdown` means the pusher closed it during a graceful restart, not the user leaving.",
          ),
      }),
    description:
      "A user's socket left a room, carrying the finished session. This is what the admin projects into analytics_connection_sessions, so it is the source of truth for connection time. A disconnect whose connect was never seen is dropped rather than reported with a guessed duration.",
    source: "pusher",
  }),

  "conversation.ended": timedEvent({
    openProperties: conversationContextProperties,
    endReasonDescription:
      "Why the interval ended. `type_changed` means one conversation was split because its type changed — a bubble that became a meeting reports two conversations, so stitch on time rather than assuming one id per conversation. The `socket_closed` / `pusher_*` values mean the client never got to say, and the pusher closed it.",
    description:
      "A conversation, measured. Emitted by the pusher when the interval closes — never by the client, which cannot state a duration — and timestamped at its end.",
  }),

  "media.video_quality.sample": event({
    properties: z.object({
      streamId: z.string().describe("The WebRTC stream this sample measures."),
      connectionId: z
        .string()
        .nullable()
        .describe("Peer connection the stream rode on."),
      sessionId: z
        .string()
        .nullable()
        .describe("Media session grouping the streams."),
      remoteUserUuid: z
        .string()
        .nullable()
        .describe(
          "The other party. Pseudonymized admin-side for worlds that opted out of user-level activity.",
        ),
      remoteSpaceUserId: z
        .string()
        .describe("The other party's space-scoped id."),
      spaceName: z
        .string()
        .describe(
          "Space the stream belongs to. The pusher rejects a sample for a space the socket has not joined.",
        ),
      streamCategory: z
        .enum(["video", "screenSharing"])
        .describe("Whether the stream is a camera or a screen share."),
      transportType: z
        .enum(["P2P", "SFU"])
        .describe("Direct peer connection, or relayed through an SFU."),
      relay: z
        .boolean()
        .nullable()
        .describe("Whether the connection went through a TURN relay."),
      relayProtocol: z
        .enum(["udp", "tcp", "tls"])
        .nullable()
        .describe("Transport the relay used."),
      livekitServerUrl: z
        .string()
        .nullable()
        .describe("LiveKit server that carried the stream, when applicable."),
      fps: z
        .number()
        .describe("Frames per second observed over the sample window."),
      fpsStdDev: z
        .number()
        .nullable()
        .describe(
          "Jitter in the frame rate; a high value reads as stutter even when the mean fps looks fine.",
        ),
      jitter: z.number().describe("Packet jitter in seconds."),
      bandwidthBytesPerSecond: z
        .number()
        .describe("Throughput observed over the sample window."),
      frameWidth: z.number().int().describe("Rounded frame width in pixels."),
      frameHeight: z.number().int().describe("Rounded frame height in pixels."),
      mimeType: z
        .string()
        .nullable()
        .describe("Negotiated codec, e.g. video/VP8."),
      sampleSeq: z
        .number()
        .nullable()
        .describe(
          "Monotonic counter per stream, used to order and de-duplicate samples.",
        ),
    }),
    description:
      "One periodic WebRTC quality measurement. Synthesized by the pusher from a videoQualityReportMessage rather than reported directly, so a client cannot forge it.",
    source: "pusher",
  }),

  "auth.user_identified": event({
    properties: z.object({
      roomId: z
        .string()
        .nullable()
        .describe("Room the user was identified in, when known."),
    }),
    description:
      "The user was identified, i.e. attached to an account rather than anonymous.",
  }),

  "room.visited": event({
    properties: z.object({
      roomId: z.string().describe("The room entered."),
      roomGroup: z
        .string()
        .nullable()
        .describe("Group the room belongs to, when it has one."),
    }),
    description: "The user entered a room.",
  }),

  "room.changed": event({
    properties: z.object({
      fromRoomId: z.string().describe("Room left."),
      toRoomId: z.string().describe("Room entered."),
    }),
    description:
      "The user moved from one room to another without disconnecting.",
  }),

  "room_list.room_clicked": event({
    properties: z.object({
      roomId: z.string().optional().describe("Room picked from the list."),
    }),
    description: "The user picked a room from the room list.",
  }),

  "session.started": event({
    properties: z.object({
      roomId: z.string().optional().describe("Room the session started in."),
      schemaVersion: z
        .literal(1)
        .describe("Payload version for the session family."),
    }),
    description:
      "A front-side session began. Note the pusher's user.connected is the reliable presence signal; this one is best-effort.",
  }),

  "session.ended": event({
    properties: z.object({
      roomId: z.string().optional().describe("Room the session ended in."),
      schemaVersion: z
        .literal(1)
        .describe("Payload version for the session family."),
    }),
    description:
      "A front-side session ended. Only reaches the pusher on paths where the front still runs — a tab close does not. Carries no duration; use the pusher's user.disconnected for that.",
  }),

  "meeting.area_entered": event({
    properties: z.object({
      roomId: z.string().describe("Room containing the meeting area."),
      meetingProvider: z
        .enum(["livekit", "jitsi", "webrtc"])
        .optional()
        .describe("Media backend of the area."),
    }),
    description: "The user walked into a meeting area.",
  }),

  "meeting.started": event({
    properties: meetingContextProperties,
    description: "A meeting started.",
  }),

  "meeting.ended": event({
    properties: meetingContextProperties,
    description:
      "A meeting ended. Carries no duration — pair it with meeting.started on time, or read conversation.ended for measured collaboration time.",
  }),

  "meeting.provider_changed": event({
    properties: conversationContextProperties.extend({
      previousMeetingProvider: z
        .enum(["livekit", "jitsi", "webrtc"])
        .describe(
          "Provider in use before the switch; meetingProvider carries the one switched to.",
        ),
    }),
    description:
      "A meeting switched media backend mid-session, reported with the conversation it happened in. Despite the `meeting.` prefix this belongs to the conversation family: ConversationAnalytics owns the transition and is the only emitter.",
  }),

  "meeting.screenshare.ended": timedEvent({
    openProperties: z.object({
      screenShareSessionId: z
        .string()
        .describe("Identifies the share this interval measures."),
      hasAudio: z
        .boolean()
        .describe("Whether the shared screen carried audio."),
    }),
    endReasonDescription: "Why the share stopped, or what stopped it.",
    description:
      "A screen share, measured. One row per share, emitted by the pusher when the interval closes and timestamped at its end. There is no matching `.started`: the interval carries its own start.",
  }),

  "meeting.layout_changed": event({
    properties: z.object({
      layout: z
        .string()
        .describe("The layout switched to, e.g. `presentation`."),
    }),
    description: "The user changed the meeting layout.",
  }),

  "meeting.picture_in_picture.toggled": event({
    properties: z.object({
      open: z
        .boolean()
        .describe(
          "True when picture-in-picture was opened, false when closed.",
        ),
    }),
    description: "The user toggled picture-in-picture.",
  }),

  "chat.message_sent": event({
    properties: z.object({
      chatContext: z
        .enum(["proximity", "room"])
        .optional()
        .describe(
          "Whether the message went to a nearby group or to the whole room.",
        ),
    }),
    description: "The user sent a chat message. Content is never collected.",
  }),

  "invite.sent": event({
    properties: z.object({
      inviteType: z
        .string()
        .optional()
        .describe("How the invite was sent, e.g. a copied link."),
    }),
    description: "The user sent an invite.",
  }),

  "invite.accepted": event({
    properties: z.object({
      inviteType: z
        .string()
        .optional()
        .describe("How the invite was received."),
    }),
    description:
      "An invite was accepted. One of the signals the admin treats as a world's first useful moment.",
  }),

  "invite.walk_link_option_changed": event({
    properties: z.object({
      value: z
        .boolean()
        .describe("Whether the walk-to-me link option was turned on."),
    }),
    description: "The user toggled the walk-to-me option on an invite link.",
  }),

  "area.dwell": timedEvent({
    openProperties: areaProperties,
    endReasonDescription: "Why the dwell ended, or what ended it.",
    description:
      "Time the user spent inside an area. One row per visit, emitted by the pusher when the interval closes and timestamped at its end. This replaced an area.entered/area.left pair that the admin re-paired with a window function over every event in the room.",
  }),

  "status.dwell": timedEvent({
    openProperties: z.object({
      status: z
        .string()
        .describe(
          "Availability status held during this period (ONLINE, BUSY, DO_NOT_DISTURB, BACK_IN_A_MOMENT, …).",
        ),
    }),
    endReasonDescription: "Why the status period ended, or what ended it.",
    description:
      "Time the user held one availability status, measured by the pusher between status changes and closed at disconnect. Gated per world by the user_level_activity policy the admin applies at ingestion: without opt-in it is pseudonymized there, so no named per-member timeline is stored.",
  }),

  "map_editor.area.lock.toggled": event({
    properties: z.object({
      areaId: z.string().describe("Area whose lock changed."),
      areaName: z.string().optional().describe("Human-readable area name."),
      locked: z.boolean().describe("True when the area was locked."),
    }),
    description: "The user locked or unlocked an area.",
  }),

  "map_editor.property.added": event({
    properties: mapEditorPropertyProperties,
    description: "A property was added to a map object.",
  }),

  "map_editor.property.removed": event({
    properties: mapEditorPropertyProperties,
    description: "A property was removed from a map object.",
  }),

  "map_editor.property.clicked": event({
    properties: z.object({
      name: z.string().describe("The property that was clicked."),
      style: z
        .string()
        .optional()
        .describe("Which rendering of the property was clicked."),
    }),
    description: "A map property was clicked in-world.",
  }),

  "map_editor.tool.opened": event({
    properties: z.object({ name: z.string().describe("The tool opened.") }),
    description: "The user opened a map editor tool.",
  }),

  "map_editor.application_picker.opened": event({
    properties: z.object({
      applicationName: z
        .string()
        .describe("The application whose picker was opened."),
    }),
    description: "The user opened an application picker in the map editor.",
  }),

  "map_editor.application.opened": event({
    properties: z.object({
      applicationName: z.string().describe("The application opened."),
    }),
    description: "The user opened an application from the map editor.",
  }),

  "map_editor.save.started": event({
    properties: z.object({
      scope: z.string().optional().describe("What was being saved."),
    }),
    description: "A map editor save began.",
  }),

  "map_editor.save.succeeded": event({
    properties: z.object({
      scope: z.string().optional().describe("What was saved."),
      durationMs: z.number().optional().describe("How long the save took."),
    }),
    description: "A map editor save completed.",
  }),

  "map_editor.save.failed": event({
    properties: z.object({
      scope: z.string().optional().describe("What was being saved."),
      reason: z.string().optional().describe("Why the save failed."),
      durationMs: z
        .number()
        .optional()
        .describe("How long the attempt took before failing."),
    }),
    description: "A map editor save failed.",
  }),

  "map_editor.entity.added": event({
    properties: mapEditorEntityProperties,
    description: "An entity was added to the map.",
  }),

  "map_editor.entity.removed": event({
    properties: mapEditorEntityProperties,
    description: "An entity was removed from the map.",
  }),

  "map_editor.entity.updated": event({
    properties: mapEditorEntityProperties,
    description: "An entity on the map was updated.",
  }),

  "map_editor.area.created": event({
    properties: mapEditorAreaProperties,
    description: "An area was created on the map.",
  }),

  "map_editor.area.updated": event({
    properties: mapEditorAreaProperties,
    description: "An area on the map was updated.",
  }),

  "map_editor.area.removed": event({
    properties: mapEditorAreaProperties,
    description: "An area was removed from the map.",
  }),

  "map_loading.started": event({
    properties: z.object({
      mapUrl: z
        .string()
        .optional()
        .describe(
          "The map being loaded, with query string and hash stripped — those carry auth tokens. The path is kept on purpose: for a map it *is* the signal, naming which map loaded.",
        ),
    }),
    description: "A map started loading.",
  }),

  "map_loading.succeeded": event({
    properties: z.object({
      durationMs: z
        .number()
        .optional()
        .describe("How long the map took to load."),
    }),
    description: "A map finished loading.",
  }),

  "map_loading.failed": event({
    properties: z.object({
      reason: z.string().optional().describe("Why the load failed."),
      durationMs: z
        .number()
        .optional()
        .describe("How long the attempt took before failing."),
    }),
    description:
      "A map failed to load. One of the events the admin counts as an experience issue.",
  }),

  "media.connection_retry": event({
    properties: z.object({
      meetingProvider: z
        .enum(["webrtc", "livekit"])
        .describe("Which backend was retried."),
    }),
    description: "A media connection was retried.",
  }),

  "media.turn_test.succeeded": event({
    properties: z.object({
      protocol: z
        .string()
        .nullable()
        .describe("Transport the TURN server accepted."),
    }),
    description: "The TURN connectivity test passed.",
  }),

  "media.permission_denied": event({
    properties: z.object({
      kind: mediaDeviceKind,
      reason: z.string().optional().describe("Why permission was refused."),
    }),
    description:
      "The browser refused camera or microphone access. Counted as an experience issue.",
  }),

  "media.device_error": event({
    properties: z.object({
      kind: mediaDeviceKind,
      reason: z
        .string()
        .optional()
        .describe("What went wrong with the device."),
    }),
    description:
      "A camera or microphone failed. Counted as an experience issue.",
  }),

  "media.quality_issue": event({
    properties: experienceIssueProperties,
    description: "Media quality degraded noticeably for the user.",
  }),

  "settings.microphone.changed": event({
    properties: settingValueProperties,
    description: "The user changed the microphone setting.",
  }),

  "settings.camera.changed": event({
    properties: settingValueProperties,
    description: "The user changed the camera setting.",
  }),

  "settings.notification.changed": event({
    properties: settingValueProperties,
    description: "The user changed the notification setting.",
  }),

  "settings.picture_in_picture.changed": event({
    properties: settingValueProperties,
    description: "The user changed the picture-in-picture setting.",
  }),

  "settings.fullscreen.changed": event({
    properties: settingValueProperties,
    description: "The user changed the fullscreen setting.",
  }),

  "settings.ask_website.changed": event({
    properties: settingValueProperties,
    description: "The user changed the ask-before-opening-a-website setting.",
  }),

  "settings.request_follow.changed": event({
    properties: settingValueProperties,
    description: "The user changed the follow-request setting.",
  }),

  "settings.decrease_audio_volume.changed": event({
    properties: settingValueProperties,
    description: "The user changed the auto-lower-volume setting.",
  }),

  "settings.background.changed": event({
    properties: z.object({
      backgroundType: z
        .string()
        .describe("The background effect selected, e.g. blur."),
    }),
    description: "The user changed their video background.",
  }),

  "cowebsite.opened": event({
    properties: z.object({
      url: z
        .string()
        .describe(
          "Origin only. The query and hash carry auth tokens, and the path carries the document name — which is reported separately as fileName so it can be gated on its own.",
        ),
      targetUrl: z
        .string()
        .describe("Origin of the opened target, reduced the same way as url."),
      mediaKind: z
        .enum([
          "pdf",
          "image",
          "video",
          "audio",
          "document",
          "presentation",
          "spreadsheet",
          "website",
          "other",
        ])
        .describe(
          "What kind of thing was opened, inferred in the browser from the full URL.",
        ),
      triggerProperty: z
        .enum(["openLink", "openWebsite", "other"])
        .describe("What caused the cowebsite to open."),
      fileName: z
        .string()
        .nullable()
        .optional()
        .describe(
          "The document's name. Deliberately absent from the admin's anonymization allowlist, so a world that opts out of user-level activity has it stripped at ingestion — and the internal Kiosk does not project it, so only the world's own back-office sees it.",
        ),
      fileExtension: z
        .string()
        .nullable()
        .optional()
        .describe(
          "Extension derived in the browser from the full URL, so only the extension leaves it.",
        ),
      areaId: z
        .string()
        .optional()
        .describe("Area the cowebsite was opened from."),
      areaName: z.string().optional().describe("Human-readable area name."),
      schemaVersion: z
        .number()
        .describe("Payload version for the cowebsite family."),
    }),
    description:
      "The user opened a cowebsite — a document, app or website embedded in the world.",
  }),

  "onboarding.woka_validated": event({
    properties: z.object({
      scene: z
        .string()
        .describe("Which onboarding scene the Woka was confirmed in."),
    }),
    description: "The user confirmed their Woka during onboarding.",
  }),

  "feedback.opened": event({
    properties: z.object({ feedbackSource: feedbackSourceField }),
    description: "The user opened the feedback form.",
  }),

  "feedback.submitted": event({
    properties: z.object({
      feedbackSource: feedbackSourceField,
      hasScreenshot: z
        .boolean()
        .optional()
        .describe("Whether the user attached a screenshot."),
    }),
    description: "The user submitted feedback. Content is never collected.",
  }),

  "external_module.chat_band.clicked": event({
    properties: z.object({
      externalModuleName: z
        .string()
        .describe("Which external module the band belongs to."),
      action: z.string().describe("What the user clicked."),
    }),
    description: "The user clicked an external module's chat band.",
  }),

  "menu.custom.opened": event({
    properties: z.object({
      name: z.string().describe("The custom menu opened."),
    }),
    description: "The user opened a world-defined custom menu.",
  }),

  "emote.launched": event({
    properties: z.object({ name: z.string().describe("The emote played.") }),
    description: "The user played an emote.",
  }),

  "custom_button.clicked": event({
    properties: z.object({
      id: z.string().describe("The button's id."),
      label: z.string().optional().describe("The button's visible label."),
    }),
    description: "The user clicked a world-defined custom button.",
  }),

  "popup.opened": event({
    properties: z.object({
      targetRectangle: z
        .string()
        .describe("The map rectangle the popup is anchored to."),
      id: z
        .number()
        .describe(
          "The popup's id, as assigned by the scripting API (OpenPopupEvent.popupId).",
        ),
    }),
    description: "A scripted popup was opened.",
  }),

  "world.entered": event({
    properties: z.object({
      durationMs: z
        .number()
        .optional()
        .describe("How long entering the world took."),
    }),
    description: "The user finished entering a world.",
  }),

  "asset.error": event({
    properties: z.object({
      kind: z
        .enum(["tile", "asset"])
        .describe("Whether a tileset or another asset failed."),
      reason: z.string().optional().describe("What failed to load."),
    }),
    description:
      "A map tile or asset failed to load. Counted as an experience issue.",
  }),

  "websocket.connection_lost": event({
    properties: z.object({
      reason: z.string().optional().describe("Why the socket dropped."),
    }),
    description:
      "The websocket connection dropped. Counted as an experience issue.",
  }),

  "front.critical_error": event({
    properties: experienceIssueProperties,
    description: "The front hit an error serious enough to affect the user.",
  }),

  "performance.issue": event({
    properties: experienceIssueProperties,
    description:
      "The client detected a performance problem, e.g. a long task blocking the main thread.",
  }),

  "pwa.install_prompt_shown": event({
    properties: z.object({
      isIos: z
        .boolean()
        .describe("iOS needs a manual install flow, so the prompt differs."),
    }),
    description: "The install-as-an-app prompt was shown.",
  }),

  "pwa.install_outcome": event({
    properties: z.object({
      outcome: z
        .enum(["accepted", "dismissed"])
        .describe("What the user chose."),
    }),
    description: "The user accepted or dismissed the install prompt.",
  }),

  /* ---- Bare signals: the fact that they happened is the whole datum. ---- */

  "auth.logged_sso": signal("The user signed in through SSO."),
  "auth.logged_token": signal("The user signed in with a token."),
  "auth.login_clicked": signal("The user clicked sign in."),
  "auth.logout_clicked": signal("The user clicked sign out."),
  "bubble.lock.toggled": signal(
    "The user locked or unlocked their conversation bubble.",
  ),
  "bubble.say.opened": signal("The user opened the say bubble."),
  "bubble.think.opened": signal("The user opened the think bubble."),
  "chat.matrix_encryption_configuration.started": signal(
    "The user started configuring chat encryption.",
  ),
  "chat.matrix_folder.created": signal("The user created a chat folder."),
  "chat.matrix_room.created": signal("The user created a chat room."),
  "chat.message_from_user_list_clicked": signal(
    "The user started a chat from the user list.",
  ),
  "chat.message_list_opened": signal("The user opened the message list."),
  "chat.opened": signal("The user opened the chat."),
  "conversation.participant_added": signal(
    "Someone joined the user's conversation.",
  ),
  "cowebsite.closed": signal("The user closed a cowebsite."),
  "cowebsite.fullscreen_opened": signal("The user put a cowebsite fullscreen."),
  "cowebsite.link_copied": signal("The user copied a cowebsite's link."),
  "cowebsite.opened_in_new_tab": signal(
    "The user opened a cowebsite in a browser tab.",
  ),
  "cowebsite.switched": signal("The user switched between open cowebsites."),
  "emote.edit_opened": signal("The user opened the emote editor."),
  "external_module.calendar_opened": signal(
    "The user opened the calendar module.",
  ),
  "external_module.opened": signal("The user opened an external module."),
  "external_module.todo_list_opened": signal(
    "The user opened the todo list module.",
  ),
  "file.drag_dropped": signal("The user dropped a file into the world."),
  "global_audio.opened": signal("The user opened the global audio panel."),
  "global_message.opened": signal(
    "The user opened the global message composer.",
  ),
  "global_message.sound_sent": signal(
    "The user broadcast a sound to the world.",
  ),
  "global_message.text_sent": signal(
    "The user broadcast a text message to the world.",
  ),
  "invite.opened": signal("The user opened the invite panel."),
  "map_editor.closed": signal("The user closed the map editor."),
  "map_editor.opened": signal("The user opened the map editor."),
  "map_explorer.center_to_user_clicked": signal(
    "The user recentred the explorer on themselves.",
  ),
  "map_explorer.closed": signal("The user closed the map explorer."),
  "map_explorer.filtered": signal("The user filtered the map explorer."),
  "map_explorer.opened": signal("The user opened the map explorer."),
  "map_explorer.top_button_clicked": signal(
    "The user opened the explorer from the top button.",
  ),
  "map_explorer.zoom_in_clicked": signal(
    "The user zoomed in on the map explorer.",
  ),
  "map_explorer.zoom_out_clicked": signal(
    "The user zoomed out on the map explorer.",
  ),
  "media.camera.toggled": signal("The user turned their camera on or off."),
  "media.microphone.toggled": signal(
    "The user turned their microphone on or off.",
  ),
  "media.turn_test.failed": signal(
    "The TURN connectivity test failed. Counted as an experience issue.",
  ),
  "media.turn_test.timeout": signal(
    "The TURN connectivity test timed out. Counted as an experience issue.",
  ),
  "media.video_stream_missing": signal(
    "A video stream was expected but never arrived. Counted as an experience issue.",
  ),
  "meeting.actions.opened": signal("The user opened the meeting actions menu."),
  "meeting.camera_layout_resized": signal(
    "The user resized the camera layout.",
  ),
  "meeting.microphone.muted": signal(
    "The user muted their microphone in a meeting.",
  ),
  "meeting.microphone.muted_for_everybody": signal(
    "A moderator muted everyone's microphone.",
  ),
  "meeting.participant.kicked": signal("A moderator removed a participant."),
  "meeting.participant.pinned": signal(
    "The user pinned a participant's video.",
  ),
  "meeting.private_message.clicked": signal(
    "The user started a private message from a meeting.",
  ),
  "meeting.report.clicked": signal("The user reported someone from a meeting."),
  "meeting.screenshare.toggled": signal("The user toggled screen sharing."),
  "meeting.video.muted": signal(
    "The user turned their camera off in a meeting.",
  ),
  "meeting.video.muted_for_everybody": signal(
    "A moderator turned off everyone's camera.",
  ),
  "megaphone.ended": signal("A megaphone broadcast ended."),
  "megaphone.opened": signal("The user opened the megaphone."),
  "megaphone.started": signal("A megaphone broadcast started."),
  "menu.chat.opened": signal("The user opened the chat from the menu."),
  "menu.contact.opened": signal("The user opened the contact page."),
  "menu.credit.opened": signal("The user opened the credits."),
  "menu.opened": signal("The user opened the main menu."),
  "menu.shortcuts.opened": signal("The user opened the keyboard shortcuts."),
  "onboarding.companion_selected": signal(
    "The user picked a companion during onboarding.",
  ),
  "onboarding.custom_woka_selected": signal(
    "The user picked a custom Woka during onboarding.",
  ),
  "onboarding.name_validated": signal(
    "The user confirmed their name during onboarding.",
  ),
  "onboarding.video_validated": signal(
    "The user confirmed their camera setup during onboarding.",
  ),
  "onboarding.woka_selected": signal(
    "The user picked a Woka during onboarding.",
  ),
  "personal_desk.entered": signal("The user sat at their personal desk."),
  "personal_desk.unclaimed": signal("The user released their personal desk."),
  "profile.camera_edit_opened": signal(
    "The user opened camera settings from their profile.",
  ),
  "profile.companion_edit_opened": signal(
    "The user opened companion settings from their profile.",
  ),
  "profile.name_edit_opened": signal(
    "The user opened name settings from their profile.",
  ),
  "profile.opened": signal("The user opened their profile."),
  "profile.woka_edit_opened": signal(
    "The user opened Woka settings from their profile.",
  ),
  "pwa.continue_in_browser_clicked": signal(
    "The user chose to stay in the browser rather than install.",
  ),
  "pwa.install_clicked": signal("The user clicked install."),
  "pwa.install_from_profile_menu_clicked": signal(
    "The user started an install from the profile menu.",
  ),
  "recording.list_opened": signal("The user opened the recordings list."),
  "recording.started": signal("A recording started."),
  "recording.stopped": signal("A recording stopped."),
  "room_list.opened": signal("The user opened the room list."),
  "settings.audio_volume.opened": signal(
    "The user opened the audio volume settings.",
  ),
  "settings.background.opened": signal(
    "The user opened the video background settings.",
  ),
  "settings.camera.selected": signal("The user opened the camera picker."),
  "settings.microphone.selected": signal(
    "The user opened the microphone picker.",
  ),
  "settings.opened": signal("The user opened the settings."),
  "settings.speaker.selected": signal("The user opened the speaker picker."),
  "user.business_card.opened": signal(
    "The user opened someone's business card.",
  ),
  "user.follow_requested": signal("The user asked to follow someone."),
  "user.go_to_clicked": signal("The user jumped to someone's position."),
  "user.report.clicked": signal("The user reported someone."),
  "user.woka_menu.opened": signal("The user opened the Woka context menu."),
  "user_list.opened": signal("The user opened the user list."),
  "websocket.reconnecting": signal(
    "The client is retrying its websocket connection. Counted as an experience issue.",
  ),
} as const satisfies Record<string, AnalyticsEventDefinition>;

/* -------------------------------------------------------------------------- */
/*                            Derived from the catalog                        */
/* -------------------------------------------------------------------------- */

/** Every event name the pipeline knows about. */
export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

/**
 * The properties a call site passes for event `N`.
 *
 * Indexed access, deliberately, rather than `Extract<z.infer<typeof analyticsEvent>,
 * { eventName: N }>`: that would be a distributive conditional over 166 union
 * members instantiated afresh at every one of the front's ~166 call sites, and it
 * would print 166-member unions into every type error in AnalyticsClient. This is
 * O(1) for the checker and names one event when it complains.
 */
export type AnalyticsEventProperties<N extends AnalyticsEventName> = z.input<
  (typeof ANALYTICS_EVENTS)[N]["properties"]
>;

/** The events a client may ask the pusher to time, i.e. those built by `timedEvent`. */
export type TimedAnalyticsEventName = {
  [N in AnalyticsEventName]: (typeof ANALYTICS_EVENTS)[N] extends {
    openProperties: z.AnyZodObject;
  }
    ? N
    : never;
}[AnalyticsEventName];

/** What the client sends with `timed_event.open` for event `N`. */
export type TimedAnalyticsEventOpenProperties<
  N extends TimedAnalyticsEventName,
> = z.input<(typeof ANALYTICS_EVENTS)[N]["openProperties"]>;

/**
 * The allowlist for `timed_event.open`, derived rather than hand-maintained.
 *
 * Narrower than the catalog on purpose: opening one of these asks the pusher to
 * emit a row signed `source: "pusher"`, which the admin trusts. Adding a
 * `timedEvent` entry therefore widens what a client may ask for — the catalog
 * test asserts the exact contents so that never happens unnoticed.
 */
export const TIMED_ANALYTICS_EVENT_NAMES = Object.entries(ANALYTICS_EVENTS)
  .filter(([, definition]) => "openProperties" in definition)
  .map(([eventName]) => eventName) as [
  TimedAnalyticsEventName,
  ...TimedAnalyticsEventName[],
];

/** Keys of `T` that a caller cannot omit. */
type RequiredKeys<T> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * The properties argument for event `N`, optional when the event has none that
 * are required — which is the case for the ~94 bare signals, whose call sites
 * read `track("menu.opened")` with no second argument.
 *
 * The naive test (`Record<string, never> extends P`) does not work: `never` is
 * assignable to everything, so it also matches events that do have required
 * fields. Probing the required keys is what actually distinguishes them.
 */
export type AnalyticsEventArgs<N extends AnalyticsEventName> = [
  RequiredKeys<AnalyticsEventProperties<N>>,
] extends [never]
  ? [properties?: AnalyticsEventProperties<N>]
  : [properties: AnalyticsEventProperties<N>];

/**
 * Wraps a definition in the envelope that travels on the wire.
 *
 * `passthrough()` on the properties is load-bearing: `z.object` strips unknown
 * keys, so a long-lived tab running an older front — or a newer one that extended
 * a payload — would have the extra fields silently dropped on the way to the
 * admin. The byte cap in AnalyticsEventsQueue.normalizeEvent stays the real guard
 * on size. Only the event *name* is closed; its payload is not.
 */
function envelopeFor(
  eventName: string,
  definition: AnalyticsEventDefinition,
): z.ZodDiscriminatedUnionOption<"eventName"> {
  return z
    .object({
      eventName: z.literal(eventName),
      source: z
        .literal(definition.source)
        .describe(
          definition.source === "pusher"
            ? "Synthesized by the pusher. A socket claiming this name is rejected: the admin gives these events special meaning."
            : "Reported by the client.",
        ),
      clientEventTimeMs: clientEventTimeMsField,
      eventId: eventIdField,
      properties: definition.properties.passthrough(),
    })
    .describe(definition.description);
}

/**
 * Every event, keyed by name.
 *
 * Iterate this to generate documentation: each value is a Zod object whose
 * `_def.description` is the event's description and whose `shape.properties`
 * carries a description per field.
 */
export const ANALYTICS_EVENT_CATALOG = Object.fromEntries(
  Object.entries(ANALYTICS_EVENTS).map(([eventName, definition]) => [
    eventName,
    envelopeFor(eventName, definition),
  ]),
) as Record<AnalyticsEventName, z.ZodDiscriminatedUnionOption<"eventName">>;

const allEventSchemas = Object.values(ANALYTICS_EVENT_CATALOG) as [
  z.ZodDiscriminatedUnionOption<"eventName">,
  ...z.ZodDiscriminatedUnionOption<"eventName">[],
];

/** The catalog as one union. */
export const analyticsEventCatalogUnion = z.discriminatedUnion(
  "eventName",
  allEventSchemas,
);

/** Reads the literal event name off a catalog entry. */
export function analyticsEventNameOf(
  schema: z.ZodDiscriminatedUnionOption<"eventName">,
): string {
  const shape = schema.shape as { eventName: z.ZodLiteral<string> };

  return shape.eventName.value;
}
