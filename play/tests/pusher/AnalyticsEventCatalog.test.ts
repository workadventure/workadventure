import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
    ANALYTICS_EVENT_CATALOG,
    analyticsEventNameOf,
    conversationEndedEvent,
    cowebsiteOpenedEvent,
    mediaVideoQualitySampleEvent,
    meetingProviderChangedEvent,
    userDisconnectedEvent,
} from "../../src/pusher/services/AnalyticsEventCatalog";

/** Reads the `properties` sub-schema off a catalog entry. */
function propertiesOf(schema: z.ZodDiscriminatedUnionOption<"eventName">): z.ZodTypeAny {
    const shape = schema.shape as unknown as { properties: z.ZodTypeAny };

    return shape.properties;
}

describe("AnalyticsEventCatalog", () => {
    it("registers every event under its own literal name", () => {
        for (const [name, schema] of Object.entries(ANALYTICS_EVENT_CATALOG)) {
            expect(analyticsEventNameOf(schema)).toBe(name);
        }
    });

    it("covers the whole taxonomy", () => {
        // The catalog is documentation: an event missing from it is an event nobody
        // can look up. This number tracks the names actually emitted across
        // AnalyticsClient, ConversationAnalytics, AnalyticsPresenceTracker and the
        // video-quality path — if you add an event, add it here too.
        expect(Object.keys(ANALYTICS_EVENT_CATALOG)).toHaveLength(167);
    });

    it("describes every event and every property field", () => {
        // The entire point of the catalog: a field without a description documents
        // nothing. This is what stops the docs rotting as events are added.
        const undescribed: string[] = [];

        for (const [name, schema] of Object.entries(ANALYTICS_EVENT_CATALOG)) {
            if (!schema.description) {
                undescribed.push(name);
            }

            const properties = propertiesOf(schema);
            if (!(properties instanceof z.ZodObject)) {
                continue;
            }

            for (const [field, fieldSchema] of Object.entries(properties.shape as Record<string, z.ZodTypeAny>)) {
                // An optional/nullable wrapper hides the description one level down,
                // the same way the env-docs extractor has to unwrap it.
                const described = fieldSchema.description ?? unwrapDescription(fieldSchema);
                if (!described) {
                    undescribed.push(`${name}.properties.${field}`);
                }
            }
        }

        expect(undescribed).toEqual([]);
    });

    it("validates the real payload of a timed event", () => {
        // Shape taken from AnalyticsPresenceTracker's emitter: the catalog is only
        // worth reading if it matches what actually goes on the wire.
        const parsed = userDisconnectedEvent.safeParse({
            eventName: "user.disconnected",
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
            eventId: "tab-id:disconnected:1777032150000",
            properties: {
                connectionId: "tab-id",
                connectedAt: "2026-04-24T12:00:00.000Z",
                disconnectedAt: "2026-04-24T12:02:30.000Z",
                disconnectReason: "client_closed",
                durationSeconds: 150,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates the real payload of a conversation ending", () => {
        const parsed = conversationEndedEvent.safeParse({
            eventName: "conversation.ended",
            // The pusher synthesizes this one: a client saying "conversation.ended"
            // is refused, precisely so nobody can claim a duration.
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
            eventId: "conversation.ended:group:42:1777032150000",
            properties: {
                schemaVersion: 1,
                conversationId: "group:42",
                conversationType: "spontaneous_bubble",
                meetingProvider: "webrtc",
                endReason: "left_conversation",
                startedAt: "2026-04-24T12:00:00.000Z",
                endedAt: "2026-04-24T12:02:30.000Z",
                durationSeconds: 150,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates the real payload of a video quality sample", () => {
        const parsed = mediaVideoQualitySampleEvent.safeParse({
            eventName: "media.video_quality.sample",
            source: "media",
            clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
            eventId: "reporter-uuid:stream-id:1",
            properties: {
                streamId: "stream-id",
                connectionId: "connection-id",
                sessionId: "session-id",
                remoteUserUuid: "remote-uuid",
                remoteSpaceUserId: "remote-space-user",
                spaceName: "world.space",
                streamCategory: "video",
                transportType: "P2P",
                relay: true,
                relayProtocol: "udp",
                livekitServerUrl: null,
                fps: 24.5,
                fpsStdDev: 3.5,
                jitter: 0.07,
                bandwidthBytesPerSecond: 180000,
                frameWidth: 1280,
                frameHeight: 720,
                mimeType: "video/VP8",
                sampleSeq: 1,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates a provider change the way ConversationAnalytics actually sends it", () => {
        // One emitter, one shape. AnalyticsClient used to carry a second, never-called
        // method emitting this same name with the meeting context instead — the shapes
        // would have diverged the day anyone called it.
        const parsed = meetingProviderChangedEvent.safeParse({
            eventName: "meeting.provider_changed",
            source: "front",
            clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
            eventId: "meeting.provider_changed:conv-1:1777032005000",
            properties: {
                schemaVersion: 1,
                conversationId: "conv-1",
                meetingSessionId: "conv-1",
                conversationType: "meeting",
                meetingProvider: "livekit",
                previousMeetingProvider: "jitsi",
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates a cowebsite opening reported the way the front now sends it", () => {
        // Origin only, document name on its own field — see AnalyticsClient.
        const parsed = cowebsiteOpenedEvent.safeParse({
            eventName: "cowebsite.opened",
            source: "front",
            clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
            eventId: "cowebsite.opened:1777032005000:abc",
            properties: {
                url: "https://acme.tld",
                targetUrl: "https://acme.tld",
                mediaKind: "pdf",
                triggerProperty: "openLink",
                fileName: "handbook.pdf",
                fileExtension: "pdf",
                schemaVersion: 1,
            },
        });

        expect(parsed.success).toBe(true);
    });
});

function unwrapDescription(schema: z.ZodTypeAny): string | undefined {
    let current: z.ZodTypeAny = schema;

    // Mirrors contrib/tools/generate-env-docs: the description can sit under an
    // optional/nullable/default wrapper rather than on the field itself.
    for (let depth = 0; depth < 5; depth++) {
        if (current.description) {
            return current.description;
        }
        const inner = (current._def as { innerType?: z.ZodTypeAny }).innerType;
        if (!inner) {
            return undefined;
        }
        current = inner;
    }

    return undefined;
}
