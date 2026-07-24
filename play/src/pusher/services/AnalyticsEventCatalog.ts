import { z } from "zod";
import { MAX_EVENT_ID_LENGTH, MAX_TIMESTAMP_MS, TIMED_EVENT_END_REASONS } from "./AnalyticsEventSchema";

/**
 * One schema per analytics event, with every field `.describe()`d so the catalog
 * can be turned into documentation.
 *
 * ## This is documentation and types — NOT the runtime gate
 *
 * `AnalyticsEventSchema.isAnalyticsEventInput` validates the envelope on the hot
 * path and stays deliberately permissive: `eventName` is an opaque bounded
 * string. That is load-bearing, not an oversight. The pipeline is designed to let
 * a newer front ship an event family before admin knows about it —
 * `analyticsMetricCategoryForEvent` (AnalyticsEventsQueue) prefix-matches with a
 * default bucket, and the admin's AnalyticsEventsService logs-and-accepts unknown
 * names on purpose. It is not hypothetical either: 23 of the names the front
 * emits today are already unknown to the admin's allowlist.
 *
 * So do NOT wire this catalog in as a validation gate. A strict union over
 * `eventName` would drop a seventh of the taxonomy outright, and a strict
 * `properties` shape would additionally drop any known event whose payload a
 * newer front has extended — the exact rolling-deploy case the permissive
 * envelope exists to survive.
 *
 * What it is for:
 * - documentation: every event and field carries a description, ready for a
 *   generator to walk (see `contrib/tools/generate-env-docs`, which already does
 *   this for the env vars by reading `_def.description` off a Zod schema);
 * - types: `z.infer` of any exported event schema is its precise payload.
 *
 * ## Reading the shapes
 *
 * `properties` here is only what the *call site* passes. The pusher enriches every
 * event with `userUuid`, `userId`, `spaceUserId`, `clientIp`, `world`, `roomId`,
 * `tabId`, `clientEventTime` and `pusherReceivedAt` in `normalizeEvent`; those are
 * envelope columns, not per-event properties, and are absent below on purpose.
 *
 * Anonymization is worth knowing when adding a field: for a world that opted out
 * of `user_level_activity`, numbers and booleans always survive, but a **string**
 * survives only if its key is in `ANONYMOUS_SAFE_PROPERTY_KEYS`
 * (AnalyticsEventsQueue). A new free-form string field will silently vanish for
 * those worlds unless it is added there too.
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
const noProperties = z.object({}).describe("This event carries no properties of its own.");

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
    startedAt: z.string().datetime().describe("ISO-8601 instant the interval began."),
    endedAt: z.string().datetime().describe("ISO-8601 instant the interval ended."),
    durationSeconds: z
        .number()
        .nonnegative()
        .describe("Length of the interval in seconds — endedAt minus startedAt, reported so nothing has to pair rows."),
});

/** Shared by the three events that report a user-facing reliability problem. */
const experienceIssueProperties = z.object({
    category: z.string().optional().describe("Coarse grouping of the issue, e.g. the subsystem that failed."),
    reason: z.string().optional().describe("Short machine-readable cause. Free text; keep it low-cardinality."),
    durationMs: z.number().optional().describe("How long the degraded state lasted, when measurable."),
    count: z.number().optional().describe("How many occurrences this one event stands for, when coalesced."),
});

/** Shared by the meeting lifecycle events emitted from AnalyticsClient. */
const meetingContextProperties = z.object({
    meetingId: z.string().optional().describe("Identifier of the meeting, when the provider exposes one."),
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
    schemaVersion: z.literal(1).describe("Payload version for the conversation family."),
    conversationId: z
        .string()
        .describe(
            "`group:<n>` for a spontaneous bubble (shared between participants, unique only per room), otherwise a per-client uuid.",
        ),
    meetingSessionId: z.string().optional().describe("Set to the conversationId when conversationType is `meeting`."),
    conversationType: z
        .enum(["spontaneous_bubble", "meeting", "remote"])
        .describe("Bubble formed by walking up to someone, a meeting area, or a remote conversation."),
    meetingProvider: z
        .enum(["livekit", "jitsi", "webrtc"])
        .optional()
        .describe("Media backend in use; absent for a remote conversation."),
});

/** The eight `settings.*.changed` events that report a single new value. */
const settingValueProperties = z.object({
    value: z.string().describe("The setting's new value, as the UI reports it."),
});

/* -------------------------------------------------------------------------- */
/*                                  Helper                                    */
/* -------------------------------------------------------------------------- */

function defineEvent(
    eventName: string,
    properties: z.ZodTypeAny,
    description: string,
    source: "front" | "pusher" | "media" = "front",
): z.ZodDiscriminatedUnionOption<"eventName"> {
    return z
        .object({
            eventName: z.literal(eventName),
            source: z
                .literal(source)
                .describe(
                    source === "pusher"
                        ? "Synthesized by the pusher. A socket claiming this name is rejected: the admin gives these events special meaning."
                        : "Reported by the client.",
                ),
            clientEventTimeMs: clientEventTimeMsField,
            eventId: eventIdField,
            properties,
        })
        .describe(description);
}

/* -------------------------------------------------------------------------- */
/*                        Presence — pusher-synthesized                       */
/* -------------------------------------------------------------------------- */

