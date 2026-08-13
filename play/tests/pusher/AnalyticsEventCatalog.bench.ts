import { bench, describe } from "vitest";
import { z } from "zod";
import { analyticsEventCatalogUnion } from "@workadventure/messages";

/**
 * Does validating against the catalog cost too much to sit on the hot path?
 *
 * The catalog doc-block argued at length that it must not, and the number it
 * quoted (~134x) is real — but it measured a *recursive* `z.lazy` JSON schema,
 * where the cost comes from unbounded nesting depth. A discriminated union is a
 * different machine: `Map.get` on the discriminator, then exactly one member
 * parsed (zod v3 types.js). Width is free; only the matched member's field count
 * is paid for. This file is here so that claim is measured rather than asserted.
 *
 * Run with `npx vitest bench tests/pusher/AnalyticsEventCatalog.bench.ts`.
 *
 * Measured on an M-series laptop, per event:
 *
 *   permissive envelope        1.37 µs   (the baseline it replaces)
 *   strict union, hit          3.26 µs   2.4x — fine at 10k events/s
 *   strict union, MISS        15.2  µs   11x  — see below
 *   64-deep nested props       0.70 µs   returns, does not throw
 *
 * Two results shaped the gate:
 *
 * 1. The RangeError the old doc-block warned about does not happen. That failure
 *    mode belongs to recursive `z.lazy` schemas; nothing here recurses, and 64
 *    levels of nesting parse fine because `passthrough()` does not descend.
 *
 * 2. A discriminator MISS is 11x a permissive parse, not 2.4x — zod builds an
 *    issue enumerating all 166 expected values, ~8.8 KB of error object, for
 *    every rejected event. A miss is exactly what a strict gate produces, so the
 *    handler looks the name up in ANALYTICS_EVENT_CATALOG first (a property
 *    lookup) and only hands known names to the union. Without that ordering, a
 *    client spraying unknown names costs more CPU than one sending valid ones.
 */

/** What the permissive envelope checked before the catalog became the gate. */
const permissiveEnvelope = z.object({
    eventName: z.string().min(1).max(255),
    source: z.enum(["front", "pusher", "media"]),
    clientEventTimeMs: z.number().int().nonnegative().max(8.64e15),
    eventId: z.string().min(1).max(255),
    properties: z.record(z.unknown()),
});

const bareEvent = {
    eventName: "menu.opened",
    source: "front",
    clientEventTimeMs: 1777032000000,
    eventId: "menu.opened:1777032000000:abc",
    properties: {},
};

const richEvent = {
    eventName: "cowebsite.opened",
    source: "front",
    clientEventTimeMs: 1777032000000,
    eventId: "cowebsite.opened:1777032000000:def",
    properties: {
        url: "https://example.test",
        schemaVersion: 1,
        targetUrl: "https://example.test",
        mediaKind: "document",
        triggerProperty: "openWebsite",
        fileExtension: "pdf",
    },
};

const timedEvent = {
    eventName: "conversation.ended",
    source: "pusher",
    clientEventTimeMs: 1777032150000,
    eventId: "tab:conv:1777032150000",
    properties: {
        schemaVersion: 1,
        conversationId: "group:3",
        conversationType: "spontaneous_bubble",
        startedAt: "2026-04-24T12:00:00.000Z",
        endedAt: "2026-04-24T12:02:30.000Z",
        durationSeconds: 150,
        endReason: "left_conversation",
    },
};

/** A name no catalog entry claims: the discriminator misses and the parse fails. */
const unknownEvent = { ...bareEvent, eventName: "not.in.the.catalog" };

/** 64 levels deep — the shape that made a recursive schema throw a RangeError. */
function nest(depth: number): unknown {
    let value: unknown = "leaf";
    for (let i = 0; i < depth; i++) {
        value = { nested: value };
    }
    return value;
}
const deeplyNested = { ...bareEvent, properties: { blob: nest(64) } };

const corpus = [bareEvent, richEvent, timedEvent];

describe("analytics envelope parse", () => {
    bench("permissive envelope (what the union replaces)", () => {
        for (let i = 0; i < 1000; i++) {
            permissiveEnvelope.safeParse(corpus[i % corpus.length]);
        }
    });

    bench("strict discriminated union over 166 events", () => {
        for (let i = 0; i < 1000; i++) {
            analyticsEventCatalogUnion.safeParse(corpus[i % corpus.length]);
        }
    });

    bench("strict union, discriminator miss", () => {
        for (let i = 0; i < 1000; i++) {
            analyticsEventCatalogUnion.safeParse(unknownEvent);
        }
    });

    bench("strict union, 64-deep nested properties", () => {
        for (let i = 0; i < 1000; i++) {
            analyticsEventCatalogUnion.safeParse(deeplyNested);
        }
    });
});
