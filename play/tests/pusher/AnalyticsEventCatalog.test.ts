import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// TIMED_EVENT_NAMES lives next to the tracker, which pulls AnalyticsEventsQueue and
// therefore the real environment validation at import time — that calls process.exit
// when the vars are absent. Same stub every other pusher test uses.
vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import {
    ANALYTICS_EVENT_CATALOG,
    analyticsEventNameOf,
    conversationEndedEvent,
    cowebsiteOpenedEvent,
    mediaVideoQualitySampleEvent,
    meetingProviderChangedEvent,
    userDisconnectedEvent,
} from "../../src/pusher/services/AnalyticsEventCatalog";
import { TIMED_EVENT_NAMES } from "../../src/pusher/services/AnalyticsTimedEventTracker";

/** Reads the `properties` sub-schema off a catalog entry. */
function propertiesOf(schema: z.ZodDiscriminatedUnionOption<"eventName">): z.ZodTypeAny {
    const shape = schema.shape as unknown as { properties: z.ZodTypeAny };

    return shape.properties;
}

/**
 * The source of every file that names an event which ends up stored.
 *
 * Read through import.meta.glob rather than fs: Vite inlines the text at build
 * time, so this needs neither a working cwd (jsdom reports "/") nor
 * import.meta.url (it does not survive the transform).
 *
 * TimedAnalyticsEvent.ts is deliberately absent: it names the `timed_event.*`
 * control frames, which the handler intercepts and never enqueues.
 */
const EMITTER_SOURCES = import.meta.glob<string>(
    [
        "../../src/front/Administration/AnalyticsClient.ts",
        "../../src/front/WebRtc/ConversationAnalytics.ts",
        "../../src/pusher/services/AnalyticsPresenceTracker.ts",
        "../../src/pusher/services/AnalyticsEventsQueue.ts",
    ],
    { query: "?raw", import: "default", eager: true },
);

/** The names the front asks the pusher to time, e.g. openTimedAnalyticsEvent("area.dwell", …). */
function extractTimedEventRequests(): Set<string> {
    const names = new Set<string>();
    for (const source of Object.values(EMITTER_SOURCES)) {
        for (const [, name] of source.matchAll(/openTimedAnalyticsEvent\(\s*"([a-z][a-z0-9_.]*)"/g)) {
            names.add(name);
        }
    }

    return names;
}

/**
 * Every event name the code can actually produce.
 *
 * Regex over the sources, because the names are literals at call sites rather than
 * a registry — that is the whole reason this check has to exist. Note `\s*` after
 * the opening paren: prettier moves the name onto its own line as soon as a call
 * grows, and a regex demanding `("` silently matches almost nothing.
 */
function extractEmittedEventNames(): Set<string> {
    // Exact, not scraped: the pusher's own allowlist for client-requested timed
    // events. These names are never literals at an emit site — the pusher emits
    // whatever the client asked for, once it is in this set.
    const names = new Set<string>(TIMED_EVENT_NAMES);

    for (const source of Object.values(EMITTER_SOURCES)) {
        for (const [, name] of source.matchAll(
            /(?:trackAdminEvent|openTimedAnalyticsEvent)\(\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(name);
        }
        // trackAdminEvent(open ? "map_editor.opened" : "map_editor.closed")
        for (const [, whenTrue, whenFalse] of source.matchAll(
            /trackAdminEvent\(\s*\w+\s*\?\s*"([a-z][a-z0-9_.]*)"\s*:\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(whenTrue);
            names.add(whenFalse);
        }
        for (const [, name] of source.matchAll(/eventName:\s*"([a-z][a-z0-9_.]*)"/g)) {
            names.add(name);
        }
    }

    return names;
}

describe("AnalyticsEventCatalog", () => {
    it("registers every event under its own literal name", () => {
        for (const [name, schema] of Object.entries(ANALYTICS_EVENT_CATALOG)) {
            expect(analyticsEventNameOf(schema)).toBe(name);
        }
    });

    it("catalogues exactly the events the code emits — no more, no less", () => {
        // This used to be a hardcoded count, which was worth very little: it never
        // named anything, an add+remove pair slipped straight through it, and it had
        // to be hand-corrected 169 → 165 the day events were dropped. The catalog is
        // documentation — an event missing from it is an event nobody can look up,
        // and an entry with no emitter documents something that no longer exists.
        //
        // Front and pusher ship from the same `play/`, so this is fully knowable
        // here, with the exact names, at no runtime cost.
        const emitted = extractEmittedEventNames();

        // Guard the extractor before trusting it: it scrapes literals, so a refactor
        // that changes how events are named would leave `emitted` empty and make both
        // diffs below pass vacuously. Real number is ~165; this only catches collapse.
        expect(emitted.size).toBeGreaterThan(150);

        const catalogued = new Set(Object.keys(ANALYTICS_EVENT_CATALOG));
        expect([...emitted].filter((name) => !catalogued.has(name)).sort()).toEqual([]);
        expect([...catalogued].filter((name) => !emitted.has(name)).sort()).toEqual([]);
    });

    it("only asks the pusher to time events it will accept", () => {
        // The front names the interval it wants; the pusher emits it only if the name
        // is in TIMED_EVENT_NAMES. Ask for one that is not and the pusher silently
        // rejects the open — the interval simply never appears, with nothing failing.
        const requested = extractTimedEventRequests();

        expect(requested.size).toBeGreaterThan(0);
        expect([...requested].filter((name) => !TIMED_EVENT_NAMES.has(name)).sort()).toEqual([]);
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