export const userConnectedEvent = defineEvent(
    "user.connected",
    z.object({
        connectionId: z
            .string()
            .describe(
                "Identifies one socket. The tab id when there is one, otherwise user+room — which collapses two tabs of the same user onto one session.",
            ),
        connectedAt: z.string().datetime().describe("ISO-8601 instant the socket joined."),
    }),
    "A user's socket joined a room. Emitted by the pusher, which owns the socket lifecycle — the front cannot report this reliably because a tab close or crash never runs its code.",
    "pusher",
);

export const userDisconnectedEvent = defineEvent(
    "user.disconnected",
    timedEventProperties.omit({ startedAt: true, endedAt: true }).extend({
        connectionId: z.string().describe("Matches the connectionId of the paired user.connected."),
        connectedAt: z.string().datetime().describe("ISO-8601 instant the socket joined."),
        disconnectedAt: z.string().datetime().describe("ISO-8601 instant the socket went away."),
        disconnectReason: z
            .enum(["client_closed", "join_failed", "pusher_shutdown"])
            .describe("`pusher_shutdown` means the pusher closed it during a graceful restart, not the user leaving."),
    }),
    "A user's socket left a room, carrying the finished session. This is what the admin projects into analytics_connection_sessions, so it is the source of truth for connection time. A disconnect whose connect was never seen is dropped rather than reported with a guessed duration.",
    "pusher",
);

/* -------------------------------------------------------------------------- */
/*                          Conversations — front                             */
/* -------------------------------------------------------------------------- */

export const conversationEndedEvent = defineEvent(
    "conversation.ended",
    conversationContextProperties.merge(timedEventProperties).extend({
        endReason: z
            .enum(TIMED_EVENT_END_REASONS)
            .describe(
                "Why the interval ended. `type_changed` means one conversation was split because its type changed — a bubble that became a meeting reports two conversations, so stitch on time rather than assuming one id per conversation. The `socket_closed` / `pusher_*` values mean the client never got to say, and the pusher closed it.",
            ),
    }),
    "A conversation, measured. Emitted by the pusher when the interval closes — never by the client, which cannot state a duration — and timestamped at its end.",
    "pusher",
);

/* -------------------------------------------------------------------------- */
/*                             Media — quality                                */
/* -------------------------------------------------------------------------- */

export const mediaVideoQualitySampleEvent = defineEvent(
    "media.video_quality.sample",
    z.object({
        streamId: z.string().describe("The WebRTC stream this sample measures."),
        connectionId: z.string().nullable().describe("Peer connection the stream rode on."),
        sessionId: z.string().nullable().describe("Media session grouping the streams."),
        remoteUserUuid: z
            .string()
            .nullable()
            .describe("The other party. Pseudonymized for worlds that opted out of user-level activity."),
        remoteSpaceUserId: z.string().describe("The other party's space-scoped id."),
        spaceName: z
            .string()
            .describe(
                "Space the stream belongs to. The pusher rejects a sample for a space the socket has not joined.",
            ),
        streamCategory: z
            .enum(["video", "screenSharing"])
            .describe("Whether the stream is a camera or a screen share."),
        transportType: z.enum(["P2P", "SFU"]).describe("Direct peer connection, or relayed through an SFU."),
        relay: z.boolean().nullable().describe("Whether the connection went through a TURN relay."),
        relayProtocol: z.enum(["udp", "tcp", "tls"]).nullable().describe("Transport the relay used."),
        livekitServerUrl: z.string().nullable().describe("LiveKit server that carried the stream, when applicable."),
        fps: z.number().describe("Frames per second observed over the sample window."),
        fpsStdDev: z
            .number()
            .nullable()
            .describe("Jitter in the frame rate; a high value reads as stutter even when the mean fps looks fine."),
        jitter: z.number().describe("Packet jitter in seconds."),
        bandwidthBytesPerSecond: z.number().describe("Throughput observed over the sample window."),
        frameWidth: z.number().int().describe("Rounded frame width in pixels."),
        frameHeight: z.number().int().describe("Rounded frame height in pixels."),
        mimeType: z.string().nullable().describe("Negotiated codec, e.g. video/VP8."),
        sampleSeq: z
            .number()
            .nullable()
            .describe("Monotonic counter per stream, used to order and de-duplicate samples."),
    }),
    "One periodic WebRTC quality measurement. Synthesized by the pusher from a videoQualityReportMessage rather than reported directly, so a client cannot forge it.",
    "media",
);

/* -------------------------------------------------------------------------- */
/*                        Auth / session / room                               */
/* -------------------------------------------------------------------------- */

export const authUserIdentifiedEvent = defineEvent(
    "auth.user_identified",
    z.object({ roomId: z.string().nullable().describe("Room the user was identified in, when known.") }),
    "The user was identified, i.e. attached to an account rather than anonymous.",
);

export const roomVisitedEvent = defineEvent(
    "room.visited",
    z.object({
        roomId: z.string().describe("The room entered."),
        roomGroup: z.string().nullable().describe("Group the room belongs to, when it has one."),
    }),
    "The user entered a room.",
);

