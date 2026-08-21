import { describe, expect, it } from "vitest";
import { z } from "zod";

import { generateSchema } from "@anatine/zod-openapi";
import {
    ANALYTICS_EVENT_CATALOG,
    TIMED_ANALYTICS_EVENT_NAMES,
    analyticsEvent,
    analyticsEventNameOf,
    analyticsEventsBatch,
    timedAnalyticsEventDefinition,
} from "@workadventure/messages";
// Deliberately not re-exported through the barrel — see AnalyticsPostHogKeys.ts.
import { POSTHOG_EVENT_KEYS } from "@workadventure/messages/src/JsonMessages/AnalyticsPostHogKeys";

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
 * The whole of `src/front`, because that is where the names live now. AnalyticsClient
 * used to carry one method per event, so scraping that single file found every name;
 * those methods went into their call sites and the literals went with them. Inlining
 * ~5 MB of source into this test's bundle is what it costs to keep the two assertions
 * below — and a catalog nobody checks is worth less.
 */
const EMITTER_SOURCES = import.meta.glob<string>(
    ["../../src/front/**/*.{ts,svelte}", "../../src/pusher/services/AnalyticsEventsQueue.ts"],
    { query: "?raw", import: "default", eager: true },
);

/**
 * The pusher's queue names its events in object literals rather than through
 * `trackAdminEvent`, so it needs a pattern of its own — and that pattern has to stay
 * scoped here. Let it loose over `src/front` and it matches TimedAnalyticsEvent.ts,
 * whose `timed_event.open`/`.close` are control frames the handler intercepts and
 * never enqueues: catalogued they are not, and emitted they are not either.
 */
const QUEUE_SOURCES = Object.entries(EMITTER_SOURCES)
    .filter(([path]) => path.includes("AnalyticsEventsQueue"))
    .map(([, source]) => source);

/**
 * Emitted from the other repository.
 *
 * The SaaS repo's `external-modules/` reaches analyticsClient for the Teams and
 * Discord integrations, and these two events have no caller on this side. Nothing
 * here can read that source, so without naming them the catalog reads as documenting
 * two dead entries.
 */