export const roomChangedEvent = defineEvent(
    "room.changed",
    z.object({
        fromRoomId: z.string().describe("Room left."),
        toRoomId: z.string().describe("Room entered."),
    }),
    "The user moved from one room to another without disconnecting.",
);

export const roomListRoomClickedEvent = defineEvent(
    "room_list.room_clicked",
    z.object({ roomId: z.string().optional().describe("Room picked from the list.") }),
    "The user picked a room from the room list.",
);

export const sessionStartedEvent = defineEvent(
    "session.started",
    z.object({
        roomId: z.string().optional().describe("Room the session started in."),
        schemaVersion: z.literal(1).describe("Payload version for the session family."),
    }),
    "A front-side session began. Note the pusher's user.connected is the reliable presence signal; this one is best-effort.",
);

export const sessionEndedEvent = defineEvent(
    "session.ended",
    z.object({
        roomId: z.string().optional().describe("Room the session ended in."),
        schemaVersion: z.literal(1).describe("Payload version for the session family."),
    }),
    "A front-side session ended. Only reaches the pusher on paths where the front still runs — a tab close does not. Carries no duration; use the pusher's user.disconnected for that.",
);

/* -------------------------------------------------------------------------- */
/*                                 Meetings                                   */
/* -------------------------------------------------------------------------- */

export const meetingAreaEnteredEvent = defineEvent(
    "meeting.area_entered",
    z.object({
        roomId: z.string().describe("Room containing the meeting area."),
        meetingProvider: z.enum(["livekit", "jitsi", "webrtc"]).optional().describe("Media backend of the area."),
    }),
    "The user walked into a meeting area.",
);

export const meetingStartedEvent = defineEvent("meeting.started", meetingContextProperties, "A meeting started.");

export const meetingEndedEvent = defineEvent(
    "meeting.ended",
    meetingContextProperties,
    "A meeting ended. Carries no duration — pair it with meeting.started on time, or read conversation.ended for measured collaboration time.",
);

export const meetingProviderChangedEvent = defineEvent(
    "meeting.provider_changed",
    conversationContextProperties.extend({
        previousMeetingProvider: z
            .enum(["livekit", "jitsi", "webrtc"])
            .describe("Provider in use before the switch; meetingProvider carries the one switched to."),
    }),
    "A meeting switched media backend mid-session, reported with the conversation it happened in. Despite the `meeting.` prefix this belongs to the conversation family: ConversationAnalytics owns the transition and is the only emitter.",
);

export const meetingScreenshareEndedEvent = defineEvent(
    "meeting.screenshare.ended",
    timedEventProperties.extend({
        screenShareSessionId: z.string().describe("Identifies the share this interval measures."),
        hasAudio: z.boolean().describe("Whether the shared screen carried audio."),
        endReason: z.enum(TIMED_EVENT_END_REASONS).describe("Why the share stopped, or what stopped it."),
    }),
    "A screen share, measured. One row per share, emitted by the pusher when the interval closes and timestamped at its end. There is no matching `.started`: the interval carries its own start.",
    "pusher",
);

export const meetingLayoutChangedEvent = defineEvent(
    "meeting.layout_changed",
    z.object({ layout: z.string().describe("The layout switched to, e.g. `presentation`.") }),
    "The user changed the meeting layout.",
);

export const meetingPictureInPictureToggledEvent = defineEvent(
    "meeting.picture_in_picture.toggled",
    z.object({ open: z.boolean().describe("True when picture-in-picture was opened, false when closed.") }),
    "The user toggled picture-in-picture.",
);

/* -------------------------------------------------------------------------- */
/*                                   Chat                                     */
/* -------------------------------------------------------------------------- */

export const chatMessageSentEvent = defineEvent(
    "chat.message_sent",
    z.object({
        chatContext: z
            .enum(["proximity", "room"])
            .optional()
            .describe("Whether the message went to a nearby group or to the whole room."),
    }),
    "The user sent a chat message. Content is never collected.",
);

/* -------------------------------------------------------------------------- */
/*                                 Invites                                    */
/* -------------------------------------------------------------------------- */

export const inviteSentEvent = defineEvent(
    "invite.sent",
    z.object({ inviteType: z.string().optional().describe("How the invite was sent, e.g. a copied link.") }),
    "The user sent an invite.",
);

export const inviteAcceptedEvent = defineEvent(
    "invite.accepted",
    z.object({ inviteType: z.string().optional().describe("How the invite was received.") }),
    "An invite was accepted. One of the signals the admin treats as a world's first useful moment.",
);

export const inviteWalkLinkOptionChangedEvent = defineEvent(
    "invite.walk_link_option_changed",
    z.object({ value: z.boolean().describe("Whether the walk-to-me link option was turned on.") }),
    "The user toggled the walk-to-me option on an invite link.",
);

/* -------------------------------------------------------------------------- */
/*                                   Areas                                    */
/* -------------------------------------------------------------------------- */

const areaProperties = z.object({
    areaId: z.string().describe("Identifier of the area."),
    areaName: z.string().describe("Human-readable area name, as authored on the map."),
});

export const areaDwellEvent = defineEvent(
    "area.dwell",
    areaProperties.merge(timedEventProperties).extend({
        endReason: z.enum(TIMED_EVENT_END_REASONS).describe("Why the dwell ended, or what ended it."),
    }),
    "Time the user spent inside an area. One row per visit, emitted by the pusher when the interval closes and timestamped at its end. This replaced an area.entered/area.left pair that the admin re-paired with a window function over every event in the room.",
    "pusher",
);

export const statusDwellEvent = defineEvent(
    "status.dwell",
    z
        .object({
            status: z
                .string()
                .describe(
                    "Availability status held during this period (ONLINE, BUSY, DO_NOT_DISTURB, BACK_IN_A_MOMENT, …).",
                ),
        })
        .merge(timedEventProperties)
        .extend({
            endReason: z.enum(TIMED_EVENT_END_REASONS).describe("Why the status period ended, or what ended it."),
        }),
    "Time the user held one availability status, measured by the pusher between status changes and closed at disconnect. Gated per world by the user_level_activity policy: without opt-in the pusher pseudonymizes it, so no named per-member timeline is stored.",
    "pusher",
);

/* -------------------------------------------------------------------------- */
/*                                Map editor                                  */
/* -------------------------------------------------------------------------- */

export const mapEditorAreaLockToggledEvent = defineEvent(
    "map_editor.area.lock.toggled",
    z.object({
        areaId: z.string().describe("Area whose lock changed."),
        areaName: z.string().optional().describe("Human-readable area name."),
        locked: z.boolean().describe("True when the area was locked."),
    }),
    "The user locked or unlocked an area.",
);

const mapEditorPropertyProperties = z.object({
    name: z.string().describe("The property's name."),
    type: z.string().describe("The property's type."),
});

export const mapEditorPropertyAddedEvent = defineEvent(
    "map_editor.property.added",
    mapEditorPropertyProperties,
    "A property was added to a map object.",
);

export const mapEditorPropertyRemovedEvent = defineEvent(
    "map_editor.property.removed",
    mapEditorPropertyProperties,
    "A property was removed from a map object.",
);

export const mapEditorPropertyClickedEvent = defineEvent(
    "map_editor.property.clicked",
    z.object({
        name: z.string().describe("The property that was clicked."),
        style: z.string().optional().describe("Which rendering of the property was clicked."),
    }),
    "A map property was clicked in-world.",
);

export const mapEditorToolOpenedEvent = defineEvent(
    "map_editor.tool.opened",
    z.object({ name: z.string().describe("The tool opened.") }),
    "The user opened a map editor tool.",
);

export const mapEditorApplicationPickerOpenedEvent = defineEvent(
    "map_editor.application_picker.opened",
    z.object({ applicationName: z.string().describe("The application whose picker was opened.") }),
    "The user opened an application picker in the map editor.",
);

export const mapEditorApplicationOpenedEvent = defineEvent(
    "map_editor.application.opened",
    z.object({ applicationName: z.string().describe("The application opened.") }),
    "The user opened an application from the map editor.",
);

export const mapEditorSaveStartedEvent = defineEvent(
    "map_editor.save.started",
    z.object({ scope: z.string().optional().describe("What was being saved.") }),
    "A map editor save began.",
);

export const mapEditorSaveSucceededEvent = defineEvent(
    "map_editor.save.succeeded",
    z.object({
        scope: z.string().optional().describe("What was saved."),
        durationMs: z.number().optional().describe("How long the save took."),
    }),
    "A map editor save completed.",
);

export const mapEditorSaveFailedEvent = defineEvent(
    "map_editor.save.failed",
    z.object({
        scope: z.string().optional().describe("What was being saved."),
        reason: z.string().optional().describe("Why the save failed."),
        durationMs: z.number().optional().describe("How long the attempt took before failing."),
    }),
    "A map editor save failed.",
);

const mapEditorEntityProperties = z.object({
    entityType: z.string().optional().describe("Kind of entity involved."),
});

export const mapEditorEntityAddedEvent = defineEvent(
    "map_editor.entity.added",
    mapEditorEntityProperties,
    "An entity was added to the map.",
);

export const mapEditorEntityRemovedEvent = defineEvent(
    "map_editor.entity.removed",
    mapEditorEntityProperties,
    "An entity was removed from the map.",
);

export const mapEditorEntityUpdatedEvent = defineEvent(
    "map_editor.entity.updated",
    mapEditorEntityProperties,
    "An entity on the map was updated.",
);

const mapEditorAreaProperties = z.object({
    areaType: z.string().optional().describe("Kind of area involved."),
});

export const mapEditorAreaCreatedEvent = defineEvent(
    "map_editor.area.created",
    mapEditorAreaProperties,
    "An area was created on the map.",
);

export const mapEditorAreaUpdatedEvent = defineEvent(
    "map_editor.area.updated",
    mapEditorAreaProperties,
    "An area on the map was updated.",
);

export const mapEditorAreaRemovedEvent = defineEvent(
    "map_editor.area.removed",
    mapEditorAreaProperties,
    "An area was removed from the map.",
);

/* -------------------------------------------------------------------------- */
/*                                Map loading                                 */
/* -------------------------------------------------------------------------- */

export const mapLoadingStartedEvent = defineEvent(
    "map_loading.started",
    z.object({
        mapUrl: z
            .string()
            .optional()
            .describe(
                "The map being loaded, with query string and hash stripped — those carry auth tokens. The path is kept on purpose: for a map it *is* the signal, naming which map loaded.",
            ),
    }),
    "A map started loading.",
);