const EMITTED_FROM_EXTERNAL_MODULES = ["external_module.opened", "external_module.chat_band.clicked"];

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
    // Exact, not scraped: every interval the tracker emits, plus the row some of
    // them emit when they OPEN. None of these appear as a literal at an emit site —
    // the tracker emits whatever it was asked to hold, and reads the rest off the
    // catalog entry. Sessions are the reason this covers more than the
    // client-openable set.
    const names = new Set<string>();
    for (const eventName of Object.keys(ANALYTICS_EVENT_CATALOG)) {
        const timed = timedAnalyticsEventDefinition(eventName);
        if (!timed) {
            continue;
        }
        names.add(eventName);
        if (timed.opensWith) {
            names.add(timed.opensWith);
        }
    }

    for (const name of EMITTED_FROM_EXTERNAL_MODULES) {
        names.add(name);
    }

    for (const source of Object.values(EMITTER_SOURCES)) {
        for (const [, name] of source.matchAll(
            /(?:trackAdminEvent|openTimedAnalyticsEvent)\(\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(name);
        }
        // trackAdminEvent(!$mapEditorModeStore ? "map_editor.opened" : "map_editor.closed")
        for (const [, whenTrue, whenFalse] of source.matchAll(
            /trackAdminEvent\(\s*[^"()]+\?\s*"([a-z][a-z0-9_.]*)"\s*:\s*"([a-z][a-z0-9_.]*)"/g,
        )) {
            names.add(whenTrue);
            names.add(whenFalse);
        }
    }

    for (const source of QUEUE_SOURCES) {
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
        // is derived from the catalog. Ask for one that is not and the pusher silently
        // rejects the open — the interval simply never appears, with nothing failing.
        const requested = extractTimedEventRequests();

        expect(requested.size).toBeGreaterThan(0);
        const openable = new Set<string>(TIMED_ANALYTICS_EVENT_NAMES);
        expect([...requested].filter((name) => !openable.has(name)).sort()).toEqual([]);
    });

    it("exposes exactly six client-openable timed events", () => {
        // A canary, not a tautology. TIMED_ANALYTICS_EVENT_NAMES is derived from the
        // catalog, so adding a `timedEvent` entry silently widens the set of rows a
        // *client* can ask the pusher to sign with source "pusher" — the admin
        // projects several of those straight into connection sessions. Widening it
        // should be a deliberate act that updates this list, not a side effect of
        // documenting a new event.
        expect([...TIMED_ANALYTICS_EVENT_NAMES].sort()).toEqual([
            "area.dwell",
            "cowebsite.closed",
            "meeting.ended",
            "meeting.screenshare.ended",
            "megaphone.ended",
            "status.dwell",
        ]);
    });

    it("never lets an interval that reports at both ends drop only its closing row", () => {
        // The tracker enqueues the `opensWith` row unconditionally when the interval
        // OPENS, while minDurationMs is applied only when it CLOSES. Pair the two and
        // every sub-threshold interval emits an open with no close — the orphan this
        // whole design exists to remove, and a silent drift between two counters the
        // admin reads side by side. The invariant is cheap; discovering the violation
        // in ClickHouse three months later is not.
        const offenders = Object.keys(ANALYTICS_EVENT_CATALOG)
            .map((eventName) => timedAnalyticsEventDefinition(eventName))
            .filter((definition) => definition?.opensWith && definition.minDurationMs !== 0)
            .map((definition) => definition?.opensWith);

        expect(offenders).toEqual([]);
    });

    it("keeps the open payload and the stored payload of a timed event in step", () => {
        // A timed event declares what the client opens with; the pusher adds the
        // interval bounds and the reason. Both halves have to end up in the stored
        // shape, or the row the tracker emits is not the row the catalog documents.
        const stored = propertiesOf(ANALYTICS_EVENT_CATALOG["area.dwell"]);
        expect(stored).toBeInstanceOf(z.ZodObject);
        expect(Object.keys((stored as z.AnyZodObject).shape).sort()).toEqual([
            "areaId",
            "areaName",
            "durationSeconds",
            "endReason",
            "endedAt",
            "startedAt",
        ]);
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
        // Shape taken from the tracker's emitter: the catalog is only worth reading
        // if it matches what actually goes on the wire. A session declares its own
        // field names — connectedAt / disconnectedAt rather than startedAt / endedAt
        // — because the admin reads them verbatim.
        const parsed = ANALYTICS_EVENT_CATALOG["user.disconnected"].safeParse({
            eventName: "user.disconnected",
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
            eventId: "tab-id:connection:1777032150000",
            properties: {
                connectionId: "tab-id",
                connectedAt: "2026-04-24T12:00:00.000Z",
                disconnectedAt: "2026-04-24T12:02:30.000Z",
                // `socket_closed`, not the old `client_closed`: sessions now draw
                // from the one shared reason vocabulary.
                disconnectReason: "socket_closed",
                durationSeconds: 150,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates the real payload of a meeting ending", () => {
        const parsed = ANALYTICS_EVENT_CATALOG["meeting.ended"].safeParse({
            eventName: "meeting.ended",
            // The pusher synthesizes this one: a client saying "meeting.ended"
            // is refused, precisely so nobody can claim a duration.
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:02:30.000Z"),
            eventId: "tab-id:meeting.ended:uuid:1777032150000",
            properties: {
                // webrtc is what makes this a spontaneous bubble rather than a
                // meeting area — the distinction conversationType used to carry.
                meetingProvider: "webrtc",
                meetingId: "world.space",
                endReason: "closed_by_client",
                startedAt: "2026-04-24T12:00:00.000Z",
                endedAt: "2026-04-24T12:02:30.000Z",
                durationSeconds: 150,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("validates the real payload of a video quality sample", () => {
        const parsed = ANALYTICS_EVENT_CATALOG["media.video_quality.sample"].safeParse({
            eventName: "media.video_quality.sample",
            source: "pusher",
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

    it("validates a cowebsite opening reported the way the front now sends it", () => {
        // Origin only, document name on its own field — see AnalyticsClient.
        //
        // `pusher`, not `front`: a cowebsite visit is an interval now, so the front
        // asks for it and the pusher signs both ends. A socket claiming this name is
        // refused, which is what stops a client inventing a visit length.
        const parsed = ANALYTICS_EVENT_CATALOG["cowebsite.opened"].safeParse({
            eventName: "cowebsite.opened",
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
            eventId: "tab-id:cowebsite.closed:uuid:opened:1777032005000",
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

    it("carries the whole opening context onto the closing row of a cowebsite visit", () => {
        // The tracker spreads the open payload onto the close, so the row that has the
        // duration also has the area, the media kind and the file. "How long did people
        // spend on PDFs opened from the Docs zone" becomes one predicate, not a join.
        const parsed = ANALYTICS_EVENT_CATALOG["cowebsite.closed"].safeParse({
            eventName: "cowebsite.closed",
            source: "pusher",
            clientEventTimeMs: Date.parse("2026-04-24T12:05:05.000Z"),
            eventId: "tab-id:cowebsite.closed:uuid:1777032305000",
            properties: {
                url: "https://acme.tld",
                targetUrl: "https://acme.tld",
                mediaKind: "pdf",
                triggerProperty: "openLink",
                fileName: "handbook.pdf",
                fileExtension: "pdf",
                areaId: "docs-zone",
                areaName: "Docs zone",
                schemaVersion: 1,
                startedAt: "2026-04-24T12:00:05.000Z",
                endedAt: "2026-04-24T12:05:05.000Z",
                durationSeconds: 300,
                endReason: "closed_by_client",
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

describe("Swagger rendering", () => {
    it("renders the catalog as one discriminated oneOf, not 166 definitions", () => {
        // Guards two things at once: that registering the union (rather than its
        // members, as ErrorApiData does) still produces something a reader can use,
        // and that an @anatine/zod-openapi upgrade has not quietly changed how it
        // handles ZodDiscriminatedUnion.
        const schema = generateSchema(analyticsEvent) as {
            oneOf?: unknown[];
            discriminator?: { propertyName?: string };
        };

        expect(schema.discriminator?.propertyName).toBe("eventName");
        expect(schema.oneOf).toHaveLength(Object.keys(ANALYTICS_EVENT_CATALOG).length);
    });

    it("publishes the batch envelope the pusher actually posts", () => {
        const schema = generateSchema(analyticsEventsBatch) as { properties?: Record<string, unknown> };

        expect(Object.keys(schema.properties ?? {}).sort()).toEqual([
            "events",
            "pusherInstanceId",
            "schemaVersion",
            "sentAt",
        ]);
    });
});

describe("POSTHOG_EVENT_KEYS", () => {
    it("maps only events the catalog knows", () => {
        // The type says this already — a key that is not an AnalyticsEventName does not
        // compile. Asserted at runtime too because the failure it guards is silent: a
        // renamed event leaves a mapping that matches nothing, and the front simply
        // stops reporting it to PostHog with nothing to notice.
        const catalogued = new Set(Object.keys(ANALYTICS_EVENT_CATALOG));

        expect(
            Object.keys(POSTHOG_EVENT_KEYS)
                .filter((name) => !catalogued.has(name))
                .sort(),
        ).toEqual([]);
    });

    it("gives each PostHog name to exactly one event", () => {
        // Two events sharing a name double-count it in PostHog, and the two are
        // indistinguishable once there. The events that genuinely need one name per UI
        // path capture PostHog in their own method instead, which is why none is here.
        const names = Object.values(POSTHOG_EVENT_KEYS);
        const duplicated = names.filter((name, index) => names.indexOf(name) !== index);

        expect(names.length).toBeGreaterThan(100);
        expect([...new Set(duplicated)].sort()).toEqual([]);
    });
});