export const mapLoadingSucceededEvent = defineEvent(
    "map_loading.succeeded",
    z.object({ durationMs: z.number().optional().describe("How long the map took to load.") }),
    "A map finished loading.",
);

export const mapLoadingFailedEvent = defineEvent(
    "map_loading.failed",
    z.object({
        reason: z.string().optional().describe("Why the load failed."),
        durationMs: z.number().optional().describe("How long the attempt took before failing."),
    }),
    "A map failed to load. One of the events the admin counts as an experience issue.",
);

/* -------------------------------------------------------------------------- */
/*                              Media / devices                               */
/* -------------------------------------------------------------------------- */

export const mediaConnectionRetryEvent = defineEvent(
    "media.connection_retry",
    z.object({ meetingProvider: z.enum(["webrtc", "livekit"]).describe("Which backend was retried.") }),
    "A media connection was retried.",
);

export const mediaTurnTestSucceededEvent = defineEvent(
    "media.turn_test.succeeded",
    z.object({ protocol: z.string().nullable().describe("Transport the TURN server accepted.") }),
    "The TURN connectivity test passed.",
);

const mediaDeviceKind = z
    .enum(["camera", "microphone", "camera_microphone"])
    .describe("Which device the user was asked for.");

export const mediaPermissionDeniedEvent = defineEvent(
    "media.permission_denied",
    z.object({ kind: mediaDeviceKind, reason: z.string().optional().describe("Why permission was refused.") }),
    "The browser refused camera or microphone access. Counted as an experience issue.",
);

export const mediaDeviceErrorEvent = defineEvent(
    "media.device_error",
    z.object({ kind: mediaDeviceKind, reason: z.string().optional().describe("What went wrong with the device.") }),
    "A camera or microphone failed. Counted as an experience issue.",
);

export const mediaQualityIssueEvent = defineEvent(
    "media.quality_issue",
    experienceIssueProperties,
    "Media quality degraded noticeably for the user.",
);

/* -------------------------------------------------------------------------- */
/*                                 Settings                                   */
/* -------------------------------------------------------------------------- */

export const settingsMicrophoneChangedEvent = defineEvent(
    "settings.microphone.changed",
    settingValueProperties,
    "The user changed the microphone setting.",
);

export const settingsCameraChangedEvent = defineEvent(
    "settings.camera.changed",
    settingValueProperties,
    "The user changed the camera setting.",
);

export const settingsNotificationChangedEvent = defineEvent(
    "settings.notification.changed",
    settingValueProperties,
    "The user changed the notification setting.",
);

export const settingsPictureInPictureChangedEvent = defineEvent(
    "settings.picture_in_picture.changed",
    settingValueProperties,
    "The user changed the picture-in-picture setting.",
);

export const settingsFullscreenChangedEvent = defineEvent(
    "settings.fullscreen.changed",
    settingValueProperties,
    "The user changed the fullscreen setting.",
);

export const settingsAskWebsiteChangedEvent = defineEvent(
    "settings.ask_website.changed",
    settingValueProperties,
    "The user changed the ask-before-opening-a-website setting.",
);

export const settingsRequestFollowChangedEvent = defineEvent(
    "settings.request_follow.changed",
    settingValueProperties,
    "The user changed the follow-request setting.",
);

export const settingsDecreaseAudioVolumeChangedEvent = defineEvent(
    "settings.decrease_audio_volume.changed",
    settingValueProperties,
    "The user changed the auto-lower-volume setting.",
);

export const settingsBackgroundChangedEvent = defineEvent(
    "settings.background.changed",
    z.object({ backgroundType: z.string().describe("The background effect selected, e.g. blur.") }),
    "The user changed their video background.",
);

/* -------------------------------------------------------------------------- */
/*                                 Cowebsite                                  */
/* -------------------------------------------------------------------------- */

export const cowebsiteOpenedEvent = defineEvent(
    "cowebsite.opened",
    z.object({
        url: z
            .string()
            .describe(
                "Origin only. The query and hash carry auth tokens, and the path carries the document name — which is reported separately as fileName so it can be gated on its own.",
            ),
        targetUrl: z.string().describe("Origin of the opened target, reduced the same way as url."),
        mediaKind: z
            .enum(["pdf", "image", "video", "audio", "document", "presentation", "spreadsheet", "website", "other"])
            .describe("What kind of thing was opened, inferred in the browser from the full URL."),
        triggerProperty: z.enum(["openLink", "openWebsite", "other"]).describe("What caused the cowebsite to open."),
        fileName: z
            .string()
            .nullable()
            .optional()
            .describe(
                "The document's name. Deliberately NOT in ANONYMOUS_SAFE_PROPERTY_KEYS, so a world that opts out of user-level activity stops sending it — and the internal Kiosk does not project it, so only the world's own back-office sees it.",
            ),
        fileExtension: z
            .string()
            .nullable()
            .optional()
            .describe("Extension derived in the browser from the full URL, so only the extension leaves it."),
        areaId: z.string().optional().describe("Area the cowebsite was opened from."),
        areaName: z.string().optional().describe("Human-readable area name."),
        schemaVersion: z.number().describe("Payload version for the cowebsite family."),
    }),
    "The user opened a cowebsite — a document, app or website embedded in the world.",
);

/* -------------------------------------------------------------------------- */
/*                           Onboarding / feedback                            */
/* -------------------------------------------------------------------------- */

export const onboardingWokaValidatedEvent = defineEvent(
    "onboarding.woka_validated",
    z.object({ scene: z.string().describe("Which onboarding scene the Woka was confirmed in.") }),
    "The user confirmed their Woka during onboarding.",
);

const feedbackSourceField = z.enum(["sentry", "external_report_url"]).describe("Which feedback channel was used.");

export const feedbackOpenedEvent = defineEvent(
    "feedback.opened",
    z.object({ feedbackSource: feedbackSourceField }),
    "The user opened the feedback form.",
);

export const feedbackSubmittedEvent = defineEvent(
    "feedback.submitted",
    z.object({
        feedbackSource: feedbackSourceField,
        hasScreenshot: z.boolean().optional().describe("Whether the user attached a screenshot."),
    }),
    "The user submitted feedback. Content is never collected.",
);

/* -------------------------------------------------------------------------- */
/*                             External modules                               */
/* -------------------------------------------------------------------------- */

export const externalModuleChatBandClickedEvent = defineEvent(
    "external_module.chat_band.clicked",
    z.object({
        externalModuleName: z.string().describe("Which external module the band belongs to."),
        action: z.string().describe("What the user clicked."),
    }),
    "The user clicked an external module's chat band.",
);

/* -------------------------------------------------------------------------- */
/*                            Misc / diagnostics                              */
/* -------------------------------------------------------------------------- */

export const menuCustomOpenedEvent = defineEvent(
    "menu.custom.opened",
    z.object({ name: z.string().describe("The custom menu opened.") }),
    "The user opened a world-defined custom menu.",
);

export const emoteLaunchedEvent = defineEvent(
    "emote.launched",
    z.object({ name: z.string().describe("The emote played.") }),
    "The user played an emote.",
);

export const customButtonClickedEvent = defineEvent(
    "custom_button.clicked",
    z.object({
        id: z.string().describe("The button's id."),
        label: z.string().optional().describe("The button's visible label."),
    }),
    "The user clicked a world-defined custom button.",
);

export const popupOpenedEvent = defineEvent(
    "popup.opened",
    z.object({
        targetRectangle: z.string().describe("The map rectangle the popup is anchored to."),
        id: z.string().describe("The popup's id."),
    }),
    "A scripted popup was opened.",
);

export const worldEnteredEvent = defineEvent(
    "world.entered",
    z.object({ durationMs: z.number().optional().describe("How long entering the world took.") }),
    "The user finished entering a world.",
);

export const assetErrorEvent = defineEvent(
    "asset.error",
    z.object({
        kind: z.enum(["tile", "asset"]).describe("Whether a tileset or another asset failed."),
        reason: z.string().optional().describe("What failed to load."),
    }),
    "A map tile or asset failed to load. Counted as an experience issue.",
);

export const websocketConnectionLostEvent = defineEvent(
    "websocket.connection_lost",
    z.object({ reason: z.string().optional().describe("Why the socket dropped.") }),
    "The websocket connection dropped. Counted as an experience issue.",
);

export const frontCriticalErrorEvent = defineEvent(
    "front.critical_error",
    experienceIssueProperties,
    "The front hit an error serious enough to affect the user.",
);

export const performanceIssueEvent = defineEvent(
    "performance.issue",
    experienceIssueProperties,
    "The client detected a performance problem, e.g. a long task blocking the main thread.",
);

export const pwaInstallPromptShownEvent = defineEvent(
    "pwa.install_prompt_shown",
    z.object({ isIos: z.boolean().describe("iOS needs a manual install flow, so the prompt differs.") }),
    "The install-as-an-app prompt was shown.",
);

export const pwaInstallOutcomeEvent = defineEvent(
    "pwa.install_outcome",
    z.object({ outcome: z.enum(["accepted", "dismissed"]).describe("What the user chose.") }),
    "The user accepted or dismissed the install prompt.",
);

/* -------------------------------------------------------------------------- */
/*                        Events that carry no properties                     */
/* -------------------------------------------------------------------------- */

/**
 * The long tail: a bare signal where the fact that it happened is the whole
 * datum. Kept as data rather than ~90 near-identical schema declarations — they
 * are registered below exactly like the ones above, so the catalog stays
 * complete without the boilerplate.
 */
const EVENTS_WITHOUT_PROPERTIES: Record<string, string> = {
    "auth.logged_sso": "The user signed in through SSO.",
    "auth.logged_token": "The user signed in with a token.",
    "auth.login_clicked": "The user clicked sign in.",
    "auth.logout_clicked": "The user clicked sign out.",
    "bubble.lock.toggled": "The user locked or unlocked their conversation bubble.",
    "bubble.say.opened": "The user opened the say bubble.",
    "bubble.think.opened": "The user opened the think bubble.",
    "chat.matrix_encryption_configuration.started": "The user started configuring chat encryption.",
    "chat.matrix_folder.created": "The user created a chat folder.",
    "chat.matrix_room.created": "The user created a chat room.",
    "chat.message_from_user_list_clicked": "The user started a chat from the user list.",
    "chat.message_list_opened": "The user opened the message list.",
    "chat.opened": "The user opened the chat.",
    "conversation.participant_added": "Someone joined the user's conversation.",
    "cowebsite.closed": "The user closed a cowebsite.",
    "cowebsite.fullscreen_opened": "The user put a cowebsite fullscreen.",
    "cowebsite.link_copied": "The user copied a cowebsite's link.",
    "cowebsite.opened_in_new_tab": "The user opened a cowebsite in a browser tab.",
    "cowebsite.switched": "The user switched between open cowebsites.",
    "emote.edit_opened": "The user opened the emote editor.",
    "external_module.calendar_opened": "The user opened the calendar module.",
    "external_module.opened": "The user opened an external module.",
    "external_module.todo_list_opened": "The user opened the todo list module.",
    "file.drag_dropped": "The user dropped a file into the world.",
    "global_audio.opened": "The user opened the global audio panel.",
    "global_message.opened": "The user opened the global message composer.",
    "global_message.sound_sent": "The user broadcast a sound to the world.",
    "global_message.text_sent": "The user broadcast a text message to the world.",
    "invite.opened": "The user opened the invite panel.",
    "map_editor.closed": "The user closed the map editor.",
    "map_editor.opened": "The user opened the map editor.",
    "map_explorer.center_to_user_clicked": "The user recentred the explorer on themselves.",
    "map_explorer.closed": "The user closed the map explorer.",
    "map_explorer.filtered": "The user filtered the map explorer.",
    "map_explorer.opened": "The user opened the map explorer.",
    "map_explorer.top_button_clicked": "The user opened the explorer from the top button.",
    "map_explorer.zoom_in_clicked": "The user zoomed in on the map explorer.",
    "map_explorer.zoom_out_clicked": "The user zoomed out on the map explorer.",
    "media.camera.toggled": "The user turned their camera on or off.",
    "media.microphone.toggled": "The user turned their microphone on or off.",
    "media.turn_test.failed": "The TURN connectivity test failed. Counted as an experience issue.",
    "media.turn_test.timeout": "The TURN connectivity test timed out. Counted as an experience issue.",
    "media.video_stream_missing": "A video stream was expected but never arrived. Counted as an experience issue.",
    "meeting.actions.opened": "The user opened the meeting actions menu.",
    "meeting.camera_layout_resized": "The user resized the camera layout.",
    "meeting.microphone.muted": "The user muted their microphone in a meeting.",
    "meeting.microphone.muted_for_everybody": "A moderator muted everyone's microphone.",
    "meeting.participant.kicked": "A moderator removed a participant.",
    "meeting.participant.pinned": "The user pinned a participant's video.",
    "meeting.private_message.clicked": "The user started a private message from a meeting.",
    "meeting.report.clicked": "The user reported someone from a meeting.",
    "meeting.screenshare.toggled": "The user toggled screen sharing.",
    "meeting.video.muted": "The user turned their camera off in a meeting.",
    "meeting.video.muted_for_everybody": "A moderator turned off everyone's camera.",
    "megaphone.ended": "A megaphone broadcast ended.",
    "megaphone.opened": "The user opened the megaphone.",
    "megaphone.started": "A megaphone broadcast started.",
    "menu.chat.opened": "The user opened the chat from the menu.",
    "menu.contact.opened": "The user opened the contact page.",
    "menu.credit.opened": "The user opened the credits.",
    "menu.opened": "The user opened the main menu.",
    "menu.shortcuts.opened": "The user opened the keyboard shortcuts.",
    "onboarding.companion_selected": "The user picked a companion during onboarding.",
    "onboarding.custom_woka_selected": "The user picked a custom Woka during onboarding.",
    "onboarding.name_validated": "The user confirmed their name during onboarding.",
    "onboarding.video_validated": "The user confirmed their camera setup during onboarding.",
    "onboarding.woka_selected": "The user picked a Woka during onboarding.",
    "personal_desk.entered": "The user sat at their personal desk.",
    "personal_desk.unclaimed": "The user released their personal desk.",
    "profile.camera_edit_opened": "The user opened camera settings from their profile.",
    "profile.companion_edit_opened": "The user opened companion settings from their profile.",
    "profile.name_edit_opened": "The user opened name settings from their profile.",
    "profile.opened": "The user opened their profile.",
    "profile.woka_edit_opened": "The user opened Woka settings from their profile.",
    "pwa.continue_in_browser_clicked": "The user chose to stay in the browser rather than install.",
    "pwa.install_clicked": "The user clicked install.",
    "pwa.install_from_profile_menu_clicked": "The user started an install from the profile menu.",
    "recording.list_opened": "The user opened the recordings list.",
    "recording.started": "A recording started.",
    "recording.stopped": "A recording stopped.",
    "room_list.opened": "The user opened the room list.",
    "settings.audio_volume.opened": "The user opened the audio volume settings.",
    "settings.background.opened": "The user opened the video background settings.",
    "settings.camera.selected": "The user opened the camera picker.",
    "settings.microphone.selected": "The user opened the microphone picker.",
    "settings.opened": "The user opened the settings.",
    "settings.speaker.selected": "The user opened the speaker picker.",
    "user.business_card.opened": "The user opened someone's business card.",
    "user.follow_requested": "The user asked to follow someone.",
    "user.go_to_clicked": "The user jumped to someone's position.",
    "user.report.clicked": "The user reported someone.",
    "user.woka_menu.opened": "The user opened the Woka context menu.",
    "user_list.opened": "The user opened the user list.",
    "websocket.reconnecting": "The client is retrying its websocket connection. Counted as an experience issue.",
};

/* -------------------------------------------------------------------------- */
/*                                 Registry                                   */
/* -------------------------------------------------------------------------- */

const eventsWithProperties: z.ZodDiscriminatedUnionOption<"eventName">[] = [
    userConnectedEvent,
    userDisconnectedEvent,
    conversationEndedEvent,
    mediaVideoQualitySampleEvent,
    authUserIdentifiedEvent,
    roomVisitedEvent,
    roomChangedEvent,
    roomListRoomClickedEvent,
    sessionStartedEvent,
    sessionEndedEvent,
    meetingAreaEnteredEvent,
    meetingStartedEvent,
    meetingEndedEvent,
    meetingProviderChangedEvent,
    meetingScreenshareEndedEvent,
    meetingLayoutChangedEvent,
    meetingPictureInPictureToggledEvent,
    chatMessageSentEvent,
    inviteSentEvent,
    inviteAcceptedEvent,
    inviteWalkLinkOptionChangedEvent,
    areaDwellEvent,
    statusDwellEvent,
    mapEditorAreaLockToggledEvent,
    mapEditorPropertyAddedEvent,
    mapEditorPropertyRemovedEvent,
    mapEditorPropertyClickedEvent,
    mapEditorToolOpenedEvent,
    mapEditorApplicationPickerOpenedEvent,
    mapEditorApplicationOpenedEvent,
    mapEditorSaveStartedEvent,
    mapEditorSaveSucceededEvent,
    mapEditorSaveFailedEvent,
    mapEditorEntityAddedEvent,
    mapEditorEntityRemovedEvent,
    mapEditorEntityUpdatedEvent,
    mapEditorAreaCreatedEvent,
    mapEditorAreaUpdatedEvent,
    mapEditorAreaRemovedEvent,
    mapLoadingStartedEvent,
    mapLoadingSucceededEvent,
    mapLoadingFailedEvent,
    mediaConnectionRetryEvent,
    mediaTurnTestSucceededEvent,
    mediaPermissionDeniedEvent,
    mediaDeviceErrorEvent,
    mediaQualityIssueEvent,
    settingsMicrophoneChangedEvent,
    settingsCameraChangedEvent,
    settingsNotificationChangedEvent,
    settingsPictureInPictureChangedEvent,
    settingsFullscreenChangedEvent,
    settingsAskWebsiteChangedEvent,
    settingsRequestFollowChangedEvent,
    settingsDecreaseAudioVolumeChangedEvent,
    settingsBackgroundChangedEvent,
    cowebsiteOpenedEvent,
    onboardingWokaValidatedEvent,
    feedbackOpenedEvent,
    feedbackSubmittedEvent,
    externalModuleChatBandClickedEvent,
    menuCustomOpenedEvent,
    emoteLaunchedEvent,
    customButtonClickedEvent,
    popupOpenedEvent,
    worldEnteredEvent,
    assetErrorEvent,
    websocketConnectionLostEvent,
    frontCriticalErrorEvent,
    performanceIssueEvent,
    pwaInstallPromptShownEvent,
    pwaInstallOutcomeEvent,
];

const eventsWithoutProperties: z.ZodDiscriminatedUnionOption<"eventName">[] = Object.entries(
    EVENTS_WITHOUT_PROPERTIES,
).map(([eventName, description]) => defineEvent(eventName, noProperties, description));

const allEventSchemas = [...eventsWithProperties, ...eventsWithoutProperties];

/**
 * Every event, keyed by name.
 *
 * Iterate this to generate documentation: each value is a Zod object whose
 * `_def.description` is the event's description and whose `shape.properties`
 * carries a description per field.
 */
export const ANALYTICS_EVENT_CATALOG: Record<string, z.ZodDiscriminatedUnionOption<"eventName">> = Object.fromEntries(
    allEventSchemas.map((schema) => [analyticsEventNameOf(schema), schema]),
);

/**
 * The catalog as one union.
 *
 * Building it as a discriminated union is also the catalog's own integrity check:
 * Zod throws at module load if two entries claim the same event name, so a
 * copy-paste duplicate cannot ship silently.
 *
 * Again: for documentation and types. Parsing an event against this would reject
 * every name the catalog does not list, which the pipeline must not do.
 */
export const analyticsEventCatalogUnion = z.discriminatedUnion(
    "eventName",
    allEventSchemas as [z.ZodDiscriminatedUnionOption<"eventName">, ...z.ZodDiscriminatedUnionOption<"eventName">[]],
);

/** Reads the literal event name off a catalog entry. */
export function analyticsEventNameOf(schema: z.ZodDiscriminatedUnionOption<"eventName">): string {
    const shape = schema.shape as { eventName: z.ZodLiteral<string> };

    return shape.eventName.value;
}
